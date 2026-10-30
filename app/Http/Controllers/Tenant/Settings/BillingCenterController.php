<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Settings;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Mail\Subscription\NewRefundRequestAdminMail;
use App\Mail\Subscription\RefundRequestReceivedMail;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\PlatformIncident;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\TenantBillingDetail;
use App\Services\AuditLogger;
use App\Services\Billing\CreditNotePdfService;
use App\Services\Billing\SubscriptionNotificationService;
use App\Services\Billing\SubscriptionProrationService;
use App\Services\Billing\SubscriptionReceiptPdfService;
use App\Services\Refunds\RefundEligibilityService;
use App\Services\TelegramNotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
            ->with(['transactions.refundRequests' => fn ($q) => $q->latest('id')])
            ->orderByDesc('id')
            ->get()
            ->map(function (SubscriptionInvoice $inv) use ($subscription) {
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

                $invoicePlanName = $inv->billing_details['new_plan_name'] ?? ($subscription?->plan?->name ?? 'Pro');
                $invoicePeriod = ($inv->period_start && $inv->period_end)
                    ? $inv->period_start->setTimezone('Asia/Colombo')->format('j M Y').' – '.$inv->period_end->setTimezone('Asia/Colombo')->format('j M Y')
                    : null;

                $description = $inv->type === 'proration'
                    ? "{$invoicePlanName} plan · Upgrade adjustment"
                    : ($invoicePeriod
                        ? "{$invoicePlanName} plan · {$invoicePeriod}"
                        : "{$invoicePlanName} plan · 1 month");

                $latestRefund = $transaction?->refundRequests->first();
                $refundStatus = $transaction?->refund_status ?? 'none';
                $canRequestRefund = $inv->status === SubscriptionInvoice::STATUS_PAID
                    && $transaction
                    && $transaction->refundable_amount_cents > 0
                    && ! $transaction->openRefundRequest;

                $refundSummary = $latestRefund ? [
                    'id' => $latestRefund->id,
                    'public_id' => $latestRefund->public_id,
                    'reason_type' => $latestRefund->reason_type,
                    'reason_label' => ucfirst(str_replace('_', ' ', $latestRefund->reason_type)),
                    'status' => $latestRefund->status,
                    'requested_amount_cents' => $latestRefund->requested_amount_cents,
                    'formatted_requested_amount' => $latestRefund->formatted_requested_amount,
                    'approved_amount_cents' => $latestRefund->approved_amount_cents,
                    'formatted_approved_amount' => $latestRefund->formatted_approved_amount,
                    'decision_reason' => $latestRefund->decision_reason,
                    'credit_note_number' => $latestRefund->credit_note_number,
                    'credit_note_url' => $latestRefund->credit_note_number ? route('tenant.settings.billing.refund.credit_note', $latestRefund->id) : null,
                    'created_at' => $latestRefund->created_at->format('j M Y'),
                    'decided_at' => $latestRefund->decided_at?->format('j M Y'),
                    'refunded_at' => $latestRefund->refunded_at?->format('j M Y'),
                    'can_cancel' => $latestRefund->canBeCancelledByClinic(),
                ] : null;

                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'receipt_number' => $inv->receipt_number,
                    'type' => $inv->type ?? 'subscription',
                    'description' => $description,
                    'amount_cents' => $inv->amount_cents,
                    'formatted_amount' => $inv->formatted_amount,
                    'issue_date' => $inv->created_at?->setTimezone('Asia/Colombo')->format('j M Y'),
                    'paid_at' => $inv->paid_at?->setTimezone('Asia/Colombo')->format('j M Y H:i'),
                    'status' => $inv->status,
                    'payment_method' => $methodLabel,
                    'card_details' => $cardDetails,
                    'download_url' => route('tenant.settings.billing.invoice.download', $inv->id),
                    'view_url' => route('tenant.settings.billing.invoice.view', $inv->id),
                    'pay_url' => $inv->status === SubscriptionInvoice::STATUS_UNPAID ? route('tenant.subscription.subscribe') : null,
                    'payment_id' => $transaction?->id,
                    'refund_status' => $refundStatus,
                    'refunded_amount_cents' => $transaction?->refunded_amount_cents ?? 0,
                    'refundable_amount_cents' => $transaction?->refundable_amount_cents ?? 0,
                    'latest_refund' => $refundSummary,
                    'can_request_refund' => $canRequestRefund,
                ];
            });

        // Upcoming payment info (manual online payment due date)
        $upcomingInvoice = null;
        if ($subscription && ! $subscription->isComp() && ! $subscription->isCancelling() && $periodEnd) {
            $targetPlan = $subscription->pendingPlan ?? $subscription->plan;
            $upcomingInvoice = [
                'date' => $periodEnd->format('j M Y'),
                'plan_name' => $targetPlan?->name ?? 'Pro',
                'amount' => $targetPlan?->formatted_price ?? 'Rs. 9,000',
                'is_scheduled_downgrade' => (bool) $subscription->pending_plan_id,
            ];
        }

        $unpaidInvoice = $subscription?->latestUnpaidInvoice();

        // Available plans for the change plan drawer / modal (only active plans from config)
        $currentPlanModel = $subscription?->plan;
        $activeConfigSlugs = array_keys(config('medvisit_public.plans', ['basic' => [], 'pro' => [], 'advanced' => []]));
        $plans = Plan::where('is_active', true)
            ->whereIn('slug', $activeConfigSlugs)
            ->orderBy('price_cents', 'asc')
            ->get()
            ->map(function (Plan $plan) use ($subscription, $currentPlanModel) {
                $isCurrent = $currentPlanModel && $currentPlanModel->id === $plan->id;
                $isPending = $subscription && $subscription->pending_plan_id === $plan->id;
                $configDef = config("medvisit_public.plans.{$plan->slug}", []);

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'price_cents' => $plan->price_cents,
                    'formatted_price' => $plan->formatted_price,
                    'billing_interval' => $plan->billing_interval,
                    'badge' => $configDef['badge'] ?? ($plan->slug === 'pro' ? 'Most popular' : null),
                    'description' => $configDef['description'] ?? null,
                    'features' => ! empty($plan->features) ? $plan->features : ($configDef['features'] ?? []),
                    'is_current' => $isCurrent,
                    'is_pending_downgrade' => $isPending,
                    'is_upgrade' => $currentPlanModel && $plan->price_cents > $currentPlanModel->price_cents,
                    'is_downgrade' => $currentPlanModel && $plan->price_cents < $currentPlanModel->price_cents,
                ];
            });

        $formattedPeriodStart = $subscription?->current_period_start?->setTimezone('Asia/Colombo')->format('j M Y');
        $formattedPeriodEnd = $periodEnd?->format('j M Y');
        $formattedPeriod = ($formattedPeriodStart && $formattedPeriodEnd)
            ? "{$formattedPeriodStart} – {$formattedPeriodEnd}"
            : ($formattedPeriodEnd ? "Until {$formattedPeriodEnd}" : null);

        $incidents = PlatformIncident::resolved()
            ->orderByDesc('ended_at')
            ->limit(20)
            ->get()
            ->filter(fn (PlatformIncident $inc) => $inc->affectsTenant($tenant->id))
            ->values()
            ->map(fn (PlatformIncident $inc) => [
                'id' => $inc->id,
                'title' => $inc->title,
                'started_at' => $inc->started_at?->toIso8601String() ?? '',
                'resolved_at' => $inc->ended_at?->toIso8601String() ?? '',
                'duration_minutes' => $inc->duration_minutes,
            ]);

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
                'period_start' => $formattedPeriodStart ?? $subscription->current_period_start?->setTimezone('Asia/Colombo')->format('d/m/Y'),
                'period_end' => $formattedPeriodEnd ?? $periodEnd?->format('d/m/Y'),
                'formatted_period' => $formattedPeriod,
                'trial_ends_at' => $subscription->trial_ends_at?->setTimezone('Asia/Colombo')->format('j M Y'),
                'days_remaining' => $daysRemaining,
                'features' => $subscription->plan?->features ?? [],
                'pending_plan' => $subscription->pendingPlan ? [
                    'id' => $subscription->pendingPlan->id,
                    'name' => $subscription->pendingPlan->name,
                    'effective_date' => $formattedPeriodEnd ?? $periodEnd?->format('d/m/Y'),
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
                'billing_email' => $billingDetail?->billing_email ?: ($tenant->email ?: ($user?->email ?? '')),
                'phone' => $billingDetail?->phone ?? $tenant->phone,
                'address' => $billingDetail?->address ?? $tenant->address,
                'tax_id' => $billingDetail?->tax_id ?? '',
            ],
            'plans' => $plans,
            'sharedFeatures' => config('medvisit_public.shared_features', []),
            'termsVersion' => config('medvisit_public.policies.terms_version', '2026-10-22'),
            'paymentHistory' => $invoices,
            'upcomingInvoice' => $upcomingInvoice,
            'incidents' => $incidents,
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
            'billing_email' => ['required', 'email', 'max:255'],
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

        $activeConfigSlugs = array_keys(config('medvisit_public.plans', ['basic' => [], 'pro' => [], 'advanced' => []]));
        $plans = Plan::where('is_active', true)
            ->whereIn('slug', $activeConfigSlugs)
            ->orderBy('price_cents', 'asc')
            ->get()
            ->map(function (Plan $plan) use ($subscription, $currentPlan) {
                $isCurrent = $currentPlan && $currentPlan->id === $plan->id;
                $isPending = $subscription && $subscription->pending_plan_id === $plan->id;
                $configDef = config("medvisit_public.plans.{$plan->slug}", []);

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'price_cents' => $plan->price_cents,
                    'formatted_price' => $plan->formatted_price,
                    'billing_interval' => $plan->billing_interval,
                    'badge' => $configDef['badge'] ?? ($plan->slug === 'pro' ? 'Most popular' : null),
                    'description' => $configDef['description'] ?? null,
                    'features' => ! empty($plan->features) ? $plan->features : ($configDef['features'] ?? []),
                    'is_current' => $isCurrent,
                    'is_pending_downgrade' => $isPending,
                    'is_upgrade' => $currentPlan && $plan->price_cents > $currentPlan->price_cents,
                    'is_downgrade' => $currentPlan && $plan->price_cents < $currentPlan->price_cents,
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
            'activePromo' => $subscription?->promo_snapshot ? [
                'code' => $subscription->promo_snapshot['code'] ?? null,
                'eligible_plans' => (array) ($subscription->promo_snapshot['eligible_plans'] ?? []),
            ] : null,
            'pendingPlan' => $subscription?->pendingPlan ? [
                'id' => $subscription->pendingPlan->id,
                'name' => $subscription->pendingPlan->name,
                'effective_date' => $subscription->current_period_end?->setTimezone('Asia/Colombo')->format('d/m/Y'),
            ] : null,
            'periodEnd' => $subscription?->current_period_end?->setTimezone('Asia/Colombo')->format('d/m/Y'),
            'plans' => $plans,
            'sharedFeatures' => config('medvisit_public.shared_features', []),
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

        // Create full new plan invoice with new 1-month period starting today
        $now = Carbon::now('Asia/Colombo');
        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'type' => SubscriptionInvoice::TYPE_SUBSCRIPTION,
            'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
            'amount_cents' => $newPlan->price_cents,
            'period_start' => $now,
            'period_end' => $now->copy()->addMonth(),
            'due_date' => $now,
            'status' => SubscriptionInvoice::STATUS_UNPAID,
            'billing_details' => [
                'new_plan_id' => $newPlan->id,
                'new_plan_name' => $newPlan->name,
                'old_plan_id' => $subscription->plan_id,
                'old_plan_name' => $subscription->plan?->name,
            ],
            'notes' => "Upgrade to {$newPlan->name} (new 1-month billing period starts immediately)",
        ]);

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

    /**
     * Preview refund eligibility for a specific payment and reason.
     */
    public function previewRefundEligibility(
        Request $request,
        RefundEligibilityService $eligibilityService
    ): JsonResponse {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $validated = $request->validate([
            'payment_id' => ['required', 'integer', 'exists:payment_transactions,id'],
            'reason' => ['required', 'string'],
            'platform_incident_id' => ['nullable', 'integer', 'exists:platform_incidents,id'],
            'reason_details' => ['nullable', 'string', 'max:1000'],
        ]);

        $payment = PaymentTransaction::where('tenant_id', $tenant->id)
            ->with(['tenant', 'invoice'])
            ->findOrFail($validated['payment_id']);

        $evaluation = $eligibilityService->evaluate(
            $payment,
            $validated['reason'],
            $validated['reason_details'] ?? null
        );

        $isEligible = $evaluation['eligibility'] === RefundRequest::ELIGIBILITY_ELIGIBLE || $evaluation['eligibility'] === RefundRequest::ELIGIBILITY_PARTIALLY_ELIGIBLE;
        $requiresManualReview = $evaluation['eligibility'] === RefundRequest::ELIGIBILITY_NEEDS_REVIEW;

        $reasons = [];
        foreach ($evaluation['checks'] as $c) {
            $reasons[] = ($c['passed'] ? '✓ ' : '✕ ').$c['message'];
        }

        return response()->json([
            'eligible' => $isEligible,
            'eligible_amount_cents' => $evaluation['eligible_amount_cents'],
            'formatted_eligible_amount' => 'Rs. '.number_format($evaluation['eligible_amount_cents'] / 100, 2),
            'currency' => 'LKR',
            'rule_applied' => $evaluation['reason_summary'],
            'reasons' => $reasons,
            'breakdown' => $evaluation['checks'],
            'requires_manual_review' => $requiresManualReview,
        ]);
    }

    /**
     * Submit a formal refund request.
     */
    public function requestRefund(
        Request $request,
        RefundEligibilityService $eligibilityService,
        TelegramNotificationService $telegramService
    ): RedirectResponse {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        $validated = $request->validate([
            'payment_id' => ['required', 'integer', 'exists:payment_transactions,id'],
            'reason' => ['required', 'string'],
            'requested_amount_cents' => ['nullable', 'integer', 'min:1'],
            'reason_details' => ['required', 'string', 'min:10', 'max:1000'],
            'platform_incident_id' => ['nullable', 'integer', 'exists:platform_incidents,id'],
            'acknowledged_policy' => ['required', 'accepted'],
        ]);

        $payment = PaymentTransaction::where('tenant_id', $tenant->id)
            ->with(['tenant', 'invoice'])
            ->findOrFail($validated['payment_id']);

        // Check if there is already an open refund request for this payment
        if ($payment->openRefundRequest) {
            return redirect()->back()->with('error', 'A refund request is already pending or approved for this payment.');
        }

        if ($payment->refundable_amount_cents <= 0) {
            return redirect()->back()->with('error', 'This payment has already been fully refunded.');
        }

        // Rate limit: maximum 3 refund requests per clinic in last 30 days
        $recentRequestsCount = RefundRequest::where('tenant_id', $tenant->id)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->count();

        if ($recentRequestsCount >= 3) {
            return redirect()->back()->with('error', 'You have reached the limit of 3 refund requests in a 30-day period. Please contact support.');
        }

        // Run policy evaluation
        $evaluation = $eligibilityService->evaluate(
            $payment,
            $validated['reason'],
            $validated['reason_details']
        );

        // Default requested amount to eligible amount (capped by refundable amount)
        $requestedAmountCents = $validated['requested_amount_cents'] ?? $evaluation['eligible_amount_cents'];
        $requestedAmountCents = min($requestedAmountCents, $payment->refundable_amount_cents);

        if ($requestedAmountCents <= 0) {
            $requestedAmountCents = $payment->refundable_amount_cents;
        }

        $refundRequest = RefundRequest::create([
            'tenant_id' => $tenant->id,
            'payment_id' => $payment->id,
            'requested_by_user_id' => $user->id,
            'reason_type' => $validated['reason'],
            'description' => $validated['reason_details'],
            'requested_amount_cents' => $requestedAmountCents,
            'eligible_amount_cents' => $evaluation['eligible_amount_cents'],
            'eligibility' => $evaluation['eligibility'],
            'eligibility_checks' => $evaluation['checks'],
            'status' => RefundRequest::STATUS_REQUESTED,
        ]);

        AuditLogger::log('refund.requested', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'refund_request_id' => $refundRequest->id,
            'public_id' => $refundRequest->public_id,
            'amount_cents' => $requestedAmountCents,
            'reason' => $refundRequest->reason_type,
        ]);

        $clinicName = $tenant->name ?? 'Clinic';
        $billingUrl = route('tenant.settings.billing');
        $adminReviewUrl = url("/super-admin/refunds/{$refundRequest->id}");

        // Send confirmation email to clinic user
        try {
            Mail::to($user->email)->send(new RefundRequestReceivedMail($refundRequest, $clinicName, $billingUrl));
        } catch (\Throwable $e) {
            Log::warning('Failed sending RefundRequestReceivedMail', ['error' => $e->getMessage()]);
        }

        // Send alert email to super admin
        try {
            $adminEmail = config('medvisit_public.support_email', config('mail.admin_address', 'support@medvisit.lk'));
            Mail::to($adminEmail)->send(new NewRefundRequestAdminMail($refundRequest, $clinicName, $adminReviewUrl));
        } catch (\Throwable $e) {
            Log::warning('Failed sending NewRefundRequestAdminMail', ['error' => $e->getMessage()]);
        }

        // Send telegram alert
        try {
            $telegramService->sendRefundAlert('New Refund Request', [
                'Public ID' => $refundRequest->public_id,
                'Clinic' => $tenant->name,
                'Amount' => $refundRequest->formatted_requested_amount,
                'Reason' => $refundRequest->reason_type,
                'System Check' => $evaluation['eligibility'],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed sending refund telegram alert', ['error' => $e->getMessage()]);
        }

        return redirect()->back()->with('success', "Refund request {$refundRequest->public_id} submitted. Our team reviews all requests within 2 business days.");
    }

    /**
     * Cancel / withdraw a pending refund request.
     */
    public function cancelRefund(Request $request, RefundRequest $refundRequest): RedirectResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        if ($refundRequest->tenant_id !== $tenant->id) {
            abort(404);
        }

        if (! $refundRequest->canBeCancelledByClinic()) {
            return redirect()->back()->with('error', 'This refund request can no longer be cancelled.');
        }

        $refundRequest->update([
            'status' => RefundRequest::STATUS_CANCELLED_BY_CLINIC,
            'decision_reason' => 'Withdrawn by clinic administrator.',
        ]);

        AuditLogger::log('refund.cancelled_by_clinic', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'refund_request_id' => $refundRequest->id,
            'public_id' => $refundRequest->public_id,
        ]);

        return redirect()->back()->with('success', "Refund request {$refundRequest->public_id} has been withdrawn.");
    }

    /**
     * Download credit note PDF for a completed refund.
     */
    public function downloadCreditNote(
        Request $request,
        RefundRequest $refundRequest,
        CreditNotePdfService $pdfService
    ): Response {
        $tenant = tenant();
        $user = $request->user();

        if ($refundRequest->tenant_id !== $tenant->id && (! $user || ! $user->hasRole('super_admin'))) {
            abort(404);
        }

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403);
        }

        if (empty($refundRequest->credit_note_number)) {
            abort(404, 'Credit note not found.');
        }

        return $pdfService->downloadResponse($refundRequest);
    }
}
