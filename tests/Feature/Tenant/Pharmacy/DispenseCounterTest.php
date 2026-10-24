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
use App\Models\StockBatch;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DispenseCounterTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $pharmacist;

    protected User $pharmacistTwo;

    protected Doctor $doctor;

    protected Patient $patient;

    protected BookingToken $token;

    protected Bill $bill;

    protected ClinicMedicine $clinicMed;

    protected StockBatch $earlyBatch;

    protected StockBatch $laterBatch;

    protected StockBatch $expiredBatch;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Tenant
        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'dispense-clinic',
            'name' => 'Dispense Test Clinic',
            'subdomain' => 'dispensetest',
            'status' => 'active',
            'pharmacy_enabled' => true,
            'pharmacy_stock_reduction_mode' => 'dispense',
            'prescription_print_enabled' => true,
            'prescription_print_language' => 'en',
        ]);

        // 2. Roles & Permissions
        $pharmacyRole = Role::firstOrCreate(['name' => 'pharmacy', 'guard_name' => 'web']);
        $permissions = ['pharmacy.dispense', 'pharmacy.view', 'prescriptions.view'];
        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $pharmacyRole->syncPermissions($permissions);

        $this->pharmacist = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pharmacist Alice',
            'email' => 'alice@dispensetest.lk',
        ]);
        $this->pharmacist->assignRole($pharmacyRole);

        $this->pharmacistTwo = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pharmacist Bob',
            'email' => 'bob@dispensetest.lk',
        ]);
        $this->pharmacistTwo->assignRole($pharmacyRole);

        // 3. Doctor & Patient
        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Kasun Silva',
            'specialty' => 'General Practitioner',
            'slmc_number' => 'SLMC-98765',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sunil Perera',
            'phone' => '0771234567',
            'phone_normalized' => '+94771234567',
            'gender' => 'male',
            'date_of_birth' => Carbon::now()->subYears(45)->toDateString(),
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => Carbon::today()->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '12:00:00',
            'room_number' => 'Room 1',
            'status' => 'active',
            'max_tokens' => 25,
        ]);

        $this->token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $this->patient->id,
            'token_number' => 10,
            'status' => 'completed',
            'booking_type' => 'walk_in',
        ]);

        $this->bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'receipt_number' => 'REC-DISP-001',
            'clinic_fee' => 100000,
            'total_amount' => 100000,
            'payment_status' => Bill::STATUS_PENDING,
        ]);

        // 4. Catalog Medicine & Batches
        $med = Medicine::create([
            'generic_name' => 'Amoxicillin',
            'is_antibiotic' => true,
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_amount' => 500,
            'strength_unit' => 'mg',
            'strength_text' => '500mg',
            'dosage_form' => 'Capsule',
            'route' => 'oral',
            'status' => 'approved',
        ]);

        $this->clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Amoxicillin 500mg Capsule (Moxilen)',
            'base_unit' => 'capsule',
            'selling_price_cents' => 2500, // 25.00 LKR
            'reorder_level' => 10,
            'is_active' => true,
        ]);

        // Early batch (FEFO choice): expires in 2 months
        $this->earlyBatch = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'batch_number' => 'BATCH-EARLY-01',
            'expiry_date' => Carbon::today()->addMonths(2)->toDateString(),
            'quantity_received' => 20,
            'quantity_remaining' => 20,
            'cost_price_cents' => 1500,
            'received_at' => Carbon::now(),
        ]);

        // Later batch: expires in 8 months
        $this->laterBatch = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'batch_number' => 'BATCH-LATER-02',
            'expiry_date' => Carbon::today()->addMonths(8)->toDateString(),
            'quantity_received' => 50,
            'quantity_remaining' => 50,
            'cost_price_cents' => 1500,
            'received_at' => Carbon::now(),
        ]);

        // Expired batch: expired 1 month ago
        $this->expiredBatch = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'batch_number' => 'BATCH-EXPIRED-99',
            'expiry_date' => Carbon::today()->subMonths(1)->toDateString(),
            'quantity_received' => 30,
            'quantity_remaining' => 30,
            'cost_price_cents' => 1500,
            'received_at' => Carbon::now()->subMonths(6),
        ]);
    }

    protected function host(string $path = ''): string
    {
        return 'http://'.$this->tenant->subdomain.'.'.config('medvisit.base_domain', 'medvisit.localhost').$path;
    }

    /**
     * 1. FEFO picks the earliest non-expired batch.
     */
    public function test_fefo_picks_the_earliest_non_expired_batch(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-FEFO-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'medicine_variant_id' => $this->clinicMed->medicine_variant_id,
            'generic_name' => 'Amoxicillin',
            'display_name' => $this->clinicMed->display_name,
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_display' => '500 mg',
            'frequency' => 'tds',
            'timing' => 'after_meals',
            'duration_days' => 5,
            'quantity' => 15, // Less than early batch (20)
        ]);

        $response = $this->actingAs($this->pharmacist)
            ->post($this->host("/pharmacy/dispense/{$rx->id}/confirm"), [
                'items' => [
                    [
                        'prescription_item_id' => $item->id,
                        'quantity_to_dispense' => 15,
                    ],
                ],
            ]);

        $response->assertSessionHasNoErrors();
        $this->earlyBatch->refresh();
        $this->laterBatch->refresh();

        // 15 deducted from early batch (20 - 15 = 5 remaining)
        $this->assertEquals(5, $this->earlyBatch->quantity_remaining);
        // Later batch untouched
        $this->assertEquals(50, $this->laterBatch->quantity_remaining);
    }

    /**
     * 2. Expired batches are blocked.
     */
    public function test_expired_batches_are_blocked(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-EXP-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'display_name' => $this->clinicMed->display_name,
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_display' => '500 mg',
            'frequency' => 'bd',
            'timing' => 'after_meals',
            'duration_days' => 5,
            'quantity' => 10,
        ]);

        // Attempt manual allocation targeting expired batch
        $response = $this->actingAs($this->pharmacist)
            ->post($this->host("/pharmacy/dispense/{$rx->id}/confirm"), [
                'items' => [
                    [
                        'prescription_item_id' => $item->id,
                        'quantity_to_dispense' => 10,
                        'batch_allocations' => [
                            [
                                'batch_id' => $this->expiredBatch->id,
                                'quantity' => 10,
                            ],
                        ],
                    ],
                ],
            ]);

        $response->assertSessionHasErrors(['dispense']);
        $this->expiredBatch->refresh();
        $this->assertEquals(30, $this->expiredBatch->quantity_remaining); // Unchanged
    }

    /**
     * 3. Partial dispense keeps the remaining items pending.
     */
    public function test_partial_dispense_keeps_the_remaining_items_pending(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-PART-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'display_name' => $this->clinicMed->display_name,
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_display' => '500 mg',
            'frequency' => 'tds',
            'timing' => 'after_meals',
            'duration_days' => 10,
            'quantity' => 30,
        ]);

        // Only dispense 10 out of 30
        $response = $this->actingAs($this->pharmacist)
            ->post($this->host("/pharmacy/dispense/{$rx->id}/confirm"), [
                'items' => [
                    [
                        'prescription_item_id' => $item->id,
                        'quantity_to_dispense' => 10,
                    ],
                ],
            ]);

        $response->assertSessionHasNoErrors();
        $rx->refresh();

        $this->assertEquals(Prescription::STATUS_PARTIALLY_DISPENSED, $rx->status);
        $this->assertNotNull($rx->dispensed_at);
        $item->refresh();
        $this->assertEquals(10, $item->dispensed_quantity);
    }

    /**
     * 4. Out-of-stock "buy outside" doesn't touch stock.
     */
    public function test_out_of_stock_buy_outside_does_not_touch_stock(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-OUT-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'display_name' => $this->clinicMed->display_name,
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_display' => '500 mg',
            'frequency' => 'bd',
            'timing' => 'after_meals',
            'duration_days' => 7,
            'quantity' => 14,
        ]);

        $response = $this->actingAs($this->pharmacist)
            ->post($this->host("/pharmacy/dispense/{$rx->id}/confirm"), [
                'items' => [
                    [
                        'prescription_item_id' => $item->id,
                        'quantity_to_dispense' => 0,
                        'mark_outside' => true,
                    ],
                ],
            ]);

        $response->assertSessionHasNoErrors();

        $this->earlyBatch->refresh();
        $this->laterBatch->refresh();
        $this->assertEquals(20, $this->earlyBatch->quantity_remaining);
        $this->assertEquals(50, $this->laterBatch->quantity_remaining);

        $item->refresh();
        $this->assertEquals(PrescriptionItem::SOURCE_OUTSIDE, $item->source);
        $this->assertEquals(0, $item->dispensed_quantity);
    }

    /**
     * 5. The bill updates correctly.
     */
    public function test_the_bill_updates_correctly(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-BILL-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        $item = PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $this->clinicMed->id,
            'display_name' => $this->clinicMed->display_name,
            'source' => PrescriptionItem::SOURCE_CLINIC,
            'dose_display' => '500 mg',
            'frequency' => 'bd',
            'timing' => 'after_meals',
            'duration_days' => 5,
            'quantity' => 10,
        ]);

        $initialBillTotal = $this->bill->total_amount; // 100000 cents (1000 LKR)

        $response = $this->actingAs($this->pharmacist)
            ->post($this->host("/pharmacy/dispense/{$rx->id}/confirm"), [
                'items' => [
                    [
                        'prescription_item_id' => $item->id,
                        'quantity_to_dispense' => 10,
                    ],
                ],
            ]);

        $response->assertSessionHasNoErrors();
        $this->bill->refresh();

        // 10 units * 2500 cents = 25000 cents
        $expectedTotal = $initialBillTotal + 25000;
        $this->assertEquals($expectedTotal, $this->bill->total_amount);

        $billItem = BillItem::where('bill_id', $this->bill->id)
            ->where('prescription_item_id', $item->id)
            ->first();

        $this->assertNotNull($billItem);
        $this->assertEquals(10, $billItem->quantity);
        $this->assertEquals(2500, $billItem->unit_price_cents);
        $this->assertEquals(25000, $billItem->total_price_cents);
    }

    /**
     * 6. Concurrency lock prevents conflicting preparation.
     */
    public function test_the_concurrency_lock_prevents_duplicate_dispensing(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-LOCK-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        // Pharmacist Alice opens and locks prescription
        $responseLock = $this->actingAs($this->pharmacist)
            ->postJson($this->host("/pharmacy/dispense/{$rx->id}/lock"));

        $responseLock->assertOk();
        $this->assertTrue(Cache::has("dispense_lock:{$this->tenant->id}:{$rx->id}"));

        // Pharmacist Bob tries to lock the same prescription
        $responseLockTwo = $this->actingAs($this->pharmacistTwo)
            ->postJson($this->host("/pharmacy/dispense/{$rx->id}/lock"));

        // 423 Locked
        $responseLockTwo->assertStatus(423);
        $responseLockTwo->assertJsonFragment([
            'message' => 'Being prepared by Pharmacist Alice',
        ]);
    }

    /**
     * 7. The queue search matches phone in any format.
     */
    public function test_the_queue_search_matches_phone_in_any_format(): void
    {
        $rx = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $this->token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-SEARCH-001',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        // Patient phone is 0771234567, normalized +94771234567

        // Search with spaces: "077 123 4567"
        $resp1 = $this->actingAs($this->pharmacist)
            ->get($this->host('/pharmacy/dispense?search=077%20123%204567'));
        $resp1->assertOk();
        $resp1->assertSee('RX-SEARCH-001');

        // Search with international prefix: "+94 77 123 4567"
        $resp2 = $this->actingAs($this->pharmacist)
            ->get($this->host('/pharmacy/dispense?search=%2B94%2077%20123%204567'));
        $resp2->assertOk();
        $resp2->assertSee('RX-SEARCH-001');

        // Search partial digits: "123456"
        $resp3 = $this->actingAs($this->pharmacist)
            ->get($this->host('/pharmacy/dispense?search=123456'));
        $resp3->assertOk();
        $resp3->assertSee('RX-SEARCH-001');
    }

    /**
     * 8. Tenant isolation protects other clinics' prescriptions.
     */
    public function test_tenant_isolation_protects_other_clinics_prescriptions(): void
    {
        $otherTenant = Tenant::factory()->active()->create([
            'id' => 'other-clinic',
            'name' => 'Other Clinic',
            'subdomain' => 'otherclinic',
            'status' => 'active',
            'pharmacy_enabled' => true,
        ]);

        $otherPatient = Patient::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Patient',
            'phone' => '0779998888',
        ]);

        $otherDoctor = Doctor::create([
            'tenant_id' => $otherTenant->id,
            'title' => 'Dr.',
            'name' => 'Other Doctor',
            'specialty' => 'General',
            'slmc_number' => 'SLMC-77777',
            'is_active' => true,
        ]);

        $otherRx = Prescription::create([
            'tenant_id' => $otherTenant->id,
            'doctor_id' => $otherDoctor->id,
            'patient_id' => $otherPatient->id,
            'prescription_number' => 'RX-OTHER-999',
            'status' => Prescription::STATUS_FINALIZED,
            'stock_reduction_mode' => Prescription::MODE_DISPENSE,
            'finalized_at' => Carbon::now(),
        ]);

        // Pharmacist Alice from dispense-clinic attempts to view other tenant's prescription
        $response = $this->actingAs($this->pharmacist)
            ->getJson($this->host("/pharmacy/dispense/{$otherRx->id}"));

        $response->assertNotFound();
    }
}
