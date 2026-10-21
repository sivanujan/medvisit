<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Settings;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\TenantBillingDetail;
use App\Services\AuditLogger;
use App\Services\Billing\SubscriptionNotificationService;
use App\Services\Billing\SubscriptionProrationService;
use App\Services\Billing\SubscriptionReceiptPdfService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class BillingCenterController extends Controller
{
    /**
     * Display the clinic Billing Center (Settings -> Billing).
     */
    public function index(Request $request): InertiaResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403, 'Only clinic administrators can access the Billing Center.');
        }

        $subscription = $tenant->subscription()->with(['plan', 'pendingPlan'])->first();
        $billingDetail = $tenant->billingDetail;

        $now = Carbon::now('Asia/Colombo');
        $periodEnd = $subscription?->current_period_end?->setTimezone('Asia/Colombo');
        $daysRemaining = $periodEnd ? max(0, (int) ceil($now->diffInDays($periodEnd, false))) : null;

        // Status badge determination
        $statusKey = 'active';
        $statusLabel = 'Active';

        if (! $subscription) {
            $statusKey = 'none';
            $statusLabel = 'No Plan';
        } elseif ($subscription->isComp()) {
            $statusKey = 'comp';
            $statusLabel = 'Complimentary';
        } elseif ($subscription->isTrialing()) {
            $statusKey = 'trial';
            $statusLabel = 'Free Trial';
        } elseif ($subscription->isCancelling()) {
            $statusKey = 'cancelling';
            $statusLabel = 'Cancelling at Period End';
        } elseif ($subscription->isInGracePeriod()) {
            $statusKey = 'past_due';
            $statusLabel = 'Past Due (Grace Period)';
        } elseif (! $subscription->isActive()) {
            $statusKey = 'expired';
            $statusLabel = 'Expired';
        }

        // Invoices / Payment History
        $invoices = $tenant->subscriptionInvoices()
            ->with(['transactions' => fn ($q) => $q->orderByDesc('id')])
            ->orderByDesc('id')
            ->get()
            ->map(function (SubscriptionInvoice $inv) {
                $transaction = $inv->transactions->where('status', 'succeeded')->first() ?? $inv->transactions->first();
                $methodLabel = 'Credit / Debit Card';
                $cardDetails = null;

                if ($transaction) {
                    $raw = $transaction->raw_payload ?? [];
                    $card = $raw['payment']['card'] ?? null;
                    if ($card && ! empty($card['last4'])) {
                        $scheme = ucfirst(strtolower($card['scheme'] ?? 'Card'));
                        $cardDetails = "{$scheme} •••• {$card['last4']}";
                    }
                } elseif ($inv->payment_method === 'offline') {
                    $methodLabel = 'Manual / Offline';
                } elseif ($inv->payment_method === 'comp') {
                    $methodLabel = 'Complimentary';
                }

                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'receipt_number' => $inv->receipt_number,
                    'type' => $inv->type ?? 'subscription',
                    'description' => $inv->type === 'proration'
                        ? 'Plan Upgrade Proration Adjustment'
                        : ($inv->period_start && $inv->period_end
                            ? $inv->period_start->setTimezone('Asia/Colombo')->format('d/m/Y').' – '.$inv->period_end->setTimezone('Asia/Colombo')->format('d/m/Y')
                            : '1 Month Subscription'),
                    'amount_cents' => $inv->amount_cents,
                    'formatted_amount' => $inv->formatted_amount,
                    'issue_date' => $inv->created_at?->setTimezone('Asia/Colombo')->format('d/m/Y'),
                    'paid_at' => $inv->paid_at?->setTimezone('Asia/Colombo')->format('d/m/Y H:i'),
                    'status' => $inv->status,
                    'payment_method' => $methodLabel,
                    'card_details' => $cardDetails,
                    'download_url' => route('tenant.settings.billing.invoice.download', $inv->id),
                    'view_url' => route('tenant.settings.billing.invoice.view', $inv->id),
                    'pay_url' => $inv->status === SubscriptionInvoice::STATUS_UNPAID ? route('tenant.subscription.subscribe') : null,
                ];
            });

        // Upcoming renewal invoice preview
        $upcomingInvoice = null;
        if ($subscription && ! $subscription->isComp() && ! $subscription->isCancelling() && $periodEnd) {
            $targetPlan = $subscription->pendingPlan ?? $subscription->plan;
            $upcomingInvoice = [
                'date' => $periodEnd->format('d/m/Y'),
                'plan_name' => $targetPlan?->name,
                'amount' => $targetPlan?->formatted_price,
                'is_scheduled_downgrade' => (bool) $subscription->pending_plan_id,
            ];
        }

        $unpaidInvoice = $subscription?->latestUnpaidInvoice();

        return Inertia::render('Subscription/BillingCenter', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
            ],
            'currentPlan' => $subscription ? [
                'name' => $subscription->plan?->name ?? 'Custom Plan',
                'price_cents' => $subscription->plan?->price_cents ?? 0,
                'formatted_price' => $subscription->plan?->formatted_price ?? 'Rs. 0.00',
                'status_key' => $statusKey,
                'status_label' => $statusLabel,
                'is_comp' => $subscription->isComp(),
                'is_trialing' => $subscription->isTrialing(),
                'is_cancelling' => $subscription->isCancelling(),
                'cancels_at_period_end' => (bool) $subscription->cancels_at_period_end,
                'period_start' => $subscription->current_period_start?->setTimezone('Asia/Colombo')->format('d/m/Y'),
                'period_end' => $periodEnd?->format('d/m/Y'),
                'trial_ends_at' => $subscription->trial_ends_at?->setTimezone('Asia/Colombo')->format('d/m/Y'),
                'days_remaining' => $daysRemaining,
                'features' => $subscription->plan?->features ?? [],
                'pending_plan' => $subscription->pendingPlan ? [
                    'id' => $subscription->pendingPlan->id,
                    'name' => $subscription->pendingPlan->name,
                    'effective_date' => $periodEnd?->format('d/m/Y'),
                ] : null,
            ] : null,
            'actions' => [
                'can_change_plan' => $subscription && ! $subscription->isComp(),
                'can_cancel' => $subscription && ! $subscription->isComp() && ! $subscription->isCancelling(),
                'can_resume' => $subscription && (bool) $subscription->cancels_at_period_end,
                'has_unpaid_invoice' => (bool) $unpaidInvoice,
                'unpaid_invoice_amount' => $unpaidInvoice?->formatted_amount,
            ],
            'billingDetails' => [
                'legal_name' => $billingDetail?->legal_name ?? $tenant->name,
                'billing_email' => $billingDetail?->billing_email ?? $tenant->email,
                'phone' => $billingDetail?->phone ?? $tenant->phone,
                'address' => $billingDetail?->address ?? $tenant->address,
                'tax_id' => $billingDetail?->tax_id ?? '',
            ],
            'paymentHistory' => $invoices,
            'upcomingInvoice' => $upcomingInvoice,
        ]);
    }

    /**
     * Update clinic billing details.
     */
    public function updateBillingDetails(Request $request): RedirectResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $validated = $request->validate([
            'legal_name' => ['nullable', 'string', 'max:255'],
            'billing_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'tax_id' => ['nullable', 'string', 'max:100'],
        ]);

        TenantBillingDetail::updateOrCreate(
            ['tenant_id' => $tenant->id],
            $validated
        );

        AuditLogger::log('billing.details_updated', [
            'tenant_id' => $tenant->id,
            'user_id' => $user?->id,
        ]);

        return redirect()->back()->with('success', 'Billing details updated successfully.');
    }

    /**
     * Cancel subscription at period end with a reason.
     */
    public function cancelSubscription(
        Request $request,
        SubscriptionNotificationService $notificationService
    ): RedirectResponse {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $subscription = $tenant->subscription;
        if (! $subscription || $subscription->isComp()) {
            abort(403, 'Complimentary subscriptions cannot be cancelled.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:100'],
            'reason_detail' => ['nullable', 'string', 'max:500'],
        ]);

        $now = Carbon::now();
        $accessUntil = $subscription->current_period_end
            ? $subscription->current_period_end->setTimezone('Asia/Colombo')->format('d/m/Y')
            : 'immediately';

        $subscription->update([
            'cancels_at_period_end' => true,
            'cancelled_at' => $now,
            'cancellation_reason' => $validated['reason'],
            'cancellation_reason_detail' => $validated['reason_detail'] ?? null,
            'status' => Subscription::STATUS_CANCELLING,
        ]);

        AuditLogger::log('subscription.cancelled', [
            'tenant_id' => $tenant->id,
            'reason' => $validated['reason'],
            'access_until' => $accessUntil,
            'user_id' => $user?->id,
        ]);

        $reasonText = $validated['reason'].(! empty($validated['reason_detail']) ? ': '.$validated['reason_detail'] : '');
        $notificationService->sendCancelled($subscription, $accessUntil, $reasonText);

        return redirect()->back()->with('success', "Subscription scheduled for cancellation. Your access remains active until {$accessUntil}.");
    }

    /**
     * Resume a cancelling subscription.
     */
    public function resumeSubscription(
        Request $request,
        SubscriptionNotificationService $notificationService
    ): RedirectResponse {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $subscription = $tenant->subscription;
        if (! $subscription || ! $subscription->cancels_at_period_end) {
            return redirect()->back()->with('error', 'No cancellation pending to resume.');
        }

        $subscription->update([
            'cancels_at_period_end' => false,
            'cancelled_at' => null,
            'cancellation_reason' => null,
            'cancellation_reason_detail' => null,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        AuditLogger::log('subscription.resumed', [
            'tenant_id' => $tenant->id,
            'user_id' => $user?->id,
        ]);

        $notificationService->sendResumed($subscription);

        return redirect()->back()->with('success', 'Your subscription has been resumed. Monthly renewals will continue normally.');
    }

    /**
     * Show plan comparison page (Settings -> Billing -> Change Plan).
     */
    public function changePlan(Request $request, SubscriptionProrationService $prorationService): InertiaResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $subscription = $tenant->subscription()->with(['plan', 'pendingPlan'])->first();
        if ($subscription && $subscription->isComp()) {
            abort(403, 'Complimentary plans cannot be changed via clinic settings.');
        }

        $currentPlan = $subscription?->plan;

        $plans = Plan::where('is_active', true)
            ->where('slug', '!=', 'comp')
            ->orderBy('price_cents', 'asc')
            ->get()
            ->map(function (Plan $plan) use ($subscription, $currentPlan, $prorationService) {
                $isCurrent = $currentPlan && $currentPlan->id === $plan->id;
                $isPending = $subscription && $subscription->pending_plan_id === $plan->id;

                $prorationPreview = null;
                if ($subscription && ! $isCurrent && $plan->price_cents > ($currentPlan?->price_cents ?? 0)) {
                    $prorationPreview = $prorationService->previewChange($subscription, $plan);
                }

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'price_cents' => $plan->price_cents,
                    'formatted_price' => $plan->formatted_price,
                    'billing_interval' => $plan->billing_interval,
                    'features' => $plan->features ?? [],
                    'is_current' => $isCurrent,
                    'is_pending_downgrade' => $isPending,
                    'is_upgrade' => $currentPlan && $plan->price_cents > $currentPlan->price_cents,
                    'is_downgrade' => $currentPlan && $plan->price_cents < $currentPlan->price_cents,
                    'proration_preview' => $prorationPreview,
                ];
            });

        return Inertia::render('Subscription/ChangePlan', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
            ],
            'currentPlan' => $currentPlan ? [
                'id' => $currentPlan->id,
                'name' => $currentPlan->name,
                'formatted_price' => $currentPlan->formatted_price,
            ] : null,
            'pendingPlan' => $subscription?->pendingPlan ? [
                'id' => $subscription->pendingPlan->id,
                'name' => $subscription->pendingPlan->name,
                'effective_date' => $subscription->current_period_end?->setTimezone('Asia/Colombo')->format('d/m/Y'),
            ] : null,
            'periodEnd' => $subscription?->current_period_end?->setTimezone('Asia/Colombo')->format('d/m/Y'),
            'plans' => $plans,
        ]);
    }

    /**
     * Initiate prorated upgrade checkout via Payments.lk.
     */
    public function upgrade(
        Request $request,
        PaymentGateway $gateway,
        SubscriptionProrationService $prorationService
    ): SymfonyResponse {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $subscription = $tenant->subscription;
        if (! $subscription || $subscription->isComp()) {
            abort(403);
        }

        $planId = $request->input('new_plan_id') ?? $request->input('plan_id');
        $request->merge(['plan_id' => $planId]);

        $validated = $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
        ]);

        $newPlan = Plan::findOrFail($validated['plan_id']);
        if ($newPlan->price_cents <= $subscription->plan->price_cents) {
            return redirect()->back()->with('error', 'Selected plan is not an upgrade.');
        }

        // Get or create 24h price-locked proration invoice
        $invoice = $prorationService->getOrCreateProrationInvoice($subscription, $newPlan);

        $successUrl = route('tenant.subscription.return');
        $cancelUrl = route('tenant.settings.billing.change_plan');
        $idempotencyKey = "upg-chk-{$invoice->invoice_number}-{$tenant->id}-".time();

        try {
            $checkout = $gateway->createCheckout([
                'amountCents' => $invoice->amount_cents,
                'description' => "MedVisit Upgrade to {$newPlan->name} ({$invoice->invoice_number})",
                'reference' => $invoice->invoice_number,
                'successUrl' => $successUrl,
                'cancelUrl' => $cancelUrl,
                'idempotencyKey' => $idempotencyKey,
                'customer' => [
                    'name' => $tenant->name,
                    'email' => $user->email,
                    'phone' => $tenant->phone,
                ],
            ]);

            PaymentTransaction::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'gateway' => 'paymentslk',
                'gateway_checkout_id' => $checkout['id'],
                'amount_cents' => $invoice->amount_cents,
                'currency' => 'LKR',
                'status' => PaymentTransaction::STATUS_PENDING,
                'idempotency_key' => $idempotencyKey,
                'raw_payload' => $checkout['raw'] ?? [],
            ]);

            return Inertia::location($checkout['url']);
        } catch (\Throwable $e) {
            Log::error('Upgrade checkout initiation failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Unable to initiate upgrade checkout. Please try again.');
        }
    }

    /**
     * Schedule a downgrade for the next renewal date.
     */
    public function downgrade(
        Request $request,
        SubscriptionNotificationService $notificationService
    ): RedirectResponse {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $subscription = $tenant->subscription;
        if (! $subscription || $subscription->isComp()) {
            abort(403);
        }

        $planId = $request->input('new_plan_id') ?? $request->input('plan_id');
        $request->merge(['plan_id' => $planId]);

        $validated = $request->validate([
            'plan_id' => ['required', 'exists:plans,id'],
        ]);

        $newPlan = Plan::findOrFail($validated['plan_id']);
        if ($newPlan->price_cents >= $subscription->plan->price_cents) {
            return redirect()->back()->with('error', 'Selected plan is not a downgrade.');
        }

        $subscription->update([
            'pending_plan_id' => $newPlan->id,
        ]);

        $effectiveDate = $subscription->current_period_end
            ? $subscription->current_period_end->setTimezone('Asia/Colombo')->format('d/m/Y')
            : 'Next renewal';

        AuditLogger::log('subscription.plan_downgrade_scheduled', [
            'tenant_id' => $tenant->id,
            'old_plan' => $subscription->plan->name,
            'new_plan' => $newPlan->name,
            'effective_date' => $effectiveDate,
        ]);

        $notificationService->sendPlanChanged(
            $subscription,
            $subscription->plan->name,
            $newPlan->name,
            'Downgrade (Scheduled for Next Renewal)',
            $effectiveDate
        );

        return redirect()->route('tenant.settings.billing')->with('success', "Your plan will switch to {$newPlan->name} on {$effectiveDate}.");
    }

    /**
     * Cancel a scheduled downgrade.
     */
    public function cancelDowngrade(Request $request): RedirectResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $subscription = $tenant->subscription;
        if (! $subscription || ! $subscription->pending_plan_id) {
            return redirect()->back()->with('error', 'No scheduled downgrade to cancel.');
        }

        $subscription->update([
            'pending_plan_id' => null,
        ]);

        return redirect()->back()->with('success', 'Scheduled plan change has been cancelled. Your current plan continues.');
    }

    /**
     * Download receipt / invoice as a PDF attachment.
     */
    public function downloadInvoice(
        Request $request,
        SubscriptionInvoice $invoice,
        SubscriptionReceiptPdfService $pdfService
    ): Response {
        $tenant = tenant();
        $user = $request->user();

        // Tenant isolation: clinic admin can only access their own tenant's invoices
        if ($invoice->tenant_id !== $tenant->id && (! $user || ! $user->hasRole('super_admin'))) {
            abort(404);
        }

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        return $pdfService->downloadResponse($invoice);
    }

    /**
     * Stream receipt / invoice PDF directly in browser tab.
     */
    public function viewInvoice(
        Request $request,
        SubscriptionInvoice $invoice,
        SubscriptionReceiptPdfService $pdfService
    ): Response {
        $tenant = tenant();
        $user = $request->user();

        if ($invoice->tenant_id !== $tenant->id && (! $user || ! $user->hasRole('super_admin'))) {
            abort(404);
        }

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        return $pdfService->streamResponse($invoice);
    }
}
