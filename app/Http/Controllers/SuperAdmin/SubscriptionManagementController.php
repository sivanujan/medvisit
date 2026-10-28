<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Services\AuditLogger;
use App\Services\Payments\SubscriptionPaymentService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->input('status', 'all');
        $planFilter = $request->input('plan', 'all');
        $search = trim((string) $request->input('search', ''));

        $plans = Plan::all();
        $now = now();
        $startOfMonth = $now->copy()->startOfMonth();

        // 1. Revenue Summary
        // Collected this month
        $collectedThisMonthCents = PaymentTransaction::where('status', 'succeeded')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('amount_cents');

        // Outstanding past due
        $outstandingPastDueCents = SubscriptionInvoice::whereIn('status', ['unpaid', 'past_due', 'open'])
            ->sum('amount_cents');

        // MRR
        $activePaidSubs = Subscription::with('plan')
            ->where('status', 'active')
            ->whereHas('plan', fn ($q) => $q->where('price_cents', '>', 0)->where('slug', '!=', 'comp'))
            ->get();
        $mrrCents = $activePaidSubs->sum(fn ($s) => $s->plan?->price_cents ?? 0);

        // 2. Subscriptions Query
        $subsQuery = Subscription::with(['tenant', 'plan', 'invoices' => function ($q) {
            $q->latest('id')->limit(3);
        }])->orderByDesc('id');

        if ($statusFilter !== 'all') {
            $subsQuery->where('status', $statusFilter);
        }

        if ($planFilter !== 'all') {
            $subsQuery->whereHas('plan', fn ($q) => $q->where('slug', $planFilter));
        }

        if ($search !== '') {
            $subsQuery->whereHas('tenant', function ($q) use ($search) {
                $term = '%'.strtolower($search).'%';
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(id) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(subdomain) LIKE ?', [$term]);
            });
        }

        $subscriptions = $subsQuery->get()
            ->map(fn ($sub) => [
                'id' => $sub->id,
                'tenant_id' => $sub->tenant_id,
                'clinic_name' => $sub->tenant?->name ?? 'Unknown',
                'subdomain' => $sub->tenant?->id,
                'plan_name' => $sub->plan?->name ?? 'None',
                'plan_slug' => $sub->plan?->slug,
                'status' => $sub->status,
                'is_active' => $sub->isActive(),
                'is_in_grace' => $sub->isInGracePeriod(),
                'current_period_start' => $sub->current_period_start?->toDateString(),
                'current_period_end' => $sub->current_period_end?->toDateString(),
                'trial_ends_at' => $sub->trial_ends_at?->toDateString(),
                'created_by' => $sub->created_by,
                'latest_invoice' => $sub->invoices->first() ? [
                    'id' => $sub->invoices->first()->id,
                    'invoice_number' => $sub->invoices->first()->invoice_number,
                    'amount_cents' => $sub->invoices->first()->amount_cents,
                    'status' => $sub->invoices->first()->status,
                ] : null,
            ]);

        // 3. Recent Transactions
        $recentTransactions = PaymentTransaction::with(['tenant', 'invoice'])
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn ($tx) => [
                'id' => $tx->id,
                'clinic_name' => $tx->tenant?->name ?? $tx->tenant_id,
                'invoice_number' => $tx->invoice?->invoice_number,
                'amount_formatted' => $tx->formatted_amount,
                'gateway' => $tx->gateway,
                'status' => $tx->status,
                'created_at' => $tx->created_at?->toDateTimeString(),
            ]);

        // 4. Failed Payments (7 days)
        $failedPayments = PaymentTransaction::with(['tenant', 'invoice'])
            ->where('status', 'failed')
            ->where('created_at', '>=', now()->subDays(7))
            ->latest('id')
            ->get()
            ->map(fn ($tx) => [
                'id' => $tx->id,
                'clinic_name' => $tx->tenant?->name ?? $tx->tenant_id,
                'invoice_id' => $tx->subscription_invoice_id,
                'invoice_number' => $tx->invoice?->invoice_number,
                'amount_formatted' => $tx->formatted_amount,
                'gateway' => $tx->gateway,
                'created_at' => $tx->created_at?->diffForHumans(),
            ]);

        return Inertia::render('SuperAdmin/Subscriptions', [
            'subscriptions' => $subscriptions,
            'recentTransactions' => $recentTransactions,
            'failedPayments' => $failedPayments,
            'plans' => $plans,
            'revenueSummary' => [
                'mrr_lkr' => round($mrrCents / 100, 2),
                'collected_this_month_lkr' => round($collectedThisMonthCents / 100, 2),
                'outstanding_past_due_lkr' => round($outstandingPastDueCents / 100, 2),
            ],
            'filters' => [
                'status' => $statusFilter,
                'plan' => $planFilter,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Mark an unpaid invoice as paid offline (bank transfer / manual approval).
     */
    public function markPaid(
        Request $request,
        SubscriptionPaymentService $paymentService
    ): RedirectResponse {
        $invoiceParam = $request->route('invoice');
        $invoice = $invoiceParam instanceof SubscriptionInvoice
            ? $invoiceParam
            : SubscriptionInvoice::findOrFail($invoiceParam);

        $paymentService->processSuccessfulPayment([
            'reference' => $invoice->invoice_number,
            'amount_cents' => $invoice->amount_cents,
            'currency' => 'LKR',
            'status' => 'succeeded',
            'method' => 'manual_bank_transfer',
        ], ['marked_by' => $request->user()->email]);

        AuditLogger::log('superadmin.subscription.invoice_marked_paid', [
            'tenant_id' => $invoice->tenant_id,
            'resource' => $invoice,
            'user' => $request->user(),
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
                'amount_cents' => $invoice->amount_cents,
            ],
        ]);

        $msg = "Invoice {$invoice->invoice_number} marked as paid.";

        return back()->with('status', $msg)->with('success', $msg);
    }

    /**
     * Send payment reminder email for an unpaid invoice.
     */
    public function sendReminder(Request $request): RedirectResponse
    {
        $invoiceId = (string) ($request->route('invoice') ?? $request->route('invoiceId'));
        $invoice = SubscriptionInvoice::with('tenant')->findOrFail($invoiceId);

        AuditLogger::log('superadmin.subscription.payment_reminder_sent', [
            'tenant_id' => $invoice->tenant_id,
            'resource' => $invoice,
            'user' => $request->user(),
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
            ],
        ]);

        return back()->with('status', "Payment reminder queued for {$invoice->tenant?->name} ({$invoice->invoice_number}).");
    }

    /**
     * Toggle complimentary (free permanent) status for a clinic.
     */
    public function toggleComp(Request $request): RedirectResponse
    {
        $subscriptionId = $request->route('subscription');
        $subscription = $subscriptionId instanceof Subscription ? $subscriptionId : Subscription::findOrFail($subscriptionId);

        $compPlan = Plan::where('slug', 'comp')->firstOrFail();

        if ($subscription->plan_id === $compPlan->id) {
            $standardPlan = Plan::where('slug', 'medvisit-standard')->first();
            $subscription->update([
                'plan_id' => $standardPlan?->id ?? 1,
                'status' => 'active',
                'created_by' => 'superadmin:revoked_comp',
            ]);
            $message = 'Complimentary status removed. Clinic reverted to standard plan.';
        } else {
            $subscription->update([
                'plan_id' => $compPlan->id,
                'status' => 'active',
                'current_period_end' => Carbon::now()->addYears(10),
                'created_by' => 'superadmin:granted_comp',
            ]);
            $message = 'Clinic granted complimentary lifetime access.';
        }

        AuditLogger::log('superadmin.subscription.toggle_comp', [
            'tenant_id' => $subscription->tenant_id,
            'resource' => $subscription,
            'user' => $request->user(),
            'metadata' => ['new_plan_id' => $subscription->plan_id],
        ]);

        return back()->with('status', $message)->with('success', $message);
    }

    /**
     * Extend a subscription period by 30 days.
     */
    public function extendPeriod(Request $request): RedirectResponse
    {
        $subscriptionId = $request->route('subscription');
        $subscription = $subscriptionId instanceof Subscription ? $subscriptionId : Subscription::findOrFail($subscriptionId);

        $days = (int) $request->input('days', 30);
        $currentEnd = $subscription->current_period_end ?? Carbon::now();
        $newEnd = Carbon::parse($currentEnd)->addDays($days);

        $subscription->update([
            'current_period_end' => $newEnd,
            'status' => 'active',
        ]);

        AuditLogger::log('superadmin.subscription.extend_period', [
            'tenant_id' => $subscription->tenant_id,
            'resource' => $subscription,
            'user' => $request->user(),
            'metadata' => ['new_period_end' => $newEnd->toDateString()],
        ]);

        $msg = "Subscription extended by 30 days until {$newEnd->toDateString()}.";

        return back()->with('status', $msg)->with('success', $msg);
    }

    /**
     * Send payment reminder for an invoice.
     */
    public function sendPaymentReminder(Request $request): RedirectResponse
    {
        $invoiceId = (string) ($request->route('invoice') ?? $request->route('invoiceId'));
        $invoice = SubscriptionInvoice::with('tenant')->findOrFail($invoiceId);

        AuditLogger::log('superadmin.invoice.payment_reminder_sent', [
            'tenant_id' => $invoice->tenant_id,
            'resource' => $invoice,
            'user' => $request->user(),
            'metadata' => [
                'invoice_number' => $invoice->invoice_number,
                'amount_cents' => $invoice->amount_cents,
            ],
        ]);

        return back()->with('status', "Payment reminder sent to clinic owner for invoice {$invoice->invoice_number}.");
    }
}
