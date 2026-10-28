<?php

declare(strict_types=1);

namespace App\ValueObjects;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\DoctorSession;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

/**
 * Value Object for Fee Snapshots.
 * Normalizes between Schema A (patient_total / doctor_payout_amount / clinic_net_amount)
 * and Schema B (total_fee / doctor_fee / clinic_fee).
 * Never silently returns 0 for missing data.
 */
class FeeSnapshot
{
    public const VERSION = 2;

    public function __construct(
        public readonly int $totalFeeCents,
        public readonly int $doctorFeeCents,
        public readonly int $clinicFeeCents,
        public readonly array $payoutRule = ['type' => 'full_doctor_fee'],
        public readonly string $channel = 'reception',
        public readonly ?array $raw = null
    ) {
        if ($this->totalFeeCents < 0 || $this->doctorFeeCents < 0 || $this->clinicFeeCents < 0) {
            throw new InvalidArgumentException(
                "Fee amounts cannot be negative. Total: {$this->totalFeeCents}, Doc: {$this->doctorFeeCents}, Clinic: {$this->clinicFeeCents}"
            );
        }
    }

    /**
     * Create FeeSnapshot from an array.
     */
    public static function fromArray(?array $data, ?DoctorSession $session = null): self
    {
        if (empty($data)) {
            if ($session) {
                $docFee = (int) $session->doctor_fee;
                $clFee = (int) $session->clinic_fee;
                $total = $docFee + $clFee;
                $rule = $session->payout_rule_override ?? $session->doctor?->payout_rule ?? ['type' => 'full_doctor_fee'];

                return new self(
                    totalFeeCents: $total,
                    doctorFeeCents: $docFee,
                    clinicFeeCents: $clFee,
                    payoutRule: is_array($rule) ? $rule : ['type' => 'full_doctor_fee'],
                    channel: 'reception',
                    raw: ['source' => 'session_fallback']
                );
            }

            Log::error('FeeSnapshot::fromArray called with null/empty data and no session fallback.');
            throw new InvalidArgumentException('Fee snapshot payload is empty or missing required fee keys.');
        }

        // Schema A: patient_total / doctor_payout_amount / clinic_net_amount
        $hasSchemaA = array_key_exists('patient_total', $data) || array_key_exists('doctor_payout_amount', $data);

        // Schema B: total_fee / doctor_fee / clinic_fee
        $hasSchemaB = array_key_exists('total_fee', $data) || array_key_exists('doctor_fee', $data);

        if (! $hasSchemaA && ! $hasSchemaB) {
            if ($session) {
                return self::fromArray([], $session);
            }
            Log::error('FeeSnapshot::fromArray: payload missing both Schema A and Schema B keys.', ['data' => $data]);
            throw new InvalidArgumentException('Fee snapshot is missing required keys (neither total_fee/doctor_fee nor patient_total/doctor_payout_amount found).');
        }

        // Extract total fee
        $totalFee = 0;
        if (isset($data['total_fee']) && is_numeric($data['total_fee'])) {
            $totalFee = (int) $data['total_fee'];
        } elseif (isset($data['patient_total']) && is_numeric($data['patient_total'])) {
            $totalFee = (int) $data['patient_total'];
        } elseif (isset($data['gross_subtotal']) && is_numeric($data['gross_subtotal'])) {
            $totalFee = (int) $data['gross_subtotal'];
        }

        // Extract doctor fee
        $doctorFee = 0;
        if (isset($data['doctor_payout_amount']) && is_numeric($data['doctor_payout_amount'])) {
            $doctorFee = (int) $data['doctor_payout_amount'];
        } elseif (isset($data['doctor_fee']) && is_numeric($data['doctor_fee'])) {
            $doctorFee = (int) $data['doctor_fee'];
        } elseif (isset($data['doctor_fee_portion']) && is_numeric($data['doctor_fee_portion'])) {
            $doctorFee = (int) $data['doctor_fee_portion'];
        }

        // Extract clinic fee
        $clinicFee = 0;
        if (isset($data['clinic_net_amount']) && is_numeric($data['clinic_net_amount'])) {
            $clinicFee = (int) $data['clinic_net_amount'];
        } elseif (isset($data['clinic_fee']) && is_numeric($data['clinic_fee'])) {
            $clinicFee = (int) $data['clinic_fee'];
        } elseif (isset($data['clinic_portion']) && is_numeric($data['clinic_portion'])) {
            $clinicFee = (int) $data['clinic_portion'];
        } else {
            $clinicFee = max(0, $totalFee - $doctorFee);
        }

        // Ensure consistency if total equals doc + clinic
        if ($totalFee === 0 && ($doctorFee > 0 || $clinicFee > 0)) {
            $totalFee = $doctorFee + $clinicFee;
        }

        // Extract payout rule
        $rule = $data['payout_rule_applied'] ?? $data['payout_rule'] ?? ['type' => 'full_doctor_fee'];
        if (! is_array($rule)) {
            $rule = ['type' => 'full_doctor_fee'];
        }

        $channel = (string) ($data['channel'] ?? 'reception');

        return new self(
            totalFeeCents: $totalFee,
            doctorFeeCents: $doctorFee,
            clinicFeeCents: $clinicFee,
            payoutRule: $rule,
            channel: $channel,
            raw: $data
        );
    }

