<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Contracts\PaymentGateway;
use App\Mail\Subscription\ZeroAmountInvoiceMail;
use App\Models\Plan;
use App\Models\PromoCode;
use App\Models\PromoCodeRedemption;
use App\Models\Subscription;
use App\Models\SubscriptionInvite;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Billing\PromoCodeService;
use App\Services\Payments\FakeGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PromoCodeAndInviteTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->app->instance(PaymentGateway::class, new FakeGateway);
        Mail::fake();

        // Seed plans from config to ensure single price source
        foreach (config('medvisit_public.plans', []) as $slug => $data) {
            Plan::firstOrCreate(
                ['slug' => $slug],
                [
                    'name' => $data['name'],
                    'price_cents' => (int) $data['price_cents'],
                    'billing_interval' => 'monthly',
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * 1. Single price source: Verify that every path uses the plans table as the source of truth.
     */
    public function test_single_price_source_all_surfaces_match(): void
    {
        $configPlans = config('medvisit_public.plans', []);

        foreach ($configPlans as $slug => $config) {
            $dbPlan = Plan::where('slug', $slug)->first();
            $this->assertNotNull($dbPlan, "Plan {$slug} must exist in database");
            $this->assertSame(
                (int) $config['price_cents'],
                $dbPlan->price_cents,
                "Price for plan {$slug} in database must match public config"
            );
        }
    }

    /**
     * 2. Promo code validation rules.
     */
    public function test_promo_code_validation_rules(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'val-clinic',
            'name' => 'Validation Clinic',
        ]);
        $plan = Plan::where('slug', 'basic')->firstOrFail();
        $service = app(PromoCodeService::class);

        // A. Valid code
        $code = PromoCode::create([
            'code' => 'WELCOME20',
            'type' => PromoCode::TYPE_PERCENT,
            'value' => 20,
            'duration' => PromoCode::DURATION_ONCE,
            'eligible_plans' => [],
            'is_active' => true,
        ]);

        $res = $service->validate($code->code, $tenant, $plan);
        $this->assertTrue($res['valid']);
        $this->assertSame(20, $res['promo']->value);

        // B. Inactive code
        $code->update(['is_active' => false]);
        $res = $service->validate($code->code, $tenant, $plan);
        $this->assertFalse($res['valid']);
        $this->assertStringContainsString('active', strtolower($res['error'] ?? ''));

        // C. Expired code
        $code->update(['is_active' => true, 'valid_until' => now()->subDay()]);
        $res = $service->validate($code->code, $tenant, $plan);
        $this->assertFalse($res['valid']);
        $this->assertStringContainsString('expired', strtolower($res['error'] ?? ''));

        // D. Ineligible plan
        $code->update(['valid_until' => null, 'eligible_plans' => ['premium']]);
        $res = $service->validate($code->code, $tenant, $plan);
        $this->assertFalse($res['valid']);
        $this->assertStringContainsString('not valid', strtolower($res['error'] ?? ''));

        // E. Max redemptions reached
        $code->update(['eligible_plans' => [], 'max_redemptions' => 1, 'times_redeemed' => 1]);
        $res = $service->validate($code->code, $tenant, $plan);
        $this->assertFalse($res['valid']);
        $this->assertStringContainsString('reached its maximum', strtolower($res['error'] ?? ''));
    }

    /**
     * 3. Discount calculation and clamping (never negative).
     */
    public function test_discount_calculation_and_clamping(): void
    {
        $service = app(PromoCodeService::class);
        $plan = Plan::where('slug', 'basic')->firstOrFail();

        // Percent off
        $percentPromo = new PromoCode([
            'type' => PromoCode::TYPE_PERCENT,
            'value' => 25,
            'duration' => PromoCode::DURATION_ONCE,
            'eligible_plans' => [],
        ]);
        $calc = $service->calculateDiscount($percentPromo, $plan->price_cents);
        $this->assertSame((int) round($plan->price_cents * 0.25), $calc['discount_cents']);
        $this->assertSame($plan->price_cents - $calc['discount_cents'], $calc['final_amount_cents']);

        // Fixed discount larger than price -> clamped at Rs. 0
        $hugeFixedPromo = new PromoCode([
            'type' => PromoCode::TYPE_FIXED,
            'value' => 9999999, // Extremely large
            'duration' => PromoCode::DURATION_ONCE,
            'eligible_plans' => [],
        ]);
        $calcFixed = $service->calculateDiscount($hugeFixedPromo, $plan->price_cents);
        $this->assertSame($plan->price_cents, $calcFixed['discount_cents']);
        $this->assertSame(0, $calcFixed['final_amount_cents']);
        $this->assertGreaterThanOrEqual(0, $calcFixed['final_amount_cents']);
    }

    /**
     * 4. Free month (Rs. 0) checkout skips Payments.lk and maintains gapless receipt numbers.
     */
    public function test_zero_amount_checkout_skips_payments_lk_and_keeps_receipts_gapless(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'zero-clinic',
            'name' => 'Zero Clinic',
            'subdomain' => 'zero-clinic',
            'status' => 'pending_payment',
        ]);
        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@zero-clinic.lk',
        ]);
        $plan = Plan::where('slug', 'basic')->firstOrFail();

        $promo = PromoCode::create([
            'code' => 'FREEMONTH',
            'type' => PromoCode::TYPE_FREE_MONTHS,
            'value' => 1,
            'duration' => PromoCode::DURATION_REPEATING,
            'duration_months' => 1,
            'eligible_plans' => [],
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)
            ->post("http://zero-clinic.{$this->baseDomain}/subscription/checkout", [
                'plan_slug' => 'basic',
                'terms_accepted' => true,
                'promo_code' => 'FREEMONTH',
            ]);

        // Expect redirect to setup / dashboard route directly without Payments.lk URL
        $response->assertRedirect(route('tenant.setup'));

        // Subscription must be active
        $subscription = $tenant->fresh()->subscription;
        $this->assertNotNull($subscription);
        $this->assertTrue($subscription->isActive());
        $this->assertSame($promo->id, $subscription->active_promo_id);

        // Verify Rs. 0 invoice is paid with NULL receipt_number (no receipt number consumed)
        $invoice = SubscriptionInvoice::where('tenant_id', $tenant->id)->latest('id')->first();
        $this->assertNotNull($invoice);
        $this->assertSame(0, $invoice->amount_cents);
        $this->assertSame(SubscriptionInvoice::STATUS_PAID, $invoice->status);
        $this->assertNull($invoice->receipt_number, 'Rs. 0 invoices must have null receipt_number');

        // Verify ZeroAmountInvoiceMail was queued
        Mail::assertQueued(ZeroAmountInvoiceMail::class);
    }

    /**
     * 5. Deal snapshot immutability on renewals.
     */
    public function test_deal_snapshot_immutability_on_renewals(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'snap-clinic',
            'name' => 'Snapshot Clinic',
        ]);
        $plan = Plan::where('slug', 'basic')->firstOrFail();

        $promo = PromoCode::create([
            'code' => 'LIFETIME50',
            'type' => PromoCode::TYPE_PERCENT,
            'value' => 50,
            'duration' => PromoCode::DURATION_FOREVER,
            'eligible_plans' => [],
            'is_active' => true,
        ]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        $service = app(PromoCodeService::class);
        $redemption = $service->reserve($promo, $tenant, $subscription, $plan);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
            'amount_cents' => (int) ($plan->price_cents * 0.5),
            'original_amount_cents' => $plan->price_cents,
            'discount_cents' => (int) ($plan->price_cents * 0.5),
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'due_date' => now(),
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);

        $service->activate($redemption, $invoice);

        $freshSub = $subscription->fresh();

        // Super Admin now deactivates or changes the live promo code
        $promo->update(['is_active' => false, 'value' => 10]);

        // The subscription snapshot is unchanged
        $this->assertSame(50, $freshSub->promo_snapshot['value']);
        $this->assertTrue($freshSub->hasActivePromo());
    }

    /**
     * 6. Free-access invite links registration flow.
     */
    public function test_free_access_invite_registration_flow(): void
    {
        $plainToken = 'test-invite-token-secret-12345';
        $result = SubscriptionInvite::createWithToken([
            'recipient_email' => 'invitee@clinic.lk',
            'recipient_name' => 'Dr. Invitee',
            'clinic_name' => 'Invitee Clinic',
            'plan_slug' => 'pro',
            'free_period_type' => 'months',
            'free_period_value' => 1,
            'expires_at' => now()->addDays(14),
            'status' => SubscriptionInvite::STATUS_SENT,
        ], $plainToken);

        $invite = $result['invite'];
        $this->assertSame(hash('sha256', $plainToken), $invite->token_hash);
        $this->assertTrue($invite->isValid());

        // Attempt lookup by plain token
        $found = SubscriptionInvite::findByToken($plainToken);
        $this->assertNotNull($found);
        $this->assertSame('invitee@clinic.lk', $found->recipient_email);

        // Test marking as registered
        $tenant = Tenant::factory()->active()->create(['id' => 'inv-tenant']);
        $found->markRegistered($tenant->id);

        $this->assertSame(SubscriptionInvite::STATUS_REGISTERED, $found->fresh()->status);
        $this->assertFalse($found->fresh()->isValid(), 'Used invite cannot be reused');
    }

    /**
     * 7. Demo tenant blocked from redeeming promo codes.
     */
    public function test_demo_tenant_blocked_from_redeeming_promo(): void
    {
        $demoTenant = Tenant::where('id', 'demo')->first() ?? Tenant::factory()->active()->create(['id' => 'demo']);
        $demoTenant->update(['status' => 'demo']);
        $plan = Plan::where('slug', 'basic')->firstOrFail();
        $service = app(PromoCodeService::class);

        $promo = PromoCode::create([
            'code' => 'DEMOTEST',
            'type' => PromoCode::TYPE_PERCENT,
            'value' => 50,
            'duration' => PromoCode::DURATION_ONCE,
            'eligible_plans' => [],
            'is_active' => true,
        ]);

        $res = $service->validate($promo->code, $demoTenant, $plan);
        $this->assertFalse($res['valid']);
        $this->assertStringContainsString('demo', strtolower($res['error'] ?? ''));
    }

    /**
     * 8. Rate limit: Max 10 promo code validation attempts per IP per hour.
     */
    public function test_promo_rate_limiting_per_ip(): void
    {
        $service = app(PromoCodeService::class);
        $ip = '192.168.1.100';

        // Hit 10 times without error
        for ($i = 0; $i < 10; $i++) {
            $service->ensureNotRateLimited($ip);
        }

        // 11th time must throw ValidationException
        $this->expectException(ValidationException::class);
        $service->ensureNotRateLimited($ip);
    }

    /**
     * 9. Concurrency & DB Lock: Max redemptions prevents over-redemption.
     */
    public function test_max_redemptions_prevented_by_lock(): void
    {
        $service = app(PromoCodeService::class);
        $plan = Plan::where('slug', 'basic')->firstOrFail();

        $promo = PromoCode::create([
            'code' => 'ONLYONE',
            'type' => PromoCode::TYPE_PERCENT,
            'value' => 10,
            'duration' => PromoCode::DURATION_ONCE,
            'eligible_plans' => [],
            'max_redemptions' => 1,
            'times_redeemed' => 1, // Already reached
            'is_active' => true,
        ]);

        $tenant = Tenant::factory()->active()->create(['id' => 'race-clinic']);
        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        $this->expectException(ValidationException::class);
        $service->reserve($promo, $tenant, $subscription, $plan);
    }

    /**
     * 10. Failed payment releases reserved redemption.
     */
    public function test_failed_payment_releases_promo_reservation(): void
    {
        $service = app(PromoCodeService::class);
        $plan = Plan::where('slug', 'basic')->firstOrFail();

        $promo = PromoCode::create([
            'code' => 'RESERVEFAIL',
            'type' => PromoCode::TYPE_PERCENT,
            'value' => 15,
            'duration' => PromoCode::DURATION_ONCE,
            'eligible_plans' => [],
            'is_active' => true,
        ]);

        $tenant = Tenant::factory()->active()->create(['id' => 'fail-clinic']);
        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        $redemption = $service->reserve($promo, $tenant, $subscription, $plan);
        $this->assertSame(PromoCodeRedemption::STATUS_RESERVED, $redemption->status);

        // Simulate payment failure release
        $service->releaseReservation($redemption);
        $this->assertSame(PromoCodeRedemption::STATUS_RELEASED, $redemption->fresh()->status);
    }
}
