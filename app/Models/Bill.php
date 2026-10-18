<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'visit_type_id',
        'fee_snapshot',
        'doctor_payout_amount',
        'clinic_net_amount',
        'third_party_amount',
        'doctor_settlement_id',
    ];

    protected function casts(): array
    {
        return [
            'doctor_fee' => 'integer',
            'clinic_fee' => 'integer',
            'other_fee' => 'integer',
            'discount' => 'integer',
            'total_amount' => 'integer',
            'doctor_payout_amount' => 'integer',
            'clinic_net_amount' => 'integer',
            'third_party_amount' => 'integer',
            'fee_snapshot' => 'array',
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

    public function visitType(): BelongsTo
    {
        return $this->belongsTo(VisitType::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(DoctorSettlement::class, 'doctor_settlement_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(BillItem::class);
    }

    public function getFormattedTotalAttribute(): string
    {
        return 'Rs. '.number_format($this->total_amount / 100, 2);
    }
}
