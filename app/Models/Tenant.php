<?php

namespace App\Models;

use App\Support\SiteKit;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        'address_line',
        'city',
        'district',
        'postal_code',
        'legacy_address',
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
        'data',
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
            'address_line',
            'city',
            'district',
            'postal_code',
            'legacy_address',
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
     * Formatted clinic address from structured parts, with fallback to raw/legacy address.
     */
    public function getFormattedAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address_line,
            $this->city,
            $this->district,
            $this->postal_code,
        ]);

        if (! empty($parts)) {
            return implode(', ', $parts);
        }

        return (string) ($this->address ?: $this->legacy_address ?: '');
    }

    /**
     * Public clinic identity shown on the signed-out auth pages (login, password reset).
     * Contains no patient, queue or session data.
     *
     * @return array{name: string, subdomain: string, logo_url: ?string, phone: string, address: string, city: string, brand_color: ?string, public_domain: string}
     */
    public function authBranding(): array
    {
        $address = trim((string) ($this->formatted_address ?: $this->address ?: ''));
        // If city column is set, use it; otherwise fallback to the last address segment.
        $parts = array_values(array_filter(
            array_map('trim', explode(',', $address)),
            fn (string $part) => $part !== '' && strcasecmp($part, 'Sri Lanka') !== 0,
        ));
        $city = $this->city ?: ($parts ? trim((string) preg_replace('/\b\d{4,6}\b/', '', end($parts))) : '');

        return [
            'name' => (string) ($this->name ?? 'Clinic'),
            'subdomain' => (string) ($this->subdomain ?? $this->id),
            'logo_url' => $this->logo_url,
            'phone' => (string) ($this->phone ?? ''),
            // Title case for display only; the stored address is untouched.
            'address' => self::displayCase($address),
            'city' => self::displayCase($city),
            'brand_color' => $this->brandColor(),
            'public_domain' => (string) config('medvisit.public_domain', 'medvisit.lk'),
        ];
    }

    /**
     * The clinic's own brand colour, or null when it never chose one: the primary colour
     * of a saved website kit, else of an explicitly chosen website theme.
     */
    public function brandColor(): ?string
    {
        $kit = $this->website_kit;
        $color = null;
        if (is_array($kit) && ! empty($kit['colors'])) {
            $primary = collect($kit['colors'])->firstWhere('id', 'primary');
            $color = is_array($primary) ? ($primary['value'] ?? null) : null;
        } elseif (! empty($this->website_theme)) {
            $color = SiteKit::THEME_COLORS[$this->website_theme]['primary'] ?? null;
        }

        return is_string($color) && preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? strtoupper($color) : null;
    }

    private static function displayCase(string $value): string
    {
        return $value === '' ? '' : Str::title(Str::lower($value));
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

            if (! Storage::disk($disk)->exists($this->attributes['logo_path'])) {
                return null;
            }

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

            if (! Storage::disk($disk)->exists($this->attributes['logo_png_path'])) {
                return $this->logo_url;
            }

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
        $cleanPath = ltrim($path, '/');
        $pathString = $cleanPath !== '' ? "/{$cleanPath}" : '';

        return "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}{$pathString}";
    }

    /**
     * Get the clean display name of the clinic's current subscription plan.
     */
    public function currentPlanDisplayName(): string
    {
        $sub = $this->subscription;
        if ($sub && $sub->plan && ! empty($sub->plan->name)) {
            if ($sub->plan->slug === 'medvisit-standard') {
                return 'Standard';
            }

            return $sub->plan->name;
        }

        $raw = (string) ($this->plan ?? 'pro');
        if ($raw === 'medvisit-standard' || $raw === 'standard') {
            return 'Standard';
        }

        $plansConfig = config('plans.plans', []);
        $slug = strtolower($raw);
        if (isset($plansConfig[$slug]['name'])) {
            return $plansConfig[$slug]['name'];
        }

        return Str::title(str_replace(['-', '_'], ' ', $raw));
    }

    /**
     * Get a setting from the tenant data store.
     */
    public function getSetting(string $key, mixed $default = null): mixed
    {
        $data = $this->data ?? [];
        if (is_string($data)) {
            $data = json_decode($data, true) ?? [];
        }

        return $data[$key] ?? $default;
    }

    /**
     * Set a setting in the tenant data store.
     */
    public function setSetting(string $key, mixed $value): void
    {
        $data = $this->data ?? [];
        if (is_string($data)) {
            $data = json_decode($data, true) ?? [];
        }

        $data[$key] = $value;
        $this->data = $data;
        $this->save();
    }
}
