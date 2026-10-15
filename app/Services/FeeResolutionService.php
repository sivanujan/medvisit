<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\FeeComponent;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use App\Models\VisitType;
use Illuminate\Validation\ValidationException;

class FeeResolutionService
{
    /**
     * Resolve the effective fees and payout for a given context.
     *
     * @param  string  $channel  'walk_in' | 'phone' | 'online'
     * @param  array|null  $manualDiscount  ['type' => 'amount'|'percent'|'waiver', 'value' => int, 'reason' => string]
     * @param  string  $userRole  'clinic_admin' | 'receptionist' | 'doctor' | 'super_admin'
     * @return array Resolved fee snapshot
     */
    public function resolve(
        ?Tenant $tenant = null,
        ?Doctor $doctor = null,
        DoctorSession|SessionTemplate|null $session = null,
        VisitType|int|null $visitType = null,
        string $channel = 'walk_in',
        array $optionalComponentIds = [],
        ?array $manualDiscount = null,
        string $userRole = 'clinic_admin',
        array $selectedOptionalComponentIds = []
    ): array {
        if (! empty($selectedOptionalComponentIds) && empty($optionalComponentIds)) {
            $optionalComponentIds = $selectedOptionalComponentIds;
        }

        $tenant = $tenant ?? tenant();
        $settings = $this->getTenantSettings($tenant);

        // 1. Resolve Visit Type
        $resolvedVisitType = $this->resolveVisitType($tenant, $visitType);

        // 2. Resolve Pricing Mode
        $pricingMode = $settings['pricing_mode'] ?? 'split';
        $modeSource = 'from clinic';

        if ($doctor && ! $doctor->use_clinic_default_fees && ! empty($doctor->pricing_mode)) {
            $pricingMode = $doctor->pricing_mode;
            $modeSource = 'from doctor';
        }

        // 3. Resolve Base Fees and Sources
        $baseDoctorFee = $settings['default_doctor_fee'] ?? 200000;
        $baseClinicFee = $settings['default_clinic_fee'] ?? 80000;
        $baseTotalFee = $settings['default_total_fee'] ?? ($baseDoctorFee + $baseClinicFee);

        $doctorFeeSource = 'from clinic';
        $clinicFeeSource = 'from clinic';
        $totalFeeSource = 'from clinic';

        // Doctor Override
        if ($doctor && ! $doctor->use_clinic_default_fees) {
            if ($doctor->custom_doctor_fee !== null) {
                $baseDoctorFee = (int) $doctor->custom_doctor_fee;
                $doctorFeeSource = 'from doctor';
            }
            if ($doctor->custom_clinic_fee !== null) {
                $baseClinicFee = (int) $doctor->custom_clinic_fee;
                $clinicFeeSource = 'from doctor';
            }
            if ($doctor->custom_total_fee !== null) {
                $baseTotalFee = (int) $doctor->custom_total_fee;
                $totalFeeSource = 'from doctor';
            }
        }

        // Session Override
        if ($session && ($session->fee_override_type ?? 'inherit') === 'custom') {
            if ($session->custom_doctor_fee !== null) {
                $baseDoctorFee = (int) $session->custom_doctor_fee;
                $doctorFeeSource = 'from session';
            }
            if ($session->custom_clinic_fee !== null) {
                $baseClinicFee = (int) $session->custom_clinic_fee;
                $clinicFeeSource = 'from session';
            }
            if ($session->custom_total_fee !== null) {
                $baseTotalFee = (int) $session->custom_total_fee;
                $totalFeeSource = 'from session';
            }
        }

        // 4. Resolve Active Fee Components
        $components = FeeComponent::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $lines = [];
        $grossDoctor = 0;
        $grossClinic = 0;
        $grossThirdParty = 0;
        $thirdPartyBreakdown = [];

        $hasPrimaryConsultationComponent = $components->contains(fn ($c) => in_array($c->code, ['doctor_fee', 'consultation_fee'], true));

        // Always seed base consultation lines if not explicitly configured in components table
        if (! $hasPrimaryConsultationComponent) {
            if ($pricingMode === 'single_price') {
                $grossClinic = $baseTotalFee;
                $lines[] = [
                    'name' => 'Consultation Fee',
                    'code' => 'consultation_fee',
                    'recipient' => 'clinic',
                    'recipient_name' => null,
                    'amount' => $baseTotalFee,
                    'amount_lkr' => round($baseTotalFee / 100, 2),
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'source' => $totalFeeSource,
                ];
            } else {
                $grossDoctor = $baseDoctorFee;
                $grossClinic = $baseClinicFee;
                $lines[] = [
                    'name' => 'Doctor Fee',
                    'code' => 'doctor_fee',
                    'recipient' => 'doctor',
                    'recipient_name' => null,
                    'amount' => $baseDoctorFee,
                    'amount_lkr' => round($baseDoctorFee / 100, 2),
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'source' => $doctorFeeSource,
                ];
                $lines[] = [
                    'name' => 'Channeling Fee',
                    'code' => 'channeling_fee',
                    'recipient' => 'clinic',
                    'recipient_name' => null,
                    'amount' => $baseClinicFee,
                    'amount_lkr' => round($baseClinicFee / 100, 2),
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'source' => $clinicFeeSource,
                ];
            }
        }

        if ($components->isNotEmpty()) {
            // Evaluate custom components
            $fixedSubtotal = $grossDoctor + $grossClinic;
            $componentValues = [];

            foreach ($components as $comp) {
                // Check channel applicability
                $appliesTo = $comp->applies_to ?? ['walk_in', 'phone', 'online'];
                if (! in_array($channel, $appliesTo, true)) {
                    continue;
                }

                // Check mandatory or optional
                if (! $comp->is_mandatory && ! in_array($comp->id, $optionalComponentIds, false)) {
                    continue;
                }

                $amount = 0;
                $source = 'from clinic';

                // Check doctor component override
                $docOverrides = $doctor?->component_overrides ?? [];
                $sessOverrides = $session?->component_overrides ?? [];

                $overrideVal = $sessOverrides[$comp->id] ?? $docOverrides[$comp->id] ?? null;
                if ($sessOverrides && isset($sessOverrides[$comp->id])) {
                    $source = 'from session';
                } elseif ($docOverrides && isset($docOverrides[$comp->id])) {
                    $source = 'from doctor';
                }

                if ($overrideVal !== null) {
                    $amount = (int) $overrideVal;
                } elseif ($comp->amount_type === FeeComponent::AMOUNT_TYPE_FIXED) {
                    // For split mode doctor_fee and channeling_fee, inherit hierarchy values
                    if ($comp->code === 'doctor_fee') {
                        $amount = $baseDoctorFee;
                        $source = $doctorFeeSource;
                    } elseif ($comp->code === 'channeling_fee') {
                        $amount = $baseClinicFee;
                        $source = $clinicFeeSource;
                    } else {
                        $amount = (int) $comp->amount_value;
                    }
                } elseif ($comp->amount_type === FeeComponent::AMOUNT_TYPE_PERCENT_COMPONENT) {
                    $targetAmount = $componentValues[$comp->target_component_id] ?? 0;
                    $amount = (int) round(($targetAmount * $comp->amount_value) / 100);
                } elseif ($comp->amount_type === FeeComponent::AMOUNT_TYPE_PERCENT_SUBTOTAL) {
                    $amount = (int) round(($fixedSubtotal * $comp->amount_value) / 100);
                }

                // If not percentage, add to fixedSubtotal
                if ($comp->amount_type === FeeComponent::AMOUNT_TYPE_FIXED) {
                    $fixedSubtotal += $amount;
                }

                $componentValues[$comp->id] = $amount;

                $line = [
                    'id' => $comp->id,
                    'name' => $comp->name,
                    'code' => $comp->code,
                    'recipient' => $comp->recipient,
                    'recipient_name' => $comp->recipient_name,
                    'amount' => $amount,
                    'amount_lkr' => round($amount / 100, 2),
                    'is_mandatory' => $comp->is_mandatory,
                    'is_separate_line' => $comp->is_separate_line,
                    'source' => $source,
                ];

                $lines[] = $line;

                if ($comp->recipient === FeeComponent::RECIPIENT_DOCTOR) {
                    $grossDoctor += $amount;
                } elseif ($comp->recipient === FeeComponent::RECIPIENT_CLINIC) {
                    $grossClinic += $amount;
                } elseif ($comp->recipient === FeeComponent::RECIPIENT_THIRD_PARTY) {
                    $grossThirdParty += $amount;
                    $tpName = $comp->recipient_name ?: 'Third Party';
                    $thirdPartyBreakdown[$tpName] = ($thirdPartyBreakdown[$tpName] ?? 0) + $amount;
                }
            }
        }

        // 5. Apply Visit Type Adjustment
        if ($resolvedVisitType) {
            if ($resolvedVisitType->pricing_type === VisitType::PRICING_FIXED) {
                // Fixed fee visit type overrides the primary consultation / doctor amount
                $targetFixed = (int) $resolvedVisitType->fixed_fee_cents;
                if ($pricingMode === 'single_price') {
                    $grossClinic = $targetFixed;
                    $grossDoctor = 0;
                } else {
                    $grossDoctor = $targetFixed;
                    $grossClinic = 0;
                }
                // Update corresponding line
                foreach ($lines as &$line) {
                    if ($line['recipient'] === ($pricingMode === 'single_price' ? 'clinic' : 'doctor')) {
                        $line['amount'] = $targetFixed;
                        $line['amount_lkr'] = round($targetFixed / 100, 2);
                        $line['source'] = 'from visit type';
                    } elseif ($line['recipient'] === ($pricingMode === 'single_price' ? 'doctor' : 'clinic')) {
                        $line['amount'] = 0;
                        $line['amount_lkr'] = 0;
                        $line['source'] = 'from visit type';
                    }
                }
                unset($line);
            } elseif ($resolvedVisitType->pricing_type === VisitType::PRICING_PERCENTAGE) {
                $pct = (int) $resolvedVisitType->percentage_value;
                if ($pct !== 100) {
                    $grossDoctor = (int) round(($grossDoctor * $pct) / 100);
                    $grossClinic = (int) round(($grossClinic * $pct) / 100);
                    // Update doctor & clinic lines proportionally
                    foreach ($lines as &$line) {
                        if ($line['recipient'] === 'doctor' || $line['recipient'] === 'clinic') {
                            $line['amount'] = (int) round(($line['amount'] * $pct) / 100);
                            $line['amount_lkr'] = round($line['amount'] / 100, 2);
                            $line['source'] = 'from visit type ('.$pct.'%)';
                        }
                    }
                    unset($line);
                }
            }
        }

        // 6. Online Booking Fee
        $onlineFee = 0;
        if ($channel === 'online' && ! empty($settings['online_booking_fee'])) {
            $onlineFee = (int) $settings['online_booking_fee'];
            $grossClinic += $onlineFee;
            $lines[] = [
                'name' => 'Online Booking Fee',
                'code' => 'online_booking_fee',
                'recipient' => 'clinic',
                'recipient_name' => null,
                'amount' => $onlineFee,
                'amount_lkr' => round($onlineFee / 100, 2),
                'is_mandatory' => true,
                'is_separate_line' => true,
                'source' => 'from clinic (online fee)',
            ];
        }

        $grossSubtotal = $grossDoctor + $grossClinic + $grossThirdParty;

        // 7. Manual Discount & Permission Check
        $discountAmount = 0;
        $discountType = null;
        $discountReason = null;
        $discountValue = null;

        if ($manualDiscount && ! empty($manualDiscount['reason'])) {
            $discountType = $manualDiscount['type'] ?? 'amount';
            $discountValue = $manualDiscount['value'] ?? 0;
            $discountReason = trim((string) $manualDiscount['reason']);

            if ($discountType === 'waiver') {
                $discountAmount = $grossSubtotal;
                $discountType = 'percent';
                $discountValue = 100;
            } elseif ($discountType === 'percent') {
                $pct = min(100, max(0, (float) $discountValue));
                $discountAmount = (int) round(($grossSubtotal * $pct) / 100);
            } else { // amount in cents or LKR
                $rawAmt = (int) $discountValue;
                $discountAmount = min($grossSubtotal, max(0, $rawAmt));
            }

            // Permission enforcement
            $this->validateDiscountPermission($tenant, $userRole, $discountType, (int) $discountValue, $discountAmount, $grossSubtotal);
        }

        $netBeforeRounding = max(0, $grossSubtotal - $discountAmount);

        // 8. Rounding (optional: 0, 10, 50, 100 in Rs., i.e. 1000, 5000, 10000 cents)
        $roundingStep = (int) ($settings['rounding_step'] ?? 0);
        $patientTotal = $netBeforeRounding;
        $roundingAdjustment = 0;

        if ($roundingStep > 0 && $netBeforeRounding > 0) {
            $stepCents = $roundingStep * 100;
            $patientTotal = (int) round($netBeforeRounding / $stepCents) * $stepCents;
            $roundingAdjustment = $patientTotal - $netBeforeRounding;
        }

        // 9. Doctor Payout Calculation
        $payoutResult = $this->calculateDoctorPayout(
            tenant: $tenant,
            doctor: $doctor,
            session: $session,
            visitType: $resolvedVisitType,
            grossDoctor: $grossDoctor,
            patientTotal: $patientTotal,
            grossSubtotal: $grossSubtotal
        );

        $doctorPayoutAmount = $payoutResult['amount'];
        $payoutRuleApplied = $payoutResult['rule'];

        // Clinic net portion after doctor payout & third parties
        $clinicNet = max(0, $patientTotal - $doctorPayoutAmount - $grossThirdParty);

        return [
            'pricing_mode' => $pricingMode,
            'channel' => $channel,
            'patient_total' => $patientTotal,
            'patient_total_lkr' => round($patientTotal / 100, 2),
            'patient_total_formatted' => 'Rs. '.number_format($patientTotal / 100, 2),
            'gross_subtotal' => $grossSubtotal,
            'gross_subtotal_lkr' => round($grossSubtotal / 100, 2),
            'doctor_fee_portion' => $grossDoctor,
            'doctor_fee_portion_lkr' => round($grossDoctor / 100, 2),
            'clinic_portion' => $grossClinic,
            'clinic_portion_lkr' => round($grossClinic / 100, 2),
            'clinic_net_amount' => $clinicNet,
            'clinic_net_amount_lkr' => round($clinicNet / 100, 2),
            'third_party_portion' => $grossThirdParty,
            'third_party_portion_lkr' => round($grossThirdParty / 100, 2),
            'third_party_breakdown' => $thirdPartyBreakdown,
            'third_party_totals' => $thirdPartyBreakdown,
            'online_fee' => $onlineFee,
            'online_booking_fee' => $onlineFee,
            'online_fee_lkr' => round($onlineFee / 100, 2),
            'doctor_payout_amount' => $doctorPayoutAmount,
            'doctor_payout_amount_lkr' => round($doctorPayoutAmount / 100, 2),
            'doctor_payout_formatted' => 'Rs. '.number_format($doctorPayoutAmount / 100, 2),
            'visit_type' => $resolvedVisitType ? [
                'id' => $resolvedVisitType->id,
                'name' => $resolvedVisitType->name,
                'code' => $resolvedVisitType->code,
                'pricing_type' => $resolvedVisitType->pricing_type,
                'percentage_value' => $resolvedVisitType->percentage_value,
                'fixed_fee_cents' => $resolvedVisitType->fixed_fee_cents,
            ] : null,
            'discount' => [
                'amount' => $discountAmount,
                'amount_lkr' => round($discountAmount / 100, 2),
                'type' => $discountType,
                'value' => $discountValue,
                'reason' => $discountReason,
            ],
            'rounding' => [
                'step' => $roundingStep,
                'adjustment' => $roundingAdjustment,
            ],
            'lines' => $lines,
            'source_levels' => [
                'pricing_mode' => $modeSource,
                'doctor_fee' => $doctorFeeSource,
                'clinic_fee' => $clinicFeeSource,
                'total_fee' => $totalFeeSource,
                'payout_rule' => $payoutRuleApplied['source'] ?? 'from clinic',
            ],
            'payout_rule_applied' => $payoutRuleApplied,
        ];
    }

