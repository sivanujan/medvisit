<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlatformIncident extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'started_at',
        'ended_at',
        'affects_all_tenants',
        'tenant_ids',
        'is_planned_maintenance',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'affects_all_tenants' => 'boolean',
        'tenant_ids' => 'array',
        'is_planned_maintenance' => 'boolean',
    ];

    /**
     * Check if this incident affected a specific tenant.
     */
    public function affectsTenant(string $tenantId): bool
    {
        if ($this->affects_all_tenants) {
            return true;
        }

        return is_array($this->tenant_ids) && in_array($tenantId, $this->tenant_ids, true);
    }

    /**
     * Scope query to incidents that have ended / resolved.
     */
    public function scopeResolved($query)
    {
        return $query->whereNotNull('ended_at');
    }

    /**
     * Alias for ended_at to match UI conventions.
     */
    public function getResolvedAtAttribute(): ?Carbon
    {
        return $this->ended_at;
    }

    /**
     * Calculate continuous downtime minutes.
     */
    public function getDurationMinutesAttribute(): int
    {
        if (! $this->started_at) {
            return 0;
        }

        $end = $this->ended_at ?? now();

        return (int) $this->started_at->diffInMinutes($end);
    }

    /**
     * Calculate continuous downtime hours.
     */
    public function getDurationHoursAttribute(): float
    {
        if (! $this->started_at) {
            return 0.0;
        }

        $end = $this->ended_at ?? now();

        return round((float) $this->started_at->diffInMinutes($end) / 60, 2);
    }
}
