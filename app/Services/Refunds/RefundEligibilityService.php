<?php

declare(strict_types=1);

namespace App\Services\Refunds;

use App\Models\BookingToken;
use App\Models\PaymentTransaction;
use App\Models\PlatformIncident;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use Carbon\Carbon;

class RefundEligibilityService
{
    /**
     * Run all eligibility checks for a payment refund request.
     *
     * @return array{
     *     eligibility: string,
     *     eligible_amount_cents: int,
     *     max_allowed_cents: int,
     *     reason_summary: string,
     *     checks: array<int, array{code: string, name: string, passed: bool, message: string, evidence: array<string, mixed>}>
     * }
     */
    public function evaluate(
        PaymentTransaction $payment,
        string $reasonType,
        ?string $description = null,
        ?int $requestedAmountCents = null,
        ?Carbon $asOf = null,
        ?int $ignoreRefundRequestId = null
    ): array {
        $asOf = $asOf ?? Carbon::now('Asia/Colombo');
        $tenantId = $payment->tenant_id;
        $tenant = $payment->tenant;
        $invoice = $payment->invoice;
        $subscription = $invoice?->subscription ?? Subscription::where('tenant_id', $tenantId)->latest('id')->first();
        $paidAt = $invoice?->paid_at ?? $payment->created_at;

        $maxAllowed = max(0, $payment->amount_cents - $payment->refunded_amount_cents);
        $checks = [];

        // --- 1. Global Pre-checks ---

        // Check A: Successful payment
        $isSucceeded = $payment->status === PaymentTransaction::STATUS_SUCCEEDED;
        $checks[] = [
            'code' => 'payment_succeeded',
            'name' => 'Payment Succeeded',
            'passed' => $isSucceeded,
            'message' => $isSucceeded ? 'Payment was successfully captured.' : 'Only successfully completed payments are refundable.',
            'evidence' => ['status' => $payment->status],
        ];

        // Check B: Refundable balance available
        $hasRefundableBalance = $maxAllowed > 0;
        $checks[] = [
            'code' => 'refundable_balance',
            'name' => 'Refundable Balance Available',
            'passed' => $hasRefundableBalance,
            'message' => $hasRefundableBalance ? 'Refundable balance of Rs. '.number_format($maxAllowed / 100, 2).' remains.' : 'This payment has already been fully refunded.',
            'evidence' => [
                'amount_cents' => $payment->amount_cents,
                'refunded_amount_cents' => $payment->refunded_amount_cents,
                'max_allowed_cents' => $maxAllowed,
            ],
        ];

        // Check C: No duplicate open request
        $openQuery = RefundRequest::where('payment_id', $payment->id)
            ->whereIn('status', [
                RefundRequest::STATUS_REQUESTED,
                RefundRequest::STATUS_UNDER_REVIEW,
                RefundRequest::STATUS_APPROVED,
                RefundRequest::STATUS_PROCESSING,
            ]);

        if ($ignoreRefundRequestId) {
            $openQuery->where('id', '!=', $ignoreRefundRequestId);
        }

        $hasOpenRequest = $openQuery->exists();
        $checks[] = [
            'code' => 'no_open_request',
            'name' => 'No Existing Open Request',
            'passed' => ! $hasOpenRequest,
            'message' => ! $hasOpenRequest ? 'No other open refund request exists for this payment.' : 'An open refund request is already being reviewed for this payment.',
            'evidence' => ['has_open_request' => $hasOpenRequest],
        ];

        // Check D: Account standing (not suspended for breach of terms)
        $isSuspended = $tenant ? $tenant->isSuspended() : false;
        $checks[] = [
            'code' => 'account_in_good_standing',
            'name' => 'Account in Good Standing',
            'passed' => ! $isSuspended,
            'message' => ! $isSuspended ? 'Clinic account is active.' : 'Accounts suspended for breach of Terms are not eligible for refunds.',
            'evidence' => ['is_suspended' => $isSuspended],
        ];

        // Check E: No bank chargeback/dispute
        $hasBankDispute = false;
        if (is_array($payment->raw_payload)) {
            $hasBankDispute = ! empty($payment->raw_payload['payment']['dispute'])
                || ($payment->raw_payload['payment']['status'] ?? '') === 'disputed';
        }
        $checks[] = [
            'code' => 'no_bank_dispute',
            'name' => 'No Open Bank Dispute',
            'passed' => ! $hasBankDispute,
            'message' => ! $hasBankDispute ? 'No open chargeback or bank dispute.' : 'A dispute is open with your bank for this payment.',
            'evidence' => ['has_bank_dispute' => $hasBankDispute],
        ];

        // If any global hard pre-check failed, return not_eligible immediately
        if (! $isSucceeded || ! $hasRefundableBalance || $hasOpenRequest || $isSuspended || $hasBankDispute) {
            $failCheck = collect($checks)->firstWhere('passed', false);

            return [
                'eligibility' => RefundRequest::ELIGIBILITY_NOT_ELIGIBLE,
                'eligible_amount_cents' => 0,
                'max_allowed_cents' => $maxAllowed,
                'reason_summary' => $failCheck['message'] ?? 'Not eligible for refund.',
                'checks' => $checks,
            ];
        }

        // --- 2. Reason-Specific Evaluation ---

        switch ($reasonType) {
            case RefundRequest::REASON_DUPLICATE_CHARGE:
                return $this->evaluateDuplicateCharge($payment, $invoice, $maxAllowed, $checks);

            case RefundRequest::REASON_CHARGED_AFTER_CANCELLATION:
                return $this->evaluateChargedAfterCancellation($payment, $invoice, $subscription, $maxAllowed, $checks);

            case RefundRequest::REASON_FIRST_PAYMENT_UNUSED:
                return $this->evaluateFirstPaymentUnused($payment, $tenantId, $paidAt, $asOf, $maxAllowed, $checks);

            case RefundRequest::REASON_BILLING_ERROR:
                return $this->evaluateBillingError($payment, $invoice, $subscription, $description, $maxAllowed, $checks);

            case RefundRequest::REASON_DOWNTIME:
                return $this->evaluateDowntime($payment, $tenantId, $invoice, $asOf, $maxAllowed, $checks);

            case RefundRequest::REASON_OTHER:
            default:
                return $this->evaluateOther($description, $requestedAmountCents, $maxAllowed, $checks);
        }
    }

