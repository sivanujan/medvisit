<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Services\Payments\SubscriptionPaymentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SubscriptionBillingController extends Controller
{
    /**
     * Show the subscription payment page for clinic admin.
     */
    public function subscribe(Request $request): Response|SymfonyResponse
    {
        $tenant = tenant();
        $user = $request->user();

        // Non-admin staff cannot view this payment page
        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            return redirect()->route('tenant.subscription.inactive');
        }

        $subscription = $tenant->subscription()->with('plan')->first();

        // Single source of truth for plans and shared features from config
        $plansConfig = config('medvisit_public.plans', []);
        $sharedFeatures = config('medvisit_public.shared_features', []);

        // Determine preselected plan slug (default to 'pro')
        $currentPlanSlug = $subscription?->plan?->slug ?? $tenant->plan ?? 'pro';
        if (! isset($plansConfig[$currentPlanSlug])) {
            $currentPlanSlug = 'pro';
        }

        // NOTE: We do NOT generate an invoice on page view/refresh!
        // The invoice number is generated ONLY when the user clicks "Pay".
        $statusParam = $request->query('status');

        return Inertia::render('Subscription/Subscribe', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'logo_url' => $tenant->logo_url,
            ],
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'status' => $subscription->status,
                'is_active' => $subscription->isActive(),
                'is_comp' => $subscription->plan?->slug === 'comp',
                'is_trialing' => $subscription->isTrialing(),
                'trial_ends_at' => $subscription->trial_ends_at?->toDateString(),
                'current_period_end' => $subscription->current_period_end?->toDateString(),
                'plan_slug' => $currentPlanSlug,
            ] : null,
            'plans' => array_values($plansConfig),
            'sharedFeatures' => $sharedFeatures,
            'defaultPlanSlug' => $currentPlanSlug,
            'currency' => config('medvisit.currency', 'LKR'),
            'currencySymbol' => config('medvisit.currency_symbol', 'Rs.'),
            'renewsOn' => Carbon::now()->addMonth()->format('d M Y'),
            'statusParam' => $statusParam,
        ]);
    }

    /**
     * Initiate a hosted Payments.lk checkout.
     */
    public function createCheckout(Request $request, PaymentGateway $gateway): SymfonyResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403, 'Only clinic administrators can initiate subscription payments.');
        }

        $request->validate([
            'terms_accepted' => ['required', 'accepted'],
            'plan_slug' => ['nullable', 'string', 'in:basic,pro,advanced'],
        ], [
            'terms_accepted.accepted' => 'You must accept the Terms and Conditions and Refund Policy to proceed.',
        ]);

        $selectedPlanSlug = (string) $request->input('plan_slug', 'pro');
        $plansConfig = config('medvisit_public.plans');
        if (empty($plansConfig) || ! is_array($plansConfig)) {
            throw new \RuntimeException("Plan configuration 'medvisit_public.plans' is missing.");
        }
        if (! isset($plansConfig[$selectedPlanSlug])) {
            throw new \RuntimeException("Requested plan [{$selectedPlanSlug}] is not defined in config('medvisit_public.plans').");
        }

        $plan = Plan::forSlug($selectedPlanSlug);
        if (! $plan) {
            throw new \RuntimeException("Unable to initialize plan [{$selectedPlanSlug}] from canonical config.");
        }
        $planPriceCents = (int) $plansConfig[$selectedPlanSlug]['price_cents'];

        $subscription = $tenant->subscription;
        if (! $subscription) {
            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => Subscription::STATUS_PENDING_PAYMENT,
                'trial_ends_at' => $tenant->trial_ends_at,
            ]);
        }

        $now = Carbon::now();
        $termsVersion = (string) config('medvisit_public.policies.terms_version', '2026-10-21');

        $subscription->update([
            'plan_id' => $plan?->id ?? $subscription->plan_id,
            'terms_accepted_at' => $now,
            'terms_version' => $termsVersion,
        ]);

        $tenant->update(['plan' => $selectedPlanSlug]);

        // Invoice is created/updated ONLY when the user clicks Pay
        $invoice = $subscription->latestUnpaidInvoice();
        if (! $invoice) {
            $invoice = SubscriptionInvoice::create([
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                'amount_cents' => $planPriceCents,
                'period_start' => $now,
                'period_end' => $now->copy()->addMonth(),
                'due_date' => $now->copy()->addDays(3),
                'status' => SubscriptionInvoice::STATUS_UNPAID,
            ]);
        } else {
            $invoice->update([
                'amount_cents' => $planPriceCents,
            ]);
        }

        $successUrl = route('tenant.subscription.return');
        $cancelUrl = $request->boolean('from_suspended') || $request->input('return_to_suspended')
            ? route('tenant.suspended', ['status' => 'cancelled'])
            : route('tenant.subscription.subscribe', ['status' => 'cancelled']);
        $idempotencyKey = "inv-chk-{$invoice->invoice_number}-{$tenant->id}-".time();

        try {
            $checkout = $gateway->createCheckout([
                'amountCents' => $invoice->amount_cents,
                'description' => "MedVisit {$plan?->name} Monthly Subscription ({$invoice->invoice_number})",
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

            // Save pending payment transaction
            PaymentTransaction::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'gateway' => 'paymentslk',
                'gateway_checkout_id' => $checkout['id'],
                'amount_cents' => $invoice->amount_cents,
                'currency' => 'LKR',
                'status' => PaymentTransaction::STATUS_PENDING,
                'idempotency_key' => $idempotencyKey,
                'terms_accepted_at' => $now,
                'terms_version' => $termsVersion,
                'raw_payload' => $checkout['raw'] ?? [],
            ]);

            return Inertia::location($checkout['url']);
        } catch (\Throwable $e) {
            Log::error('Subscription checkout initiation failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('tenant.subscription.subscribe')
                ->with('error', 'Unable to reach payment gateway. Please try again or contact support.');
        }
    }

    /**
     * Return page after completing Payments.lk checkout.
     */
    public function return(Request $request): Response
    {
        $tenant = tenant();

        return Inertia::render('Subscription/Return', [
            'checkoutId' => $request->query('checkout'),
            'initialStatus' => $request->query('status'),
            'clinicName' => $tenant?->name,
            'defaultRedirect' => ($tenant && $tenant->needsSetup()) ? route('tenant.setup') : route('tenant.dashboard'),
        ]);
    }

    /**
     * Poll status endpoint for Subscription/Return confirmation screen.
     */
    public function checkStatus(
        Request $request,
        PaymentGateway $gateway,
        SubscriptionPaymentService $paymentService
    ): JsonResponse {
        $tenant = tenant();
        $checkoutId = (string) $request->query('checkout_id', '');

        // 1. Check if invoice is already marked paid (e.g. by webhook)
        $latestInvoice = $tenant->subscriptionInvoices()->latest('id')->first();
        if ($latestInvoice && $latestInvoice->status === SubscriptionInvoice::STATUS_PAID) {
            $redirectUrl = $tenant->needsSetup() ? route('tenant.setup') : route('tenant.dashboard');

            return response()->json([
                'status' => 'succeeded',
                'invoice_number' => $latestInvoice->invoice_number,
                'redirect' => $redirectUrl,
            ]);
        }

        // 2. If checkoutId is given, query Payments.lk gateway to confirm
        if ($checkoutId) {
            try {
                $checkout = $gateway->retrieveCheckout($checkoutId);
                $status = $checkout['status'] ?? 'unknown';
                $paymentStatus = $checkout['payment_status'] ?? null;

                if ($status === 'succeeded' || $status === 'completed' || $paymentStatus === 'succeeded') {
                    $invoiceAmount = (int) ($checkout['amount_cents'] ?? $latestInvoice?->amount_cents);
                    if ($invoiceAmount <= 0) {
                        throw new \RuntimeException("Unable to resolve valid amount for invoice [{$latestInvoice?->invoice_number}].");
                    }
                    $paymentService->processSuccessfulPayment([
                        'reference' => (string) ($checkout['reference'] ?? ($latestInvoice?->invoice_number ?? '')),
                        'amount_cents' => $invoiceAmount,
                        'currency' => (string) ($checkout['currency'] ?? 'LKR'),
                        'status' => 'succeeded',
                        'checkout_id' => $checkoutId,
                        'payment_id' => $checkout['payment_id'] ?? null,
                    ], $checkout['raw'] ?? []);

                    $redirectUrl = $tenant->needsSetup() ? route('tenant.setup') : route('tenant.dashboard');

                    return response()->json([
                        'status' => 'succeeded',
                        'redirect' => $redirectUrl,
                    ]);
                }

                if (in_array($status, ['failed', 'canceled', 'expired'], true)) {
                    if ($latestInvoice) {
                        $paymentService->processFailedPayment([
                            'reference' => $latestInvoice->invoice_number,
                            'checkout_id' => $checkoutId,
                            'amount_cents' => $latestInvoice->amount_cents,
                        ], $checkout['raw'] ?? []);
                    }

                    return response()->json([
                        'status' => 'failed',
                        'message' => 'Payment was not completed or failed. You can retry anytime.',
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed polling Payments.lk checkout status', [
                    'checkout_id' => $checkoutId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'status' => 'pending',
        ]);
    }

    /**
     * List billing history and past invoices for clinic admin.
     */
    public function invoices(Request $request): Response
    {
        $tenant = tenant();
        $subscription = $tenant->subscription()->with('plan')->first();

        $invoices = $tenant->subscriptionInvoices()
            ->with('transactions')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($inv) => [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'amount_cents' => $inv->amount_cents,
                'formatted_amount' => $inv->formatted_amount,
                'period_start' => $inv->period_start?->toDateString(),
                'period_end' => $inv->period_end?->toDateString(),
                'due_date' => $inv->due_date?->toDateString(),
                'status' => $inv->status,
                'paid_at' => $inv->paid_at?->toDateTimeString(),
                'payment_method' => $inv->payment_method,
            ]);

        return Inertia::render('Subscription/Index', [
            'subscription' => $subscription ? [
                'status' => $subscription->status,
                'is_active' => $subscription->isActive(),
                'is_comp' => $subscription->plan?->slug === 'comp',
                'current_period_end' => $subscription->current_period_end?->toDateString(),
                'plan_name' => $subscription->plan?->name,
                'plan_price' => $subscription->plan?->formatted_price,
            ] : null,
            'invoices' => $invoices,
        ]);
    }

    /**
     * View or print receipt for a paid subscription invoice.
     */
    public function receipt(Request $request, SubscriptionInvoice $invoice): Response
    {
        $tenant = tenant();
        if ($invoice->tenant_id !== $tenant->id) {
            abort(403);
        }

        $subscription = $invoice->subscription()->with('plan')->first();

        return Inertia::render('Subscription/Receipt', [
            'invoice' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount_cents' => $invoice->amount_cents,
                'formatted_amount' => $invoice->formatted_amount,
                'period_start' => $invoice->period_start?->toDateString(),
                'period_end' => $invoice->period_end?->toDateString(),
                'paid_at' => $invoice->paid_at?->toFormattedDateString(),
                'status' => $invoice->status,
                'payment_method' => $invoice->payment_method ?? 'Credit/Debit Card',
            ],
            'clinic' => [
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
            ],
            'plan' => $subscription?->plan ? [
                'name' => $subscription->plan->name,
                'billing_interval' => $subscription->plan->billing_interval,
            ] : null,
        ]);
    }

    /**
     * Friendly notice page for non-admin staff when clinic subscription is inactive.
     */
    public function inactive(Request $request): Response
    {
        $tenant = tenant();

        return Inertia::render('Subscription/Inactive', [
            'clinicName' => $tenant->name ?? 'Your Clinic',
            'contactAdmin' => true,
        ]);
    }
}
