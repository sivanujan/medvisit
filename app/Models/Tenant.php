<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant
{
    use HasDomains, HasFactory, SoftDeletes;

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
        'logo_path',
        'logo_url',
        'logo_png_path',
        'favicon_path',
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
            'logo_path',
            'logo_url',
            'logo_png_path',
            'plan',
            'status',
            'trial_ends_at',
            'trial_ending_reminder_sent_at',
            'trial_ended_reminder_sent_at',
            'fee_settings',
        ];
    }

    /**
     * Get the clinic logo URL.
     */
    public function getLogoUrlAttribute(): ?string
    {
        if (! empty($this->attributes['logo_url'])) {
            return $this->attributes['logo_url'];
        }
        if (! empty($this->attributes['logo_path'])) {
            $disk = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));

            return Storage::disk($disk)->url($this->attributes['logo_path']).'?v='.($this->updated_at?->timestamp ?? time());
        }

        return null;
    }

    /**
     * Get the PNG logo URL for PDFs and emails.
     */
    public function getLogoPngUrlAttribute(): ?string
    {
        if (! empty($this->attributes['logo_png_path'])) {
            $disk = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));

            return Storage::disk($disk)->url($this->attributes['logo_png_path']).'?v='.($this->updated_at?->timestamp ?? time());
        }

        return $this->logo_url;
    }

    /**
     * Get the clinic favicon URL.
     */
    public function getFaviconUrlAttribute(): string
    {
        if (! empty($this->attributes['favicon_path'])) {
            $disk = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));

            return Storage::disk($disk)->url($this->attributes['favicon_path']).'?v='.($this->updated_at?->timestamp ?? time());
        }

        return '/favicon.ico';
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

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class, 'tenant_id')->latestOfMany();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'tenant_id');
    }

    public function subscriptionInvoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class, 'tenant_id');
    }

    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'tenant_id');
    }

    public function billingDetail(): HasOne
    {
        return $this->hasOne(TenantBillingDetail::class, 'tenant_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(ClinicNote::class, 'tenant_id')->latest();
    }

    public function exports(): HasMany
    {
        return $this->hasMany(ClinicDataExport::class, 'tenant_id')->latest();
    }

    public function originatingLead(): HasOne
    {
        return $this->hasOne(Lead::class, 'converted_tenant_id');
    }

    public function planAllows(string $feature): bool
    {
        $sub = $this->subscription;

        return $sub ? $sub->planAllows($feature) : true;
    }

    public function hasActiveSubscription(): bool
    {
        $sub = $this->subscription;

        return $sub ? $sub->isActive() : false;
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
     * Determine if mobile phone verification is required for public bookings (default true).
     */
    public function getRequirePhoneVerificationAttribute(): bool
    {
        $val = $this->getAttributeFromArray('require_phone_verification');
        if ($val === null && isset($this->attributes['data'])) {
            $data = is_array($this->attributes['data']) ? $this->attributes['data'] : json_decode($this->attributes['data'], true);
            $val = $data['require_phone_verification'] ?? null;
        }

        return $val !== null ? (bool) $val : false;
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
