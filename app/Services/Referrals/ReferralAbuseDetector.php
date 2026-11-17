<?php

declare(strict_types=1);

namespace App\Services\Referrals;

use App\Models\AgreementAcceptance;
use App\Models\PaymentTransaction;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantBillingCredit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ReferralAbuseDetector
{
    /**
     * Normalize a phone number to digits only (e.g., +94 77 123 4567 -> 94771234567).
     */
    public static function normalizePhone(?string $phone): string
    {
        if (empty($phone)) {
            return '';
        }

        $digits = preg_replace('/[^\d]/', '', $phone) ?? '';

        // If local 07X format, convert to 947X
        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = '94'.substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Inspect registration signals between referrer and referred clinics.
     * Returns an array of detected abuse flags (empty if clean).
     *
     * @param  array{
     *     email?: ?string,
     *     phone?: ?string,
     *     clinic_phone?: ?string,
     *     ip_address?: ?string,
     *     nic?: ?string
     * }  $registrationData
     * @return array<string, string> Key: flag code, Value: human-readable reason
     */
    public function detectRegistrationAbuse(Tenant $referrer, array $registrationData): array
    {
        $flags = [];

        // 1. Same tenant ID
        if (isset($registrationData['tenant_id']) && $referrer->id === $registrationData['tenant_id']) {
            $flags['same_tenant'] = 'Self-referral: Attempted to refer own clinic identifier.';
        }

        // 2. Referrer is Demo or Comp plan
        if ($referrer->isCompOrDemo()) {
            $flags['ineligible_referrer_tier'] = 'Demo and complimentary plan clinics cannot earn referral rewards.';
        }

        // 3. Owner user email match
        $referrerEmails = User::where('tenant_id', $referrer->id)
            ->pluck('email')
            ->map(fn ($e) => Str::lower(trim((string) $e)))
            ->all();

        $candidateEmail = Str::lower(trim((string) ($registrationData['email'] ?? '')));
        if ($candidateEmail !== '' && in_array($candidateEmail, $referrerEmails, true)) {
            $flags['same_owner_email'] = 'Self-referral: Referred clinic registered with the same user email as referrer.';
        }

        // 4. Phone number match
        $candidatePhones = array_filter([
            self::normalizePhone($registrationData['phone'] ?? null),
            self::normalizePhone($registrationData['clinic_phone'] ?? null),
        ]);

        $referrerPhones = array_filter([
            self::normalizePhone($referrer->phone),
            ...User::where('tenant_id', $referrer->id)->pluck('phone')->map(fn ($p) => self::normalizePhone($p))->all(),
        ]);

        foreach ($candidatePhones as $cp) {
            if ($cp !== '' && in_array($cp, $referrerPhones, true)) {
                $flags['same_phone'] = 'Self-referral: Referred clinic shares phone number with referrer.';
                break;
            }
        }

        // 5. NIC match (if stored in AgreementAcceptance or PendingRegistration)
        $candidateNic = Str::upper(trim((string) ($registrationData['nic'] ?? '')));
        if ($candidateNic !== '') {
            $referrerNics = AgreementAcceptance::where('tenant_id', $referrer->id)
                ->whereNotNull('nic_passport')
                ->pluck('nic_passport')
                ->map(fn ($n) => Str::upper(trim((string) $n)))
                ->all();

            if (in_array($candidateNic, $referrerNics, true)) {
                $flags['same_nic'] = 'Self-referral: Referrer and referred clinic share the same NIC/identification.';
            }
        }

        // 6. Registration IP within 30 days
        $candidateIp = $registrationData['ip_address'] ?? null;
        if (! empty($candidateIp) && ! in_array($candidateIp, ['127.0.0.1', '::1'], true)) {
            $thirtyDaysAgo = Carbon::now('Asia/Colombo')->subDays(30);

            // Check if referrer registered from this IP in the last 30 days
            $referrerIps = PendingRegistration::where('created_at', '>=', $thirtyDaysAgo)
                ->where(function ($q) use ($referrerEmails, $referrerPhones) {
                    $q->whereIn('email', $referrerEmails)
                        ->orWhereIn('phone', $referrerPhones);
                })
                ->pluck('ip_address')
                ->filter()
                ->all();

            if (in_array($candidateIp, $referrerIps, true)) {
                $flags['same_registration_ip'] = 'Self-referral: Clinic registered from the same IP address as referrer within 30 days.';
            }
        }

        return $flags;
    }

    /**
     * Inspect payment method and transaction signals (card fingerprint, last4, expiry).
     */
    public function detectPaymentAbuse(Tenant $referrer, Tenant $referred): array
    {
        $flags = [];

        // Check payment transactions for matching card fingerprint or last4+expiry from Payments.lk gateway
        $referrerTransactions = PaymentTransaction::where('tenant_id', $referrer->id)
            ->whereNotNull('raw_payload')
            ->get();

        $referredTransactions = PaymentTransaction::where('tenant_id', $referred->id)
            ->whereNotNull('raw_payload')
            ->get();

        foreach ($referredTransactions as $referredTx) {
            $refPayload = $referredTx->raw_payload ?? [];
            $refCard = $refPayload['payment']['card'] ?? $refPayload['card'] ?? null;

            if (! is_array($refCard)) {
                continue;
            }

            $refFingerprint = $refCard['fingerprint'] ?? null;
            $refLast4 = $refCard['last4'] ?? null;
            $refExpMonth = $refCard['exp_month'] ?? null;
            $refExpYear = $refCard['exp_year'] ?? null;

            foreach ($referrerTransactions as $origTx) {
                $origPayload = $origTx->raw_payload ?? [];
                $origCard = $origPayload['payment']['card'] ?? $origPayload['card'] ?? null;

                if (! is_array($origCard)) {
                    continue;
                }

                if ($refFingerprint && ($origCard['fingerprint'] ?? null) === $refFingerprint) {
                    $flags['same_payment_card'] = 'Self-referral: Referrer and referred clinic used the same payment card fingerprint.';
                    break 2;
                }

                if ($refLast4 && ($origCard['last4'] ?? null) === $refLast4
                    && ($origCard['exp_month'] ?? null) === $refExpMonth
                    && ($origCard['exp_year'] ?? null) === $refExpYear) {
                    $flags['same_payment_card'] = 'Self-referral: Referrer and referred clinic used the same card (last4 and expiry).';
                    break 2;
                }
            }
        }

        return $flags;
    }

    /**
     * Check if awarding credit would exceed the referrer's annual cap.
     * Annual cap: total referral credit per 12 months <= 12 * current monthly plan price.
     */
    public function calculateAllowedAmountUnderAnnualCap(Tenant $referrer, int $potentialRewardCents): int
    {
        $capMultiplier = (int) config('referrals.annual_cap_multiplier', 12);
        $plan = Plan::where('slug', $referrer->plan)->first();
        $monthlyPriceCents = $plan ? $plan->price_cents : (int) config('medvisit_public.plans.pro.price_cents', 900000);
        $annualCapCents = $monthlyPriceCents * $capMultiplier;

        $oneYearAgo = Carbon::now('Asia/Colombo')->subMonths(12);

        $totalEarnedLastYear = (int) TenantBillingCredit::where('tenant_id', $referrer->id)
            ->where('type', TenantBillingCredit::TYPE_REFERRAL_REWARD)
            ->where('created_at', '>=', $oneYearAgo)
            ->sum('amount_cents');

        $remainingAllowance = max(0, $annualCapCents - $totalEarnedLastYear);

        return min($potentialRewardCents, $remainingAllowance);
    }
}
