<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromoCodeRedemption extends Model
{
    use HasFactory;

    public const STATUS_RESERVED = 'reserved';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_RELEASED = 'released';

    protected $fillable = [
        'promo_code_id',
        'tenant_id',
        'subscription_id',
        'invoice_id',
        'status',
        'discount_type',
        'discount_value',
        'duration',
        'duration_months',
        'eligible_plans',
        'discount_amount_cents',
        'original_amount_cents',
        'final_amount_cents',
        'reserved_at',
        'activated_at',
        'expires_at',
        'months_remaining',
    ];

    protected $casts = [
        'discount_value' => 'integer',
        'duration_months' => 'integer',
        'eligible_plans' => 'array',
        'discount_amount_cents' => 'integer',
        'original_amount_cents' => 'integer',
        'final_amount_cents' => 'integer',
        'months_remaining' => 'integer',
        'reserved_at' => 'datetime',
        'activated_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function promoCode(): BelongsTo
    {
        return $this->belongsTo(PromoCode::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SubscriptionInvoice::class, 'invoice_id');
    }
}
