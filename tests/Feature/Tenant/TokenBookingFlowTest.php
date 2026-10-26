<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class TokenBookingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'sivacli',
            'name' => 'Siva Clinic',
            'subdomain' => 'sivacli',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin Siva',
            'email' => 'admin@sivacli.lk',
        ]);
    }

    /**
     * 1. Test session generation immediately on template save.
     */
    public function test_session_generation_on_template_save(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'K. Sivalingam',
            'specialty' => 'Cardiologist',
            'slmc_number' => 'SLMC-99881',
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $today = Carbon::today('Asia/Colombo');
        $targetDayOfWeek = $today->dayOfWeek; // template for today's day of week

        $response = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/doctors/templates", [
                'doctor_id' => $doctor->id,
                'title' => 'Cardiology Morning Clinic',
                'day_of_week' => $targetDayOfWeek,
                'start_time' => '09:00',
                'end_time' => '12:00',
                'max_patients' => 20,
                'room_number' => 'Consulting Room 1',
                'mode' => 'token',
                'fee_override_type' => 'inherit',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify template created
        $template = SessionTemplate::where('tenant_id', $this->tenant->id)
            ->where('doctor_id', $doctor->id)
            ->firstOrFail();

        $this->assertEquals('Cardiology Morning Clinic', $template->title);

        // Verify sessions were generated immediately for the next 30 days without any scheduler
        $sessionsCount = DoctorSession::where('tenant_id', $this->tenant->id)
            ->where('session_template_id', $template->id)
            ->count();

        $this->assertGreaterThanOrEqual(4, $sessionsCount, 'Expected at least 4 weekly sessions over 30 days.');
    }

    /**
     * 2. Test timezone date filtering (Asia/Colombo) and 14-day date strip.
     */
    public function test_timezone_date_filtering_and_date_strip(): void
    {
        $todayColombo = Carbon::today('Asia/Colombo');
        $todayStr = $todayColombo->toDateString();
        $tomorrowStr = (clone $todayColombo)->addDay()->toDateString();

        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Priya Ramanathan',
            'specialty' => 'Paediatrician',
            'slmc_number' => 'SLMC-77112',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 12,
            'is_active' => true,
        ]);

        // Create 1 session today and 2 sessions tomorrow
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $todayStr,
            'start_time' => '10:00',
            'end_time' => '13:00',
            'max_tokens' => 15,
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Room 1',
        ]);

        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $tomorrowStr,
            'start_time' => '14:00',
            'end_time' => '17:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Room 2',
        ]);

        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $tomorrowStr,
            'start_time' => '18:00',
            'end_time' => '21:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Room 2',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("http://sivacli.{$this->baseDomain}/bookings?date={$tomorrowStr}");

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Bookings/Index')
            ->has('dateStrip', 14)
            ->where('dateStrip.0.date', $todayStr)
            ->where('dateStrip.0.label', 'Today')
            ->where('dateStrip.0.session_count', 1)
            ->where('dateStrip.1.date', $tomorrowStr)
            ->where('dateStrip.1.label', 'Tomorrow')
            ->where('dateStrip.1.session_count', 2)
            ->where('selectedDate', $tomorrowStr)
        );
    }

    /**
     * 3. Test fee resolution shown in the response.
     */
    public function test_fee_resolution_shown_in_the_response(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Anura Wickramasinghe',
            'specialty' => 'General Physician',
            'slmc_number' => 'SLMC-12345',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 250000, // Rs. 2,500
            'custom_clinic_fee' => 80000,  // Rs. 800
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $todayStr = Carbon::today('Asia/Colombo')->toDateString();

        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $todayStr,
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'room_number' => 'Suite A',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("http://sivacli.{$this->baseDomain}/bookings");

        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Bookings/Index')
            ->has('sessions', 1)
            ->where('sessions.0.doctor_fee_lkr', 2500)
            ->where('sessions.0.clinic_fee_lkr', 800)
            ->where('sessions.0.total_fee_lkr', 3300)
            ->where('sessions.0.total_fee_formatted', 'Rs. 3,300.00')
            ->where('sessions.0.is_selectable', true)
        );
    }

    /**
     * 4. Test default discount = none and proper bill calculation.
     */
    public function test_default_discount_equals_none_and_full_fee_charged(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'K. Sivalingam',
            'specialty' => 'Cardiologist',
            'slmc_number' => 'SLMC-55443',
            'doctor_fee' => 200000, // Rs. 2,000
            'clinic_fee' => 80000,  // Rs. 800
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Room 1',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Jayawardena',
            'phone' => '+94771234567',
        ]);

        // Issue token without discount (default: discount_type = none)
        $response = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
                'discount_type' => 'none',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('issuedToken');

        $token = BookingToken::where('doctor_session_id', $session->id)->firstOrFail();
        $this->assertEquals(1, $token->token_number);

        $bill = Bill::where('booking_token_id', $token->id)->firstOrFail();
        $this->assertEquals(0, $bill->discount);
        $this->assertNull($bill->discount_reason);
        $this->assertEquals(280000, $bill->total_amount); // Full Rs. 2,800
    }

    /**
     * 5. Test concurrent token issuing never duplicates token numbers.
     */
    public function test_concurrent_token_issuing_never_duplicates(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Concurrent Doctor',
            'specialty' => 'Physician',
            'slmc_number' => 'SLMC-99999',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '16:00',
            'end_time' => '20:00',
            'max_tokens' => 50,
            'status' => 'scheduled',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'room_number' => 'Room 1',
        ]);

        // Issue 10 tokens in simulated atomic transactions
        $issuedTokens = [];
        for ($i = 1; $i <= 10; $i++) {
            $patient = Patient::create([
                'tenant_id' => $this->tenant->id,
                'name' => "Patient {$i}",
                'phone' => "+9477000000{$i}",
            ]);

            $response = $this->actingAs($this->adminUser)
                ->post("http://sivacli.{$this->baseDomain}/bookings", [
                    'doctor_session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'discount_type' => 'none',
                ]);

            $response->assertRedirect();
            $token = BookingToken::where('doctor_session_id', $session->id)
                ->where('patient_id', $patient->id)
                ->firstOrFail();

            $issuedTokens[] = $token->token_number;
        }

        // Assert strictly monotonic consecutive sequence 1 through 10
        $this->assertEquals(range(1, 10), $issuedTokens);
        $this->assertCount(10, array_unique($issuedTokens));
    }

    /**
     * 6. End-to-end admin workflow:
     * Log in as clinic admin, create doctor with weekly template,
     * open Issue Token, pick tomorrow, select session, select patient,
     * see non-zero total and token number, issue token, see in today's tokens.
     */
    public function test_end_to_end_admin_creates_doctor_template_and_issues_token(): void
    {
        $tomorrow = Carbon::today('Asia/Colombo')->addDay();
        $tomorrowDayOfWeek = $tomorrow->dayOfWeek;
        $tomorrowDateStr = $tomorrow->toDateString();

        // Step 1: Create Doctor
        $docRes = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/doctors", [
                'title' => 'Dr.',
                'name' => 'Wimal Jayasuriya',
                'specialty' => 'ENT Surgeon',
                'slmc_number' => 'SLMC-33120',
                'doctor_fee_lkr' => 2800,
                'clinic_fee_lkr' => 700,
                'avg_consultation_minutes' => 15,
                'is_active' => true,
            ]);
        $docRes->assertRedirect();

        $doctor = Doctor::where('tenant_id', $this->tenant->id)
            ->where('slmc_number', '33120')
            ->firstOrFail();

        // Step 2: Create Template for Tomorrow's day of week
        $tplRes = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/doctors/templates", [
                'doctor_id' => $doctor->id,
                'title' => 'Weekly ENT Channeling',
                'day_of_week' => $tomorrowDayOfWeek,
                'start_time' => '17:00',
                'end_time' => '20:00',
                'max_patients' => 25,
                'room_number' => 'Suite 5',
                'fee_override_type' => 'inherit',
            ]);
        $tplRes->assertRedirect();

        // Verify session generated for tomorrow
        $session = DoctorSession::where('tenant_id', $this->tenant->id)
            ->where('doctor_id', $doctor->id)
            ->where('session_date', $tomorrowDateStr)
            ->firstOrFail();

        $this->assertEquals(280000, $session->doctor_fee);
        $this->assertEquals(70000, $session->clinic_fee);

        // Step 3: Open Issue Token for tomorrow
        $bookPageRes = $this->actingAs($this->adminUser)
            ->get("http://sivacli.{$this->baseDomain}/bookings?date={$tomorrowDateStr}");

        $bookPageRes->assertOk();
        $bookPageRes->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Bookings/Index')
            ->where('selectedDate', $tomorrowDateStr)
            ->has('sessions', fn (AssertableInertia $sessions) => $sessions
                ->where('0.doctor_name', 'Dr. Wimal Jayasuriya')
                ->where('0.total_fee_lkr', 3500)
                ->where('0.next_token_number', 1)
                ->etc()
            )
        );

        // Step 4: Issue Token for patient
        $issueRes = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'new_patient_name' => 'Nimal Silva',
                'new_patient_phone' => '+94771122334',
                'discount_type' => 'none',
                'payment_collected' => true,
                'payment_method' => 'cash',
            ]);

        $issueRes->assertRedirect();
        $issueRes->assertSessionHas('issuedToken');

        // Step 5: Verify Token and Bill in database
        $token = BookingToken::where('doctor_session_id', $session->id)->firstOrFail();
        $this->assertEquals(1, $token->token_number);

        $bill = Bill::where('booking_token_id', $token->id)->firstOrFail();
        $this->assertEquals(350000, $bill->total_amount); // Rs. 3,500
        $this->assertEquals(Bill::STATUS_PAID, $bill->payment_status);

        // Step 6: Verify token appears in Today's tokens on Bookings page
        $recentRes = $this->actingAs($this->adminUser)
            ->get("http://sivacli.{$this->baseDomain}/bookings");

        $recentRes->assertOk();
        $recentRes->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Bookings/Index')
            ->has('recentBookings', 1)
            ->where('recentBookings.0.token_number', 1)
            ->where('recentBookings.0.patient_name', 'Nimal Silva')
            ->where('recentBookings.0.total_fee_formatted', 'Rs. 3,500.00')
            ->where('recentBookings.0.payment_status', 'paid')
        );
    }

    /**
     * 7. Test patient search by numeric ID, "#14", "PAT-00014".
     */
    public function test_search_patients_by_numeric_id_and_formatted_id(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Gamini Dissanayake',
            'phone' => '+94712345678',
            'nic' => '851234567V',
            'gender' => 'male',
        ]);

        $id = $patient->id;

        // Search with plain number
        $res1 = $this->actingAs($this->adminUser)
            ->getJson("http://sivacli.{$this->baseDomain}/api/patients/search?q={$id}");
        $res1->assertOk();
        $this->assertCount(1, $res1->json());
        $this->assertEquals($patient->name, $res1->json('0.name'));

        // Search with #ID
        $res2 = $this->actingAs($this->adminUser)
            ->getJson("http://sivacli.{$this->baseDomain}/api/patients/search?q=%23{$id}");
        $res2->assertOk();
        $this->assertCount(1, $res2->json());

        // Search with formatted PAT-00014
        $formatted = 'PAT-'.str_pad((string) $id, 5, '0', STR_PAD_LEFT);
        $res3 = $this->actingAs($this->adminUser)
            ->getJson("http://sivacli.{$this->baseDomain}/api/patients/search?q={$formatted}");
        $res3->assertOk();
        $this->assertCount(1, $res3->json());
    }

    /**
     * 8. Test available-sessions API generates on-demand for 14 days and excludes cancelled/moved.
     */
    public function test_available_sessions_generates_on_demand_and_excludes_cancelled_and_moved(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Senaka Bandara',
            'specialty' => 'Pediatrician',
            'slmc_number' => 'SLMC-77661',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $today = Carbon::today('Asia/Colombo');
        $targetDayOfWeek = $today->dayOfWeek;

        // Recurring template for today's day of week
        SessionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'title' => 'Pediatric Morning Clinic',
            'day_of_week' => $targetDayOfWeek,
            'start_time' => '08:30',
            'end_time' => '11:30',
            'max_patients' => 10,
            'mode' => 'token',
            'is_active' => true,
        ]);

        // Hit available sessions endpoint
        $res = $this->actingAs($this->adminUser)
            ->getJson("http://sivacli.{$this->baseDomain}/doctors/{$doctor->id}/available-sessions?days=14");

        $res->assertOk();
        $sessions = $res->json('sessions');
        $this->assertNotEmpty($sessions, 'Sessions should be generated on-demand for 14 days.');

        $targetSessionId = $sessions[0]['id'];
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Baby Kaveen',
            'phone' => '+94770001111',
            'gender' => 'male',
        ]);

        // Issue 1 active token, 1 cancelled token, 1 moved token
        BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $targetSessionId,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_BOOKED,
        ]);

        BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $targetSessionId,
            'patient_id' => $patient->id,
            'token_number' => 2,
            'status' => BookingToken::STATUS_CANCELLED,
        ]);

        BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $targetSessionId,
            'patient_id' => $patient->id,
            'token_number' => 3,
            'status' => BookingToken::STATUS_MOVED,
        ]);

        // Hit endpoint again: booked_tokens_count must be 1, not 3!
        $res2 = $this->actingAs($this->adminUser)
            ->getJson("http://sivacli.{$this->baseDomain}/doctors/{$doctor->id}/available-sessions?days=14");

        $res2->assertOk();
        $firstSession = collect($res2->json('sessions'))->firstWhere('id', $targetSessionId);
        $this->assertEquals(1, $firstSession['booked_tokens_count']);
        $this->assertEquals(9, $firstSession['available_tokens_count']);
        $this->assertEquals(2, $firstSession['next_token_number']);
    }

    /**
     * 9. Test move token when bill is paid is immutable and records adjustment.
     */
    public function test_move_token_when_bill_is_paid_is_immutable_and_records_differential(): void
    {
        $doctorA = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Doctor Alpha',
            'specialty' => 'General Practice',
            'slmc_number' => 'SLMC-11111',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 150000,
            'custom_clinic_fee' => 50000,
            'doctor_fee' => 150000, // Rs. 1,500
            'clinic_fee' => 50000,  // Rs. 500 => Total Rs. 2,000
            'is_active' => true,
        ]);

        $doctorB = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Doctor Beta',
            'specialty' => 'Neurologist',
            'slmc_number' => 'SLMC-22222',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 300000,
            'custom_clinic_fee' => 50000,
            'doctor_fee' => 300000, // Rs. 3,000
            'clinic_fee' => 50000,  // Rs. 500 => Total Rs. 3,500
            'is_active' => true,
        ]);

        $sessionA = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctorA->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '09:00',
            'end_time' => '12:00',
            'max_tokens' => 20,
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'status' => 'scheduled',
        ]);

        $sessionB = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctorB->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '14:00',
            'end_time' => '17:00',
            'max_tokens' => 20,
            'doctor_fee' => 300000,
            'clinic_fee' => 50000,
            'status' => 'scheduled',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Perera',
            'phone' => '+94771234567',
        ]);

        // Issue token with Doctor A and pay the bill
        $issueRes = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $sessionA->id,
                'patient_id' => $patient->id,
                'payment_collected' => true,
                'payment_method' => 'cash',
            ]);
        $issueRes->assertRedirect();

        $tokenA = BookingToken::where('doctor_session_id', $sessionA->id)->firstOrFail();
        $bill = Bill::where('booking_token_id', $tokenA->id)->firstOrFail();
        $this->assertEquals(200000, $bill->total_amount);
        $this->assertEquals(Bill::STATUS_PAID, $bill->payment_status);

        // Move token to Doctor B session
        $moveRes = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings/{$tokenA->id}/move", [
                'destination_session_id' => $sessionB->id,
                'reason' => 'Patient requested neurologist consultation',
                'notify_patient' => true,
            ]);

        $moveRes->assertRedirect();
        $moveRes->assertSessionHas('success');
        $moveRes->assertSessionHas('movedToken');

        // Verify Old Token is moved
        $tokenA->refresh();
        $this->assertEquals(BookingToken::STATUS_MOVED, $tokenA->status);
        $this->assertNotNull($tokenA->moved_to_token_id);
        $this->assertNotNull($tokenA->moved_at);
        $this->assertEquals('Patient requested neurologist consultation', $tokenA->move_reason);

        // Verify New Token is created in Session B
        $tokenB = BookingToken::findOrFail($tokenA->moved_to_token_id);
        $this->assertEquals($sessionB->id, $tokenB->doctor_session_id);
        $this->assertEquals(BookingToken::STATUS_BOOKED, $tokenB->status);
        $this->assertEquals(1, $tokenB->token_number);

        // Verify Bill is IMMUTABLE: total_amount remains original paid Rs. 2,000!
        $bill->refresh();
        $this->assertEquals(200000, $bill->total_amount);
        $this->assertEquals(Bill::STATUS_PAID, $bill->payment_status);
        $this->assertEquals($tokenB->id, $bill->booking_token_id);
        $this->assertEquals($doctorB->id, $bill->doctor_id);

        // Verify BillAdjustment is recorded for difference (+150000 = Rs. 1,500 balance due)
        $this->assertCount(1, $bill->adjustments);
        $adj = $bill->adjustments->first();
        $this->assertEquals(150000, $adj->amount_cents);
        $this->assertEquals('Balance due: Rs. 1,500.00', $adj->formatted_amount);
    }

    /**
     * 10. Test doctor payout attribution: after move, payout goes to NEW doctor only; old doctor gets 0.
     */
    public function test_doctor_payout_attribution_on_move_goes_only_to_new_doctor(): void
    {
        $docOld = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Old Doctor',
            'specialty' => 'GP',
            'slmc_number' => 'SLMC-0001',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 150000,
            'custom_clinic_fee' => 50000,
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $docNew = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'New Doctor',
            'specialty' => 'Specialist',
            'slmc_number' => 'SLMC-0002',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 250000,
            'custom_clinic_fee' => 50000,
            'doctor_fee' => 250000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $sessionOld = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $docOld->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '10:00',
            'end_time' => '12:00',
            'max_tokens' => 10,
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'status' => 'scheduled',
        ]);

        $sessionNew = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $docNew->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '14:00',
            'end_time' => '16:00',
            'max_tokens' => 10,
            'doctor_fee' => 250000,
            'clinic_fee' => 50000,
            'status' => 'scheduled',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sunil Shantha',
            'phone' => '+94775555555',
        ]);

        // Issue token for old doctor
        $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $sessionOld->id,
                'patient_id' => $patient->id,
                'payment_collected' => true,
            ]);

        $token = BookingToken::where('doctor_session_id', $sessionOld->id)->firstOrFail();

        // Move token to new doctor
        $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $sessionNew->id,
                'reason' => 'Patient switch',
            ]);

        // Query Doctor Payouts page for Old Doctor
        $resOld = $this->actingAs($this->adminUser)
            ->get("http://sivacli.{$this->baseDomain}/billing/payouts?doctor_id={$docOld->id}");

        $resOld->assertOk();
        $resOld->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Billing/DoctorPayouts')
            ->where('summary.total_patients', 0)
            ->where('summary.doctor_payout_due_lkr', 0)
        );

        // Query Doctor Payouts page for New Doctor
        $resNew = $this->actingAs($this->adminUser)
            ->get("http://sivacli.{$this->baseDomain}/billing/payouts?doctor_id={$docNew->id}");

        $resNew->assertOk();
        $resNew->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Billing/DoctorPayouts')
            ->where('summary.total_patients', 1)
            ->where('summary.doctor_payout_due_lkr', 1500)
        );
    }

    /**
     * 11. Test moving token blocked if consultation already started or completed.
     */
    public function test_move_token_blocked_if_consultation_started_or_completed(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Doctor Block',
            'specialty' => 'GP',
            'slmc_number' => 'SLMC-9999',
            'is_active' => true,
        ]);

        $session1 = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '09:00',
            'end_time' => '11:00',
            'max_tokens' => 10,
            'status' => 'scheduled',
        ]);

        $session2 = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '13:00',
            'end_time' => '15:00',
            'max_tokens' => 10,
            'status' => 'scheduled',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Anura Silva',
            'phone' => '+94776666666',
        ]);

        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session1->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_IN_CONSULTATION,
        ]);

        $res = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $session2->id,
            ]);

        $res->assertSessionHasErrors('move_error');
        $this->assertEquals(BookingToken::STATUS_IN_CONSULTATION, $token->fresh()->status);
    }

    /**
     * 12. Test moving unpaid token simply recalculates the bill with the new fee snapshot.
     */
    public function test_move_unpaid_token_recalculates_bill(): void
    {
        $doctorA = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Dr. Unpaid A',
            'specialty' => 'GP',
            'slmc_number' => 'SLMC-3331',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 100000,
            'custom_clinic_fee' => 50000,
            'doctor_fee' => 100000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $doctorB = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Dr. Unpaid B',
            'specialty' => 'Cardio',
            'slmc_number' => 'SLMC-3332',
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 200000,
            'custom_clinic_fee' => 50000,
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $sessionA = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctorA->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '09:00',
            'end_time' => '12:00',
            'max_tokens' => 10,
            'status' => 'scheduled',
        ]);

        $sessionB = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctorB->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '09:00',
            'end_time' => '12:00',
            'max_tokens' => 10,
            'status' => 'scheduled',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Unpaid Patient',
            'phone' => '+94778889999',
        ]);

        // Issue token WITHOUT payment (payment_collected = false)
        $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $sessionA->id,
                'patient_id' => $patient->id,
                'payment_collected' => false,
            ]);

        $token = BookingToken::where('doctor_session_id', $sessionA->id)->firstOrFail();
        $bill = Bill::where('booking_token_id', $token->id)->firstOrFail();
        $this->assertEquals(Bill::STATUS_PENDING, $bill->payment_status);
        $this->assertEquals(150000, $bill->total_amount); // 1000 + 500

        // Move token to Doctor B
        $moveRes = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $sessionB->id,
            ]);

        $moveRes->assertRedirect();
        $moveRes->assertSessionHas('success');

        // Verify bill is updated to new fee (2000 + 500 = 250000)
        $bill->refresh();
        $this->assertEquals(250000, $bill->total_amount);
        $this->assertEquals($doctorB->id, $bill->doctor_id);
        $this->assertCount(0, $bill->adjustments, 'Unpaid bill should not create adjustments, just recalculate');
    }

    /**
     * 13. Test preventing duplicate active token for the same patient in a session.
     */
    public function test_prevent_duplicate_active_token_in_same_session(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Doctor Dupe',
            'specialty' => 'GP',
            'slmc_number' => 'SLMC-4444',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '10:00',
            'end_time' => '12:00',
            'max_tokens' => 10,
            'status' => 'scheduled',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Same Patient',
            'phone' => '+94770009999',
        ]);

        // First issue succeeds
        $res1 = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
            ]);
        $res1->assertRedirect();
        $this->assertEquals(1, BookingToken::where('doctor_session_id', $session->id)->count());

        // Second issue for same patient throws/redirects with error
        $this->expectException(\Exception::class);
        $this->actingAs($this->adminUser)
            ->withoutExceptionHandling()
            ->post("http://sivacli.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
            ]);
    }
}
