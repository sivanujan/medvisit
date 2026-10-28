<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientDirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Tenant $otherTenant;

    protected User $adminUser;

    protected User $doctorUser;

    protected User $receptionistUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasethamed',
            'name' => 'Suwasetha Medical Care',
            'subdomain' => 'suwasethamed',
        ]);

        $this->otherTenant = Tenant::factory()->active()->create([
            'id' => 'otherclinic',
            'name' => 'Other Clinic Care',
            'subdomain' => 'otherclinic',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasethamed.lk',
        ]);

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@suwasethamed.lk',
        ]);

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'reception@suwasethamed.lk',
        ]);
    }

    public function test_phone_normalized_is_auto_populated_and_formatted(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sunil Perera',
            'phone' => '077 123 4567',
            'nic' => '198512345678',
            'gender' => 'male',
            'district' => 'Colombo',
            'city' => 'Battaramulla',
        ]);

        $this->assertEquals('+94771234567', $patient->phone_normalized);
        $this->assertEquals('077 123 4567', $patient->phone_display);
        $this->assertEquals('•••••••• 5678', $patient->masked_nic);
        $this->assertEquals('Battaramulla, Colombo', $patient->location_display);
    }

    public function test_location_formatting_without_city(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Silva',
            'phone' => '+94719876543',
            'nic' => '199012341234',
            'gender' => 'male',
            'district' => 'Kandy',
            'city' => null,
        ]);

        $this->assertEquals('Kandy', $patient->location_display);
        $this->assertStringNotContainsString('–', $patient->location_display);
        $this->assertStringNotContainsString(',', $patient->location_display);
    }

    public function test_search_matches_any_phone_format(): void
    {
        Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Malini Fonseka',
            'phone' => '+94 78 777 8899',
            'nic' => '196512345678',
            'gender' => 'female',
            'district' => 'Colombo',
            'city' => 'Colombo 07',
        ]);

        // Search using raw unspaced digits "0787778899"
        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasethamed.{$this->baseDomain}/patients?search=0787778899");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Patients/Index')
            ->has('patients.data', 1)
            ->where('patients.data.0.name', 'Malini Fonseka')
            ->where('patients.data.0.phone_display', '078 777 8899')
            ->where('patients.data.0.nic_masked', '•••••••• 5678')
        );
    }

    public function test_nic_is_masked_in_directory_list_response(): void
    {
        Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Nimal Jayawardena',
            'phone' => '0772233445',
            'nic' => '199512349999',
            'gender' => 'male',
            'district' => 'Gampaha',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasethamed.{$this->baseDomain}/patients");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Patients/Index')
            ->where('patients.data.0.nic_masked', '•••••••• 9999')
        );

        // Ensure full unmasked raw NIC is NOT included in directory list props
        $content = $response->getContent();
        $this->assertStringNotContainsString('"nic":"199512349999"', (string) $content);
    }

    public function test_reveal_nic_requires_permission_and_logs_audit_event(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Anura Kumara',
            'phone' => '0775556677',
            'nic' => '197012348888',
            'gender' => 'male',
            'district' => 'Colombo',
        ]);

        // 1. Receptionist attempt should be 403 Forbidden
        $unauthorizedResponse = $this->actingAs($this->receptionistUser)
            ->postJson("http://suwasethamed.{$this->baseDomain}/patients/{$patient->id}/reveal-nic");

        $unauthorizedResponse->assertForbidden();

        // 2. Doctor or Clinic Admin can reveal
        $authorizedResponse = $this->actingAs($this->doctorUser)
            ->postJson("http://suwasethamed.{$this->baseDomain}/patients/{$patient->id}/reveal-nic");

        $authorizedResponse->assertOk();
        $authorizedResponse->assertJson([
            'nic' => '197012348888',
        ]);

        // 3. Verify audit log entry was created
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'action' => 'patient.nic_revealed',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
        ]);
    }

    public function test_patient_history_restricts_prescriptions_for_receptionist(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Rohan Dias',
            'phone' => '0773344556',
            'nic' => '198812347777',
            'gender' => 'male',
            'district' => 'Kalutara',
        ]);

        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Nalin Wickramasinghe',
            'specialty' => 'Physician',
            'slmc_number' => 'SLMC-12345',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        Prescription::create([
            'tenant_id' => $this->tenant->id,
            'prescription_number' => 'RX-2026-0001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => Prescription::STATUS_FINALIZED,
            'diagnosis' => 'Upper Respiratory Infection',
            'notes' => 'Rest and fluids',
            'finalized_at' => now(),
            'created_at' => now(),
        ]);

        // Receptionist access to history
        $receptionistResponse = $this->actingAs($this->receptionistUser)
            ->getJson("http://suwasethamed.{$this->baseDomain}/patients/{$patient->id}/history");

        $receptionistResponse->assertOk();
        $receptionistData = $receptionistResponse->json();
        $this->assertEmpty($receptionistData['prescriptions']);
        $this->assertFalse($receptionistData['permissions']['can_view_prescriptions']);

        // Doctor access to history
        $doctorResponse = $this->actingAs($this->doctorUser)
            ->getJson("http://suwasethamed.{$this->baseDomain}/patients/{$patient->id}/history");

        $doctorResponse->assertOk();
        $doctorData = $doctorResponse->json();
        $this->assertNotEmpty($doctorData['prescriptions']);
        $this->assertTrue($doctorData['permissions']['can_view_prescriptions']);
        $this->assertEquals('Upper Respiratory Infection', $doctorData['prescriptions'][0]['diagnosis']);
    }

    public function test_tenant_isolation_prevents_cross_tenant_access(): void
    {
        $otherPatient = Patient::create([
            'tenant_id' => $this->otherTenant->id,
            'name' => 'Foreign Tenant Patient',
            'phone' => '0770001122',
            'nic' => '199900001111',
            'gender' => 'other',
            'district' => 'Jaffna',
        ]);

        // suwasethamed user cannot see other clinic patient
        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasethamed.{$this->baseDomain}/patients?search=Foreign");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Patients/Index')
            ->has('patients.data', 0)
        );

        // Cannot view history of other tenant's patient
        $historyResponse = $this->actingAs($this->adminUser)
            ->getJson("http://suwasethamed.{$this->baseDomain}/patients/{$otherPatient->id}/history");

        $historyResponse->assertNotFound();
    }
}
