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
     * Excludes doctors whose parent directory listing or tenant is inactive.
     *
     * @param  Builder<DirectoryDoctor>  $query
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->whereHas('listing', function (Builder $l) {
                $l->active();
            });
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
     * The linked tenant doctor record if available.
     *
     * @return BelongsTo<Doctor, $this>
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    /**
     * Full doctor title and name without duplicate Dr. prefix.
     */
    public function getFullTitleAttribute(): string
    {
        $cleanName = preg_replace('/^(dr\.?|doctor|prof\.?|professor)\s+/i', '', trim((string) $this->name));
        $title = $this->title ?: 'Dr.';

        return trim("{$title} {$cleanName}");
    }

    /**
     * Direct booking URL on the clinic's subdomain.
     */
    public function getBookingUrlAttribute(): string
    {
        $subdomainUrl = $this->listing?->subdomain_url ?? '';
        $slug = $this->doctor?->slug ?? $this->slug;

        return rtrim($subdomainUrl, '/')."/book/{$slug}?source=directory";
    }
}