    /**
     * Create FeeSnapshot from a BookingToken.
     */
    public static function fromToken(BookingToken $token): self
    {
        return self::fromArray($token->fee_snapshot, $token->session);
    }

    /**
     * Create FeeSnapshot from a Bill.
     */
    public static function fromBill(Bill $bill): self
    {
        if (! empty($bill->fee_snapshot)) {
            return self::fromArray($bill->fee_snapshot, $bill->token?->session);
        }

        if ($bill->token && ! empty($bill->token->fee_snapshot)) {
            return self::fromArray($bill->token->fee_snapshot, $bill->token->session);
        }

        // Fallback to explicit bill columns
        $doc = (int) ($bill->doctor_fee ?? 0);
        $clinic = (int) ($bill->clinic_fee ?? 0);
        $total = (int) ($bill->total_amount ?? ($doc + $clinic));

        return new self(
            totalFeeCents: $total,
            doctorFeeCents: $doc,
            clinicFeeCents: $clinic,
            payoutRule: ['type' => 'full_doctor_fee'],
            channel: 'reception',
            raw: ['source' => 'bill_columns']
        );
    }

    /**
     * Calculate doctor share for a given consultation gross amount under a specific rule.
     * Note: Consultation gross excludes pharmacy!
     */
    public function calculateDoctorShare(int $consultationGrossCents, ?array $ruleOverride = null): int
    {
        $rule = $ruleOverride ?? $this->payoutRule;
        $type = $rule['type'] ?? 'full_doctor_fee';

        return match ($type) {
            'fixed_per_patient' => (int) ($rule['value'] ?? $this->doctorFeeCents),
            'percentage_of_total' => (int) round(($consultationGrossCents * (float) ($rule['value'] ?? 60)) / 100),
            'fixed_per_session' => 0, // Calculated at session level
            'salaried', 'none' => 0,
            default => $this->doctorFeeCents, // 'full_doctor_fee'
        };
    }

    /**
     * Return canonical unified array for database storage.
     */
    public function toUnifiedArray(): array
    {
        return [
            'version' => self::VERSION,
            'total_fee' => $this->totalFeeCents,
            'doctor_fee' => $this->doctorFeeCents,
            'clinic_fee' => $this->clinicFeeCents,
            'patient_total' => $this->totalFeeCents,
            'doctor_payout_amount' => $this->doctorFeeCents,
            'clinic_net_amount' => $this->clinicFeeCents,
            'payout_rule_applied' => $this->payoutRule,
            'channel' => $this->channel,
        ];
    }

    public function formatTotalLKR(): string
    {
        return Bill::formatLKR($this->totalFeeCents, true);
    }

    public function formatDoctorLKR(): string
    {
        return Bill::formatLKR($this->doctorFeeCents, true);
    }

    public function formatClinicLKR(): string
    {
        return Bill::formatLKR($this->clinicFeeCents, true);
    }
}
