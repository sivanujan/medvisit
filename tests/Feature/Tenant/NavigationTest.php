<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavigationTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
    }

    public function test_clinic_admin_can_access_all_navigation_routes(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'suwa',
            'name' => 'Suwa Shanthi Clinic',
            'subdomain' => 'suwa',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@suwa.lk',
        ]);

        $routes = [
            '/dashboard',
            '/sessions/today',
            '/calendar',
            '/bookings',
            '/doctors',
            '/patients',
            '/billing',
            '/website',
            '/staff',
            '/settings',
            '/queue/tv',
        ];

        foreach ($routes as $route) {
            $response = $this->actingAs($admin)->get("http://suwa.{$this->baseDomain}{$route}");
            $response->assertStatus(200);
        }
    }

    public function test_receptionist_can_access_clinical_routes_but_is_forbidden_from_admin_settings(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'suwa',
            'name' => 'Suwa Shanthi Clinic',
            'subdomain' => 'suwa',
        ]);

        $receptionist = User::factory()->receptionist()->create([
            'tenant_id' => $tenant->id,
            'email' => 'reception@suwa.lk',
        ]);

        $allowedRoutes = [
            '/dashboard',
            '/sessions/today',
            '/calendar',
            '/bookings',
            '/doctors',
            '/patients',
            '/billing',
            '/queue/tv',
        ];

        foreach ($allowedRoutes as $route) {
            $response = $this->actingAs($receptionist)->get("http://suwa.{$this->baseDomain}{$route}");
            $response->assertStatus(200);
        }

        $forbiddenRoutes = [
            '/website',
            '/staff',
            '/settings',
        ];

        foreach ($forbiddenRoutes as $route) {
            $response = $this->actingAs($receptionist)->get("http://suwa.{$this->baseDomain}{$route}");
            $response->assertStatus(403);
        }
    }

    public function test_doctor_can_access_clinical_schedule_and_queue_but_is_forbidden_from_billing_and_admin(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'suwa',
            'name' => 'Suwa Shanthi Clinic',
            'subdomain' => 'suwa',
        ]);

        $doctor = User::factory()->doctor()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@suwa.lk',
        ]);

        $allowedRoutes = [
            '/dashboard',
            '/sessions/today',
            '/calendar',
            '/patients',
            '/queue/tv',
        ];

        foreach ($allowedRoutes as $route) {
            $response = $this->actingAs($doctor)->get("http://suwa.{$this->baseDomain}{$route}");
            $response->assertStatus(200);
        }

        $forbiddenRoutes = [
            '/bookings',
            '/doctors',
            '/billing',
            '/website',
            '/staff',
            '/settings',
        ];

        foreach ($forbiddenRoutes as $route) {
            $response = $this->actingAs($doctor)->get("http://suwa.{$this->baseDomain}{$route}");
            $response->assertStatus(403);
        }
    }
}
