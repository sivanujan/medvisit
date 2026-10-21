<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\Bill;
use App\Models\BillAdjustment;

class BillCalculator
{
    /**
     * Recalculate bill total and clinic net amount incorporating line items (medicines).
     * Bill total = existing fee components gross subtotal + sum(bill_items) - discount.
     */
    public function recalculate(Bill $bill): Bill
    {
        $snapshot = $bill->fee_snapshot ?? [];

        // 1. Fee components base subtotal (from snapshot or base fees)
        $feeComponentsSubtotal = (int) (
            $snapshot['gross_subtotal']
            ?? $snapshot['patient_total']
            ?? $snapshot['subtotal']
            ?? ($bill->subtotal > 0 ? $bill->subtotal : null)
            ?? ($bill->consultation_fee > 0 ? $bill->consultation_fee : null)
            ?? ((int) $bill->doctor_fee + (int) $bill->clinic_fee + (int) $bill->other_fee)
        );

        // 2. Sum of all line items (dispensed medicines)
        $medicinesTotal = (int) $bill->items()->sum('total_price_cents');

        // 3. Gross Total
        $grossSubtotal = $feeComponentsSubtotal + $medicinesTotal;

        // 4. Discount
        $discountAmount = (int) ($bill->discount ?? 0);
        if (isset($snapshot['discount']['amount'])) {
            $discountAmount = (int) $snapshot['discount']['amount'];
        }

        // 5. Patient Total
        $patientTotal = max(0, $grossSubtotal - $discountAmount);

        // 6. Clinic Net Amount (Clinic fee portion + 100% of medicine sales revenue)
        $baseClinicNet = (int) (
            $snapshot['clinic_net_amount']
            ?? $snapshot['clinic_fee_portion']
            ?? ($bill->clinic_net_amount > 0 ? $bill->clinic_net_amount : null)
            ?? ($bill->clinic_fee > 0 ? $bill->clinic_fee : null)
            ?? 0
        );
        $clinicNetAmount = $baseClinicNet + $medicinesTotal;

        $bill->update([
            'total_amount' => $patientTotal,
            'clinic_net_amount' => $clinicNetAmount,
        ]);

        return $bill;
    }

