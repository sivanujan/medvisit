<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorAndScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $doctorUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasetha.lk',
        ]);

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@suwasetha.lk',
        ]);
    }

    public function test_clinic_admin_can_view_doctors_page(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasetha.{$this->baseDomain}/doctors");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Doctors/Index')
            ->has('doctors')
            ->has('templates')
            ->has('leaves')
            ->has('lastGeneratedInfo')
        );
    }

    public function test_slmc_display_and_model_strips_duplicate_prefix(): void
    {
        $doc1 = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Prefix Test 1',
            'specialty' => 'Cardiologist',
            'slmc_number' => 'SLMC-18429',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $doc2 = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Prefix Test 2',
            'specialty' => 'Neurologist',
            'slmc_number' => 'slmc: 29834',
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        // Assert saving hook automatically stripped the prefix in DB storage
        $this->assertEquals('18429', $doc1->slmc_number);
        $this->assertEquals('29834', $doc2->slmc_number);

        // Assert clean_slmc and slmc_display accessors
        $this->assertEquals('18429', $doc1->clean_slmc);
        $this->assertEquals('SLMC 18429', $doc1->slmc_display);
        $this->assertEquals('29834', $doc2->clean_slmc);
        $this->assertEquals('SLMC 29834', $doc2->slmc_display);
    }

    public function test_generate_sessions_is_idempotent_and_skips_doctor_leave(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Schedule Specialist',
            'specialty' => 'ENT Surgeon',
            'slmc_number' => '54321',
            'doctor_fee' => 200000,
            'clinic_fee' => 70000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        // Next Monday date
        $nextMonday = Carbon::today('Asia/Colombo')->next(Carbon::MONDAY);
        $secondMonday = (clone $nextMonday)->addWeek();

        // Create weekly template for Mondays (day_of_week = 1)
        $template = SessionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'title' => 'Monday ENT Clinic',
            'day_of_week' => 1,
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_patients' => 20,
            'room_number' => 'Suite 3',
            'mode' => 'token',
            'is_active' => true,
        ]);

        // Record a leave for the doctor on the first Monday
        DoctorLeave::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'start_date' => $nextMonday->toDateString(),
            'end_date' => $nextMonday->toDateString(),
            'reason' => 'Annual Leave',
        ]);

        // First generation run for next 14 days
        $res = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/doctors/generate-sessions", [
                'start_date' => $nextMonday->toDateString(),
                'end_date' => $secondMonday->toDateString(),
                'doctor_ids' => [$doctor->id],
            ]);

        $res->assertSessionHas('success');

        // Verify session was NOT created on the leave date ($nextMonday)
        $leaveSession = DoctorSession::where('doctor_id', $doctor->id)
            ->where('session_date', $nextMonday->toDateString())
            ->first();
        $this->assertNull($leaveSession, 'Session on doctor leave date must be skipped');

        // Verify session WAS created on the second Monday (which is not on leave)
        $secondSession = DoctorSession::where('doctor_id', $doctor->id)
            ->where('session_date', $secondMonday->toDateString())
            ->first();
        $this->assertNotNull($secondSession, 'Session on second Monday must be generated');

        $initialSessionCount = DoctorSession::where('doctor_id', $doctor->id)->count();
        $this->assertEquals(1, $initialSessionCount);

        // Run generation a SECOND time for the EXACT same date range (Idempotency test)
        $res2 = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/doctors/generate-sessions", [
                'start_date' => $nextMonday->toDateString(),
                'end_date' => $secondMonday->toDateString(),
                'doctor_ids' => [$doctor->id],
            ]);

        $res2->assertSessionHas('success');

        // Verify no duplicate sessions were created
        $finalSessionCount = DoctorSession::where('doctor_id', $doctor->id)->count();
        $this->assertEquals($initialSessionCount, $finalSessionCount, 'Generation must be strictly idempotent and create zero duplicates');
    }

    public function test_delete_is_blocked_when_history_exists(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'History Doctor',
            'specialty' => 'Cardiologist',
            'slmc_number' => '88888',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        // Add a past/scheduled session
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Suite 2',
        ]);

        // Attempting to delete doctor with session history must be blocked
        $response = $this->actingAs($this->adminUser)
            ->delete("http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}");

        $response->assertSessionHas('error');
        $this->assertStringContainsStringIgnoringCase('Cannot delete', session('error'));

        // Doctor must still exist in database
        $this->assertNotNull(Doctor::find($doctor->id));
    }

    public function test_delete_is_allowed_only_for_doctor_with_zero_history(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Zero History Doc',
            'specialty' => 'Dermatologist',
            'slmc_number' => '77777',
            'doctor_fee' => 180000,
            'clinic_fee' => 60000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        // Delete doctor with 0 sessions, bookings, bills
        $response = $this->actingAs($this->adminUser)
            ->delete("http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}");

        $response->assertSessionHas('success');

        // Doctor is permanently hard deleted
        $this->assertNull(Doctor::find($doctor->id));
        $this->assertDatabaseMissing('doctors', ['id' => $doctor->id]);
    }

    public function test_deactivate_hides_doctor_from_booking_while_keeping_history(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Deactivate Test',
            'specialty' => 'General Physician',
            'slmc_number' => '66666',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        // Add historical session
        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::yesterday('Asia/Colombo')->toDateString(),
            'start_time' => '16:00',
            'end_time' => '19:00',
            'max_tokens' => 25,
            'status' => 'completed',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'room_number' => 'Suite 1',
        ]);

        // Toggle active -> deactivates
        $response = $this->actingAs($this->adminUser)
            ->patch("http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}/toggle");

        $response->assertSessionHas('success');
        $doctor->refresh();

        $this->assertFalse($doctor->is_active);

        // Historical sessions still exist intact
        $this->assertDatabaseHas('doctor_sessions', ['id' => $session->id, 'doctor_id' => $doctor->id]);

        // Active channeling query excludes deactivated doctor
        $activeDoctors = Doctor::where('tenant_id', $this->tenant->id)
            ->where('is_active', true)
            ->pluck('id');
        $this->assertNotContains($doctor->id, $activeDoctors);
    }

    public function test_doctors_page_lists_only_in_use_specialties(): void
    {
        Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Cardio 1',
            'specialty' => 'Cardiologist',
            'slmc_number' => '11111',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Physician 1',
            'specialty' => 'Consultant Physician',
            'slmc_number' => '22222',
            'doctor_fee' => 220000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasetha.{$this->baseDomain}/doctors");

        $response->assertStatus(200);
        $response->assertInertia(function ($page) {
            $doctors = collect($page->toArray()['props']['doctors']);
            $usedSpecialties = $doctors->pluck('specialty')->unique()->values()->all();

            $this->assertContains('Cardiologist', $usedSpecialties);
            $this->assertContains('Consultant Physician', $usedSpecialties);
            $this->assertNotContains('Psychiatrist', $usedSpecialties);
        });
    }
}
