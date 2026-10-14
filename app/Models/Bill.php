<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Bill extends Model
{
    use BelongsToTenant, HasFactory;

    public const METHOD_CASH = 'cash';

    public const METHOD_CARD = 'card';

    public const METHOD_BANK_TRANSFER = 'bank_transfer';

    public const STATUS_PAID = 'paid';

    public const STATUS_PENDING = 'pending';

    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'tenant_id',
        'booking_token_id',
        'patient_id',
        'doctor_id',
        'receipt_number',
        'doctor_fee',
        'clinic_fee',
        'other_fee',
        'discount',
        'discount_reason',
        'total_amount',
        'payment_method',
        'payment_status',
        'refunded_at',
        'refund_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'doctor_fee' => 'integer',
            'clinic_fee' => 'integer',
            'other_fee' => 'integer',
            'discount' => 'integer',
            'total_amount' => 'integer',
            'refunded_at' => 'datetime',
        ];
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(BookingToken::class, 'booking_token_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function getFormattedTotalAttribute(): string
    {
        return 'Rs. '.number_format($this->total_amount / 100, 2);
    }
}
