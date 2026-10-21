<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use Carbon\Carbon;
use InvalidArgumentException;

class SubscriptionProrationService
{
    /**
     * Preview proration calculation for upgrading plans.
     *
     * @return array{
     *     old_plan: Plan,
     *     new_plan: Plan,
     *     is_upgrade: bool,
     *     is_downgrade: bool,
     *     total_period_days: int,
     *     remaining_days: int,
     *     price_difference_cents: int,
     *     prorated_amount_cents: int,
     *     formatted_prorated_amount: string,
     *     effective_date: string
     * }
     */
    public function previewChange(Subscription $subscription, Plan $newPlan): array
    {
        $currentPlan = $subscription->plan;
        if (! $currentPlan) {
            throw new InvalidArgumentException('Subscription has no active plan.');
        }

        $isUpgrade = $newPlan->price_cents > $currentPlan->price_cents;
        $isDowngrade = $newPlan->price_cents < $currentPlan->price_cents;

        $now = Carbon::now('Asia/Colombo');
        $start = $subscription->current_period_start ?? $now;
        $end = $subscription->current_period_end ?? $now->copy()->addMonth();

        $totalPeriodDays = max(1, (int) $start->diffInDays($end));
        $remainingDays = max(0, (int) ceil($now->diffInDays($end, false)));

        if ($isUpgrade && $remainingDays > 0) {
            $diffCents = $newPlan->price_cents - $currentPlan->price_cents;
            $proratedCents = (int) round(($diffCents * $remainingDays) / $totalPeriodDays);
            // Minimum 100 cents (Rs. 1.00) if positive
            $proratedCents = max(100, $proratedCents);
        } else {
            $diffCents = 0;
            $proratedCents = 0;
        }

        return [
            'old_plan' => $currentPlan,
            'new_plan' => $newPlan,
            'is_upgrade' => $isUpgrade,
            'is_downgrade' => $isDowngrade,
            'total_period_days' => $totalPeriodDays,
            'remaining_days' => $remainingDays,
            'price_difference_cents' => $diffCents,
            'prorated_amount_cents' => $proratedCents,
            'formatted_prorated_amount' => 'Rs. '.number_format($proratedCents / 100, 2),
            'effective_date' => $isUpgrade
                ? 'Immediately upon payment'
                : ($subscription->current_period_end ? $subscription->current_period_end->setTimezone('Asia/Colombo')->format('d/m/Y') : 'Next renewal'),
        ];
    }

    /**
     * Get or create a locked proration invoice for an upgrade.
     * Enforces the 24-hour price lock rule:
     * - Within 24 hours: reuses existing invoice and locked amount.
     * - After 24 hours: voids the stale invoice and calculates a fresh one.
     */
    public function getOrCreateProrationInvoice(Subscription $subscription, Plan $newPlan): SubscriptionInvoice
    {
        $tenant = $subscription->tenant;

        // Check for existing unpaid proration invoice for this subscription and target plan
        $existingInvoice = SubscriptionInvoice::where('subscription_id', $subscription->id)
            ->where('type', SubscriptionInvoice::TYPE_PRORATION)
            ->where('status', SubscriptionInvoice::STATUS_UNPAID)
            ->latest('id')
            ->first();

        if ($existingInvoice) {
            $billingDetails = $existingInvoice->billing_details ?? [];
            $targetPlanId = $billingDetails['new_plan_id'] ?? null;

            // If same plan and within 24 hours: lock price!
            if ($targetPlanId === $newPlan->id && $existingInvoice->created_at->diffInHours(Carbon::now()) < 24) {
                return $existingInvoice;
            }

            // Older than 24 hours or different plan: void previous unpaid proration invoice
            $existingInvoice->update([
                'status' => SubscriptionInvoice::STATUS_VOID,
                'notes' => 'Proration expired after 24h or changed target plan',
            ]);
        }

        // Compute fresh proration amount
        $preview = $this->previewChange($subscription, $newPlan);
        $now = Carbon::now('Asia/Colombo');

        $tenantBilling = $tenant?->billingDetail;
        $snapshot = [
            'new_plan_id' => $newPlan->id,
            'new_plan_name' => $newPlan->name,
            'old_plan_id' => $subscription->plan_id,
            'old_plan_name' => $subscription->plan?->name,
            'remaining_days' => $preview['remaining_days'],
            'total_period_days' => $preview['total_period_days'],
            'legal_name' => $tenantBilling?->legal_name ?? $tenant?->name,
            'billing_email' => $tenantBilling?->billing_email ?? $tenant?->email,
            'phone' => $tenantBilling?->phone ?? $tenant?->phone,
            'address' => $tenantBilling?->address ?? $tenant?->address,
        ];

        return SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'type' => SubscriptionInvoice::TYPE_PRORATION,
            'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
            'amount_cents' => $preview['prorated_amount_cents'],
            'period_start' => $subscription->current_period_start ?? $now,
            'period_end' => $subscription->current_period_end ?? $now->copy()->addMonth(),
            'due_date' => $now->copy()->addDay(),
            'status' => SubscriptionInvoice::STATUS_UNPAID,
            'billing_details' => $snapshot,
            'notes' => "Prorated upgrade to {$newPlan->name} ({$preview['remaining_days']} days remaining)",
        ]);
    }
}
