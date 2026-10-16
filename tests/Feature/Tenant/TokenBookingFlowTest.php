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
            ->where('slmc_number', 'SLMC-33120')
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
}
