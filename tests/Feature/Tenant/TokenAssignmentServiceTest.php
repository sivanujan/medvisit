<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Services\TokenAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class TokenAssignmentServiceTest extends TestCase
{
    use RefreshDatabase;

    private TokenAssignmentService $service;

    private Tenant $tenant;

    private Doctor $doctor;

    private DoctorSession $session;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TokenAssignmentService;

        $this->tenant = Tenant::create([
            'id' => 'suwa-care',
            'name' => 'Suwa Care Clinic',
            'subdomain' => 'suwacare',
            'status' => 'active',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. K. Senanayake',
            'title' => 'Dr.',
            'specialty' => 'General Physician',
            'slmc_number' => 'SLMC-12345',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
        ]);

        $this->session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 3,
            'mode' => 'token',
            'status' => 'scheduled',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);
    }

    public function test_assigns_sequential_tokens_with_estimated_times(): void
    {
        $patient1 = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Perera',
            'phone' => '+94 77 123 4567',
        ]);

        $patient2 = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Nimal Silva',
            'phone' => '+94 71 987 6543',
        ]);

        $token1 = $this->service->assignToken($this->session, $patient1);
        $token2 = $this->service->assignToken($this->session, $patient2);

        $this->assertSame(1, $token1->token_number);
        $this->assertSame(2, $token2->token_number);

        // Token 1 estimated time = 09:00, Token 2 = 09:10 (09:00 + (2-1)*10 mins)
        $this->assertSame('09:00', $token1->estimated_time->format('H:i'));
        $this->assertSame('09:10', $token2->estimated_time->format('H:i'));
    }

    public function test_throws_exception_when_session_is_full(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $patient = Patient::create([
                'tenant_id' => $this->tenant->id,
                'name' => "Patient {$i}",
                'phone' => "+94 77 000 000{$i}",
            ]);
            $this->service->assignToken($this->session, $patient);
        }

        $extraPatient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Extra Patient',
            'phone' => '+94 77 999 9999',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Cannot book token: this channeling session is fully booked.');

        $this->service->assignToken($this->session, $extraPatient);
    }

    public function test_prevents_duplicate_active_token_for_same_patient_in_same_session(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Perera',
            'phone' => '+94 77 123 4567',
        ]);

        $this->service->assignToken($this->session, $patient);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Patient already has an active booking token for this session.');

        $this->service->assignToken($this->session, $patient);
    }
}
