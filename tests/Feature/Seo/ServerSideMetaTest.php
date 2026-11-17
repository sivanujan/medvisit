<?php

declare(strict_types=1);

namespace Tests\Feature\Seo;

use App\Models\ClinicPage;
use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\Plan;
use App\Models\Tenant;
use App\Support\SeoMeta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServerSideMetaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure plans exist for JSON-LD verification
        if (Plan::count() === 0) {
            Plan::create([
                'name' => 'Basic',
                'slug' => 'basic',
                'price_cents' => 700000,
                'is_active' => true,
                'is_public' => true,
                'description' => 'Everything a small clinic needs.',
            ]);
            Plan::create([
                'name' => 'Pro',
                'slug' => 'pro',
                'price_cents' => 900000,
                'is_active' => true,
                'is_public' => true,
                'description' => 'For growing clinics.',
            ]);
        }
    }

    public function test_homepage_renders_server_side_meta_and_json_ld(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        // Title & Description
        $this->assertStringContainsString('<title inertia>MedVisit — Smart Clinic Management &amp; Doctor Channeling for Sri Lanka</title>', $html);
        $this->assertStringContainsString('<meta name="description" content="Modern OPD clinic management software built for Sri Lankan clinics.', $html);
        $this->assertStringContainsString('head-key="description"', $html);

        // Canonical (root has trailing slash)
        $this->assertStringContainsString('<link rel="canonical" href="http://medvisit.localhost:8000/" head-key="canonical">', $html);

        // Open Graph
        $this->assertStringContainsString('<meta property="og:site_name" content="MedVisit" head-key="og:site_name">', $html);
        $this->assertStringContainsString('<meta property="og:locale" content="en_LK" head-key="og:locale">', $html);
        $this->assertStringContainsString('<meta property="og:type" content="website" head-key="og:type">', $html);
        $this->assertStringContainsString('<meta property="og:title" content="MedVisit — Smart Clinic Management &amp; Doctor Channeling for Sri Lanka" head-key="og:title">', $html);
        $this->assertStringContainsString('head-key="og:image"', $html);
        $this->assertStringContainsString('medvisit-default.png', $html);

        // Twitter
        $this->assertStringContainsString('<meta name="twitter:card" content="summary_large_image" head-key="twitter:card">', $html);

        // Organization JSON-LD with configured address in Kayts, Jaffna, LK
        $this->assertStringContainsString('"@type":"Organization"', $html);
        $this->assertStringContainsString('"addressLocality":"Kayts"', $html);
        $this->assertStringContainsString('"addressRegion":"Jaffna"', $html);
        $this->assertStringContainsString('"addressCountry":"LK"', $html);

        // SoftwareApplication with real prices
        $this->assertStringContainsString('"@type":"SoftwareApplication"', $html);
        $this->assertStringContainsString('"price":"7000"', $html);
        $this->assertStringContainsString('"priceCurrency":"LKR"', $html);

        // Verify Logo exists in public directory
        $this->assertFileExists(public_path('images/medvisit-logo.png'));
    }

    public function test_pricing_page_renders_server_side_meta_and_offers(): void
    {
        $response = $this->get('/pricing');

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        $this->assertStringContainsString('<title inertia>Pricing — MedVisit</title>', $html);
        $this->assertStringContainsString('<meta name="description" content="Transparent monthly plans for Sri Lankan medical practices and dispensaries.', $html);
        $this->assertStringContainsString('/pricing', $html);
        $this->assertStringContainsString('"@type":"SoftwareApplication"', $html);
        $this->assertStringContainsString('"price":"7000"', $html);
    }

    public function test_find_page_renders_server_side_meta(): void
    {
        $response = $this->get('/find');

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        $this->assertStringContainsString('<title inertia>Find Doctors &amp; Medical Clinics in Sri Lanka — MedVisit</title>', $html);
        $this->assertStringContainsString('<meta name="description" content="Search verified medical practitioners, OPD channeling sessions, and clinics across Sri Lanka.', $html);
        $this->assertStringContainsString('/find', $html);
    }

    public function test_templates_page_renders_server_side_meta(): void
    {
        $response = $this->get('/templates');

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        $this->assertStringContainsString('<title inertia>Designer Clinic Website Templates — MedVisit</title>', $html);
        $this->assertStringContainsString('<meta name="description" content="Browse beautiful, high-converting animated website templates crafted specifically for Sri Lankan medical centers', $html);
    }

    public function test_legal_pages_render_server_side_meta(): void
    {
        $termsResponse = $this->get('/terms');
        $termsResponse->assertStatus(200);
        $this->assertStringContainsString('<title inertia>Terms and Conditions — MedVisit</title>', $termsResponse->getContent() ?: '');

        $privacyResponse = $this->get('/privacy-policy');
        $privacyResponse->assertStatus(200);
        $this->assertStringContainsString('<title inertia>Privacy Policy — MedVisit</title>', $privacyResponse->getContent() ?: '');

        $refundResponse = $this->get('/refund-policy');
        $refundResponse->assertStatus(200);
        $this->assertStringContainsString('<title inertia>Refund Policy — MedVisit</title>', $refundResponse->getContent() ?: '');

        $disputeResponse = $this->get('/dispute-policy');
        $disputeResponse->assertStatus(200);
        $this->assertStringContainsString('<title inertia>Dispute Resolution Policy — MedVisit</title>', $disputeResponse->getContent() ?: '');
    }

    public function test_directory_clinic_page_renders_server_side_meta_and_medical_clinic_schema(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Colombo Family Care',
            'subdomain' => 'colombofamily',
            'status' => 'active',
            'phone' => '0112345678',
        ]);

        $doctor = Doctor::create([
            'tenant_id' => $tenant->id,
            'name' => 'Kusal Silva',
            'title' => 'Dr.',
            'specialty' => 'Consultant Pediatrician',
            'slmc_number' => 'SLMC-12345',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $listing = DirectoryListing::create([
            'tenant_id' => $tenant->id,
            'clinic_name' => 'Colombo Family Care',
            'slug' => 'colombo-family-care',
            'district' => 'Colombo',
            'city' => 'Colombo 03',
            'address' => '123 Galle Road',
            'latitude' => 6.9271,
            'longitude' => 79.8612,
            'phone' => '0112345678',
            'online_booking_enabled' => true,
            'is_active' => true,
            'consented_at' => now(),
            'doctor_count' => 1,
        ]);

        DirectoryDoctor::create([
            'tenant_id' => $tenant->id,
            'directory_listing_id' => $listing->id,
            'doctor_id' => $doctor->id,
            'name' => 'Kusal Silva',
            'title' => 'Dr.',
            'specialty' => 'Consultant Pediatrician',
            'slug' => 'dr-kusal-silva',
            'is_active' => true,
        ]);

        $response = $this->get('/clinics/colombo-family-care');

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        // Title & Description (online booking claim present)
        $this->assertStringContainsString('<title inertia>Colombo Family Care — Clinic Channeling &amp; Doctor Schedule</title>', $html);
        $this->assertStringContainsString('View doctor appointment schedules, consultation fees, and channeling at Colombo Family Care in Colombo 03, Colombo. Book online tokens directly.', $html);

        // Self-canonical
        $this->assertStringContainsString('/clinics/colombo-family-care', $html);
        $this->assertStringContainsString('head-key="canonical"', $html);

        // Clinic share image is used as OG image
        $this->assertStringContainsString('share-image.png', $html);

        // MedicalClinic JSON-LD (maps Consultant Pediatrician -> Pediatric)
        $this->assertStringContainsString('"@type":"MedicalClinic"', $html);
        $this->assertStringContainsString('"name":"Colombo Family Care"', $html);
        $this->assertStringContainsString('"telephone":"0112345678"', $html);
        $this->assertStringContainsString('"medicalSpecialty":"Pediatric"', $html);
        $this->assertStringNotContainsString('"medicalSpecialty":"Consultant Pediatrician"', $html);
        $this->assertStringContainsString('"latitude":6.9271', $html);
    }

    public function test_location_description_deduplicates_identical_city_district_and_reflects_booking_status(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Galle Central Dispensary',
            'subdomain' => 'gallecentral',
            'status' => 'active',
            'phone' => '0912233445',
        ]);

        // When city and district are identical ("Galle" and "Galle"), avoid "Galle, Galle"
        // When online_booking_enabled is false, show "Call the clinic directly to book."
        $listing = DirectoryListing::create([
            'tenant_id' => $tenant->id,
            'clinic_name' => 'Galle Central Dispensary',
            'slug' => 'galle-central',
            'district' => 'Galle',
            'city' => 'Galle',
            'address' => '10 Main Street',
            'phone' => '0912233445',
            'online_booking_enabled' => false,
            'is_active' => true,
            'consented_at' => now(),
            'doctor_count' => 0,
        ]);

        $response = $this->get('/clinics/galle-central');
        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        // Should say "in Galle." and NOT "in Galle, Galle"
        $this->assertStringContainsString('in Galle. Call the clinic directly to book.', $html);
        $this->assertStringNotContainsString('Galle, Galle', $html);
        $this->assertStringNotContainsString('Book online tokens directly', $html);
    }

    public function test_directory_doctor_page_renders_server_side_meta_and_physician_schema(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Kandy Medical Clinic',
            'subdomain' => 'kandymed',
            'status' => 'active',
            'phone' => '0812345678',
        ]);

        $doctor = Doctor::create([
            'tenant_id' => $tenant->id,
            'name' => 'Anura Perera',
            'title' => 'Dr.',
            'specialty' => 'Consultant Cardiologist',
            'slmc_number' => 'SLMC-99999',
            'doctor_fee' => 300000,
            'clinic_fee' => 60000,
            'is_active' => true,
        ]);

        $listing = DirectoryListing::create([
            'tenant_id' => $tenant->id,
            'clinic_name' => 'Kandy Medical Clinic',
            'slug' => 'kandy-medical-clinic',
            'district' => 'Kandy',
            'city' => 'Kandy',
            'address' => '45 Peradeniya Road',
            'phone' => '0812345678',
            'online_booking_enabled' => true,
            'is_active' => true,
            'consented_at' => now(),
            'doctor_count' => 1,
        ]);

        DirectoryDoctor::create([
            'tenant_id' => $tenant->id,
            'directory_listing_id' => $listing->id,
            'doctor_id' => $doctor->id,
            'name' => 'Anura Perera',
            'title' => 'Dr.',
            'specialty' => 'Consultant Cardiologist',
            'slug' => 'dr-anura-perera',
            'is_active' => true,
        ]);

        $response = $this->get('/doctors/kandy-medical-clinic/dr-anura-perera');

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        // Title & Description (location avoids "Kandy, Kandy")
        $this->assertStringContainsString('Dr. Anura Perera (Consultant Cardiologist) — Kandy Medical Clinic, Kandy', $html);
        $this->assertStringNotContainsString('Kandy, Kandy', $html);
        $this->assertStringContainsString('Consultation schedules, channeling tokens, and appointments for Dr. Anura Perera', $html);

        // Self-canonical
        $this->assertStringContainsString('/doctors/kandy-medical-clinic/dr-anura-perera', $html);

        // Physician JSON-LD preserves the clinical title on Physician
        $this->assertStringContainsString('"@type":"Physician"', $html);
        $this->assertStringContainsString('"name":"Dr. Anura Perera"', $html);
        $this->assertStringContainsString('"medicalSpecialty":"Consultant Cardiologist"', $html);
        $this->assertStringContainsString('"worksFor":{', $html);
        $this->assertStringContainsString('"name":"Kandy Medical Clinic"', $html);
    }

    public function test_tenant_subdomain_public_home_renders_subdomain_canonical_with_trailing_slash(): void
    {
        $slug = 'care'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Care Family Clinic',
            'subdomain' => $slug,
            'status' => 'active',
            'phone' => '0119876543',
            'website_published' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/");

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        // Canonical points to tenant subdomain root with trailing slash
        $this->assertStringContainsString("<link rel=\"canonical\" href=\"http://{$domain}:8000/\"", $html);

        // OG image points to tenant share-image.png
        $this->assertStringContainsString("http://{$domain}:8000/share-image.png", $html);

        // MedicalClinic JSON-LD url has trailing slash
        $this->assertStringContainsString('"@type":"MedicalClinic"', $html);
        $this->assertStringContainsString('"url":"http://'.$domain.':8000/"', $html);
    }

    public function test_tenant_subdomain_public_custom_page_renders_subdomain_canonical(): void
    {
        $slug = 'care'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Care Family Clinic',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => true,
        ]);

        $page = ClinicPage::create([
            'tenant_id' => (string) $tenant->id,
            'title' => 'Dental Care Services',
            'slug' => 'dental-services',
            'is_homepage' => false,
            'is_published' => true,
            'seo_title' => 'Advanced Dental Care in Colombo — Care Family Clinic',
            'seo_description' => 'Gentle pediatric and adult dentistry services at Care Family Clinic.',
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/p/dental-services");

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        $this->assertStringContainsString('<title inertia>Advanced Dental Care in Colombo — Care Family Clinic</title>', $html);
        $this->assertStringContainsString('Gentle pediatric and adult dentistry services', $html);
        $this->assertStringContainsString("<link rel=\"canonical\" href=\"http://{$domain}:8000/p/dental-services\"", $html);
    }

    public function test_tenant_subdomain_public_booking_renders_booking_meta(): void
    {
        $slug = 'care'.substr(md5(uniqid()), 0, 8);
        $tenant = Tenant::factory()->create([
            'name' => 'Care Family Clinic',
            'subdomain' => $slug,
            'status' => 'active',
            'website_published' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $domain = "{$slug}.{$baseDomain}";

        $response = $this->get("http://{$domain}:8000/book");

        $response->assertStatus(200);
        $html = $response->getContent() ?: '';

        $this->assertStringContainsString('Book a Doctor Channeling Token — Care Family Clinic', $html);
        $this->assertStringContainsString("<link rel=\"canonical\" href=\"http://{$domain}:8000/book\"", $html);
    }

    /**
     * Requirement 2: Verify that in production (APP_ENV=production),
     * no generated URL contains localhost, .test or http://
     */
    public function test_production_urls_never_contain_localhost_test_or_http(): void
    {
        config([
            'app.env' => 'production',
            'medvisit.public_domain' => 'medvisit.lk',
        ]);

        $tenant = Tenant::factory()->create([
            'name' => 'Apex Health',
            'subdomain' => 'apexhealth',
            'status' => 'active',
            'phone' => '0112233445',
            'website_published' => true,
        ]);

        $doctor = Doctor::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sunil Fernando',
            'title' => 'Dr.',
            'specialty' => 'Cardiologist',
            'slmc_number' => 'SLMC-77777',
            'doctor_fee' => 250000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $listing = DirectoryListing::create([
            'tenant_id' => $tenant->id,
            'clinic_name' => 'Apex Health',
            'slug' => 'apex-health',
            'district' => 'Colombo',
            'city' => 'Colombo 07',
            'address' => '10 Ward Place',
            'phone' => '0112233445',
            'online_booking_enabled' => true,
            'is_active' => true,
            'consented_at' => now(),
            'doctor_count' => 1,
        ]);

        $dirDoctor = DirectoryDoctor::create([
            'tenant_id' => $tenant->id,
            'directory_listing_id' => $listing->id,
            'doctor_id' => $doctor->id,
            'name' => 'Sunil Fernando',
            'title' => 'Dr.',
            'specialty' => 'Cardiologist',
            'slug' => 'dr-sunil-fernando',
            'is_active' => true,
        ]);

        $homeSeo = SeoMeta::forHome();
        $pricingSeo = SeoMeta::forPricing();
        $findSeo = SeoMeta::forFind();
        $clinicSeo = SeoMeta::forDirectoryClinic($listing);
        $doctorSeo = SeoMeta::forDirectoryDoctor($listing, $dirDoctor);
        $tenantSeo = SeoMeta::forTenantHome($tenant);
        $bookingSeo = SeoMeta::forTenantBooking($tenant, $doctor);

        $metas = [$homeSeo, $pricingSeo, $findSeo, $clinicSeo, $doctorSeo, $tenantSeo, $bookingSeo];

        foreach ($metas as $meta) {
            $data = $meta->toViewData();
            $serialized = json_encode($data, JSON_UNESCAPED_SLASHES);

            $this->assertIsString($serialized);
            // Must use HTTPS
            $this->assertStringContainsString('https://', $serialized);

            // Must NOT contain insecure or local domains
            $this->assertStringNotContainsString('http://', $serialized);
            $this->assertStringNotContainsString('localhost', $serialized);
            $this->assertStringNotContainsString('.test', $serialized);
        }

        // Check canonical root URLs end with trailing slash in production
        $this->assertEquals('https://medvisit.lk/', $homeSeo->canonical);
        $this->assertEquals('https://apexhealth.medvisit.lk/', $tenantSeo->canonical);

        // Check non-root paths do NOT have trailing slash
        $this->assertEquals('https://medvisit.lk/pricing', $pricingSeo->canonical);
        $this->assertEquals('https://medvisit.lk/find', $findSeo->canonical);
        $this->assertEquals('https://medvisit.lk/clinics/apex-health', $clinicSeo->canonical);
        $this->assertEquals('https://apexhealth.medvisit.lk/book/dr-sunil-fernando', $bookingSeo->canonical);
    }
}
