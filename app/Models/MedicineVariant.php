<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MedicineVariant extends Model
{
    use HasFactory;

    public const STATUS_APPROVED = 'approved';

    public const STATUS_PENDING = 'pending';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'medicine_id',
        'strength_text',
        'strength_value',
        'strength_unit',
        'dosage_form',
        'form_detail',
        'rxcui',
        'source',
        'status',
        'created_by_tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'strength_value' => 'decimal:3',
        ];
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function brands(): HasMany
    {
        return $this->hasMany(MedicineBrand::class);
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

    /**
     * Get a readable representation e.g. "500 mg Tablet (Extended Release)".
     */
    public function getDisplayNameAttribute(): string
    {
        $parts = [$this->strength_text, $this->dosage_form];
        if (! empty($this->form_detail)) {
            $parts[] = "({$this->form_detail})";
        }

        return implode(' ', array_filter($parts));
    }
}
