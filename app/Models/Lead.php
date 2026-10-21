<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $clinic_name
 * @property string $contact_name
 * @property string $phone
 * @property string|null $email
 * @property string|null $city
 * @property string $source
 * @property string $stage
 * @property string|null $notes
 * @property Carbon|null $next_follow_up_at
 * @property Carbon|null $demo_scheduled_at
 * @property string|null $lost_reason
 * @property string|null $converted_tenant_id
 * @property int|null $created_by_user_id
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class Lead extends Model
{
    use HasFactory, SoftDeletes;

    public const STAGE_NEW = 'new';

    public const STAGE_CONTACTED = 'contacted';

    public const STAGE_DEMO_BOOKED = 'demo_booked';

    public const STAGE_DEMO_DONE = 'demo_done';

    public const STAGE_TRIAL = 'trial';

    public const STAGE_PAYING = 'paying';

    public const STAGE_LOST = 'lost';

    public const STAGES = [
        self::STAGE_NEW => 'New Lead',
        self::STAGE_CONTACTED => 'Contacted',
        self::STAGE_DEMO_BOOKED => 'Demo Booked',
        self::STAGE_DEMO_DONE => 'Demo Completed',
        self::STAGE_TRIAL => 'Trial Active',
        self::STAGE_PAYING => 'Paying Customer',
        self::STAGE_LOST => 'Lost / Disqualified',
    ];

    public const SOURCES = [
        'website_form' => 'Website Form',
        'facebook' => 'Facebook Ads',
        'instagram' => 'Instagram',
        'whatsapp' => 'WhatsApp Inbound',
        'referral' => 'Doctor Referral',
        'walk_in' => 'Direct Walk-in',
        'cold_call' => 'Outreach / Cold Call',
        'other' => 'Other',
    ];

    protected $fillable = [
        'clinic_name',
        'contact_name',
        'phone',
        'email',
        'city',
        'source',
        'stage',
        'notes',
        'next_follow_up_at',
        'demo_scheduled_at',
        'lost_reason',
        'converted_tenant_id',
        'created_by_user_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'next_follow_up_at' => 'datetime',
            'demo_scheduled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * Associated tenant if converted.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'converted_tenant_id');
    }

    /**
     * User who manually recorded the lead.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Scope leads with follow-up due today or overdue.
     */
    public function scopeDueFollowUp(Builder $query): Builder
    {
        return $query->whereNotNull('next_follow_up_at')
            ->whereDate('next_follow_up_at', '<=', Carbon::today('Asia/Colombo'))
            ->whereNotIn('stage', [self::STAGE_PAYING, self::STAGE_LOST]);
    }

    /**
     * Scope leads by stage.
     */
    public function scopeByStage(Builder $query, string $stage): Builder
    {
        return $query->where('stage', $stage);
    }

    /**
     * Has this lead been converted to a clinic?
     */
    public function isConverted(): bool
    {
        return ! empty($this->converted_tenant_id);
    }
}
