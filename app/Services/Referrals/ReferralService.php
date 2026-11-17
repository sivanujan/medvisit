<?php

declare(strict_types=1);

namespace App\Services\Referrals;

use App\Models\ClinicReferral;
use App\Models\Plan;
use App\Models\RefundRequest;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\PlatformSettingsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Cookie as SymfonyCookie;

class ReferralService
{
    public const COOKIE_NAME = 'mv_referral_code';

    public function __construct(
        protected ReferralCreditService $creditService,
        protected ReferralAbuseDetector $abuseDetector
    ) {}

    /**
     * Check if the referral program feature is enabled.
     */
    public function isEnabled(): bool
    {
        $platform = app(PlatformSettingsService::class)->get('referrals.enabled', null);
        if ($platform !== null) {
            return (bool) $platform;
        }

        return (bool) config('referrals.enabled', false);
    }

    /**
     * Get the full referral URL for a given clinic.
     */
    public function getReferralUrl(Tenant $tenant): string
    {
        $code = $tenant->effective_referral_code;
        $baseUrl = rtrim(config('app.url', 'https://medvisit.lk'), '/');

        return "{$baseUrl}/r/{$code}";
    }

    /**
     * Resolve a tenant by their referral code (or fallback subdomain).
     */
    public function findTenantByReferralCode(?string $code): ?Tenant
    {
        if (empty($code)) {
            return null;
        }

        $clean = strtolower(trim($code));

        return Tenant::where('referral_code', $clean)
            ->orWhere('subdomain', $clean)
            ->first();
    }

    /**
     * Create a 30-day tracking cookie for the referral code.
     */
    public function createReferralCookie(string $code): SymfonyCookie
    {
        $days = (int) config('referrals.cookie_lifetime_days', 30);
        $minutes = $days * 24 * 60;

        return Cookie::make(
            self::COOKIE_NAME,
            strtolower(trim($code)),
            $minutes,
            '/',
            null,
            false,
            false
        );
    }

    /**
     * Retrieve the referral code stored in the request cookie or query parameter.
     */
    public function getReferralCodeFromRequest(Request $request): ?string
    {
        $code = $request->query('ref')
            ?: $request->query('r')
            ?: $request->cookie(self::COOKIE_NAME);

        return $code ? strtolower(trim((string) $code)) : null;
    }

    /**
     * Record a new referral when a new clinic completes registration.
     */
    public function recordReferralRegistration(
        string $code,
        Tenant $referredTenant,
        array $registrationData = []
    ): ?ClinicReferral {
        if (! $this->isEnabled()) {
            return null;
        }

        $referrer = $this->findTenantByReferralCode($code);
        if (! $referrer) {
            return null;
        }

        // Cannot refer own clinic
        if ($referrer->id === $referredTenant->id) {
            return null;
        }

        // One referral reward per referred clinic, ever
        $alreadyReferred = ClinicReferral::where('referred_tenant_id', $referredTenant->id)->exists();
        if ($alreadyReferred) {
            return null;
        }

        // Run automated abuse checks
        $registrationData['tenant_id'] = $referredTenant->id;
        $flags = $this->abuseDetector->detectRegistrationAbuse($referrer, $registrationData);

        return DB::transaction(function () use ($referrer, $referredTenant, $code, $flags) {
            $status = ! empty($flags) && isset($flags['same_tenant'])
                ? ClinicReferral::STATUS_REJECTED
                : ClinicReferral::STATUS_REGISTERED;

            $rejectionReason = $status === ClinicReferral::STATUS_REJECTED
                ? ($flags['same_tenant'] ?? 'Self-referral rejected.')
                : null;

            $referral = ClinicReferral::create([
                'referrer_tenant_id' => $referrer->id,
                'referred_tenant_id' => $referredTenant->id,
                'referral_code' => strtolower(trim($code)),
                'status' => $status,
                'reward_amount_cents' => 0,
                'qualifying_invoices_count' => 0,
                'flags' => ! empty($flags) ? $flags : null,
                'rejection_reason' => $rejectionReason,
            ]);

            AuditLogger::log('referral.created', [
                'tenant_id' => $referrer->id,
                'resource' => $referral,
                'referred_tenant_id' => $referredTenant->id,
                'has_flags' => ! empty($flags),
            ]);

            return $referral;
        });
    }

    /**
     * Triggered whenever any subscription invoice is marked paid.
     * Evaluates qualification, reward calculation, and pending payouts.
     */
    public function onInvoicePaid(SubscriptionInvoice $invoice): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        // 1. Confirm any reserved billing credit on this paid invoice
        if ($invoice->credit_cents > 0) {
            $this->creditService->confirmReservation($invoice);
        }

