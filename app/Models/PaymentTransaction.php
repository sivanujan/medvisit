<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'currency',
        'status',
        'idempotency_key',
        'raw_payload',
        'terms_accepted_at',
        'terms_version',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
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

    public function getFormattedAmountAttribute(): string
    {
        return 'Rs. '.number_format($this->amount_cents / 100, 2);
    }
}
