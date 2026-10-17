<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant
{
    use HasDomains, HasFactory;

    protected $fillable = [
        'id',
        'name',
        'subdomain',
        'phone',
        'address',
        'plan',
        'status',
        'trial_ends_at',
        'trial_ending_reminder_sent_at',
        'trial_ended_reminder_sent_at',
        'fee_settings',
        'require_phone_verification',
        'phone_verification_methods',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'trial_ending_reminder_sent_at' => 'datetime',
        'trial_ended_reminder_sent_at' => 'datetime',
        'fee_settings' => 'array',
        'require_phone_verification' => 'boolean',
        'phone_verification_methods' => 'array',
    ];

    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'subdomain',
            'phone',
            'address',
            'plan',
            'status',
            'trial_ends_at',
            'trial_ending_reminder_sent_at',
            'trial_ended_reminder_sent_at',
            'fee_settings',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(ClinicPage::class, 'tenant_id');
    }

    public function mediaAssets(): HasMany
    {
        return $this->hasMany(ClinicMediaAsset::class, 'tenant_id');
    }

    public function visitTypes(): HasMany
    {
        return $this->hasMany(VisitType::class, 'tenant_id');
    }

    public function feeComponents(): HasMany
    {
        return $this->hasMany(FeeComponent::class, 'tenant_id');
    }

    public function doctorSettlements(): HasMany
    {
        return $this->hasMany(DoctorSettlement::class, 'tenant_id');
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isTrialExpired(): bool
    {
        return $this->status === 'trial'
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isPast();
    }

    public function isUsable(): bool
    {
        return ! $this->isSuspended() && ! $this->isTrialExpired();
    }

    /**
     * Build an absolute URL scoped to this tenant's subdomain.
     */
    public function url(string $path = ''): string
    {
        return static::urlForSubdomain((string) $this->subdomain, $path);
    }

    /**
     * Build an absolute URL scoped to any given subdomain.
     */
    public static function urlForSubdomain(string $subdomain, string $path = ''): string
    {
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $appUrl = config('app.url', 'http://medvisit.localhost:8000');
        $scheme = parse_url((string) $appUrl, PHP_URL_SCHEME) ?: 'http';
        $port = parse_url((string) $appUrl, PHP_URL_PORT);
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';
        $path = ltrim($path, '/');
        $pathString = $path !== '' ? "/{$path}" : '';

        return "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}{$pathString}";
    }
}
