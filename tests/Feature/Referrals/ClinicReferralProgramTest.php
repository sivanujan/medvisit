<?php

declare(strict_types=1);

namespace Tests\Feature\Referrals;

use App\Contracts\PaymentGateway;
use App\Models\ClinicReferral;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\TenantBillingCredit;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\SubscriptionPaymentService;
use App\Services\PlatformSettingsService;
use App\Services\Referrals\ReferralAbuseDetector;
use App\Services\Referrals\ReferralCreditService;
use App\Services\Referrals\ReferralService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class ClinicReferralProgramTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->app->instance(PaymentGateway::class, new FakeGateway);

        // Ensure plans exist
        Plan::firstOrCreate(['slug' => 'basic'], [
            'name' => 'Basic',
            'price_cents' => 700000,
            'is_active' => true,
        ]);
        Plan::firstOrCreate(['slug' => 'pro'], [
            'name' => 'Pro',
            'price_cents' => 900000,
            'is_active' => true,
        ]);
        Plan::firstOrCreate(['slug' => 'advanced'], [
            'name' => 'Advanced',
            'price_cents' => 1500000,
            'is_active' => true,
        ]);
        Plan::firstOrCreate(['slug' => 'comp'], [
            'name' => 'Complimentary',
            'price_cents' => 0,
            'is_active' => true,
        ]);
    }

    private function createInvoice(array $attributes = []): SubscriptionInvoice
    {
        static $seq = 1;
        $num = sprintf('%06d', $seq++);

        return SubscriptionInvoice::create(array_merge([
            'tenant_id' => 'test-tenant',
            'invoice_number' => "INV-2026-{$num}",
            'amount_cents' => 900000,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
        ], $attributes));
    }

    private function createSubscription(array $attributes = []): Subscription
    {
        return Subscription::create(array_merge([
            'tenant_id' => 'test-tenant',
            'plan_id' => Plan::where('slug', 'pro')->first()?->id ?? 1,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ], $attributes));
    }

    private function createTransaction(array $attributes = []): PaymentTransaction
    {
        return PaymentTransaction::create(array_merge([
            'tenant_id' => 'test-tenant',
            'gateway' => 'paymentslk',
            'amount_cents' => 900000,
            'currency' => 'LKR',
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ], $attributes));
    }

    public function test_feature_flag_disabled_by_default_blocks_routes_and_ui(): void
    {
        Config::set('referrals.enabled', false);
        app(PlatformSettingsService::class)->set('referrals.enabled', false);

        $referrer = Tenant::factory()->active()->create([
            'id' => 'alpha-clinic',
            'subdomain' => 'alpha',
            'plan' => 'pro',
        ]);
        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $referrer->id]);

        // Route should 404 when disabled
        $response = $this->actingAs($admin)->get("http://alpha.{$this->baseDomain}/referrals");
        $response->assertStatus(404);

        $response2 = $this->actingAs($admin)->get("http://alpha.{$this->baseDomain}/settings/billing/referrals");
        $response2->assertStatus(404);

        // Central /r/{code} should redirect directly to register without setting tracking cookie
        $response3 = $this->get('http://medvisit.localhost/r/alpha');
        $response3->assertRedirect(route('register'));
        $response3->assertCookieMissing(ReferralService::COOKIE_NAME);
    }

    public function test_feature_flag_enabled_allows_referrals_page_and_sets_cookie(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $referrer = Tenant::factory()->active()->create([
            'id' => 'beta-clinic',
            'subdomain' => 'beta',
            'plan' => 'pro',
        ]);
        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $referrer->id]);

        // Central /r/{code} sets 30-day cookie
        $res = $this->get('http://medvisit.localhost/r/beta');
        $res->assertRedirect(route('register', ['ref' => 'beta']));
        $res->assertCookie(ReferralService::COOKIE_NAME, 'beta');

        // Referrals page returns 200
        $res2 = $this->actingAs($admin)->get("http://beta.{$this->baseDomain}/referrals");
        $res2->assertStatus(200);
        $res2->assertInertia(fn ($page) => $page
            ->component('Billing/Referrals')
            ->has('referralCode')
            ->has('referralUrl')
            ->has('creditBalanceCents')
        );
    }

    public function test_reward_equals_referred_paid_amount_up_to_referrer_plan_price(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        // CASE A: Advanced Referrer (Rs. 15,000) refers Basic Clinic (Rs. 7,000)
        // Referrer earns Rs. 7,000, NOT a free Advanced month!
        $advReferrer = Tenant::factory()->active()->create([
            'id' => 'adv-clinic',
            'subdomain' => 'adv',
            'plan' => 'advanced',
        ]);
        // Give referrer at least 1 paid invoice
        $this->createInvoice([
            'tenant_id' => $advReferrer->id,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'amount_cents' => 1500000,
        ]);

        $basicReferred = Tenant::factory()->active()->create([
            'id' => 'basic-clinic',
            'subdomain' => 'basic',
            'plan' => 'basic',
        ]);

        $referralService = app(ReferralService::class);
        $refA = $referralService->recordReferralRegistration('adv', $basicReferred, [
            'email' => 'doc@basic.lk',
            'phone' => '0711111111',
        ]);
        $this->assertNotNull($refA);

        // Basic clinic pays 1st monthly invoice (Rs. 7,000)
        $inv1 = $this->createInvoice([
            'tenant_id' => $basicReferred->id,
            'amount_cents' => 700000,
        ]);
        app(SubscriptionPaymentService::class)->processSuccessfulPayment([
            'reference' => $inv1->invoice_number,
            'amount_cents' => 700000,
            'currency' => 'LKR',
            'status' => 'succeeded',
        ]);

        $refA->refresh();
        $this->assertEquals(ClinicReferral::STATUS_PAYING, $refA->status);
        $this->assertEquals(1, $refA->qualifying_invoices_count);

        // Basic clinic pays 2nd monthly invoice (Rs. 7,000)
        $inv2 = $this->createInvoice([
            'tenant_id' => $basicReferred->id,
            'amount_cents' => 700000,
        ]);
        app(SubscriptionPaymentService::class)->processSuccessfulPayment([
            'reference' => $inv2->invoice_number,
            'amount_cents' => 700000,
            'currency' => 'LKR',
            'status' => 'succeeded',
        ]);

        $refA->refresh();
        $this->assertEquals(ClinicReferral::STATUS_REWARDED, $refA->status);
        $this->assertEquals(700000, $refA->reward_amount_cents); // Rs. 7,000, not Rs. 15,000!

        $creditService = app(ReferralCreditService::class);
        $this->assertEquals(700000, $creditService->getBalance($advReferrer));

        // CASE B: Basic Referrer (Rs. 7,000) refers Advanced Clinic (Rs. 15,000)
        // User Change #1: Reward is capped at referrer's monthly plan price = Rs. 7,000, NOT Rs. 15,000!
        $basicReferrer2 = Tenant::factory()->active()->create([
            'id' => 'basic-ref-2',
            'subdomain' => 'bref2',
            'plan' => 'basic',
        ]);
        $this->createInvoice([
            'tenant_id' => $basicReferrer2->id,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'amount_cents' => 700000,
        ]);

        $advReferred2 = Tenant::factory()->active()->create([
            'id' => 'adv-clinic-2',
            'subdomain' => 'adv2',
            'plan' => 'advanced',
        ]);

        $refB = $referralService->recordReferralRegistration('bref2', $advReferred2, [
            'email' => 'doc@adv2.lk',
            'phone' => '0722222222',
        ]);

        // Adv clinic pays 2 invoices of Rs. 15,000
        for ($i = 0; $i < 2; $i++) {
            $inv = $this->createInvoice([
                'tenant_id' => $advReferred2->id,
                'amount_cents' => 1500000,
            ]);
            app(SubscriptionPaymentService::class)->processSuccessfulPayment([
                'reference' => $inv->invoice_number,
                'amount_cents' => 1500000,
                'currency' => 'LKR',
                'status' => 'succeeded',
            ]);
        }

        $refB->refresh();
        $this->assertEquals(ClinicReferral::STATUS_REWARDED, $refB->status);
        $this->assertEquals(700000, $refB->reward_amount_cents); // Capped at Rs. 7,000!
        $this->assertEquals(700000, $creditService->getBalance($basicReferrer2));
    }

    public function test_zero_rupee_months_earn_nothing(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $referrer = Tenant::factory()->active()->create([
            'id' => 'ref-free-test',
            'subdomain' => 'free-test',
            'plan' => 'pro',
        ]);
        $this->createInvoice([
            'tenant_id' => $referrer->id,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'amount_cents' => 900000,
        ]);

        $referred = Tenant::factory()->active()->create([
            'id' => 'referred-free',
            'subdomain' => 'reffree',
            'plan' => 'pro',
        ]);

        $ref = app(ReferralService::class)->recordReferralRegistration('free-test', $referred, [
            'email' => 'free@clinic.lk',
            'phone' => '0733333333',
        ]);

        // Launch offer invoice: Rs. 0
        $zeroInvoice = $this->createInvoice([
            'tenant_id' => $referred->id,
            'amount_cents' => 0,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'receipt_number' => null,
            'payment_method' => 'launch_offer',
        ]);

        app(ReferralService::class)->onInvoicePaid($zeroInvoice);

        $ref->refresh();
        $this->assertEquals(0, $ref->qualifying_invoices_count);
        $this->assertEquals(ClinicReferral::STATUS_REGISTERED, $ref->status);
    }

    public function test_referrer_must_have_paid_invoice_to_earn_rewards(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        // Referrer is on free launch offer (0 paid cash invoices)
        $unpaidReferrer = Tenant::factory()->active()->create([
            'id' => 'unpaid-referrer',
            'subdomain' => 'unpaidref',
            'plan' => 'pro',
        ]);
        // Free invoice only
        $this->createInvoice([
            'tenant_id' => $unpaidReferrer->id,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'amount_cents' => 0,
            'receipt_number' => null,
        ]);

        $referred = Tenant::factory()->active()->create([
            'id' => 'referred-client',
            'subdomain' => 'refclient',
            'plan' => 'pro',
        ]);

        $referralService = app(ReferralService::class);
        $ref = $referralService->recordReferralRegistration('unpaidref', $referred, [
            'email' => 'client@clinic.lk',
            'phone' => '0744444444',
        ]);

        // Referred clinic pays 2 monthly invoices
        for ($i = 0; $i < 2; $i++) {
            $inv = $this->createInvoice([
                'tenant_id' => $referred->id,
                'amount_cents' => 900000,
            ]);
            app(SubscriptionPaymentService::class)->processSuccessfulPayment([
                'reference' => $inv->invoice_number,
                'amount_cents' => 900000,
                'currency' => 'LKR',
                'status' => 'succeeded',
            ]);
        }

        $ref->refresh();
        // User Change #2: Reward qualified, but stays reward_pending because referrer hasn't paid an invoice yet!
        $this->assertEquals(ClinicReferral::STATUS_REWARD_PENDING, $ref->status);
        $this->assertEquals(900000, $ref->reward_amount_cents);
        $this->assertEquals(0, app(ReferralCreditService::class)->getBalance($unpaidReferrer));

        // Now, referrer pays their first cash subscription invoice!
        $refInvoice = $this->createInvoice([
            'tenant_id' => $unpaidReferrer->id,
            'amount_cents' => 900000,
        ]);
        app(SubscriptionPaymentService::class)->processSuccessfulPayment([
            'reference' => $refInvoice->invoice_number,
            'amount_cents' => 900000,
            'currency' => 'LKR',
            'status' => 'succeeded',
        ]);

        // Referral reward automatically unlocks and transitions to rewarded!
        $ref->refresh();
        $this->assertEquals(ClinicReferral::STATUS_REWARDED, $ref->status);
        $this->assertEquals(900000, app(ReferralCreditService::class)->getBalance($unpaidReferrer));
    }

    public function test_credit_never_exceeds_invoice_amount_and_carries_forward(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $tenant = Tenant::factory()->active()->create([
            'id' => 'credit-carry-clinic',
            'subdomain' => 'carry',
            'plan' => 'basic',
        ]);
        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $tenant->id]);

        $creditService = app(ReferralCreditService::class);
        // Grant Rs. 15,000 credit
        $referral = ClinicReferral::create([
            'referrer_tenant_id' => $tenant->id,
            'referral_code' => 'carry',
            'status' => ClinicReferral::STATUS_REWARDED,
            'reward_amount_cents' => 1500000,
        ]);
        $creditService->recordReward($tenant, $referral, 1500000);
        $this->assertEquals(1500000, $creditService->getBalance($tenant));

        // 1. Checkout for Basic Plan (Rs. 7,000) -> 100% covered by credit (Rs. 0 cash)
        $sub = $this->createSubscription([
            'tenant_id' => $tenant->id,
            'plan_id' => Plan::where('slug', 'basic')->first()->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $res = $this->actingAs($admin)->post("http://carry.{$this->baseDomain}/subscription/checkout", [
            'terms_accepted' => '1',
            'plan_slug' => 'basic',
        ]);

        $invoice = SubscriptionInvoice::where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($invoice);
        $this->assertEquals(0, $invoice->amount_cents); // Rs. 0 payable
        $this->assertEquals(700000, $invoice->credit_cents); // Rs. 7,000 credit used
        $this->assertEquals(SubscriptionInvoice::STATUS_PAID, $invoice->status);
        $this->assertNull($invoice->receipt_number); // Gapless receipt preserved (null on Rs. 0!)

        // Balance carried forward = Rs. 8,000 (800,000 cents)
        $this->assertEquals(800000, $creditService->getBalance($tenant));
    }

    public function test_credit_reservation_and_release_on_unpaid_invoice(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $tenant = Tenant::factory()->active()->create([
            'id' => 'res-clinic',
            'subdomain' => 'resclinic',
            'plan' => 'pro',
        ]);
        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $tenant->id]);

        $creditService = app(ReferralCreditService::class);
        $referral = ClinicReferral::create([
            'referrer_tenant_id' => $tenant->id,
            'referral_code' => 'resclinic',
            'status' => ClinicReferral::STATUS_REWARDED,
            'reward_amount_cents' => 500000,
        ]);
        $creditService->recordReward($tenant, $referral, 500000);
        $this->assertEquals(500000, $creditService->getBalance($tenant));

        $sub = $this->createSubscription([
            'tenant_id' => $tenant->id,
            'plan_id' => Plan::where('slug', 'pro')->first()->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        // Checkout for Pro (Rs. 9,000) with Rs. 5,000 credit -> Rs. 4,000 cash remaining
        $this->actingAs($admin)->post("http://resclinic.{$this->baseDomain}/subscription/checkout", [
            'terms_accepted' => '1',
            'plan_slug' => 'pro',
        ]);

        $invoice = SubscriptionInvoice::where('tenant_id', $tenant->id)->latest('id')->first();
        $this->assertEquals(400000, $invoice->amount_cents);
        $this->assertEquals(500000, $invoice->credit_cents);

        // Credit is reserved: available balance is now Rs. 0
        $this->assertEquals(0, $creditService->getBalance($tenant));

        // Checkout expires/fails -> release reservation
        $creditService->releaseReservation($invoice, 'Checkout expired');

        // Credit balance restored to Rs. 5,000!
        $this->assertEquals(500000, $creditService->getBalance($tenant));
    }

    public function test_refund_on_invoice_restores_credit_to_ledger(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $tenant = Tenant::factory()->active()->create([
            'id' => 'refund-credit-clinic',
            'subdomain' => 'refcredit',
            'plan' => 'pro',
        ]);

        $invoice = $this->createInvoice([
            'tenant_id' => $tenant->id,
            'amount_cents' => 400000,
            'credit_cents' => 500000,
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);

        $tx = $this->createTransaction([
            'tenant_id' => $tenant->id,
            'invoice_id' => $invoice->id,
            'amount_cents' => 400000,
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ]);

        $refundReq = RefundRequest::create([
            'public_id' => 'REF-TEST-001',
            'tenant_id' => $tenant->id,
            'payment_id' => $tx->id,
            'requested_amount_cents' => 400000,
            'approved_amount_cents' => 400000,
            'reason_type' => 'other',
            'status' => RefundRequest::STATUS_APPROVED,
        ]);

        // Process refund
        app(ReferralService::class)->onInvoiceRefunded($refundReq, 400000);

        // Credit portion (Rs. 5,000) restored to ledger (User Change #4)
        $this->assertEquals(500000, app(ReferralCreditService::class)->getBalance($tenant));
    }

    public function test_refund_on_qualifying_invoice_reverses_reward(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $referrer = Tenant::factory()->active()->create([
            'id' => 'clawback-ref',
            'subdomain' => 'clawback',
            'plan' => 'pro',
        ]);
        $referred = Tenant::factory()->active()->create([
            'id' => 'clawback-referred',
            'subdomain' => 'clawref',
            'plan' => 'pro',
        ]);

        $referral = ClinicReferral::create([
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $referred->id,
            'referral_code' => 'clawback',
            'status' => ClinicReferral::STATUS_REWARDED,
            'reward_amount_cents' => 900000,
        ]);
        app(ReferralCreditService::class)->recordReward($referrer, $referral, 900000);

        // Referred clinic requests and gets a refund
        $refInvoice = $this->createInvoice([
            'tenant_id' => $referred->id,
            'amount_cents' => 900000,
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);
        $tx = $this->createTransaction([
            'tenant_id' => $referred->id,
            'invoice_id' => $refInvoice->id,
            'amount_cents' => 900000,
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ]);
        $refundReq = RefundRequest::create([
            'public_id' => 'REF-CLAW-001',
            'tenant_id' => $referred->id,
            'payment_id' => $tx->id,
            'requested_amount_cents' => 900000,
            'approved_amount_cents' => 900000,
            'reason_type' => 'other',
            'status' => RefundRequest::STATUS_APPROVED,
        ]);

        app(ReferralService::class)->onInvoiceRefunded($refundReq, 900000);

        $referral->refresh();
        $this->assertEquals(ClinicReferral::STATUS_CANCELLED, $ref_status = $referral->status);
        // Referrer's credit was clawed back (balance is now 0)
        $this->assertEquals(0, app(ReferralCreditService::class)->getBalance($referrer));
    }

    public function test_self_referral_signals_are_detected_and_flagged(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $referrer = Tenant::factory()->active()->create([
            'id' => 'abuse-referrer',
            'subdomain' => 'abuseref',
            'phone' => '0771234567',
        ]);
        User::factory()->clinicAdmin()->create([
            'tenant_id' => $referrer->id,
            'email' => 'dr.smith@medvisit.lk',
            'phone' => '0771234567',
        ]);

        $detector = app(ReferralAbuseDetector::class);

        // Same email signal
        $flagsEmail = $detector->detectRegistrationAbuse($referrer, [
            'email' => 'DR.SMITH@medvisit.lk',
        ]);
        $this->assertArrayHasKey('same_owner_email', $flagsEmail);

        // Same phone signal
        $flagsPhone = $detector->detectRegistrationAbuse($referrer, [
            'phone' => '+94 77 123 4567',
        ]);
        $this->assertArrayHasKey('same_phone', $flagsPhone);
    }

    public function test_demo_and_comp_clinics_are_excluded(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $demoClinic = Tenant::factory()->active()->create([
            'id' => 'demo-clinic',
            'subdomain' => 'democlinic',
            'is_demo' => true,
            'plan' => 'pro',
        ]);

        $this->assertTrue($demoClinic->isCompOrDemo());

        $compClinic = Tenant::factory()->active()->create([
            'id' => 'comp-clinic',
            'subdomain' => 'compclinic',
            'is_demo' => false,
            'plan' => 'comp',
        ]);

        $this->assertTrue($compClinic->isCompOrDemo());
    }

    public function test_annual_cap_enforced(): void
    {
        Config::set('referrals.enabled', true);
        Config::set('referrals.annual_cap_multiplier', 2); // Max 2 months = Rs. 18,000 for Pro

        $referrer = Tenant::factory()->active()->create([
            'id' => 'capped-clinic',
            'subdomain' => 'capped',
            'plan' => 'pro', // Rs. 9,000/mo
        ]);

        $creditService = app(ReferralCreditService::class);
        $detector = app(ReferralAbuseDetector::class);

        // Grant 1st reward: Rs. 9,000
        $ref1 = ClinicReferral::create([
            'referrer_tenant_id' => $referrer->id,
            'referral_code' => 'capped',
            'status' => ClinicReferral::STATUS_REWARDED,
            'reward_amount_cents' => 900000,
        ]);
        $creditService->recordReward($referrer, $ref1, 900000);

        // 2nd reward of Rs. 9,000 reaches the annual cap of 2 * 9,000 = Rs. 18,000
        $allowed = $detector->calculateAllowedAmountUnderAnnualCap($referrer, 900000);
        $this->assertEquals(900000, $allowed);

        $ref2 = ClinicReferral::create([
            'referrer_tenant_id' => $referrer->id,
            'referral_code' => 'capped',
            'status' => ClinicReferral::STATUS_REWARDED,
            'reward_amount_cents' => 900000,
        ]);
        $creditService->recordReward($referrer, $ref2, 900000);

        // 3rd reward should be capped to 0!
        $allowed3 = $detector->calculateAllowedAmountUnderAnnualCap($referrer, 900000);
        $this->assertEquals(0, $allowed3);
    }

    public function test_credits_expire_after_configured_period(): void
    {
        Config::set('referrals.enabled', true);
        $tenant = Tenant::factory()->active()->create([
            'id' => 'expiry-clinic',
            'subdomain' => 'expclinic',
            'plan' => 'pro',
        ]);

        $creditService = app(ReferralCreditService::class);
        $ref = ClinicReferral::create([
            'referrer_tenant_id' => $tenant->id,
            'referral_code' => 'expclinic',
            'status' => ClinicReferral::STATUS_REWARDED,
            'reward_amount_cents' => 900000,
        ]);

        // Insert grant with past expiration date
        TenantBillingCredit::create([
            'tenant_id' => $tenant->id,
            'referral_id' => $ref->id,
            'type' => TenantBillingCredit::TYPE_REFERRAL_REWARD,
            'amount_cents' => 900000,
            'balance_after_cents' => 900000,
            'expires_at' => Carbon::now()->subDay(),
        ]);

        // Balance check should expire overdue credit and return 0
        $balance = $creditService->getBalance($tenant);
        $this->assertEquals(0, $balance);
    }

    public function test_super_admin_can_approve_reject_and_edit_code_once(): void
    {
        Config::set('referrals.enabled', true);
        app(PlatformSettingsService::class)->set('referrals.enabled', true);

        $superAdmin = User::factory()->superAdmin()->create();

        $referrer = Tenant::factory()->active()->create([
            'id' => 'admin-test-clinic',
            'subdomain' => 'admintest',
            'plan' => 'pro',
        ]);
        $referred = Tenant::factory()->active()->create([
            'id' => 'referred-adm',
            'subdomain' => 'refadm',
            'plan' => 'pro',
        ]);

        $referral = ClinicReferral::create([
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $referred->id,
            'referral_code' => 'admintest',
            'status' => ClinicReferral::STATUS_REWARD_PENDING,
            'reward_amount_cents' => 900000,
        ]);

        // 1. Super Admin approves
        $res = $this->actingAs($superAdmin)->post("http://medvisit.localhost/super-admin/referrals/{$referral->id}/approve", [
            'admin_notes' => 'Verified clean registration',
        ]);
        $res->assertSessionHas('success');

        $referral->refresh();
        $this->assertEquals(ClinicReferral::STATUS_REWARDED, $referral->status);
        $this->assertEquals(900000, app(ReferralCreditService::class)->getBalance($referrer));

        // 2. Super Admin edits referral code once
        $resEdit = $this->actingAs($superAdmin)->post("http://medvisit.localhost/super-admin/referrals/clinics/{$referrer->id}/edit-code", [
            'code' => 'custom-code',
        ]);
        $resEdit->assertSessionHas('success');

        $referrer->refresh();
        $this->assertEquals('custom-code', $referrer->referral_code);
        $this->assertNotNull($referrer->referral_code_edited_at);

        // 3. Second edit attempt should be rejected
        $resEdit2 = $this->actingAs($superAdmin)->post("http://medvisit.localhost/super-admin/referrals/clinics/{$referrer->id}/edit-code", [
            'code' => 'another-code',
        ]);
        $resEdit2->assertSessionHasErrors('code');
    }
}
