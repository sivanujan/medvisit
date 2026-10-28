<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Medicine;
use App\Models\MedicineVariant;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionTemplate;
use App\Models\StockBatch;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Billing\BillCalculator;
use App\Services\Pharmacy\DoseCalculatorService;
use App\Services\Pharmacy\StockService;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PrescriptionAndDispensingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected User $pharmacistUser;

    protected Patient $patient;

    protected DoctorSession $doctorSession;

    protected BookingToken $token;

    protected Bill $bill;

    protected string $baseDomain;

    protected DoseCalculatorService $doseCalculator;

    protected StockService $stockService;

    protected BillCalculator $billCalculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->doseCalculator = app(DoseCalculatorService::class);
        $this->stockService = app(StockService::class);
        $this->billCalculator = app(BillCalculator::class);

        // 1. Create Tenant
        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'clinic-rx-test',
            'name' => 'Rx Test Clinic',
            'subdomain' => 'rxtest',
            'status' => 'active',
            'pharmacy_enabled' => true,
            'pharmacy_stock_reduction_mode' => 'dispense',
            'prescription_print_enabled' => true,
            'prescription_print_language' => 'en',
        ]);

        // 2. Setup Permissions & Roles
        $permissions = [
            'prescriptions.create',
            'prescriptions.view',
            'prescriptions.view_history',
            'pharmacy.dispense',
            'pharmacy.view',
            'templates.manage_shared',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $doctorRole = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);
        $doctorRole->givePermissionTo(['prescriptions.create', 'prescriptions.view', 'prescriptions.view_history']);

        $pharmacyRole = Role::firstOrCreate(['name' => 'pharmacy', 'guard_name' => 'web']);
        $pharmacyRole->givePermissionTo(['pharmacy.dispense', 'pharmacy.view', 'prescriptions.view']);

        // 3. Create Doctor User & Model
        $this->doctorUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Samantha Silva',
            'email' => 'samantha@test.com',
        ]);
        $this->doctorUser->assignRole($doctorRole);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'title' => 'Dr.',
            'name' => 'Samantha Silva',
            'specialty' => 'Consultant Physician',
            'slmc_number' => 'SLMC-12345',
            'is_active' => true,
        ]);

        // 4. Create Pharmacist User
        $this->pharmacistUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pharmacist Nimal',
            'email' => 'nimal@test.com',
        ]);
        $this->pharmacistUser->assignRole($pharmacyRole);

        // 5. Create Patient
        $this->patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Perera',
            'phone' => '0771234567',
            'gender' => 'male',
            'date_of_birth' => Carbon::now()->subYears(30)->toDateString(),
        ]);

        // 6. Create Session, Token, and Bill
        $this->doctorSession = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => Carbon::today()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'room_number' => 'Room 1',
            'status' => 'active',
            'max_tokens' => 20,
        ]);

        $this->token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->doctorSession->id,
            'patient_id' => $this->patient->id,
            'token_number' => 1,
            'status' => 'in_consultation',
            'booking_type' => 'walk_in',
        ]);

        $this->bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'receipt_number' => 'REC-001001',
            'consultation_fee' => 150000, // 1500 LKR
            'fee_snapshot' => [
                'components' => [
                    ['name' => 'Doctor Fee', 'amount' => 150000, 'type' => 'doctor_fee'],
                    ['name' => 'Clinic Fee', 'amount' => 50000, 'type' => 'clinic_fee'],
                ],
                'subtotal' => 200000,
            ],
            'subtotal' => 200000,
            'total_amount' => 200000,
            'clinic_net_amount' => 50000,
            'payment_status' => Bill::STATUS_PENDING,
            'billing_timing' => 'pay_after_consult',
        ]);
    }

    protected function createClinicMedicineWithBatch(
        string $generic = 'Paracetamol',
        string $strength = '500mg',
        string $form = 'Tablet',
        int $quantity = 50,
        int $sellingPriceCents = 1500, // 15 LKR/tablet
        ?Carbon $expiryDate = null
    ): array {
        $med = Medicine::firstOrCreate(
            ['generic_name' => $generic],
            ['normalized_name' => strtolower($generic), 'status' => 'approved']
        );

        $variant = MedicineVariant::firstOrCreate([
            'medicine_id' => $med->id,
            'strength_text' => $strength,
            'dosage_form' => $form,
        ], [
            'status' => 'approved',
        ]);

        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => "{$generic} {$strength} {$form}",
            'base_unit' => strtolower($form),
            'selling_price_cents' => $sellingPriceCents,
            'reorder_level' => 10,
            'total_quantity' => $quantity,
            'is_active' => true,
        ]);

        $batch = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $clinicMed->id,
            'batch_number' => 'B-'.bin2hex(random_bytes(3)),
            'quantity_received' => $quantity,
            'quantity_remaining' => $quantity,
            'cost_price_cents' => 800, // 8 LKR cost
            'expiry_date' => $expiryDate ?? Carbon::today()->addMonths(6),
        ]);

        return [$clinicMed, $batch, $variant];
    }

    /**
     * 1. Dose Calculation Unit Tests:
     * - Hyphenated patterns
     * - Fractional doses (e.g. 1/2-0-0 x 3 days = 1.5 -> 2)
     * - Mixed fractions (e.g. 1 1/2)
     * - SOS returns null
     * - Non-solid returns 1
     */
    public function test_dose_calculation_formula_and_fractional_doses(): void
    {
        // 1-0-1 x 5 days = 2 x 5 = 10
        $qty1 = $this->doseCalculator->calculateQuantity('1', '1-0-1', 5, 'Tablet');
        $this->assertEquals(10, $qty1);

        // 1/2-0-0 x 3 days = 0.5 x 3 = 1.5 -> ceil = 2
        $qty2 = $this->doseCalculator->calculateQuantity('1/2', '1-0-0', 3, 'Tablet');
        $this->assertEquals(2, $qty2);

        // 1/2-0-1/2 x 4 days = (0.5 + 0.5) x 4 = 4
        $qty3 = $this->doseCalculator->calculateQuantity('1/2', '1/2-0-1/2', 4, 'Capsule');
        $this->assertEquals(4, $qty3);

        // Mixed fraction: "1 1/2" with 1-1-1 x 2 days = 1.5 x 3 x 2 = 9
        $qty4 = $this->doseCalculator->calculateQuantity('1 1/2', '1-1-1', 2, 'Tablet');
        $this->assertEquals(9, $qty4);

        // SOS / PRN returns null (doctor sets manually)
        $qtySos = $this->doseCalculator->calculateQuantity('1', 'sos', 5, 'Tablet');
        $this->assertNull($qtySos);

        // Non-solid forms (Syrup, Drops, Cream) return null (manual pack quantity)
        $qtySyrup = $this->doseCalculator->calculateQuantity('5ml', '1-0-1', 5, 'Syrup');
        $this->assertNull($qtySyrup);

        // Parse dose decimal values
        $this->assertEquals(0.5, $this->doseCalculator->parseDoseToDecimal('1/2'));
        $this->assertEquals(0.5, $this->doseCalculator->parseDoseToDecimal('0.5'));
        $this->assertEquals(1.5, $this->doseCalculator->parseDoseToDecimal('1 1/2'));
        $this->assertEquals(0.75, $this->doseCalculator->parseDoseToDecimal('3/4'));
    }

    /**
     * 2. One Active Prescription Per Visit (Partial Unique Index).
     */
    public function test_one_active_prescription_per_visit_enforced(): void
    {
        // First prescription for token
        Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000001',
            'status' => Prescription::STATUS_DRAFT,
            'stock_reduction_mode' => 'dispense',
        ]);

        // Attempting to create a second non-cancelled prescription for the same token fails
        $this->expectException(QueryException::class);

        Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000002',
            'status' => Prescription::STATUS_DRAFT,
            'stock_reduction_mode' => 'dispense',
        ]);
    }

    /**
     * 3. Mode (a) Two-step workflow:
     * - Doctor finalize does NOT deduct stock
     * - Sets status to finalized
     * - Dispense deducts FEFO stock, creates bill_items, recalculates bill via BillCalculator
     * - Undo dispense reverses to exact same batches and deletes bill_items
     */
    public function test_mode_a_two_step_dispense_and_exact_batch_undo(): void
    {
        [$clinicMed, $batch] = $this->createClinicMedicineWithBatch('Amoxicillin', '500mg', 'Capsule', 30, 2500);

        // Draft consultation
        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'DRAFT-001',
            'status' => Prescription::STATUS_DRAFT,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
        ]);

        // Finalize consultation
        $urlFinalize = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/finalize";
        $response = $this->actingAs($this->doctorUser)->post($urlFinalize, [
            'chief_complaint' => 'Bacterial infection with fever',
            'diagnosis' => 'Acute Tonsillitis',
            'tags' => ['Tonsillitis', 'Infection'],
            'items' => [
                [
                    'clinic_medicine_id' => $clinicMed->id,
                    'medicine_variant_id' => $clinicMed->medicine_variant_id,
                    'generic_name' => 'Amoxicillin',
                    'strength_text' => '500mg',
                    'dosage_form' => 'Capsule',
                    'display_name' => 'Amoxicillin 500mg Capsule',
                    'source' => 'clinic',
                    'dose' => '1',
                    'frequency' => '1-1-1',
                    'duration_days' => 5,
                    'timing' => 'after_meals',
                    'quantity' => 15, // 1 x 3 x 5 = 15
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $prescription->refresh();
        $this->assertEquals(Prescription::STATUS_FINALIZED, $prescription->status);

        // Stock must NOT be deducted on finalize in Mode (a)
        $batch->refresh();
        $clinicMed->refresh();
        $this->assertEquals(30, $batch->quantity_remaining);
        $this->assertEquals(30, $clinicMed->total_quantity);

        // No bill items yet
        $this->assertEquals(0, $this->bill->items()->count());

        // Now Pharmacy Dispenses
        $rxItem = $prescription->items()->first();
        $urlDispense = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/confirm";

        $dispenseRes = $this->actingAs($this->pharmacistUser)->post($urlDispense, [
            'items' => [
                [
                    'prescription_item_id' => $rxItem->id,
                    'quantity_to_dispense' => 15,
                ],
            ],
        ]);

        $dispenseRes->assertSessionHasNoErrors();

        // Verify stock deducted
        $batch->refresh();
        $clinicMed->refresh();
        $this->assertEquals(15, $batch->quantity_remaining); // 30 - 15 = 15
        $this->assertEquals(15, $clinicMed->total_quantity);

        // Verify prescription status
        $prescription->refresh();
        $this->assertEquals(Prescription::STATUS_DISPENSED, $prescription->status);

        // Verify bill line items & central BillCalculator
        $this->bill->refresh();
        $this->assertEquals(1, $this->bill->items()->count());
        $billItem = $this->bill->items()->first();
        $this->assertEquals(15, $billItem->quantity);
        $this->assertEquals(2500, $billItem->unit_price_cents);
        $this->assertEquals(37500, $billItem->total_price_cents); // 15 x 25.00 = 375.00 LKR (37500 cents)

        // Bill total = fee components (200000) + medicines (37500) = 237500
        $this->assertEquals(237500, $this->bill->total_amount);

        // Now Undo Dispense (Reversal)
        $urlUndo = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/undo";
        $undoRes = $this->actingAs($this->pharmacistUser)->post($urlUndo, [
            'reason' => 'Patient returned uncollected medicine',
        ]);

        $undoRes->assertSessionHasNoErrors();

        // Exact batch restored
        $batch->refresh();
        $clinicMed->refresh();
        $this->assertEquals(30, $batch->quantity_remaining);
        $this->assertEquals(30, $clinicMed->total_quantity);

        // Bill items deleted and bill recalculated
        $this->bill->refresh();
        $this->assertEquals(0, $this->bill->items()->count());
        $this->assertEquals(200000, $this->bill->total_amount);
    }

    /**
     * 4. Double-click idempotency test:
     * Calling confirm-dispense twice does NOT reduce stock twice.
     */
    public function test_double_click_dispense_idempotency_prevents_double_reduction(): void
    {
        [$clinicMed, $batch] = $this->createClinicMedicineWithBatch('Ciprofloxacin', '500mg', 'Tablet', 20, 3000);

        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000010',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        $rxItem = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $prescription->id,
            'clinic_medicine_id' => $clinicMed->id,
            'medicine_variant_id' => $clinicMed->medicine_variant_id,
            'generic_name' => 'Ciprofloxacin',
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'display_name' => 'Ciprofloxacin 500mg Tablet',
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_amount' => 1,
            'dose_unit' => 'tablet',
            'dose_display' => '1',
            'frequency' => '1-0-1',
            'duration_days' => 5,
            'timing' => 'after_meals',
            'quantity' => 10,
        ]);

        $urlDispense = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/confirm";

        // First click
        $this->actingAs($this->pharmacistUser)->post($urlDispense, [
            'items' => [['prescription_item_id' => $rxItem->id, 'quantity_to_dispense' => 10]],
        ]);

        $batch->refresh();
        $this->assertEquals(10, $batch->quantity_remaining); // 20 - 10 = 10

        // Second click (simulated double submit)
        $this->actingAs($this->pharmacistUser)->post($urlDispense, [
            'items' => [['prescription_item_id' => $rxItem->id, 'quantity_to_dispense' => 10]],
        ]);

        // Stock must still be 10, NOT 0!
        $batch->refresh();
        $this->assertEquals(10, $batch->quantity_remaining);
    }

    /**
     * 5. FEFO Selection Skips Expired Batches.
     */
    public function test_fefo_skips_expired_batches(): void
    {
        $med = Medicine::create(['generic_name' => 'Metformin', 'normalized_name' => 'metformin', 'status' => 'approved']);
        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Metformin 500mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1000,
            'reorder_level' => 10,
            'total_quantity' => 30,
            'is_active' => true,
        ]);

        // Expired batch: 10 units
        $expiredBatch = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $clinicMed->id,
            'batch_number' => 'EXPIRED-01',
            'quantity_received' => 10,
            'quantity_remaining' => 10,
            'cost_price_cents' => 500,
            'expiry_date' => Carbon::yesterday(),
        ]);

        // Valid batch: 20 units
        $validBatch = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $clinicMed->id,
            'batch_number' => 'VALID-01',
            'quantity_received' => 20,
            'quantity_remaining' => 20,
            'cost_price_cents' => 500,
            'expiry_date' => Carbon::today()->addMonths(8),
        ]);

        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000020',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        $rxItem = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $prescription->id,
            'clinic_medicine_id' => $clinicMed->id,
            'medicine_variant_id' => $variant->id,
            'generic_name' => 'Metformin',
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'display_name' => 'Metformin 500mg Tablet',
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_amount' => 1,
            'dose_unit' => 'tablet',
            'dose_display' => '1',
            'frequency' => '1-0-1',
            'duration_days' => 5,
            'timing' => 'after_meals',
            'quantity' => 10,
        ]);

        $urlDispense = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/confirm";
        $this->actingAs($this->pharmacistUser)->post($urlDispense, [
            'items' => [['prescription_item_id' => $rxItem->id, 'quantity_to_dispense' => 10]],
        ]);

        // Expired batch was completely skipped
        $expiredBatch->refresh();
        $validBatch->refresh();
        $this->assertEquals(10, $expiredBatch->quantity_remaining);
        $this->assertEquals(10, $validBatch->quantity_remaining); // 20 - 10 = 10
    }

    /**
     * 6. Undo blocked after bill is paid.
     */
    public function test_undo_dispense_blocked_after_bill_is_paid(): void
    {
        [$clinicMed, $batch] = $this->createClinicMedicineWithBatch('Paracetamol', '500mg', 'Tablet', 50, 1000);

        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000030',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        $rxItem = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $prescription->id,
            'clinic_medicine_id' => $clinicMed->id,
            'medicine_variant_id' => $clinicMed->medicine_variant_id,
            'generic_name' => 'Paracetamol',
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'display_name' => 'Paracetamol 500mg Tablet',
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_amount' => 1,
            'dose_unit' => 'tablet',
            'dose_display' => '1',
            'frequency' => '1-0-1',
            'duration_days' => 5,
            'timing' => 'after_meals',
            'quantity' => 10,
        ]);

        // Dispense
        $urlDispense = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/confirm";
        $this->actingAs($this->pharmacistUser)->post($urlDispense, [
            'items' => [['prescription_item_id' => $rxItem->id, 'quantity_to_dispense' => 10]],
        ]);

        // Mark bill as paid
        $this->bill->payment_status = Bill::STATUS_PAID;
        $this->bill->save();

        // Attempt undo
        $urlUndo = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/undo";
        $undoRes = $this->actingAs($this->pharmacistUser)->post($urlUndo, ['reason' => 'Test']);

        $undoRes->assertSessionHasErrors(['undo']);

        // Stock remaining must still be 40 (not reverted)
        $batch->refresh();
        $this->assertEquals(40, $batch->quantity_remaining);
    }

    /**
     * 7. Print Route Returns 404 When Disabled in Settings.
     */
    public function test_print_route_returns_404_when_disabled(): void
    {
        // Disable printing
        $this->tenant->prescription_print_enabled = false;
        $this->tenant->save();

        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000040',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        $urlPrint = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/prescriptions/{$prescription->id}/print";
        $res = $this->actingAs($this->doctorUser)->get($urlPrint);

        $res->assertStatus(404);
    }

    /**
     * 8. Pharmacy Module Disabled: Prescriptions Work (Buy Outside), Dispense Returns 403.
     */
    public function test_pharmacy_disabled_prescriptions_work_dispense_returns_403(): void
    {
        $this->tenant->pharmacy_enabled = false;
        $this->tenant->save();

        // Dispense counter access returns 403
        $urlDispense = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense";
        $dispenseRes = $this->actingAs($this->pharmacistUser)->get($urlDispense);
        $dispenseRes->assertStatus(403);

        // But doctor can still write prescriptions
        $urlConsultation = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}";
        $docRes = $this->actingAs($this->doctorUser)->get($urlConsultation);
        $docRes->assertOk();
    }

    /**
     * 9. Mode (b): Doctor Finalize reduces stock immediately and adds bill lines.
     * Cancelling consultation reverses stock.
     */
    public function test_mode_b_finalize_reduces_stock_immediately_and_reverses_on_cancel(): void
    {
        [$clinicMed, $batch] = $this->createClinicMedicineWithBatch('Azithromycin', '500mg', 'Tablet', 10, 5000);

        // Prescription in Mode B (Finalize mode)
        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'DRAFT-MODEB',
            'status' => Prescription::STATUS_DRAFT,
            'stock_reduction_mode' => Prescription::MODE_FINALIZE,
            'created_by' => $this->doctorUser->id,
        ]);

        $urlFinalize = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/finalize";
        $res = $this->actingAs($this->doctorUser)->post($urlFinalize, [
            'diagnosis' => 'Bronchitis',
            'items' => [
                [
                    'clinic_medicine_id' => $clinicMed->id,
                    'medicine_variant_id' => $clinicMed->medicine_variant_id,
                    'display_name' => 'Azithromycin 500mg Tablet',
                    'source' => 'clinic',
                    'dose' => '1',
                    'frequency' => '1-0-0',
                    'duration_days' => 3,
                    'timing' => 'before_meals',
                    'quantity' => 3,
                ],
            ],
        ]);

        $res->assertSessionHasNoErrors();

        // In Mode B: stock is reduced immediately upon doctor finalization
        $batch->refresh();
        $this->assertEquals(7, $batch->quantity_remaining); // 10 - 3 = 7

        // Bill items attached immediately and bill recalculated
        $this->bill->refresh();
        $this->assertEquals(1, $this->bill->items()->count());
        $this->assertEquals(215000, $this->bill->total_amount); // 200000 + (3 x 5000) = 215000

        // Cancel consultation reverses stock
        $urlCancel = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/cancel";
        $cancelRes = $this->actingAs($this->doctorUser)->post($urlCancel, [
            'reason' => 'Patient left without consultation',
        ]);

        $cancelRes->assertSessionHasNoErrors();

        // Stock restored
        $batch->refresh();
        $this->assertEquals(10, $batch->quantity_remaining);

        // Bill line items removed and bill recalculated
        $this->bill->refresh();
        $this->assertEquals(0, $this->bill->items()->count());
        $this->assertEquals(200000, $this->bill->total_amount);
    }

    /**
     * 10. Brand Substitution: Strictly enforces identical medicine variant.
     */
    public function test_brand_substitution_strictly_enforces_same_variant(): void
    {
        [$clinicMedA, $batchA, $variantA] = $this->createClinicMedicineWithBatch('Paracetamol', '500mg', 'Tablet', 30, 1000);
        // Different medicine
        [$clinicMedDiff, $batchDiff] = $this->createClinicMedicineWithBatch('Ibuprofen', '400mg', 'Tablet', 30, 1500);

        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000060',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        $rxItem = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $prescription->id,
            'clinic_medicine_id' => $clinicMedA->id,
            'medicine_variant_id' => $variantA->id,
            'generic_name' => 'Paracetamol',
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'display_name' => 'Paracetamol 500mg Tablet',
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_amount' => 1,
            'dose_unit' => 'tablet',
            'dose_display' => '1',
            'frequency' => '1-0-1',
            'duration_days' => 5,
            'timing' => 'after_meals',
            'quantity' => 10,
        ]);

        // Attempt substituting with Ibuprofen (different variant) must fail!
        $urlDispense = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/dispense/{$prescription->id}/confirm";
        $res = $this->actingAs($this->pharmacistUser)->post($urlDispense, [
            'items' => [
                [
                    'prescription_item_id' => $rxItem->id,
                    'quantity_to_dispense' => 10,
                    'substitute_clinic_medicine_id' => $clinicMedDiff->id,
                ],
            ],
        ]);

        $res->assertSessionHasErrors(['dispense']);

        // Stock must NOT be deducted
        $batchDiff->refresh();
        $this->assertEquals(30, $batchDiff->quantity_remaining);
    }

    /**
     * 11. Templates: Personal vs Shared Visibility.
     */
    public function test_template_personal_vs_shared_visibility(): void
    {
        // Another doctor
        $otherDoctorUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $otherDoctorUser->assignRole('doctor');
        $otherDoctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $otherDoctorUser->id,
            'name' => 'Dr. Perera',
            'specialty' => 'Pediatrician',
            'slmc_number' => 'SLMC-99999',
            'is_active' => true,
        ]);

        // Personal template by Dr. Samantha
        $personalTpl = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'created_by' => $this->doctorUser->id,
            'name' => 'Samantha Private Regimen',
            'is_shared' => false,
        ]);

        // Shared template by Dr. Samantha
        $sharedTpl = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'created_by' => $this->doctorUser->id,
            'name' => 'Clinic URI Standard',
            'is_shared' => true,
        ]);

        // Dr. Samantha sees both
        $urlTemplates = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates";
        $resDoc = $this->actingAs($this->doctorUser)->get($urlTemplates);
        $resDoc->assertOk();
        $resDoc->assertSee('Samantha Private Regimen');
        $resDoc->assertSee('Clinic URI Standard');

        // Dr. Perera sees shared, but NOT Samantha's private regimen
        $resOther = $this->actingAs($otherDoctorUser)->get($urlTemplates);
        $resOther->assertOk();
        $resOther->assertSee('Clinic URI Standard');
        $resOther->assertDontSee('Samantha Private Regimen');
    }

    /**
     * 12. Switching mode in tenant settings preserves pending prescription mode.
     */
    public function test_mode_switch_preserves_pending_prescription_mode(): void
    {
        // Create prescription under MODE_DISPENSE
        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000070',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        // Switch tenant settings to consultation mode
        $this->tenant->pharmacy_stock_reduction_mode = Prescription::MODE_FINALIZE;
        $this->tenant->save();

        // The existing prescription still has stock_reduction_mode = dispense
        $prescription->refresh();
        $this->assertEquals(Prescription::MODE_DISPENSE, $prescription->stock_reduction_mode);
    }

    /**
     * 13. Doctor Payout: percentage payout on a bill with medicines -> payout unchanged by medicine lines.
     */
    public function test_doctor_percentage_payout_unchanged_by_dispensed_medicine_lines(): void
    {
        // Setup doctor with 60% payout rule
        $this->doctor->update([
            'payout_rule' => [
                'type' => 'percentage_of_total',
                'value' => 60,
            ],
        ]);

        // Base consultation fee: 200,000 cents (2000 LKR). Doctor portion = 60% = 120,000 cents.
        $this->bill->update([
            'doctor_payout_amount' => 120000,
            'clinic_net_amount' => 80000,
            'fee_snapshot' => [
                'patient_total' => 200000,
                'subtotal' => 200000,
                'gross_subtotal' => 200000,
                'doctor_payout_amount' => 120000,
                'clinic_net_amount' => 80000,
            ],
        ]);

        // Dispense medicine worth 50,000 cents (500 LKR)
        [$clinicMed] = $this->createClinicMedicineWithBatch('Paracetamol', '500mg', 'Tablet', 50, 5000);

        BillItem::create([
            'tenant_id' => $this->tenant->id,
            'bill_id' => $this->bill->id,
            'clinic_medicine_id' => $clinicMed->id,
            'description' => 'Paracetamol 500mg Tablet (10 tablet)',
            'quantity' => 10,
            'unit_price_cents' => 5000,
            'total_price_cents' => 50000, // 500 LKR
        ]);

        // Recalculate bill
        $this->billCalculator->recalculate($this->bill);
        $this->bill->refresh();

        // Total amount is 200,000 + 50,000 = 250,000 cents
        $this->assertEquals(250000, $this->bill->total_amount);

        // Doctor payout remains strictly 120,000 cents (60% of consultation, 0% of medicines)
        $this->assertEquals(120000, $this->bill->doctor_payout_amount);

        // Clinic net amount receives 100% of medicine sales: 80,000 + 50,000 = 130,000 cents
        $this->assertEquals(130000, $this->bill->clinic_net_amount);
    }

    /**
     * 14. Mode (b) Short-Stock: dispenses available quantity, marks partially dispensed, and charges only dispensed qty.
     */
    public function test_mode_b_short_stock_dispenses_available_and_marks_partially_dispensed(): void
    {
        // Batch has only 3 units in stock
        [$clinicMed, $batch] = $this->createClinicMedicineWithBatch('Amoxicillin', '250mg', 'Capsule', 3, 2000);

        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'DRAFT-SHORT',
            'status' => Prescription::STATUS_DRAFT,
            'stock_reduction_mode' => Prescription::MODE_FINALIZE,
            'created_by' => $this->doctorUser->id,
        ]);

        // Doctor prescribes 5 units
        $urlFinalize = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/finalize";
        $res = $this->actingAs($this->doctorUser)->post($urlFinalize, [
            'diagnosis' => 'Bacterial Infection',
            'items' => [
                [
                    'clinic_medicine_id' => $clinicMed->id,
                    'medicine_variant_id' => $clinicMed->medicine_variant_id,
                    'display_name' => 'Amoxicillin 250mg Capsule',
                    'source' => 'clinic',
                    'dose' => '1',
                    'frequency' => '1-0-1',
                    'timing' => 'after_meals',
                    'duration_days' => 5,
                    'quantity' => 5, // Requires 5, but stock only has 3
                ],
            ],
        ]);

        $res->assertSessionHasNoErrors();

        // Batch depleted to 0
        $batch->refresh();
        $this->assertEquals(0, $batch->quantity_remaining);

        // Status is partially_dispensed
        $rx->refresh();
        $this->assertEquals(Prescription::STATUS_PARTIALLY_DISPENSED, $rx->status);

        // Bill line item only charges the 3 dispensed units (3 x 2000 = 6000 cents)
        $this->bill->refresh();
        $this->assertEquals(1, $this->bill->items()->count());
        $this->assertEquals(3, $this->bill->items()->first()->quantity);
        $this->assertEquals(6000, $this->bill->items()->first()->total_price_cents);
        $this->assertEquals(206000, $this->bill->total_amount); // 200000 + 6000
    }

    /**
     * 15. Edit and Cancellation blocked after bill payment.
     */
    public function test_edit_and_cancellation_blocked_after_bill_is_paid(): void
    {
        [$clinicMed, $batch] = $this->createClinicMedicineWithBatch('Cetirizine', '10mg', 'Tablet', 20, 1000);

        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'DRAFT-PAID-GUARD',
            'status' => Prescription::STATUS_DRAFT,
            'stock_reduction_mode' => Prescription::MODE_FINALIZE,
            'created_by' => $this->doctorUser->id,
        ]);

        $urlFinalize = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/finalize";
        $finalizeRes = $this->actingAs($this->doctorUser)->post($urlFinalize, [
            'diagnosis' => 'Allergic Rhinitis',
            'items' => [
                [
                    'clinic_medicine_id' => $clinicMed->id,
                    'medicine_variant_id' => $clinicMed->medicine_variant_id,
                    'display_name' => 'Cetirizine 10mg Tablet',
                    'source' => 'clinic',
                    'dose' => '1',
                    'frequency' => '0-0-1',
                    'timing' => 'bedtime',
                    'duration_days' => 5,
                    'quantity' => 5,
                ],
            ],
        ]);
        $finalizeRes->assertSessionHasNoErrors();

        // Patient pays bill
        $this->bill->update(['payment_status' => Bill::STATUS_PAID]);

        // 1. Attempting to save draft edit is blocked
        $urlDraft = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/draft";
        $resDraft = $this->actingAs($this->doctorUser)->post($urlDraft, [
            'diagnosis' => 'Changed Diagnosis',
            'items' => [],
        ]);
        $resDraft->assertSessionHasErrors(['draft']);

        // 2. Attempting to cancel consultation is blocked
        $urlCancel = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/cancel";
        $resCancel = $this->actingAs($this->doctorUser)->post($urlCancel, [
            'reason' => 'Patient wants refund',
        ]);
        $resCancel->assertSessionHasErrors(['cancel']);

        // Stock remains safely deducted
        $batch->refresh();
        $this->assertEquals(15, $batch->quantity_remaining);
    }

    /**
     * 16. Repeat last prescription marks out-of-stock medicines as outside.
     */
    public function test_repeat_last_prescription_marks_out_of_stock_as_outside(): void
    {
        [$medInStock] = $this->createClinicMedicineWithBatch('Paracetamol', '500mg', 'Tablet', 25);
        [$medOutOfStock] = $this->createClinicMedicineWithBatch('Amoxicillin', '500mg', 'Capsule', 0);

        // Previous prescription
        $prevRx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => null,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-PREV01',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now()->subDays(5),
        ]);

        $prevRx->items()->createMany([
            [
                'tenant_id' => $this->tenant->id,
                'clinic_medicine_id' => $medInStock->id,
                'medicine_variant_id' => $medInStock->medicine_variant_id,
                'display_name' => 'Paracetamol 500mg Tablet',
                'source' => PrescriptionItem::SOURCE_CLINIC,
                'dose_amount' => 1,
                'dose_unit' => 'tablet',
                'dose_display' => '1',
                'frequency' => '1-0-1',
                'duration_days' => 5,
                'quantity' => 10,
            ],
            [
                'tenant_id' => $this->tenant->id,
                'clinic_medicine_id' => $medOutOfStock->id,
                'medicine_variant_id' => $medOutOfStock->medicine_variant_id,
                'display_name' => 'Amoxicillin 500mg Capsule',
                'source' => PrescriptionItem::SOURCE_CLINIC,
                'dose_amount' => 1,
                'dose_unit' => 'capsule',
                'dose_display' => '1',
                'frequency' => '1-1-1',
                'duration_days' => 5,
                'quantity' => 15,
            ],
        ]);

        // Doctor requests repeat-last for current token
        $urlRepeat = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/consultation/{$this->token->id}/repeat-last";
        $res = $this->actingAs($this->doctorUser)->post($urlRepeat);
        $res->assertOk();

        $items = $res->json('items');
        $this->assertCount(2, $items);

        // In-stock item is clinic source
        $this->assertEquals('clinic', $items[0]['source']);
        $this->assertEquals($medInStock->id, $items[0]['clinic_medicine_id']);

        // Out-of-stock item is converted to outside source with null clinic_medicine_id
        $this->assertEquals('outside', $items[1]['source']);
        $this->assertNull($items[1]['clinic_medicine_id']);
    }

    /**
     * 17. Tenant isolation: Patient history returns 404 for another tenant's patient.
     */
    public function test_patient_history_returns_404_for_another_tenant(): void
    {
        $tenantB = Tenant::factory()->active()->create([
            'id' => 'clinic-b-rx',
            'name' => 'Other Clinic',
            'subdomain' => 'clinicb',
        ]);

        $patientB = Patient::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Other Patient',
            'phone' => '0779998888',
            'gender' => 'female',
        ]);

        // Attempting to access Patient B's history from Tenant A domain returns 404
        $urlHistory = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/patients/{$patientB->id}/history";
        $res = $this->actingAs($this->doctorUser)->get($urlHistory);
        $res->assertNotFound();
    }

    /**
     * 18. Printable prescription in Tamil renders localized Tamil text.
     */
    public function test_prescription_print_in_tamil_renders_tamil_labels(): void
    {
        $this->tenant->prescription_print_language = 'ta';
        $this->tenant->save();

        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-000088',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'created_by' => $this->doctorUser->id,
            'finalized_at' => now(),
        ]);

        $rx->items()->create([
            'tenant_id' => $this->tenant->id,
            'display_name' => 'Paracetamol 500mg Tablet',
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_amount' => 1,
            'dose_unit' => 'tablet',
            'dose_display' => '1',
            'frequency' => 'twice_daily',
            'timing' => 'after_meals',
            'duration_days' => 3,
            'quantity' => 6,
        ]);

        $urlPrint = "http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/prescriptions/{$rx->id}/print";
        $res = $this->actingAs($this->doctorUser)->get($urlPrint);
        $res->assertOk();

        // Inertia page receives Tamil labels
        $res->assertInertia(fn ($page) => $page
            ->component('Tenant/Doctor/PrescriptionPrint')
            ->where('labels.prescription', 'மருந்துச் சீட்டு')
            ->where('labels.patient', 'நோயாளி')
            ->where('labels.doctor_signature', 'மருத்துவர் கையொப்பம்')
        );
    }
}
