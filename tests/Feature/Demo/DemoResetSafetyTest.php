<?php

declare(strict_types=1);

namespace Tests\Feature\Demo;

use App\Models\ClinicMedicine;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Tenant;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DemoResetSafetyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test demo:reset aborts if target tenant is missing is_demo flag.
     */
    public function test_demo_reset_aborts_if_not_marked_is_demo(): void
    {
        Tenant::factory()->create([
            'id' => 'devclinic',
            'subdomain' => 'devclinic',
            'is_demo' => false,
        ]);

        config(['demo.tenant_id' => 'devclinic']);
        config(['demo.subdomain' => 'devclinic']);

        $exitCode = Artisan::call('demo:reset');

        $this->assertEquals(1, $exitCode);
        $output = Artisan::output();
        $this->assertStringContainsString('SECURITY ABORT', $output);
    }

    /**
     * Test demo:reset aborts if subdomain does not match configured subdomain.
     */
    public function test_demo_reset_aborts_if_subdomain_mismatched(): void
    {
        Tenant::factory()->create([
            'id' => 'demo',
            'subdomain' => 'demo',
            'is_demo' => true,
        ]);

        config(['demo.tenant_id' => 'demo']);
        config(['demo.subdomain' => 'unauthorized_subdomain']);

        $exitCode = Artisan::call('demo:reset');

        $this->assertEquals(1, $exitCode);
        $output = Artisan::output();
        $this->assertStringContainsString('SECURITY ABORT', $output);
    }

    /**
     * Test demo:reset successfully reseeds demo tenant and leaves devclinic untouched.
     */
    public function test_demo_reset_reseeds_demo_clinic_and_preserves_devclinic(): void
    {
        config(['demo.tenant_id' => 'demo']);
        config(['demo.subdomain' => 'demo']);

        // Create devclinic with 3 patients
        $devclinic = Tenant::factory()->create([
            'id' => 'devclinic',
            'subdomain' => 'devclinic',
            'is_demo' => false,
        ]);
        Patient::factory()->count(3)->create(['tenant_id' => $devclinic->id]);

        // Run seeder to create initial demo tenant
        $this->seed(DemoClinicSeeder::class);

        $devBeforePatients = Patient::where('tenant_id', 'devclinic')->count();

        // Run reset command
        $exitCode = Artisan::call('demo:reset');
        $this->assertEquals(0, $exitCode);

        // Verify demo counts
        $this->assertEquals(80, Patient::where('tenant_id', 'demo')->count());
        $this->assertEquals(4, Doctor::where('tenant_id', 'demo')->count());
        $this->assertEquals(20, ClinicMedicine::where('tenant_id', 'demo')->count());

        // Verify devclinic untouched
        $devAfterPatients = Patient::where('tenant_id', 'devclinic')->count();
        $this->assertEquals($devBeforePatients, $devAfterPatients);
        $this->assertEquals(3, $devAfterPatients);
    }
}
