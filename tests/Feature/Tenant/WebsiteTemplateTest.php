<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\RefundRequest;
use App\Models\SubscriptionInvoice;
use App\Models\TemplatePurchase;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WebsiteTemplate;
use App\Services\Refunds\RefundEligibilityService;
use App\Services\Templates\TemplateService;
use App\Support\ClinicWebsite;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class WebsiteTemplateTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $clinic;

    private User $admin;

    private string $baseDomain;

    private WebsiteTemplate $premiumTemplate;

    private WebsiteTemplate $freeTemplate;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->clinic = Tenant::factory()->active()->create([
            'id' => 'suwa-shanthi',
            'subdomain' => 'suwa-shanthi',
            'name' => 'Suwashanthi Specialist Clinic',
            'plan' => 'pro',
            'phone' => '+94 11 234 5678',
            'address' => 'Colombo, Sri Lanka',
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => 'suwa-shanthi',
            'email' => 'admin@suwashanthi.lk',
        ]);

        $this->premiumTemplate = WebsiteTemplate::create([
            'slug' => 'serene-test',
            'name' => 'Serene Medical Center',
            'tagline' => 'Calm, airy elegance with floating cards',
            'description' => 'A calm aesthetic tailored for wellness and medical centers.',
            'tier' => WebsiteTemplate::TIER_PREMIUM,
            'price_cents' => 350000,
            'is_active' => true,
            'sort_order' => 1,
            'version' => '1.0.0',
            'definition' => [
                'theme_tokens' => ['theme' => 'medvisit-teal', 'hero_style' => 'split'],
                'section_variants' => ['hero' => ['layout' => 'split']],
            ],
        ]);

        $this->freeTemplate = WebsiteTemplate::create([
            'slug' => 'free-preset-test',
            'name' => 'MedVisit Teal Free',
            'tagline' => 'Standard clinical theme',
            'description' => 'Free standard clinic theme.',
            'tier' => WebsiteTemplate::TIER_FREE,
            'price_cents' => 0,
            'is_active' => true,
            'sort_order' => 2,
            'version' => '1.0.0',
            'definition' => [
                'theme_tokens' => ['theme' => 'medvisit-teal'],
            ],
        ]);
    }

    private function url(string $path, string $sub = 'suwa-shanthi'): string
    {
        return "http://{$sub}.{$this->baseDomain}{$path}";
    }

    public function test_gallery_endpoint_returns_templates_and_plan_info(): void
    {
        $response = $this->actingAs($this->admin)->getJson($this->url('/website/templates'));

        $response->assertOk();
        $response->assertJsonStructure([
            'templates',
            'plan_info' => [
                'plan',
                'is_advanced',
                'free_limit',
                'can_claim_free',
            ],
            'applied_template_id',
            'can_revert',
        ]);
    }

    public function test_advanced_clinic_can_claim_free_template_choice(): void
    {
        $this->clinic->update(['plan' => 'advanced']);

        $response = $this->actingAs($this->admin)->postJson(
            $this->url("/website/templates/{$this->premiumTemplate->slug}/claim-free")
        );

        $response->assertOk();
        $this->assertTrue($this->clinic->fresh()->isTemplateEntitled($this->premiumTemplate));

        $this->assertDatabaseHas('template_purchases', [
            'tenant_id' => 'suwa-shanthi',
            'template_id' => $this->premiumTemplate->id,
            'source' => TemplatePurchase::SOURCE_PLAN_INCLUDED,
            'status' => TemplatePurchase::STATUS_PAID,
            'price_cents' => 0,
        ]);
    }

    public function test_free_template_choice_cannot_be_changed_within_30_days(): void
    {
        $this->clinic->update([
            'plan' => 'advanced',
            'free_template_changed_at' => Carbon::now()->subDays(10),
        ]);
        $this->clinic->refresh();

        $secondTemplate = WebsiteTemplate::create([
            'slug' => 'specialist-test',
            'name' => 'Specialist Hospital Suite',
            'tagline' => 'Commanding dark hero with interactive doctor grid',
            'description' => 'A commanding specialist hospital layout.',
            'tier' => WebsiteTemplate::TIER_PREMIUM,
            'price_cents' => 350000,
            'is_active' => true,
            'sort_order' => 3,
            'version' => '1.0.0',
            'definition' => [],
        ]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Free template choice can only be changed once every 30 days');

        app(TemplateService::class)->claimPlanIncluded($this->clinic, $this->admin, $secondTemplate);
    }

    public function test_template_checkout_validation_requires_terms_accepted(): void
    {
        $response = $this->actingAs($this->admin)->postJson(
            $this->url("/website/templates/{$this->premiumTemplate->slug}/checkout"),
            ['terms_accepted' => false]
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['terms_accepted']);
    }

    public function test_webhook_payment_success_grants_template_entitlement(): void
    {
        $invoice = SubscriptionInvoice::create([
            'tenant_id' => 'suwa-shanthi',
            'invoice_number' => 'TPL-2026-999999',
            'type' => SubscriptionInvoice::TYPE_TEMPLATE_PURCHASE,
            'amount_cents' => 350000,
            'currency' => 'LKR',
            'status' => 'pending',
            'period_start' => now(),
            'period_end' => now(),
        ]);

        $purchase = TemplatePurchase::create([
            'tenant_id' => 'suwa-shanthi',
            'template_id' => $this->premiumTemplate->id,
            'source' => TemplatePurchase::SOURCE_PURCHASE,
            'price_cents' => 350000,
            'version_at_purchase' => '1.0.0',
            'invoice_id' => $invoice->id,
            'status' => TemplatePurchase::STATUS_PENDING,
            'terms_accepted_at' => now(),
            'terms_version' => '2026-10-28',
        ]);

        $service = app(TemplateService::class);
        $success = $service->processSuccessfulPurchase([
            'reference' => 'TPL-2026-999999',
            'amount_cents' => 350000,
            'currency' => 'LKR',
            'payment_id' => 'PAY-TEST-12345',
            'checkout_id' => 'CHK-TEST-12345',
        ]);

        $this->assertTrue($success);
        $purchase->refresh();
        $this->assertEquals(TemplatePurchase::STATUS_PAID, $purchase->status);
        $this->assertNotNull($purchase->payment_transaction_id);
        $this->assertNotNull($purchase->purchased_at);
        $this->assertTrue($this->clinic->fresh()->isTemplateEntitled($this->premiumTemplate));
    }

    public function test_apply_template_to_draft_and_publish_stamps_first_published_at(): void
    {
        $purchase = TemplatePurchase::create([
            'tenant_id' => 'suwa-shanthi',
            'template_id' => $this->premiumTemplate->id,
            'source' => TemplatePurchase::SOURCE_PURCHASE,
            'price_cents' => 350000,
            'version_at_purchase' => '1.0.0',
            'status' => TemplatePurchase::STATUS_PAID,
            'purchased_at' => now(),
            'first_published_at' => null,
        ]);

        $service = app(TemplateService::class);
        $service->applyToDraft($this->clinic, $this->premiumTemplate);

        $this->assertEquals($this->premiumTemplate->id, $this->clinic->fresh()->applied_template_id);
        $this->assertNull($purchase->fresh()->first_published_at);

        // When publishing, first_published_at must be recorded
        ClinicWebsite::publish($this->clinic);

        $this->assertNotNull($purchase->fresh()->first_published_at);
    }

    public function test_refund_eligibility_option_a_rules(): void
    {
        $refundService = app(RefundEligibilityService::class);

        // 1. Unpublished within 7 days -> 100% eligible
        $invoice1 = SubscriptionInvoice::create([
            'tenant_id' => 'suwa-shanthi',
            'invoice_number' => 'TPL-2026-000001',
            'type' => SubscriptionInvoice::TYPE_TEMPLATE_PURCHASE,
            'amount_cents' => 350000,
            'currency' => 'LKR',
            'status' => 'paid',
            'paid_at' => Carbon::now()->subDays(3),
            'period_start' => now(),
            'period_end' => now(),
        ]);

        $payment1 = PaymentTransaction::create([
            'tenant_id' => 'suwa-shanthi',
            'invoice_id' => $invoice1->id,
            'gateway' => 'paymentslk',
            'gateway_payment_id' => 'PAY-1',
            'amount_cents' => 350000,
            'currency' => 'LKR',
            'status' => 'succeeded',
            'created_at' => Carbon::now()->subDays(3),
        ]);

        $purchase1 = TemplatePurchase::create([
            'tenant_id' => 'suwa-shanthi',
            'template_id' => $this->premiumTemplate->id,
            'source' => TemplatePurchase::SOURCE_PURCHASE,
            'price_cents' => 350000,
            'version_at_purchase' => '1.0.0',
            'invoice_id' => $invoice1->id,
            'payment_transaction_id' => $payment1->id,
            'status' => TemplatePurchase::STATUS_PAID,
            'purchased_at' => Carbon::now()->subDays(3),
            'first_published_at' => null,
        ]);

        $eval1 = $refundService->evaluateTemplatePurchase($payment1, $invoice1, 350000, Carbon::now());
        $this->assertEquals(RefundRequest::ELIGIBILITY_ELIGIBLE, $eval1['eligibility']);
        $this->assertEquals(350000, $eval1['eligible_amount_cents']);

        // 2. Already published -> 0% ineligible
        $purchase1->update(['first_published_at' => Carbon::now()->subDays(2)]);
        $eval2 = $refundService->evaluateTemplatePurchase($payment1, $invoice1, 350000, Carbon::now());
        $this->assertEquals(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $eval2['eligibility']);
        $this->assertEquals(0, $eval2['eligible_amount_cents']);
        $this->assertStringContainsString('already been published', $eval2['reason_summary']);

        // 3. More than 7 days ago -> 0% ineligible
        $purchase1->update(['first_published_at' => null]);
        $eval3 = $refundService->evaluateTemplatePurchase($payment1, $invoice1, 350000, Carbon::now()->addDays(6));
        $this->assertEquals(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $eval3['eligibility']);
        $this->assertEquals(0, $eval3['eligible_amount_cents']);
        $this->assertStringContainsString('more than 7 calendar days ago', $eval3['reason_summary']);

        // 4. Plan included (free) -> 0% ineligible
        $purchase1->update([
            'source' => TemplatePurchase::SOURCE_PLAN_INCLUDED,
            'price_cents' => 0,
        ]);
        $eval4 = $refundService->evaluateTemplatePurchase($payment1, $invoice1, 350000, Carbon::now());
        $this->assertEquals(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $eval4['eligibility']);
        $this->assertEquals(0, $eval4['eligible_amount_cents']);
        $this->assertStringContainsString('included free with a plan are not refundable', $eval4['reason_summary']);
    }

    public function test_downgrade_from_advanced_revokes_free_template_and_falls_back_gracefully(): void
    {
        $this->clinic->update(['plan' => 'advanced']);

        $service = app(TemplateService::class);
        $service->claimPlanIncluded($this->clinic, $this->admin, $this->premiumTemplate);
        $service->applyToDraft($this->clinic, $this->premiumTemplate);
        ClinicWebsite::publish($this->clinic);

        $this->assertEquals($this->premiumTemplate->id, $this->clinic->fresh()->applied_template_id);

        // Downgrade event executes
        $service->onDowngradeFromAdvanced($this->clinic);

        $this->assertFalse($this->clinic->fresh()->isTemplateEntitled($this->premiumTemplate));
        $this->assertNotEquals($this->premiumTemplate->id, $this->clinic->fresh()->applied_template_id);
    }
}
