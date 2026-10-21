<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Contracts\PaymentGateway;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\PaymentsLkGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionPaymentTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        // Swap payment gateway with FakeGateway for testing
        $this->app->instance(PaymentGateway::class, new FakeGateway);
    }

    public function test_existing_clinic_has_active_comp_subscription_and_unlocked_access(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'existing-clinic',
            'name' => 'Existing Care Clinic',
            'subdomain' => 'existing',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@existing.lk',
        ]);

        $subscription = $tenant->subscription;
        $this->assertNotNull($subscription);
        $this->assertTrue($subscription->isActive());
        $this->assertSame('comp', $subscription->plan->slug);

        $response = $this->actingAs($admin)->get("http://existing.{$this->baseDomain}/dashboard");
        $response->assertStatus(200);
    }

    public function test_unpaid_clinic_redirects_clinic_admin_to_subscribe_page(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'unpaid-clinic',
            'name' => 'Unpaid Clinic',
            'subdomain' => 'unpaid',
            'status' => 'pending_payment',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@unpaid.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://unpaid.{$this->baseDomain}/dashboard");
        $response->assertRedirect("http://unpaid.{$this->baseDomain}/subscription/subscribe");

        $subscribeResponse = $this->actingAs($admin)->get("http://unpaid.{$this->baseDomain}/subscription/subscribe");
        $subscribeResponse->assertStatus(200);
    }

    public function test_unpaid_clinic_redirects_non_admin_staff_to_friendly_inactive_page_never_payment_page(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'unpaid-clinic-2',
            'name' => 'Unpaid Clinic 2',
            'subdomain' => 'unpaid2',
            'status' => 'pending_payment',
        ]);

        $doctor = User::factory()->doctor()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@unpaid2.lk',
        ]);

        $receptionist = User::factory()->receptionist()->create([
            'tenant_id' => $tenant->id,
            'email' => 'reception@unpaid2.lk',
        ]);

        // Doctor is redirected to inactive page, never subscribe
        $response = $this->actingAs($doctor)->get("http://unpaid2.{$this->baseDomain}/dashboard");
        $response->assertRedirect("http://unpaid2.{$this->baseDomain}/subscription/inactive");

        // Doctor attempting to open payment page is also redirected to inactive notice
        $subscribeAttempt = $this->actingAs($doctor)->get("http://unpaid2.{$this->baseDomain}/subscription/subscribe");
        $subscribeAttempt->assertRedirect("http://unpaid2.{$this->baseDomain}/subscription/inactive");

        // Inactive page renders 200 OK
        $inactiveResponse = $this->actingAs($doctor)->get("http://unpaid2.{$this->baseDomain}/subscription/inactive");
        $inactiveResponse->assertStatus(200);

        // Receptionist is also directed to inactive page
        $recResponse = $this->actingAs($receptionist)->get("http://unpaid2.{$this->baseDomain}/dashboard");
        $recResponse->assertRedirect("http://unpaid2.{$this->baseDomain}/subscription/inactive");
    }

    public function test_public_booking_is_unavailable_when_subscription_is_inactive(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'inactive-clinic',
            'name' => 'Inactive Health',
            'subdomain' => 'inactive',
            'status' => 'pending_payment',
        ]);

        $response = $this->get("http://inactive.{$this->baseDomain}/book");
        $response->assertStatus(503);

        $apiResponse = $this->getJson("http://inactive.{$this->baseDomain}/book/api/availability/any-doc");
        $apiResponse->assertStatus(503);
    }

    public function test_clinic_admin_can_initiate_checkout_and_is_redirected_to_gateway(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'pay-clinic',
            'name' => 'Pay Clinic',
            'subdomain' => 'paycli',
            'status' => 'pending_payment',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@paycli.lk',
        ]);

        $response = $this->actingAs($admin)->post("http://paycli.{$this->baseDomain}/subscription/checkout");
        // Inertia location redirect to https://checkout.payments.lk/chk_fake_...
        $this->assertTrue(in_array($response->status(), [302, 409], true));
    }

    public function test_webhook_payment_succeeded_activates_subscription_with_exact_checks(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'wh-clinic',
            'name' => 'Webhook Clinic',
            'subdomain' => 'whclinic',
            'status' => 'pending_payment',
        ]);

        $subscription = $tenant->subscription;
        $standardPlan = Plan::where('slug', 'medvisit-standard')->first();

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-2026-TEST01',
            'amount_cents' => $standardPlan->price_cents,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'due_date' => now()->addDays(3),
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        $payload = [
            'id' => 'evt_test_001',
            'type' => 'payment.succeeded',
            'data' => [
                'payment' => [
                    'id' => 'pay_test_001',
                    'checkoutId' => 'chk_test_001',
                    'amountCents' => $standardPlan->price_cents,
                    'currency' => 'LKR',
                    'reference' => 'INV-2026-TEST01',
                    'status' => 'succeeded',
                ],
            ],
        ];

        $rawBody = json_encode($payload);
        $time = time();
        $secret = 'test_webhook_secret';
        config(['services.paymentslk.webhook_secret' => $secret]);

        $signature = hash_hmac('sha256', "{$time}.{$rawBody}", $secret);
        $header = "t={$time},v1={$signature}";

        $response = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [],
            [],
            [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );

        $response->assertStatus(200);

        $invoice->refresh();
        $subscription->refresh();

        $this->assertSame(SubscriptionInvoice::STATUS_PAID, $invoice->status);
        $this->assertNotNull($invoice->paid_at);
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertTrue($subscription->isActive());
        $this->assertNotNull($subscription->current_period_end);

        // Duplicate test: sending payment.succeeded again should NOT extend subscription further
        $periodEndFirst = $subscription->current_period_end;

        $dupResponse = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [],
            [],
            [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );
        $dupResponse->assertStatus(200);

        $subscription->refresh();
        $this->assertEquals($periodEndFirst->toDateTimeString(), $subscription->current_period_end->toDateTimeString());
    }

    public function test_webhook_payment_failed_records_failure_and_invoice_stays_unpaid(): void
    {
        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'fail-clinic',
            'name' => 'Fail Clinic',
            'subdomain' => 'failcli',
            'status' => 'pending_payment',
        ]);

        $subscription = $tenant->subscription;
        $standardPlan = Plan::where('slug', 'medvisit-standard')->first();

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-2026-FAIL01',
            'amount_cents' => $standardPlan->price_cents,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'due_date' => now()->addDays(3),
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        $payload = [
            'id' => 'evt_fail_001',
            'type' => 'payment.failed',
            'data' => [
                'payment' => [
                    'id' => 'pay_fail_001',
                    'checkoutId' => 'chk_fail_001',
                    'amountCents' => $standardPlan->price_cents,
                    'currency' => 'LKR',
                    'reference' => 'INV-2026-FAIL01',
                    'status' => 'failed',
                ],
            ],
        ];

        $rawBody = json_encode($payload);
        $time = time();
        $secret = 'test_webhook_secret';
        config(['services.paymentslk.webhook_secret' => $secret]);

        $signature = hash_hmac('sha256', "{$time}.{$rawBody}", $secret);
        $header = "t={$time},v1={$signature}";

        $response = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [],
            [],
            [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );

        $response->assertStatus(200);

        $invoice->refresh();
        $subscription->refresh();

        $this->assertSame(SubscriptionInvoice::STATUS_UNPAID, $invoice->status);
        $this->assertFalse($subscription->isActive());
    }

    public function test_webhook_rejects_expired_timestamp_or_invalid_signature(): void
    {
        $payload = ['id' => 'evt_bad_001', 'type' => 'payment.succeeded'];
        $rawBody = json_encode($payload);
        $secret = 'test_secret';
        config(['services.paymentslk.webhook_secret' => $secret]);

        $realGateway = new PaymentsLkGateway([
            'webhook_secret' => $secret,
        ]);
        $this->app->instance(PaymentGateway::class, $realGateway);

        // 1. Invalid signature
        $response = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [],
            [],
            [],
            ['HTTP_Payments-Signature' => 't='.time().',v1=wrongsignature', 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );
        $response->assertStatus(400);

        // 2. Timestamp older than 300 seconds
        $oldTime = time() - 350;
        $sig = hash_hmac('sha256', "{$oldTime}.{$rawBody}", $secret);
        $oldResponse = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [],
            [],
            [],
            ['HTTP_Payments-Signature' => "t={$oldTime},v1={$sig}", 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );
        $oldResponse->assertStatus(400);
    }

    public function test_scheduled_renewals_command_generates_renewal_invoices_and_expires_overdue(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'expiring-clinic',
            'name' => 'Expiring Clinic',
            'subdomain' => 'expiring',
        ]);

        $standardPlan = Plan::where('slug', 'medvisit-standard')->first();

        // Active subscription expiring in 3 days
        $subscription = Subscription::updateOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'plan_id' => $standardPlan->id,
                'status' => Subscription::STATUS_ACTIVE,
                'current_period_start' => now()->subMonth(),
                'current_period_end' => now()->addDays(3),
                'activated_at' => now()->subMonth(),
            ]
        );

        $this->artisan('subscriptions:check-renewals')->assertSuccessful();

        $renewalInvoice = SubscriptionInvoice::where('subscription_id', $subscription->id)
            ->where('status', SubscriptionInvoice::STATUS_UNPAID)
            ->first();

        $this->assertNotNull($renewalInvoice);
        $this->assertSame($standardPlan->price_cents, $renewalInvoice->amount_cents);

        // Now test overdue expiration past grace period (3 days)
        $subscription->update([
            'current_period_end' => now()->subDays(5),
        ]);

        $this->artisan('subscriptions:check-renewals')->assertSuccessful();

        $subscription->refresh();
        $this->assertSame(Subscription::STATUS_EXPIRED, $subscription->status);
        $this->assertFalse($subscription->isActive());
    }

    public function test_super_admin_can_manage_subscriptions_and_mark_offline_payments(): void
    {
        $superAdmin = User::factory()->superAdmin()->create([
            'email' => 'super@medvisit.lk',
        ]);

        $tenant = Tenant::factory()->pendingPayment()->create([
            'id' => 'offline-clinic',
            'name' => 'Offline Clinic',
            'subdomain' => 'offline',
            'status' => 'pending_payment',
        ]);

        $subscription = $tenant->subscription;
        $standardPlan = Plan::where('slug', 'medvisit-standard')->first();

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-2026-OFF01',
            'amount_cents' => $standardPlan->price_cents,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'due_date' => now()->addDays(3),
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        // 1. Super admin views dashboard
        $viewResponse = $this->actingAs($superAdmin)->get('/super-admin/subscriptions');
        $viewResponse->assertStatus(200);

        // 2. Mark invoice paid offline
        $payResponse = $this->actingAs($superAdmin)->post("/super-admin/subscriptions/invoices/{$invoice->id}/mark-paid");
        $payResponse->assertSessionHas('success');

        $invoice->refresh();
        $subscription->refresh();

        $this->assertSame(SubscriptionInvoice::STATUS_PAID, $invoice->status);
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);

        // 3. Toggle comp
        $compResponse = $this->actingAs($superAdmin)->post("/super-admin/subscriptions/{$subscription->id}/toggle-comp");
        $compResponse->assertSessionHas('success');

        $subscription->refresh();
        $this->assertSame('comp', $subscription->plan->slug);

        // 4. Extend period
        $extendResponse = $this->actingAs($superAdmin)->post("/super-admin/subscriptions/{$subscription->id}/extend", [
            'days' => 60,
        ]);
        $extendResponse->assertSessionHas('success');
    }
}