    /**
     * Resolve Doctor Payout Rule & Amount.
     */
    public function calculateDoctorPayout(
        Tenant $tenant,
        ?Doctor $doctor,
        DoctorSession|SessionTemplate|null $session,
        ?VisitType $visitType = null,
        int $grossDoctor = 0,
        int $patientTotal = 0,
        int $grossSubtotal = 0,
        int $patientsCount = 0,
        ?string $tokenStatus = null,
        ?int $patientTotalCents = null,
        ?int $doctorFeePortionCents = null
    ): array {
        if ($patientTotalCents !== null && $patientTotal === 0) {
            $patientTotal = $patientTotalCents;
        }
        if ($doctorFeePortionCents !== null && $grossDoctor === 0) {
            $grossDoctor = $doctorFeePortionCents;
        }

        $settings = $this->getTenantSettings($tenant);
        $rule = $settings['default_payout_rule'] ?? [
            'type' => 'full_doctor_fee',
            'value' => 0,
            'min_patients' => 0,
            'pay_no_shows' => false,
            'pay_cancelled' => false,
        ];
        $ruleSource = 'from clinic';

        // Doctor Override
        if ($doctor && ! empty($doctor->payout_rule) && ($doctor->payout_rule['type'] ?? '') !== 'use_clinic_default') {
            $rule = array_merge($rule, $doctor->payout_rule);
            $ruleSource = 'from doctor';
        }

        // Session Override
        if ($session && ! empty($session->payout_rule_override)) {
            $rule = array_merge($rule, $session->payout_rule_override);
            $ruleSource = 'from session';
        }

        // Visit Type Override
        if ($visitType && ! empty($visitType->payout_rule_override)) {
            $rule = array_merge($rule, $visitType->payout_rule_override);
            $ruleSource = 'from visit type';
        }

        $type = $rule['type'] ?? 'full_doctor_fee';
        $val = (int) ($rule['value'] ?? 0);
        $amount = 0;

        // Check cancellation & no-show status
        if ($tokenStatus === 'cancelled' && empty($settings['doctor_paid_for_cancelled'])) {
            return [
                'amount' => 0,
                'doctor_payout_amount' => 0,
                'clinic_amount' => $patientTotal,
                'rule' => array_merge($rule, ['source' => $ruleSource]),
                'source' => $ruleSource,
            ];
        }

        if ($tokenStatus === 'no_show' && empty($settings['doctor_paid_for_no_shows'])) {
            return [
                'amount' => 0,
                'doctor_payout_amount' => 0,
                'clinic_amount' => $patientTotal,
                'rule' => array_merge($rule, ['source' => $ruleSource]),
                'source' => $ruleSource,
            ];
        }

        switch ($type) {
            case 'full_doctor_fee':
                $amount = $grossDoctor;
                break;

            case 'fixed_per_patient':
                $amount = $val <= 50000 && $val > 0 ? $val * 100 : $val;
                break;

            case 'percentage_of_total':
                // Percentage of patient total or gross consultation
                $amount = (int) round(($patientTotal * $val) / 100);
                break;

            case 'fixed_per_session':
                $minPatients = (int) ($rule['min_patients'] ?? 0);
                if ($patientsCount > 0) {
                    if ($minPatients > 0 && $patientsCount < $minPatients) {
                        $amount = 0;
                    } else {
                        $valCents = $val <= 50000 ? $val * 100 : $val;
                        $amount = $valCents;
                    }
                } else {
                    $amount = 0;
                }
                break;

            case 'salaried':
            case 'none':
                $amount = 0;
                break;

            default:
                $amount = $grossDoctor;
                break;
        }

        $payoutAmount = max(0, $amount);

        return [
            'amount' => $payoutAmount,
            'doctor_payout_amount' => $payoutAmount,
            'clinic_amount' => max(0, $patientTotal - $payoutAmount),
            'rule' => array_merge($rule, ['source' => $ruleSource]),
            'source' => $ruleSource,
        ];
    }

