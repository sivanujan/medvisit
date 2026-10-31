<?php

declare(strict_types=1);

namespace App\Services\Plans;

use App\Models\Doctor;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSmsTopup;
use App\Models\TenantSmsUsage;
use App\Models\TvDevice;
use App\Models\User;
use App\Services\Billing\SubscriptionNotificationService;
use App\Services\PlatformSettingsService;

class PlanGate
{
    /**
     * In-memory request cache to avoid duplicate DB lookups.
     */
    protected static array $cache = [];

    /**
     * Clear request-level cache (useful for testing).
     */
    public static function clearCache(): void
    {
        static::$cache = [];
    }

    /**
     * Resolve the active plan for a tenant.
     */
    public function resolvePlan(?Tenant $tenant): ?Plan
    {
        if (! $tenant) {
            return null;
        }

        $cacheKey = "plan_{$tenant->id}";
        if (isset(static::$cache[$cacheKey])) {
            return static::$cache[$cacheKey];
        }

        $subscription = $tenant->subscription;

        if ($subscription && $subscription->plan) {
            $plan = $subscription->plan;
        } elseif ($subscription && $subscription->plan_id) {
            $plan = Plan::find($subscription->plan_id);
        } else {
            $slug = (string) ($tenant->plan ?? 'basic');
            $plan = Plan::forSlug($slug) ?? Plan::where('slug', 'basic')->first();
        }

        static::$cache[$cacheKey] = $plan;

        return $plan;
    }

    /**
     * Master feature flag: check if plan gating is active globally.
     */
    public function isGatingEnabled(): bool
    {
        return (bool) config('plans.gating_enabled', false);
    }

    /**
     * Check if a tenant's plan allows a specific feature.
     */
    public function allows(?Tenant $tenant, string $feature): bool
    {
        if (! $tenant) {
            return false;
        }

        // When gating is disabled, all features are completely unlocked for every clinic
        if (! $this->isGatingEnabled()) {
            return true;
        }

        // Complimentary plan allows everything
        if ($tenant->isComp() || $this->resolvePlan($tenant)?->slug === 'comp') {
            return true;
        }

        // If active launch offer is running on Advanced tier, treat as Advanced
        if ($this->isLaunchOfferActive($tenant)) {
            $advanced = Plan::where('slug', 'advanced')->first();
            if ($advanced && $advanced->allowsFeature($feature)) {
                return true;
            }
        }

        $plan = $this->resolvePlan($tenant);
        if (! $plan) {
            return false;
        }

        return $plan->allowsFeature($feature);
    }

    /**
     * Get a numeric resource limit (-1 indicates unlimited).
     */
    public function limit(?Tenant $tenant, string $limitKey): int
    {
        if (! $tenant) {
            return 0;
        }

        // When gating is disabled, all limits are unlimited (-1)
        if (! $this->isGatingEnabled()) {
            return $limitKey === 'free_premium_templates' ? 1 : -1;
        }

        if ($limitKey !== 'free_premium_templates' && ($tenant->isComp() || $this->resolvePlan($tenant)?->slug === 'comp')) {
            return -1;
        }

        if ($limitKey === 'free_premium_templates' && ($tenant->isComp() || $this->resolvePlan($tenant)?->slug === 'comp')) {
            return 5;
        }

        // Cap SMS at 500 during launch offer
        if ($limitKey === 'sms_monthly' && $this->isLaunchOfferActive($tenant)) {
            $settings = app(PlatformSettingsService::class)->all();

            return (int) ($settings['launch_offer.sms_cap'] ?? 500);
        }

        // Launch offer grants Advanced tier limits for resources
        if ($this->isLaunchOfferActive($tenant)) {
            $advanced = Plan::where('slug', 'advanced')->first();
            if ($advanced) {
                return $advanced->getLimit($limitKey, -1);
            }
        }

        $plan = $this->resolvePlan($tenant);
        if (! $plan) {
            return 0;
        }

        return $plan->getLimit($limitKey, 0);
    }

    /**
     * Get current usage count for a metric.
     */
    public function usage(?Tenant $tenant, string $metric): int
    {
        if (! $tenant) {
            return 0;
        }

        return match ($metric) {
            'doctors' => Doctor::where('tenant_id', $tenant->id)->where('is_active', true)->count(),
            'staff' => $this->activeStaffCount($tenant),
            'tv_screens' => TvDevice::where('tenant_id', $tenant->id)->whereNull('revoked_at')->count(),
            'sms_monthly', 'sms' => TenantSmsUsage::currentForTenant($tenant)->clinic_triggered_count,
            'free_premium_templates' => $tenant->templatePurchases()->where('source', 'plan_included')->count(),
            default => 0,
        };
    }

