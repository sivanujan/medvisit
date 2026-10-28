<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class SettlementAdjustment extends Model
{
    use BelongsToTenant, HasFactory;

    public const TYPE_REFUND = 'refund';

    public const TYPE_BONUS = 'bonus';

    public const TYPE_DEDUCTION = 'deduction';

    public const TYPE_CREDIT = 'credit';

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'doctor_settlement_id',
        'bill_id',
        'type',
        'amount_cents',
        'reason',
        'applied_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'applied_at' => 'datetime',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(DoctorSettlement::class, 'doctor_settlement_id');
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
