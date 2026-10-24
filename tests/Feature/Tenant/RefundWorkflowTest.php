<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Contracts\PaymentGateway;
use App\Mail\Subscription\NewRefundRequestAdminMail;
use App\Mail\Subscription\RefundApprovedMail;
use App\Mail\Subscription\RefundCompletedMail;
use App\Mail\Subscription\RefundRequestReceivedMail;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\PlatformIncident;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use App\Services\Refunds\RefundEligibilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RefundWorkflowTest extends TestCase
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

    private function createClinicEnvironment(string $subdomain = 'care'): array
    {
        $plan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Pro',
                'price_cents' => 900000, // Rs. 9,000
                'billing_interval' => 'monthly',
                'is_active' => true,
            ]
        );

        $tenant = Tenant::factory()->active()->create([
            'id' => "{$subdomain}-clinic",
            'name' => ucfirst($subdomain).' Clinic',
            'subdomain' => $subdomain,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => "admin@{$subdomain}.lk",
        ]);

        $now = Carbon::now('Asia/Colombo');
        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => $now->copy()->subDays(2),
            'current_period_end' => $now->copy()->addDays(28),
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'type' => SubscriptionInvoice::TYPE_SUBSCRIPTION,
            'invoice_number' => 'INV-2026-001001',
            'receipt_number' => 'RCP-2026-001001',
            'amount_cents' => 900000,
            'period_start' => $now->copy()->subDays(2),
            'period_end' => $now->copy()->addDays(28),
            'due_date' => $now->copy()->subDays(2),
            'paid_at' => $now->copy()->subDays(2),
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);

        $payment = PaymentTransaction::create([
            'tenant_id' => $tenant->id,
            'invoice_id' => $invoice->id,
            'gateway' => 'paymentslk',
            'gateway_checkout_id' => 'chk_test_123',
            'gateway_payment_id' => 'pay_test_456',
            'amount_cents' => 900000,
            'currency' => 'LKR',
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
            'refunded_amount_cents' => 0,
            'idempotency_key' => 'idem_test_'.$subdomain.'_'.uniqid(),
            'created_at' => $now->copy()->subDays(2),
        ]);

        return compact('plan', 'tenant', 'admin', 'subscription', 'invoice', 'payment');
    }

    public function test_eligibility_service_handles_first_payment_unused_correctly(): void
    {
        $env = $this->createClinicEnvironment('firstpay');
        $service = app(RefundEligibilityService::class);

        // When clinic has 0 appointments/tokens and payment within 7 days -> Eligible
        $eval = $service->evaluate($env['payment'], RefundRequest::REASON_FIRST_PAYMENT_UNUSED);
        $this->assertEquals(RefundRequest::ELIGIBILITY_ELIGIBLE, $eval['eligibility']);
        $this->assertEquals(900000, $eval['eligible_amount_cents']);

        // If payment was made > 7 days ago -> Ineligible
        $oldPayment = clone $env['payment'];
        $env['invoice']->update(['paid_at' => Carbon::now()->subDays(10)]);
        $oldPayment->invoice = $env['invoice']->fresh();
        $evalOld = $service->evaluate($oldPayment, RefundRequest::REASON_FIRST_PAYMENT_UNUSED);
        $this->assertEquals(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $evalOld['eligibility']);
    }

    public function test_eligibility_service_handles_duplicate_payment_detection(): void
    {
        $env = $this->createClinicEnvironment('dup');
        $service = app(RefundEligibilityService::class);

        // Alone without overlapping paid invoice -> Ineligible for duplicate
        $evalSolo = $service->evaluate($env['payment'], RefundRequest::REASON_DUPLICATE_CHARGE);
        $this->assertEquals(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $evalSolo['eligibility']);

        // Create an overlapping paid invoice and transaction for same period
        $dupInvoice = SubscriptionInvoice::create([
            'tenant_id' => $env['tenant']->id,
            'subscription_id' => $env['subscription']->id,
            'type' => SubscriptionInvoice::TYPE_SUBSCRIPTION,
            'invoice_number' => 'INV-2026-DUP002',
            'amount_cents' => 900000,
            'period_start' => $env['invoice']->period_start,
            'period_end' => $env['invoice']->period_end,
            'due_date' => $env['invoice']->due_date,
            'paid_at' => $env['invoice']->paid_at,
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);

        PaymentTransaction::create([
            'tenant_id' => $env['tenant']->id,
            'invoice_id' => $dupInvoice->id,
            'gateway' => 'paymentslk',
            'gateway_checkout_id' => 'chk_dup_456',
            'amount_cents' => 900000,
            'currency' => 'LKR',
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
            'idempotency_key' => 'idem_dup_overlap',
        ]);

        $evalDup = $service->evaluate($env['payment'], RefundRequest::REASON_DUPLICATE_CHARGE);
        $this->assertEquals(RefundRequest::ELIGIBILITY_ELIGIBLE, $evalDup['eligibility']);
        $this->assertEquals(900000, $evalDup['eligible_amount_cents']);
    }

    public function test_eligibility_service_handles_service_downtime(): void
    {
        $env = $this->createClinicEnvironment('downtime');
        $service = app(RefundEligibilityService::class);

        // When no platform incident exists
        $evalNone = $service->evaluate($env['payment'], RefundRequest::REASON_DOWNTIME);
        $this->assertEquals(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $evalNone['eligibility']);

        // Create platform incident of 72 hours (3 days)
        $start = Carbon::now()->subDays(2);
        $end = $start->copy()->addHours(72);
        PlatformIncident::create([
            'title' => 'Core Infrastructure Outage',
            'started_at' => $start,
            'ended_at' => $end,
            'affects_all_tenants' => true,
            'is_planned_maintenance' => false,
        ]);

        $evalDowntime = $service->evaluate($env['payment'], RefundRequest::REASON_DOWNTIME);
        $this->assertEquals(RefundRequest::ELIGIBILITY_PARTIALLY_ELIGIBLE, $evalDowntime['eligibility']);
        // 3 days of Pro plan (9,000 LKR / 30 * 3 = 900 LKR = 90,000 cents)
        $this->assertEquals(90000, $evalDowntime['eligible_amount_cents']);
    }

    public function test_clinic_admin_can_view_billing_center_page(): void
    {
        $env = $this->createClinicEnvironment('viewbilling');

        $response = $this->actingAs($env['admin'])
            ->get("http://viewbilling.{$this->baseDomain}/settings/billing");

        $response->assertStatus(200);
    }

    public function test_clinic_admin_can_preview_refund_eligibility(): void
    {
        $env = $this->createClinicEnvironment('preview');

        $response = $this->actingAs($env['admin'])
            ->postJson("http://preview.{$this->baseDomain}/settings/billing/refund-preview", [
                'payment_id' => $env['payment']->id,
                'reason' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'eligible' => true,
            'eligible_amount_cents' => 900000,
            'currency' => 'LKR',
        ]);
    }

    public function test_clinic_admin_can_submit_refund_request(): void
    {
        $env = $this->createClinicEnvironment('submit');

        $response = $this->actingAs($env['admin'])
            ->post("http://submit.{$this->baseDomain}/settings/billing/refunds", [
                'payment_id' => $env['payment']->id,
                'reason' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
                'reason_details' => 'Decided to postpone opening clinic. No appointments booked.',
                'acknowledged_policy' => true,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('refund_requests', [
            'tenant_id' => $env['tenant']->id,
            'payment_id' => $env['payment']->id,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        Mail::assertQueued(RefundRequestReceivedMail::class);
        Mail::assertQueued(NewRefundRequestAdminMail::class);
    }

    public function test_clinic_cannot_have_multiple_open_refund_requests_for_same_payment(): void
    {
        $env = $this->createClinicEnvironment('dupcheck');

        RefundRequest::create([
            'tenant_id' => $env['tenant']->id,
            'payment_id' => $env['payment']->id,
            'requested_by_user_id' => $env['admin']->id,
            'requested_amount_cents' => 900000,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Initial refund request details',
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        $response = $this->actingAs($env['admin'])
            ->post("http://dupcheck.{$this->baseDomain}/settings/billing/refunds", [
                'payment_id' => $env['payment']->id,
                'reason' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
                'reason_details' => 'Second attempt should fail.',
                'acknowledged_policy' => true,
            ]);

        $response->assertSessionHas('error');
    }

    public function test_clinic_can_withdraw_pending_refund_request(): void
    {
        $env = $this->createClinicEnvironment('cancelreq');

        $refund = RefundRequest::create([
            'tenant_id' => $env['tenant']->id,
            'payment_id' => $env['payment']->id,
            'requested_by_user_id' => $env['admin']->id,
            'requested_amount_cents' => 900000,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Initial refund request details',
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        $response = $this->actingAs($env['admin'])
            ->post("http://cancelreq.{$this->baseDomain}/settings/billing/refunds/{$refund->id}/cancel");

        $response->assertRedirect();
        $this->assertEquals(RefundRequest::STATUS_CANCELLED_BY_CLINIC, $refund->fresh()->status);
    }

    public function test_super_admin_can_approve_reject_and_process_refund(): void
    {
        $env = $this->createClinicEnvironment('adminflow');

        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin = User::factory()->create([
            'email' => 'super@medvisit.lk',
        ]);
        $superAdmin->assignRole('super_admin');

        $refund = RefundRequest::create([
            'tenant_id' => $env['tenant']->id,
            'payment_id' => $env['payment']->id,
            'requested_by_user_id' => $env['admin']->id,
            'requested_amount_cents' => 900000,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Decided not to proceed before setting up clinic.',
            'status' => RefundRequest::STATUS_REQUESTED,
            'eligibility' => RefundRequest::ELIGIBILITY_ELIGIBLE,
        ]);

        // 1. Super Admin Approves
        $approveResponse = $this->actingAs($superAdmin)
            ->post("http://{$this->baseDomain}/super-admin/refunds/{$refund->id}/approve", [
                'approved_amount_cents' => 900000,
                'admin_note' => 'Approved - verified no usage.',
            ]);

        $approveResponse->assertRedirect();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refund->fresh()->status);
        $this->assertEquals(900000, $refund->fresh()->approved_amount_cents);
        Mail::assertQueued(RefundApprovedMail::class);

        // 2. Super Admin Processes Refund Manually
        $processResponse = $this->actingAs($superAdmin)
            ->post("http://{$this->baseDomain}/super-admin/refunds/{$refund->id}/process", [
                'refund_method' => RefundRequest::METHOD_PAYMENTS_LK_DASHBOARD,
                'refund_reference' => 'PLK-REF-998822',
                'admin_note' => 'Processed via Payments.lk Merchant Portal successfully.',
            ]);

        $processResponse->assertRedirect();
        $refund = $refund->fresh();
        $this->assertEquals(RefundRequest::STATUS_REFUNDED, $refund->status);
        $this->assertNotNull($refund->credit_note_number);
        $this->assertStringStartsWith('CN-', $refund->credit_note_number);
        $this->assertEquals('PLK-REF-998822', $refund->refund_reference);

        // Payment transaction refunded amount updated
        $payment = $env['payment']->fresh();
        $this->assertEquals(900000, $payment->refunded_amount_cents);
        $this->assertEquals('full', $payment->refund_status);

        // Subscription immediately cancelled due to first_payment_unused
        $subscription = $env['subscription']->fresh();
        $this->assertEquals(Subscription::STATUS_CANCELLED, $subscription->status);

        // Credit note mail dispatched with PDF
        Mail::assertQueued(RefundCompletedMail::class);
    }

    public function test_credit_note_pdf_generation_and_tenant_download_isolation(): void
    {
        $env = $this->createClinicEnvironment('pdfclinic');

        $refund = RefundRequest::create([
            'tenant_id' => $env['tenant']->id,
            'payment_id' => $env['payment']->id,
            'requested_by_user_id' => $env['admin']->id,
            'requested_amount_cents' => 900000,
            'approved_amount_cents' => 900000,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Unused subscription',
            'status' => RefundRequest::STATUS_REFUNDED,
            'refund_method' => RefundRequest::METHOD_BANK_TRANSFER,
            'credit_note_number' => 'CN-2026-000042',
            'refunded_at' => Carbon::now(),
        ]);

        // Clinic admin can download Credit Note PDF
        $response = $this->actingAs($env['admin'])
            ->get("http://pdfclinic.{$this->baseDomain}/settings/billing/refunds/{$refund->id}/credit-note");

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));

        // Other tenant clinic admin gets 404 (isolation enforced)
        $otherTenant = Tenant::factory()->active()->create(['id' => 'other-clinic', 'subdomain' => 'other']);
        $otherAdmin = User::factory()->clinicAdmin()->create(['tenant_id' => $otherTenant->id]);

        $isolatedResponse = $this->actingAs($otherAdmin)
            ->get("http://other.{$this->baseDomain}/settings/billing/refunds/{$refund->id}/credit-note");

        $isolatedResponse->assertStatus(404);
    }
}
