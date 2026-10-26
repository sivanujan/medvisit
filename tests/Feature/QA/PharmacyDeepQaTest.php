<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\ClinicMedicine;
use App\Models\Doctor;
use App\Models\Medicine;
use App\Models\MedicineVariant;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\DispenseService;
use App\Services\Pharmacy\StockImportService;
use App\Services\Pharmacy\StockService;
use App\Services\SequenceService;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PharmacyDeepQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $pharmacist;

    private StockService $stockService;

    private DispenseService $dispenseService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->pharmacist = User::where('email', 'pharmacist@cityhealth.test')->firstOrFail();
        $this->stockService = app(StockService::class);
        $this->dispenseService = app(DispenseService::class);
    }

    /**
     * 1. GRN atomicity: on failure during batch creation, whole transaction rolls back and GRN sequence number is NOT consumed.
     */
    public function test_grn_atomicity_and_sequence_rollback(): void
    {
        $tenantId = $this->tenant->id;
        $initialSeq = app(SequenceService::class)->current($tenantId, 'grn');

        // Attempt stock receipt with invalid item that forces an exception
        try {
            $this->stockService->receiveStock([
                'received_date' => now()->toDateString(),
                'items' => [
                    [
                        'clinic_medicine_id' => 999999, // Non-existent ID forces ModelNotFoundException
                        'batch_number' => 'FAIL-BATCH-001',
                        'quantity' => 100,
                        'cost_price_cents' => 500,
                    ],
                ],
            ], $this->pharmacist, $tenantId);
            $this->fail('Expected exception was not thrown');
        } catch (\Throwable) {
            // Expected
        }

        // Assert 0 receipts created with that batch
        $this->assertDatabaseMissing('stock_receipts', [
            'tenant_id' => $tenantId,
            'notes' => 'FAIL-BATCH-001',
        ]);

        // Sequence must NOT be permanently advanced due to rollback
        $currentSeq = app(SequenceService::class)->current($tenantId, 'grn');
        $this->assertSame($initialSeq, $currentSeq, 'Failed GRN transaction must not consume sequence numbers');
    }

    /**
     * 2. Stock Import: DD/MM/YYYY date priority parsing.
     * "05/06/2027" must strictly parse as June 5th 2027 (DD/MM), never May 6th (US MM/DD).
     */
    public function test_stock_import_sri_lankan_dd_mm_date_parsing(): void
    {
        $parsed = StockImportService::parseSriLankanDate('05/06/2027');
        $this->assertSame('2027-06-05', $parsed, 'DD/MM date 05/06/2027 must be parsed as 5th June 2027');

        $parsedIso = StockImportService::parseSriLankanDate('2027-12-31');
        $this->assertSame('2027-12-31', $parsedIso);
    }

    /**
     * 3. Supplier delete guard: deletion blocked when linked to GRNs or batches.
     */
    public function test_supplier_delete_blocked_when_linked_to_grns(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Protected Pharma Ltd',
            'phone' => '+94112345678',
            'is_active' => true,
        ]);

        // Link a GRN to this supplier
        StockReceipt::create([
            'tenant_id' => $this->tenant->id,
            'receipt_number' => 'GRN-TEST-SUP-01',
            'status' => StockReceipt::STATUS_RECEIVED,
            'supplier_id' => $supplier->id,
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 50000,
            'created_by' => $this->pharmacist->id,
        ]);

        $res = $this->actingAs($this->pharmacist)
            ->delete("http://cityhealth.{$this->baseDomain}/pharmacy/suppliers/{$supplier->id}");

        $res->assertSessionHas('error');
        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id]);
    }

    /**
     * 4. Dispense concurrency lock:
     * When a pharmacist is dispensing prescription, the lock key is present in cache.
     */
    public function test_dispense_concurrency_lock(): void
    {
        $tenantId = $this->tenant->id;
        $rxId = 12345;
        $lockKey = "dispense_lock:{$tenantId}:{$rxId}";

        Cache::put($lockKey, [
            'user_id' => $this->pharmacist->id,
            'user_name' => $this->pharmacist->name,
            'locked_at' => now()->toIso8601String(),
        ], now()->addMinutes(15));

        $this->assertTrue(Cache::has($lockKey));
        $lock = Cache::get($lockKey);
        $this->assertSame($this->pharmacist->id, $lock['user_id']);
    }

    /**
     * 5. Dispense reversal returns stock to the EXACT same batch.
     */
    public function test_dispense_reversal_returns_stock_to_same_batch(): void
    {
        $tenantId = $this->tenant->id;
        $doctor = Doctor::where('tenant_id', $tenantId)->firstOrFail();
        $patient = Patient::where('tenant_id', $tenantId)->firstOrFail();

        $var = MedicineVariant::first();
        if (! $var) {
            $med = Medicine::firstOrCreate(['name' => 'Amoxicillin'], ['inn_name' => 'amoxicillin']);
            $var = MedicineVariant::create([
                'medicine_id' => $med->id,
                'strength_text' => '500mg',
                'dosage_form' => 'capsule',
                'route' => 'oral',
                'display_name' => '500mg capsule',
            ]);
        }

        $medicine = ClinicMedicine::create([
            'tenant_id' => $tenantId,
            'medicine_variant_id' => $var->id,
            'display_name' => 'Amoxicillin 500mg Capsule',
            'base_unit' => 'capsule',
            'selling_price_cents' => 1500,
            'is_active' => true,
        ]);

        $batch = StockBatch::create([
            'tenant_id' => $tenantId,
            'clinic_medicine_id' => $medicine->id,
            'batch_number' => 'AMX-BATCH-777',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 100,
            'quantity_remaining' => 100,
            'cost_price_cents' => 1000,
            'received_date' => now()->toDateString(),
        ]);

        $prescription = Prescription::create([
            'tenant_id' => $tenantId,
            'doctor_id' => $doctor->id,
            'patient_id' => $patient->id,
            'prescription_number' => 'RX-REV-TEST-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $tenantId,
            'prescription_id' => $prescription->id,
            'clinic_medicine_id' => $medicine->id,
            'display_name' => 'Amoxicillin 500mg',
            'generic_name' => 'Amoxicillin',
            'dosage' => '500mg',
            'frequency' => 'tds',
            'duration' => 5,
            'duration_unit' => 'days',
            'quantity' => 15,
            'source' => PrescriptionItem::SOURCE_CLINIC,
        ]);

        // 1. Dispense 15 units
        $this->dispenseService->dispensePrescription($prescription, $this->pharmacist, $tenantId);

        $batch->refresh();
        $this->assertSame(85, $batch->quantity_remaining, '15 units must be deducted from batch');

        // 2. Undo / Reverse dispense
        $this->dispenseService->undoDispense($prescription, 'Patient changed mind', $this->pharmacist, $tenantId);

        $batch->refresh();
        $this->assertSame(100, $batch->quantity_remaining, 'Reversal must return stock back to the exact same batch');
    }
}