    /**
     * Duplicate charge rule: Another successful payment exists for the same tenant and overlapping period.
     */
    protected function evaluateDuplicateCharge(
        PaymentTransaction $payment,
        ?SubscriptionInvoice $invoice,
        int $maxAllowed,
        array $checks
    ): array {
        $tenantId = $payment->tenant_id;
        $periodStart = $invoice?->period_start;
        $periodEnd = $invoice?->period_end;

        $duplicatePayment = null;

        if ($periodStart && $periodEnd) {
            $duplicatePayment = PaymentTransaction::where('tenant_id', $tenantId)
                ->where('id', '!=', $payment->id)
                ->where('status', PaymentTransaction::STATUS_SUCCEEDED)
                ->whereHas('invoice', function ($q) use ($periodStart, $periodEnd) {
                    $q->where('status', SubscriptionInvoice::STATUS_PAID)
                        ->where('period_start', '<', $periodEnd)
                        ->where('period_end', '>', $periodStart);
                })
                ->first();
        }

        $hasDuplicate = $duplicatePayment !== null;
        $checks[] = [
            'code' => 'overlapping_duplicate_payment',
            'name' => 'Overlapping Successful Payment Exists',
            'passed' => $hasDuplicate,
            'message' => $hasDuplicate
                ? "Duplicate payment detected (Transaction #{$duplicatePayment->id}, Invoice #{$duplicatePayment->invoice?->invoice_number})."
                : 'No overlapping successful payment was found for this billing period.',
            'evidence' => [
                'period_start' => $periodStart?->toIso8601String(),
                'period_end' => $periodEnd?->toIso8601String(),
                'duplicate_payment_id' => $duplicatePayment?->id,
                'duplicate_invoice_number' => $duplicatePayment?->invoice?->invoice_number,
            ],
        ];

        if ($hasDuplicate) {
            $eligibleAmount = min($payment->amount_cents, $maxAllowed);

            return [
                'eligibility' => RefundRequest::ELIGIBILITY_ELIGIBLE,
                'eligible_amount_cents' => $eligibleAmount,
                'max_allowed_cents' => $maxAllowed,
                'reason_summary' => 'Eligible for full refund of duplicate payment (Rs. '.number_format($eligibleAmount / 100, 2).').',
                'checks' => $checks,
            ];
        }

        return [
            'eligibility' => RefundRequest::ELIGIBILITY_NOT_ELIGIBLE,
            'eligible_amount_cents' => 0,
            'max_allowed_cents' => $maxAllowed,
            'reason_summary' => 'No overlapping duplicate payment found for this billing period.',
            'checks' => $checks,
        ];
    }

