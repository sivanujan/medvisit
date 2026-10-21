<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;

    public const STATUS_PENDING_PAYMENT = 'pending_payment';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAST_DUE = 'past_due';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLING = 'cancelling';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'pending_plan_id',
        'status',
        'cancels_at_period_end',
        'cancelled_at',
        'cancellation_reason',
        'cancellation_reason_detail',
        'current_period_start',
        'current_period_end',
        'trial_ends_at',
        'activated_at',
        'created_by',
        'notes',
        'terms_accepted_at',
        'terms_version',
    ];

    protected $casts = [
        'cancels_at_period_end' => 'boolean',
        'cancelled_at' => 'datetime',
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
        'trial_ends_at' => 'datetime',
        'activated_at' => 'datetime',
        'terms_accepted_at' => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function pendingPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'pending_plan_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function latestUnpaidInvoice(): ?SubscriptionInvoice
    {
        return $this->invoices()
            ->where('status', SubscriptionInvoice::STATUS_UNPAID)
            ->latest('id')
            ->first();
    }

    /**
     * Check if the subscription is complimentary (free lifetime, no monthly billing).
     */
    public function isComp(): bool
    {
        return $this->plan?->slug === 'comp';
    }

    /**
     * Check if subscription is scheduled to cancel at the end of the period.
     */
    public function isCancelling(): bool
    {
        return (bool) ($this->cancels_at_period_end || $this->status === self::STATUS_CANCELLING);
    }

    /**
     * Check if the current plan permits a particular feature.
     */
    public function planAllows(string $feature): bool
    {
        if ($this->isComp()) {
            return true;
        }

        $features = $this->plan?->features ?? [];
        if (empty($features)) {
            return true;
        }

        // Features can be key-value pairs or simple strings
        if (isset($features[$feature])) {
            return (bool) $features[$feature];
        }

        foreach ($features as $f) {
            if (is_string($f) && (strcasecmp($f, $feature) === 0 || stripos($f, $feature) !== false)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if the subscription is currently usable (active, lifetime, in grace, cancelling, or in trial).
     */
    public function isActive(): bool
    {
        if ($this->status === self::STATUS_CANCELLED) {
            return false;
        }

        // 1. In active trial period
        if ($this->trial_ends_at && $this->trial_ends_at->isFuture()) {
            return true;
        }

        // 2. Active status with no expiration (comp plan)
        if ($this->status === self::STATUS_ACTIVE && is_null($this->current_period_end)) {
            return true;
        }

        // 3. Active or Cancelling status within current period
        if (in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_CANCELLING], true)
            && $this->current_period_end
            && $this->current_period_end->isFuture()
        ) {
            return true;
        }

        // 4. Within configurable grace period (for non-cancelled subscriptions)
        if ($this->isInGracePeriod()) {
            return true;
        }

        return false;
    }

    /**
     * Check if subscription has expired but is within grace period.
     */
    public function isInGracePeriod(): bool
    {
        if ($this->status === self::STATUS_CANCELLED || (bool) $this->cancels_at_period_end) {
            return false;
        }

        if (! $this->current_period_end) {
            return false;
        }

        $graceDays = (int) config('medvisit.subscription.grace_days', 3);
        $graceEnd = $this->current_period_end->copy()->addDays($graceDays);

        return $this->current_period_end->isPast() && $graceEnd->isFuture();
    }

    /**
     * Check if subscription is actively trialing.
     */
    public function isTrialing(): bool
    {
        return (bool) ($this->trial_ends_at && $this->trial_ends_at->isFuture());
    }
}
