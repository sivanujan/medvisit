<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicReferral extends Model
{
    use HasFactory;

    public const STATUS_REGISTERED = 'registered';

    public const STATUS_PAYING = 'paying';

    public const STATUS_REWARD_PENDING = 'reward_pending';

    public const STATUS_REWARDED = 'rewarded';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'referrer_tenant_id',
        'referred_tenant_id',
        'referral_code',
        'status',
        'reward_amount_cents',
        'qualifying_invoices_count',
        'flags',
        'rejection_reason',
        'admin_notes',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
    ];

    protected $casts = [
        'reward_amount_cents' => 'integer',
        'qualifying_invoices_count' => 'integer',
        'flags' => 'array',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function referrerTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'referrer_tenant_id');
    }

    public function referredTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'referred_tenant_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function credits(): HasMany
    {
        return $this->hasMany(TenantBillingCredit::class, 'referral_id');
    }

    public function getFormattedRewardAttribute(): string
    {
        return 'Rs. '.number_format($this->reward_amount_cents / 100, 2);
    }

    public function hasAbuseFlags(): bool
    {
        return ! empty($this->flags);
    }
}
