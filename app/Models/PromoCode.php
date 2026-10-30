<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PromoCode extends Model
{
    use HasFactory;

    public const TYPE_PERCENT = 'percent';

    public const TYPE_FIXED = 'fixed';

    public const TYPE_FREE_MONTHS = 'free_months';

    public const TYPE_EXTRA_TRIAL_DAYS = 'extra_trial_days';

    public const DURATION_ONCE = 'once';

    public const DURATION_REPEATING = 'repeating';

    public const DURATION_FOREVER = 'forever';

    protected $fillable = [
        'code',
        'notes',
        'type',
        'value',
        'duration',
        'duration_months',
        'eligible_plans',
        'new_clinics_only',
        'max_redemptions',
        'times_redeemed',
        'valid_from',
        'valid_until',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'value' => 'integer',
        'duration_months' => 'integer',
        'eligible_plans' => 'array',
        'new_clinics_only' => 'boolean',
        'max_redemptions' => 'integer',
        'times_redeemed' => 'integer',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function redemptions(): HasMany
    {
        return $this->hasMany(PromoCodeRedemption::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function canBeDeleted(): bool
    {
        return $this->redemptions()->count() === 0;
    }

    public function isActive(): bool
    {
        return (bool) $this->is_active && $this->hasStarted() && ! $this->isExpired() && ! $this->hasReachedMaxRedemptions();
    }

    public function isExpired(): bool
    {
        return $this->valid_until !== null && $this->valid_until->isPast();
    }

    public function hasStarted(): bool
    {
        return $this->valid_from === null || $this->valid_from->isPast();
    }

    public function hasReachedMaxRedemptions(): bool
    {
        if ($this->max_redemptions === null) {
            return false;
        }

        return $this->times_redeemed >= $this->max_redemptions;
    }

    public function isPlanEligible(string $planSlug): bool
    {
        if (empty($this->eligible_plans)) {
            return true;
        }

        if (in_array('*', $this->eligible_plans, true)) {
            return true;
        }

        return in_array($planSlug, $this->eligible_plans, true);
    }
}
