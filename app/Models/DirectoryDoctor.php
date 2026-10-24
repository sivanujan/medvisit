<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DirectoryDoctor extends Model
{
    use HasFactory;

    protected $fillable = [
        'directory_listing_id',
        'tenant_id',
        'doctor_id',
        'name',
        'title',
        'specialty',
        'slug',
        'photo_url',
        'min_fee_cents',
        'session_schedules',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'min_fee_cents' => 'integer',
            'session_schedules' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The parent clinic directory listing.
     *
     * @return BelongsTo<DirectoryListing, $this>
     */
    public function listing(): BelongsTo
    {
        return $this->belongsTo(DirectoryListing::class, 'directory_listing_id');
    }

    /**
     * Scope for active directory doctors.
     *
     * @param  Builder<DirectoryDoctor>  $query
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Formatted fee string.
     */
    public function getFormattedFeeAttribute(): ?string
    {
        if ($this->min_fee_cents === null || $this->min_fee_cents <= 0) {
            return null;
        }

        return 'Rs. '.number_format($this->min_fee_cents / 100, 0);
    }

    /**
     * Full doctor title and name.
     */
    public function getFullTitleAttribute(): string
    {
        return trim(($this->title ? $this->title.' ' : 'Dr. ').$this->name);
    }

    /**
     * Direct booking URL on the clinic's subdomain.
     */
    public function getBookingUrlAttribute(): string
    {
        $subdomainUrl = $this->listing?->subdomain_url ?? '';

        return rtrim($subdomainUrl, '/')."/book/{$this->slug}?source=directory";
    }
}
