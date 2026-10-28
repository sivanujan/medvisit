<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenConcurrencyQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $receptionist;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->receptionist = User::where('email', 'receptionist@cityhealth.test')->firstOrFail();
    }

    /**
     * 1. Issue tokens sequentially under concurrency: numbers are unique, strictly increasing.
     */
    public function test_issue_token_concurrency_produces_unique_sequential_numbers(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->firstOrFail();
        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '17:00:00',
            'end_time' => '20:00:00',
            'max_tokens' => 5,
            'status' => 'opened',
        ]);

        $p1 = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Concurrent Patient 1',
            'phone' => '+94771110001',
            'gender' => 'female',
        ]);

        $p2 = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Concurrent Patient 2',
            'phone' => '+94771110002',
            'gender' => 'male',
        ]);

        // Issue token 1
        $res1 = $this->actingAs($this->receptionist)
            ->post("http://cityhealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $p1->id,
            ]);
        $res1->assertSessionHasNoErrors();

        // Issue token 2
        $res2 = $this->actingAs($this->receptionist)
            ->post("http://cityhealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $p2->id,
            ]);
        $res2->assertSessionHasNoErrors();

        $t1 = BookingToken::where('doctor_session_id', $session->id)->where('patient_id', $p1->id)->firstOrFail();
        $t2 = BookingToken::where('doctor_session_id', $session->id)->where('patient_id', $p2->id)->firstOrFail();

        $this->assertSame(1, $t1->token_number);
        $this->assertSame(2, $t2->token_number);
        $this->assertNotEquals($t1->token_number, $t2->token_number);
    }

    /**
     * 2. Enforcing max token capacity limits strictly blocks further booking.
     */
    public function test_session_capacity_limit_blocks_overflow_tokens(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->firstOrFail();
        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->addDays(2)->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 2, // Low capacity
            'status' => 'opened',
        ]);

        $p1 = Patient::create(['tenant_id' => $this->tenant->id, 'name' => 'P1', 'phone' => '+94772000001', 'gender' => 'other']);
        $p2 = Patient::create(['tenant_id' => $this->tenant->id, 'name' => 'P2', 'phone' => '+94772000002', 'gender' => 'other']);
        $p3 = Patient::create(['tenant_id' => $this->tenant->id, 'name' => 'P3', 'phone' => '+94772000003', 'gender' => 'other']);

        // Token 1
        $this->actingAs($this->receptionist)
            ->post("http://cityhealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $p1->id,
            ])->assertSessionHasNoErrors();

        // Token 2
        $this->actingAs($this->receptionist)
            ->post("http://cityhealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $p2->id,
            ])->assertSessionHasNoErrors();

        // Token 3 - Should fail capacity check
        $res3 = $this->actingAs($this->receptionist)
            ->post("http://cityhealth.{$this->baseDomain}/bookings", [
                'doctor_session_id' => $session->id,
                'patient_id' => $p3->id,
            ]);

        $this->assertDatabaseMissing('booking_tokens', [
            'doctor_session_id' => $session->id,
            'patient_id' => $p3->id,
        ]);

        $this->assertSame(2, BookingToken::where('doctor_session_id', $session->id)->count());
    }
}
