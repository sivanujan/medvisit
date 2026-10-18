<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicineBarcode extends Model
{
    use HasFactory;

    public const STATUS_APPROVED = 'approved';

    public const STATUS_PENDING = 'pending';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'barcode',
        'medicine_brand_id',
        'pack_size',
        'status',
        'created_by_tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'pack_size' => 'integer',
        ];
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(MedicineBrand::class, 'medicine_brand_id');
    }

    public function createdByTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'created_by_tenant_id');
    }

    /**
     * Scope: Visible to tenant (approved rows + its OWN pending AND rejected rows).
     */
    public function scopeVisibleToTenant(Builder $query, ?string $tenantId): Builder
    {
        if (empty($tenantId)) {
            return $query->where('status', self::STATUS_APPROVED);
        }

        return $query->where(function (Builder $q) use ($tenantId) {
            $q->where('status', self::STATUS_APPROVED)
                ->orWhere(function (Builder $sub) use ($tenantId) {
                    $sub->where('created_by_tenant_id', $tenantId);
                });
        });
    }
}