    /**
     * Charged after cancellation rule: payment.paid_at > subscription.cancelled_at.
     */
    protected function evaluateChargedAfterCancellation(
        PaymentTransaction $payment,
        ?SubscriptionInvoice $invoice,
        ?Subscription $subscription,
        int $maxAllowed,
        array $checks
    ): array {
        $cancelledAt = $subscription?->cancelled_at;
        $paidAt = $invoice?->paid_at ?? $payment->created_at;

        $hasCancellationDate = $cancelledAt !== null;
        $isPaidAfterCancellation = $hasCancellationDate && $paidAt && $paidAt->gt($cancelledAt);

        $checks[] = [
            'code' => 'subscription_cancelled',
            'name' => 'Subscription Cancelled On File',
            'passed' => $hasCancellationDate,
            'message' => $hasCancellationDate
                ? "Subscription was cancelled on {$cancelledAt->format('d M Y H:i')}."
                : 'No cancellation record found for this subscription.',
            'evidence' => ['cancelled_at' => $cancelledAt?->toIso8601String()],
        ];

        $checks[] = [
            'code' => 'paid_after_cancellation',
            'name' => 'Payment Occurred After Cancellation',
            'passed' => $isPaidAfterCancellation,
            'message' => $isPaidAfterCancellation
                ? "Payment occurred on {$paidAt?->format('d M Y H:i')}, after cancellation."
                : 'Payment occurred before cancellation date.',
            'evidence' => [
                'paid_at' => $paidAt?->toIso8601String(),
                'cancelled_at' => $cancelledAt?->toIso8601String(),
            ],
        ];

        if ($hasCancellationDate && $isPaidAfterCancellation) {
            $eligibleAmount = min($payment->amount_cents, $maxAllowed);

            return [
                'eligibility' => RefundRequest::ELIGIBILITY_ELIGIBLE,
                'eligible_amount_cents' => $eligibleAmount,
                'max_allowed_cents' => $maxAllowed,
                'reason_summary' => 'Eligible for full refund due to post-cancellation charge (Rs. '.number_format($eligibleAmount / 100, 2).').',
                'checks' => $checks,
            ];
        }

        return [
            'eligibility' => RefundRequest::ELIGIBILITY_NOT_ELIGIBLE,
            'eligible_amount_cents' => 0,
            'max_allowed_cents' => $maxAllowed,
            'reason_summary' => 'Payment occurred before subscription was cancelled, or subscription was not cancelled.',
            'checks' => $checks,
        ];
    }

    /**
     * First payment unused rule:
     * - First-ever successful payment for tenant
     * - Within 7 days of paid_at
     * - No bookings/tokens/appointments created since paid_at
     */
    protected function evaluateFirstPaymentUnused(
        PaymentTransaction $payment,
        string $tenantId,
        ?Carbon $paidAt,
        Carbon $asOf,
        int $maxAllowed,
        array $checks
    ): array {
        $priorSuccessfulCount = PaymentTransaction::where('tenant_id', $tenantId)
            ->where('status', PaymentTransaction::STATUS_SUCCEEDED)
            ->where('id', '<', $payment->id)
            ->count();

        $isFirstPayment = $priorSuccessfulCount === 0;
        $checks[] = [
            'code' => 'first_ever_payment',
            'name' => 'First-Ever Successful Payment',
            'passed' => $isFirstPayment,
            'message' => $isFirstPayment
                ? 'This is the clinic’s first-ever paid subscription.'
                : "Clinic has {$priorSuccessfulCount} earlier successful payment(s).",
            'evidence' => ['prior_successful_payments' => $priorSuccessfulCount],
        ];

        // 7-day window check
        $daysSincePayment = $paidAt ? (int) $paidAt->diffInDays($asOf, false) : 999;
        $isWithin7Days = $daysSincePayment >= 0 && $daysSincePayment <= 7;
        $checks[] = [
            'code' => 'within_7_days',
            'name' => 'Request Within 7 Days of Payment',
            'passed' => $isWithin7Days,
            'message' => $isWithin7Days
                ? "Requested {$daysSincePayment} day(s) after payment (policy limit: 7 days)."
                : "Requested {$daysSincePayment} day(s) after payment (exceeds 7-day policy limit).",
            'evidence' => [
                'paid_at' => $paidAt?->toIso8601String(),
                'as_of' => $asOf->toIso8601String(),
                'days_since_payment' => $daysSincePayment,
            ],
        ];

        // Zero clinic activity (bookings/tokens) since payment
        $bookingTokensCount = 0;
        if ($paidAt) {
            $bookingTokensCount = BookingToken::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $paidAt)
                ->count();
        }

