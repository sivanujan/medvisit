<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\Billing\SubscriptionNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionPaymentService
{
    public function __construct(
        protected ?SubscriptionNotificationService $notificationService = null
    ) {
        $this->notificationService = $notificationService ?? app(SubscriptionNotificationService::class);
    }

    /**
     * Atomically process a successful payment for an invoice and activate/extend the subscription.
     *
     * @param  array{
     *     reference: string,
     *     amount_cents: int,
     *     currency: string,
     *     status: string,
     *     checkout_id?: ?string,
     *     payment_id?: ?string,
     *     method?: ?string
     * }  $paymentDetails
     */
    public function processSuccessfulPayment(array $paymentDetails, ?array $rawPayload = null): bool
    {
        $reference = $paymentDetails['reference'];
        $amountCents = $paymentDetails['amount_cents'];
        $currency = strtoupper($paymentDetails['currency'] ?? 'LKR');
        $status = $paymentDetails['status'];
        $checkoutId = $paymentDetails['checkout_id'] ?? null;
        $paymentId = $paymentDetails['payment_id'] ?? null;
        $method = $paymentDetails['method'] ?? 'paymentslk';

        return DB::transaction(function () use (
            $reference,
            $amountCents,
            $currency,
            $status,
            $checkoutId,
            $paymentId,
            $method,
            $rawPayload
        ) {
            $invoice = SubscriptionInvoice::where('invoice_number', $reference)
                ->lockForUpdate()
                ->first();

            if (! $invoice) {
                Log::error("SubscriptionPaymentService: Invoice [{$reference}] not found");

                return false;
            }

            // Record or update the payment transaction
            PaymentTransaction::updateOrCreate(
                [
                    'tenant_id' => $invoice->tenant_id,
                    'invoice_id' => $invoice->id,
                    'gateway_checkout_id' => $checkoutId,
                ],
                [
                    'gateway' => 'paymentslk',
                    'gateway_payment_id' => $paymentId,
                    'amount_cents' => $amountCents,
                    'currency' => $currency,
                    'status' => PaymentTransaction::STATUS_SUCCEEDED,
                    'raw_payload' => $rawPayload,
                ]
            );

            // Strict checks: status=succeeded, currency=LKR, amountCents matches invoice
            if ($status !== 'succeeded') {
                Log::warning("SubscriptionPaymentService: Payment status is not succeeded: [{$status}] for invoice [{$reference}]");

                return false;
            }

            if ($currency !== 'LKR') {
                Log::warning("SubscriptionPaymentService: Currency mismatch [{$currency}] for invoice [{$reference}]");

                return false;
            }

            if ($amountCents !== $invoice->amount_cents) {
                Log::warning("SubscriptionPaymentService: Amount mismatch got [{$amountCents}], expected [{$invoice->amount_cents}] for invoice [{$reference}]");

                return false;
            }

            // Idempotency: if already paid or void, do NOT extend subscription or generate new receipt
            if ($invoice->status === SubscriptionInvoice::STATUS_PAID || $invoice->status === SubscriptionInvoice::STATUS_VOID) {
                Log::info("SubscriptionPaymentService: Invoice [{$reference}] is already {$invoice->status}, skipping duplicate subscription extension");

                return true;
            }

            // Generate atomic, race-safe receipt number
            $receiptNumber = SubscriptionInvoice::generateReceiptNumber();
            $now = Carbon::now();

            // Mark invoice paid
            $invoice->update([
                'status' => SubscriptionInvoice::STATUS_PAID,
                'paid_at' => $now,
                'payment_method' => $method,
                'receipt_number' => $receiptNumber,
            ]);

            // Lock subscription for updating
            $subscription = Subscription::where('id', $invoice->subscription_id)
                ->lockForUpdate()
                ->first();

            if (! $subscription) {
                return true;
            }

            // 1. PRORATION INVOICES: Switch plan immediately, but DO NOT extend current_period_end!
            if ($invoice->type === SubscriptionInvoice::TYPE_PRORATION) {
                $billingDetails = $invoice->billing_details ?? [];
                $newPlanId = $billingDetails['new_plan_id'] ?? $subscription->pending_plan_id;

                if ($newPlanId) {
                    $oldPlan = $subscription->plan;
                    $newPlan = Plan::find($newPlanId);

                    $subscription->update([
                        'plan_id' => $newPlanId,
                        'pending_plan_id' => null,
                        'status' => Subscription::STATUS_ACTIVE,
                    ]);

                    // Sync tenant status and plan
                    $tenant = Tenant::find($subscription->tenant_id);
                    if ($tenant) {
                        $tenantUpdates = [];
                        if ($tenant->status !== 'active') {
                            $tenantUpdates['status'] = 'active';
                        }
                        if ($newPlan && $tenant->plan !== $newPlan->slug) {
                            $tenantUpdates['plan'] = $newPlan->slug;
                        }
                        if (! empty($tenantUpdates)) {
                            $tenant->update($tenantUpdates);
                        }
                    }

                    AuditLogger::log('subscription.plan_upgraded', [
                        'tenant_id' => $subscription->tenant_id,
                        'old_plan' => $oldPlan?->name,
                        'new_plan' => $newPlan?->name,
                        'proration_invoice' => $invoice->invoice_number,
                        'amount_cents' => $invoice->amount_cents,
                    ]);
                }

                // Send success email with receipt attached
                $this->notificationService->sendPaymentSuccess($invoice);

                Log::info("SubscriptionPaymentService: Tenant [{$subscription->tenant_id}] plan upgraded to [{$subscription->plan_id}] via proration [{$reference}], period unchanged");

                return true;
            }

            // 2. REGULAR SUBSCRIPTION OR UPGRADE INVOICES:
            $upgradePlanId = $invoice->billing_details['new_plan_id'] ?? null;
            if ($upgradePlanId) {
                $oldPlan = $subscription->plan;
                $newPlan = Plan::find($upgradePlanId);

                $subscription->plan_id = $upgradePlanId;
                $subscription->pending_plan_id = null;

                AuditLogger::log('subscription.plan_upgraded', [
                    'tenant_id' => $subscription->tenant_id,
                    'old_plan' => $oldPlan?->name,
                    'new_plan' => $newPlan?->name,
                    'invoice_number' => $invoice->invoice_number,
                    'amount_cents' => $invoice->amount_cents,
                ]);

                // User Rule: Upgrade = pay new plan price now, and a new period starts today!
                $newStart = $now;
                $newEnd = $now->copy()->addMonth();
            } else {
                // Check if there is a pending downgrade scheduled for renewal
                if ($subscription->pending_plan_id) {
                    $oldPlan = $subscription->plan;
                    $newPlan = Plan::find($subscription->pending_plan_id);

                    $subscription->plan_id = $subscription->pending_plan_id;
                    $subscription->pending_plan_id = null;

                    AuditLogger::log('subscription.plan_downgraded_applied', [
                        'tenant_id' => $subscription->tenant_id,
                        'old_plan' => $oldPlan?->name,
                        'new_plan' => $newPlan?->name,
                    ]);
                }

                // If clinic is trialing, paid period starts after trial ends!
                if ($subscription->trial_ends_at && $subscription->trial_ends_at->isFuture()) {
                    $newStart = $subscription->trial_ends_at;
                    $newEnd = $subscription->trial_ends_at->copy()->addMonth();
                } else {
                    $currentEnd = $subscription->current_period_end;
                    if ($currentEnd && $currentEnd->isFuture()) {
                        $newEnd = $currentEnd->copy()->addMonth();
                        $newStart = $subscription->current_period_start ?? $now;
                    } else {
                        $newStart = $now;
                        $newEnd = $now->copy()->addMonth();
                    }
                }
            }

            $subscription->update([
                'status' => Subscription::STATUS_ACTIVE,
                'cancels_at_period_end' => false,
                'cancelled_at' => null,
                'cancellation_reason' => null,
                'current_period_start' => $newStart,
                'current_period_end' => $newEnd,
                'activated_at' => $subscription->activated_at ?? $now,
            ]);

            // Sync tenant status to active and update plan slug
            $tenant = Tenant::find($subscription->tenant_id);
            if ($tenant) {
                $tenantUpdates = [];
                if ($tenant->status !== 'active') {
                    $tenantUpdates['status'] = 'active';
                }
                if ($subscription->plan && $tenant->plan !== $subscription->plan->slug) {
                    $tenantUpdates['plan'] = $subscription->plan->slug;
                }
                if (! empty($tenantUpdates)) {
                    $tenant->update($tenantUpdates);
                }
            }

            AuditLogger::log('subscription.payment_processed', [
                'tenant_id' => $subscription->tenant_id,
                'invoice_number' => $invoice->invoice_number,
                'receipt_number' => $receiptNumber,
                'amount_cents' => $invoice->amount_cents,
                'current_period_end' => $newEnd->toDateTimeString(),
            ]);

            // Dispatch payment success email with receipt PDF attached
            $this->notificationService->sendPaymentSuccess($invoice);

            Log::info("SubscriptionPaymentService: Tenant [{$subscription->tenant_id}] subscription activated until [{$newEnd->toDateTimeString()}] via [{$reference}]");

            return true;
        });
    }

    /**
     * Record a failed payment transaction and notify.
     */
    public function processFailedPayment(array $paymentDetails, ?array $rawPayload = null): void
    {
        $reference = $paymentDetails['reference'];
        $checkoutId = $paymentDetails['checkout_id'] ?? null;
        $paymentId = $paymentDetails['payment_id'] ?? null;
        $amountCents = $paymentDetails['amount_cents'] ?? null;

        DB::transaction(function () use ($reference, $checkoutId, $paymentId, $amountCents, $rawPayload) {
            $invoice = SubscriptionInvoice::where('invoice_number', $reference)->first();
            if (! $invoice) {
                return;
            }

            PaymentTransaction::updateOrCreate(
                [
                    'tenant_id' => $invoice->tenant_id,
                    'invoice_id' => $invoice->id,
                    'gateway_checkout_id' => $checkoutId,
                ],
                [
                    'gateway' => 'paymentslk',
                    'gateway_payment_id' => $paymentId,
                    'amount_cents' => $amountCents ?? $invoice->amount_cents,
                    'currency' => 'LKR',
                    'status' => PaymentTransaction::STATUS_FAILED,
                    'raw_payload' => $rawPayload,
                ]
            );

            // Notify billing contact
            $failureMessage = $rawPayload['payment']['failureMessage'] ?? null;
            $this->notificationService->sendPaymentFailed($invoice, $failureMessage);

            Log::info("SubscriptionPaymentService: Recorded failed payment transaction for invoice [{$reference}]");
        });
    }
}
