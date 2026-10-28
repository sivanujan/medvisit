<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PaymentTransaction extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_SUCCEEDED = 'succeeded';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'gateway',
        'gateway_checkout_id',
        'gateway_payment_id',
        'amount_cents',
        'refunded_amount_cents',
        'currency',
        'status',
        'idempotency_key',
        'raw_payload',
        'terms_accepted_at',
        'terms_version',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'refunded_amount_cents' => 'integer',
        'raw_payload' => 'array',
        'terms_accepted_at' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SubscriptionInvoice::class, 'invoice_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function refundRequests(): HasMany
    {
        return $this->hasMany(RefundRequest::class, 'payment_id');
    }

    public function openRefundRequest(): HasOne
    {
        return $this->hasOne(RefundRequest::class, 'payment_id')
            ->whereIn('status', [
                RefundRequest::STATUS_REQUESTED,
                RefundRequest::STATUS_UNDER_REVIEW,
                RefundRequest::STATUS_APPROVED,
                RefundRequest::STATUS_PROCESSING,
            ]);
    }

    public function getRefundStatusAttribute(): string
    {
        if ($this->refunded_amount_cents <= 0) {
            return 'none';
        }

        if ($this->refunded_amount_cents >= $this->amount_cents) {
            return 'full';
        }

        return 'partial';
    }

    public function getRefundableAmountCentsAttribute(): int
    {
        return max(0, $this->amount_cents - $this->refunded_amount_cents);
    }

    public function getCardLast4Attribute(): ?string
    {
        $payload = $this->raw_payload;
        if (! is_array($payload)) {
            return null;
        }

        return $payload['payment']['card']['last4'] ?? null;
    }

    public function getCardSchemeAttribute(): ?string
    {
        $payload = $this->raw_payload;
        if (! is_array($payload)) {
            return null;
        }

        return $payload['payment']['card']['scheme'] ?? null;
    }

    public function getFormattedAmountAttribute(): string
    {
        return 'Rs. '.number_format($this->amount_cents / 100, 2);
    }

    public function getFormattedRefundedAmountAttribute(): string
    {
        return 'Rs. '.number_format($this->refunded_amount_cents / 100, 2);
    }
}
