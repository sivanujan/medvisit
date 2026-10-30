<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\Plan;
use App\Models\PromoCode;
use App\Models\PromoCodeRedemption;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class PromoCodeService
{
    /**
     * Rate limit promo validation: max 10 attempts per IP per hour.
     */
    public function ensureNotRateLimited(string $ip): void
    {
        $key = 'promo_apply_ip:'.$ip;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'code' => 'Too many promo code attempts. Please wait '.ceil($seconds / 60).' minute(s) before trying again.',
            ]);
        }
        RateLimiter::hit($key, 3600);
    }

    /**
     * Clear rate limiter on valid code.
     */
    public function clearRateLimit(string $ip): void
    {
        RateLimiter::clear('promo_apply_ip:'.$ip);
    }

    /**
     * Non-throwing validate helper.
     *
     * @return array{valid: bool, promo?: PromoCode, calculation?: array, error?: string}
     */
    public function validate(string $rawCode, Tenant $tenant, Plan $plan): array
    {
        try {
            $promo = $this->validateForCheckout($rawCode, $tenant, $plan);
            $calc = $this->calculateDiscount($promo, $plan->price_cents);

            return [
                'valid' => true,
                'promo' => $promo,
                'calculation' => $calc,
            ];
        } catch (ValidationException $e) {
            return [
                'valid' => false,
                'error' => $e->validator->errors()->first('code') ?: $e->getMessage(),
            ];
        }
    }

    /**
     * Validate a promo code against a tenant and plan.
     */
    public function validateForCheckout(string $rawCode, Tenant $tenant, Plan $plan): PromoCode
    {
        $code = strtoupper(trim($rawCode));
        if (empty($code)) {
            throw ValidationException::withMessages(['code' => 'Please enter a promo code.']);
        }

        if ((bool) $tenant->is_demo || $tenant->id === 'demo' || $tenant->status === 'demo') {
            throw ValidationException::withMessages(['code' => 'Promo codes cannot be redeemed on demo clinics.']);
        }

        /** @var PromoCode|null $promo */
        $promo = PromoCode::where('code', $code)->first();

        if (! $promo) {
            throw ValidationException::withMessages(['code' => 'Invalid promo code.']);
        }

        if (! $promo->is_active) {
            throw ValidationException::withMessages(['code' => 'This promo code is no longer active.']);
        }

        $now = Carbon::now('Asia/Colombo');
        if ($promo->valid_from && $promo->valid_from->gt($now)) {
            throw ValidationException::withMessages(['code' => 'This promo code is not active yet.']);
        }

        if ($promo->valid_until && $promo->valid_until->lt($now)) {
            throw ValidationException::withMessages(['code' => 'This promo code has expired.']);
        }

        // Global cap check
        if ($promo->hasReachedMaxRedemptions()) {
            throw ValidationException::withMessages(['code' => 'This promo code has reached its maximum redemptions.']);
        }

        // Plan eligibility check
        if (! $promo->isPlanEligible($plan->slug)) {
            throw ValidationException::withMessages(['code' => "This promo code is not valid for the {$plan->name} plan."]);
        }

        // New clinics only check
        if ($promo->new_clinics_only) {
            $hasPaidInvoices = SubscriptionInvoice::where('tenant_id', $tenant->id)
                ->where('status', SubscriptionInvoice::STATUS_PAID)
                ->exists();

            if ($hasPaidInvoices) {
                throw ValidationException::withMessages(['code' => 'This promo code is valid for new clinics only.']);
            }
        }

        // Extra trial days only valid before the first paid invoice
        if ($promo->type === PromoCode::TYPE_EXTRA_TRIAL_DAYS) {
            $hasPaidInvoices = SubscriptionInvoice::where('tenant_id', $tenant->id)
                ->where('status', SubscriptionInvoice::STATUS_PAID)
                ->exists();

            if ($hasPaidInvoices) {
                throw ValidationException::withMessages(['code' => 'Extra trial days can only be applied before your first paid invoice.']);
            }
        }

        // Max 1 redemption per clinic check
        $alreadyRedeemed = PromoCodeRedemption::where('promo_code_id', $promo->id)
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', [PromoCodeRedemption::STATUS_RESERVED, PromoCodeRedemption::STATUS_ACTIVE, PromoCodeRedemption::STATUS_COMPLETED])
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', Carbon::now());
            })
            ->exists();

        if ($alreadyRedeemed) {
            throw ValidationException::withMessages(['code' => 'This promo code has already been applied or used by your clinic.']);
        }

        return $promo;
    }

    /**
     * Calculate discount amount and final total for a plan and promo code.
     *
     * @return array{
     *     discount_cents: int,
     *     final_amount_cents: int,
     *     original_amount_cents: int,
     *     discount_formatted: string,
     *     final_formatted: string,
     *     summary_text: string,
     *     renewal_text: string
     * }
     */
    public function calculateDiscount(PromoCode $promo, int $planPriceCents): array
    {
        $discountCents = 0;
        $summaryText = '';
        $renewalText = '';

        switch ($promo->type) {
            case PromoCode::TYPE_PERCENT:
                $percent = max(1, min(100, $promo->value));
                $discountCents = (int) round(($planPriceCents * $percent) / 100);
                $summaryText = "{$percent}% off";
                break;

            case PromoCode::TYPE_FIXED:
                $discountCents = (int) $promo->value;
                $summaryText = 'Rs. '.number_format($discountCents / 100, 2).' off';
                break;

            case PromoCode::TYPE_FREE_MONTHS:
                $months = max(1, (int) ($promo->duration_months ?: $promo->value ?: 1));
                $discountCents = $planPriceCents;
                $summaryText = "100% off ({$months} free month".($months > 1 ? 's' : '').')';
                break;

            case PromoCode::TYPE_EXTRA_TRIAL_DAYS:
                $days = (int) $promo->value;
                $discountCents = 0;
                $summaryText = "+{$days} extra trial days";
                break;
        }

        // Clamp discount: never exceed original price, never negative
        $discountCents = min($planPriceCents, max(0, $discountCents));
        $finalAmountCents = max(0, $planPriceCents - $discountCents);

        if ($promo->duration === PromoCode::DURATION_FOREVER) {
            $renewalText = 'Discount applies to all renewals';
        } elseif ($promo->duration === PromoCode::DURATION_REPEATING) {
            $months = (int) ($promo->duration_months ?: 1);
            $renewalText = "Applies for {$months} month".($months > 1 ? 's' : '');
        } else {
            $renewalText = 'First invoice only (renews at full price)';
        }

        return [
            'discount_cents' => $discountCents,
            'final_amount_cents' => $finalAmountCents,
            'original_amount_cents' => $planPriceCents,
            'discount_formatted' => 'Rs. '.number_format($discountCents / 100, 2),
            'final_formatted' => 'Rs. '.number_format($finalAmountCents / 100, 2),
            'summary_text' => $summaryText,
            'renewal_text' => $renewalText,
        ];
    }

    /**
     * Reserve promo code for a checkout session with DB lock.
     */
    public function reserve(
        PromoCode $promo,
        Tenant $tenant,
        Subscription $subscription,
        Plan $plan,
        ?SubscriptionInvoice $invoice = null
    ): PromoCodeRedemption {
        return DB::transaction(function () use ($promo, $tenant, $subscription, $plan, $invoice) {
            /** @var PromoCode $lockedPromo */
            $lockedPromo = PromoCode::where('id', $promo->id)->lockForUpdate()->firstOrFail();

            if ($lockedPromo->hasReachedMaxRedemptions()) {
                throw ValidationException::withMessages(['code' => 'This promo code has just reached its maximum redemptions.']);
            }

            // Release any prior reserved redemptions for this tenant and subscription
            PromoCodeRedemption::where('tenant_id', $tenant->id)
                ->where('status', PromoCodeRedemption::STATUS_RESERVED)
                ->update(['status' => PromoCodeRedemption::STATUS_RELEASED]);

            $calculation = $this->calculateDiscount($lockedPromo, $plan->price_cents);

            $durationMonths = $lockedPromo->duration === PromoCode::DURATION_REPEATING
                ? (int) ($lockedPromo->duration_months ?: 1)
                : ($lockedPromo->type === PromoCode::TYPE_FREE_MONTHS ? (int) ($lockedPromo->duration_months ?: $lockedPromo->value ?: 1) : null);

            return PromoCodeRedemption::create([
                'promo_code_id' => $lockedPromo->id,
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'invoice_id' => $invoice?->id,
                'status' => PromoCodeRedemption::STATUS_RESERVED,
                // Snapshot the deal so future edits to promo_codes do not mutate this redemption
                'discount_type' => $lockedPromo->type,
                'discount_value' => $lockedPromo->value,
                'duration' => $lockedPromo->duration,
                'duration_months' => $durationMonths,
                'eligible_plans' => $lockedPromo->eligible_plans,
                'discount_amount_cents' => $calculation['discount_cents'],
                'original_amount_cents' => $calculation['original_amount_cents'],
                'final_amount_cents' => $calculation['final_amount_cents'],
                'reserved_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addMinutes(30),
                'months_remaining' => $durationMonths,
            ]);
        });
    }

    /**
     * Activate a reserved promo code redemption upon successful checkout or Rs. 0 activation.
     */
    public function activate(PromoCodeRedemption $redemption, SubscriptionInvoice $invoice): void
    {
        DB::transaction(function () use ($redemption, $invoice) {
            /** @var PromoCode $lockedPromo */
            $lockedPromo = PromoCode::where('id', $redemption->promo_code_id)->lockForUpdate()->firstOrFail();

            $redemption->update([
                'status' => PromoCodeRedemption::STATUS_ACTIVE,
                'invoice_id' => $invoice->id,
                'activated_at' => Carbon::now(),
                'expires_at' => null,
            ]);

            // Increment times_redeemed only once on actual activation
            $lockedPromo->increment('times_redeemed');

            $subscription = $redemption->subscription;
            if ($subscription) {
                // If it is extra trial days, apply to subscription
                if ($redemption->discount_type === PromoCode::TYPE_EXTRA_TRIAL_DAYS) {
                    $baseDate = ($subscription->trial_ends_at && $subscription->trial_ends_at->isFuture())
                        ? $subscription->trial_ends_at
                        : Carbon::now();

                    $newTrialEnd = $baseDate->copy()->addDays((int) $redemption->discount_value);
                    $subscription->update([
                        'trial_ends_at' => $newTrialEnd,
                        'current_period_end' => $newTrialEnd,
                    ]);

                    $tenant = $subscription->tenant;
                    if ($tenant) {
                        $tenant->update(['trial_ends_at' => $newTrialEnd]);
                    }
                }

                // Save snapshot to subscription for renewal processing
                $subscription->update([
                    'active_promo_id' => $lockedPromo->id,
                    'promo_snapshot' => [
                        'code' => $lockedPromo->code,
                        'type' => $redemption->discount_type,
                        'value' => $redemption->discount_value,
                        'duration' => $redemption->duration,
                        'duration_months' => $redemption->duration_months,
                        'eligible_plans' => $redemption->eligible_plans,
                    ],
                    'promo_months_remaining' => $redemption->months_remaining,
                ]);
            }
        });
    }

    /**
     * Release a reservation if checkout fails or is abandoned.
     */
    public function releaseReservation(int|PromoCodeRedemption $redemption): void
    {
        $id = $redemption instanceof PromoCodeRedemption ? $redemption->id : $redemption;
        PromoCodeRedemption::where('id', $id)
            ->where('status', PromoCodeRedemption::STATUS_RESERVED)
            ->update(['status' => PromoCodeRedemption::STATUS_RELEASED]);
    }

    /**
     * Clean up expired reservations past their 30-minute window.
     */
    public function releaseExpiredReservations(): int
    {
        return PromoCodeRedemption::where('status', PromoCodeRedemption::STATUS_RESERVED)
            ->where('expires_at', '<', Carbon::now())
            ->update(['status' => PromoCodeRedemption::STATUS_RELEASED]);
    }
}