        $hasNoUsage = $bookingTokensCount === 0;
        $checks[] = [
            'code' => 'no_clinic_usage',
            'name' => 'Zero Clinic Usage (Tokens & Bookings)',
            'passed' => $hasNoUsage,
            'message' => $hasNoUsage
                ? 'No patient bookings or tokens created since payment.'
                : "{$bookingTokensCount} booking token(s) or appointment(s) were created since payment.",
            'evidence' => ['bookings_created_since_payment' => $bookingTokensCount],
        ];

        if ($isFirstPayment && $isWithin7Days && $hasNoUsage) {
            $eligibleAmount = min($payment->amount_cents, $maxAllowed);

            return [
                'eligibility' => RefundRequest::ELIGIBILITY_ELIGIBLE,
                'eligible_amount_cents' => $eligibleAmount,
                'max_allowed_cents' => $maxAllowed,
                'reason_summary' => 'Eligible for full 7-day money-back guarantee (Rs. '.number_format($eligibleAmount / 100, 2).'). Subscription will end immediately.',
                'checks' => $checks,
            ];
        }

        return [
            'eligibility' => RefundRequest::ELIGIBILITY_NOT_ELIGIBLE,
            'eligible_amount_cents' => 0,
            'max_allowed_cents' => $maxAllowed,
            'reason_summary' => 'Not eligible under the 7-day first-payment guarantee (must be first payment, requested within 7 days, and have zero bookings).',
            'checks' => $checks,
        ];
    }

    /**
     * Billing error rule: Paid amount != plan price at the time of payment.
     * Always needs_review.
     */
    protected function evaluateBillingError(
        PaymentTransaction $payment,
        ?SubscriptionInvoice $invoice,
        ?Subscription $subscription,
        ?string $description,
        int $maxAllowed,
        array $checks
    ): array {
        $plan = $subscription?->plan;
        $expectedPriceCents = $plan?->price_cents ?? (int) config('medvisit.subscription.default_price_cents', 900000);
        $paidCents = $payment->amount_cents;

        $hasDiscrepancy = $paidCents !== $expectedPriceCents;
        $diffCents = abs($paidCents - $expectedPriceCents);

        $checks[] = [
            'code' => 'price_discrepancy',
            'name' => 'Paid Amount Matches Current Plan Price',
            'passed' => ! $hasDiscrepancy,
            'message' => $hasDiscrepancy
                ? 'Paid amount (Rs. '.number_format($paidCents / 100, 2).') differs from expected plan price (Rs. '.number_format($expectedPriceCents / 100, 2).').'
                : 'Paid amount matches standard plan price (Rs. '.number_format($expectedPriceCents / 100, 2).').',
            'evidence' => [
                'paid_cents' => $paidCents,
                'expected_price_cents' => $expectedPriceCents,
                'difference_cents' => $diffCents,
            ],
        ];

        $eligibleAmount = min($diffCents > 0 ? $diffCents : $payment->amount_cents, $maxAllowed);

        return [
            'eligibility' => RefundRequest::ELIGIBILITY_NEEDS_REVIEW,
            'eligible_amount_cents' => $eligibleAmount,
            'max_allowed_cents' => $maxAllowed,
            'reason_summary' => 'Billing error claims require administrative review to verify invoice and gateway records.',
            'checks' => $checks,
        ];
    }

    /**
     * Downtime rule:
     * - Incident affecting tenant
     * - Not planned maintenance
     * - Continuous duration > 48h
     * - Overlapping paid period
     * - Within 14 days of incident end
     * - Pro-rata: plan price / 30 * affected days (round up partial days)
     */
    protected function evaluateDowntime(
        PaymentTransaction $payment,
        string $tenantId,
        ?SubscriptionInvoice $invoice,
        Carbon $asOf,
        int $maxAllowed,
        array $checks
    ): array {
        $periodStart = $invoice?->period_start ?? $payment->created_at->copy()->startOfMonth();
        $periodEnd = $invoice?->period_end ?? $payment->created_at->copy()->endOfMonth();

        // Find incidents overlapping the period that were unplanned
        $incidents = PlatformIncident::where('is_planned_maintenance', false)
            ->where('started_at', '<', $periodEnd)
            ->where(function ($q) use ($periodStart) {
                $q->whereNull('ended_at')->orWhere('ended_at', '>', $periodStart);
            })
            ->get()
            ->filter(fn (PlatformIncident $inc) => $inc->affectsTenant($tenantId));

        $eligibleIncident = null;
        $affectedDays = 0;

        foreach ($incidents as $inc) {
            $end = $inc->ended_at ?? $asOf;
            $durationHours = $inc->started_at->diffInMinutes($end) / 60;

            // Continuous duration > 48h
            if ($durationHours <= 48) {
                continue;
            }

            // Request must be within 14 days of incident end
            $daysSinceEnd = (int) $end->diffInDays($asOf, false);
            if ($daysSinceEnd > 14 || $daysSinceEnd < 0) {
                continue;
            }

            // Calculate overlap with paid period
            $overlapStart = $inc->started_at->max($periodStart);
            $overlapEnd = $end->min($periodEnd);

            if ($overlapEnd->gt($overlapStart)) {
                $overlapHours = $overlapStart->diffInMinutes($overlapEnd) / 60;
                $affectedDays = (int) ceil($overlapHours / 24);
                $eligibleIncident = $inc;
                break;
            }
        }

        $hasQualifyingIncident = $eligibleIncident !== null;
        $checks[] = [
            'code' => 'unplanned_downtime_over_48h',
            'name' => 'Unplanned Service Disruption Exceeding 48 Hours',
            'passed' => $hasQualifyingIncident,
            'message' => $hasQualifyingIncident
                ? "Qualifying platform incident '{$eligibleIncident->title}' affected clinic for {$affectedDays} day(s)."
                : 'No unplanned platform incident exceeding 48 hours continuous duration was recorded for this period.',
            'evidence' => [
                'qualifying_incident_id' => $eligibleIncident?->id,
                'affected_days' => $affectedDays,
            ],
        ];

        if ($hasQualifyingIncident) {
            // Pro-rata: plan price / 30 * affected days (capped at payment amount and maxAllowed)
            $dailyRateCents = (int) round($payment->amount_cents / 30);
            $proratedCents = min($dailyRateCents * $affectedDays, $payment->amount_cents, $maxAllowed);

            $eligibility = $proratedCents >= $payment->amount_cents
                ? RefundRequest::ELIGIBILITY_ELIGIBLE
                : RefundRequest::ELIGIBILITY_PARTIALLY_ELIGIBLE;

            return [
                'eligibility' => $eligibility,
                'eligible_amount_cents' => $proratedCents,
                'max_allowed_cents' => $maxAllowed,
                'reason_summary' => 'Eligible for pro-rata downtime compensation of Rs. '.number_format($proratedCents / 100, 2)." ({$affectedDays} day(s)).",
                'checks' => $checks,
            ];
        }

        return [
            'eligibility' => RefundRequest::ELIGIBILITY_NOT_ELIGIBLE,
            'eligible_amount_cents' => 0,
            'max_allowed_cents' => $maxAllowed,
            'reason_summary' => 'Downtime refunds require an unplanned platform outage lasting more than 48 continuous hours within 14 days of incident end.',
            'checks' => $checks,
        ];
    }

    /**
     * Other custom reasons: Always needs_review, initial eligible amount is 0 until admin sets it.
     */
    protected function evaluateOther(
        ?string $description,
        ?int $requestedAmountCents,
        int $maxAllowed,
        array $checks
    ): array {
        $hasDescription = ! empty(trim((string) $description));
        $checks[] = [
            'code' => 'description_provided',
            'name' => 'Detailed Description Provided',
            'passed' => $hasDescription,
            'message' => $hasDescription
                ? 'Reason description provided for admin review.'
                : 'A description is required for custom refund requests.',
            'evidence' => ['description_length' => strlen(trim((string) $description))],
        ];

        $requestedCents = $requestedAmountCents ?? $maxAllowed;
        $eligibleAmount = min($requestedCents, $maxAllowed);

        return [
            'eligibility' => RefundRequest::ELIGIBILITY_NEEDS_REVIEW,
            'eligible_amount_cents' => 0, // Admin sets approved amount
            'max_allowed_cents' => $maxAllowed,
            'reason_summary' => 'Custom refund request will be reviewed by platform administration per our Dispute Policy.',
            'checks' => $checks,
        ];
    }
}
