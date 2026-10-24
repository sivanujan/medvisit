<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DirectoryListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'clinic_name',
        'slug',
        'district',
        'city',
        'address',
        'latitude',
        'longitude',
        'phone',
        'whatsapp',
        'logo_url',
        'description',
        'services',
        'online_booking_enabled',
        'is_active',
        'consented_at',
        'consented_by_user_id',
        'doctor_count',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'services' => 'array',
            'online_booking_enabled' => 'boolean',
            'is_active' => 'boolean',
            'consented_at' => 'datetime',
            'doctor_count' => 'integer',
        ];
    }

    /**
     * Doctors associated with this clinic directory listing.
     *
     * @return HasMany<DirectoryDoctor, $this>
     */
    public function doctors(): HasMany
    {
        return $this->hasMany(DirectoryDoctor::class);
    }

    /**
     * Public active doctors.
     *
     * @return HasMany<DirectoryDoctor, $this>
     */
    public function activeDoctors(): HasMany
    {
        return $this->hasMany(DirectoryDoctor::class)->where('is_active', true);
    }

    /**
     * Scope for active directory listings.
     *
     * @param  Builder<DirectoryListing>  $query
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Resolve the subdomain booking URL.
     */
    public function getSubdomainUrlAttribute(): string
    {
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $scheme = app()->environment('local', 'testing') ? 'http' : 'https';
        $port = request()->getPort();
        $portStr = ($port && ! in_array($port, [80, 443], true)) ? ":{$port}" : '';

        return "{$scheme}://{$this->slug}.{$baseDomain}{$portStr}";
    }
}
