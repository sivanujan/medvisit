<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DevClinicPreservationTest extends TestCase
{
    public function test_devclinic_tenant_exists_or_can_be_accessed(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['id' => 'devclinic'],
            [
                'name' => 'Demo Healthcare Clinic',
                'subdomain' => 'devclinic',
                'plan' => 'standard',
                'status' => 'active',
                'is_demo' => false,
            ]
        );

        $this->assertNotNull($tenant);
        $this->assertEquals('devclinic', $tenant->subdomain);
        $this->assertFalse((bool) $tenant->is_demo);
    }

    public function test_devclinic_login_and_dashboard_access(): void
    {
        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $tenant = Tenant::updateOrCreate(
            ['id' => 'devclinic'],
            [
                'name' => 'Demo Healthcare Clinic',
                'subdomain' => 'devclinic',
                'plan' => 'standard',
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
                'is_demo' => false,
                'setup_completed_at' => now(),
            ]
        );
        $tenant->domains()->firstOrCreate(['domain' => 'devclinic']);
        $tenant->domains()->firstOrCreate(['domain' => "devclinic.{$baseDomain}"]);

        Subscription::firstOrCreate(
            ['tenant_id' => 'devclinic'],
            [
                'plan_id' => 1,
                'status' => 'active',
                'current_period_start' => now()->subDays(5),
                'current_period_end' => now()->addDays(25),
            ]
        );

        $admin = User::firstOrCreate(
            ['email' => 'clinicadmin@medvisit.test'],
            [
                'tenant_id' => 'devclinic',
                'name' => 'Demo Admin',
                'password' => bcrypt('Password123!'),
            ]
        );
        if (! $admin->hasRole('clinic_admin')) {
            $role = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
            $admin->syncRoles([$role]);
        }

        $response = $this->actingAs($admin)
            ->get("http://devclinic.{$baseDomain}/dashboard");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('tenant.id', 'devclinic')
            ->where('tenant.subdomain', 'devclinic')
        );
    }
}
