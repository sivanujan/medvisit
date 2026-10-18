<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Prescription extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_FINALIZED = 'finalized';

    public const STATUS_PARTIALLY_DISPENSED = 'partially_dispensed';

    public const STATUS_DISPENSED = 'dispensed';

    public const STATUS_CANCELLED = 'cancelled';

    public const MODE_DISPENSE = 'dispense';

    public const MODE_FINALIZE = 'finalize';

    protected $fillable = [
        'tenant_id',
        'prescription_number',
        'booking_token_id',
        'patient_id',
        'doctor_id',
        'status',
        'stock_reduction_mode',
        'chief_complaint',
        'diagnosis',
        'clinical_notes',
        'follow_up_date',
        'addendum_notes',
        'cancellation_reason',
        'finalized_at',
        'dispensed_at',
        'cancelled_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'follow_up_date' => 'date',
            'finalized_at' => 'datetime',
            'dispensed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(BookingToken::class, 'booking_token_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class)->orderBy('sort_order');
    }

    public function diagnosisTags(): BelongsToMany
    {
        return $this->belongsToMany(DiagnosisTag::class, 'prescription_diagnosis_tag');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isFinalized(): bool
    {
        return in_array($this->status, [
            self::STATUS_FINALIZED,
            self::STATUS_PARTIALLY_DISPENSED,
            self::STATUS_DISPENSED,
        ], true);
    }

    public function isDispensed(): bool
    {
        return in_array($this->status, [
            self::STATUS_PARTIALLY_DISPENSED,
            self::STATUS_DISPENSED,
        ], true);
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }
}
