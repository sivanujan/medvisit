<?php

declare(strict_types=1);

namespace Tests\Feature\Seo;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ZiggyRouteLeakTest extends TestCase
{
    use RefreshDatabase;

    public function test_pricing_page_only_exposes_public_ziggy_routes(): void
    {
        $response = $this->get('/pricing');

        $response->assertStatus(200);

        $content = $response->getContent() ?: '';

        // Must contain Ziggy and public routes
        $this->assertStringContainsString('pricing', $content);

        // Must NOT contain super_admin routes, admin login, or internal pharmacy/staff routes
        $this->assertStringNotContainsString('"super_admin.', $content);
        $this->assertStringNotContainsString('super_admin.dashboard', $content);
        $this->assertStringNotContainsString('super_admin.referrals', $content);
        $this->assertStringNotContainsString('tenant.pharmacy.', $content);
    }

    public function test_public_clinic_page_does_not_leak_super_admin_routes(): void
    {
        $slug = 'ziggy'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'subdomain' => $slug,
            'status' => 'active',
        ]);
        $domain = "{$slug}.".config('medvisit.base_domain', 'medvisit.localhost');

        $response = $this->get("http://{$domain}:8000/");

        $response->assertStatus(200);

        $content = $response->getContent() ?: '';

        $this->assertStringNotContainsString('"super_admin.', $content);
        $this->assertStringNotContainsString('super_admin.dashboard', $content);
        $this->assertStringNotContainsString('tenant.pharmacy.', $content);
    }

    public function test_super_admin_page_receives_super_admin_routes(): void
    {
        Role::firstOrCreate(['name' => 'super_admin']);
        $admin = User::factory()->create();
        $admin->assignRole('super_admin');

        $response = $this->actingAs($admin)->get('/super-admin/dashboard');

        $response->assertStatus(200);

        $content = $response->getContent() ?: '';

        $this->assertStringContainsString('super_admin.dashboard', $content);
    }
}
