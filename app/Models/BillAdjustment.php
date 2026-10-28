<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class BillAdjustment extends Model
{
    use BelongsToTenant, HasFactory;

    public const TYPE_MOVE_DIFFERENTIAL = 'move_differential';

    public const TYPE_WAIVER = 'waiver';

    public const TYPE_REFUND = 'refund';

    protected $fillable = [
        'tenant_id',
        'bill_id',
        'booking_token_id',
        'type',
        'amount_cents',
        'reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(BookingToken::class, 'booking_token_id');
    }

    public function getFormattedAmountAttribute(): string
    {
        if ($this->amount_cents > 0) {
            return 'Balance due: Rs. '.number_format($this->amount_cents / 100, 2);
        }

        if ($this->amount_cents < 0) {
            return 'Refund due: Rs. '.number_format(abs($this->amount_cents) / 100, 2);
        }

        return 'Rs. 0.00';
    }
}
