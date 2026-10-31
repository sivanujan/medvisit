<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSmsUsage extends Model
{
    protected $table = 'tenant_sms_usages';

    protected $fillable = [
        'tenant_id',
        'period_start',
        'period_end',
        'clinic_triggered_count',
        'otp_grace_count',
        'notification_80_sent_at',
        'notification_100_sent_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'clinic_triggered_count' => 'integer',
        'otp_grace_count' => 'integer',
        'notification_80_sent_at' => 'datetime',
        'notification_100_sent_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Resolve or create the active monthly usage record for a tenant.
     */
    public static function currentForTenant(Tenant $tenant): self
    {
        $subscription = $tenant->subscription;
        $now = Carbon::now('Asia/Colombo');

        if ($subscription && $subscription->current_period_start && $subscription->current_period_end) {
            $periodStart = $subscription->current_period_start->toDateString();
            $periodEnd = $subscription->current_period_end->toDateString();
        } else {
            $periodStart = $now->copy()->startOfMonth()->toDateString();
            $periodEnd = $now->copy()->endOfMonth()->toDateString();
        }

        return static::firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
            ],
            [
                'clinic_triggered_count' => 0,
                'otp_grace_count' => 0,
            ]
        );
    }
}
