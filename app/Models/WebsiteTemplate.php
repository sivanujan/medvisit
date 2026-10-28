<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WebsiteTemplate extends Model
{
    use HasFactory;

    public const TIER_FREE = 'free';

    public const TIER_PREMIUM = 'premium';

    protected $fillable = [
        'slug',
        'name',
        'tagline',
        'description',
        'tier',
        'price_cents',
        'is_active',
        'version',
        'changelog',
        'preview_images',
        'preview_video_url',
        'tags',
        'supports',
        'definition',
        'min_app_version',
        'sort_order',
    ];

    protected $casts = [
        'price_cents' => 'integer',
        'is_active' => 'boolean',
        'changelog' => 'array',
        'preview_images' => 'array',
        'tags' => 'array',
        'supports' => 'array',
        'definition' => 'array',
        'sort_order' => 'integer',
    ];

    /**
     * Scope for active templates.
     *
     * @param  Builder<WebsiteTemplate>  $query
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Purchases of this template.
     *
     * @return HasMany<TemplatePurchase, $this>
     */
    public function purchases(): HasMany
    {
        return $this->hasMany(TemplatePurchase::class, 'template_id');
    }

    /**
     * Formatted price in LKR.
     */
    public function getFormattedPriceAttribute(): string
    {
        if ($this->tier === self::TIER_FREE || $this->price_cents === 0) {
            return 'Free';
        }

        return 'Rs. '.number_format($this->price_cents / 100, 0);
    }

    /**
     * Is this a premium paid template?
     */
    public function isPremium(): bool
    {
        return $this->tier === self::TIER_PREMIUM && $this->price_cents > 0;
    }
}
