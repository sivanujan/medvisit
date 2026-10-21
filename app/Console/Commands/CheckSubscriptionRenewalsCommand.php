<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckSubscriptionRenewalsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:check-renewals';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate renewal invoices for expiring clinic subscriptions and expire past-due accounts';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now();
        $graceDays = (int) config('medvisit.subscription.grace_days', 3);
        $standardPlan = Plan::where('slug', 'medvisit-standard')->first();
        $defaultPriceCents = $standardPlan?->price_cents ?? (int) config('medvisit.subscription.default_price_cents', 500000);

        $this->info("Checking subscription renewals and expirations at {$now->toDateTimeString()}...");

        // 1. Generate renewal invoices for subscriptions ending within 7 days
        $expiringSubscriptions = Subscription::where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<=', $now->copy()->addDays(7))
            ->where('current_period_end', '>=', $now->copy()->subDays($graceDays))
            ->get();

        $invoicesGenerated = 0;
        foreach ($expiringSubscriptions as $sub) {
            // Check if there is already an invoice covering the next period or an unpaid invoice
            $existingInvoice = SubscriptionInvoice::where('subscription_id', $sub->id)
                ->where(function ($q) use ($sub) {
                    $q->where('period_start', '>=', $sub->current_period_end)
                        ->orWhere('status', SubscriptionInvoice::STATUS_UNPAID);
                })
                ->exists();

            if (! $existingInvoice) {
                $periodStart = $sub->current_period_end;
                $periodEnd = $sub->current_period_end->copy()->addMonth();

                SubscriptionInvoice::create([
                    'tenant_id' => $sub->tenant_id,
                    'subscription_id' => $sub->id,
                    'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                    'amount_cents' => $sub->plan?->price_cents ?? $defaultPriceCents,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'due_date' => $periodStart,
                    'status' => SubscriptionInvoice::STATUS_UNPAID,
                ]);

                $invoicesGenerated++;
                Log::info("Generated renewal invoice for tenant [{$sub->tenant_id}] for period [{$periodStart->toDateString()} - {$periodEnd->toDateString()}]");
            }
        }

        $this->info("Generated {$invoicesGenerated} renewal invoice(s).");

        // 2. Mark subscriptions past grace period as expired
        $expiredCount = 0;
        $overdueSubscriptions = Subscription::whereIn('status', [Subscription::STATUS_ACTIVE, Subscription::STATUS_PAST_DUE])
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<', $now->copy()->subDays($graceDays))
            ->get();

        foreach ($overdueSubscriptions as $sub) {
            $sub->update([
                'status' => Subscription::STATUS_EXPIRED,
            ]);

            $expiredCount++;
            Log::warning("Subscription expired for tenant [{$sub->tenant_id}] after grace period.");
        }

        $this->info("Marked {$expiredCount} subscription(s) as expired.");

        return Command::SUCCESS;
    }
}
