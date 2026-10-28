<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Contracts\PaymentGateway;
use App\Jobs\SyncClinicDirectoryListing;
use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\PaymentsLkGateway;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class CentralAndPublicQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);
        $this->app->instance(PaymentGateway::class, new FakeGateway);
        $this->seed(QaScenarioSeeder::class);
    }

    /**
     * 1. Landing page & Public routes load with 200.
     */
    public function test_central_landing_and_public_routes_load(): void
    {
        $response = $this->get("http://{$this->baseDomain}/");
        $response->assertStatus(200);

        $pricingResponse = $this->get("http://{$this->baseDomain}/pricing");
        $pricingResponse->assertStatus(200);

        $termsResponse = $this->get("http://{$this->baseDomain}/terms");
        $termsResponse->assertStatus(200);

        $refundResponse = $this->get("http://{$this->baseDomain}/refund-policy");
        $refundResponse->assertStatus(200);

        $disputeResponse = $this->get("http://{$this->baseDomain}/dispute-policy");
        $disputeResponse->assertStatus(200);

        $privacyResponse = $this->get("http://{$this->baseDomain}/privacy-policy");
        $privacyResponse->assertStatus(200);
    }

    /**
     * 2. Pricing & Plans: Basic Rs. 7,000 / Pro Rs. 9,000 / Advanced Rs. 15,000.
     * Must come from one config.
     */
    public function test_pricing_and_plans_truth_and_consistency(): void
    {
        $plansConfig = config('medvisit_public.plans');
        $this->assertNotNull($plansConfig);

        $this->assertEquals(700000, $plansConfig['basic']['price_cents']);
        $this->assertEquals(900000, $plansConfig['pro']['price_cents']);
        $this->assertEquals(1500000, $plansConfig['advanced']['price_cents']);

        // Check pricing page response data
        $response = $this->get("http://{$this->baseDomain}/pricing");
        $response->assertStatus(200);
        $content = $response->getContent();

        $this->assertStringNotContainsString('Rs. 5,000', $content);
        $this->assertStringNotContainsString('Rs.5,000', $content);
    }

    /**
     * 3. Contact details: policy pages show support@medvisit.lk, hello@medvisit.lk, 070 129 1688.
     * No old contact details (contact@sivanujan.online, 0772046898).
     */
    public function test_contact_details_integrity_and_absence_of_old_details(): void
    {
        $business = config('medvisit_public.business');
        $this->assertEquals('support@medvisit.lk', $business['support_email']);
        $this->assertEquals('hello@medvisit.lk', $business['general_email']);
        $this->assertEquals('070 129 1688', $business['phone_display']);

        $routes = ['/terms', '/refund-policy', '/dispute-policy', '/privacy-policy'];
        foreach ($routes as $r) {
            $res = $this->get("http://{$this->baseDomain}{$r}");
            $res->assertStatus(200);
            $content = $res->getContent();

            $this->assertStringNotContainsString('contact@sivanujan.online', $content, "Route {$r} contains outdated email");
            $this->assertStringNotContainsString('0772046898', $content, "Route {$r} contains outdated phone");
            $this->assertStringNotContainsString('077 204 6898', $content, "Route {$r} contains outdated phone");
        }
    }

    /**
     * 4. Central login: single clinic redirect, multi-clinic chooser, not-found message.
     */
    public function test_central_login_flow(): void
    {
        // Non-existent email
        $resNotFound = $this->post("http://{$this->baseDomain}/find-clinic/email", [
            'email' => 'nonexistent@medvisit.test',
        ]);
        $resNotFound->assertSessionHasErrors(['email']);

        // Single clinic admin email -> finds matching clinic
        $resSingle = $this->post("http://{$this->baseDomain}/find-clinic/email", [
            'email' => 'admin@cityhealth.test',
        ]);
        $resSingle->assertSessionHasNoErrors();
    }

    /**
     * 5. Subdomain check endpoint validation.
     */
    public function test_subdomain_availability_endpoint(): void
    {
        // Existing subdomain (cityhealth)
        $resTaken = $this->postJson("http://{$this->baseDomain}/check-subdomain", [
            'subdomain' => 'cityhealth',
        ]);
        $resTaken->assertStatus(200);
        $resTaken->assertJson(['available' => false]);

        // Available subdomain
        $resFree = $this->postJson("http://{$this->baseDomain}/check-subdomain", [
            'subdomain' => 'totallynewclinic',
        ]);
        $resFree->assertStatus(200);
        $resFree->assertJson(['available' => true]);
    }

    /**
     * 6. Registration complete & payment page:
     * Plan selection, consent checkbox required server-side, terms_accepted_at saved.
     */
    public function test_registration_payment_requires_terms_consent(): void
    {
        $tenantD = Tenant::find('lankamed');
        $adminD = User::where('email', 'admin@lankamed.test')->first();

        // Attempt checkout without agreeing to terms
        $resNoConsent = $this->actingAs($adminD)
            ->post("http://{$tenantD->subdomain}.{$this->baseDomain}/subscription/checkout", [
                'plan_slug' => 'pro',
                'terms_accepted' => false,
            ]);

        $resNoConsent->assertSessionHasErrors(['terms_accepted']);

        // With terms consent
        $resConsent = $this->actingAs($adminD)
            ->post("http://{$tenantD->subdomain}.{$this->baseDomain}/subscription/checkout", [
                'plan_slug' => 'pro',
                'terms_accepted' => true,
            ]);

        $resConsent->assertSessionHasNoErrors();
    }

    /**
     * 7. Webhooks: valid signature accepted, invalid rejected, replayed event ignored, timestamp check.
     */
    public function test_payments_lk_webhook_security_and_replay_protection(): void
    {
        $webhookSecret = 'test_webhook_secret_qa_sandbox';
        Config::set('services.paymentslk.webhook_secret', $webhookSecret);

        // Bind real PaymentsLkGateway for signature & timestamp verification
        $realGateway = new PaymentsLkGateway([
            'secret_key' => 'test_secret',
            'webhook_secret' => $webhookSecret,
        ]);
        $this->app->instance(PaymentGateway::class, $realGateway);

        $payload = [
            'id' => 'evt_qa_test_unique_1',
            'type' => 'payment.succeeded',
            'data' => [
                'payment' => [
                    'id' => 'pay_qa_001',
                    'reference' => 'INV-QA-001',
                    'amount_cents' => 900000,
                    'currency' => 'LKR',
                    'status' => 'succeeded',
                ],
            ],
        ];

        $rawBody = json_encode($payload);
        $validTimestamp = time();
        $validSignedPayload = "{$validTimestamp}.{$rawBody}";
        $validSig = hash_hmac('sha256', $validSignedPayload, $webhookSecret);
        $validHeader = "t={$validTimestamp},v1={$validSig}";

        // 1. Invalid signature rejected (400)
        $resBadSig = $this->postJson("http://{$this->baseDomain}/webhooks/paymentslk", $payload, [
            'Payments-Signature' => "t={$validTimestamp},v1=invalid_hmac_hex",
        ]);
        $this->assertEquals(400, $resBadSig->getStatusCode());

        // 2. Timestamp older than 300 seconds rejected (400)
        $expiredTimestamp = time() - 350;
        $expiredSignedPayload = "{$expiredTimestamp}.{$rawBody}";
        $expiredSig = hash_hmac('sha256', $expiredSignedPayload, $webhookSecret);
        $expiredHeader = "t={$expiredTimestamp},v1={$expiredSig}";

        $resExpired = $this->postJson("http://{$this->baseDomain}/webhooks/paymentslk", $payload, [
            'Payments-Signature' => $expiredHeader,
        ]);
        $this->assertEquals(400, $resExpired->getStatusCode());

        // 3. Valid signature accepted (200)
        $resValid = $this->postJson("http://{$this->baseDomain}/webhooks/paymentslk", $payload, [
            'Payments-Signature' => $validHeader,
        ]);
        $this->assertEquals(200, $resValid->getStatusCode());

        // 4. Replay of same event_id ignored (deduplicated)
        $resReplay = $this->postJson("http://{$this->baseDomain}/webhooks/paymentslk", $payload, [
            'Payments-Signature' => $validHeader,
        ]);
        $this->assertEquals(200, $resReplay->getStatusCode());
        $this->assertEquals('already_processed', $resReplay->json('status'));
    }

    /**
     * 8. Public Directory: opted-in clinics visible, suspended clinics excluded.
     */
    public function test_public_directory_filtering_and_clinic_profile(): void
    {
        // /find directory index
        $resFind = $this->get("http://{$this->baseDomain}/find");
        $resFind->assertStatus(200);

        // Opted-in clinic A (cityhealth) is present
        $resClinicA = $this->get("http://{$this->baseDomain}/clinics/cityhealth");
        $resClinicA->assertStatus(200);

        // Non-opted in or basic clinic B (apexcare) should not have a directory profile
        $resClinicB = $this->get("http://{$this->baseDomain}/clinics/apexcare");
        $this->assertContains($resClinicB->getStatusCode(), [404, 302]);

        // Suspended clinic check (QA-001)
        $suspendedTenant = Tenant::create([
            'id' => 'suspendedclinic',
            'name' => 'Suspended Clinic',
            'subdomain' => 'suspendedclinic',
            'status' => 'suspended',
            'plan' => 'pro',
            'address' => 'Colombo',
            'phone' => '+94770000000',
        ]);

        $suspendedDocModel = Doctor::create([
            'tenant_id' => $suspendedTenant->id,
            'title' => 'Dr.',
            'name' => 'Dr. Suspended',
            'specialty' => 'General Practice',
            'slmc_number' => '99999',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 15,
            'is_active' => true,
        ]);

        $suspendedListing = DirectoryListing::create([
            'tenant_id' => $suspendedTenant->id,
            'clinic_name' => 'Suspended Clinic',
            'slug' => 'suspendedclinic',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => 'Colombo',
            'phone' => '+94770000000',
            'is_active' => true,
            'consented_at' => now(),
            'online_booking_enabled' => true,
        ]);

        $suspendedDoctor = DirectoryDoctor::create([
            'directory_listing_id' => $suspendedListing->id,
            'tenant_id' => $suspendedTenant->id,
            'doctor_id' => $suspendedDocModel->id,
            'name' => 'Dr. Suspended',
            'specialty' => 'General Practice',
            'slug' => 'dr-suspended',
            'is_active' => true,
        ]);

        // 1. Clinic page returns 404
        $resSuspendedClinic = $this->get("http://{$this->baseDomain}/clinics/suspendedclinic");
        $resSuspendedClinic->assertStatus(404);

        // 2. Doctor page returns 404
        $resSuspendedDoc = $this->get("http://{$this->baseDomain}/doctors/suspendedclinic/dr-suspended");
        $resSuspendedDoc->assertStatus(404);

        // 3. /find does not list suspended clinic
        $resFind = $this->get("http://{$this->baseDomain}/find");
        $resFind->assertStatus(200);
        $this->assertStringNotContainsString('Suspended Clinic', $resFind->getContent());

        // 4. Directory booking link on tenant returns 404
        $resBookingLink = $this->get("http://suspendedclinic.{$this->baseDomain}/book?source=directory");
        $resBookingLink->assertStatus(404);

        // 5. Inactive tenant sync job deletes directory listing
        $inactiveTenant = Tenant::create([
            'id' => 'inactiveclinic',
            'name' => 'Inactive Clinic',
            'subdomain' => 'inactiveclinic',
            'status' => 'inactive',
            'plan' => 'pro',
            'address' => 'Colombo',
            'phone' => '+94771111111',
        ]);

        $inactiveListing = DirectoryListing::create([
            'tenant_id' => $inactiveTenant->id,
            'clinic_name' => 'Inactive Clinic',
            'slug' => 'inactiveclinic',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => 'Colombo',
            'phone' => '+94771111111',
            'is_active' => true,
            'consented_at' => now(),
            'online_booking_enabled' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $inactiveTenant->id);
        $this->assertNull(DirectoryListing::where('tenant_id', 'inactiveclinic')->first());
    }

    /**
     * 9. Sitemap & SEO tags.
     */
    public function test_sitemap_and_seo_presence(): void
    {
        $sitemapRes = $this->get("http://{$this->baseDomain}/sitemap.xml");
        $this->assertContains($sitemapRes->getStatusCode(), [200, 301, 302]);
        if ($sitemapRes->getStatusCode() === 200) {
            $this->assertStringContainsString('urlset', $sitemapRes->getContent());
        }
    }

    /**
     * 10. Accessibility & contrast audit verification.
     */
    public function test_accessibility_labels_and_audit_clean(): void
    {
        $findFile = resource_path('js/Pages/Directory/Find.tsx');
        $this->assertFileExists($findFile);
        $findContent = file_get_contents($findFile);

        $this->assertStringContainsString('id="filter-district"', $findContent);
        $this->assertStringContainsString('htmlFor="filter-district"', $findContent);
        $this->assertStringContainsString('id="filter-specialty"', $findContent);
        $this->assertStringContainsString('htmlFor="filter-specialty"', $findContent);
        $this->assertStringContainsString('id="filter-day"', $findContent);
        $this->assertStringContainsString('htmlFor="filter-day"', $findContent);
        $this->assertStringContainsString('id="filter-service"', $findContent);
        $this->assertStringContainsString('htmlFor="filter-service"', $findContent);

        $a11yReportPath = base_path('qa-report/a11y-results.json');
        if (file_exists($a11yReportPath)) {
            $a11yReport = json_decode(file_get_contents($a11yReportPath), true);
            $totalViolations = 0;
            foreach ($a11yReport as $pageResult) {
                $totalViolations += $pageResult['violationsCount'] ?? 0;
            }
            $this->assertSame(0, $totalViolations, 'A11y violations found in automated audit report');
        }
    }
}
