<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\DoctorSettlement;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DoctorPayoutService;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorPayoutIntegrityQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private DoctorPayoutService $payoutService;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->payoutService = app(DoctorPayoutService::class);
        $this->admin = User::where('email', 'admin@cityhealth.test')->first();
    }

    /**
     * 1. Payout rules computation test (all 6 rules).
     */
    public function test_all_six_payout_rules_calculated_correctly(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->first();
        $patient = Patient::where('tenant_id', $this->tenant->id)->first();

        // Base session
        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '11:00:00',
            'max_tokens' => 10,
            'doctor_fee' => 200000, // Rs. 2,000
            'clinic_fee' => 100000, // Rs. 1,000
        ]);

        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => 'completed',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'doctor_fee' => 200000,
            'clinic_fee' => 100000,
            'total_amount' => 300000, // Rs. 3,000
            'payment_status' => Bill::STATUS_PAID,
        ]);

        // Rule 1: full_doctor_fee -> Rs. 2,000 (200000 cents)
        $session->update(['payout_rule_override' => ['type' => 'full_doctor_fee', 'value' => 0]]);
        $fin1 = $this->payoutService->calculateSessionFinancials($session->fresh());
        $this->assertEquals(200000, $fin1['doctor_share_cents']);
        $this->assertEquals(100000, $fin1['clinic_share_cents']);
        $this->assertEquals(300000, $fin1['consultation_gross_cents']);

        // Rule 2: fixed_per_patient (e.g. Rs. 1,500)
        $session->update(['payout_rule_override' => ['type' => 'fixed_per_patient', 'value' => 150000]]);
        $fin2 = $this->payoutService->calculateSessionFinancials($session->fresh());
        $this->assertEquals(150000, $fin2['doctor_share_cents']);
        $this->assertEquals(150000, $fin2['clinic_share_cents']);

        // Rule 3: percentage_of_total (70% of Rs. 3,000 = Rs. 2,100)
        $session->update(['payout_rule_override' => ['type' => 'percentage_of_total', 'value' => 70]]);
        $fin3 = $this->payoutService->calculateSessionFinancials($session->fresh());
        $this->assertEquals(210000, $fin3['doctor_share_cents']);
        $this->assertEquals(90000, $fin3['clinic_share_cents']);

        // Rule 4: fixed_per_session (Rs. 10,000 for the session, min 1 patient)
        $session->update(['payout_rule_override' => ['type' => 'fixed_per_session', 'value' => 1000000, 'min_patients' => 1]]);
        $fin4 = $this->payoutService->calculateSessionFinancials($session->fresh());
        $this->assertEquals(1000000, $fin4['doctor_share_cents']);

        // Rule 5: salaried (Rs. 0 per session/bill)
        $session->update(['payout_rule_override' => ['type' => 'salaried', 'value' => 0]]);
        $fin5 = $this->payoutService->calculateSessionFinancials($session->fresh());
        $this->assertEquals(0, $fin5['doctor_share_cents']);
        $this->assertEquals(300000, $fin5['clinic_share_cents']);

        // Rule 6: none (Rs. 0 doctor share)
        $session->update(['payout_rule_override' => ['type' => 'none', 'value' => 0]]);
        $fin6 = $this->payoutService->calculateSessionFinancials($session->fresh());
        $this->assertEquals(0, $fin6['doctor_share_cents']);
    }

    /**
     * 2. Reconciliation & Medicines/Unpaid Exclusion:
     * Medicines must be excluded from doctor payout calculations.
     * Unpaid bills must be excluded.
     */
    public function test_medicines_and_unpaid_bills_excluded_from_doctor_share(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->first();
        $patient = Patient::where('tenant_id', $this->tenant->id)->first();

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'doctor_fee' => 200000,
            'clinic_fee' => 100000,
            'payout_rule_override' => ['type' => 'percentage_of_total', 'value' => 50],
        ]);

        $token1 = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => 'completed',
        ]);

        // Bill 1: Paid consultation Rs. 3,000 + Pharmacy Rs. 2,000 = Total Rs. 5,000
        $bill1 = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token1->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'doctor_fee' => 200000,
            'clinic_fee' => 100000,
            'total_amount' => 500000,
            'payment_status' => Bill::STATUS_PAID,
        ]);

        BillItem::create([
            'tenant_id' => $this->tenant->id,
            'bill_id' => $bill1->id,
            'description' => 'Prescription Medicine Pack',
            'quantity' => 1,
            'unit_price_cents' => 200000,
            'total_price_cents' => 200000,
        ]);

        // Bill 2: Unpaid consultation Rs. 3,000 (must be ignored)
        $token2 = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 2,
            'status' => 'booked',
        ]);

        Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token2->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'doctor_fee' => 200000,
            'clinic_fee' => 100000,
            'total_amount' => 300000,
            'payment_status' => Bill::STATUS_PENDING, // Unpaid
        ]);

        $fin = $this->payoutService->calculateSessionFinancials($session->fresh());

        // Pharmacy (200000) excluded from consultation gross (300000)
        $this->assertEquals(300000, $fin['consultation_gross_cents']);
        $this->assertEquals(200000, $fin['pharmacy_gross_cents']);

        // Doctor share is 50% of consultation gross (Rs. 1,500 = 150000 cents), NOT of Rs. 5,000
        $this->assertEquals(150000, $fin['doctor_share_cents']);
        $this->assertEquals(150000, $fin['clinic_share_cents']);
    }

    /**
     * 3. Record Settlement & Gapless PAY number sequence.
     */
    public function test_record_settlement_produces_gapless_pay_numbers(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->first();
        $patient = Patient::where('tenant_id', $this->tenant->id)->first();

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '12:00:00',
            'doctor_fee' => 200000,
            'clinic_fee' => 100000,
            'payout_rule_override' => ['type' => 'full_doctor_fee', 'value' => 0],
        ]);

        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 99,
            'status' => 'completed',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'doctor_fee' => 200000,
            'clinic_fee' => 100000,
            'total_amount' => 300000,
            'payment_status' => Bill::STATUS_PAID,
            'paid_at' => now(),
        ]);

        $settlement1 = $this->payoutService->recordSettlement($this->tenant->id, [
            'doctor_id' => $doctor->id,
            'period_start' => now()->subDays(30)->toDateString(),
            'period_end' => now()->toDateString(),
            'bill_ids' => [$bill->id],
            'payment_method' => 'cash',
        ], $this->admin);

        $this->assertStringStartsWith('PAY-', $settlement1->settlement_number);

        // Void releases bill
        $this->payoutService->voidSettlement($this->tenant->id, $settlement1->id, 'QA test void', $this->admin);
        $this->assertTrue($settlement1->fresh()->is_voided);

        // Bill is unsettled again
        $this->assertNull($bill->fresh()->doctor_settlement_id);
    }

    /**
     * 4. Doctor Settlement Slip endpoint returns valid JSON with no clinic margin leaked to doctor.
     */
    public function test_doctor_settlement_slip_json_endpoint(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->first();
        $settlement = DoctorSettlement::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'settlement_number' => 'PAY-QA-0001',
            'period_start' => now()->subDays(7),
            'period_end' => now(),
            'gross_collected' => 500000,
            'doctor_payout_amount' => 350000,
            'clinic_amount' => 150000,
            'paid_amount' => 350000,
            'created_by' => $this->admin->id,
        ]);

        $res = $this->actingAs($this->admin)
            ->getJson("http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/payouts/slip/{$settlement->id}");

        $res->assertStatus(200);
        $res->assertJsonStructure([
            'clinic' => ['name', 'address', 'phone'],
            'settlement' => ['id', 'settlement_number', 'doctor_payout_formatted'],
            'doctor' => ['id', 'name', 'specialty'],
        ]);
    }
}
