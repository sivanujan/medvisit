<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class BillItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'bill_id',
        'prescription_item_id',
        'clinic_medicine_id',
        'description',
        'quantity',
        'unit_price_cents',
        'total_price_cents',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price_cents' => 'integer',
            'total_price_cents' => 'integer',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function prescriptionItem(): BelongsTo
    {
        return $this->belongsTo(PrescriptionItem::class);
    }

    public function clinicMedicine(): BelongsTo
    {
        return $this->belongsTo(ClinicMedicine::class);
    }

    public function getFormattedUnitPriceAttribute(): string
    {
        return 'Rs. '.number_format($this->unit_price_cents / 100, 2);
    }

    public function getFormattedTotalPriceAttribute(): string
    {
        return 'Rs. '.number_format($this->total_price_cents / 100, 2);
    }
}
