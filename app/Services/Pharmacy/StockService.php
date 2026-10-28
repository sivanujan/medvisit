<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

use App\Models\ClinicMedicine;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\SequenceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockService
{
    public function __construct(
        protected SequenceService $sequenceService
    ) {}

    /**
     * Receive stock through a Goods Received Note (GRN).
     *
     * @param array{
     *     supplier_id: int|null,
     *     invoice_number: string|null,
     *     received_date: string,
     *     notes: string|null,
     *     items: array<array{
     *         clinic_medicine_id?: int|null,
     *         medicine_variant_id?: int|null,
     *         medicine_brand_id?: int|null,
     *         display_name?: string|null,
     *         base_unit?: string|null,
     *         selling_price_cents?: int|null,
     *         batch_number: string|null,
     *         expiry_date: string|null,
     *         quantity: int,
     *         cost_price_cents: int,
     *     }>
     * } $data
     */
    public function receiveStock(array $data, User $user, string $tenantId): StockReceipt
    {
        return DB::transaction(function () use ($data, $user, $tenantId) {
            // Generate atomic GRN number with lock on highest receipt_number
            $receiptNumber = $this->generateNextReceiptNumber($tenantId);

            $receipt = StockReceipt::create([
                'tenant_id' => $tenantId,
                'receipt_number' => $receiptNumber,
                'status' => StockReceipt::STATUS_RECEIVED,
                'supplier_id' => $data['supplier_id'] ?? null,
                'invoice_number' => $data['invoice_number'] ?? null,
                'received_date' => $data['received_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
                'total_cost_cents' => 0,
                'created_by' => $user->id,
            ]);

            $totalCostCents = 0;

            foreach ($data['items'] as $item) {
                $billedQuantity = (int) $item['quantity'];
                $freeQuantity = (int) ($item['free_quantity'] ?? 0);
                $totalUnits = $billedQuantity + $freeQuantity;
                $costPrice = (int) $item['cost_price_cents'];

                if ($totalUnits <= 0) {
                    continue;
                }

                // Resolve ClinicMedicine
                $clinicMedicine = null;
                if (! empty($item['clinic_medicine_id'])) {
                    $clinicMedicine = ClinicMedicine::where('tenant_id', $tenantId)
                        ->findOrFail($item['clinic_medicine_id']);
                } elseif (! empty($item['medicine_variant_id'])) {
                    $clinicMedicine = ClinicMedicine::firstOrCreate(
                        [
                            'tenant_id' => $tenantId,
                            'medicine_variant_id' => $item['medicine_variant_id'],
                            'medicine_brand_id' => $item['medicine_brand_id'] ?? null,
                        ],
                        [
                            'display_name' => $item['display_name'] ?? 'Medicine',
                            'base_unit' => $item['base_unit'] ?? 'tablet',
                            'selling_price_cents' => (int) ($item['selling_price_cents'] ?? ($costPrice * 1.3)),
                            'is_active' => true,
                        ]
                    );
                }

                if (! $clinicMedicine) {
                    throw new InvalidArgumentException('Line item requires valid clinic_medicine_id or medicine_variant_id');
                }

                // Optionally update selling price if provided
                if (isset($item['selling_price_cents']) && (int) $item['selling_price_cents'] > 0) {
                    $clinicMedicine->update(['selling_price_cents' => (int) $item['selling_price_cents']]);
                }

                $batchNumber = ! empty($item['batch_number']) ? trim((string) $item['batch_number']) : null;
                $expiryDate = ! empty($item['expiry_date']) ? Carbon::parse($item['expiry_date'])->toDateString() : null;

                $existingBatch = StockBatch::where('tenant_id', $tenantId)
                    ->where('clinic_medicine_id', $clinicMedicine->id)
                    ->where('batch_number', $batchNumber)
                    ->where('expiry_date', $expiryDate)
                    ->first();

                if ($existingBatch) {
                    $existingBatch->increment('quantity_received', $totalUnits);
                    $existingBatch->increment('quantity_remaining', $totalUnits);
                    $batch = $existingBatch;
                } else {
                    $batch = StockBatch::create([
                        'tenant_id' => $tenantId,
                        'clinic_medicine_id' => $clinicMedicine->id,
                        'batch_number' => $batchNumber,
                        'expiry_date' => $expiryDate,
                        'quantity_received' => $totalUnits,
                        'quantity_remaining' => $totalUnits,
                        'cost_price_cents' => $costPrice,
                        'supplier_id' => $data['supplier_id'] ?? null,
                        'stock_receipt_id' => $receipt->id,
                        'received_at' => now(),
                    ]);
                }

                // Create stock movement ledger entry
                StockMovement::create([
                    'tenant_id' => $tenantId,
                    'clinic_medicine_id' => $clinicMedicine->id,
                    'stock_batch_id' => $batch->id,
                    'type' => StockMovement::TYPE_RECEIPT,
                    'quantity' => $totalUnits,
                    'reason' => "Received via {$receiptNumber}",
                    'reference_type' => StockReceipt::class,
                    'reference_id' => (string) $receipt->id,
                    'user_id' => $user->id,
                    'created_at' => now(),
                ]);

                $lineTotal = $billedQuantity * $costPrice;
                $totalCostCents += $lineTotal;

                AuditLogger::log('stock.received', [
                    'tenant_id' => $tenantId,
                    'user_id' => $user->id,
                    'resource' => $batch,
                    'metadata' => [
                        'receipt_number' => $receiptNumber,
                        'medicine_id' => $clinicMedicine->id,
                        'medicine_name' => $clinicMedicine->display_name,
                        'quantity' => $totalUnits,
                        'billed_quantity' => $billedQuantity,
                        'free_quantity' => $freeQuantity,
                        'cost_price_cents' => $costPrice,
                    ],
                ]);
            }

            $receipt->update(['total_cost_cents' => $totalCostCents]);

            return $receipt->load(['batches.clinicMedicine', 'supplier']);
        });
    }

    /**
     * Perform an inventory stock adjustment on a specific batch.
     */
    public function adjustStock(
        int $batchId,
        string $type,
        int $quantity,
        string $reason,
        User $user,
        string $tenantId
    ): StockMovement {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Adjustment quantity must be greater than zero.');
        }

        if (trim($reason) === '') {
            throw new InvalidArgumentException('Adjustment reason is mandatory.');
        }

        return DB::transaction(function () use ($batchId, $type, $quantity, $reason, $user, $tenantId) {
            /** @var StockBatch $batch */
            $batch = StockBatch::where('tenant_id', $tenantId)
                ->where('id', $batchId)
                ->lockForUpdate()
                ->firstOrFail();

            $isDeduction = in_array($type, [
                StockMovement::TYPE_ADJUSTMENT_OUT,
                StockMovement::TYPE_EXPIRED,
                StockMovement::TYPE_DAMAGED,
                StockMovement::TYPE_RETURN_TO_SUPPLIER,
                StockMovement::TYPE_DISPENSE,
            ], true);

            if ($isDeduction) {
                if ($batch->quantity_remaining < $quantity) {
                    throw new InvalidArgumentException(sprintf(
                        'Insufficient stock in batch #%s. Remaining: %d, Requested deduction: %d.',
                        $batch->batch_number ?? $batch->id,
                        $batch->quantity_remaining,
                        $quantity
                    ));
                }

                $batch->quantity_remaining -= $quantity;
                $signedQuantity = -$quantity;
            } else {
                $batch->quantity_remaining += $quantity;
                $signedQuantity = $quantity;
            }

            $batch->save();

            $movement = StockMovement::create([
                'tenant_id' => $tenantId,
                'clinic_medicine_id' => $batch->clinic_medicine_id,
                'stock_batch_id' => $batch->id,
                'type' => $type,
                'quantity' => $signedQuantity,
                'reason' => trim($reason),
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            AuditLogger::log('stock.adjusted', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $batch,
                'metadata' => [
                    'adjustment_type' => $type,
                    'quantity' => $signedQuantity,
                    'new_remaining' => $batch->quantity_remaining,
                    'reason' => $reason,
                ],
            ]);

            return $movement;
        });
    }

    /**
     * Record opening stock batches for a clinic medicine.
     *
     * @param array<array{
     *     batch_number: string,
     *     expiry_date: string,
     *     quantity: int,
     *     cost_price_cents?: int|null
     * }> $openingBatches
     */
    public function recordOpeningStock(ClinicMedicine $clinicMedicine, array $openingBatches, User $user, string $tenantId): void
    {
        foreach ($openingBatches as $batchData) {
            $quantity = (int) ($batchData['quantity'] ?? 0);
            if ($quantity <= 0) {
                continue;
            }

            $batchNumber = ! empty($batchData['batch_number']) ? trim((string) $batchData['batch_number']) : 'N/A';
            $expiryDate = Carbon::parse($batchData['expiry_date'])->toDateString();
            $costPriceCents = (int) ($batchData['cost_price_cents'] ?? 0);

            $existingBatch = StockBatch::where('tenant_id', $tenantId)
                ->where('clinic_medicine_id', $clinicMedicine->id)
                ->where('batch_number', $batchNumber)
                ->where('expiry_date', $expiryDate)
                ->first();

            if ($existingBatch) {
                $existingBatch->increment('quantity_received', $quantity);
                $existingBatch->increment('quantity_remaining', $quantity);
                $batch = $existingBatch;
            } else {
                $batch = StockBatch::create([
                    'tenant_id' => $tenantId,
                    'clinic_medicine_id' => $clinicMedicine->id,
                    'batch_number' => $batchNumber,
                    'expiry_date' => $expiryDate,
                    'quantity_received' => $quantity,
                    'quantity_remaining' => $quantity,
                    'cost_price_cents' => $costPriceCents,
                    'supplier_id' => $batchData['supplier_id'] ?? null,
                    'stock_receipt_id' => null,
                    'received_at' => now(),
                ]);
            }

            StockMovement::create([
                'tenant_id' => $tenantId,
                'clinic_medicine_id' => $clinicMedicine->id,
                'stock_batch_id' => $batch->id,
                'type' => StockMovement::TYPE_OPENING_STOCK,
                'quantity' => $quantity,
                'reason' => 'Opening stock',
                'reference_type' => null,
                'reference_id' => null,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            AuditLogger::log('stock.opening_stock', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $batch,
                'metadata' => [
                    'medicine_id' => $clinicMedicine->id,
                    'batch_number' => $batchNumber,
                    'quantity' => $quantity,
                ],
            ]);
        }
    }

    /**
     * Add batches to an existing medicine without a full GRN (Quick Add Stock).
     *
     * @param array<array{
     *     batch_number: string,
     *     expiry_date: string,
     *     quantity: int,
     *     cost_price_cents?: int|null
     * }> $batches
     */
    public function addStockBatches(ClinicMedicine $clinicMedicine, array $batches, User $user, string $tenantId): void
    {
        DB::transaction(function () use ($clinicMedicine, $batches, $user, $tenantId) {
            $hasHadStock = $clinicMedicine->movements()->exists() || $clinicMedicine->batches()->exists();
            $movementType = $hasHadStock ? StockMovement::TYPE_ADJUSTMENT_IN : StockMovement::TYPE_OPENING_STOCK;
            $movementReason = $hasHadStock ? 'Manual stock add' : 'Opening stock';

            foreach ($batches as $batchData) {
                $quantity = (int) ($batchData['quantity'] ?? 0);
                if ($quantity <= 0) {
                    continue;
                }

                $batchNumber = ! empty($batchData['batch_number']) ? trim((string) $batchData['batch_number']) : 'N/A';
                $expiryDate = Carbon::parse($batchData['expiry_date'])->toDateString();
                $costPriceCents = (int) ($batchData['cost_price_cents'] ?? 0);

                $existingBatch = StockBatch::where('tenant_id', $tenantId)
                    ->where('clinic_medicine_id', $clinicMedicine->id)
                    ->where('batch_number', $batchNumber)
                    ->where('expiry_date', $expiryDate)
                    ->first();

                if ($existingBatch) {
                    $existingBatch->increment('quantity_received', $quantity);
                    $existingBatch->increment('quantity_remaining', $quantity);
                    $batch = $existingBatch;
                } else {
                    $batch = StockBatch::create([
                        'tenant_id' => $tenantId,
                        'clinic_medicine_id' => $clinicMedicine->id,
                        'batch_number' => $batchNumber,
                        'expiry_date' => $expiryDate,
                        'quantity_received' => $quantity,
                        'quantity_remaining' => $quantity,
                        'cost_price_cents' => $costPriceCents,
                        'supplier_id' => null,
                        'stock_receipt_id' => null,
                        'received_at' => now(),
                    ]);
                }

                StockMovement::create([
                    'tenant_id' => $tenantId,
                    'clinic_medicine_id' => $clinicMedicine->id,
                    'stock_batch_id' => $batch->id,
                    'type' => $movementType,
                    'quantity' => $quantity,
                    'reason' => $movementReason,
                    'reference_type' => null,
                    'reference_id' => null,
                    'user_id' => $user->id,
                    'created_at' => now(),
                ]);

                AuditLogger::log('stock.batches_added', [
                    'tenant_id' => $tenantId,
                    'user_id' => $user->id,
                    'resource' => $batch,
                    'metadata' => [
                        'medicine_id' => $clinicMedicine->id,
                        'batch_number' => $batchNumber,
                        'quantity' => $quantity,
                        'movement_type' => $movementType,
                    ],
                ]);
            }
        });
    }

    /**
     * Void a single stock batch and record a reversal movement.
     * Rejects if any dispense movements exist on this batch.
     */
    public function voidBatch(StockBatch $batch, string $reason, User $user, string $tenantId): StockMovement
    {
        return DB::transaction(function () use ($batch, $reason, $user, $tenantId) {
            if ($batch->movements()->where('type', StockMovement::TYPE_DISPENSE)->exists()) {
                throw new InvalidArgumentException('Cannot void batch: it has already been dispensed to patients.');
            }

            if ($batch->voided_at !== null) {
                throw new InvalidArgumentException('This batch has already been voided.');
            }

            $remaining = $batch->quantity_remaining;
            $reversalQuantity = -$remaining;

            $batch->update([
                'quantity_remaining' => 0,
                'voided_at' => now(),
                'voided_by' => $user->id,
                'void_reason' => trim($reason),
            ]);

            $movement = StockMovement::create([
                'tenant_id' => $tenantId,
                'clinic_medicine_id' => $batch->clinic_medicine_id,
                'stock_batch_id' => $batch->id,
                'type' => StockMovement::TYPE_VOID,
                'quantity' => $reversalQuantity,
                'reason' => trim($reason),
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            AuditLogger::log('stock.batch_voided', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $batch,
                'metadata' => [
                    'reversed_quantity' => $remaining,
                    'reason' => $reason,
                ],
            ]);

            return $movement;
        });
    }

    /**
     * Void an entire Goods Received Note (GRN) and reverse all its batches.
     * Rejects if any batch in this GRN has dispense movements.
     */
    public function voidReceipt(StockReceipt $receipt, string $reason, User $user, string $tenantId): void
    {
        DB::transaction(function () use ($receipt, $reason, $user, $tenantId) {
            if ($receipt->status === StockReceipt::STATUS_VOIDED) {
                throw new InvalidArgumentException('This GRN has already been voided.');
            }

            $hasDispense = $receipt->batches()
                ->whereHas('movements', fn ($q) => $q->where('type', StockMovement::TYPE_DISPENSE))
                ->exists();

            if ($hasDispense) {
                throw new InvalidArgumentException('Cannot void GRN: one or more batches have already been dispensed.');
            }

            $totalReversed = 0;

            foreach ($receipt->batches as $batch) {
                if ($batch->voided_at !== null) {
                    continue;
                }

                $remaining = $batch->quantity_remaining;
                $totalReversed += $remaining;

                $batch->update([
                    'quantity_remaining' => 0,
                    'voided_at' => now(),
                    'voided_by' => $user->id,
                    'void_reason' => "GRN {$receipt->receipt_number} voided: {$reason}",
                ]);

                StockMovement::create([
                    'tenant_id' => $tenantId,
                    'clinic_medicine_id' => $batch->clinic_medicine_id,
                    'stock_batch_id' => $batch->id,
                    'type' => StockMovement::TYPE_VOID,
                    'quantity' => -$remaining,
                    'reason' => "GRN {$receipt->receipt_number} voided: {$reason}",
                    'user_id' => $user->id,
                    'created_at' => now(),
                ]);
            }

            $receipt->update([
                'status' => StockReceipt::STATUS_VOIDED,
                'voided_at' => now(),
                'voided_by' => $user->id,
                'void_reason' => trim($reason),
            ]);

            AuditLogger::log('stock.receipt_voided', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $receipt,
                'metadata' => [
                    'total_reversed_quantity' => $totalReversed,
                    'reason' => $reason,
                ],
            ]);
        });
    }

    /**
     * Generate sequential GRN receipt number inside transaction using atomic tenant sequence counter.
     */
    protected function generateNextReceiptNumber(string $tenantId): string
    {
        do {
            $sequence = $this->sequenceService->next($tenantId, 'grn');
            $candidate = sprintf('GRN-%06d', $sequence);
        } while (StockReceipt::where('tenant_id', $tenantId)->where('receipt_number', $candidate)->exists());

        return $candidate;
    }
}
