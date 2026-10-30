<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReservedSubdomain extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'subdomain',
        'reason',
        'notes',
        'held_until',
        'original_tenant_id',
        'created_by_user_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'held_until' => 'datetime',
        ];
    }

    /**
     * Super admin who registered this reserved subdomain.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Scope to active reservations (indefinite OR held_until in future).
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->whereNull('held_until')
                ->orWhere('held_until', '>', now());
        });
    }

    /**
     * Whether this reservation is still active.
     */
    public function isActive(): bool
    {
        return $this->held_until === null || $this->held_until->isFuture();
    }
}
