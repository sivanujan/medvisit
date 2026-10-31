<?php

declare(strict_types=1);

namespace Tests\Feature\SuperAdmin;

use App\Mail\Subscription\RefundApprovedMail;
use App\Models\PaymentTransaction;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TwoStepRefundFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected Tenant $tenant;

    protected PaymentTransaction $payment;

    protected Subscription $subscription;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $this->superAdmin = User::factory()->create([
            'tenant_id' => null,
        ]);
        $this->superAdmin->assignRole($role);

        $this->tenant = Tenant::factory()->create([
            'id' => 'test-clinic-refund',
            'name' => 'Test Refund Clinic',
            'email' => 'billing@testclinic.lk',
            'status' => 'active',
        ]);

        $this->subscription = Subscription::create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => 3,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now()->subDays(5),
            'current_period_end' => now()->addDays(25),
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $this->tenant->id,
            'subscription_id' => $this->subscription->id,
            'invoice_number' => 'INV-2026-TEST-001',
            'amount_cents' => 900000,
            'status' => SubscriptionInvoice::STATUS_PAID,
            'period_start' => now()->subDays(5),
            'period_end' => now()->addDays(25),
        ]);

        $this->payment = PaymentTransaction::create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $invoice->id,
            'amount_cents' => 900000,
            'refunded_amount_cents' => 0,
            'status' => 'succeeded',
            'gateway' => 'payments_lk',
            'gateway_checkout_id' => 'chk_test_123',
            'card_last4' => '4242',
        ]);
    }

    public function test_step_1_approve_ends_access_without_sending_email_and_logs_audit(): void
    {
        Mail::fake();

        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $this->payment->id,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Unused service within guarantee',
            'requested_amount_cents' => 900000,
            'eligible_amount_cents' => 900000,
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->post("/super-admin/refunds/{$refund->id}/approve", [
                'approved_amount_cents' => 900000,
                'decision_reason' => 'Approved under 7-day guarantee',
                'admin_note' => 'Step 1 approval',
            ]);

        $response->assertRedirect();

        $refund->refresh();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refund->status);
        $this->assertEquals(900000, $refund->approved_amount_cents);
        $this->assertNotNull($refund->decided_at);

        // Access ended
        $this->subscription->refresh();
        $this->assertEquals(Subscription::STATUS_CANCELLED, $this->subscription->status);
        $this->tenant->refresh();
        $this->assertEquals('expired', $this->tenant->status);

        // Step 1: NO email sent yet
        Mail::assertNotSent(RefundApprovedMail::class);

        // Step 1 Audit logged
        $this->assertDatabaseHas('audit_events', [
            'action' => 'subscription.refund_approved',
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->superAdmin->id,
        ]);
    }

    public function test_step_2_mark_refund_completed_requires_reference_and_date_sends_email_and_logs_audit(): void
    {
        Mail::fake();

        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $this->payment->id,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Unused service',
            'requested_amount_cents' => 900000,
            'approved_amount_cents' => 900000,
            'status' => RefundRequest::STATUS_APPROVED,
            'decided_at' => now()->subDay(),
        ]);

        // Validation failure without reference or date
        $response = $this->actingAs($this->superAdmin)
            ->post("/super-admin/refunds/{$refund->id}/process", [
                'refund_method' => 'payments_lk_dashboard',
                'refund_reference' => '',
                'refund_date' => '',
            ]);
        $response->assertSessionHasErrors(['refund_reference', 'refund_date']);

        // Successful Step 2
        $responseSuccess = $this->actingAs($this->superAdmin)
            ->post("/super-admin/refunds/{$refund->id}/process", [
                'refund_method' => 'payments_lk_dashboard',
                'refund_reference' => 'ref_plk_reversal_7788',
                'refund_date' => '2026-10-30',
                'admin_note' => 'Step 2 executed via Payments.lk dashboard',
            ]);

        $responseSuccess->assertRedirect();

        $refund->refresh();
        $this->assertEquals(RefundRequest::STATUS_REFUNDED, $refund->status);
        $this->assertEquals('ref_plk_reversal_7788', $refund->refund_reference);
        $this->assertNotNull($refund->credit_note_number);
        $this->assertEquals('2026-10-30', $refund->refunded_at->format('Y-m-d'));

        // Email dispatched
        Mail::assertQueued(RefundApprovedMail::class, function ($mail) use ($refund) {
            return $mail->refundRequest->id === $refund->id;
        });

        // Step 2 Audit logged
        $this->assertDatabaseHas('audit_events', [
            'action' => 'subscription.refund_completed',
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->superAdmin->id,
        ]);
    }

    public function test_step_1_partial_refund_keeps_subscription_active_and_does_not_revoke_access(): void
    {
        Mail::fake();

        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $this->payment->id,
            'reason_type' => RefundRequest::REASON_DOWNTIME,
            'description' => '3 hours downtime compensation',
            'requested_amount_cents' => 300000,
            'eligible_amount_cents' => 300000,
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        // Super admin approves partial refund (300,000 cents < 900,000 cents full payment)
        $response = $this->actingAs($this->superAdmin)
            ->post("/super-admin/refunds/{$refund->id}/approve", [
                'approved_amount_cents' => 300000,
                'refund_type' => 'partial',
                'decision_reason' => 'Downtime service credit approved',
            ]);

        $response->assertRedirect();

        $refund->refresh();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refund->status);
        $this->assertEquals(RefundRequest::TYPE_PARTIAL, $refund->refund_type);
        $this->assertEquals(300000, $refund->approved_amount_cents);

        // Subscription remains ACTIVE and tenant remains ACTIVE
        $this->subscription->refresh();
        $this->assertEquals(Subscription::STATUS_ACTIVE, $this->subscription->status);
        $this->tenant->refresh();
        $this->assertEquals('active', $this->tenant->status);

        // Complete Step 2 for partial refund
        $responseStep2 = $this->actingAs($this->superAdmin)
            ->post("/super-admin/refunds/{$refund->id}/process", [
                'refund_method' => 'payments_lk_dashboard',
                'refund_reference' => 'PAYLK-PARTIAL-9988',
                'refund_date' => now()->format('Y-m-d'),
                'cancel_subscription' => false,
            ]);

        $responseStep2->assertRedirect();

        // Subscription STILL remains ACTIVE after Step 2 completion
        $this->subscription->refresh();
        $this->assertEquals(Subscription::STATUS_ACTIVE, $this->subscription->status);
        $this->tenant->refresh();
        $this->assertEquals('active', $this->tenant->status);

        // Email queued and marked as partial
        Mail::assertQueued(RefundApprovedMail::class, function ($mail) {
            return $mail->viewData()['isPartial'] === true;
        });
    }

    public function test_telegram_reminder_is_sent_for_refund_pending_more_than_two_days(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        config([
            'services.telegram.bot_token' => 'dummy_token',
            'services.telegram.chat_id' => '123456789',
        ]);

        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $this->payment->id,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Unused service',
            'requested_amount_cents' => 900000,
            'approved_amount_cents' => 900000,
            'status' => RefundRequest::STATUS_APPROVED,
            'decided_at' => Carbon::now('Asia/Colombo')->subDays(3),
        ]);

        $this->artisan('medvisit:check-refund-slas')
            ->assertSuccessful();

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'api.telegram.org')
                && str_contains($request['text'], 'Refund Pending Payments.lk Action — Reminder');
        });
    }
}