    /**
     * Validate whether current user is allowed to apply the specified discount.
     */
    protected function validateDiscountPermission(
        Tenant $tenant,
        string $userRole,
        string $discountType,
        int $discountValue,
        int $discountAmount,
        int $grossSubtotal
    ): void {
        // Clinic admin and super admin have unlimited authority
        if (in_array($userRole, ['clinic_admin', 'super_admin'], true)) {
            return;
        }

        $settings = $this->getTenantSettings($tenant);

        if (empty($settings['receptionist_can_discount'])) {
            throw ValidationException::withMessages([
                'discount' => 'Receptionists are not authorized to grant discounts or fee waivers. Please request a clinic administrator.',
                'discount_value' => 'Receptionists are not authorized to grant discounts or fee waivers. Please request a clinic administrator.',
            ]);
        }

        $maxType = $settings['receptionist_max_discount_type'] ?? 'percent';
        $maxVal = (int) ($settings['receptionist_max_discount_value'] ?? 20);

        if ($maxType === 'percent') {
            $requestedPercent = $grossSubtotal > 0 ? ($discountAmount / $grossSubtotal) * 100 : 0;
            if ($requestedPercent > $maxVal) {
                $msg = "Discount exceeds receptionist limit of {$maxVal}%. Requested: ".round($requestedPercent, 1).'%.';
                throw ValidationException::withMessages([
                    'discount' => $msg,
                    'discount_value' => $msg,
                ]);
            }
        } else {
            // maxType is amount (cents)
            if ($discountAmount > $maxVal) {
                $maxFormatted = 'Rs. '.number_format($maxVal / 100, 2);
                $msg = "Discount exceeds receptionist maximum limit of {$maxFormatted}.";
                throw ValidationException::withMessages([
                    'discount' => $msg,
                    'discount_value' => $msg,
                ]);
            }
        }
    }

