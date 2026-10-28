<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Bill;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\DoctorSettlement;
use App\Models\PayoutSettlementItem;
use App\Models\SettlementAdjustment;
use App\Models\User;
use App\ValueObjects\FeeSnapshot;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DoctorPayoutService
{
    public function __construct(
        protected SequenceService $sequenceService
    ) {}

    /**
     * Compute financial breakdown for a session strictly based on PAID bills (consultation portion only).
     */
    public function calculateSessionFinancials(DoctorSession $session): array
    {
        $tokens = $session->tokens;
        $seenTokens = $tokens->whereIn('status', ['completed', 'in_consultation', 'checked_in', 'called', 'booked']);
        $noShows = $tokens->where('status', 'no_show');

        // All bills belonging to this session
        $bills = Bill::with(['items', 'settlementItem'])
            ->where('tenant_id', $session->tenant_id)
            ->whereHas('token', fn ($q) => $q->where('doctor_session_id', $session->id))
            ->get();

        $paidBills = $bills->where('payment_status', Bill::STATUS_PAID);

        // Effective payout rule
        $payoutRule = $session->payout_rule_override
            ?? $session->doctor?->payout_rule
            ?? ['type' => 'full_doctor_fee', 'value' => 0, 'min_patients' => 0];

        $payoutType = $payoutRule['type'] ?? 'full_doctor_fee';

        $consultationGrossCents = 0;
        $pharmacyGrossCents = 0;
        $doctorShareCents = 0;
        $settledBillsCount = 0;
        $unsettledBillsCount = 0;

        foreach ($paidBills as $b) {
            $pharmacyCents = (int) $b->items->sum('total_price_cents');
            $consultationCents = max(0, $b->total_amount - $pharmacyCents);

            $consultationGrossCents += $consultationCents;
            $pharmacyGrossCents += $pharmacyCents;

            // Compute doctor share per bill
            $billDocShare = 0;
            if ($payoutType !== 'fixed_per_session') {
                $billDocShare = $this->calculateBillDoctorShare($b, $consultationCents, $payoutRule);
                $doctorShareCents += $billDocShare;
            }

            if ($b->settlementItem !== null) {
                $settledBillsCount++;
            } else {
                $unsettledBillsCount++;
            }
        }

        // Fixed per session rule calculation
        if ($payoutType === 'fixed_per_session') {
            $minPatients = (int) ($payoutRule['min_patients'] ?? 0);
            $patientsCount = $paidBills->count();
            $baseValue = (int) ($payoutRule['value'] ?? 0);

            if ($patientsCount === 0) {
                $doctorShareCents = 0;
            } elseif ($minPatients === 0 || $patientsCount >= $minPatients) {
                $doctorShareCents = $baseValue;
            } else {
                // Prorated if below minimum threshold
                $doctorShareCents = (int) round(($baseValue * $patientsCount) / $minPatients);
            }
        }

        $clinicShareCents = max(0, $consultationGrossCents - $doctorShareCents);

        // Status pill determination
        $totalPaidCount = $paidBills->count();
        if ($totalPaidCount === 0 || ($doctorShareCents === 0 && $payoutType !== 'salaried')) {
            $settlementStatus = 'nothing_to_settle';
        } elseif ($unsettledBillsCount === 0) {
            $settlementStatus = 'settled';
        } elseif ($settledBillsCount > 0) {
            $settlementStatus = 'partly_settled';
        } else {
            $settlementStatus = 'unsettled';
        }

        return [
            'id' => $session->id,
            'session_id' => $session->id,
            'doctor_id' => $session->doctor_id,
            'doctor_name' => trim(($session->doctor?->title ?? 'Dr.').' '.($session->doctor?->name ?? 'Doctor')),
            'doctor_color' => Doctor::getDoctorColor($session->doctor_id),
            'session_date' => $session->session_date->format('M d, Y (D)'),
            'session_date_raw' => $session->session_date->toDateString(),
            'start_time' => Carbon::parse($session->start_time)->format('h:i A'),
            'room_number' => $session->room_number ?? 'Suite 1',
            'session_status' => $session->status,
            'is_cancelled' => $session->status === 'cancelled',
            'has_paid_cancelled_warning' => $session->status === 'cancelled' && $totalPaidCount > 0,
            'patients_seen' => $seenTokens->count(),
            'paid_patients' => $totalPaidCount,
            'no_shows' => $noShows->count(),
            'consultation_gross_cents' => $consultationGrossCents,
            'consultation_gross_lkr' => round($consultationGrossCents / 100, 2),
            'gross_collected_lkr' => round($consultationGrossCents / 100, 2),
            'pharmacy_gross_cents' => $pharmacyGrossCents,
            'pharmacy_gross_lkr' => round($pharmacyGrossCents / 100, 2),
            'doctor_share_cents' => $doctorShareCents,
            'doctor_share_lkr' => round($doctorShareCents / 100, 2),
            'doctor_payout_lkr' => round($doctorShareCents / 100, 2),
            'clinic_share_cents' => $clinicShareCents,
            'clinic_share_lkr' => round($clinicShareCents / 100, 2),
            'settled_bills_count' => $settledBillsCount,
            'unsettled_bills_count' => $unsettledBillsCount,
            'settlement_status' => $settlementStatus,
            'is_settled' => ($settlementStatus === 'settled'),
            'payout_type' => $payoutType,
        ];
    }

    /**
     * Compute doctor share for a single paid bill under the effective rule.
     */
    public function calculateBillDoctorShare(Bill $bill, int $consultationGrossCents, array $payoutRule): int
    {
        $type = $payoutRule['type'] ?? 'full_doctor_fee';

        switch ($type) {
            case 'fixed_per_patient':
                return (int) ($payoutRule['value'] ?? $bill->doctor_fee);

            case 'percentage_of_total':
                $pct = (float) ($payoutRule['value'] ?? 60);

                return (int) round(($consultationGrossCents * $pct) / 100);

            case 'salaried':
            case 'none':
                return 0;

            case 'full_doctor_fee':
            default:
                if ($bill->doctor_fee > 0) {
                    return $bill->doctor_fee;
                }
                $snapshot = FeeSnapshot::fromBill($bill);

                return $snapshot->doctorFeeCents;
        }
    }

    /**
     * Get all unsettled paid bills and pending adjustments for a doctor.
     */
    public function getUnsettledBillsForDoctor(string $tenantId, int $doctorId, ?string $startDate = null, ?string $endDate = null): array
    {
        $doctor = Doctor::where('tenant_id', $tenantId)->findOrFail($doctorId);

        $billsQuery = Bill::with(['token.session', 'items'])
            ->where('tenant_id', $tenantId)
            ->where('doctor_id', $doctorId)
            ->where('payment_status', Bill::STATUS_PAID)
            ->whereDoesntHave('settlementItem');

        if ($startDate) {
            $billsQuery->whereHas('token.session', fn ($q) => $q->where('session_date', '>=', $startDate));
        }
        if ($endDate) {
            $billsQuery->whereHas('token.session', fn ($q) => $q->where('session_date', '<=', $endDate));
        }

        $bills = $billsQuery->orderBy('created_at')->get();

        $unsettledBills = $bills->map(function ($b) {
            $sess = $b->token?->session;
            $pharmacyCents = (int) $b->items->sum('total_price_cents');
            $consultationCents = max(0, $b->total_amount - $pharmacyCents);

            $payoutRule = $sess?->payout_rule_override ?? $sess?->doctor?->payout_rule ?? ['type' => 'full_doctor_fee'];
            $docShare = $this->calculateBillDoctorShare($b, $consultationCents, $payoutRule);

            return [
                'bill_id' => $b->id,
                'receipt_number' => $b->receipt_number ?? "REC-{$b->id}",
                'token_id' => $b->booking_token_id,
                'token_number' => $b->token?->token_number ?? 1,
                'patient_id' => $b->patient_id,
                'patient_name' => $b->patient?->name ?? 'Patient',
                'session_id' => $sess?->id,
                'session_date' => $sess?->session_date?->format('M d, Y') ?? 'N/A',
                'session_time' => $sess?->start_time ? Carbon::parse($sess->start_time)->format('h:i A') : '',
                'paid_at' => $b->paid_at?->format('M d, Y h:i A') ?? $b->created_at->format('M d, Y'),
                'consultation_fee_cents' => $consultationCents,
                'consultation_fee_lkr' => round($consultationCents / 100, 2),
                'doctor_share_cents' => $docShare,
                'doctor_share_lkr' => round($docShare / 100, 2),
                'clinic_share_cents' => max(0, $consultationCents - $docShare),
                'clinic_share_lkr' => round(max(0, $consultationCents - $docShare) / 100, 2),
            ];
        })->values()->all();

        // Pending adjustments
        $pendingAdjustments = SettlementAdjustment::where('tenant_id', $tenantId)
            ->where('doctor_id', $doctorId)
            ->whereNull('doctor_settlement_id')
            ->get()
            ->map(fn ($adj) => [
                'id' => $adj->id,
                'type' => $adj->type,
                'amount_cents' => $adj->amount_cents,
                'amount_lkr' => round($adj->amount_cents / 100, 2),
                'reason' => $adj->reason,
                'created_at' => $adj->created_at->format('M d, Y'),
            ])->all();

        return [
            'doctor' => [
                'id' => $doctor->id,
                'name' => trim(($doctor->title ?? 'Dr.').' '.$doctor->name),
                'specialty' => $doctor->specialty,
                'color' => Doctor::getDoctorColor($doctor->id),
            ],
            'bills' => $unsettledBills,
            'adjustments' => $pendingAdjustments,
            'total_bills_doctor_share_cents' => array_sum(array_column($unsettledBills, 'doctor_share_cents')),
            'total_adjustments_cents' => array_sum(array_column($pendingAdjustments, 'amount_cents')),
        ];
    }

    /**
     * Atomically record a settlement with row locks to prevent double-payout concurrency.
     */
    public function recordSettlement(string $tenantId, array $data, User $user): DoctorSettlement
    {
        return DB::transaction(function () use ($tenantId, $data, $user) {
            $doctorId = (int) $data['doctor_id'];
            $billIds = array_map('intval', $data['bill_ids'] ?? []);
            $adjustmentIds = array_map('intval', $data['adjustment_ids'] ?? []);

            if (empty($billIds) && empty($adjustmentIds)) {
                throw new InvalidArgumentException('A settlement must include at least one bill or adjustment.');
            }

            // Row-lock the bills to prevent concurrent settlement
            $lockedBills = Bill::where('tenant_id', $tenantId)
                ->whereIn('id', $billIds)
                ->where('payment_status', Bill::STATUS_PAID)
                ->lockForUpdate()
                ->get();

            if ($lockedBills->count() !== count($billIds)) {
                throw new InvalidArgumentException('One or more selected bills are not paid or could not be locked.');
            }

            // Verify none are already settled
            $alreadySettled = PayoutSettlementItem::where('tenant_id', $tenantId)
                ->whereIn('bill_id', $billIds)
                ->pluck('bill_id')
                ->all();

            if (! empty($alreadySettled)) {
                throw new InvalidArgumentException('Bills #'.implode(', #', $alreadySettled).' are already included in another settlement.');
            }

            // Calculate exact items total
            $itemsDoctorShareTotal = 0;
            $itemsConsultationGrossTotal = 0;
            $itemsClinicShareTotal = 0;
            $itemsToInsert = [];

            foreach ($lockedBills as $b) {
                $sess = $b->token?->session;
                $pharmacyCents = (int) DB::table('bill_items')->where('bill_id', $b->id)->sum('total_price_cents');
                $consultationGross = max(0, $b->total_amount - $pharmacyCents);

                $payoutRule = $sess?->payout_rule_override ?? $sess?->doctor?->payout_rule ?? ['type' => 'full_doctor_fee'];
                $docShare = $this->calculateBillDoctorShare($b, $consultationGross, $payoutRule);
                $clinicShare = max(0, $consultationGross - $docShare);

                $itemsDoctorShareTotal += $docShare;
                $itemsConsultationGrossTotal += $consultationGross;
                $itemsClinicShareTotal += $clinicShare;

                $itemsToInsert[] = [
                    'tenant_id' => $tenantId,
                    'bill_id' => $b->id,
                    'consultation_fee_cents' => $consultationGross,
                    'doctor_share_cents' => $docShare,
                    'clinic_share_cents' => $clinicShare,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // Fetch and lock adjustments
            $adjustmentsTotal = 0;
            $lockedAdjustments = [];
            if (! empty($adjustmentIds)) {
                $lockedAdjustments = SettlementAdjustment::where('tenant_id', $tenantId)
                    ->where('doctor_id', $doctorId)
                    ->whereIn('id', $adjustmentIds)
                    ->whereNull('doctor_settlement_id')
                    ->lockForUpdate()
                    ->get();

                $adjustmentsTotal = (int) $lockedAdjustments->sum('amount_cents');
            }

            // Final settlement total cannot be typed freely — must equal items + adjustments
            $computedFinalPayout = $itemsDoctorShareTotal + $adjustmentsTotal;
            if ($computedFinalPayout < 0) {
                throw new InvalidArgumentException('Total payout amount after adjustments cannot be negative.');
            }

            // Generate gapless sequence PAY-2026-000001
            $settlementNumber = $this->sequenceService->nextPayoutNumber($tenantId);

            $periodStart = $data['period_start'] ?? now()->toDateString();
            $periodEnd = $data['period_end'] ?? now()->toDateString();

            // Distinct sessions represented
            $sessionsCount = $lockedBills->map(fn ($b) => $b->token?->doctor_session_id)->filter()->unique()->count();

            $settlement = DoctorSettlement::create([
                'tenant_id' => $tenantId,
                'doctor_id' => $doctorId,
                'doctor_session_id' => $data['doctor_session_id'] ?? null,
                'settlement_number' => $settlementNumber,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'sessions_count' => $sessionsCount,
                'patients_seen' => $lockedBills->count(),
                'no_shows_count' => 0,
                'gross_collected' => $itemsConsultationGrossTotal,
                'doctor_payout_amount' => $computedFinalPayout,
                'clinic_amount' => $itemsClinicShareTotal,
                'paid_amount' => $computedFinalPayout,
                'adjustments_total' => $adjustmentsTotal,
                'payment_status' => DoctorSettlement::STATUS_PAID,
                'payment_method' => $data['payment_method'] ?? 'bank_transfer',
                'payment_reference' => $data['payment_reference'] ?? null,
                'paid_at' => now(),
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
                'is_legacy' => false,
                'is_voided' => false,
            ]);

            // Link items
            foreach ($itemsToInsert as &$item) {
                $item['doctor_settlement_id'] = $settlement->id;
            }
            DB::table('payout_settlement_items')->insert($itemsToInsert);

            // Mark adjustments as applied
            foreach ($lockedAdjustments as $adj) {
                $adj->update([
                    'doctor_settlement_id' => $settlement->id,
                    'applied_at' => now(),
                ]);
            }

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_role' => $user->roles()->first()?->name ?? 'staff',
                'action' => 'payout.recorded',
                'resource_type' => 'doctor_settlement',
                'resource_id' => (string) $settlement->id,
                'description' => "Recorded settlement {$settlement->settlement_number} of Rs. ".number_format($computedFinalPayout / 100, 2).' for '.count($lockedBills).' bills.',
                'metadata' => [
                    'settlement_number' => $settlementNumber,
                    'doctor_id' => $doctorId,
                    'amount_cents' => $computedFinalPayout,
                    'bills_count' => count($lockedBills),
                    'adjustments_count' => count($lockedAdjustments),
                ],
            ]);

            return $settlement;
        });
    }

    /**
     * Void a settlement (unlocks bills, unlinks adjustments, audit logs, never hard delete).
     */
    public function voidSettlement(string $tenantId, int $settlementId, string $reason, User $user): DoctorSettlement
    {
        return DB::transaction(function () use ($tenantId, $settlementId, $reason, $user) {
            $settlement = DoctorSettlement::where('tenant_id', $tenantId)
                ->where('id', $settlementId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($settlement->is_voided) {
                throw new InvalidArgumentException("Settlement {$settlement->settlement_number} is already voided.");
            }

            // Unlock bills by deleting settlement items
            $itemCount = PayoutSettlementItem::where('doctor_settlement_id', $settlement->id)->count();
            PayoutSettlementItem::where('doctor_settlement_id', $settlement->id)->delete();

            // Release any applied adjustments back to pending
            SettlementAdjustment::where('doctor_settlement_id', $settlement->id)
                ->update([
                    'doctor_settlement_id' => null,
                    'applied_at' => null,
                ]);

            // Mark settlement as voided
            $settlement->update([
                'is_voided' => true,
                'payment_status' => DoctorSettlement::STATUS_VOIDED,
                'void_reason' => $reason,
                'voided_at' => now(),
                'voided_by' => $user->id,
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_role' => $user->roles()->first()?->name ?? 'staff',
                'action' => 'payout.voided',
                'resource_type' => 'doctor_settlement',
                'resource_id' => (string) $settlement->id,
                'description' => "Voided settlement {$settlement->settlement_number}. Reason: {$reason}. Unlocked {$itemCount} bills.",
                'metadata' => [
                    'settlement_number' => $settlement->settlement_number,
                    'unlocked_bills_count' => $itemCount,
                    'reason' => $reason,
                ],
            ]);

            return $settlement;
        });
    }

    /**
     * Create negative adjustment if a settled bill is refunded later.
     */
    public function handleSettledBillRefund(Bill $bill, string $reason, User $user): ?SettlementAdjustment
    {
        $settlementItem = PayoutSettlementItem::where('bill_id', $bill->id)->first();
        if (! $settlementItem) {
            return null; // Bill was never settled; no adjustment needed
        }

        $doctorShareCents = $settlementItem->doctor_share_cents;
        if ($doctorShareCents <= 0) {
            return null;
        }

        // Create negative adjustment ("-Rs. 2,500 · refund of REC-…")
        $receiptNum = $bill->receipt_number ?? "REC-{$bill->id}";
        $adjustment = SettlementAdjustment::create([
            'tenant_id' => $bill->tenant_id,
            'doctor_id' => $bill->doctor_id,
            'bill_id' => $bill->id,
            'type' => SettlementAdjustment::TYPE_REFUND,
            'amount_cents' => -abs($doctorShareCents),
            'reason' => '−'.Bill::formatLKR(abs($doctorShareCents), true)." · refund of {$receiptNum}",
            'applied_at' => null,
            'created_by' => $user->id,
        ]);

        AuditEvent::create([
            'tenant_id' => $bill->tenant_id,
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_role' => $user->roles()->first()?->name ?? 'staff',
            'action' => 'payout.adjustment_created',
            'resource_type' => 'settlement_adjustment',
            'resource_id' => (string) $adjustment->id,
            'description' => 'Created refund adjustment of -'.Bill::formatLKR(abs($doctorShareCents))." for Doctor #{$bill->doctor_id} due to refund of bill {$receiptNum}.",
            'metadata' => [
                'bill_id' => $bill->id,
                'doctor_id' => $bill->doctor_id,
                'amount_cents' => -abs($doctorShareCents),
            ],
        ]);

        return $adjustment;
    }
}
