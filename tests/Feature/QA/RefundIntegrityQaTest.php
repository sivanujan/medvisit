<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Mail\Subscription\NewRefundRequestAdminMail;
use App\Mail\Subscription\RefundApprovedMail;
use App\Mail\Subscription\RefundCompletedMail;
use App\Mail\Subscription\RefundRejectedMail;
use App\Mail\Subscription\RefundRequestReceivedMail;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\PlatformIncident;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Billing\CreditNotePdfService;
use App\Services\Refunds\ManualRefundProcessor;
use App\Services\Refunds\RefundEligibilityService;
use Carbon\Carbon;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RefundIntegrityQaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private RefundEligibilityService $eligibilityService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
        $this->eligibilityService = app(RefundEligibilityService::class);
    }

    private function createPaidTransaction(int $amountCents, ?Carbon $createdAt = null, string $prefix = 'TEST'): array
    {
        $createdAt = $createdAt ?? now();
        $sub = $this->tenant->subscription ?? Subscription::create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => Plan::first()?->id ?? 1,
            'status' => 'active',
            'current_period_start' => $createdAt->copy()->startOfMonth(),
            'current_period_end' => $createdAt->copy()->endOfMonth(),
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $this->tenant->id,
            'subscription_id' => $sub->id,
            'invoice_number' => 'INV-'.$prefix.'-'.uniqid(),
            'amount_cents' => $amountCents,
            'period_start' => $createdAt,
            'period_end' => $createdAt->copy()->addMonth(),
            'status' => SubscriptionInvoice::STATUS_PAID,
            'paid_at' => $createdAt,
            'created_at' => $createdAt,
        ]);

        $payment = PaymentTransaction::create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $invoice->id,
            'gateway_payment_id' => 'PAY-'.$prefix.'-'.uniqid(),
            'amount_cents' => $amountCents,
            'currency' => 'LKR',
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
            'created_at' => $createdAt,
        ]);

        $invoice->update(['payment_transaction_id' => $payment->id]);

        return [$payment, $invoice];
    }

    /**
     * 1. First payment unused refund:
     * - Exactly 7 days after payment: ELIGIBLE.
     * - 8 days (exceeding 7-day policy limit): NOT ELIGIBLE.
     */
    public function test_first_payment_unused_seven_day_boundary(): void
    {
        $freshTenant = Tenant::factory()->active()->create([
            'id' => 'fresh-refund-ten',
            'name' => 'Fresh Refund Clinic',
            'subdomain' => 'fresh-refund-ten',
        ]);

        $paidAt = Carbon::now()->subDays(7); // Exactly 7 days ago

        $sub = Subscription::create([
            'tenant_id' => $freshTenant->id,
            'plan_id' => Plan::first()?->id ?? 1,
            'status' => 'active',
            'current_period_start' => $paidAt->copy()->startOfMonth(),
            'current_period_end' => $paidAt->copy()->endOfMonth(),
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $freshTenant->id,
            'subscription_id' => $sub->id,
            'invoice_number' => 'INV-7DAYS-1',
            'amount_cents' => 900000,
            'period_start' => $paidAt,
            'period_end' => $paidAt->copy()->addMonth(),
            'status' => SubscriptionInvoice::STATUS_PAID,
            'paid_at' => $paidAt,
            'created_at' => $paidAt,
        ]);

        $payment = PaymentTransaction::create([
            'tenant_id' => $freshTenant->id,
            'invoice_id' => $invoice->id,
            'gateway_payment_id' => 'PAY-7DAYS-1',
            'amount_cents' => 900000,
            'currency' => 'LKR',
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
            'created_at' => $paidAt,
        ]);

        $invoice->update(['payment_transaction_id' => $payment->id]);

        // Case A: Evaluated at exactly 7 days
        $eval7Days = $this->eligibilityService->evaluate(
            payment: $payment,
            reasonType: RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            asOf: $paidAt->copy()->addDays(7)
        );

        $this->assertSame(RefundRequest::ELIGIBILITY_ELIGIBLE, $eval7Days['eligibility']);
        $this->assertSame(900000, $eval7Days['eligible_amount_cents']);

        // Case B: Evaluated at 8 days
        $eval8Days = $this->eligibilityService->evaluate(
            payment: $payment,
            reasonType: RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            asOf: $paidAt->copy()->addDays(8)
        );

        $this->assertSame(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $eval8Days['eligibility']);
        $this->assertSame(0, $eval8Days['eligible_amount_cents']);
    }

    /**
     * 2. Platform downtime refund:
     * - Exactly 48 hours or less: NOT ELIGIBLE (policy requires > 48 continuous hours).
     * - > 48 continuous hours (e.g. 72h = 3 days): ELIGIBLE for pro-rata partial refund.
     */
    public function test_platform_downtime_duration_rules(): void
    {
        $periodStart = Carbon::now()->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();

        [$payment, $invoice] = $this->createPaidTransaction(900000, $periodStart, 'DOWNTIME');
        $invoice->update(['period_end' => $periodEnd]);

        // Incident A: Exactly 48 hours
        $incident48h = PlatformIncident::create([
            'title' => '48h Outage',
            'status' => 'resolved',
            'severity' => 'critical',
            'started_at' => $periodStart->copy()->addDays(2),
            'ended_at' => $periodStart->copy()->addDays(4), // 48 hours exactly
        ]);

        $eval48h = $this->eligibilityService->evaluate(
            payment: $payment,
            reasonType: RefundRequest::REASON_DOWNTIME,
            asOf: $incident48h->ended_at->copy()->addDay()
        );

        $this->assertSame(RefundRequest::ELIGIBILITY_NOT_ELIGIBLE, $eval48h['eligibility']);

        // Incident B: 72 hours (3 days)
        $incident48h->delete();
        $incident72h = PlatformIncident::create([
            'title' => '72h Outage',
            'status' => 'resolved',
            'severity' => 'critical',
            'started_at' => $periodStart->copy()->addDays(2),
            'ended_at' => $periodStart->copy()->addDays(5), // 72 hours (3 days)
        ]);

        $eval72h = $this->eligibilityService->evaluate(
            payment: $payment,
            reasonType: RefundRequest::REASON_DOWNTIME,
            asOf: $incident72h->ended_at->copy()->addDay()
        );

        $this->assertSame(RefundRequest::ELIGIBILITY_PARTIALLY_ELIGIBLE, $eval72h['eligibility']);
        // Pro-rata: 900,000 / 30 * 3 days = 90,000 cents (Rs. 900.00)
        $this->assertSame(90000, $eval72h['eligible_amount_cents']);
    }

    /**
     * 3. Duplicate payment refund eligibility:
     * Two payments for overlapping subscription period are eligible for full refund.
     */
    public function test_duplicate_charge_eligibility(): void
    {
        $start = Carbon::now()->startOfMonth();
        $end = $start->copy()->endOfMonth();

        [$p1, $inv1] = $this->createPaidTransaction(700000, $start, 'DUP1');
        $inv1->update(['period_start' => $start, 'period_end' => $end]);

        [$p2, $inv2] = $this->createPaidTransaction(700000, $start->copy()->addHour(), 'DUP2');
        $inv2->update(['period_start' => $start, 'period_end' => $end]);

        $evalDup = $this->eligibilityService->evaluate(
            payment: $p2,
            reasonType: RefundRequest::REASON_DUPLICATE_CHARGE
        );

        $this->assertSame(RefundRequest::ELIGIBILITY_ELIGIBLE, $evalDup['eligibility']);
        $this->assertSame(700000, $evalDup['eligible_amount_cents']);
    }

    /**
     * 4. Credit note generation and PDF rendering.
     */
    public function test_credit_note_generation_and_pdf(): void
    {
        [$payment, $invoice] = $this->createPaidTransaction(900000, now(), 'CN');

        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $payment->id,
            'user_id' => $this->admin->id,
            'reason_type' => RefundRequest::REASON_DUPLICATE_CHARGE,
            'description' => 'Test duplicate charge refund',
            'requested_amount_cents' => 900000,
            'approved_amount_cents' => 900000,
            'status' => RefundRequest::STATUS_APPROVED,
        ]);

        $processor = app(ManualRefundProcessor::class);
        $processed = $processor->process($refund, [
            'method' => 'payments_lk_dashboard',
            'reference' => 'TXN-REF-QA-12345',
            'actor_user_id' => $this->admin->id,
        ]);

        $this->assertSame(RefundRequest::STATUS_REFUNDED, $processed->status);
        $this->assertNotNull($processed->credit_note_number);
        $this->assertMatchesRegularExpression('/^CN-\d{4}-\d{6}$/', $processed->credit_note_number);

        // Verify PDF generation does not fail and returns valid binary
        $pdfService = app(CreditNotePdfService::class);
        $pdfContent = $pdfService->generatePdf($processed);
        $this->assertNotEmpty($pdfContent);
        $this->assertStringStartsWith('%PDF-', $pdfContent);
    }

    /**
     * 5. Refund lifecycle mailables render without errors.
     */
    public function test_refund_mailables_render(): void
    {
        [$payment, $invoice] = $this->createPaidTransaction(700000, now(), 'MAIL');

        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $payment->id,
            'user_id' => $this->admin->id,
            'reason_type' => RefundRequest::REASON_FIRST_PAYMENT_UNUSED,
            'description' => 'Did not use',
            'requested_amount_cents' => 700000,
            'approved_amount_cents' => 700000,
            'eligibility' => RefundRequest::ELIGIBILITY_ELIGIBLE,
            'credit_note_number' => 'CN-2026-000099',
            'status' => RefundRequest::STATUS_REFUNDED,
        ]);

        $mail1 = new RefundRequestReceivedMail($refund, 'City Health', 'http://cityhealth.medvisit.localhost/settings/billing');
        $this->assertNotEmpty($mail1->render());

        $mail2 = new NewRefundRequestAdminMail($refund, 'City Health', 'http://medvisit.localhost/admin/refunds/'.$refund->id);
        $this->assertNotEmpty($mail2->render());

        $mail3 = new RefundApprovedMail($refund, 'City Health', 'http://cityhealth.medvisit.localhost/settings/billing');
        $this->assertNotEmpty($mail3->render());

        $mail4 = new RefundCompletedMail($refund, null);
        $this->assertNotEmpty($mail4->render());

        $mail5 = new RefundRejectedMail($refund, 'City Health', 'Outside policy window', 'http://medvisit.localhost/dispute-policy');
        $this->assertNotEmpty($mail5->render());
    }
}
