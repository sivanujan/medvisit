<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\Subscription\ZeroAmountInvoiceMail;
use App\Models\Plan;
use App\Models\PromoCode;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
        $defaultPriceCents = (int) config('medvisit_public.plans.pro.price_cents');
        if (! $defaultPriceCents) {
            throw new \RuntimeException("Missing pricing configuration for 'pro' plan in config('medvisit_public.plans').");
        }

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

                $plan = $sub->plan ?? Plan::forSlug((string) $sub->tenant?->plan);
                $planPriceCents = $plan ? $plan->price_cents : $defaultPriceCents;

                $discountCents = 0;
                $promoCode = null;
                $promoId = null;

                // Process snapshot deal if promo is active on subscription
                $snapshot = $sub->promo_snapshot;
                if ($snapshot && is_array($snapshot) && $sub->active_promo_id) {
                    $eligiblePlans = $snapshot['eligible_plans'] ?? [];
                    $isPlanEligible = empty($eligiblePlans) || in_array('*', $eligiblePlans, true) || in_array($plan?->slug, $eligiblePlans, true);

                    if ($isPlanEligible) {
                        $duration = $snapshot['duration'] ?? 'once';
                        $type = $snapshot['type'] ?? 'fixed';
                        $value = (int) ($snapshot['value'] ?? 0);
                        $applyDiscount = false;

                        if ($duration === PromoCode::DURATION_FOREVER) {
                            $applyDiscount = true;
                        } elseif ($duration === PromoCode::DURATION_REPEATING) {
                            $remaining = (int) ($sub->promo_months_remaining ?? 0);
                            if ($remaining > 0) {
                                $applyDiscount = true;
                                $newRemaining = $remaining - 1;
                                $sub->update([
                                    'promo_months_remaining' => $newRemaining,
                                    'active_promo_id' => $newRemaining > 0 ? $sub->active_promo_id : null,
                                ]);
                            }
                        }

                        if ($applyDiscount) {
                            $promoCode = $snapshot['code'] ?? null;
                            $promoId = $sub->active_promo_id;

                            if ($type === PromoCode::TYPE_PERCENT) {
                                $discountCents = (int) round(($planPriceCents * max(1, min(100, $value))) / 100);
                            } elseif ($type === PromoCode::TYPE_FIXED) {
                                $discountCents = $value;
                            } elseif ($type === PromoCode::TYPE_FREE_MONTHS) {
                                $discountCents = $planPriceCents;
                            }
                        }
                    } else {
                        // Plan not eligible anymore, promo ends
                        $sub->update([
                            'active_promo_id' => null,
                            'promo_snapshot' => null,
                            'promo_months_remaining' => null,
                        ]);
                    }
                }

                $discountCents = min($planPriceCents, max(0, $discountCents));
                $finalAmountCents = max(0, $planPriceCents - $discountCents);

                if ($finalAmountCents === 0 && $discountCents > 0) {
                    // Rs. 0 Renewal Invoice: Mark paid immediately with no receipt number
                    $invoice = SubscriptionInvoice::create([
                        'tenant_id' => $sub->tenant_id,
                        'subscription_id' => $sub->id,
                        'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                        'amount_cents' => 0,
                        'original_amount_cents' => $planPriceCents,
                        'discount_cents' => $discountCents,
                        'promo_code' => $promoCode,
                        'promo_id' => $promoId,
                        'period_start' => $periodStart,
                        'period_end' => $periodEnd,
                        'due_date' => $periodStart,
                        'status' => SubscriptionInvoice::STATUS_PAID,
                        'paid_at' => $now,
                        'payment_method' => 'promo',
                        'receipt_number' => null, // Never consume receipt number on Rs. 0
                    ]);

                    // Extend subscription period
                    $sub->update([
                        'current_period_start' => $periodStart,
                        'current_period_end' => $periodEnd,
                    ]);

                    // Email the clinic
                    $clinicAdmin = User::where('tenant_id', $sub->tenant_id)->first();
                    if ($clinicAdmin) {
                        Mail::to($clinicAdmin->email)->queue(
                            new ZeroAmountInvoiceMail(
                                $invoice,
                                (string) ($sub->tenant?->name ?? 'Your Clinic'),
                                "promo code {$promoCode}",
                                url('/settings/billing')
                            )
                        );
                    }
                } else {
                    SubscriptionInvoice::create([
                        'tenant_id' => $sub->tenant_id,
                        'subscription_id' => $sub->id,
                        'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                        'amount_cents' => $finalAmountCents,
                        'original_amount_cents' => $planPriceCents,
                        'discount_cents' => $discountCents,
                        'promo_code' => $promoCode,
                        'promo_id' => $promoId,
                        'period_start' => $periodStart,
                        'period_end' => $periodEnd,
                        'due_date' => $periodStart,
                        'status' => SubscriptionInvoice::STATUS_UNPAID,
                    ]);
                }

                $invoicesGenerated++;
                Log::info("Generated renewal invoice for tenant [{$sub->tenant_id}] for period [{$periodStart->toDateString()} - {$periodEnd->toDateString()}] (Amount: Rs. ".($finalAmountCents / 100).')');
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