        // 2. Check if the paying clinic was referred by someone
        $referral = ClinicReferral::where('referred_tenant_id', $invoice->tenant_id)->first();
        if ($referral && in_array($referral->status, [ClinicReferral::STATUS_REGISTERED, ClinicReferral::STATUS_PAYING], true)) {
            $this->evaluateReferredInvoicePayment($referral, $invoice);
        }

        // 3. Check if the paying clinic is a REFERRER with pending rewards (User Change #2)
        $this->evaluatePendingRewardsForReferrer($invoice->tenant_id);
    }

    /**
     * Process a payment made by a referred clinic.
     */
    protected function evaluateReferredInvoicePayment(ClinicReferral $referral, SubscriptionInvoice $invoice): void
    {
        // Free / Rs. 0 months (launch offer, invites, 100% promos) earn nothing: only real paid amounts count!
        if ($invoice->amount_cents <= 0) {
            Log::info("ReferralService: Invoice [{$invoice->invoice_number}] is Rs. 0, does not count towards qualification.");

            return;
        }

        $referral->increment('qualifying_invoices_count');
        $referral->refresh();

        $qualifyingTarget = (int) config('referrals.qualifying_paid_invoices', 2);

        if ($referral->qualifying_invoices_count < $qualifyingTarget) {
            $referral->update(['status' => ClinicReferral::STATUS_PAYING]);

            return;
        }

        // Reached required qualifying paid invoices!
        $referrer = $referral->referrerTenant;
        $referred = $referral->referredTenant;

        if (! $referrer || ! $referred) {
            return;
        }

        // Demo and comp referrers cannot earn rewards
        if ($referrer->isCompOrDemo()) {
            $referral->update([
                'status' => ClinicReferral::STATUS_REJECTED,
                'rejection_reason' => 'Referrer clinic is on a demo or complimentary plan.',
            ]);

            return;
        }

        // Check payment abuse (card fingerprint/last4 match)
        $paymentFlags = $this->abuseDetector->detectPaymentAbuse($referrer, $referred);
        if (! empty($paymentFlags)) {
            $currentFlags = $referral->flags ?? [];
            $referral->update(['flags' => array_merge($currentFlags, $paymentFlags)]);
        }

        // USER CHANGE #1:
        // Reward = min(amount the referred clinic actually paid for its first paid month, the referrer's own current monthly plan price)
        $firstPaidInvoice = SubscriptionInvoice::where('tenant_id', $referred->id)
            ->where('status', SubscriptionInvoice::STATUS_PAID)
            ->where('amount_cents', '>', 0)
            ->orderBy('id')
            ->first();

        $firstPaidAmountCents = $firstPaidInvoice ? $firstPaidInvoice->amount_cents : $invoice->amount_cents;

        $referrerPlan = Plan::where('slug', $referrer->plan)->first();
        $referrerPlanPriceCents = $referrerPlan ? $referrerPlan->price_cents : 900000;

        $potentialRewardCents = min($firstPaidAmountCents, $referrerPlanPriceCents);

        // Apply Annual Cap
        $finalRewardCents = $this->abuseDetector->calculateAllowedAmountUnderAnnualCap($referrer, $potentialRewardCents);

        $referral->update(['reward_amount_cents' => $finalRewardCents]);

        // USER CHANGE #2:
        // A referrer only EARNS rewards once it has paid at least one invoice itself.
        // If the referrer has not paid an invoice yet, reward stays pending!
        $referrerHasPaid = $referrer->hasPaidAtLeastOneInvoice();
        $approvalRequired = (bool) config('referrals.approval_required', false);
        $hasFlags = $referral->hasAbuseFlags();

        if (! $referrerHasPaid || $approvalRequired || $hasFlags) {
            $referral->update(['status' => ClinicReferral::STATUS_REWARD_PENDING]);
            Log::info("ReferralService: Referral [{$referral->id}] qualified for Rs. ".($finalRewardCents / 100).", marked reward_pending (referrer_paid={$referrerHasPaid}, approval_req={$approvalRequired}, has_flags={$hasFlags})");

            return;
        }

        // Award reward immediately
        $this->awardRewardCredit($referral, $finalRewardCents);
    }

    /**
     * When a referrer clinic pays an invoice, check if any of their referrals are in reward_pending
     * waiting for the referrer to make their first payment.
     */
    protected function evaluatePendingRewardsForReferrer(string $referrerTenantId): void
    {
        $referrer = Tenant::find($referrerTenantId);
        if (! $referrer || ! $referrer->hasPaidAtLeastOneInvoice() || $referrer->isCompOrDemo()) {
            return;
        }

        $pendingReferrals = ClinicReferral::where('referrer_tenant_id', $referrerTenantId)
            ->where('status', ClinicReferral::STATUS_REWARD_PENDING)
            ->get();

        $approvalRequired = (bool) config('referrals.approval_required', false);

        foreach ($pendingReferrals as $referral) {
            // If approval is required or abuse flags exist, keep pending for super admin review
            if ($approvalRequired || $referral->hasAbuseFlags()) {
                continue;
            }

            if ($referral->reward_amount_cents > 0) {
                $this->awardRewardCredit($referral, $referral->reward_amount_cents);
            }
        }
    }

    /**
     * Grant credit to referrer and update referral status to rewarded.
     */
    public function awardRewardCredit(ClinicReferral $referral, int $rewardCents): void
    {
        $referrer = $referral->referrerTenant;
        if (! $referrer || $rewardCents <= 0) {
            return;
        }

        DB::transaction(function () use ($referral, $referrer, $rewardCents) {
            $referral->update([
                'status' => ClinicReferral::STATUS_REWARDED,
                'reward_amount_cents' => $rewardCents,
            ]);

            $this->creditService->recordReward(
                $referrer,
                $referral,
                $rewardCents,
                "Referral credit earned for referring clinic {$referral->referredTenant?->name}"
            );
        });
    }

    /**
     * Super Admin manual approval of a pending referral reward.
     */
    public function approveReferral(ClinicReferral $referral, int $adminUserId, ?string $adminNotes = null): void
    {
        if ($referral->status !== ClinicReferral::STATUS_REWARD_PENDING) {
            throw new \RuntimeException("Referral cannot be approved from status '{$referral->status}'.");
        }

        $referral->update([
            'approved_by' => $adminUserId,
            'approved_at' => Carbon::now('Asia/Colombo'),
            'admin_notes' => $adminNotes,
        ]);

        $this->awardRewardCredit($referral, $referral->reward_amount_cents);

        AuditLogger::log('referral.approved_by_admin', [
            'tenant_id' => $referral->referrer_tenant_id,
            'resource' => $referral,
            'user_id' => $adminUserId,
        ]);
    }

    /**
     * Super Admin manual rejection of a referral.
     */
    public function rejectReferral(ClinicReferral $referral, int $adminUserId, string $reason, ?string $adminNotes = null): void
    {
        $referral->update([
            'status' => ClinicReferral::STATUS_REJECTED,
            'rejection_reason' => $reason,
            'admin_notes' => $adminNotes,
            'rejected_by' => $adminUserId,
            'rejected_at' => Carbon::now('Asia/Colombo'),
        ]);

        AuditLogger::log('referral.rejected_by_admin', [
            'tenant_id' => $referral->referrer_tenant_id,
            'resource' => $referral,
            'user_id' => $adminUserId,
            'reason' => $reason,
        ]);
    }

    /**
     * Handle invoice refund effects (User Change #4 and Rule #3).
     */
    public function onInvoiceRefunded(RefundRequest $refundRequest, int $approvedCashRefundCents): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $invoice = $refundRequest->payment?->invoice;
        if (! $invoice) {
            return;
        }

        // 1. If invoice used referral credits, restore the credit portion to ledger (User Change #4)
        if ($invoice->credit_cents > 0) {
            $this->creditService->returnCreditForRefund(
                $invoice,
                $invoice->credit_cents,
                "Restored credit from refunded invoice {$invoice->invoice_number}"
            );
        }

        // 2. If the refunded clinic was a referred clinic, cancel the referral reward and reverse if already credited!
        $referral = ClinicReferral::where('referred_tenant_id', $refundRequest->tenant_id)->first();
        if ($referral) {
            if ($referral->status === ClinicReferral::STATUS_REWARDED && $referral->reward_amount_cents > 0) {
                $this->creditService->reverseReward(
                    $referral,
                    $referral->reward_amount_cents,
                    "Reversed reward because referred clinic {$referral->referredTenant?->name} was refunded."
                );
            } else {
                $referral->update([
                    'status' => ClinicReferral::STATUS_CANCELLED,
                    'rejection_reason' => 'Referred clinic subscription invoice was refunded.',
                ]);
            }
        }
    }
}
