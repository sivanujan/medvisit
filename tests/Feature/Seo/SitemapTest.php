<?php

declare(strict_types=1);

namespace Tests\Feature\Seo;

use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\WebsiteTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class SitemapTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitemap_returns_valid_xml_with_standard_pages(): void
    {
        Config::set('medvisit.prelaunch_mode', false);

        $response = $this->get('/sitemap.xml');

        $response->assertStatus(200);
        $this->assertStringContainsString('application/xml', (string) $response->headers->get('Content-Type'));

        $content = $response->getContent() ?: '';
        $this->assertStringContainsString('/find</loc>', $content);
        $this->assertStringContainsString('/pricing</loc>', $content);
        $this->assertStringContainsString('/terms</loc>', $content);
    }

    public function test_sitemap_excludes_homepage_when_prelaunch_mode_is_active(): void
    {
        Config::set('medvisit.prelaunch_mode', true);

        $response = $this->get('/sitemap.xml');

        $response->assertStatus(200);
        $content = $response->getContent() ?: '';

        // Loc ending in just domain with no trailing path should not be present
        $baseUrl = rtrim(config('app.url', 'https://medvisit.lk'), '/');
        $this->assertStringNotContainsString("<loc>{$baseUrl}</loc>", $content);
        $this->assertStringContainsString('/find</loc>', $content);
        $this->assertStringContainsString('/pricing</loc>', $content);
    }

    public function test_sitemap_includes_templates_when_active_template_exists(): void
    {
        WebsiteTemplate::create([
            'slug' => 'modern-clean',
            'name' => 'Modern Clean',
            'tagline' => 'Crisp healthcare design',
            'description' => 'A clean modern clinic template',
            'definition' => ['theme' => 'clean', 'sections' => []],
            'tier' => WebsiteTemplate::TIER_FREE,
            'price_cents' => 0,
            'is_active' => true,
        ]);

        $response = $this->get('/sitemap.xml');

        $response->assertStatus(200);
        $content = $response->getContent() ?: '';
        $this->assertStringContainsString('/templates</loc>', $content);
    }

    public function test_sitemap_excludes_unpaid_demo_and_test_clinics(): void
    {
        // 1. Unpaid trial tenant (no paid invoices)
        $unpaidTenant = Tenant::factory()->create([
            'subdomain' => 'unpaidclinic',
            'status' => 'active',
            'is_demo' => false,
        ]);
        $unpaidListing = DirectoryListing::create([
            'tenant_id' => $unpaidTenant->id,
            'clinic_name' => 'Unpaid Clinic',
            'slug' => 'unpaidclinic',
            'district' => 'Colombo',
            'city' => 'Colombo 03',
            'phone' => '0771234567',
            'is_active' => true,
            'consented_at' => now(),
        ]);

        // 2. Test clinic 'normal'
        $testTenant = Tenant::factory()->create([
            'subdomain' => 'normal',
            'status' => 'active',
            'is_demo' => false,
        ]);
        DirectoryListing::create([
            'tenant_id' => $testTenant->id,
            'clinic_name' => 'Normal Test Clinic',
            'slug' => 'normal',
            'district' => 'Kandy',
            'city' => 'Kandy',
            'phone' => '0777654321',
            'is_active' => true,
            'consented_at' => now(),
        ]);

        // 3. Demo clinic
        $demoTenant = Tenant::factory()->create([
            'subdomain' => 'demo',
            'status' => 'active',
            'is_demo' => true,
        ]);
        DirectoryListing::create([
            'tenant_id' => $demoTenant->id,
            'clinic_name' => 'Demo Clinic',
            'slug' => 'demo',
            'district' => 'Galle',
            'city' => 'Galle',
            'phone' => '0779876543',
            'is_active' => true,
            'consented_at' => now(),
        ]);

        // 4. Inactive clinic
        $inactiveTenant = Tenant::factory()->create([
            'subdomain' => 'inactiveclinic',
            'status' => 'inactive',
            'is_demo' => false,
        ]);
        DirectoryListing::create([
            'tenant_id' => $inactiveTenant->id,
            'clinic_name' => 'Inactive Clinic',
            'slug' => 'inactiveclinic',
            'district' => 'Jaffna',
            'city' => 'Jaffna',
            'phone' => '0773334444',
            'is_active' => false,
            'consented_at' => null,
        ]);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent() ?: '';

        $this->assertStringNotContainsString('/clinics/unpaidclinic', $content);
        $this->assertStringNotContainsString('/clinics/normal', $content);
        $this->assertStringNotContainsString('/clinics/demo', $content);
        $this->assertStringNotContainsString('/clinics/inactiveclinic', $content);
    }

    public function test_sitemap_includes_active_paying_clinics_with_directory_consent(): void
    {
        $plan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            ['name' => 'Pro', 'price_cents' => 1200000, 'is_active' => true]
        );

        $payingTenant = Tenant::factory()->create([
            'subdomain' => 'apexfamily',
            'status' => 'active',
            'is_demo' => false,
        ]);

        $subscription = Subscription::create([
            'tenant_id' => $payingTenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        SubscriptionInvoice::create([
            'tenant_id' => $payingTenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-TEST-001',
            'amount_cents' => 1200000,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $doctor = Doctor::create([
            'tenant_id' => $payingTenant->id,
            'name' => 'Sunil Shantha',
            'specialty' => 'Cardiologist',
            'slmc_number' => '12345',
            'is_active' => true,
        ]);

        $listing = DirectoryListing::create([
            'tenant_id' => $payingTenant->id,
            'clinic_name' => 'Apex Family Health',
            'slug' => 'apexfamily',
            'district' => 'Colombo',
            'city' => 'Colombo 03',
            'phone' => '0771234567',
            'is_active' => true,
            'consented_at' => now(),
        ]);

        DirectoryDoctor::create([
            'directory_listing_id' => $listing->id,
            'tenant_id' => $payingTenant->id,
            'doctor_id' => $doctor->id,
            'name' => 'Dr. Sunil Shantha',
            'title' => 'Dr.',
            'specialty' => 'Cardiologist',
            'slug' => 'dr-sunil-shantha',
            'is_active' => true,
        ]);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent() ?: '';

        $this->assertStringContainsString('/clinics/apexfamily', $content);
        $this->assertStringContainsString('/doctors/apexfamily/dr-sunil-shantha', $content);
    }

    public function test_robots_txt_has_disallow_rules_and_sitemap(): void
    {
        $response = $this->get('/robots.txt');

        $response->assertStatus(200);
        $content = $response->getContent() ?: '';

        $this->assertStringContainsString('Disallow: /super-admin', $content);
        $this->assertStringContainsString('Disallow: /login', $content);
        $this->assertStringContainsString('Disallow: /admin/login', $content);
        $this->assertStringContainsString('Sitemap: https://medvisit.lk/sitemap.xml', $content);
    }
}
