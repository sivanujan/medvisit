<?php

namespace App\Models;

use App\Services\PlatformSettingsService;
use App\Support\SiteKit;
use App\Support\TokenHelper;
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
        'is_demo',
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
        'token_number_format',
        'tv_name_display_mode',
        'online_booking_enabled',
        'require_phone_verification',
        'phone_verification_methods',
        'logo_path',
        'logo_url',
        'logo_png_path',
        'favicon_path',
        'setup_completed_at',
        'setup_step',
        'setup_version',
        'setup_grace_until',
        'setup_reminder_sent_at',
        'applied_template_id',
        'applied_template_version',
        'previous_template_snapshot',
        'free_template_changed_at',
        'advanced_free_template_override',
        'data',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'trial_ending_reminder_sent_at' => 'datetime',
        'trial_ended_reminder_sent_at' => 'datetime',
        'fee_settings' => 'array',
        'is_demo' => 'boolean',
        'online_booking_enabled' => 'boolean',
        'require_phone_verification' => 'boolean',
        'setup_completed_at' => 'datetime',
        'setup_step' => 'integer',
        'setup_version' => 'integer',
        'setup_grace_until' => 'datetime',
        'setup_reminder_sent_at' => 'datetime',
        'previous_template_snapshot' => 'array',
        'free_template_changed_at' => 'datetime',
        'advanced_free_template_override' => 'integer',
    ];

    protected static function booted(): void
    {
        parent::booted();

        static::forceDeleted(function (Tenant $tenant) {
            $subdomain = strtolower((string) ($tenant->subdomain ?? $tenant->id));
            if ($subdomain !== '') {
                $holdDays = (int) config('reserved_subdomains.hold_days', 90);
                ReservedSubdomain::updateOrCreate(
                    ['subdomain' => $subdomain],
                    [
                        'reason' => 'released_clinic',
                        'notes' => "Held after permanent deletion of clinic '{$tenant->name}' ({$tenant->id})",
                        'held_until' => now()->addDays($holdDays),
                        'original_tenant_id' => (string) $tenant->id,
                    ]
                );
            }
        });
    }

    public static function getCustomColumns(): array
    {
        return [
            'id',
            'is_demo',
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
            'setup_completed_at',
            'setup_step',
            'setup_version',
            'setup_grace_until',
            'setup_reminder_sent_at',
            'applied_template_id',
            'applied_template_version',
            'previous_template_snapshot',
            'free_template_changed_at',
            'advanced_free_template_override',
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
     * Safely resolve phone verification methods as an array without recursive encoding.
     */
    public function getPhoneVerificationMethodsAttribute($value): array
    {
        while (is_string($value)) {
            $decoded = json_decode($value, true);
            if ($decoded !== null && $decoded !== $value) {
                $value = $decoded;
            } else {
                break;
            }
        }

        return is_array($value) ? array_values($value) : ['whatsapp', 'textlk'];
    }

    /**
     * Safely store phone verification methods without recursive encoding.
     */
    public function setPhoneVerificationMethodsAttribute($value): void
    {
        while (is_string($value)) {
            $decoded = json_decode($value, true);
            if ($decoded !== null && $decoded !== $value) {
                $value = $decoded;
            } else {
                break;
            }
        }

        $this->attributes['phone_verification_methods'] = is_array($value) ? array_values($value) : ['whatsapp', 'textlk'];
    }

    /**
     * Get the configured token number display format for this clinic.
     * Defaults to 'with_doctor_code' if the clinic has 2+ active doctors.
     */
    public function getTokenNumberFormat(): string
    {
        $custom = $this->token_number_format;
        if (! empty($custom) && in_array($custom, ['with_doctor_code', 'number_only'], true)) {
            return $custom;
        }

        $activeDoctorsCount = Doctor::where('tenant_id', $this->id)->where('is_active', true)->count();

        return $activeDoctorsCount >= 2 ? 'with_doctor_code' : 'number_only';
    }

    /**
     * Check if this clinic has overlapping sessions across different doctors today or upcoming.
     */
    public function hasOverlappingDoctorSessions(?string $date = null): bool
    {
        return TokenHelper::hasOverlappingDoctorSessions((string) $this->id, $date);
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
        return $this->hasOne(Subscription::class, 'tenant_id')->withoutGlobalScopes()->latestOfMany();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'tenant_id');
    }

    public function subscriptionInvoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class, 'tenant_id');
    }

    public function promoRedemptions(): HasMany
    {
        return $this->hasMany(PromoCodeRedemption::class, 'tenant_id');
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
        if ((bool) $this->is_demo) {
            return true;
        }

        $sub = $this->subscription;

        return $sub ? $sub->isActive() : false;
    }

    public function getOpeningHoursAttribute(): ?string
    {
        if (! empty($this->attributes['opening_hours'])) {
            return (string) $this->attributes['opening_hours'];
        }

        $footer = $this->website_footer;
        if (is_array($footer) && ! empty($footer['opening_hours'])) {
            return (string) $footer['opening_hours'];
        }

        return 'Mon – Sat: 08:00 AM – 08:00 PM | Sun: 08:00 AM – 02:00 PM';
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
     * Check if the clinic has completed initial setup.
     */
    public function needsSetup(): bool
    {
        return is_null($this->setup_completed_at);
    }

    /**
     * Determine if the clinic is currently within its 7-day setup grace period.
     */
    public function inSetupGrace(): bool
    {
        return $this->needsSetup()
            && $this->setup_grace_until !== null
            && $this->setup_grace_until->isFuture();
    }

    /**
     * Days remaining in setup grace period.
     */
    public function setupGraceDaysRemaining(): int
    {
        if (! $this->inSetupGrace() || ! $this->setup_grace_until) {
            return 0;
        }

        return max(1, (int) ceil(now()->diffInHours($this->setup_grace_until, false) / 24));
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
     * Waiting room TV patient name masking mode ('token_only', 'full_name', 'first_only', 'initial_last').
     */
    public function getTvNameDisplayModeAttribute(): string
    {
        $val = $this->getAttributeFromArray('tv_name_display_mode');
        if ($val === null && isset($this->attributes['data'])) {
            $data = is_array($this->attributes['data']) ? $this->attributes['data'] : json_decode((string) $this->attributes['data'], true);
            $val = $data['tv_name_display_mode'] ?? null;
        }

        return (string) ($val ?? 'token_only');
    }

    public function setTvNameDisplayModeAttribute($value): void
    {
        $data = $this->data ?? [];
        if (is_string($data)) {
            $data = json_decode($data, true) ?: [];
        }
        $data['tv_name_display_mode'] = (string) $value;
        $this->attributes['data'] = json_encode($data);
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

    /**
     * Currently applied website template.
     *
     * @return BelongsTo<WebsiteTemplate, $this>
     */
    public function appliedTemplate(): BelongsTo
    {
        return $this->belongsTo(WebsiteTemplate::class, 'applied_template_id');
    }

    /**
     * Template purchases / entitlements.
     *
     * @return HasMany<TemplatePurchase, $this>
     */
    public function templatePurchases(): HasMany
    {
        return $this->hasMany(TemplatePurchase::class, 'tenant_id');
    }

    /**
     * Check if this tenant is entitled to use/publish a given template.
     */
    public function isTemplateEntitled(WebsiteTemplate $template): bool
    {
        if ($template->tier === WebsiteTemplate::TIER_FREE || $template->price_cents === 0) {
            return true;
        }

        // Demo tenant evaluates templates freely
        if ((bool) $this->is_demo) {
            return true;
        }

        return $this->templatePurchases()
            ->where('template_id', $template->id)
            ->where('status', TemplatePurchase::STATUS_PAID)
            ->exists();
    }

    /**
     * Free templates allowed for this clinic based on plan and overrides.
     */
    public function getFreeTemplatesLimit(): int
    {
        if ($this->advanced_free_template_override !== null) {
            return max(0, (int) $this->advanced_free_template_override);
        }

        $planSlug = strtolower((string) ($this->plan ?? ''));
        if ($planSlug === 'advanced') {
            $settings = app(PlatformSettingsService::class)->all();

            return (int) ($settings['templates.free_templates_included_with_advanced'] ?? 1);
        }

        return 0;
    }
}
