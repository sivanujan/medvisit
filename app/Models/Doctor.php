<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\TokenHelper;
use App\Support\TvDisplayHelper;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Doctor extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'slug',
        'name',
        'title',
        'specialty',
        'slmc_number',
        'phone',
        'email',
        'photo_url',
        'photo_path',
        'bio',
        'doctor_fee',
        'clinic_fee',
        'use_clinic_default_fees',
        'pricing_mode',
        'custom_doctor_fee',
        'custom_clinic_fee',
        'custom_total_fee',
        'payout_rule',
        'visit_type_overrides',
        'component_overrides',
        'avg_consultation_minutes',
        'token_code',
        'is_active',
    ];

    protected $appends = [
        'clean_slmc',
        'slmc_display',
        'is_demo',
    ];

    /**
     * Determine if this doctor belongs to the demo sandbox.
     */
    public function getIsDemoAttribute(): bool
    {
        return (bool) (
            ($this->tenant_id === config('demo.tenant_id', 'demo'))
            || ($this->relationLoaded('tenant') && $this->tenant?->is_demo)
            || str_starts_with((string) $this->slmc_number, 'DEMO')
        );
    }

    protected static function booted(): void
    {
        static::saving(function (Doctor $doctor) {
            if ($doctor->slmc_number !== null) {
                $doctor->slmc_number = static::stripSlmcPrefix((string) $doctor->slmc_number);
            }

            if (! empty($doctor->token_code)) {
                $doctor->token_code = strtoupper(trim($doctor->token_code));
            } elseif (! empty($doctor->name) && ! empty($doctor->tenant_id)) {
                $doctor->token_code = TokenHelper::generateUniqueCode(
                    tenantId: (string) $doctor->tenant_id,
                    name: (string) $doctor->name,
                    title: $doctor->title ? (string) $doctor->title : null,
                    preferred: null,
                    ignoreDoctorId: $doctor->id ? (int) $doctor->id : null
                );
            }

            if (empty($doctor->slug) && ! empty($doctor->name)) {
                $cleanName = preg_replace('/^(dr\.?|doctor|prof\.?|professor)\s+/i', '', trim($doctor->name));
                $titlePrefix = $doctor->title ? trim($doctor->title).' ' : 'Dr. ';
                $base = Str::slug($titlePrefix.$cleanName);
                $slug = $base;
                $counter = 1;
                while (static::where('tenant_id', $doctor->tenant_id)->where('slug', $slug)->where('id', '!=', $doctor->id ?? 0)->exists()) {
                    $slug = "{$base}-".(++$counter);
                }
                $doctor->slug = $slug;
            }
        });
    }

    /**
     * Clean full doctor title and name without duplicate Dr. prefixes.
     */
    public function getFullTitleAttribute(): string
    {
        $cleanName = preg_replace('/^(dr\.?|doctor|prof\.?|professor)\s+/i', '', trim((string) $this->name));
        $title = $this->title ?: 'Dr.';

        return trim("{$title} {$cleanName}");
    }

    /**
     * Count active future bookings for this doctor.
     */
    public function getFutureBookingsCountAttribute(): int
    {
        $todayColombo = Carbon::today('Asia/Colombo')->toDateString();

        return BookingToken::whereHas('doctorSession', function ($q) use ($todayColombo) {
            $q->where('doctor_id', $this->id)
                ->where('session_date', '>=', $todayColombo)
                ->whereNotIn('status', ['cancelled']);
        })->whereNotIn('status', [BookingToken::STATUS_CANCELLED])->count();
    }

    /**
     * Strip any duplicate 'SLMC', 'SLMC-', 'SLMC: ' prefix from a registration number.
     */
    public static function stripSlmcPrefix(string $slmc): string
    {
        return trim(preg_replace('/^(slmc[-:\s]*)+/i', '', trim($slmc)));
    }

    /**
     * Get the clean SLMC number without any prefix.
     */
    public function getCleanSlmcAttribute(): string
    {
        return static::stripSlmcPrefix((string) ($this->attributes['slmc_number'] ?? ''));
    }

    /**
     * Get the standard formatted SLMC string (e.g. 'SLMC 18429').
     */
    public function getSlmcDisplayAttribute(): string
    {
        $clean = $this->clean_slmc;

        if (str_starts_with(strtoupper($clean), 'DEMO')) {
            return $clean;
        }

        return $clean !== '' ? "SLMC {$clean}" : '';
    }

    protected function casts(): array
    {
        return [
            'doctor_fee' => 'integer',
            'clinic_fee' => 'integer',
            'use_clinic_default_fees' => 'boolean',
            'custom_doctor_fee' => 'integer',
            'custom_clinic_fee' => 'integer',
            'custom_total_fee' => 'integer',
            'payout_rule' => 'array',
            'visit_type_overrides' => 'array',
            'component_overrides' => 'array',
            'avg_consultation_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sessionTemplates(): HasMany
    {
        return $this->hasMany(SessionTemplate::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(DoctorSession::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(DoctorSettlement::class);
    }

    public function leaves(): HasMany
    {
        return $this->hasMany(DoctorLeave::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function prescriptionTemplates(): HasMany
    {
        return $this->hasMany(PrescriptionTemplate::class);
    }

    public function getFormattedFeeAttribute(): string
    {
        $totalCents = $this->doctor_fee + $this->clinic_fee;

        return 'Rs. '.number_format($totalCents / 100, 2);
    }

    /**
     * Deterministic color palette for doctor badges and indicators.
     *
     * @var array<int, string>
     */
    public const PALETTE = [
        '#1E6FD9', // Ocean Blue
        '#0E9E8F', // Teal
        '#FF7A59', // Coral
        '#7C3AED', // Purple
        '#E11D48', // Rose
        '#F59E0B', // Amber
        '#10B981', // Emerald
        '#6366F1', // Indigo
    ];

    /**
     * Get deterministic hex color for a doctor ID.
     */
    public static function getDoctorColor(?int $id): string
    {
        if ($id === null || $id === 0) {
            return self::PALETTE[0];
        }

        $index = abs($id) % count(self::PALETTE);

        return self::PALETTE[$index];
    }

    /**
     * Get properly formatted doctor display name without duplicate titles.
     */
    public function getDisplayNameAttribute(): string
    {
        return TvDisplayHelper::formatDoctorName($this->name, $this->title);
    }

    /**
     * Get the doctor's deterministic color.
     */
    public function getColorAttribute(): string
    {
        return static::getDoctorColor($this->id);
    }

    /**
     * Get the doctor's photo URL.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        if (! empty($this->attributes['photo_url'])) {
            return $this->attributes['photo_url'];
        }
        if (! empty($this->attributes['photo_path'])) {
            $disk = config('filesystems.media_disk', env('MEDIA_DISK', 'public'));

            return Storage::disk($disk)->url($this->attributes['photo_path']).'?v='.($this->updated_at?->timestamp ?? time());
        }

        return null;
    }
}
