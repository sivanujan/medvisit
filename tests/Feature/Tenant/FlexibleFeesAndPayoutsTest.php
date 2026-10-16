<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\FeeComponent;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VisitType;
use App\Services\FeeResolutionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FlexibleFeesAndPayoutsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Tenant $otherTenant;

    protected User $adminUser;

    protected User $receptionistUser;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected DoctorSession $session;

    protected string $baseDomain;

    protected FeeResolutionService $feeService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->feeService = app(FeeResolutionService::class);

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Centre',
            'subdomain' => 'suwasetha',
            'fee_settings' => [
                'pricing_mode' => 'split',
                'default_doctor_fee' => 200000,
                'default_clinic_fee' => 80000,
                'default_total_fee' => 280000,
                'online_booking_fee' => 25000,
                'rounding_mode' => 'none',
                'default_payout_rule' => [
                    'type' => 'full_doctor_fee',
                    'value' => 0,
                ],
                'doctor_paid_for_no_shows' => false,
                'doctor_paid_for_cancelled' => false,
                'receptionist_can_discount' => true,
                'receptionist_max_discount_type' => 'percent',
                'receptionist_max_discount_value' => 20,
            ],
        ]);

        $this->otherTenant = Tenant::factory()->active()->create([
            'id' => 'otherclinic',
            'name' => 'Other Clinic',
            'subdomain' => 'otherclinic',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasetha.lk',
        ]);

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'reception@suwasetha.lk',
        ]);

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@suwasetha.lk',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'title' => 'Dr.',
            'name' => 'Kusal Perera',
            'specialty' => 'Cardiologist',
            'slmc_number' => 'SLMC-98765',
            'use_clinic_default_fees' => true,
            'pricing_mode' => 'split',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $this->session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'fee_override_type' => 'inherit',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Consultation 1',
        ]);

        // Default visit types for tenant
        VisitType::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Standard Consultation',
            'code' => 'standard',
            'pricing_type' => 'normal',
            'percentage_value' => 100,
            'fixed_fee_cents' => 0,
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        VisitType::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Review / Follow-up',
            'code' => 'review',
            'pricing_type' => 'percentage',
            'percentage_value' => 50,
            'fixed_fee_cents' => 0,
            'is_default' => false,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        VisitType::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Report Checking',
            'code' => 'report',
            'pricing_type' => 'fixed',
            'percentage_value' => 0,
            'fixed_fee_cents' => 50000, // Rs. 500
            'is_default' => false,
            'is_active' => true,
            'sort_order' => 3,
        ]);
    }

    public function test_fee_hierarchy_resolves_clinic_default_when_no_overrides(): void
    {
        $resolved = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            channel: 'walk_in'
        );

        $this->assertEquals(280000, $resolved['patient_total']); // Rs. 2,800
        $this->assertEquals(200000, $resolved['doctor_fee_portion']); // Rs. 2,000
        $this->assertEquals(80000, $resolved['clinic_portion']); // Rs. 800
        $this->assertEquals('from clinic', $resolved['source_levels']['doctor_fee']);
    }

    public function test_fee_hierarchy_doctor_override_takes_precedence_over_clinic_default(): void
    {
        $this->doctor->update([
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 300000, // Rs. 3,000
            'custom_clinic_fee' => 100000, // Rs. 1,000
        ]);

        $resolved = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session,
            channel: 'walk_in'
        );

        $this->assertEquals(400000, $resolved['patient_total']); // Rs. 4,000
        $this->assertEquals(300000, $resolved['doctor_fee_portion']);
        $this->assertEquals(100000, $resolved['clinic_portion']);
        $this->assertEquals('from doctor', $resolved['source_levels']['doctor_fee']);
    }

    public function test_fee_hierarchy_session_override_takes_precedence_over_doctor_and_clinic(): void
    {
        $this->doctor->update([
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 300000,
            'custom_clinic_fee' => 100000,
        ]);

        $this->session->update([
            'fee_override_type' => 'custom',
            'custom_doctor_fee' => 350000, // Rs. 3,500 for special weekend clinic
            'custom_clinic_fee' => 120000, // Rs. 1,200
        ]);

        $resolved = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session->fresh(),
            channel: 'walk_in'
        );

        $this->assertEquals(470000, $resolved['patient_total']); // Rs. 4,700
        $this->assertEquals(350000, $resolved['doctor_fee_portion']);
        $this->assertEquals(120000, $resolved['clinic_portion']);
        $this->assertEquals('from session', $resolved['source_levels']['doctor_fee']);
    }

    public function test_visit_type_percentage_and_fixed_modifiers(): void
    {
        $reviewType = VisitType::where('tenant_id', $this->tenant->id)->where('code', 'review')->first();
        $reportType = VisitType::where('tenant_id', $this->tenant->id)->where('code', 'report')->first();

        // 50% Review
        $resolvedReview = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            visitType: $reviewType,
            channel: 'walk_in'
        );

        $this->assertEquals(140000, $resolvedReview['patient_total']); // 50% of 280,000 = Rs. 1,400
        $this->assertEquals(100000, $resolvedReview['doctor_fee_portion']);
        $this->assertEquals(40000, $resolvedReview['clinic_portion']);

        // Fixed Rs. 500 Report Checking
        $resolvedReport = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            visitType: $reportType,
            channel: 'walk_in'
        );

        $this->assertEquals(50000, $resolvedReport['patient_total']); // Rs. 500
    }

    public function test_payout_rules_full_doctor_fee_fixed_percentage_session_and_salaried(): void
    {
        // 1. Full doctor fee (pass-through)
        $payoutFull = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000
        )['doctor_payout_amount'];
        $this->assertEquals(200000, $payoutFull);

        // 2. Fixed amount per patient (e.g. Rs. 1,800)
        $this->doctor->update([
            'payout_rule' => [
                'type' => 'fixed_per_patient',
                'value' => 1800,
            ],
        ]);
        $payoutFixed = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000
        )['doctor_payout_amount'];
        $this->assertEquals(180000, $payoutFixed);

        // 3. Percentage of total (e.g. 70% of patient total)
        $this->doctor->update([
            'payout_rule' => [
                'type' => 'percentage_of_total',
                'value' => 70,
            ],
        ]);
        $payoutPct = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000
        )['doctor_payout_amount'];
        $this->assertEquals(196000, $payoutPct); // 70% of 280,000 = 196,000

        // 4. Salaried (doctor receives 0 per patient)
        $this->doctor->update([
            'payout_rule' => [
                'type' => 'salaried',
                'value' => 0,
            ],
        ]);
        $payoutSalaried = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000
        )['doctor_payout_amount'];
        $this->assertEquals(0, $payoutSalaried);
    }

    public function test_fixed_per_session_payout_with_minimum_patient_threshold(): void
    {
        $this->doctor->update([
            'payout_rule' => [
                'type' => 'fixed_per_session',
                'value' => 25000, // Rs. 25,000 for the session
                'min_patients' => 5,
            ],
        ]);

        // Below threshold (4 patients seen) => 0 session payout
        $payoutBelow = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000,
            patientsCount: 4
        )['doctor_payout_amount'];
        $this->assertEquals(0, $payoutBelow);

        // At or above threshold (5 patients seen) => Rs. 25,000 (2,500,000 cents)
        $payoutAbove = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor->fresh(),
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000,
            patientsCount: 5
        )['doctor_payout_amount'];
        $this->assertEquals(2500000, $payoutAbove);
    }

    public function test_no_show_and_cancelled_tokens_handling_policy(): void
    {
        // Default policy: doctor_paid_for_no_shows = false
        $payoutNoShowExcluded = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000,
            tokenStatus: 'no_show'
        )['doctor_payout_amount'];
        $this->assertEquals(0, $payoutNoShowExcluded);

        // Turn on doctor_paid_for_no_shows = true
        $feeSettings = $this->tenant->fee_settings;
        $feeSettings['doctor_paid_for_no_shows'] = true;
        $this->tenant->update(['fee_settings' => $feeSettings]);

        $payoutNoShowIncluded = $this->feeService->calculateDoctorPayout(
            tenant: $this->tenant->fresh(),
            doctor: $this->doctor,
            session: $this->session,
            patientTotalCents: 280000,
            doctorFeePortionCents: 200000,
            tokenStatus: 'no_show'
        )['doctor_payout_amount'];
        $this->assertEquals(200000, $payoutNoShowIncluded);
    }

    public function test_snapshot_immutability_past_tokens_and_bills_never_change(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sunil Shantha',
            'phone' => '+94771122334',
        ]);

        // Issue token
        $response = $this->actingAs($this->receptionistUser)
            ->post("http://suwasetha.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->session->id,
                'patient_id' => $patient->id,
                'visit_type_id' => VisitType::where('tenant_id', $this->tenant->id)->where('code', 'standard')->value('id'),
            ]);

        $response->assertSessionHasNoErrors();

        $token = BookingToken::latest('id')->first();
        $this->assertNotNull($token->fee_snapshot);
        $originalPatientTotal = $token->fee_snapshot['patient_total'];
        $this->assertEquals(280000, $originalPatientTotal);

        // Clinic subsequently increases default fee and doctor fee significantly
        $feeSettings = $this->tenant->fee_settings;
        $feeSettings['default_doctor_fee'] = 500000;
        $feeSettings['default_clinic_fee'] = 200000;
        $this->tenant->update(['fee_settings' => $feeSettings]);
        $this->doctor->update(['doctor_fee' => 500000, 'clinic_fee' => 200000]);

        // Re-fetch token from database
        $tokenAfter = BookingToken::find($token->id);
        $this->assertEquals(280000, $tokenAfter->fee_snapshot['patient_total'], 'Token snapshot must remain immutable');
        $this->assertEquals(200000, $tokenAfter->fee_snapshot['doctor_fee_portion'], 'Doctor fee portion snapshot must remain immutable');
    }

    public function test_receptionist_discount_limits_enforced_and_admin_unlimited(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Anura Kumara',
            'phone' => '+94775566778',
        ]);

        // Receptionist tries to give 30% discount (limit is 20%)
        $responseExceeded = $this->actingAs($this->receptionistUser)
            ->post("http://suwasetha.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->session->id,
                'patient_id' => $patient->id,
                'discount_type' => 'percent',
                'discount_value' => 30,
                'discount_reason' => 'Friend request',
            ]);

        $responseExceeded->assertSessionHasErrors(['discount_value']);

        // Receptionist gives 15% discount (within 20% limit)
        $responseAllowed = $this->actingAs($this->receptionistUser)
            ->post("http://suwasetha.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->session->id,
                'patient_id' => $patient->id,
                'discount_type' => 'percent',
                'discount_value' => 15,
                'discount_reason' => 'Senior citizen discount',
            ]);

        $responseAllowed->assertSessionHasNoErrors();
        $token = BookingToken::latest('id')->first();
        $this->assertEquals(15, $token->fee_snapshot['discount']['value']);
        $this->assertEquals(42000, $token->fee_snapshot['discount']['amount']); // 15% of 280,000 = 42,000 cents
        $this->assertEquals(238000, $token->fee_snapshot['patient_total']); // 280,000 - 42,000 = 238,000 cents

        // Clinic admin can give 50% discount without restriction
        $responseAdmin = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->session->id,
                'patient_id' => $patient->id,
                'discount_type' => 'percent',
                'discount_value' => 50,
                'discount_reason' => 'Special director approval',
            ]);

        $responseAdmin->assertSessionHasNoErrors();
    }

    public function test_fee_components_percentage_chain_and_third_party_recipients(): void
    {
        // Add a Lab Charge component routed to a third party (Asiri Laboratories)
        $labComponent = FeeComponent::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Blood Sugar Screening',
            'code' => 'lab_sugar',
            'amount_type' => 'fixed',
            'amount_value' => 75000, // Rs. 750
            'recipient_type' => 'third_party',
            'recipient_name' => 'Asiri Laboratories',
            'applies_to' => ['walk_in'],
            'is_mandatory' => false,
            'is_active' => true,
            'sort_order' => 5,
        ]);

        $resolved = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            selectedOptionalComponentIds: [$labComponent->id],
            channel: 'walk_in'
        );

        $this->assertEquals(355000, $resolved['patient_total']); // Rs. 2,800 + Rs. 750 = Rs. 3,550
        $this->assertEquals(75000, $resolved['third_party_totals']['Asiri Laboratories']);
    }

    public function test_online_channel_applies_online_booking_fee(): void
    {
        // Walk-in channel => no online booking fee
        $walkInResolved = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            channel: 'walk_in'
        );
        $this->assertEquals(0, $walkInResolved['online_booking_fee']);
        $this->assertEquals(280000, $walkInResolved['patient_total']);

        // Online channel => adds online booking fee (Rs. 250 / 25,000 cents)
        $onlineResolved = $this->feeService->resolve(
            tenant: $this->tenant,
            doctor: $this->doctor,
            session: $this->session,
            channel: 'online'
        );
        $this->assertEquals(25000, $onlineResolved['online_booking_fee']);
        $this->assertEquals(305000, $onlineResolved['patient_total']); // Rs. 2,800 + Rs. 250 = Rs. 3,050
    }

    public function test_doctor_settlement_disbursement_and_role_isolation(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gamini Fonseka',
            'phone' => '+94770011223',
        ]);

        // Issue token and create paid bill
        $this->actingAs($this->receptionistUser)
            ->post("http://suwasetha.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->session->id,
                'patient_id' => $patient->id,
            ]);

        $token = BookingToken::latest('id')->first();
        $token->update(['status' => 'completed']);

        $bill = Bill::where('booking_token_id', $token->id)->first();
        $bill->update(['payment_status' => 'paid']);

        // Clinic Admin can record payout disbursement
        $responseDisburse = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/billing/payouts/disburse", [
                'doctor_id' => $this->doctor->id,
                'amount_lkr' => 2000, // Disbursing Rs. 2,000
                'payment_method' => 'bank_transfer',
                'reference_number' => 'SL-TXN-998811',
                'disbursed_at' => Carbon::today('Asia/Colombo')->toDateString(),
            ]);

        $responseDisburse->assertSessionHasNoErrors();
        $this->assertDatabaseHas('doctor_settlements', [
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'paid_amount' => 200000,
            'payment_method' => 'bank_transfer',
        ]);

        // Doctor role can access only their own settlements
        $responseDoctor = $this->actingAs($this->doctorUser)
            ->get("http://suwasetha.{$this->baseDomain}/billing/payouts");
        $responseDoctor->assertOk();

        // Create a second doctor in this tenant
        $secondDocUser = User::factory()->doctor()->create(['tenant_id' => $this->tenant->id]);
        $secondDoc = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $secondDocUser->id,
            'title' => 'Dr.',
            'name' => 'Wimal Weerawansa',
            'specialty' => 'Neurologist',
            'slmc_number' => 'SLMC-12345',
            'doctor_fee' => 300000,
            'clinic_fee' => 100000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        // If the first doctor attempts to query second doctor's payouts, it is locked back to first doctor
        $responseAttempt = $this->actingAs($this->doctorUser)
            ->get("http://suwasetha.{$this->baseDomain}/billing/payouts?doctor_id={$secondDoc->id}");

        $responseAttempt->assertOk();
        $this->assertEquals(
            $this->doctor->id,
            $responseAttempt->original->getData()['page']['props']['selectedDoctorId'],
            'Doctor role must be strictly scoped to their own doctor record'
        );
    }

    public function test_tenant_isolation_prevents_cross_tenant_access_to_fees_and_payouts(): void
    {
        $otherAdmin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->otherTenant->id,
            'email' => 'admin@otherclinic.lk',
        ]);

        // Other tenant admin cannot access suwasetha settings
        $response = $this->actingAs($otherAdmin)
            ->get("http://suwasetha.{$this->baseDomain}/settings/fees");

        $response->assertForbidden();
    }

    public function test_can_update_fee_component(): void
    {
        $component = FeeComponent::where('tenant_id', $this->tenant->id)->first();
        if (! $component) {
            $component = FeeComponent::create([
                'tenant_id' => $this->tenant->id,
                'name' => 'Doctor fee',
                'code' => 'doctor_fee',
                'amount_type' => 'fixed',
                'amount_value' => 200000,
                'recipient' => 'doctor',
                'applies_to' => ['walk_in', 'phone', 'online'],
                'is_mandatory' => true,
                'is_separate_line' => true,
                'is_active' => true,
                'sort_order' => 1,
            ]);
        }

        $payload = [
            'name' => 'Doctor fee',
            'amount_type' => 'fixed',
            'target_component_id' => '',
            'amount_lkr' => 3000,
            'amount_percent' => 0,
            'recipient' => 'doctor',
            'recipient_name' => '',
            'applies_to' => ['walk_in', 'phone', 'online'],
            'is_mandatory' => true,
            'is_separate_line' => true,
            'is_active' => true,
            'sort_order' => 1,
        ];

        $response = $this->actingAs($this->adminUser)
            ->put("http://suwasetha.{$this->baseDomain}/settings/fees/components/{$component->id}", $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $component->refresh();
        $this->assertEquals(300000, $component->amount_value);
    }
}
