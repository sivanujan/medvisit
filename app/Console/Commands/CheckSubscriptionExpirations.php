<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\AuditLogger;
use App\Services\Billing\SubscriptionNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckSubscriptionExpirations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:check-expirations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check expired subscriptions, handle grace period notices and period-end cancellations';

    /**
     * Execute the console command.
     */
    public function handle(SubscriptionNotificationService $notificationService): int
    {
        $this->info('Checking subscription expirations and grace periods...');

        $now = Carbon::now('Asia/Colombo');
        $graceDays = (int) config('medvisit.subscription.grace_days', 3);

        $subscriptions = Subscription::whereNotIn('status', [Subscription::STATUS_EXPIRED, Subscription::STATUS_CANCELLED])
            ->whereNotNull('current_period_end')
            ->whereHas('plan', fn ($q) => $q->where('slug', '!=', 'comp'))
            ->get();

        foreach ($subscriptions as $subscription) {
            $end = $subscription->current_period_end;
            if (! $end) {
                continue;
            }

            $graceEnd = $end->copy()->addDays($graceDays);

            // 1. Period-end cancellations: cancels_at_period_end = true and period has ended
            if ($subscription->cancels_at_period_end && $end->isPast()) {
                $subscription->update([
                    'status' => Subscription::STATUS_CANCELLED,
                    'cancels_at_period_end' => false,
                ]);

                AuditLogger::log('subscription.cancelled_period_ended', [
                    'tenant_id' => $subscription->tenant_id,
                    'ended_at' => $end->toDateTimeString(),
                ]);

                $this->warn("Subscription for tenant [{$subscription->tenant_id}] reached period end and is now CANCELLED.");

                continue;
            }

            // 2. Active subscription where period has ended
            if ($subscription->status === Subscription::STATUS_ACTIVE && $end->isPast()) {
                $unpaidInvoice = $subscription->latestUnpaidInvoice();
                $formattedAmount = $unpaidInvoice?->formatted_amount ?? $subscription->plan?->formatted_price ?? 'Rs. 5,000.00';

                // Within grace period (0 - 3 days past end)
                if ($graceEnd->isFuture() || $now->lte($graceEnd)) {
                    $subscription->update([
                        'status' => Subscription::STATUS_PAST_DUE,
                    ]);

                    $notificationService->sendPastDue($subscription, true, $formattedAmount);

                    AuditLogger::log('subscription.grace_period_started', [
                        'tenant_id' => $subscription->tenant_id,
                        'grace_ends' => $graceEnd->toDateTimeString(),
                    ]);

                    $this->line("Tenant [{$subscription->tenant_id}] entered grace period until [{$graceEnd->toDateTimeString()}].");
                } else {
                    // Grace period expired -> Mark EXPIRED
                    $subscription->update([
                        'status' => Subscription::STATUS_EXPIRED,
                    ]);

                    $notificationService->sendPastDue($subscription, false, $formattedAmount);

                    AuditLogger::log('subscription.expired', [
                        'tenant_id' => $subscription->tenant_id,
                        'expired_at' => $now->toDateTimeString(),
                    ]);

                    $this->error("Tenant [{$subscription->tenant_id}] grace period expired. Marked EXPIRED.");
                }
            } elseif ($subscription->status === Subscription::STATUS_PAST_DUE && $graceEnd->isPast()) {
                // Was past due and now past grace end
                $unpaidInvoice = $subscription->latestUnpaidInvoice();
                $formattedAmount = $unpaidInvoice?->formatted_amount ?? $subscription->plan?->formatted_price ?? 'Rs. 5,000.00';

                $subscription->update([
                    'status' => Subscription::STATUS_EXPIRED,
                ]);

                $notificationService->sendPastDue($subscription, false, $formattedAmount);

                AuditLogger::log('subscription.expired', [
                    'tenant_id' => $subscription->tenant_id,
                    'expired_at' => $now->toDateTimeString(),
                ]);

                $this->error("Tenant [{$subscription->tenant_id}] grace period ended. Marked EXPIRED.");
            }
        }

        $this->info('Subscription expirations check completed.');

        return self::SUCCESS;
    }
}