    /**
     * Format all receipt lines (combining fee component lines and dispensed medicine lines).
     *
     * @return array<array{name: string, type: string, quantity: int|null, unit_price_lkr: float|null, amount_lkr: float, amount_cents: int, recipient: string}>
     */
    public function formatCombinedReceiptLines(Bill $bill): array
    {
        $lines = [];
        $snapshot = $bill->fee_snapshot ?? [];

        // 1. Fee components lines from snapshot
        if (! empty($snapshot['lines']) && is_array($snapshot['lines'])) {
            foreach ($snapshot['lines'] as $line) {
                $cents = (int) ($line['amount'] ?? 0);
                $lines[] = [
                    'name' => $line['name'] ?? 'Fee Component',
                    'type' => 'fee_component',
                    'quantity' => null,
                    'unit_price_lkr' => null,
                    'unit_price_formatted' => null,
                    'amount_lkr' => round($cents / 100, 2),
                    'amount_cents' => $cents,
                    'amount' => $cents,
                    'amount_formatted' => 'Rs. '.number_format($cents / 100, 2),
                    'recipient' => $line['recipient'] ?? 'clinic',
                ];
            }
        } else {
            if ($bill->doctor_fee > 0) {
                $lines[] = [
                    'name' => 'Doctor Consultation Fee',
                    'type' => 'fee_component',
                    'quantity' => null,
                    'unit_price_lkr' => null,
                    'unit_price_formatted' => null,
                    'amount_lkr' => round($bill->doctor_fee / 100, 2),
                    'amount_cents' => (int) $bill->doctor_fee,
                    'amount' => (int) $bill->doctor_fee,
                    'amount_formatted' => 'Rs. '.number_format($bill->doctor_fee / 100, 2),
                    'recipient' => 'doctor',
                ];
            }
            if ($bill->clinic_fee > 0) {
                $lines[] = [
                    'name' => 'Clinic Facility Fee',
                    'type' => 'fee_component',
                    'quantity' => null,
                    'unit_price_lkr' => null,
                    'unit_price_formatted' => null,
                    'amount_lkr' => round($bill->clinic_fee / 100, 2),
                    'amount_cents' => (int) $bill->clinic_fee,
                    'amount' => (int) $bill->clinic_fee,
                    'amount_formatted' => 'Rs. '.number_format($bill->clinic_fee / 100, 2),
                    'recipient' => 'clinic',
                ];
            }
            if ($bill->other_fee > 0) {
                $lines[] = [
                    'name' => 'Other Clinical Fee',
                    'type' => 'fee_component',
                    'quantity' => null,
                    'unit_price_lkr' => null,
                    'unit_price_formatted' => null,
                    'amount_lkr' => round($bill->other_fee / 100, 2),
                    'amount_cents' => (int) $bill->other_fee,
                    'amount' => (int) $bill->other_fee,
                    'amount_formatted' => 'Rs. '.number_format($bill->other_fee / 100, 2),
                    'recipient' => 'third_party',
                ];
            }
        }

        // 2. Dispensed medicine line items
        $medicineItems = $bill->items()->get();
        foreach ($medicineItems as $item) {
            $unitLkr = round($item->unit_price_cents / 100, 2);
            $totalLkr = round($item->total_price_cents / 100, 2);

            $lines[] = [
                'name' => $item->description,
                'type' => 'medicine',
                'quantity' => $item->quantity,
                'unit_price_lkr' => $unitLkr,
                'unit_price_formatted' => 'Rs. '.number_format($unitLkr, 2),
                'amount_lkr' => $totalLkr,
                'amount_cents' => $item->total_price_cents,
                'amount' => $item->total_price_cents,
                'amount_formatted' => 'Rs. '.number_format($totalLkr, 2),
                'recipient' => 'pharmacy',
            ];
        }

        // 3. Bill adjustments (e.g. Move differential balance/refund)
        $adjustments = $bill->adjustments()->get();
        foreach ($adjustments as $adj) {
            $cents = (int) $adj->amount_cents;
            $isDue = $cents >= 0;
            $lines[] = [
                'name' => $adj->reason ?? ($isDue ? 'Move Differential (Balance Due)' : 'Move Differential (Refund Due)'),
                'type' => 'adjustment',
                'quantity' => null,
                'unit_price_lkr' => null,
                'unit_price_formatted' => null,
                'amount_lkr' => round($cents / 100, 2),
                'amount_cents' => $cents,
                'amount' => $cents,
                'amount_formatted' => ($isDue ? '+Rs. ' : '-Rs. ').number_format(abs($cents) / 100, 2),
                'recipient' => 'clinic',
            ];
        }

        return $lines;
    }

    /**
     * Record a move differential adjustment on a paid bill.
     * Positive diff = balance due from patient.
     * Negative diff = refund/credit due to patient.
     */
    public function recordMoveAdjustment(
        Bill $bill,
        int $diffCents,
        ?string $reason = null,
        array $metadata = []
    ): ?BillAdjustment {
        if ($diffCents === 0) {
            return null;
        }

        $isDue = $diffCents > 0;
        $defaultReason = $isDue
            ? 'Differential fee: Balance due Rs. '.number_format($diffCents / 100, 2)
            : 'Differential fee: Refund due Rs. '.number_format(abs($diffCents) / 100, 2);

        return BillAdjustment::create([
            'tenant_id' => $bill->tenant_id,
            'bill_id' => $bill->id,
            'booking_token_id' => $bill->booking_token_id,
            'type' => BillAdjustment::TYPE_MOVE_DIFFERENTIAL,
            'amount_cents' => $diffCents,
            'reason' => $reason ?: $defaultReason,
            'metadata' => $metadata,
        ]);
    }
}
