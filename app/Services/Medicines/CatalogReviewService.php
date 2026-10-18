<?php

declare(strict_types=1);

namespace App\Services\Medicines;

use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBarcode;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CatalogReviewService
{
    /**
     * Approve a pending medicine.
     */
    public function approveMedicine(Medicine $medicine, array $edits = []): Medicine
    {
        return DB::transaction(function () use ($medicine, $edits) {
            $data = array_merge($edits, ['status' => Medicine::STATUS_APPROVED]);
            $medicine->update($data);

            // Also approve sub-variants created by the same clinic
            $medicine->variants()->where('status', Medicine::STATUS_PENDING)->update(['status' => MedicineVariant::STATUS_APPROVED]);

            AuditLogger::log('catalog.medicine_approved', [
                'resource' => $medicine,
                'metadata' => ['generic_name' => $medicine->generic_name],
            ]);

            return $medicine;
        });
    }

    /**
     * Approve a pending variant.
     */
    public function approveVariant(MedicineVariant $variant, array $edits = []): MedicineVariant
    {
        return DB::transaction(function () use ($variant, $edits) {
            $data = array_merge($edits, ['status' => MedicineVariant::STATUS_APPROVED]);
            $variant->update($data);

            AuditLogger::log('catalog.variant_approved', [
                'resource' => $variant,
                'metadata' => ['display_name' => $variant->display_name],
            ]);

            return $variant;
        });
    }

    /**
     * Approve a pending brand.
     */
    public function approveBrand(MedicineBrand $brand, array $edits = []): MedicineBrand
    {
        return DB::transaction(function () use ($brand, $edits) {
            $data = array_merge($edits, ['status' => MedicineBrand::STATUS_APPROVED]);
            $brand->update($data);

            AuditLogger::log('catalog.brand_approved', [
                'resource' => $brand,
                'metadata' => ['brand_name' => $brand->brand_name],
            ]);

            return $brand;
        });
    }

    /**
     * Approve a pending barcode.
     */
    public function approveBarcode(MedicineBarcode $barcode, array $edits = []): MedicineBarcode
    {
        return DB::transaction(function () use ($barcode, $edits) {
            $data = array_merge($edits, ['status' => MedicineBarcode::STATUS_APPROVED]);
            $barcode->update($data);

            AuditLogger::log('catalog.barcode_approved', [
                'resource' => $barcode,
                'metadata' => ['barcode' => $barcode->barcode],
            ]);

            return $barcode;
        });
    }

    /**
     * Reject an item with a mandatory feedback reason.
     */
    public function rejectItem(string $type, int $id, string $reason): void
    {
        if (trim($reason) === '') {
            throw new InvalidArgumentException('Rejection reason is required.');
        }

        DB::transaction(function () use ($type, $id, $reason) {
            switch ($type) {
                case 'medicine':
                    $item = Medicine::findOrFail($id);
                    $item->update(['status' => Medicine::STATUS_REJECTED]);
                    break;
                case 'variant':
                    $item = MedicineVariant::findOrFail($id);
                    $item->update(['status' => MedicineVariant::STATUS_REJECTED]);
                    break;
                case 'brand':
                    $item = MedicineBrand::findOrFail($id);
                    $item->update(['status' => MedicineBrand::STATUS_REJECTED]);
                    break;
                case 'barcode':
                    $item = MedicineBarcode::findOrFail($id);
                    $item->update(['status' => MedicineBarcode::STATUS_REJECTED]);
                    break;
                default:
                    throw new InvalidArgumentException("Unknown catalog item type: {$type}");
            }

            AuditLogger::log('catalog.item_rejected', [
                'resource' => $item,
                'metadata' => [
                    'type' => $type,
                    'reason' => $reason,
                ],
            ]);
        });
    }

    /**
     * Merge a source medicine into an existing target medicine.
     * All variants of source are transferred or merged into target.
     */
    public function mergeMedicine(Medicine $source, Medicine $target): void
    {
        if ($source->id === $target->id) {
            throw new InvalidArgumentException('Cannot merge a medicine into itself.');
        }

        DB::transaction(function () use ($source, $target) {
            foreach ($source->variants as $sourceVariant) {
                // Find matching target variant
                $targetVariant = $target->variants()
                    ->where('strength_text', $sourceVariant->strength_text)
                    ->where('dosage_form', $sourceVariant->dosage_form)
                    ->where('form_detail', $sourceVariant->form_detail)
                    ->first();

                if ($targetVariant) {
                    $this->mergeVariant($sourceVariant, $targetVariant);
                } else {
                    $sourceVariant->update(['medicine_id' => $target->id]);
                }
            }

            // Delete source medicine
            $source->delete();

            AuditLogger::log('catalog.medicine_merged', [
                'resource' => $target,
                'metadata' => [
                    'source_id' => $source->id,
                    'source_name' => $source->generic_name,
                    'target_id' => $target->id,
                    'target_name' => $target->generic_name,
                ],
            ]);
        });
    }

    /**
     * Merge a source variant into an existing target variant.
     * Handles clinic_medicines collisions, batch re-pointing, and brand transfers.
     */
    public function mergeVariant(MedicineVariant $sourceVariant, MedicineVariant $targetVariant): void
    {
        if ($sourceVariant->id === $targetVariant->id) {
            throw new InvalidArgumentException('Cannot merge a variant into itself.');
        }

        DB::transaction(function () use ($sourceVariant, $targetVariant) {
            // 1. Process ClinicMedicines pointing to sourceVariant
            $sourceClinicMedicines = ClinicMedicine::where('medicine_variant_id', $sourceVariant->id)->get();

            foreach ($sourceClinicMedicines as $sourceCm) {
                $tenantId = $sourceCm->tenant_id;

                // Check if this tenant already has a ClinicMedicine for targetVariant with matching brand
                $targetCm = ClinicMedicine::where('tenant_id', $tenantId)
                    ->where('medicine_variant_id', $targetVariant->id)
                    ->where('medicine_brand_id', $sourceCm->medicine_brand_id)
                    ->first();

                if ($targetCm) {
                    // Collision! Move all batches and movements to targetCm
                    StockBatch::where('tenant_id', $tenantId)
                        ->where('clinic_medicine_id', $sourceCm->id)
                        ->update(['clinic_medicine_id' => $targetCm->id]);

                    StockMovement::where('tenant_id', $tenantId)
                        ->where('clinic_medicine_id', $sourceCm->id)
                        ->update(['clinic_medicine_id' => $targetCm->id]);

                    // Delete the duplicate clinic medicine
                    $sourceCm->delete();
                } else {
                    // No collision: repoint to targetVariant
                    $sourceCm->update(['medicine_variant_id' => $targetVariant->id]);
                }
            }

            // 2. Transfer Brands
            foreach ($sourceVariant->brands as $sourceBrand) {
                $targetBrand = $targetVariant->brands()
                    ->where('brand_name', $sourceBrand->brand_name)
                    ->first();

                if ($targetBrand) {
                    $this->mergeBrand($sourceBrand, $targetBrand);
                } else {
                    $sourceBrand->update(['medicine_variant_id' => $targetVariant->id]);
                }
            }

            // 3. Delete the source variant
            $sourceVariant->delete();

            AuditLogger::log('catalog.variant_merged', [
                'resource' => $targetVariant,
                'metadata' => [
                    'source_id' => $sourceVariant->id,
                    'target_id' => $targetVariant->id,
                ],
            ]);
        });
    }

    /**
     * Merge a source brand into a target brand.
     * Repoints barcodes, clinic_medicines with brand_id, batches, then deletes source brand.
     */
    public function mergeBrand(MedicineBrand $sourceBrand, MedicineBrand $targetBrand): void
    {
        if ($sourceBrand->id === $targetBrand->id) {
            throw new InvalidArgumentException('Cannot merge a brand into itself.');
        }

        DB::transaction(function () use ($sourceBrand, $targetBrand) {
            // Repoint barcodes
            foreach ($sourceBrand->barcodes as $barcode) {
                $existing = MedicineBarcode::where('barcode', $barcode->barcode)
                    ->where('medicine_brand_id', $targetBrand->id)
                    ->first();

                if ($existing) {
                    $barcode->delete();
                } else {
                    $barcode->update(['medicine_brand_id' => $targetBrand->id]);
                }
            }

            // Repoint clinic_medicines with brand
            $clinicMedicines = ClinicMedicine::where('medicine_brand_id', $sourceBrand->id)->get();
            foreach ($clinicMedicines as $cm) {
                // Check if target cm exists
                $targetCm = ClinicMedicine::where('tenant_id', $cm->tenant_id)
                    ->where('medicine_variant_id', $cm->medicine_variant_id)
                    ->where('medicine_brand_id', $targetBrand->id)
                    ->first();

                if ($targetCm) {
                    StockBatch::where('tenant_id', $cm->tenant_id)
                        ->where('clinic_medicine_id', $cm->id)
                        ->update(['clinic_medicine_id' => $targetCm->id]);

                    StockMovement::where('tenant_id', $cm->tenant_id)
                        ->where('clinic_medicine_id', $cm->id)
                        ->update(['clinic_medicine_id' => $targetCm->id]);

                    $cm->delete();
                } else {
                    $cm->update(['medicine_brand_id' => $targetBrand->id]);
                }
            }

            $sourceBrand->delete();
        });
    }
}
