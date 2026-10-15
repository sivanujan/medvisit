<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class DoctorSettlement extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_UNPAID = 'unpaid';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_PAID = 'paid';

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'doctor_session_id',
        'settlement_number',
        'period_start',
        'period_end',
        'sessions_count',
        'patients_seen',
        'no_shows_count',
        'gross_collected',
        'doctor_payout_amount',
        'clinic_amount',
        'paid_amount',
        'payment_status',
        'payment_method',
        'payment_reference',
        'paid_at',
        'notes',
        'created_by',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'sessions_count' => 'integer',
            'patients_seen' => 'integer',
            'no_shows_count' => 'integer',
            'gross_collected' => 'integer',
            'doctor_payout_amount' => 'integer',
            'clinic_amount' => 'integer',
            'paid_amount' => 'integer',
            'paid_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DoctorSession::class, 'doctor_session_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(BookingToken::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    public function getBalanceDueAttribute(): int
    {
        return max(0, $this->doctor_payout_amount - $this->paid_amount);
    }
}
