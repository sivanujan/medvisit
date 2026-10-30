<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwa',
            'name' => 'Suwa Shanthi Clinic',
            'subdomain' => 'suwa',
            'plan' => 'pro',
            'status' => 'active',
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwa.lk',
        ]);
    }

    public function test_week_view_returns_sessions_for_given_week_range(): void
    {
        // Reference week: 2026-10-19 (Mon) to 2026-10-25 (Sun)
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. K. Sivalingam',
            'slmc_number' => 'SLMC-12345',
            'specialty' => 'Cardiologist',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'status' => 'active',
        ]);

        // Create 3 sessions on different days of this week
        $sessionMon = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-19',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        $sessionWed = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-21',
            'start_time' => '14:00:00',
            'end_time' => '17:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite B',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        $sessionFri = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-23',
            'start_time' => '18:00:00',
            'end_time' => '21:00:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        // Session outside this week (next week)
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-27',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        // Request week view for Wednesday 2026-10-21
        $response = $this->actingAs($this->admin)
            ->get("http://suwa.{$this->baseDomain}/calendar?view=week&date=2026-10-21");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Calendar/Index')
            ->where('view', 'week')
            ->where('startDate', '2026-10-19')
            ->where('endDate', '2026-10-25')
            ->has('days', 7)
            ->has('sessions', 3)
            ->where('sessions.0.session_date', '2026-10-19')
            ->where('sessions.1.session_date', '2026-10-21')
            ->where('sessions.2.session_date', '2026-10-23')
        );
    }

    public function test_day_view_returns_sessions_for_selected_day(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. A. Perera',
            'slmc_number' => 'SLMC-12345',
            'specialty' => 'Pediatrician',
            'doctor_fee' => 180000,
            'clinic_fee' => 40000,
            'status' => 'active',
        ]);

        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-22',
            'start_time' => '08:00:00',
            'end_time' => '11:00:00',
            'max_tokens' => 15,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 180000,
            'clinic_fee' => 40000,
        ]);

        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-23',
            'start_time' => '08:00:00',
            'end_time' => '11:00:00',
            'max_tokens' => 15,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 180000,
            'clinic_fee' => 40000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get("http://suwa.{$this->baseDomain}/calendar?view=day&date=2026-10-22");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Calendar/Index')
            ->where('view', 'day')
            ->where('selectedDate', '2026-10-22')
            ->has('sessions', 1)
            ->where('sessions.0.session_date', '2026-10-22')
        );
    }

    public function test_overrunning_and_not_started_status_computation(): void
    {
        // Fix test time to 11:15 PM on 2026-10-22 Colombo time
        Carbon::setTestNow(Carbon::parse('2026-10-22 23:15:00', 'Asia/Colombo'));

        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. S. Nathan',
            'slmc_number' => 'SLMC-12345',
            'specialty' => 'Dermatologist',
            'doctor_fee' => 220000,
            'clinic_fee' => 50000,
            'status' => 'active',
        ]);

        // 1. Session 5:30 - 8:30 PM with status in_progress -> should be 'overrunning'
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-22',
            'start_time' => '17:30:00',
            'end_time' => '20:30:00',
            'max_tokens' => 20,
            'status' => 'in_progress',
            'room_number' => 'Suite A',
            'doctor_fee' => 220000,
            'clinic_fee' => 50000,
        ]);

        // 2. Session 7:00 - 9:30 PM with status scheduled -> should be 'not_started'
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-22',
            'start_time' => '19:00:00',
            'end_time' => '21:30:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite B',
            'doctor_fee' => 220000,
            'clinic_fee' => 50000,
        ]);

        // 3. Tomorrow session with scheduled status -> regular 'scheduled'
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-23',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 220000,
            'clinic_fee' => 50000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get("http://suwa.{$this->baseDomain}/calendar?view=day&date=2026-10-22");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Calendar/Index')
            ->where('sessions.0.effective_status', 'overrunning')
            ->where('sessions.0.status_label', 'Overrunning')
            ->where('sessions.0.is_overrunning', true)
            ->where('sessions.1.effective_status', 'not_started')
            ->where('sessions.1.status_label', 'Not started')
            ->where('sessions.1.is_past_unstarted', true)
            ->where('tenant.live_sessions_count', 0)
            ->where('tenant.overrunning_sessions_count', 1)
        );

        Carbon::setTestNow(); // reset
    }

    public function test_can_reschedule_session(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. K. Sivalingam',
            'slmc_number' => 'SLMC-12345',
            'specialty' => 'Cardiologist',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'status' => 'active',
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-22',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        $rescheduledDate = now()->addDays(5)->toDateString();
        $response = $this->actingAs($this->admin)
            ->post("http://suwa.{$this->baseDomain}/calendar/sessions/{$session->id}/reschedule", [
                'session_date' => $rescheduledDate,
                'start_time' => '10:00',
                'end_time' => '13:00',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('doctor_sessions', [
            'id' => $session->id,
            'session_date' => $rescheduledDate,
            'start_time' => '10:00:00',
            'end_time' => '13:00:00',
        ]);
    }

    public function test_can_update_session_quota_and_details(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. K. Sivalingam',
            'slmc_number' => 'SLMC-12345',
            'specialty' => 'Cardiologist',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'status' => 'active',
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-22',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        $response = $this->actingAs($this->admin)
            ->post("http://suwa.{$this->baseDomain}/calendar/sessions/{$session->id}/update", [
                'max_tokens' => 35,
                'room_number' => 'Room 4',
                'notes' => 'Updated patient quota',
                'doctor_fee_lkr' => 2500,
                'clinic_fee_lkr' => 600,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('doctor_sessions', [
            'id' => $session->id,
            'max_tokens' => 35,
            'room_number' => 'Room 4',
            'doctor_fee' => 250000,
            'clinic_fee' => 60000,
            'notes' => 'Updated patient quota',
        ]);
    }

    public function test_can_duplicate_session(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. K. Sivalingam',
            'slmc_number' => 'SLMC-12345',
            'specialty' => 'Cardiologist',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'status' => 'active',
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-22',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'room_number' => 'Suite A',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        $response = $this->actingAs($this->admin)
            ->post("http://suwa.{$this->baseDomain}/calendar/sessions/{$session->id}/duplicate", [
                'target_date' => '2026-10-29',
                'start_time' => '09:00',
                'end_time' => '12:00',
                'room_number' => 'Suite A',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('doctor_sessions', [
            'doctor_id' => $doctor->id,
            'session_date' => '2026-10-29',
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'status' => 'scheduled',
        ]);
    }
}
