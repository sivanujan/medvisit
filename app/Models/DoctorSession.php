<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class DoctorSession extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'session_template_id',
        'session_date',
        'start_time',
        'end_time',
        'max_tokens',
        'mode',
        'status',
        'room_number',
        'doctor_fee',
        'clinic_fee',
        'fee_override_type',
        'custom_doctor_fee',
        'custom_clinic_fee',
        'custom_total_fee',
        'payout_rule_override',
        'component_overrides',
        'current_token_number',
        'notes',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'max_tokens' => 'integer',
            'current_token_number' => 'integer',
            'doctor_fee' => 'integer',
            'clinic_fee' => 'integer',
            'custom_doctor_fee' => 'integer',
            'custom_clinic_fee' => 'integer',
            'custom_total_fee' => 'integer',
            'payout_rule_override' => 'array',
            'component_overrides' => 'array',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SessionTemplate::class, 'session_template_id');
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(DoctorSettlement::class);
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(BookingToken::class)->orderBy('token_number');
    }

    public function activeTokens(): HasMany
    {
        return $this->hasMany(BookingToken::class)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('token_number');
    }

    /**
     * Compute estimated consultation time for a given token number.
     * Formula: session_start + (token - 1) * avg_consultation_minutes.
     */
    public function calculateEstimatedTime(int $tokenNumber): Carbon
    {
        $avgMinutes = $this->doctor?->avg_consultation_minutes ?? 10;
        $sessionStart = Carbon::parse($this->session_date->format('Y-m-d').' '.$this->start_time);

        $offsetMinutes = max(0, ($tokenNumber - 1) * $avgMinutes);

        return $sessionStart->copy()->addMinutes($offsetMinutes);
    }

    public function getBookedTokensCountAttribute(): int
    {
        return $this->tokens()->whereNotIn('status', ['cancelled'])->count();
    }

    public function getAvailableTokensCountAttribute(): int
    {
        return max(0, $this->max_tokens - $this->booked_tokens_count);
    }

    public function getIsFullAttribute(): bool
    {
        return $this->available_tokens_count <= 0;
    }
}
