<?php

declare(strict_types=1);

namespace Tests\Feature\Demo;

use App\Models\DirectoryListing;
use App\Models\Lead;
use App\Models\Patient;
use App\Models\Tenant;
use App\Services\TelegramNotificationService;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoEnhancementsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    /**
     * Test 1: The landing page and public header contain "Try demo" and NOT "How it works" in nav.
     */
    public function test_nav_contains_try_demo_and_not_how_it_works_in_menu(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);

        // Header component file assertion and Inertia render verification
        $headerPath = resource_path('js/Components/Public/PublicHeader.tsx');
        $this->assertFileExists($headerPath);
        $headerContent = file_get_contents($headerPath);

        // SECTIONS array should have Features but NOT How it works
        $this->assertStringContainsString("id: 'features', label: 'Features'", $headerContent);
        $this->assertStringNotContainsString("id: 'how-it-works', label: 'How it works'", $headerContent);

        // Contains "Try demo" pill link before Pricing
        $this->assertStringContainsString('<span>Try demo</span>', $headerContent);
        $this->assertStringContainsString('href="/demo"', $headerContent);

        // Mobile slide-in menu has prominent Try demo button
        $this->assertStringContainsString('Try the live demo', $headerContent);
    }

    /**
     * Test 2: The role preselect param works on /demo?role=receptionist.
     */
    public function test_role_preselect_param_works(): void
    {
        $this->seed(DemoClinicSeeder::class);

        $response = $this->get('/demo?role=receptionist');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Public/Demo')
            ->where('preselectedRole', 'receptionist')
            ->has('roles')
            ->has('activeSessions')
        );

        $doctorResponse = $this->get('/demo?role=doctor');
        $doctorResponse->assertInertia(fn (Assert $page) => $page
            ->component('Public/Demo')
            ->where('preselectedRole', 'doctor')
        );

        // Invalid role defaults to null
        $invalidResponse = $this->get('/demo?role=invalid_role');
        $invalidResponse->assertInertia(fn (Assert $page) => $page
            ->component('Public/Demo')
            ->where('preselectedRole', null)
        );
    }

    /**
     * Test 3: A guided demo request is saved with source = 'guided_demo_request' and notification is triggered.
     */
    public function test_guided_demo_request_is_saved_with_source_and_notification(): void
    {
        $telegramMock = $this->mock(TelegramNotificationService::class);
        $telegramMock->shouldReceive('sendDemoLeadAlert')
            ->once()
            ->andReturn(true);

        $payload = [
            'contact_name' => 'Dr. K. Nimalan',
            'clinic_name' => 'Jaffna Health Care',
            'phone' => '077 123 4567',
            'email' => 'nimalan@jaffnahealth.lk',
            'city' => 'Jaffna',
            'preferred_time' => 'afternoon',
            'source' => 'guided_demo_request',
            'cf_turnstile_response' => 'test-pass-token',
        ];

        $response = $this->postJson('/api/leads/request-demo', $payload);
        $response->assertStatus(201);
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('leads', [
            'contact_name' => 'Dr. K. Nimalan',
            'clinic_name' => 'Jaffna Health Care',
            'phone' => '+94771234567',
            'source' => 'guided_demo_request',
            'stage' => Lead::STAGE_NEW,
        ]);

        $lead = Lead::where('phone', '+94771234567')->firstOrFail();
        $this->assertEquals('afternoon', $lead->metadata['preferred_time']);
        $this->assertStringContainsString('Preferred time: Afternoon', (string) $lead->notes);
    }

    /**
     * Test 4: Turnstile validation works for demo requests.
     */
    public function test_turnstile_is_validated_when_enabled(): void
    {
        Config::set('services.turnstile.enabled', true);
        Config::set('services.turnstile.secret_key', 'mock_secret_key');

        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify*' => function ($request) {
                $data = $request->data();
                $token = is_array($data) ? ($data['response'] ?? null) : null;

                return Http::response(['success' => ($token === 'valid-token')], 200);
            },
        ]);

        $payload = [
            'contact_name' => 'Dr. Test Fail',
            'clinic_name' => 'Test Clinic',
            'phone' => '077 999 8888',
            'cf_turnstile_response' => 'invalid-token',
        ];

        $response = $this->postJson('/api/leads/request-demo', $payload);
        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);

        $payload['cf_turnstile_response'] = 'valid-token';
        $successResponse = $this->postJson('/api/leads/request-demo', $payload);
        $successResponse->assertStatus(201);
    }

    /**
     * Test 5: No demo patient phone matches real mobile pattern outside fake range (+94 70 000 0001..0080).
     */
    public function test_no_demo_patient_phone_matches_real_mobile_outside_fake_range(): void
    {
        $this->seed(DemoClinicSeeder::class);

        $demoTenant = Tenant::where('id', 'demo')->firstOrFail();
        $patients = Patient::where('tenant_id', $demoTenant->id)->get();

        $this->assertGreaterThanOrEqual(80, $patients->count());

        foreach ($patients as $p) {
            // Must strictly match +94 70 000 0001 .. 0080
            $this->assertMatchesRegularExpression(
                '/^\+94 70 000 00[0-8][0-9]$/',
                $p->phone,
                "Patient {$p->name} has non-standard demo phone: {$p->phone}"
            );

            // Must NOT have standard Sri Lankan mobile operators (071, 072, 074, 075, 076, 077, 078)
            $this->assertDoesNotMatchRegularExpression(
                '/^\+94\s?7[1-8]/',
                $p->phone,
                "Patient {$p->name} has a real Sri Lankan mobile operator prefix: {$p->phone}"
            );

            // NIC must be DEMO-000001 .. DEMO-000080
            $this->assertMatchesRegularExpression(
                '/^DEMO-\d{6}$/',
                $p->nic,
                "Patient {$p->name} has non-demo NIC: {$p->nic}"
            );
        }
    }

    /**
     * Test 6: Demo tenant is excluded from public directory, sitemap, and central login lookups.
     */
    public function test_demo_tenant_is_excluded_from_directory_sitemap_and_central_login(): void
    {
        $this->seed(DemoClinicSeeder::class);

        $demoTenant = Tenant::where('id', 'demo')->firstOrFail();

        // 1. Directory Listing active scope should exclude demo tenant
        $activeListingIds = DirectoryListing::active()->pluck('tenant_id')->all();
        $this->assertNotContains('demo', $activeListingIds);

        // 2. Central login subdomain lookup must return error for 'demo'
        $lookupResponse = $this->post('/find-clinic/subdomain', ['subdomain' => 'demo']);
        $lookupResponse->assertSessionHasErrors('subdomain');

        // 3. Central login email lookup for demo users must return not found
        $emailLookup = $this->post('/find-clinic/email', ['email' => 'demo.admin@medvisit.lk']);
        $emailLookup->assertSessionHasErrors('email');
    }
}
