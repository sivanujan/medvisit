<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class ClinicMedicine extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'medicine_variant_id',
        'medicine_brand_id',
        'display_name',
        'base_unit',
        'selling_price_cents',
        'reorder_level',
        'shelf_location',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'selling_price_cents' => 'integer',
            'reorder_level' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(MedicineVariant::class, 'medicine_variant_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(MedicineBrand::class, 'medicine_brand_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function getTotalQuantityAttribute(): int
    {
        return (int) $this->batches()->sum('quantity_remaining');
    }

    public function getNearestExpiryAttribute(): ?string
    {
        return $this->batches()
            ->where('quantity_remaining', '>', 0)
            ->whereNotNull('expiry_date')
            ->orderBy('expiry_date')
            ->value('expiry_date');
    }
}
