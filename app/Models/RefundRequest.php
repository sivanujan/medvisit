<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RefundRequest extends Model
{
    use HasFactory;

    public const REASON_DUPLICATE_CHARGE = 'duplicate_charge';

    public const REASON_CHARGED_AFTER_CANCELLATION = 'charged_after_cancellation';

    public const REASON_FIRST_PAYMENT_UNUSED = 'first_payment_unused';

    public const REASON_BILLING_ERROR = 'billing_error';

    public const REASON_DOWNTIME = 'downtime';

    public const REASON_OTHER = 'other';

    public const STATUS_REQUESTED = 'requested';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_REFUNDED = 'refunded';

    public const STATUS_CANCELLED_BY_CLINIC = 'cancelled_by_clinic';

    public const ELIGIBILITY_ELIGIBLE = 'eligible';

    public const ELIGIBILITY_PARTIALLY_ELIGIBLE = 'partially_eligible';

    public const ELIGIBILITY_NOT_ELIGIBLE = 'not_eligible';

    public const ELIGIBILITY_NEEDS_REVIEW = 'needs_review';

    public const METHOD_PAYMENTS_LK_DASHBOARD = 'payments_lk_dashboard';

    public const METHOD_BANK_TRANSFER = 'bank_transfer';

    public const METHOD_API = 'api';

    protected $fillable = [
        'public_id',
        'tenant_id',
        'payment_id',
        'requested_by_user_id',
        'reason_type',
        'description',
        'requested_amount_cents',
        'eligible_amount_cents',
        'approved_amount_cents',
        'eligibility',
        'eligibility_checks',
        'status',
        'admin_note',
        'decision_reason',
        'decided_by_admin_id',
        'decided_at',
        'refund_method',
        'refund_reference',
        'refunded_at',
        'credit_note_number',
    ];

    protected $casts = [
        'requested_amount_cents' => 'integer',
        'eligible_amount_cents' => 'integer',
        'approved_amount_cents' => 'integer',
        'eligibility_checks' => 'array',
        'decided_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (RefundRequest $model) {
            if (empty($model->public_id)) {
                $model->public_id = 'ref_'.strtolower(Str::random(16));
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class, 'payment_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_admin_id');
    }

    public function getFormattedRequestedAmountAttribute(): string
    {
        return 'Rs. '.number_format($this->requested_amount_cents / 100, 2);
    }

    public function getFormattedEligibleAmountAttribute(): string
    {
        return 'Rs. '.number_format($this->eligible_amount_cents / 100, 2);
    }

    public function getFormattedApprovedAmountAttribute(): ?string
    {
        if ($this->approved_amount_cents === null) {
            return null;
        }

        return 'Rs. '.number_format($this->approved_amount_cents / 100, 2);
    }

    public function isPendingReview(): bool
    {
        return in_array($this->status, [self::STATUS_REQUESTED, self::STATUS_UNDER_REVIEW], true);
    }

    public function isCompleted(): bool
    {
        return in_array($this->status, [self::STATUS_REFUNDED, self::STATUS_REJECTED, self::STATUS_CANCELLED_BY_CLINIC], true);
    }

    public function canBeCancelledByClinic(): bool
    {
        return in_array($this->status, [self::STATUS_REQUESTED, self::STATUS_UNDER_REVIEW], true);
    }
}
