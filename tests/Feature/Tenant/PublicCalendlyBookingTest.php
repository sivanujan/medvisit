<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VerifiedPhone;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class PublicCalendlyBookingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'sivacli',
            'name' => 'Siva Clinic Care',
            'subdomain' => 'sivacli',
            'website_published' => true,
            'walk_in_reserved_tokens' => 5,
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin Siva',
            'email' => 'admin@sivacli.lk',
        ]);

        VerifiedPhone::create([
            'phone' => '+94771234567',
            'channel' => 'whatsapp',
            'verified_at' => now(),
            'expires_at' => now()->addDays(180),
        ]);
    }

    public function test_public_can_view_step_1_doctor_selection(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'specialty' => 'Cardiologist',
            'is_active' => true,
        ]);

        $response = $this->get("http://sivacli.{$this->baseDomain}/book");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Public/Booking/DoctorSelect')
            ->has('doctors', 1)
            ->where('doctors.0.slug', 'dr-k-sivalingam')
        );
    }

    public function test_public_can_view_step_2_calendar_session_picker_by_doctor_slug(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'specialty' => 'Cardiologist',
            'is_active' => true,
        ]);

        $sessionDate = Carbon::tomorrow('Asia/Colombo')->toDateString();

        DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $sessionDate,
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'room_number' => 'Room 1',
            'status' => 'scheduled',
        ]);

        $response = $this->get("http://sivacli.{$this->baseDomain}/book/dr-k-sivalingam");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Public/Booking/CalendarSessionPicker')
            ->where('doctor.slug', 'dr-k-sivalingam')
            ->has('initialAvailability')
        );
    }

    public function test_doctor_month_availability_api_and_walk_in_reserve(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'specialty' => 'Cardiologist',
            'is_active' => true,
        ]);

        $tomorrow = Carbon::tomorrow('Asia/Colombo');

        // max_tokens: 10, walk_in_reserve: 5 => only 5 available for online booking
        DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $tomorrow->toDateString(),
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 10,
            'room_number' => 'Room 1',
            'status' => 'scheduled',
        ]);

        $response = $this->getJson("http://sivacli.{$this->baseDomain}/book/api/availability/dr-k-sivalingam?year={$tomorrow->year}&month={$tomorrow->month}");

        $response->assertOk();
        $dateStr = $tomorrow->toDateString();
        $response->assertJsonPath("days.{$dateStr}.has_sessions", true);
        $response->assertJsonPath("days.{$dateStr}.is_full", false);
        $response->assertJsonPath("days.{$dateStr}.sessions.0.available_tokens", 5);
    }

    public function test_doctor_cannot_have_overlapping_sessions_validation_in_admin(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'specialty' => 'Cardiologist',
        ]);

        // Create an existing template on Monday 16:00 - 19:00 in Room 1
        SessionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'title' => 'Evening Channeling',
            'day_of_week' => 1, // Monday
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 25,
            'room_number' => 'Room 1',
            'is_active' => true,
        ]);

        // Attempt to create an overlapping template on Monday 18:00 - 20:00 in Room 2 for the same doctor
        $response = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/doctors/templates", [
                'doctor_id' => $doctor->id,
                'title' => 'Late Clinic',
                'day_of_week' => 1,
                'start_time' => '18:00',
                'end_time' => '20:00',
                'max_patients' => 20,
                'room_number' => 'Room 2',
            ]);

        $response->assertSessionHasErrors('start_time');
    }

    public function test_room_collision_validation_in_admin(): void
    {
        $doctor1 = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
        ]);

        $doctor2 = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Priya Ramanathan',
            'slug' => 'dr-priya-ramanathan',
        ]);

        // Doctor 1 has Room 1 on Tuesday 09:00 - 12:00
        SessionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor1->id,
            'title' => 'Morning Clinic',
            'day_of_week' => 2,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'room_number' => 'Room 1',
            'is_active' => true,
        ]);

        // Doctor 2 attempts to take Room 1 on Tuesday 10:00 - 13:00
        $response = $this->actingAs($this->adminUser)
            ->post("http://sivacli.{$this->baseDomain}/doctors/templates", [
                'doctor_id' => $doctor2->id,
                'title' => 'Conflicting Clinic',
                'day_of_week' => 2,
                'start_time' => '10:00',
                'end_time' => '13:00',
                'max_patients' => 20,
                'room_number' => 'Room 1',
            ]);

        $response->assertSessionHasErrors('room_number');
    }

    public function test_public_can_view_step_3_patient_details(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'specialty' => 'Cardiologist',
        ]);

        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
        ]);

        $response = $this->get("http://sivacli.{$this->baseDomain}/book/dr-k-sivalingam/{$session->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Public/Booking/PatientDetails')
            ->where('doctor.slug', 'dr-k-sivalingam')
            ->where('session.id', $session->id)
            ->has('feeBreakdown')
        );
    }

    public function test_patient_can_book_token_and_redirects_to_confirmed_page(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
        ]);

        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $response = $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Sunil Shantha',
            'phone' => '0771234567',
            'email' => 'sunil@example.com',
            'consent' => true,
        ]);

        $token = BookingToken::where('doctor_session_id', $session->id)->first();
        $this->assertNotNull($token);
        $this->assertEquals(1, $token->token_number);

        $response->assertRedirect("/book/confirmed/{$token->signed_cancel_token}");

        // Public confirmation view
        $confirmResponse = $this->get("http://sivacli.{$this->baseDomain}/book/confirmed/{$token->signed_cancel_token}");
        $confirmResponse->assertOk();
        $confirmResponse->assertInertia(fn ($page) => $page
            ->component('Public/Booking/BookingConfirmed')
            ->where('token.token_number', 1)
        );
    }

    public function test_patient_cannot_book_duplicate_active_token_for_same_session(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
        ]);

        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        // First booking succeeds
        $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Sunil Shantha',
            'phone' => '0771234567',
            'consent' => true,
        ])->assertSessionHasNoErrors();

        // Second booking with same phone for same session is rejected
        $secondResponse = $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Sunil Shantha',
            'phone' => '0771234567',
            'consent' => true,
        ]);

        $secondResponse->assertSessionHasErrors('phone');
    }

    public function test_patient_can_cancel_booking_using_signed_link(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
        ]);

        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Sunil Shantha',
            'phone' => '0771234567',
            'consent' => true,
        ]);

        $token = BookingToken::where('doctor_session_id', $session->id)->first();
        $this->assertEquals(BookingToken::STATUS_BOOKED, $token->status);

        // Cancel via signed link
        $cancelResponse = $this->post("http://sivacli.{$this->baseDomain}/book/cancel/{$token->signed_cancel_token}");
        $cancelResponse->assertRedirect();

        $token->refresh();
        $this->assertEquals('cancelled', $token->status);
    }

    public function test_patient_can_download_ics_calendar_invite(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
        ]);

        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Sunil Shantha',
            'phone' => '0771234567',
            'consent' => true,
        ]);

        $token = BookingToken::where('doctor_session_id', $session->id)->first();

        $icsResponse = $this->get("http://sivacli.{$this->baseDomain}/book/ics/{$token->signed_cancel_token}");
        $icsResponse->assertOk();
        $icsResponse->assertHeader('Content-Type', 'text/calendar; charset=utf-8');
        $this->assertStringContainsString('BEGIN:VCALENDAR', $icsResponse->getContent());
        $this->assertStringContainsString("Doctor Channeling: Token #{$token->token_number}", $icsResponse->getContent());
    }

    public function test_cleanup_duplicate_sessions_artisan_command(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
        ]);

        $tomorrow = Carbon::tomorrow('Asia/Colombo')->toDateString();

        // Create 2 identical sessions
        DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $tomorrow,
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $tomorrow,
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $this->assertEquals(2, DoctorSession::where('doctor_id', $doctor->id)->where('session_date', $tomorrow)->count());

        $exitCode = Artisan::call('medvisit:cleanup-duplicate-sessions', [
            '--tenant' => $this->tenant->id,
        ]);

        $this->assertEquals(0, $exitCode);
        $this->assertEquals(1, DoctorSession::where('doctor_id', $doctor->id)->where('session_date', $tomorrow)->count());
    }
}
