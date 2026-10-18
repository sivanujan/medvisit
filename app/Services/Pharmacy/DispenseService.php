<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\ClinicMedicine;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionItemBatch;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\Billing\BillCalculator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DispenseService
{
    public function __construct(
        protected BillCalculator $billCalculator
    ) {}

    /**
     * Dispense a prescription (FEFO batch selection, stock movements, bill lines).
     *
     * @param array<int, array{
     *     substituted_clinic_medicine_id?: int|null,
     *     batch_allocations?: array<array{batch_id: int, quantity: int}>,
     *     dispense_quantity?: int|null,
     *     mark_outside?: bool|null
     * }> $overrides Keyed by prescription_item_id
     */
    public function dispensePrescription(
        Prescription $prescription,
        User $user,
        string $tenantId,
        array $overrides = []
    ): Prescription {
        return DB::transaction(function () use ($prescription, $user, $tenantId, $overrides) {
            // Idempotency & Concurrency: Lock row for update
            /** @var Prescription $lockedRx */
            $lockedRx = Prescription::where('tenant_id', $tenantId)
                ->where('id', $prescription->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array($lockedRx->status, [Prescription::STATUS_DISPENSED, Prescription::STATUS_CANCELLED], true)) {
                throw new InvalidArgumentException("Prescription {$lockedRx->prescription_number} is already {$lockedRx->status}.");
            }

            $today = now()->toDateString();
            $items = $lockedRx->items()->with(['clinicMedicine', 'variant'])->get();
            $bill = $lockedRx->token?->bill;

            $allFullyDispensed = true;
            $anyDispensed = false;

            foreach ($items as $item) {
                $override = $overrides[$item->id] ?? [];

                // Check if user requested to switch to outside
                if (! empty($override['mark_outside']) || $item->source === PrescriptionItem::SOURCE_OUTSIDE) {
                    $item->update(['source' => PrescriptionItem::SOURCE_OUTSIDE]);

                    continue;
                }

                $targetMedId = $override['substituted_clinic_medicine_id'] ?? $item->clinic_medicine_id;
                if (! $targetMedId) {
                    // No clinic medicine linked -> mark as outside
                    $item->update(['source' => PrescriptionItem::SOURCE_OUTSIDE]);

                    continue;
                }

                $clinicMed = ClinicMedicine::where('tenant_id', $tenantId)->findOrFail($targetMedId);

                // Substitution Guard: Must belong to the exact same medicine variant
                if ($clinicMed->id !== $item->clinic_medicine_id) {
                    if ($clinicMed->medicine_variant_id !== $item->medicine_variant_id) {
                        throw new InvalidArgumentException("Cannot substitute {$clinicMed->display_name}: brand substitution is allowed only with another medicine of the exact same generic variant, strength and form.");
                    }
                    $item->update([
                        'dispensed_clinic_medicine_id' => $clinicMed->id,
                    ]);
                }

                $neededQty = isset($override['dispense_quantity'])
                    ? (int) $override['dispense_quantity']
                    : (int) $item->quantity;

                if ($neededQty <= 0) {
                    continue;
                }

                // Batch Allocation
                $allocations = [];

                if (! empty($override['batch_allocations'])) {
                    // Manual batch allocation override
                    foreach ($override['batch_allocations'] as $alloc) {
                        $batchId = (int) $alloc['batch_id'];
                        $bQty = (int) $alloc['quantity'];
                        if ($bQty <= 0) {
                            continue;
                        }

                        $batch = StockBatch::where('tenant_id', $tenantId)
                            ->where('clinic_medicine_id', $clinicMed->id)
                            ->whereNull('voided_at')
                            ->lockForUpdate()
                            ->findOrFail($batchId);

                        if ($batch->quantity_remaining < $bQty) {
                            throw new InvalidArgumentException("Batch {$batch->batch_number} has only {$batch->quantity_remaining} units remaining, but {$bQty} requested.");
                        }

                        $allocations[] = [
                            'batch' => $batch,
                            'quantity' => $bQty,
                        ];
                    }
                } else {
                    // Automatic FEFO Allocation
                    $availableBatches = StockBatch::where('tenant_id', $tenantId)
                        ->where('clinic_medicine_id', $clinicMed->id)
                        ->whereNull('voided_at')
                        ->where(function ($q) use ($today) {
                            $q->whereNull('expiry_date')
                                ->orWhere('expiry_date', '>=', $today);
                        })
                        ->where('quantity_remaining', '>', 0)
                        ->orderByRaw('expiry_date ASC NULLS LAST')
                        ->orderBy('id', 'ASC')
                        ->lockForUpdate()
                        ->get();

                    $remainingToAllocate = $neededQty;
                    foreach ($availableBatches as $batch) {
                        if ($remainingToAllocate <= 0) {
                            break;
                        }

                        $take = min($remainingToAllocate, (int) $batch->quantity_remaining);
                        $allocations[] = [
                            'batch' => $batch,
                            'quantity' => $take,
                        ];
                        $remainingToAllocate -= $take;
                    }

                    if ($remainingToAllocate > 0) {
                        // Stock is short
                        $allFullyDispensed = false;
                    }
                }

                $itemDispensedQty = 0;
                $sellingPriceCents = (int) ($clinicMed->selling_price_cents ?? 0);

                foreach ($allocations as $alloc) {
                    /** @var StockBatch $batch */
                    $batch = $alloc['batch'];
                    $qty = $alloc['quantity'];

                    // Decrement batch stock
                    $batch->decrement('quantity_remaining', $qty);

                    // Create dispense stock movement
                    $movement = StockMovement::create([
                        'tenant_id' => $tenantId,
                        'clinic_medicine_id' => $clinicMed->id,
                        'stock_batch_id' => $batch->id,
                        'type' => StockMovement::TYPE_DISPENSE,
                        'quantity' => -$qty,
                        'reason' => "Prescription {$lockedRx->prescription_number} dispensed to patient",
                        'reference_type' => PrescriptionItem::class,
                        'reference_id' => $item->id,
                        'user_id' => $user->id,
                        'created_at' => now(),
                    ]);

                    // Trace exact batch allocation
                    PrescriptionItemBatch::create([
                        'tenant_id' => $tenantId,
                        'prescription_item_id' => $item->id,
                        'stock_batch_id' => $batch->id,
                        'stock_movement_id' => $movement->id,
                        'quantity' => $qty,
                        'cost_price_cents' => (int) $batch->cost_price_cents,
                        'selling_price_cents' => $sellingPriceCents,
                    ]);

                    $itemDispensedQty += $qty;
                }

                if ($itemDispensedQty > 0) {
                    $anyDispensed = true;
                    $item->update([
                        'dispensed_quantity' => $itemDispensedQty,
                    ]);

                    // Attach to Bill
                    if ($bill) {
                        BillItem::create([
                            'tenant_id' => $tenantId,
                            'bill_id' => $bill->id,
                            'prescription_item_id' => $item->id,
                            'clinic_medicine_id' => $clinicMed->id,
                            'description' => "{$clinicMed->display_name} ({$itemDispensedQty} {$item->dose_unit})",
                            'quantity' => $itemDispensedQty,
                            'unit_price_cents' => $sellingPriceCents,
                            'total_price_cents' => $itemDispensedQty * $sellingPriceCents,
                        ]);
                    }
                }

                // If not fully dispensed, mark remainder outside
                if ($itemDispensedQty < $item->quantity) {
                    $allFullyDispensed = false;
                }
            }

            // Recalculate bill total using central BillCalculator
            if ($bill) {
                $this->billCalculator->recalculate($bill);
            }

            // Determine final prescription status
            $newStatus = $allFullyDispensed && $anyDispensed
                ? Prescription::STATUS_DISPENSED
                : ($anyDispensed ? Prescription::STATUS_PARTIALLY_DISPENSED : Prescription::STATUS_FINALIZED);

            $lockedRx->update([
                'status' => $newStatus,
                'dispensed_at' => now(),
            ]);

            AuditLogger::log('pharmacy.prescription_dispensed', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $lockedRx,
                'metadata' => [
                    'prescription_number' => $lockedRx->prescription_number,
                    'status' => $newStatus,
                ],
            ]);

            return $lockedRx->fresh(['items.itemBatches.batch', 'token.bill.items']);
        });
    }

    /**
     * Undo a dispensed prescription (reverses movements back to exact batches, removes bill lines).
     */
    public function undoDispense(
        Prescription $prescription,
        string $reason,
        User $user,
        string $tenantId
    ): Prescription {
        return DB::transaction(function () use ($prescription, $reason, $user, $tenantId) {
            /** @var Prescription $lockedRx */
            $lockedRx = Prescription::where('tenant_id', $tenantId)
                ->where('id', $prescription->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedRx->status, [Prescription::STATUS_DISPENSED, Prescription::STATUS_PARTIALLY_DISPENSED], true)) {
                throw new InvalidArgumentException("Prescription {$lockedRx->prescription_number} is not in dispensed status.");
            }

            // Guard: Cannot undo if bill has already been paid
            $bill = $lockedRx->token?->bill;
            if ($bill && $bill->payment_status === Bill::STATUS_PAID) {
                throw new InvalidArgumentException('Cannot undo dispense: the visit bill has already been paid.');
            }

            $items = $lockedRx->items()->with('itemBatches.batch')->get();

            foreach ($items as $item) {
                foreach ($item->itemBatches as $batchAllocation) {
                    $batch = $batchAllocation->batch;
                    $qty = $batchAllocation->quantity;

                    if ($batch) {
                        // Return exact quantity to the exact same batch
                        $batch->increment('quantity_remaining', $qty);

                        // Create reversal movement
                        StockMovement::create([
                            'tenant_id' => $tenantId,
                            'clinic_medicine_id' => $batch->clinic_medicine_id,
                            'stock_batch_id' => $batch->id,
                            'type' => StockMovement::TYPE_ADJUSTMENT_IN,
                            'quantity' => $qty,
                            'reason' => "Undo dispense for {$lockedRx->prescription_number}: {$reason}",
                            'reference_type' => PrescriptionItem::class,
                            'reference_id' => $item->id,
                            'user_id' => $user->id,
                            'created_at' => now(),
                        ]);
                    }

                    $batchAllocation->delete();
                }

                $item->update([
                    'dispensed_quantity' => 0,
                    'dispensed_clinic_medicine_id' => null,
                ]);
            }

            // Remove all bill lines associated with this prescription
            if ($bill) {
                BillItem::where('tenant_id', $tenantId)
                    ->where('bill_id', $bill->id)
                    ->whereIn('prescription_item_id', $items->pluck('id'))
                    ->delete();

                // Recalculate bill
                $this->billCalculator->recalculate($bill);
            }

            $lockedRx->update([
                'status' => Prescription::STATUS_FINALIZED,
                'dispensed_at' => null,
            ]);

            AuditLogger::log('pharmacy.dispense_undone', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $lockedRx,
                'metadata' => [
                    'prescription_number' => $lockedRx->prescription_number,
                    'reason' => $reason,
                ],
            ]);

            return $lockedRx->fresh(['items', 'token.bill']);
        });
    }

    /**
     * Check available clinic stock for a prescription item.
     */
    public function getAvailableStock(ClinicMedicine $medicine, string $tenantId): int
    {
        $today = now()->toDateString();

        return (int) StockBatch::where('tenant_id', $tenantId)
            ->where('clinic_medicine_id', $medicine->id)
            ->whereNull('voided_at')
            ->where(function ($q) use ($today) {
                $q->whereNull('expiry_date')
                    ->orWhere('expiry_date', '>=', $today);
            })
            ->where('quantity_remaining', '>', 0)
            ->sum('quantity_remaining');
    }
}
