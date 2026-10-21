<?php

declare(strict_types=1);

namespace App\Models;

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
        'is_active',
    ];

    protected static function booted(): void
    {
        static::saving(function (Doctor $doctor) {
            if (empty($doctor->slug) && ! empty($doctor->name)) {
                $base = Str::slug(($doctor->title ? $doctor->title.' ' : '').$doctor->name);
                $slug = $base;
                $counter = 1;
                while (static::where('tenant_id', $doctor->tenant_id)->where('slug', $slug)->where('id', '!=', $doctor->id ?? 0)->exists()) {
                    $slug = "{$base}-".(++$counter);
                }
                $doctor->slug = $slug;
            }
        });
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