    /**
     * Active staff users excluding clinic owner / primary admin.
     */
    public function activeStaffCount(Tenant $tenant): int
    {
        $primaryAdminId = User::where('tenant_id', $tenant->id)->orderBy('id')->value('id');

        return User::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->when($primaryAdminId, fn ($q) => $q->where('id', '!=', $primaryAdminId))
            ->count();
    }

    /**
     * Check if tenant is over limit for a metric.
     */
    public function isOverLimit(?Tenant $tenant, string $metric): bool
    {
        $limit = $this->limit($tenant, $metric);
        if ($limit === -1) {
            return false;
        }

        return $this->usage($tenant, $metric) >= $limit;
    }

    /**
     * Calculate remaining units for a metric.
     */
    public function remaining(?Tenant $tenant, string $metric): int
    {
        $limit = $this->limit($tenant, $metric);
        if ($limit === -1) {
            return 999999;
        }

        $baseRemaining = max(0, $limit - $this->usage($tenant, $metric));

        if ($metric === 'sms_monthly' || $metric === 'sms') {
            $topupCredits = (int) TenantSmsTopup::where('tenant_id', $tenant->id)->active()->sum('credits_remaining');

            return $baseRemaining + $topupCredits;
        }

        return $baseRemaining;
    }

    /**
     * Check whether an SMS send is allowed, considering base quota, grace, and top-ups.
     */
    public function checkSmsAllowance(Tenant $tenant, string $smsType = 'queue_alert'): array
    {
        // System and registration authentication OTPs never count against clinic quota
        if ($smsType === 'system_auth' || $smsType === 'registration_otp') {
            return [
                'allowed' => true,
                'deduct_type' => 'exempt',
                'reason' => null,
            ];
        }

        $usage = TenantSmsUsage::currentForTenant($tenant);
        $monthlyLimit = $this->limit($tenant, 'sms_monthly');

        // Unlimited plan
        if ($monthlyLimit === -1) {
            return [
                'allowed' => true,
                'deduct_type' => 'base',
                'reason' => null,
            ];
        }

        // 1. Within monthly quota
        if ($usage->clinic_triggered_count < $monthlyLimit) {
            return [
                'allowed' => true,
                'deduct_type' => 'base',
                'reason' => null,
            ];
        }

        // 2. Base quota exhausted: Check active top-up packs
        $activeTopup = TenantSmsTopup::where('tenant_id', $tenant->id)
            ->active()
            ->orderBy('expires_at')
            ->first();

        if ($activeTopup) {
            return [
                'allowed' => true,
                'deduct_type' => 'topup',
                'topup_id' => $activeTopup->id,
                'reason' => null,
            ];
        }

        // 3. No top-up credits: Patient booking OTP gets an extra 10% grace
        if ($smsType === 'patient_otp') {
            $graceLimit = (int) ceil($monthlyLimit * 0.10);
            if ($usage->otp_grace_count < $graceLimit) {
                return [
                    'allowed' => true,
                    'deduct_type' => 'otp_grace',
                    'reason' => null,
                ];
            }

            return [
                'allowed' => false,
                'deduct_type' => 'blocked',
                'fallback_to_web' => true,
                'reason' => 'SMS quota and grace limit reached. Please view your booking confirmation link on screen.',
            ];
        }

        // 4. Regular queue alerts blocked when quota is at 100%
        return [
            'allowed' => false,
            'deduct_type' => 'blocked',
            'reason' => 'Monthly clinic SMS quota reached ('.$monthlyLimit.'/'.$monthlyLimit.'). Upgrade plan or purchase an SMS top-up pack in Billing.',
        ];
    }

