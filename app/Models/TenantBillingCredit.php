<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantBillingCredit extends Model
{
    use HasFactory;

    public const TYPE_REFERRAL_REWARD = 'referral_reward';

    public const TYPE_INVOICE_RESERVATION = 'invoice_reservation';

    public const TYPE_INVOICE_DEDUCTION = 'invoice_deduction';

    public const TYPE_RESERVATION_RELEASE = 'reservation_release';

    public const TYPE_REFUND_CREDIT_RETURNED = 'refund_credit_returned';

    public const TYPE_REWARD_REVERSAL = 'reward_reversal';

    public const TYPE_EXPIRY = 'expiry';

    protected $fillable = [
        'tenant_id',
        'referral_id',
        'invoice_id',
        'type',
        'amount_cents',
        'balance_after_cents',
        'expires_at',
        'notes',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'balance_after_cents' => 'integer',
        'expires_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function referral(): BelongsTo
    {
        return $this->belongsTo(ClinicReferral::class, 'referral_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SubscriptionInvoice::class, 'invoice_id');
    }

    public function getFormattedAmountAttribute(): string
    {
        $sign = $this->amount_cents >= 0 ? '+' : '-';

        return $sign.'Rs. '.number_format(abs($this->amount_cents) / 100, 2);
    }

    public function getFormattedBalanceAttribute(): string
    {
        return 'Rs. '.number_format(max(0, $this->balance_after_cents) / 100, 2);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
