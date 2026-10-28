<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

class DoseCalculatorService
{
    /**
     * Non-solid dosage forms that require manual quantity entry.
     */
    protected const NON_SOLID_FORMS = [
        'liquid',
        'syrup',
        'suspension',
        'solution',
        'cream',
        'ointment',
        'gel',
        'inhaler',
        'spray',
        'drops',
        'lotion',
        'injection',
        'powder',
        'sachet',
    ];

    /**
     * Parse a human-entered dose string into a decimal float value.
     * Supports: "1", "2", "0.5", "1/2", "1 1/2", "3/4", "1/4", "2 1/2", etc.
     */
    public function parseDoseToDecimal(string|float|int|null $dose): float
    {
        if ($dose === null || $dose === '') {
            return 1.0;
        }

        if (is_numeric($dose)) {
            return (float) $dose;
        }

        $clean = trim((string) $dose);

        // Strip non-numeric/fraction words like "tablet", "tabs", "ml" if included
        $clean = preg_replace('/[^\d\s\/\.,]/', '', $clean);
        $clean = trim($clean);

        if ($clean === '') {
            return 1.0;
        }

        // Handle space-separated mixed numbers like "1 1/2"
        if (str_contains($clean, ' ')) {
            $parts = explode(' ', $clean);
            $whole = (float) ($parts[0] ?? 0);
            $fraction = isset($parts[1]) ? $this->evaluateFraction($parts[1]) : 0.0;

            return $whole + $fraction;
        }

        // Handle single fraction like "1/2" or "3/4"
        if (str_contains($clean, '/')) {
            return $this->evaluateFraction($clean);
        }

        // Standard decimal with comma or dot
        $clean = str_replace(',', '.', $clean);

        return (float) $clean;
    }

    /**
     * Evaluate a simple fraction string "numerator/denominator".
     */
    protected function evaluateFraction(string $fraction): float
    {
        $parts = explode('/', trim($fraction));
        if (count($parts) === 2 && (float) $parts[1] > 0) {
            return ((float) $parts[0]) / ((float) $parts[1]);
        }

        return (float) $fraction;
    }

    /**
     * Calculate times per day from frequency string.
     * If frequency is morning-noon-night pattern with hyphens (e.g. 1-0-1 or 1/2-0-1/2),
     * returns the sum of doses per day directly.
     * Otherwise returns preset times per day.
     *
     * @return array{is_pattern: bool, sum_per_day: float, times_per_day: float}
     */
    public function parseFrequency(string $frequency, float $unitDose = 1.0): array
    {
        $freq = strtolower(trim($frequency));

        if ($freq === 'sos' || $freq === 'prn' || $freq === 'when_needed') {
            return ['is_pattern' => false, 'sum_per_day' => 0.0, 'times_per_day' => 0.0];
        }

        // Check if frequency is a hyphen-separated pattern like 1-0-1, 1-1-1, 1/2-0-1/2, 0-0-1, 2-0-2
        if (preg_match('/^[\d\/\.\s]+(-[\d\/\.\s]+)+$/', $freq)) {
            $slots = explode('-', $freq);
            $slotSum = 0.0;
            $hasFractionalSlot = false;

            foreach ($slots as $slot) {
                $val = $this->parseDoseToDecimal(trim($slot));
                if ($val > 0) {
                    $slotSum += $val;
                    if ($val < 1.0 || fmod($val, 1.0) !== 0.0) {
                        $hasFractionalSlot = true;
                    }
                }
            }

            $sumPerDay = $hasFractionalSlot ? $slotSum : ($slotSum * $unitDose);

            return [
                'is_pattern' => true,
                'sum_per_day' => $sumPerDay,
                'times_per_day' => $slotSum,
            ];
        }

        // Standard preset frequencies
        $timesMap = [
            'once_daily' => 1.0,
            'twice_daily' => 2.0,
            'thrice_daily' => 3.0,
            'three_times_daily' => 3.0,
            'four_times_daily' => 4.0,
            'every_8_hours' => 3.0,
            'every_6_hours' => 4.0,
            'every_12_hours' => 2.0,
            'single_dose' => 1.0,
        ];

        $times = $timesMap[$freq] ?? 1.0;

        return [
            'is_pattern' => false,
            'sum_per_day' => $times * $unitDose,
            'times_per_day' => $times,
        ];
    }

    /**
     * Calculate total tablet/capsule quantity required.
     * Formula: ceil(dose × times_per_day × days)
     * e.g. 1/2-0-0 × 3 days = 1.5 -> ceil = 2
     * e.g. 1-0-1 (2/day) × 5 days = 10
     * e.g. 1/2-0-1/2 (1/day) × 10 days = 10
     * Returns null if non-solid dosage form or SOS.
     */
    public function calculateQuantity(
        string|float|int|null $dose,
        string $frequency,
        ?int $durationDays,
        ?string $dosageForm = 'Tablet'
    ): ?int {
        // If SOS or no duration, quantity is manual
        $freq = strtolower(trim($frequency));
        if ($freq === 'sos' || $freq === 'prn' || $freq === 'when_needed' || ! $durationDays || $durationDays <= 0) {
            return null;
        }

        // If non-solid form, manual entry
        if ($dosageForm !== null) {
            $formLower = strtolower($dosageForm);
            foreach (self::NON_SOLID_FORMS as $nonSolid) {
                if (str_contains($formLower, $nonSolid)) {
                    return null;
                }
            }
        }

        $parsedDose = $this->parseDoseToDecimal($dose);
        $freqInfo = $this->parseFrequency($frequency, $parsedDose);

        if ($freqInfo['sum_per_day'] <= 0) {
            return null;
        }

        $totalFloat = $freqInfo['sum_per_day'] * (float) $durationDays;

        return (int) ceil($totalFloat);
    }
}
