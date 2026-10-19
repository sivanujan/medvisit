<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
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
        );
    }

    public function test_clinic_admin_can_create_and_update_doctor(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/doctors", [
                'title' => 'Dr.',
                'name' => 'K. Sivakumar',
                'specialty' => 'Cardiologist',
                'slmc_number' => 'SLMC-98765',
                'phone' => '+94771234567',
                'email' => 'sivakumar@gmail.com',
                'doctor_fee_lkr' => 2500,
                'clinic_fee_lkr' => 800,
                'avg_consultation_minutes' => 12,
                'is_active' => true,
            ]);

        $response->assertSessionHas('success');

        $doctor = Doctor::where('slmc_number', 'SLMC-98765')->first();
        $this->assertNotNull($doctor);
        $this->assertEquals(250000, $doctor->doctor_fee); // 2500 * 100 cents
        $this->assertEquals(80000, $doctor->clinic_fee);

        // Update doctor
        $updateResponse = $this->actingAs($this->adminUser)
            ->put("http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}", [
                'title' => 'Prof.',
                'name' => 'K. Sivakumar',
                'specialty' => 'Senior Consultant Cardiologist',
                'slmc_number' => 'SLMC-98765',
                'doctor_fee_lkr' => 3000,
                'clinic_fee_lkr' => 1000,
                'avg_consultation_minutes' => 15,
                'is_active' => true,
            ]);

        $updateResponse->assertSessionHas('success');
        $doctor->refresh();
        $this->assertEquals('Prof.', $doctor->title);
        $this->assertEquals(300000, $doctor->doctor_fee);
    }

    public function test_clinic_admin_can_create_template_and_generate_sessions(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'N. Perera',
            'specialty' => 'Paediatrician',
            'slmc_number' => 'SLMC-12345',
            'doctor_fee' => 200000,
            'clinic_fee' => 70000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/doctors/templates", [
                'doctor_id' => $doctor->id,
                'title' => 'Monday Evening Clinic',
                'day_of_week' => 1, // Monday
                'start_time' => '17:00',
                'end_time' => '20:00',
                'max_patients' => 20,
                'room_number' => 'Suite 2',
            ]);

        $response->assertSessionHas('success');

        $template = SessionTemplate::where('doctor_id', $doctor->id)->first();
        $this->assertNotNull($template);

        // Verify generated sessions exist for Mondays within 30 days
        $sessionsCount = DoctorSession::where('doctor_id', $doctor->id)->count();
        $this->assertGreaterThan(0, $sessionsCount);
    }

    public function test_channeling_calendar_view_and_roster(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'A. Fernando',
            'specialty' => 'General Physician',
            'slmc_number' => 'SLMC-55555',
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
            'end_time' => '19:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'room_number' => 'Suite 1',
        ]);

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sunil Shantha',
            'phone' => '+94711112233',
        ]);

        BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => 'booked',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'booked_via' => 'reception',
        ]);

        // Calendar index
        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasetha.{$this->baseDomain}/calendar?view=month");
        $response->assertStatus(200);

        // Calendar roster API
        $rosterResponse = $this->actingAs($this->adminUser)
            ->get("http://suwasetha.{$this->baseDomain}/calendar/roster/{$session->id}");
        $rosterResponse->assertStatus(200);
        $rosterResponse->assertJsonFragment(['patient_name' => 'Sunil Shantha']);

        // Cancel session
        $cancelResponse = $this->actingAs($this->adminUser)
            ->post("http://suwasetha.{$this->baseDomain}/calendar/sessions/{$session->id}/cancel", [
                'reason' => 'Emergency surgery',
            ]);
        $cancelResponse->assertSessionHas('success');

        $session->refresh();
        $this->assertEquals('cancelled', $session->status);
        $this->assertEquals('Emergency surgery', $session->cancellation_reason);
    }

    public function test_admin_can_delete_doctor_with_empty_sessions_and_doctor_is_removed(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'To Be Deleted',
            'specialty' => 'General Physician',
            'slmc_number' => 'SLMC-99999',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        // Generate an empty session
        DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '16:00',
            'end_time' => '19:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'room_number' => 'Suite 1',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete("http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}");

        $response->assertSessionHas('success');

        // Verify doctor is completely deleted, NOT just marked inactive
        $this->assertNull(Doctor::find($doctor->id));
        $this->assertDatabaseMissing('doctors', ['id' => $doctor->id, 'deleted_at' => null]);
    }

    public function test_admin_cannot_delete_doctor_with_active_bookings(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Has Active Appointments',
            'specialty' => 'Cardiologist',
            'slmc_number' => 'SLMC-88888',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
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

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Active Patient',
            'phone' => '+94770001122',
        ]);

        BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => 'booked',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'booked_via' => 'online',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->delete("http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}");

        $response->assertSessionHas('error');

        // Doctor should still exist and not be deleted
        $this->assertNotNull(Doctor::find($doctor->id));
    }
}
