<?php

declare(strict_types=1);

namespace App\Services\Pharmacy;

use App\Models\MedicineBarcode;
use App\Models\MedicineBrand;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;

class BarcodeService
{
    /**
     * Resolve barcode against approved catalog or tenant's own records.
     */
    public function lookup(string $barcode, string $tenantId): ?MedicineBarcode
    {
        $code = trim($barcode);
        if ($code === '') {
            return null;
        }

        return MedicineBarcode::with(['brand.variant.medicine'])
            ->where('barcode', $code)
            ->visibleToTenant($tenantId)
            ->first();
    }

    /**
     * Link barcode to a medicine brand for this tenant.
     * Checks auto-approval rule: if 2+ distinct clinics link the same barcode to the same brand, auto-approve.
     */
    public function linkBarcode(
        string $barcode,
        int $medicineBrandId,
        int $packSize,
        string $tenantId
    ): MedicineBarcode {
        $code = trim($barcode);

        return DB::transaction(function () use ($code, $medicineBrandId, $packSize, $tenantId) {
            $brand = MedicineBrand::findOrFail($medicineBrandId);

            // Check if this barcode + brand combo already exists
            $existing = MedicineBarcode::where('barcode', $code)
                ->where('medicine_brand_id', $medicineBrandId)
                ->first();

            if ($existing) {
                // If linked by a different tenant, this is the 2nd distinct clinic -> auto-approve!
                if ($existing->created_by_tenant_id && $existing->created_by_tenant_id !== $tenantId) {
                    $existing->update([
                        'status' => MedicineBarcode::STATUS_APPROVED,
                        'pack_size' => max(1, $packSize),
                    ]);

                    AuditLogger::log('catalog.barcode_auto_approved', [
                        'tenant_id' => $tenantId,
                        'resource' => $existing,
                        'metadata' => [
                            'barcode' => $code,
                            'brand_id' => $medicineBrandId,
                            'reason' => 'Auto-approved due to 2+ distinct clinic submissions',
                        ],
                    ]);
                } else {
                    $existing->update(['pack_size' => max(1, $packSize)]);
                }

                return $existing->load('brand.variant.medicine');
            }

            // Create pending barcode for this tenant
            $barcodeRecord = MedicineBarcode::create([
                'barcode' => $code,
                'medicine_brand_id' => $medicineBrandId,
                'pack_size' => max(1, $packSize),
                'status' => MedicineBarcode::STATUS_PENDING,
                'created_by_tenant_id' => $tenantId,
            ]);

            return $barcodeRecord->load('brand.variant.medicine');
        });
    }
}
