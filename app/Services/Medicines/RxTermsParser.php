<?php

declare(strict_types=1);

namespace App\Services\Medicines;

use Illuminate\Support\Facades\Log;

class RxTermsParser
{
    /**
     * Map form abbreviations from RxTerms to standardized dosage forms.
     *
     * @var array<string, string>
     */
    protected static array $formMap = [
        'tab' => 'Tablet',
        'tabs' => 'Tablet',
        'tablet' => 'Tablet',
        'cap' => 'Capsule',
        'caps' => 'Capsule',
        'capsule' => 'Capsule',
        'sol' => 'Solution',
        'soln' => 'Solution',
        'solution' => 'Solution',
        'susp' => 'Suspension',
        'suspension' => 'Suspension',
        'syr' => 'Syrup',
        'syrup' => 'Syrup',
        'inj' => 'Injection',
        'injection' => 'Injection',
        'crm' => 'Cream',
        'cream' => 'Cream',
        'oint' => 'Ointment',
        'ointment' => 'Ointment',
        'gel' => 'Gel',
        'drops' => 'Drops',
        'ophth soln' => 'Drops',
        'otic soln' => 'Drops',
        'inhal' => 'Inhaler',
        'inhalation' => 'Inhaler',
        'mdi' => 'Inhaler',
        'patch' => 'Patch',
        'supp' => 'Suppository',
        'suppository' => 'Suppository',
        'pwdr' => 'Powder',
        'powder' => 'Powder',
        'lotion' => 'Topical',
    ];

    /**
     * Map modifiers to form detail descriptions.
     *
     * @var array<string, string>
     */
    protected static array $detailMap = [
        'er' => 'Extended Release',
        'xr' => 'Extended Release',
        'sr' => 'Sustained Release',
        'dr' => 'Delayed Release',
        'ec' => 'Enteric Coated',
        'odt' => 'Orally Disintegrating',
        'chew' => 'Chewable',
        'chewable' => 'Chewable',
        'cr' => 'Controlled Release',
        'ir' => 'Immediate Release',
        '24hr' => 'Extended Release',
        '12hr' => 'Extended Release',
        'modified' => 'Extended Release',
        'osmotic' => 'Osmotic',
    ];

    /**
     * Normalize generic name removing tall-man lettering.
     */
    public function normalizeGenericName(string $rawName): string
    {
        // Strip route parenthetical if present e.g. "amLODIPine (Oral Pill)" -> "amLODIPine"
        $cleaned = preg_replace('/\s*\(.*?\)\s*/', '', trim($rawName)) ?? $rawName;

        // Strip trailing release form abbreviations (XR, ER, etc.) as they belong to variant details, not generic drug name
        $cleaned = preg_replace('/\s+\b(XR|ER|SR|CR|DR|IR|ODT)\b/i', '', $cleaned) ?? $cleaned;

        // Split by slash if combination
        if (str_contains($cleaned, '/')) {
            $parts = explode('/', $cleaned);
            $normalizedParts = array_map(fn ($p) => $this->normalizeIngredientName(trim($p)), $parts);

            return implode(' / ', $normalizedParts);
        }

        return $this->normalizeIngredientName($cleaned);
    }

