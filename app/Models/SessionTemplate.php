<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class SessionTemplate extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'title',
        'day_of_week',
        'start_time',
        'end_time',
        'max_patients',
        'mode',
        'room_number',
        'doctor_fee',
        'clinic_fee',
        'fee_override_type',
        'custom_doctor_fee',
        'custom_clinic_fee',
        'custom_total_fee',
        'payout_rule_override',
        'component_overrides',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'max_patients' => 'integer',
            'doctor_fee' => 'integer',
            'clinic_fee' => 'integer',
            'custom_doctor_fee' => 'integer',
            'custom_clinic_fee' => 'integer',
            'custom_total_fee' => 'integer',
            'payout_rule_override' => 'array',
            'component_overrides' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(DoctorSession::class);
    }

    /**
     * Check if doctor already has an active overlapping template on the given day.
     */
    public static function findDoctorOverlap(
        string $tenantId,
        int $doctorId,
        int $dayOfWeek,
        string $startTime,
        string $endTime,
        ?int $excludeId = null
    ): ?self {
        return static::where('tenant_id', $tenantId)
            ->where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->first();
    }

    /**
     * Check if room is already booked by another doctor on the given day at an overlapping time.
     */
    public static function findRoomConflict(
        string $tenantId,
        ?string $roomNumber,
        int $dayOfWeek,
        string $startTime,
        string $endTime,
        ?int $excludeId = null
    ): ?self {
        if (empty($roomNumber)) {
            return null;
        }

        return static::with('doctor')
            ->where('tenant_id', $tenantId)
            ->where('room_number', $roomNumber)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->first();
    }
}
