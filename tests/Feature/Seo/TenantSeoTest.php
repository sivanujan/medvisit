<?php

declare(strict_types=1);

namespace Tests\Feature\Seo;

use App\Models\BookingToken;
use App\Models\ClinicPage;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantSeoTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_robots_txt_for_active_clinic_allows_public_and_disallows_staff_with_sitemap(): void
    {
        $slug = 'care'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Care Family Health',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/robots.txt");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');

        $body = $response->getContent() ?: '';

        // Must allow public pages
        $this->assertStringContainsString("User-agent: *\n", $body);
        $this->assertStringContainsString("Allow: /\n", $body);
        $this->assertStringContainsString("Allow: /p/\n", $body);
        $this->assertStringContainsString("Allow: /book\n", $body);
        $this->assertStringContainsString("Allow: /share-image.png\n", $body);

        // Must disallow queue and staff/private areas
        $this->assertStringContainsString("Disallow: /queue\n", $body);
        $this->assertStringContainsString("Disallow: /dashboard\n", $body);
        $this->assertStringContainsString("Disallow: /admin\n", $body);
        $this->assertStringContainsString("Disallow: /reception\n", $body);
        $this->assertStringContainsString("Disallow: /doctor\n", $body);
        $this->assertStringContainsString("Disallow: /pharmacy\n", $body);
        $this->assertStringContainsString("Disallow: /billing\n", $body);
        $this->assertStringContainsString("Disallow: /settings\n", $body);
        $this->assertStringContainsString("Disallow: /tokens/\n", $body);
        $this->assertStringContainsString("Disallow: /login\n", $body);
        $this->assertStringContainsString("Disallow: /setup\n", $body);

        // Must include tenant sitemap line
        $this->assertStringContainsString("Sitemap: http://{$domain}:8000/sitemap.xml", $body);
    }

    public function test_tenant_robots_txt_for_demo_tenant_disallows_all_with_noindex(): void
    {
        $slug = 'demo'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Demo Practice',
            'subdomain' => $slug,
            'status' => 'active',
            'is_demo' => true,
            'website_published' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/robots.txt");

        $response->assertStatus(200);
        $this->assertStringContainsString('noindex', (string) $response->headers->get('X-Robots-Tag'));

        $body = $response->getContent() ?: '';
        $this->assertStringContainsString("User-agent: *\nDisallow: /\n", $body);
        $this->assertStringNotContainsString('Allow: /', $body);
    }

    public function test_tenant_robots_txt_for_unpublished_or_inactive_clinic_disallows_all(): void
    {
        $slug = 'unpub'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Unpublished Clinic',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => false,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/robots.txt");

        $response->assertStatus(200);
        $this->assertStringContainsString('noindex', (string) $response->headers->get('X-Robots-Tag'));

        $body = $response->getContent() ?: '';
        $this->assertStringContainsString("User-agent: *\nDisallow: /\n", $body);
    }

    public function test_tenant_sitemap_xml_for_active_clinic_includes_home_published_pages_and_booking(): void
    {
        $slug = 'clinic'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Lanka Medical Care',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => true,
            'online_booking_enabled' => true,
        ]);

        // Published page
        $publishedPage = ClinicPage::create([
            'tenant_id' => (string) $tenant->id,
            'title' => 'Laboratory Services',
            'slug' => 'lab-services',
            'is_homepage' => false,
            'is_published' => true,
        ]);

        // Draft page (must be excluded)
        ClinicPage::create([
            'tenant_id' => (string) $tenant->id,
            'title' => 'Secret Draft Project',
            'slug' => 'secret-draft',
            'is_homepage' => false,
            'is_published' => false,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/sitemap.xml");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/xml');

        $xml = $response->getContent() ?: '';

        // Must include root "/" with trailing slash
        $this->assertStringContainsString("<loc>http://{$domain}:8000/</loc>", $xml);
        $this->assertStringContainsString('<priority>1.0</priority>', $xml);

        // Must include published page "/p/lab-services"
        $this->assertStringContainsString("<loc>http://{$domain}:8000/p/lab-services</loc>", $xml);
        $this->assertStringContainsString('<priority>0.8</priority>', $xml);

        // Must include lastmod from updated_at
        $this->assertStringContainsString($publishedPage->updated_at->toAtomString(), $xml);

        // Must NOT include unpublished draft page
        $this->assertStringNotContainsString('secret-draft', $xml);

        // Must include "/book" because online booking is enabled
        $this->assertStringContainsString("<loc>http://{$domain}:8000/book</loc>", $xml);
        $this->assertStringContainsString('<priority>0.9</priority>', $xml);
    }

    public function test_tenant_sitemap_xml_for_demo_or_inactive_clinic_returns_empty_with_noindex(): void
    {
        $slug = 'demosite'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Demo Site',
            'subdomain' => $slug,
            'status' => 'active',
            'is_demo' => true,
            'website_published' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/sitemap.xml");

        $response->assertStatus(200);
        $this->assertStringContainsString('noindex', (string) $response->headers->get('X-Robots-Tag'));

        $xml = $response->getContent() ?: '';
        $this->assertStringNotContainsString('<loc>', $xml);
    }

    public function test_public_queue_and_token_status_pages_have_noindex_header_and_meta(): void
    {
        $slug = 'carequeue'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Care Queue Clinic',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        // 1. GET /queue
        $queueResponse = $this->get("http://{$domain}:8000/queue");
        $queueResponse->assertStatus(200);
        $this->assertStringContainsString('noindex', (string) $queueResponse->headers->get('X-Robots-Tag'));
        $queueResponse->assertSee('<meta name="robots" content="noindex, nofollow" head-key="robots">', false);

        // 2. GET /tokens/{token}/status
        $doctor = Doctor::factory()->create(['tenant_id' => $tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $tenant->id,
            'doctor_id' => $doctor->id,
        ]);
        $patient = Patient::factory()->create(['tenant_id' => $tenant->id]);
        $token = BookingToken::factory()->create([
            'tenant_id' => $tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'status' => 'booked',
            'signed_cancel_token' => 'test-cancel-token-xyz',
        ]);

        $tokenResponse = $this->get("http://{$domain}:8000/tokens/{$token->signed_cancel_token}/status");
        $tokenResponse->assertStatus(200);
        $this->assertStringContainsString('noindex', (string) $tokenResponse->headers->get('X-Robots-Tag'));
        $tokenResponse->assertSee('<meta name="robots" content="noindex, nofollow" head-key="robots">', false);
    }

    public function test_tenant_robots_txt_disallows_book_when_online_booking_disabled(): void
    {
        $slug = 'nobook'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'No Book Clinic',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => true,
            'online_booking_enabled' => false,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/robots.txt");
        $response->assertStatus(200);

        $body = $response->getContent() ?: '';
        $this->assertStringContainsString("Disallow: /book\n", $body);
        $this->assertStringNotContainsString("Allow: /book\n", $body);
    }
}