    /**
     * Normalize single ingredient name (e.g. "amLODIPine" -> "Amlodipine", "hydroCHLOROthiazide" -> "Hydrochlorothiazide").
     */
    public function normalizeIngredientName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return '';
        }

        // Lowercase everything then capitalize words/hyphenated parts
        $words = preg_split('/([\s\-]+)/', strtolower($name), -1, PREG_SPLIT_DELIM_CAPTURE);
        if (! is_array($words)) {
            return ucfirst(strtolower($name));
        }

        $result = '';
        foreach ($words as $word) {
            $result .= ctype_alpha($word) ? ucfirst($word) : $word;
        }

        return $result;
    }

    /**
     * Extract administration route from display name (e.g. "(Oral Pill)" -> "Oral").
     */
    public function parseRoute(string $rawDisplay): string
    {
        if (preg_match('/\((.*?)\)/', $rawDisplay, $matches)) {
            $inside = strtolower(trim($matches[1]));

            if (str_contains($inside, 'oral')) {
                return 'Oral';
            }
            if (str_contains($inside, 'inject')) {
                return 'Injection';
            }
            if (str_contains($inside, 'topical')) {
                return 'Topical';
            }
            if (str_contains($inside, 'ophth')) {
                return 'Ophthalmic';
            }
            if (str_contains($inside, 'inhal')) {
                return 'Inhalation';
            }
            if (str_contains($inside, 'nasal')) {
                return 'Nasal';
            }
            if (str_contains($inside, 'otic')) {
                return 'Otic';
            }
            if (str_contains($inside, 'rectal')) {
                return 'Rectal';
            }
            if (str_contains($inside, 'vagin')) {
                return 'Vaginal';
            }

            Log::info("Unknown route in RxTerms: {$inside} (from {$rawDisplay})");
        }

        return 'Other';
    }

    /**
     * Parse raw RxTerms STRENGTHS_AND_FORMS string.
     *
     * Example inputs:
     * - " 5 mg Tab"
     * - " 5-10 mg Tab"
     * - " 100 mg/5ml Susp"
     * - " 10 mg ER Tab"
     * - " 0.1% Crm"
     * - " 12.5 mg Chew Tab"
     * - " 1,000 mg Modified 24 HR XR Tab"
     * - " 1000 mg ER Tab"
     * - " 500 mg 24HR ER Tab"
     *
     * @return array{
     *     strength_text: string,
     *     strength_value: float|null,
     *     strength_unit: string|null,
     *     dosage_form: string,
     *     form_detail: string|null
     * }
     */
    public function parseStrengthAndForm(string $raw): array
    {
        $rawTrimmed = trim($raw);
        // Strip thousands separators from numeric values (e.g. "1,000 mg" -> "1000 mg", "100,000 unt/ml" -> "100000 unt/ml")
        $rawTrimmed = preg_replace('/(?<=\d),(?=\d)/', '', $rawTrimmed) ?? $rawTrimmed;

        $result = [
            'strength_text' => $rawTrimmed,
            'strength_value' => null,
            'strength_unit' => null,
            'dosage_form' => 'Other',
            'form_detail' => null,
        ];

        if ($rawTrimmed === '') {
            return $result;
        }

        // Regex to separate strength part and form tokens
        // Supports units like mg/5ml, mg/ml, meq/15ml, unt/ml, mg, mcg, g, ml, iu, %, dose, units, unt, meq, etc.
        $unitsPattern = 'mg\/(?:5ml|15ml|ml)|mcg\/ml|g\/ml|meq\/(?:15ml|5ml|ml)|(?:unt|unit|units|iu)\/(?:5ml|ml|mg)|mcg\/hr|mg\/hr|mg|mcg|g|ml|l|iu|%|dose|doses|units?|unt|meq|mmol|actuations?';
        $pattern = '/^([\d\.\-\/]+\s*(?:'.$unitsPattern.')?)\s*(.*)$/i';

        if (preg_match($pattern, $rawTrimmed, $m)) {
            $strengthPart = trim($m[1]);
            $formPart = trim($m[2]);

            // If strength part has numeric value and unit (including compound units like mg/5ml, meq/15ml)
            if (preg_match('/^([\d\.]+)\s*([a-zA-Z0-9\/%]+)?$/', $strengthPart, $sm)) {
                $result['strength_value'] = (float) $sm[1];
                $result['strength_unit'] = ! empty($sm[2]) ? trim($sm[2]) : null;
            } elseif (preg_match('/^([\d\.\-]+)\s*([a-zA-Z0-9\/%]+)?$/', $strengthPart, $sm)) {
                // Range like 5-10 mg or combination like 1.25-250 mg or 3-3 mg/ml
                $result['strength_value'] = null;
                $result['strength_unit'] = ! empty($sm[2]) ? trim($sm[2]) : null;
            }

            $result['strength_text'] = $strengthPart !== '' ? $strengthPart : $rawTrimmed;

            // Now parse formPart (e.g. "ER Tab", "Chew Tab", "Susp", "Tab", "Modified 24 HR XR Tab")
            if ($formPart !== '') {
                // Normalize "24 HR" -> "24hr", "12 HR" -> "12hr"
                $normalizedFormPart = preg_replace('/\b(24|12)\s*hr\b/i', '$1hr', $formPart) ?? $formPart;
                $tokens = preg_split('/\s+/', strtolower($normalizedFormPart));
                $foundDetails = [];
                $foundForm = null;

                if (is_array($tokens)) {
                    foreach ($tokens as $token) {
                        if (isset(self::$detailMap[$token])) {
                            $foundDetails[] = self::$detailMap[$token];
                        } elseif (isset(self::$formMap[$token])) {
                            $foundForm = self::$formMap[$token];
                        }
                    }
                }

                if ($foundForm) {
                    $result['dosage_form'] = $foundForm;
                } else {
                    // Check if entire formPart matches a known form
                    $lowerForm = strtolower($formPart);
                    foreach (self::$formMap as $abbr => $mappedForm) {
                        if (str_contains($lowerForm, $abbr)) {
                            $result['dosage_form'] = $mappedForm;
                            break;
                        }
                    }
                }

                if (! empty($foundDetails)) {
                    $result['form_detail'] = implode(', ', array_unique($foundDetails));
                }
            }
        }

        return $result;
    }
}
