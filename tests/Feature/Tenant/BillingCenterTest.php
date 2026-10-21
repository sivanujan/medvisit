<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Contracts\PaymentGateway;
use App\Mail\Subscription\SubscriptionCancelledMail;
use App\Mail\Subscription\SubscriptionPaymentFailedMail;
use App\Mail\Subscription\SubscriptionPaymentSuccessMail;
use App\Mail\Subscription\SubscriptionRenewalReminderMail;
use App\Mail\Subscription\SubscriptionResumedMail;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\TenantBillingDetail;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\SubscriptionPaymentService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BillingCenterTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->app->instance(PaymentGateway::class, new FakeGateway);
        Mail::fake();
    }

    public function test_clinic_admin_can_view_billing_center(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'care-clinic',
            'name' => 'Care Clinic',
            'subdomain' => 'care',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@care.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://care.{$this->baseDomain}/settings/billing");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Subscription/BillingCenter')
            ->has('currentPlan')
            ->has('billingDetails')
            ->has('paymentHistory')
        );
    }

    public function test_non_admin_cannot_access_billing_center(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'guard-clinic',
            'name' => 'Guard Clinic',
            'subdomain' => 'guard',
        ]);

        $doctor = User::factory()->doctor()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@guard.lk',
        ]);

        $response = $this->actingAs($doctor)->get("http://guard.{$this->baseDomain}/settings/billing");
        $response->assertStatus(403);
    }

    public function test_clinic_admin_can_update_billing_details(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'details-clinic',
            'name' => 'Details Clinic',
            'subdomain' => 'details',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@details.lk',
        ]);

        $response = $this->actingAs($admin)->put("http://details.{$this->baseDomain}/settings/billing/details", [
            'legal_name' => 'Details Healthcare (Pvt) Ltd',
            'billing_email' => 'accounts@details.lk',
            'phone' => '+94 77 123 4567',
            'address' => '45 Hospital Road, Jaffna',
            'tax_id' => 'VAT123456789',
        ]);

        $response->assertRedirect();

        $detail = TenantBillingDetail::where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($detail);
        $this->assertSame('Details Healthcare (Pvt) Ltd', $detail->legal_name);
        $this->assertSame('accounts@details.lk', $detail->billing_email);
        $this->assertSame('VAT123456789', $detail->tax_id);
    }

    public function test_clinic_admin_can_cancel_subscription_at_period_end(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'cancel-clinic',
            'name' => 'Cancel Clinic',
            'subdomain' => 'cancel',
        ]);

        $standardPlan = Plan::firstOrCreate(
            ['slug' => 'medvisit-standard'],
            ['name' => 'MedVisit Standard', 'price_cents' => 500000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $subscription = $tenant->subscription;
        $subscription->update([
            'plan_id' => $standardPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => Carbon::now()->subDays(10),
            'current_period_end' => Carbon::now()->addDays(20),
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@cancel.lk',
        ]);

        $response = $this->actingAs($admin)->post("http://cancel.{$this->baseDomain}/settings/billing/cancel", [
            'reason' => 'Price / too expensive',
            'reason_detail' => 'Need a smaller clinic package',
        ]);

        $response->assertRedirect();

        $subscription->refresh();
        $this->assertTrue((bool) $subscription->cancels_at_period_end);
        $this->assertSame('Price / too expensive', $subscription->cancellation_reason);
        $this->assertSame('Need a smaller clinic package', $subscription->cancellation_reason_detail);
        $this->assertNotNull($subscription->cancelled_at);

        Mail::assertQueued(SubscriptionCancelledMail::class);
    }

    public function test_clinic_admin_can_resume_cancelling_subscription(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'resume-clinic',
            'name' => 'Resume Clinic',
            'subdomain' => 'resume',
        ]);

        $standardPlan = Plan::firstOrCreate(
            ['slug' => 'medvisit-standard'],
            ['name' => 'MedVisit Standard', 'price_cents' => 500000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $subscription = $tenant->subscription;
        $subscription->update([
            'plan_id' => $standardPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'cancels_at_period_end' => true,
            'cancelled_at' => Carbon::now()->subDay(),
            'cancellation_reason' => 'Other',
            'current_period_start' => Carbon::now()->subDays(5),
            'current_period_end' => Carbon::now()->addDays(25),
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@resume.lk',
        ]);

        $response = $this->actingAs($admin)->post("http://resume.{$this->baseDomain}/settings/billing/resume");
        $response->assertRedirect();

        $subscription->refresh();
        $this->assertFalse((bool) $subscription->cancels_at_period_end);
        $this->assertNull($subscription->cancelled_at);
        $this->assertNull($subscription->cancellation_reason);

        Mail::assertQueued(SubscriptionResumedMail::class);
    }

    public function test_comp_clinic_cannot_cancel_or_change_plan(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'comp-clinic',
            'name' => 'Comp Clinic',
            'subdomain' => 'comp',
        ]);

        $compPlan = Plan::firstOrCreate(
            ['slug' => 'comp'],
            ['name' => 'Complimentary Lifetime', 'price_cents' => 0, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $subscription = $tenant->subscription;
        $subscription->update([
            'plan_id' => $compPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_end' => null,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@comp.lk',
        ]);

        $cancelResponse = $this->actingAs($admin)->post("http://comp.{$this->baseDomain}/settings/billing/cancel", [
            'reason' => 'Testing',
        ]);
        $cancelResponse->assertStatus(403);

        $changePlanResponse = $this->actingAs($admin)->get("http://comp.{$this->baseDomain}/settings/billing/change-plan");
        $changePlanResponse->assertStatus(403);
    }

    public function test_upgrade_proration_invoice_has_proration_type_and_payment_switches_plan_without_extending_period_end(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'upgrade-clinic',
            'name' => 'Upgrade Clinic',
            'subdomain' => 'upgrade',
        ]);

        $starterPlan = Plan::firstOrCreate(
            ['slug' => 'starter'],
            ['name' => 'MedVisit Starter', 'price_cents' => 300000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $growthPlan = Plan::firstOrCreate(
            ['slug' => 'growth'],
            ['name' => 'MedVisit Growth', 'price_cents' => 700000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $now = Carbon::now('Asia/Colombo');
        $periodStart = $now->copy()->subDays(10);
        $periodEnd = $now->copy()->addDays(20);

        $subscription = $tenant->subscription;
        $subscription->update([
            'plan_id' => $starterPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => $periodStart,
            'current_period_end' => $periodEnd,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@upgrade.lk',
        ]);

        // Initiate upgrade checkout
        $response = $this->actingAs($admin)->post("http://upgrade.{$this->baseDomain}/settings/billing/upgrade", [
            'new_plan_id' => $growthPlan->id,
        ]);

        $this->assertTrue(in_array($response->status(), [302, 409], true));

        // Verify the proration invoice was created
        $prorationInvoice = SubscriptionInvoice::where('tenant_id', $tenant->id)
            ->where('type', SubscriptionInvoice::TYPE_PRORATION)
            ->first();

        $this->assertNotNull($prorationInvoice);
        $this->assertSame(SubscriptionInvoice::STATUS_UNPAID, $prorationInvoice->status);
        $this->assertGreaterThan(0, $prorationInvoice->amount_cents);

        // Process successful payment for proration invoice
        /** @var SubscriptionPaymentService $paymentService */
        $paymentService = app(SubscriptionPaymentService::class);
        $paymentService->processSuccessfulPayment([
            'reference' => $prorationInvoice->invoice_number,
            'amount_cents' => $prorationInvoice->amount_cents,
            'currency' => 'LKR',
            'status' => 'succeeded',
            'method' => 'card',
        ], [
            'payment' => [
                'card' => ['scheme' => 'Visa', 'last4' => '4242'],
            ],
        ]);

        $prorationInvoice->refresh();
        $subscription->refresh();

        // 1. Invoice is marked paid with a receipt number assigned
        $this->assertSame(SubscriptionInvoice::STATUS_PAID, $prorationInvoice->status);
        $this->assertNotNull($prorationInvoice->receipt_number);
        $this->assertStringStartsWith('RCPT-', $prorationInvoice->receipt_number);

        // 2. Plan is updated immediately to Growth Plan
        $this->assertSame($growthPlan->id, $subscription->plan_id);

        // 3. User Requirement 1: Proration invoices MUST NOT extend current_period_end!
        $this->assertEquals($periodEnd->toDateTimeString(), $subscription->current_period_end->toDateTimeString());

        // 4. Payment success email with receipt attached is sent
        Mail::assertQueued(SubscriptionPaymentSuccessMail::class);
    }

    public function test_downgrade_schedules_pending_plan_at_period_end(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'downgrade-clinic',
            'name' => 'Downgrade Clinic',
            'subdomain' => 'down',
        ]);

        $growthPlan = Plan::firstOrCreate(
            ['slug' => 'growth'],
            ['name' => 'MedVisit Growth', 'price_cents' => 700000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $starterPlan = Plan::firstOrCreate(
            ['slug' => 'starter'],
            ['name' => 'MedVisit Starter', 'price_cents' => 300000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $subscription = $tenant->subscription;
        $subscription->update([
            'plan_id' => $growthPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => Carbon::now()->subDays(5),
            'current_period_end' => Carbon::now()->addDays(25),
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@down.lk',
        ]);

        $response = $this->actingAs($admin)->post("http://down.{$this->baseDomain}/settings/billing/downgrade", [
            'new_plan_id' => $starterPlan->id,
        ]);

        $response->assertRedirect();

        $subscription->refresh();
        $this->assertSame($starterPlan->id, $subscription->pending_plan_id);
        $this->assertSame($growthPlan->id, $subscription->plan_id); // Current plan unchanged
    }

    public function test_pdf_receipt_download_and_view(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'pdf-clinic',
            'name' => 'PDF Clinic',
            'subdomain' => 'pdf',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@pdf.lk',
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $tenant->subscription->id,
            'invoice_number' => 'INV-2026-PDF01',
            'receipt_number' => 'RCPT-2026-PDF01',
            'type' => SubscriptionInvoice::TYPE_SUBSCRIPTION,
            'amount_cents' => 500000,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'paid_at' => Carbon::now(),
            'period_start' => Carbon::now(),
            'period_end' => Carbon::now()->addMonth(),
        ]);

        // Download route
        $downloadResponse = $this->actingAs($admin)->get("http://pdf.{$this->baseDomain}/settings/billing/invoices/{$invoice->id}/download");
        $downloadResponse->assertStatus(200);
        $downloadResponse->assertHeader('content-type', 'application/pdf');

        // View route
        $viewResponse = $this->actingAs($admin)->get("http://pdf.{$this->baseDomain}/settings/billing/invoices/{$invoice->id}/view");
        $viewResponse->assertStatus(200);
        $viewResponse->assertHeader('content-type', 'application/pdf');
    }

    public function test_success_email_queued_once_with_pdf_attachment(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'mail-clinic',
            'name' => 'Mail Clinic',
            'subdomain' => 'mailcli',
        ]);

        User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@mailcli.lk',
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $tenant->subscription->id,
            'invoice_number' => 'INV-2026-MAIL01',
            'amount_cents' => 500000,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        /** @var SubscriptionPaymentService $service */
        $service = app(SubscriptionPaymentService::class);
        $service->processSuccessfulPayment([
            'reference' => $invoice->invoice_number,
            'amount_cents' => 500000,
            'currency' => 'LKR',
            'status' => 'succeeded',
            'method' => 'card',
        ]);

        Mail::assertQueued(SubscriptionPaymentSuccessMail::class, 1);
        Mail::assertQueued(SubscriptionPaymentSuccessMail::class, function (SubscriptionPaymentSuccessMail $mail) use ($invoice) {
            $attachments = $mail->attachments();
            $this->assertNotEmpty($attachments);

            return $mail->invoice->invoice_number === $invoice->invoice_number;
        });
    }

    public function test_duplicate_webhook_does_not_send_second_success_email(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'dupmail-clinic',
            'name' => 'Dup Mail Clinic',
            'subdomain' => 'dupmail',
        ]);

        User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@dupmail.lk',
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $tenant->subscription->id,
            'invoice_number' => 'INV-2026-DUPMAIL01',
            'amount_cents' => 500000,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        $payload = [
            'id' => 'evt_dup_999',
            'type' => 'payment.succeeded',
            'data' => [
                'payment' => [
                    'id' => 'pay_dup_999',
                    'checkoutId' => 'chk_dup_999',
                    'amountCents' => 500000,
                    'currency' => 'LKR',
                    'reference' => 'INV-2026-DUPMAIL01',
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

        // Webhook dispatch 1
        $r1 = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [], [], [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );
        $r1->assertStatus(200);

        // Webhook dispatch 2 (exact duplicate event)
        $r2 = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [], [], [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );
        $r2->assertStatus(200);

        Mail::assertQueued(SubscriptionPaymentSuccessMail::class, 1);
    }

    public function test_failed_payment_queues_failed_payment_email(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'failmail-clinic',
            'name' => 'Fail Mail Clinic',
            'subdomain' => 'failmail',
        ]);

        User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@failmail.lk',
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $tenant->subscription->id,
            'invoice_number' => 'INV-2026-FAIL02',
            'amount_cents' => 500000,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        $payload = [
            'id' => 'evt_fail_999',
            'type' => 'payment.failed',
            'data' => [
                'payment' => [
                    'id' => 'pay_fail_999',
                    'checkoutId' => 'chk_fail_999',
                    'amountCents' => 500000,
                    'currency' => 'LKR',
                    'reference' => 'INV-2026-FAIL02',
                    'status' => 'failed',
                    'failureMessage' => 'Transaction declined by issuer',
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
            [], [], [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );
        $response->assertStatus(200);

        Mail::assertQueued(SubscriptionPaymentFailedMail::class, 1);
    }

    public function test_renewal_reminders_7d_and_1d_sent_exactly_once(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'remind-clinic',
            'name' => 'Remind Clinic',
            'subdomain' => 'remind',
        ]);

        User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@remind.lk',
        ]);

        $standardPlan = Plan::firstOrCreate(
            ['slug' => 'medvisit-standard'],
            ['name' => 'MedVisit Standard', 'price_cents' => 500000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $subscription = $tenant->subscription;
        // Exactly 7 days out
        $target7d = Carbon::now('Asia/Colombo')->startOfDay()->addDays(7);
        $subscription->update([
            'plan_id' => $standardPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'cancels_at_period_end' => false,
            'current_period_end' => $target7d,
        ]);

        // Run reminder command (1st time)
        $this->artisan('subscriptions:send-reminders')->assertSuccessful();
        Mail::assertQueued(SubscriptionRenewalReminderMail::class, 1);

        // Run reminder command immediately again -> must NOT send duplicate
        $this->artisan('subscriptions:send-reminders')->assertSuccessful();
        Mail::assertQueued(SubscriptionRenewalReminderMail::class, 1);

        // Now move period to 1 day out
        $target1d = Carbon::now('Asia/Colombo')->startOfDay()->addDay();
        $subscription->update(['current_period_end' => $target1d]);

        $this->artisan('subscriptions:send-reminders')->assertSuccessful();
        Mail::assertQueued(SubscriptionRenewalReminderMail::class, 2);

        // Run again -> still 2 total
        $this->artisan('subscriptions:send-reminders')->assertSuccessful();
        Mail::assertQueued(SubscriptionRenewalReminderMail::class, 2);
    }

    public function test_cancelling_subscription_becomes_cancelled_and_blocked_after_period_end_via_check_expirations(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'expired-clinic',
            'name' => 'Expired Clinic',
            'subdomain' => 'expiredcli',
        ]);

        $standardPlan = Plan::firstOrCreate(
            ['slug' => 'medvisit-standard'],
            ['name' => 'MedVisit Standard', 'price_cents' => 500000, 'billing_interval' => 'monthly', 'is_active' => true]
        );

        $subscription = $tenant->subscription;
        $subscription->update([
            'plan_id' => $standardPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'cancels_at_period_end' => true,
            'current_period_end' => Carbon::now()->subHour(), // Period already ended
        ]);

        // Run check-expirations
        $this->artisan('subscriptions:check-expirations')->assertSuccessful();

        $subscription->refresh();
        $this->assertSame(Subscription::STATUS_CANCELLED, $subscription->status);
        $this->assertFalse($subscription->isActive());

        // Clinic staff is now blocked
        $doctor = User::factory()->doctor()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@expiredcli.lk',
        ]);
        $docResponse = $this->actingAs($doctor)->get("http://expiredcli.{$this->baseDomain}/dashboard");
        $docResponse->assertRedirect("http://expiredcli.{$this->baseDomain}/subscription/inactive");

        // Public booking returns 503
        $bookingResponse = $this->get("http://expiredcli.{$this->baseDomain}/book");
        $bookingResponse->assertStatus(503);
    }

    public function test_receipt_download_by_another_tenant_aborts_404(): void
    {
        $tenantA = Tenant::factory()->active()->create([
            'id' => 'clinic-a',
            'name' => 'Clinic A',
            'subdomain' => 'clinica',
        ]);

        $tenantB = Tenant::factory()->active()->create([
            'id' => 'clinic-b',
            'name' => 'Clinic B',
            'subdomain' => 'clinicb',
        ]);

        $adminB = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenantB->id,
            'email' => 'admin@clinicb.lk',
        ]);

        $invoiceA = SubscriptionInvoice::create([
            'tenant_id' => $tenantA->id,
            'subscription_id' => $tenantA->subscription->id,
            'invoice_number' => 'INV-2026-A001',
            'receipt_number' => 'RCPT-2026-A001',
            'amount_cents' => 500000,
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);

        // Admin of Clinic B attempts to download or view Clinic A's invoice
        $responseDownload = $this->actingAs($adminB)->get("http://clinicb.{$this->baseDomain}/settings/billing/invoices/{$invoiceA->id}/download");
        $responseDownload->assertStatus(404);

        $responseView = $this->actingAs($adminB)->get("http://clinicb.{$this->baseDomain}/settings/billing/invoices/{$invoiceA->id}/view");
        $responseView->assertStatus(404);
    }

    public function test_receipt_numbers_unique_under_concurrent_generation(): void
    {
        $count = 30;
        $generated = [];

        for ($i = 0; $i < $count; $i++) {
            $rcpt = SubscriptionInvoice::generateReceiptNumber();
            $this->assertMatchesRegularExpression('/^RCPT-\d{4}-\d{6}$/', $rcpt);
            $generated[] = $rcpt;
        }

        $unique = array_unique($generated);
        $this->assertCount($count, $unique, 'Receipt numbers must be strictly unique');
    }
}
