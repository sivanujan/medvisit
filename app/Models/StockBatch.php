<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class StockBatch extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'clinic_medicine_id',
        'batch_number',
        'expiry_date',
        'quantity_received',
        'quantity_remaining',
        'cost_price_cents',
        'supplier_id',
        'stock_receipt_id',
        'received_at',
        'voided_at',
        'voided_by',
        'void_reason',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
            'quantity_received' => 'integer',
            'quantity_remaining' => 'integer',
            'cost_price_cents' => 'integer',
            'received_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function scopeActive($query)
    {
        return $query->whereNull('voided_at');
    }

    public function scopeVoided($query)
    {
        return $query->whereNotNull('voided_at');
    }

    public function clinicMedicine(): BelongsTo
    {
        return $this->belongsTo(ClinicMedicine::class);
    }

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(StockReceipt::class, 'stock_receipt_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function voidedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