    /**
     * Resolve default or specified Visit Type.
     */
    protected function resolveVisitType(Tenant $tenant, VisitType|int|null $visitType): ?VisitType
    {
        if ($visitType instanceof VisitType) {
            return $visitType;
        }

        if (is_numeric($visitType) && (int) $visitType > 0) {
            $found = VisitType::where('tenant_id', $tenant->id)->find($visitType);
            if ($found) {
                return $found;
            }
        }

        // Return default visit type for tenant
        return VisitType::where('tenant_id', $tenant->id)
            ->where('is_default', true)
            ->where('is_active', true)
            ->first()
            ?? VisitType::where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->first();
    }

    /**
     * Get or initialize Tenant Fee Settings.
     */
    public function getTenantSettings(?Tenant $tenant = null): array
    {
        $tenant = $tenant ?? tenant();
        $settings = $tenant->fee_settings ?? [];

        return array_merge([
            'pricing_mode' => 'split',
            'default_doctor_fee' => 200000,
            'default_clinic_fee' => 80000,
            'default_total_fee' => 280000,
            'online_booking_fee' => 0,
            'rounding_step' => 0,
            'default_payout_rule' => [
                'type' => 'full_doctor_fee',
                'value' => 0,
                'min_patients' => 0,
                'pay_no_shows' => false,
                'pay_cancelled' => false,
            ],
            'receptionist_can_discount' => true,
            'receptionist_max_discount_type' => 'percent',
            'receptionist_max_discount_value' => 20,
            'fee_setup_completed' => true,
        ], is_array($settings) ? $settings : []);
    }
}
