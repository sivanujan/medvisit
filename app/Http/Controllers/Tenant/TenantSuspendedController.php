<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\PaymentTransaction;
use App\Models\Subscription;
use App\Services\Payments\SubscriptionPaymentService;
use App\Services\PlatformSettingsService;
use App\Services\SupportChatService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantSuspendedController extends Controller
{
    /**
     * Display the redesigned suspension / trial expired / overdue notice.
     */
    public function show(
        Request $request,
        PlatformSettingsService $settingsService,
        SupportChatService $supportChatService,
        PaymentGateway $gateway,
        SubscriptionPaymentService $paymentService
    ): Response|RedirectResponse {
        $tenant = tenant();
        $subscription = $tenant->subscription;
        $user = $request->user();
        $isAdmin = $user && ($user->hasRole('clinic_admin') || $user->hasRole('super_admin'));
        $requestedState = $request->query('state');

        // 0. If active and not previewing a state override, redirect to dashboard/setup
        if (! $requestedState && $tenant->status === 'active' && ($subscription?->isActive() ?? false)) {
            $targetRoute = $tenant->needsSetup() ? 'tenant.setup' : 'tenant.dashboard';

            return redirect()->route($targetRoute)
                ->with('success', 'Your MedVisit subscription is active. Welcome back!');
        }

        // 0.1 If not active and not in preview, check if recent checkout succeeded (e.g. localhost where webhooks cannot reach)
        if (! $requestedState && $tenant->status !== 'active') {
            $pendingTx = PaymentTransaction::where('tenant_id', $tenant->id)
                ->where('status', PaymentTransaction::STATUS_PENDING)
                ->latest('id')
                ->first();

            if ($pendingTx && $pendingTx->gateway_checkout_id) {
                try {
                    $checkout = $gateway->retrieveCheckout($pendingTx->gateway_checkout_id);
                    $status = $checkout['status'] ?? 'unknown';
                    $paymentStatus = $checkout['payment_status'] ?? null;

                    if ($status === 'succeeded' || $status === 'completed' || $paymentStatus === 'succeeded') {
                        $paymentService->processSuccessfulPayment([
                            'reference' => (string) ($checkout['reference'] ?? ($pendingTx->invoice?->invoice_number ?? '')),
                            'amount_cents' => (int) ($checkout['amount_cents'] ?? $pendingTx->amount_cents),
                            'currency' => (string) ($checkout['currency'] ?? 'LKR'),
                            'status' => 'succeeded',
                            'checkout_id' => $pendingTx->gateway_checkout_id,
                            'payment_id' => $checkout['payment_id'] ?? null,
                        ], $checkout['raw'] ?? []);

                        $tenant->refresh();
                        $targetRoute = $tenant->needsSetup() ? 'tenant.setup' : 'tenant.dashboard';

                        return redirect()->route($targetRoute)
                            ->with('success', 'Your payment was confirmed and your clinic workspace is now active. Welcome back!');
                    }
                } catch (\Throwable) {
                    // Gateway retrieval timeout or offline
                }
            }
        }

        // 1. Determine State
        // Preview override for testing and verification
        $requestedState = $request->query('state');
        if ($requestedState && in_array($requestedState, ['trial_expired', 'past_due', 'cancelled', 'suspended_by_admin'], true)) {
            $state = $requestedState;
        } elseif ($tenant->isSuspended() || $tenant->status === 'suspended') {
            $state = 'suspended_by_admin';
        } elseif ($tenant->status === 'trial_expired' || ($tenant->status === 'trial' && $tenant->isTrialExpired())) {
            $state = 'trial_expired';
        } elseif ($tenant->status === 'cancelled' || ($subscription && ($subscription->status === Subscription::STATUS_CANCELLED || $subscription->cancelled_at !== null))) {
            $state = 'cancelled';
        } elseif ($tenant->status === 'past_due' || ($subscription && ($subscription->status === Subscription::STATUS_PAST_DUE || ($subscription->status === Subscription::STATUS_EXPIRED && $subscription->latestUnpaidInvoice())))) {
            $state = 'past_due';
        } elseif ($tenant->isTrialExpired() || $tenant->status === 'trial') {
            $state = 'trial_expired';
        } else {
            $state = $tenant->isTrialExpired() ? 'trial_expired' : 'past_due';
        }

        // 2. Dates & Retention (30 days canonical Terms policy)
        $retentionDays = (int) config('medvisit_public.policies.retention_days', 30);
        $endedAt = match ($state) {
            'trial_expired' => $tenant->trial_ends_at ?? $subscription?->trial_ends_at ?? Carbon::now(),
            'past_due' => $subscription?->current_period_end ?? $tenant->trial_ends_at ?? Carbon::now(),
            'cancelled' => $subscription?->cancelled_at ?? $subscription?->current_period_end ?? Carbon::now(),
            default => $tenant->updated_at ?? Carbon::now(),
        };

        $deletionDate = $endedAt->copy()->addDays($retentionDays);
        $deletionDateFormatted = $deletionDate->format('j M Y');
        $endedDateFormatted = $endedAt->format('j M Y');
        $daysRemaining = max(0, (int) Carbon::now()->diffInDays($deletionDate, false));

        // Plan name display
        $subPlanSlug = $subscription?->plan?->slug;
        $planSlug = in_array($subPlanSlug, ['basic', 'pro', 'advanced'], true)
            ? $subPlanSlug
            : (in_array($tenant->plan, ['basic', 'pro', 'advanced'], true) ? $tenant->plan : 'pro');
        $plansConfig = config('medvisit_public.plans', []);
        $planName = $plansConfig[$planSlug]['name'] ?? ucfirst($planSlug);

        // 3. State-Specific Messaging
        $suspensionReason = null;
        if ($state === 'suspended_by_admin') {
            $data = is_array($tenant->data) ? $tenant->data : (json_decode((string) $tenant->data, true) ?: []);
            $suspensionReason = $tenant->getAttribute('suspension_reason')
                ?? $tenant->getAttribute('suspended_reason')
                ?? ($data['suspension_reason'] ?? null)
                ?? ($data['suspended_reason'] ?? null)
                ?? AuditEvent::where('tenant_id', $tenant->id)
                    ->where('action', 'superadmin.clinic.suspended')
                    ->latest('id')
                    ->first()?->metadata['reason']
                ?? null;
        }

        $stateDetails = match ($state) {
            'trial_expired' => [
                'key' => 'trial_expired',
                'pill_label' => 'Trial ended',
                'pill_variant' => 'amber',
                'title' => "Your free trial of {$tenant->name} ended on {$endedDateFormatted}",
                'subtitle' => 'Choose a plan to continue where you left off and restore real-time queue and consultation features.',
                'reassurance' => "Your clinic's data is safe and kept for {$retentionDays} days after your trial ended (until {$deletionDateFormatted}). Choose a plan to continue where you left off.",
                'can_pay' => true,
                'reason' => null,
            ],
            'past_due' => [
                'key' => 'past_due',
                'pill_label' => 'Payment overdue',
                'pill_variant' => 'coral',
                'title' => "Your {$planName} plan payment is overdue",
                'subtitle' => 'Access to your workspace is paused until your outstanding invoice is paid. Pay now to restore instant access.',
                'reassurance' => "Your clinic's data is safe and kept for {$retentionDays} days after your plan payment became overdue (until {$deletionDateFormatted}). Pay your invoice to resume without interruption.",
                'can_pay' => true,
                'reason' => null,
            ],
            'cancelled' => [
                'key' => 'cancelled',
                'pill_label' => 'Subscription ended',
                'pill_variant' => 'blue',
                'title' => "Your {$planName} plan subscription ended on {$endedDateFormatted}",
                'subtitle' => 'Choose a plan to reactivate your clinic workspace and resume managing appointments, billing, and queue.',
                'reassurance' => "Your clinic's data is safe and kept for {$retentionDays} days after your subscription ended (until {$deletionDateFormatted}). Choose a plan to continue where you left off.",
                'can_pay' => true,
                'reason' => null,
            ],
            'suspended_by_admin' => [
                'key' => 'suspended_by_admin',
                'pill_label' => 'Account suspended',
                'pill_variant' => 'slate',
                'title' => "{$tenant->name} workspace access has been paused by MedVisit",
                'subtitle' => $suspensionReason ? "Reason: {$suspensionReason}" : 'Access to this clinic workspace is temporarily paused by MedVisit administration. Please contact our team for assistance.',
                'reassurance' => "Your clinic's data is safe and kept for {$retentionDays} days (until {$deletionDateFormatted}). Contact support to reactivate your account.",
                'can_pay' => false,
                'reason' => $suspensionReason,
            ],
        };

        // 4. Plans Catalog
        $plans = [];
        foreach (['basic', 'pro', 'advanced'] as $slug) {
            if (isset($plansConfig[$slug])) {
                $cfg = $plansConfig[$slug];
                $plans[] = [
                    'id' => $cfg['id'],
                    'name' => $cfg['name'],
                    'price' => $cfg['price'],
                    'price_formatted' => $cfg['price_formatted'],
                    'price_cents' => $cfg['price_cents'],
                    'interval' => $cfg['interval'],
                    'target' => $cfg['target'],
                    'badge' => $cfg['badge'] ?? ($slug === 'pro' ? 'Most popular' : null),
                    'description' => $cfg['description'],
                    'features' => $slug === 'basic'
                        ? [
                            'Appointments & queue management',
                            'Single OPD chamber & consultation tokens',
                            'Patient records & medical history',
                            'Standard email support',
                        ]
                        : ($slug === 'pro'
                            ? [
                                'All Basic features',
                                'Multi-doctor channeling roster',
                                'SMS queue arrival & token alerts',
                                'Digital prescriptions & clinical notes',
                                'Priority support & WhatsApp assistance',
                            ]
                            : [
                                'All Pro features',
                                'In-house pharmacy & dispensing stock',
                                '1 free premium website template included',
                                'Multi-counter queue & calling screen TV',
                                'Dedicated account manager',
                            ]
                        ),
                ];
            }
        }

        $defaultPlanSlug = in_array($planSlug, ['basic', 'pro', 'advanced'], true) ? $planSlug : 'pro';

        // 5. Outstanding Invoice (for past_due)
        $unpaidInvoice = $subscription?->latestUnpaidInvoice();
        $outstandingInvoice = ($state === 'past_due' && $unpaidInvoice) ? [
            'id' => $unpaidInvoice->id,
            'invoice_number' => $unpaidInvoice->invoice_number,
            'amount_cents' => $unpaidInvoice->amount_cents,
            'amount_formatted' => 'Rs. '.number_format($unpaidInvoice->amount_cents / 100),
            'due_date' => $unpaidInvoice->due_date?->format('j M Y') ?? 'Immediate',
        ] : null;

        // 6. Support Business Hours (only shown if configured in support settings)
        $rawSettings = $settingsService->all();
        $supportDays = $rawSettings['support.business_hours_days'] ?? null;
        $supportStart = $rawSettings['support.business_hours_start'] ?? null;
        $supportEnd = $rawSettings['support.business_hours_end'] ?? null;

        $supportHours = null;
        if (! empty($supportDays) && is_array($supportDays) && ! empty($supportStart) && ! empty($supportEnd)) {
            $startFormatted = Carbon::createFromFormat('H:i', $supportStart)->format('g:i A');
            $endFormatted = Carbon::createFromFormat('H:i', $supportEnd)->format('g:i A');
            $daysText = 'Mon–Sat';
            if (count($supportDays) === 7) {
                $daysText = 'Every day';
            } elseif (count($supportDays) === 5) {
                $daysText = 'Mon–Fri';
            }
            $supportHours = "{$daysText} {$startFormatted} – {$endFormatted}";
        }

        $business = config('medvisit_public.business', []);

        return Inertia::render('Clinic/SuspendedOrExpired', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'status' => $tenant->status,
                'plan' => $planSlug,
                'logo_url' => $tenant->logo_url,
                'trial_ends_at' => $endedDateFormatted,
            ],
            'isAdmin' => $isAdmin,
            'userRole' => $user?->roles->first()?->name ?? 'staff',
            'state' => $state,
            'stateDetails' => $stateDetails,
            'retention' => [
                'retention_days' => $retentionDays,
                'deletion_date' => $deletionDateFormatted,
                'days_remaining' => $daysRemaining,
                'reassurance_message' => $stateDetails['reassurance'],
            ],
            'plans' => $plans,
            'defaultPlanSlug' => $defaultPlanSlug,
            'outstandingInvoice' => $outstandingInvoice,
            'renewsOn' => Carbon::now()->addMonth()->format('j M Y'),
            'termsVersion' => (string) config('medvisit_public.policies.terms_version', '2026-10-22'),
            'statusParam' => $request->query('status'),
            'hasDataExport' => false, // Full data export exists on Super Admin only; reported in architecture notes
            'support' => [
                'email' => $business['support_email'] ?? 'support@medvisit.lk',
                'general_email' => $business['general_email'] ?? 'hello@medvisit.lk',
                'phone' => $business['phone_display'] ?? '070 129 1688',
                'phone_raw' => $business['phone_raw'] ?? '+94701291688',
                'whatsapp_url' => $business['whatsapp_url'] ?? 'https://wa.me/94701291688',
                'support_hours' => $supportHours,
                'is_online' => $supportChatService->isOnline(),
            ],
        ]);
    }
}
