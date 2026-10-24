<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class PayoutSettlementItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'payout_settlement_items';

    protected $fillable = [
        'tenant_id',
        'doctor_settlement_id',
        'bill_id',
        'consultation_fee_cents',
        'doctor_share_cents',
        'clinic_share_cents',
    ];

    protected function casts(): array
    {
        return [
            'consultation_fee_cents' => 'integer',
            'doctor_share_cents' => 'integer',
            'clinic_share_cents' => 'integer',
        ];
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(DoctorSettlement::class, 'doctor_settlement_id');
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class, 'bill_id');
    }
}