    /**
     * Record an SMS send, decrementing top-up or incrementing monthly usage.
     */
    public function recordSmsSent(Tenant $tenant, string $smsType = 'queue_alert'): void
    {
        $allowance = $this->checkSmsAllowance($tenant, $smsType);
        if (! $allowance['allowed'] || $allowance['deduct_type'] === 'exempt') {
            return;
        }

        $usage = TenantSmsUsage::currentForTenant($tenant);

        if ($allowance['deduct_type'] === 'topup' && ! empty($allowance['topup_id'])) {
            $topup = TenantSmsTopup::find($allowance['topup_id']);
            if ($topup && $topup->credits_remaining > 0) {
                $topup->decrement('credits_remaining');
            }

            return;
        }

        if ($allowance['deduct_type'] === 'otp_grace') {
            $usage->increment('otp_grace_count');

            return;
        }

        // Base monthly increment
        $usage->increment('clinic_triggered_count');
        $newCount = $usage->clinic_triggered_count;
        $limit = $this->limit($tenant, 'sms_monthly');

        if ($limit > 0) {
            $percent = ($newCount / $limit) * 100;

            // 80% threshold notification
            if ($percent >= 80 && $percent < 100 && is_null($usage->notification_80_sent_at)) {
                $usage->update(['notification_80_sent_at' => now()]);
                app(SubscriptionNotificationService::class)->sendSmsThresholdNotice($tenant, 80, $newCount, $limit);
            }

            // 100% threshold notification
            if ($percent >= 100 && is_null($usage->notification_100_sent_at)) {
                $usage->update(['notification_100_sent_at' => now()]);
                app(SubscriptionNotificationService::class)->sendSmsThresholdNotice($tenant, 100, $newCount, $limit);
            }
        }
    }

    /**
     * Check if a tenant is currently enjoying the free launch offer.
     */
    public function isLaunchOfferActive(?Tenant $tenant): bool
    {
        if (! $tenant) {
            return false;
        }

        $data = $tenant->data ?? [];

        return (bool) ($data['is_launch_offer'] ?? false)
            && $tenant->subscription
            && $tenant->subscription->isActive()
            && $tenant->subscription->plan?->slug === 'advanced'
            && $tenant->subscription->current_period_end?->isFuture();
    }

    /**
     * Consolidated payload for Inertia shared props and UI widgets.
     */
    public function summary(?Tenant $tenant): array
    {
        if (! $tenant) {
            return [
                'plan' => 'basic',
                'plan_name' => 'Basic',
                'is_comp' => false,
                'is_launch_offer' => false,
                'features' => [],
                'limits' => [],
                'usage' => [],
                'sms_quota' => [
                    'used' => 0,
                    'limit' => 300,
                    'remaining' => 300,
                    'percent' => 0,
                    'is_exhausted' => false,
                    'is_warning' => false,
                ],
            ];
        }

        $plan = $this->resolvePlan($tenant);
        $planSlug = $plan?->slug ?? (string) ($tenant->plan ?? 'basic');
        $isComp = $tenant->isComp();
        $isLaunchOffer = $this->isLaunchOfferActive($tenant);

        $limits = [
            'doctors' => $this->limit($tenant, 'doctors'),
            'staff' => $this->limit($tenant, 'staff'),
            'tv_screens' => $this->limit($tenant, 'tv_screens'),
            'sms_monthly' => $this->limit($tenant, 'sms_monthly'),
            'free_premium_templates' => $this->limit($tenant, 'free_premium_templates'),
        ];

        $usage = [
            'doctors' => $this->usage($tenant, 'doctors'),
            'staff' => $this->usage($tenant, 'staff'),
            'tv_screens' => $this->usage($tenant, 'tv_screens'),
            'sms_monthly' => $this->usage($tenant, 'sms_monthly'),
            'free_premium_templates' => $this->usage($tenant, 'free_premium_templates'),
        ];

        $smsLimit = $limits['sms_monthly'];
        $smsUsed = $usage['sms_monthly'];
        $smsRemaining = $this->remaining($tenant, 'sms_monthly');
        $smsPercent = ($smsLimit > 0) ? min(100, round(($smsUsed / $smsLimit) * 100)) : 0;

        return [
            'plan' => $planSlug,
            'plan_name' => $plan?->name ?? ucfirst($planSlug),
            'is_comp' => $isComp,
            'is_launch_offer' => $isLaunchOffer,
            'launch_offer_until' => $isLaunchOffer ? $tenant->subscription?->current_period_end?->format('d M Y') : null,
            'features' => [
                'pharmacy' => $this->allows($tenant, 'pharmacy'),
                'website_builder' => $this->allows($tenant, 'website_builder'),
                'tv_multi_room' => $this->allows($tenant, 'tv_multi_room'),
                'audit_export' => $this->allows($tenant, 'audit_export'),
                'support' => $plan?->features['support'] ?? 'email',
            ],
            'limits' => $limits,
            'usage' => $usage,
            'sms_quota' => [
                'used' => $smsUsed,
                'limit' => $smsLimit,
                'remaining' => $smsRemaining,
                'percent' => $smsPercent,
                'is_exhausted' => $smsLimit > 0 && $smsUsed >= $smsLimit && $smsRemaining <= 0,
                'is_warning' => $smsLimit > 0 && $smsPercent >= 80,
            ],
        ];
    }
}
