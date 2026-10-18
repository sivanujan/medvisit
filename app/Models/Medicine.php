<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Medicine extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_APPROVED = 'approved';

    public const STATUS_PENDING = 'pending';

    public const STATUS_REJECTED = 'rejected';

    public const SOURCE_RXTERMS = 'rxterms';

    public const SOURCE_ADMIN = 'admin';

    public const SOURCE_CLINIC = 'clinic';

    protected $fillable = [
        'generic_name',
        'normalized_name',
        'route',
        'synonyms',
        'is_combination',
        'rxterms_sxdg_rxcui',
        'source',
        'status',
        'created_by_tenant_id',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_combination' => 'boolean',
            'synonyms' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $model) {
            if ($model->generic_name) {
                $model->normalized_name = strtolower(trim($model->generic_name));
            }
        });
    }

    public function components(): HasMany
    {
        return $this->hasMany(MedicineComponent::class)->orderBy('position');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(MedicineVariant::class);
    }

    public function createdByTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'created_by_tenant_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
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
