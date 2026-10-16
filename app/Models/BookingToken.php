<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class BookingToken extends Model
{
    use BelongsToTenant, HasFactory;

    // Status lifecycle constants
    public const STATUS_BOOKED = 'booked';

    public const STATUS_CHECKED_IN = 'checked_in';

    public const STATUS_CALLED = 'called';

    public const STATUS_IN_CONSULTATION = 'in_consultation';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_NO_SHOW = 'no_show';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'doctor_session_id',
        'patient_id',
        'token_number',
        'estimated_time',
        'status',
        'booked_via',
        'checked_in_at',
        'called_at',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'signed_cancel_token',
        'notes',
        'visit_type_id',
        'fee_snapshot',
        'payout_status',
        'doctor_settlement_id',
    ];

    protected function casts(): array
    {
        return [
            'token_number' => 'integer',
            'estimated_time' => 'datetime',
            'checked_in_at' => 'datetime',
            'called_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'fee_snapshot' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DoctorSession::class, 'doctor_session_id');
    }

    public function doctorSession(): BelongsTo
    {
        return $this->belongsTo(DoctorSession::class, 'doctor_session_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visitType(): BelongsTo
    {
        return $this->belongsTo(VisitType::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(DoctorSettlement::class, 'doctor_settlement_id');
    }

    public function bill(): HasOne
    {
        return $this->hasOne(Bill::class);
    }
}
