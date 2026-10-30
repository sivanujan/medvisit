<?php

declare(strict_types=1);

namespace App\Services\Refunds;

use App\Contracts\RefundProcessor;
use App\Mail\Subscription\RefundCompletedMail;
use App\Models\PaymentTransaction;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\TemplatePurchase;
use App\Services\AuditLogger;
use App\Services\Billing\CreditNotePdfService;
use App\Services\SequenceService;
use App\Services\Templates\TemplateService;
use App\Support\ClinicWebsite;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class ManualRefundProcessor implements RefundProcessor
{
    public function __construct(
        protected SequenceService $sequenceService,
        protected CreditNotePdfService $pdfService,
        protected AuditLogger $auditLogger
    ) {}

    /**
     * Atomically process and finalize an approved refund.
     */
    public function process(RefundRequest $refundRequest, array $context): RefundRequest
    {
        return DB::transaction(function () use ($refundRequest, $context) {
            /** @var RefundRequest $lockedRequest */
            $lockedRequest = RefundRequest::where('id', $refundRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedRequest->status, [RefundRequest::STATUS_APPROVED, RefundRequest::STATUS_PROCESSING], true)) {
                throw new RuntimeException("Cannot process refund in '{$lockedRequest->status}' status. Must be approved first.");
            }

            /** @var PaymentTransaction $payment */
            $payment = PaymentTransaction::where('id', $lockedRequest->payment_id)
                ->lockForUpdate()
                ->firstOrFail();

            $approvedAmountCents = $lockedRequest->approved_amount_cents ?? $lockedRequest->eligible_amount_cents;
            $maxAllowed = max(0, $payment->amount_cents - $payment->refunded_amount_cents);

            if ($approvedAmountCents > $maxAllowed) {
                throw new RuntimeException('Approved refund amount of Rs. '.number_format($approvedAmountCents / 100, 2).' exceeds maximum refundable balance of Rs. '.number_format($maxAllowed / 100, 2).'.');
            }

            // 1. Assign atomic Credit Note Number if not already assigned
            $year = (int) Carbon::now('Asia/Colombo')->year;
            if (empty($lockedRequest->credit_note_number)) {
                $last = RefundRequest::where('credit_note_number', 'LIKE', "CN-{$year}-%")
                    ->lockForUpdate()
                    ->orderByDesc('id')
                    ->first();

                $seq = 1;
                if ($last && preg_match('/CN-\d{4}-(\d+)/', $last->credit_note_number, $matches)) {
                    $seq = ((int) $matches[1]) + 1;
                }

                $lockedRequest->credit_note_number = sprintf('CN-%04d-%06d', $year, $seq);
            }

            // 2. Update Refund Request
            $oldStatus = $lockedRequest->status;
            $lockedRequest->status = RefundRequest::STATUS_REFUNDED;
            $lockedRequest->refund_method = $context['method'] ?? RefundRequest::METHOD_PAYMENTS_LK_DASHBOARD;
            $lockedRequest->refund_reference = $context['reference'];
            $lockedRequest->refunded_at = Carbon::now('Asia/Colombo');

            if (! empty($context['admin_note'])) {
                $lockedRequest->admin_note = trim(($lockedRequest->admin_note ? $lockedRequest->admin_note."\n\n" : '').$context['admin_note']);
            }

            $lockedRequest->save();

            // 3. Update Payment Transaction refunded amount
            $payment->refunded_amount_cents += $approvedAmountCents;
            $payment->save();

            // 4. Subscription effects
            $invoice = $payment->invoice;
            $subscription = $invoice?->subscription ?? Subscription::where('tenant_id', $lockedRequest->tenant_id)->latest('id')->first();
            $tenant = $lockedRequest->tenant;

            $shouldCancelPlan = ($context['cancel_subscription'] ?? true)
                && $lockedRequest->reason_type !== RefundRequest::REASON_TEMPLATE_PURCHASE;

            if ($subscription && $shouldCancelPlan) {
                $reasonLabel = $lockedRequest->decision_reason ?: match ($lockedRequest->reason_type) {
                    RefundRequest::REASON_FIRST_PAYMENT_UNUSED => 'First payment refunded under 7-day guarantee',
                    RefundRequest::REASON_CHARGED_AFTER_CANCELLATION => 'Refunded after cancellation',
                    default => 'Subscription payment refunded',
                };

                // End subscription and access now
                $subscription->update([
                    'status' => Subscription::STATUS_CANCELLED,
                    'cancelled_at' => Carbon::now('Asia/Colombo'),
                    'current_period_end' => Carbon::now('Asia/Colombo'),
                    'cancellation_reason' => $reasonLabel,
                ]);

                if ($tenant) {
                    $tenant->update(['status' => 'expired']);
                }
            }

            if ($lockedRequest->reason_type === RefundRequest::REASON_TEMPLATE_PURCHASE) {
                $purchase = TemplatePurchase::where('payment_transaction_id', $payment->id)
                    ->orWhere('invoice_id', $invoice?->id)
                    ->first();

                if ($purchase) {
                    $purchase->update([
                        'status' => TemplatePurchase::STATUS_REFUNDED,
                        'refunded_at' => Carbon::now('Asia/Colombo'),
                        'revoked_at' => Carbon::now('Asia/Colombo'),
                        'revoked_reason' => 'Refund processed under 7-day unpublished guarantee',
                    ]);

                    if ($tenant && (int) $tenant->applied_template_id === (int) $purchase->template_id) {
                        app(TemplateService::class)->revertToPreviousDesign($tenant);
                        ClinicWebsite::publish($tenant);
                    }
                }
            }

            // 5. Audit Logging
            try {
                AuditLogger::log('subscription.refund_processed', [
                    'tenant_id' => $lockedRequest->tenant_id,
                    'resource' => $lockedRequest,
                    'user_id' => $context['admin_id'] ?? null,
                    'metadata' => [
                        'refund_request_id' => $lockedRequest->id,
                        'credit_note_number' => $lockedRequest->credit_note_number,
                        'payment_id' => $payment->id,
                        'amount_cents' => $approvedAmountCents,
                        'method' => $lockedRequest->refund_method,
                        'reference' => $lockedRequest->refund_reference,
                        'old_status' => $oldStatus,
                        'new_status' => RefundRequest::STATUS_REFUNDED,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning("Could not write refund audit log: {$e->getMessage()}");
            }

            // 6. Send Refund Completed Email with Credit Note PDF
            $clinicEmail = $tenant?->billingDetail?->billing_email
                ?? $lockedRequest->requestedBy?->email
                ?? $tenant?->email
                ?? $tenant?->users()->whereHas('roles', fn ($q) => $q->where('name', 'clinic_admin'))->value('email');

            if ($clinicEmail) {
                try {
                    $pdfBinary = $this->pdfService->generatePdf($lockedRequest);
                    Mail::to($clinicEmail)->send(new RefundCompletedMail($lockedRequest, $pdfBinary));
                } catch (\Throwable $e) {
                    Log::warning("Could not dispatch refund completed email: {$e->getMessage()}");
                }
            }

            return $lockedRequest;
        });
    }
}
