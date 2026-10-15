<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Doctor extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'name',
        'title',
        'specialty',
        'slmc_number',
        'phone',
        'email',
        'photo_url',
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

    public function getFormattedFeeAttribute(): string
    {
        $totalCents = $this->doctor_fee + $this->clinic_fee;

        return 'Rs. '.number_format($totalCents / 100, 2);
    }
}
