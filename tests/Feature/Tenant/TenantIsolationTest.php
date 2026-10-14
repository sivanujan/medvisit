<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_data_is_strictly_isolated(): void
    {
        $tenantA = Tenant::create([
            'id' => 'clinic-a',
            'name' => 'Clinic Alpha',
            'subdomain' => 'alpha',
            'status' => 'active',
        ]);

        $tenantB = Tenant::create([
            'id' => 'clinic-b',
            'name' => 'Clinic Beta',
            'subdomain' => 'beta',
            'status' => 'active',
        ]);

        $docA = Doctor::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Dr. Alpha Doctor',
            'specialty' => 'Cardiology',
            'slmc_number' => 'SLMC-0001',
        ]);

        $docB = Doctor::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Dr. Beta Doctor',
            'specialty' => 'Pediatrics',
            'slmc_number' => 'SLMC-0002',
        ]);

        $patientA = Patient::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Alpha Patient',
            'phone' => '+94 77 111 1111',
        ]);

        $patientB = Patient::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Beta Patient',
            'phone' => '+94 77 222 2222',
        ]);

        // When tenancy is initialized for Clinic A
        tenancy()->initialize($tenantA);

        $visibleDoctors = Doctor::all();
        $this->assertTrue($visibleDoctors->contains('id', $docA->id));
        $this->assertFalse($visibleDoctors->contains('id', $docB->id));

        $visiblePatients = Patient::all();
        $this->assertTrue($visiblePatients->contains('id', $patientA->id));
        $this->assertFalse($visiblePatients->contains('id', $patientB->id));

        tenancy()->end();

        // When tenancy is initialized for Clinic B
        tenancy()->initialize($tenantB);

        $visibleDoctorsB = Doctor::all();
        $this->assertTrue($visibleDoctorsB->contains('id', $docB->id));
        $this->assertFalse($visibleDoctorsB->contains('id', $docA->id));

        $visiblePatientsB = Patient::all();
        $this->assertTrue($visiblePatientsB->contains('id', $patientB->id));
        $this->assertFalse($visiblePatientsB->contains('id', $patientA->id));

        tenancy()->end();
    }
}
