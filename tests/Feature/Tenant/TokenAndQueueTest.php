<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenAndQueueTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $receptionistUser;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected DoctorSession $todaySession;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'lankahealth',
            'name' => 'Lanka Health Clinic',
            'subdomain' => 'lankahealth',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@lankahealth.lk',
        ]);

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'reception@lankahealth.lk',
        ]);

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@lankahealth.lk',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'title' => 'Dr.',
            'name' => 'Mahinda Jayawardena',
            'specialty' => 'Consultant Physician',
            'slmc_number' => 'SLMC-44332',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $this->todaySession = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'room_number' => 'Suite 3',
        ]);
    }

    public function test_receptionist_can_search_patients(): void
    {
        Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Gunaratne',
            'phone' => '+94771234567',
            'nic' => '198512345678',
        ]);

        $response = $this->actingAs($this->receptionistUser)
            ->get("http://lankahealth.{$this->baseDomain}/api/patients/search?q=Kamal");

        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Kamal Gunaratne']);
    }

    public function test_receptionist_can_issue_atomic_tokens(): void
    {
        // Issue token 1 with new patient
        $response1 = $this->actingAs($this->receptionistUser)
            ->post("http://lankahealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->todaySession->id,
                'new_patient_name' => 'Amara Silva',
                'new_patient_phone' => '+94719876543',
                'new_patient_gender' => 'female',
            ]);

        $response1->assertSessionHas('success');

        $token1 = BookingToken::where('doctor_session_id', $this->todaySession->id)->first();
        $this->assertNotNull($token1);
        $this->assertEquals(1, $token1->token_number);
        $this->assertEquals('booked', $token1->status);

        // Issue token 2
        $response2 = $this->actingAs($this->receptionistUser)
            ->post("http://lankahealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $this->todaySession->id,
                'new_patient_name' => 'Nimal Perera',
                'new_patient_phone' => '+94721112222',
            ]);

        $response2->assertSessionHas('success');
        $token2 = BookingToken::where('doctor_session_id', $this->todaySession->id)->where('token_number', 2)->first();
        $this->assertNotNull($token2);
        $this->assertEquals(2, $token2->token_number);
    }

    public function test_queue_workflow_checkin_call_and_complete_and_next(): void
    {
        $patient1 = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Patient One',
            'phone' => '+94770000001',
        ]);

        $patient2 = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Patient Two',
            'phone' => '+94770000002',
        ]);

        $token1 = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->todaySession->id,
            'patient_id' => $patient1->id,
            'token_number' => 1,
            'status' => 'booked',
        ]);

        $token2 = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->todaySession->id,
            'patient_id' => $patient2->id,
            'token_number' => 2,
            'status' => 'booked',
        ]);

        // Check in token 1
        $checkInResponse = $this->actingAs($this->receptionistUser)
            ->post("http://lankahealth.{$this->baseDomain}/sessions/today/{$token1->id}/check-in");
        $checkInResponse->assertSessionHas('success');
        $token1->refresh();
        $this->assertEquals('checked_in', $token1->status);

        // Call next
        $callResponse = $this->actingAs($this->doctorUser)
            ->post("http://lankahealth.{$this->baseDomain}/sessions/today/{$this->todaySession->id}/call-next");
        $callResponse->assertSessionHas('success');

        $token1->refresh();
        $this->todaySession->refresh();
        $this->assertEquals('called', $token1->status);
        $this->assertEquals(1, $this->todaySession->current_token_number);
        $this->assertEquals('in_progress', $this->todaySession->status);

        // Start consultation
        $startResponse = $this->actingAs($this->doctorUser)
            ->post("http://lankahealth.{$this->baseDomain}/sessions/today/{$this->todaySession->id}/start");
        $startResponse->assertSessionHas('success');
        $token1->refresh();
        $this->assertEquals('in_consultation', $token1->status);

        // Complete and next (should complete token 1 and call token 2)
        $completeNextResponse = $this->actingAs($this->doctorUser)
            ->post("http://lankahealth.{$this->baseDomain}/sessions/today/{$this->todaySession->id}/complete-and-next");
        $completeNextResponse->assertSessionHas('success');

        $token1->refresh();
        $token2->refresh();
        $this->todaySession->refresh();

        $this->assertEquals('completed', $token1->status);
        $this->assertEquals('called', $token2->status);
        $this->assertEquals(2, $this->todaySession->current_token_number);
    }

    public function test_live_tv_view_and_polling(): void
    {
        $tvResponse = $this->actingAs($this->adminUser)
            ->get("http://lankahealth.{$this->baseDomain}/queue/tv");
        $tvResponse->assertStatus(200);
        $tvResponse->assertInertia(fn ($page) => $page->component('Queue/Tv'));

        $dataResponse = $this->actingAs($this->adminUser)
            ->get("http://lankahealth.{$this->baseDomain}/queue/tv/data");
        $dataResponse->assertStatus(200);
        $dataResponse->assertJsonStructure([
            'clinic',
            'nowServing',
            'nextInLine',
            'waitingCount',
            'completedCount',
            'roomsOverview',
            'currentTime',
            'currentDate',
        ]);
    }
}
