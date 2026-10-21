<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Contracts\PaymentGateway;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicLegalPagesTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $clinicAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);

        // Swap payment gateway with FakeGateway for subscription checkout test
        $this->app->instance(PaymentGateway::class, new FakeGateway);

        $this->tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
            'status' => 'pending_payment',
        ]);

        $this->clinicAdmin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasetha.lk',
        ]);
    }

    /**
     * Test all 5 legal and pricing routes return 200 on central domain for guest.
     */
    public function test_all_five_public_routes_return_200_on_central_domain_for_guest(): void
    {
        $routes = [
            '/pricing',
            '/terms',
            '/refund-policy',
            '/dispute-policy',
            '/privacy-policy',
        ];

        foreach ($routes as $route) {
            $response = $this->get("http://{$this->baseDomain}{$route}");
            $response->assertStatus(200);
        }
    }

    /**
     * Test all 5 legal routes return 404 (not registered) on tenant subdomains.
     */
    public function test_public_legal_routes_return_404_on_tenant_subdomains(): void
    {
        $routes = [
            '/pricing',
            '/terms',
            '/refund-policy',
            '/dispute-policy',
            '/privacy-policy',
        ];

        foreach ($routes as $route) {
            $response = $this->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$route}");
            $response->assertStatus(404);
        }
    }

    /**
     * Test pricing page contains all three plan names, prices, and core features.
     */
    public function test_pricing_page_contains_all_three_plan_names_and_prices(): void
    {
        $response = $this->get("http://{$this->baseDomain}/pricing");
        $response->assertStatus(200);

        // Check Inertia component & props
        $response->assertInertia(fn ($page) => $page
            ->component('Public/Pricing')
            ->has('config.plans.basic')
            ->has('config.plans.pro')
            ->has('config.plans.advanced')
            ->where('config.plans.basic.name', 'Basic')
            ->where('config.plans.basic.price_formatted', 'Rs. 7,000')
            ->where('config.plans.pro.name', 'Pro')
            ->where('config.plans.pro.price_formatted', 'Rs. 9,000')
            ->where('config.plans.advanced.name', 'Advanced')
            ->where('config.plans.advanced.price_formatted', 'Rs. 15,000')
            ->where('config.business.name', 'MedVisit')
            ->where('config.business.email', 'support@medvisit.lk')
            ->where('config.business.support_email', 'support@medvisit.lk')
            ->where('config.business.general_email', 'hello@medvisit.lk')
            ->where('config.business.phone', '+94 70 129 1688')
            ->where('config.business.phone_display', '070 129 1688')
        );
    }

    /**
     * Test checkout rejects a request without terms consent.
     */
    public function test_checkout_rejects_a_request_without_terms_consent(): void
    {
        $response = $this->actingAs($this->clinicAdmin)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/subscription/checkout", []);

        $response->assertSessionHasErrors(['terms_accepted']);

        // Checkbox value false also fails
        $response2 = $this->actingAs($this->clinicAdmin)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/subscription/checkout", [
                'terms_accepted' => false,
            ]);

        $response2->assertSessionHasErrors(['terms_accepted']);
    }

    /**
     * Test checkout succeeds when terms consent is given and stores timestamp and version.
     */
    public function test_checkout_accepts_request_with_consent_and_stores_timestamp_and_version(): void
    {
        $response = $this->actingAs($this->clinicAdmin)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/subscription/checkout", [
                'terms_accepted' => true,
            ]);

        // Expect redirect to gateway checkout
        $this->assertTrue(
            $response->isRedirect() || $response->headers->has('X-Inertia-Location'),
            'Expected checkout initiation to redirect to payment gateway URL'
        );

        $subscription = $this->tenant->subscription()->first();
        $this->assertNotNull($subscription);
        $this->assertNotNull($subscription->terms_accepted_at);
        $this->assertSame('2026-10-21', $subscription->terms_version);

        $transaction = $this->tenant->paymentTransactions()->latest('id')->first();
        $this->assertNotNull($transaction);
        $this->assertNotNull($transaction->terms_accepted_at);
        $this->assertSame('2026-10-21', $transaction->terms_version);
    }

    /**
     * Test online cancellation is accessible and works in the Billing Center.
     */
    public function test_billing_center_has_working_online_cancellation(): void
    {
        // Give tenant an active paid subscription
        $standardPlan = Plan::where('slug', 'medvisit-standard')->first();
        $subscription = Subscription::updateOrCreate(
            ['tenant_id' => $this->tenant->id],
            [
                'plan_id' => $standardPlan->id,
                'status' => Subscription::STATUS_ACTIVE,
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
                'cancels_at_period_end' => false,
            ]
        );

        $this->tenant->update(['status' => 'active']);

        $response = $this->actingAs($this->clinicAdmin)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/settings/billing/cancel", [
                'reason' => 'Cost considerations',
                'reason_detail' => 'Switching clinic branch structure',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $subscription->refresh();
        $this->assertTrue($subscription->cancels_at_period_end);
        $this->assertSame(Subscription::STATUS_CANCELLING, $subscription->status);
        $this->assertNotNull($subscription->cancelled_at);
        $this->assertSame('Cost considerations', $subscription->cancellation_reason);
    }

    /**
     * Test all five public pages assert the new email/phone and that old values do not appear.
     */
    public function test_all_five_public_pages_show_new_contact_details_and_no_old_contact_info(): void
    {
        $routes = [
            '/pricing',
            '/terms',
            '/refund-policy',
            '/dispute-policy',
            '/privacy-policy',
        ];

        foreach ($routes as $route) {
            $response = $this->get("http://{$this->baseDomain}{$route}");
            $response->assertStatus(200);

            // Assert old values do not appear anywhere in rendered content
            $response->assertDontSee('contact@sivanujan.online');
            $response->assertDontSee('+94 77 204 6898');
            $response->assertDontSee('772046898');
            $response->assertDontSee('0772046898');
            $response->assertDontSee('Thanarasan Sivanujan');
            $response->assertDontSee('sole proprietor');
            $response->assertDontSee('Puliyankoodal');
            $response->assertDontSee('Kayts');
            $response->assertDontSee('Jaffna 40000');
            $response->assertDontSee('Payments.lk');

            // Assert new contact details appear
            $response->assertSee('support@medvisit.lk');
            $response->assertSee('hello@medvisit.lk');
            $response->assertSee('+94 70 129 1688');
            $response->assertSee('070 129 1688');

            // Assert Inertia config props contain new details
            $response->assertInertia(fn ($page) => $page
                ->where('config.business.email', 'support@medvisit.lk')
                ->where('config.business.support_email', 'support@medvisit.lk')
                ->where('config.business.general_email', 'hello@medvisit.lk')
                ->where('config.business.phone', '+94 70 129 1688')
                ->where('config.business.phone_display', '070 129 1688')
            );
        }
    }

    /**
     * Test that the Refund page contains "pro-rata" and "not a full refund".
     */
    public function test_refund_policy_page_contains_downtime_refund_clause(): void
    {
        $response = $this->get("http://{$this->baseDomain}/refund-policy");
        $response->assertStatus(200);

        // Assert rendered Inertia response contains pro-rata and not a full refund
        $response->assertSee('pro-rata');
        $response->assertSee('not a full refund');

        // Also assert that the frontend policy data file contains the approved downtime refund text
        $refundDataContent = file_get_contents(resource_path('js/Pages/Public/Legal/data/refundPolicyData.tsx'));
        $this->assertStringContainsString('pro-rata', $refundDataContent);
        $this->assertStringContainsString('not a full refund', $refundDataContent);
        $this->assertStringContainsString('48 continuous hours', $refundDataContent);
    }
}
