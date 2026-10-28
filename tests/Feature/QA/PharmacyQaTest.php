<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\StockBatch;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\DispenseService;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class PharmacyQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenantA;

    private User $pharmacistA;

    private DispenseService $dispenseService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenantA = Tenant::find('cityhealth');
        $this->pharmacistA = User::where('email', 'pharmacist@cityhealth.test')->first();
        $this->dispenseService = app(DispenseService::class);
    }

    /**
     * 1. FEFO picks earliest non-expired batch, expired batches are blocked.
     */
    public function test_fefo_allocation_and_expired_batch_blocked(): void
    {
        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenantA->id)->first();
        $doctor = Doctor::where('tenant_id', $this->tenantA->id)->first();
        $patient = Patient::where('tenant_id', $this->tenantA->id)->first();

        // Expired batch
        $expiredBatch = StockBatch::where('tenant_id', $this->tenantA->id)
            ->where('batch_number', 'BATCH-EXPIRED-99')
            ->first();
        $this->assertNotNull($expiredBatch);
        $initialExpiredQty = $expiredBatch->quantity_remaining;

        // Near-expiry batch (valid)
        $validNearBatch = StockBatch::where('tenant_id', $this->tenantA->id)
            ->where('batch_number', 'BATCH-NEAR-EXP')
            ->first();
        $this->assertNotNull($validNearBatch);
        $initialValidQty = $validNearBatch->quantity_remaining;

        // Create prescription requesting 10 units
        $rx = Prescription::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_number' => 'RX-QA-FEFO-01',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $clinicMed->id,
            'display_name' => $clinicMed->display_name,
            'frequency' => 'tds',
            'quantity' => 10,
            'source' => PrescriptionItem::SOURCE_CLINIC,
        ]);

        // Auto FEFO dispense
        $this->dispenseService->dispensePrescription($rx, $this->pharmacistA, $this->tenantA->id);

        // Assert valid near batch was decremented
        $this->assertEquals($initialValidQty - 10, $validNearBatch->fresh()->quantity_remaining);

        // Assert expired batch was UNTOUCHED
        $this->assertEquals($initialExpiredQty, $expiredBatch->fresh()->quantity_remaining);

        // Attempting to manually force dispensing the expired batch must throw exception
        $rxManual = Prescription::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_number' => 'RX-QA-FEFO-02',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
        ]);

        $itemManual = PrescriptionItem::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_id' => $rxManual->id,
            'clinic_medicine_id' => $clinicMed->id,
            'display_name' => $clinicMed->display_name,
            'frequency' => 'tds',
            'quantity' => 5,
            'source' => PrescriptionItem::SOURCE_CLINIC,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->dispenseService->dispensePrescription($rxManual, $this->pharmacistA, $this->tenantA->id, [
            $itemManual->id => [
                'batch_allocations' => [
                    ['batch_id' => $expiredBatch->id, 'quantity' => 5],
                ],
            ],
        ]);
    }

    /**
     * 2. Buy outside does not decrement stock.
     */
    public function test_buy_outside_does_not_touch_stock(): void
    {
        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenantA->id)->first();
        $doctor = Doctor::where('tenant_id', $this->tenantA->id)->first();
        $patient = Patient::where('tenant_id', $this->tenantA->id)->first();

        $batch = StockBatch::where('tenant_id', $this->tenantA->id)
            ->where('clinic_medicine_id', $clinicMed->id)
            ->where('batch_number', 'BATCH-NEAR-EXP')
            ->first();

        $startQty = $batch->quantity_remaining;

        $rx = Prescription::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_number' => 'RX-QA-OUTSIDE-01',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $clinicMed->id,
            'display_name' => $clinicMed->display_name,
            'frequency' => 'tds',
            'quantity' => 20,
            'source' => PrescriptionItem::SOURCE_OUTSIDE, // Outside item
        ]);

        $this->dispenseService->dispensePrescription($rx, $this->pharmacistA, $this->tenantA->id, [
            $item->id => ['mark_outside' => true],
        ]);

        $this->assertEquals($startQty, $batch->fresh()->quantity_remaining, 'Stock must not be touched for outside medicine');
    }

    /**
     * 3. Undo dispense returns stock to the exact same batch.
     */
    public function test_undo_dispense_returns_stock_to_exact_same_batch(): void
    {
        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenantA->id)->first();
        $doctor = Doctor::where('tenant_id', $this->tenantA->id)->first();
        $patient = Patient::where('tenant_id', $this->tenantA->id)->first();

        $batch = StockBatch::where('tenant_id', $this->tenantA->id)
            ->where('batch_number', 'BATCH-NEAR-EXP')
            ->first();

        $originalQty = $batch->quantity_remaining;

        $rx = Prescription::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_number' => 'RX-QA-UNDO-01',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $clinicMed->id,
            'display_name' => $clinicMed->display_name,
            'frequency' => 'tds',
            'quantity' => 15,
            'source' => PrescriptionItem::SOURCE_CLINIC,
        ]);

        // Dispense 15 units
        $this->dispenseService->dispensePrescription($rx, $this->pharmacistA, $this->tenantA->id);
        $this->assertEquals($originalQty - 15, $batch->fresh()->quantity_remaining);

        // Undo dispense
        $this->dispenseService->undoDispense($rx->fresh(), 'Patient changed mind', $this->pharmacistA, $this->tenantA->id);

        // Exact batch restored
        $this->assertEquals($originalQty, $batch->fresh()->quantity_remaining, 'Stock must be returned to the exact same batch');
    }

    /**
     * 4. Paid bill rule: Cannot undo dispense if bill is already paid.
     */
    public function test_cannot_undo_dispense_if_bill_is_paid(): void
    {
        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenantA->id)->first();
        $doctor = Doctor::where('tenant_id', $this->tenantA->id)->first();
        $patient = Patient::where('tenant_id', $this->tenantA->id)->first();

        $session = DoctorSession::where('tenant_id', $this->tenantA->id)->first();
        $token = BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 88,
            'status' => 'completed',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenantA->id,
            'booking_token_id' => $token->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'total_amount' => 300000,
            'payment_status' => Bill::STATUS_PAID,
        ]);

        $rx = Prescription::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_number' => 'RX-QA-PAID-BILL-01',
            'booking_token_id' => $token->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenantA->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $clinicMed->id,
            'display_name' => $clinicMed->display_name,
            'frequency' => 'tds',
            'quantity' => 5,
            'source' => PrescriptionItem::SOURCE_CLINIC,
        ]);

        $this->dispenseService->dispensePrescription($rx, $this->pharmacistA, $this->tenantA->id);

        // Undo must fail because bill is already paid
        $this->expectException(InvalidArgumentException::class);
        $this->dispenseService->undoDispense($rx->fresh(), 'Illegal undo on paid bill', $this->pharmacistA, $this->tenantA->id);
    }
}
