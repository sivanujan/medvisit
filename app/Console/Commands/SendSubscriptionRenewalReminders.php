<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\PromoCode;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Services\Billing\SubscriptionNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendSubscriptionRenewalReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send 7-day and 1-day subscription renewal reminder emails for unpaid invoices';

    /**
     * Execute the console command.
     */
    public function handle(SubscriptionNotificationService $notificationService): int
    {
        $this->info('Checking subscription renewals for reminder notices...');

        $now = Carbon::now('Asia/Colombo')->startOfDay();

        // 1. Target 7 days out
        $date7d = $now->copy()->addDays(7);
        // 2. Target 1 day out
        $date1d = $now->copy()->addDays(1);

        $subscriptions = Subscription::where('status', Subscription::STATUS_ACTIVE)
            ->where('cancels_at_period_end', false)
            ->whereNotNull('current_period_end')
            ->whereHas('plan', fn ($q) => $q->where('slug', '!=', 'comp'))
            ->get();

        $count = 0;

        foreach ($subscriptions as $subscription) {
            $periodEnd = $subscription->current_period_end?->setTimezone('Asia/Colombo')->startOfDay();
            if (! $periodEnd) {
                continue;
            }

            $daysDiff = (int) $now->diffInDays($periodEnd, false);

            if ($daysDiff === 7 || $daysDiff === 3 || $daysDiff === 1) {
                // Find or create unpaid renewal invoice
                $invoice = $subscription->latestUnpaidInvoice();
                if (! $invoice) {
                    $plan = $subscription->plan ?? Plan::forSlug((string) ($subscription->tenant?->plan ?? 'pro'));
                    $planPriceCents = $plan ? $plan->price_cents : 900000;

                    $discountCents = 0;
                    $promoCode = null;
                    $promoId = null;

                    $snapshot = $subscription->promo_snapshot;
                    if ($snapshot && is_array($snapshot) && $subscription->active_promo_id) {
                        $eligiblePlans = $snapshot['eligible_plans'] ?? [];
                        $isPlanEligible = empty($eligiblePlans) || in_array('*', $eligiblePlans, true) || in_array($plan?->slug, $eligiblePlans, true);

                        if ($isPlanEligible) {
                            $type = $snapshot['type'] ?? 'fixed';
                            $value = (int) ($snapshot['value'] ?? 0);
                            $duration = $snapshot['duration'] ?? 'once';

                            if ($duration === PromoCode::DURATION_FOREVER || ($duration === PromoCode::DURATION_REPEATING && ($subscription->promo_months_remaining ?? 0) > 0)) {
                                $promoCode = $snapshot['code'] ?? null;
                                $promoId = $subscription->active_promo_id;

                                if ($type === PromoCode::TYPE_PERCENT) {
                                    $discountCents = (int) round(($planPriceCents * max(1, min(100, $value))) / 100);
                                } elseif ($type === PromoCode::TYPE_FIXED) {
                                    $discountCents = $value;
                                } elseif ($type === PromoCode::TYPE_FREE_MONTHS) {
                                    $discountCents = $planPriceCents;
                                }
                            }
                        }
                    }

                    $discountCents = min($planPriceCents, max(0, $discountCents));
                    $finalAmountCents = max(0, $planPriceCents - $discountCents);

                    $invoice = SubscriptionInvoice::create([
                        'tenant_id' => $subscription->tenant_id,
                        'subscription_id' => $subscription->id,
                        'type' => SubscriptionInvoice::TYPE_SUBSCRIPTION,
                        'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                        'amount_cents' => $finalAmountCents,
                        'original_amount_cents' => $planPriceCents,
                        'discount_cents' => $discountCents,
                        'promo_code' => $promoCode,
                        'promo_id' => $promoId,
                        'period_start' => $subscription->current_period_end,
                        'period_end' => $subscription->current_period_end->copy()->addMonth(),
                        'due_date' => $subscription->current_period_end,
                        'status' => SubscriptionInvoice::STATUS_UNPAID,
                    ]);
                }

                $notificationService->sendRenewalReminder($invoice, $daysDiff);
                $count++;
                $this->line("Sent {$daysDiff}-day reminder for clinic [{$subscription->tenant_id}] (Invoice {$invoice->invoice_number})");
            }
        }

        $this->info("Completed. Dispatched {$count} reminder notices.");

        return self::SUCCESS;
    }
}
