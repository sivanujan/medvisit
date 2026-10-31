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
     * Anchored to each clinic's own billing period start date (not 1st of month for everyone).
     */
    public static function currentForTenant(Tenant $tenant): self
    {
        $subscription = $tenant->subscription;
        $now = Carbon::now('Asia/Colombo');

        if ($subscription && $subscription->current_period_start) {
            $subStart = $subscription->current_period_start->copy()->setTimezone('Asia/Colombo');
            $subEnd = $subscription->current_period_end?->copy()->setTimezone('Asia/Colombo');

            if ($subEnd) {
                $periodStart = $subStart->toDateString();
                $periodEnd = $subEnd->toDateString();
            } else {
                [$periodStart, $periodEnd] = self::calculateMonthlyCycleDates((int) $subStart->day, $now);
            }
        } else {
            // Anchor to clinic created_at day of month (e.g. 15th), so it doesn't default to the 1st for everyone
            $anchorDay = (int) ($tenant->created_at?->copy()->setTimezone('Asia/Colombo')->day ?? 1);
            [$periodStart, $periodEnd] = self::calculateMonthlyCycleDates($anchorDay, $now);
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

    /**
     * Calculate monthly cycle [start, end] dates anchored to a specific day of month (e.g. 15th, 31st).
     * Clamps cleanly to the last day of shorter months (e.g. 31 Jan -> 28/29 Feb -> 31 Mar)
     * with no skipped or overlapping cycles.
     *
     * @return array{0: string, 1: string}
     */
    public static function calculateMonthlyCycleDates(int $anchorDay, Carbon $now): array
    {
        $year = $now->year;
        $month = $now->month;

        $daysInCurrentMonth = (int) Carbon::create($year, $month, 1, 0, 0, 0, 'Asia/Colombo')->daysInMonth;
        $currentMonthEffectiveDay = min($anchorDay, $daysInCurrentMonth);

        if ($now->day >= $currentMonthEffectiveDay) {
            // Active cycle began this month
            $start = Carbon::create($year, $month, $currentMonthEffectiveDay, 0, 0, 0, 'Asia/Colombo');

            // Ends on next month's effective day
            $nextMonthDate = $start->copy()->startOfMonth()->addMonthsNoOverflow(1);
            $daysInNextMonth = (int) $nextMonthDate->daysInMonth;
            $nextMonthEffectiveDay = min($anchorDay, $daysInNextMonth);
            $end = Carbon::create($nextMonthDate->year, $nextMonthDate->month, $nextMonthEffectiveDay, 0, 0, 0, 'Asia/Colombo');
        } else {
            // Active cycle began in previous month
            $prevMonthDate = $now->copy()->startOfMonth()->subMonthsNoOverflow(1);
            $daysInPrevMonth = (int) $prevMonthDate->daysInMonth;
            $prevMonthEffectiveDay = min($anchorDay, $daysInPrevMonth);
            $start = Carbon::create($prevMonthDate->year, $prevMonthDate->month, $prevMonthEffectiveDay, 0, 0, 0, 'Asia/Colombo');

            // Ends on this month's effective day
            $end = Carbon::create($year, $month, $currentMonthEffectiveDay, 0, 0, 0, 'Asia/Colombo');
        }

        return [$start->toDateString(), $end->toDateString()];
    }
}
