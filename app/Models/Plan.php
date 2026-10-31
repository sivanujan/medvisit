<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price_cents',
        'billing_interval',
        'description',
        'features',
        'limits',
        'is_active',
        'is_public',
    ];

    protected $casts = [
        'price_cents' => 'integer',
        'features' => 'array',
        'limits' => 'array',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function getFormattedPriceAttribute(): string
    {
        return 'Rs. '.number_format($this->price_cents / 100, 2);
    }

    /**
     * Check if this plan permits a specific feature flag.
     */
    public function allowsFeature(string $feature): bool
    {
        $features = $this->features ?? [];

        if (isset($features[$feature])) {
            return (bool) $features[$feature];
        }

        if (in_array($feature, $features, true)) {
            return true;
        }

        $configFeatures = config("plans.tiers.{$this->slug}.features");
        if (isset($configFeatures[$feature])) {
            return (bool) $configFeatures[$feature];
        }

        return false;
    }

    /**
     * Get a numeric resource limit (-1 indicates unlimited).
     */
    public function getLimit(string $limitKey, int $default = 0): int
    {
        $limits = $this->limits ?? [];

        if (isset($limits[$limitKey])) {
            return (int) $limits[$limitKey];
        }

        $configLimits = config("plans.tiers.{$this->slug}.limits");
        if (isset($configLimits[$limitKey])) {
            return (int) $configLimits[$limitKey];
        }

        return $default;
    }

    /**
     * Resolve plan model by slug, syncing from config('plans.tiers') if missing.
     */
    public static function forSlug(string $slug): ?self
    {
        $plan = static::where('slug', $slug)->first();
        if ($plan) {
            return $plan;
        }

        $config = config("plans.tiers.{$slug}") ?? config("medvisit_public.plans.{$slug}");
        if ($config) {
            return static::create([
                'name' => $config['name'] ?? ucfirst($slug),
                'slug' => $slug,
                'price_cents' => (int) ($config['price_cents'] ?? 0),
                'billing_interval' => $config['billing_interval'] ?? 'month',
                'description' => $config['description'] ?? null,
                'limits' => $config['limits'] ?? [],
                'features' => $config['features'] ?? [],
                'is_active' => true,
                'is_public' => (bool) ($config['is_public'] ?? true),
            ]);
        }

        return null;
    }
}
