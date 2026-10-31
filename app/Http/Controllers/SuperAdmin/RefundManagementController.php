<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Contracts\RefundProcessor;
use App\Http\Controllers\Controller;
use App\Mail\Subscription\RefundApprovedMail;
use App\Mail\Subscription\RefundRejectedMail;
use App\Models\BookingToken;
use App\Models\PaymentTransaction;
use App\Models\PlatformIncident;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Services\AuditLogger;
use App\Services\Billing\CreditNotePdfService;
use App\Services\Refunds\RefundEligibilityService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class RefundManagementController extends Controller
{
    public function __construct(
        protected RefundEligibilityService $eligibilityService,
        protected RefundProcessor $refundProcessor,
        protected CreditNotePdfService $pdfService,
        protected AuditLogger $auditLogger
    ) {}

    /**
     * Display listing of refund requests with filters, SLA indicators, and KPI badges.
     */
    public function index(Request $request): InertiaResponse
    {
        $status = $request->query('status');
        $reason = $request->query('reason');
        $search = $request->query('search');

        $query = RefundRequest::with(['tenant', 'payment.invoice', 'requestedBy', 'decidedBy'])
            ->latest('id');

        if ($status) {
            if ($status === 'approved' || $status === 'approved_waiting') {
                $query->whereIn('status', [RefundRequest::STATUS_APPROVED, RefundRequest::STATUS_PROCESSING]);
            } else {
                $query->where('status', $status);
            }
        }

        if ($reason) {
            $query->where('reason_type', $reason);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $term = "%{$search}%";
                $q->where('public_id', 'ILIKE', $term)
                    ->orWhere('credit_note_number', 'ILIKE', $term)
                    ->orWhereHas('tenant', fn ($tq) => $tq->where('name', 'ILIKE', $term)->orWhere('id', 'ILIKE', $term))
                    ->orWhereHas('payment.invoice', fn ($iq) => $iq->where('invoice_number', 'ILIKE', $term)->orWhere('receipt_number', 'ILIKE', $term));
            });
        }

        $now = Carbon::now('Asia/Colombo');

        $refunds = $query->paginate(15)->withQueryString()->through(function (RefundRequest $r) use ($now) {
            $isOverdueDecision = $r->isPendingReview() && $r->created_at->diffInWeekdays($now) >= 2;
            $isOverdueExecution = in_array($r->status, [RefundRequest::STATUS_APPROVED, RefundRequest::STATUS_PROCESSING], true)
                && $r->decided_at && $r->decided_at->diffInWeekdays($now) >= 5;

            return [
                'id' => $r->id,
                'public_id' => $r->public_id,
                'tenant' => [
                    'id' => $r->tenant?->id,
                    'name' => $r->tenant?->name ?? 'Clinic',
                ],
                'reason_type' => $r->reason_type,
                'reason_label' => ucfirst(str_replace('_', ' ', $r->reason_type)),
                'requested_amount_cents' => $r->requested_amount_cents,
                'formatted_requested_amount' => $r->formatted_requested_amount,
                'eligible_amount_cents' => $r->eligible_amount_cents,
                'formatted_eligible_amount' => $r->formatted_eligible_amount,
                'approved_amount_cents' => $r->approved_amount_cents,
                'formatted_approved_amount' => $r->formatted_approved_amount,
                'eligibility' => $r->eligibility,
                'status' => $r->status,
                'status_label' => match ($r->status) {
                    RefundRequest::STATUS_APPROVED => 'Approved — waiting for refund',
                    RefundRequest::STATUS_REFUNDED => 'Refunded',
                    RefundRequest::STATUS_PROCESSING => 'Processing refund',
                    RefundRequest::STATUS_UNDER_REVIEW => 'Under review',
                    RefundRequest::STATUS_REQUESTED => 'Requested',
                    RefundRequest::STATUS_REJECTED => 'Rejected',
                    RefundRequest::STATUS_CANCELLED_BY_CLINIC => 'Withdrawn',
                    default => ucfirst(str_replace('_', ' ', $r->status)),
                },
                'credit_note_number' => $r->credit_note_number,
                'created_at' => $r->created_at->toIso8601String(),
                'created_at_human' => $r->created_at->diffForHumans(),
                'is_overdue' => $isOverdueDecision || $isOverdueExecution,
                'overdue_type' => $isOverdueDecision ? 'decision' : ($isOverdueExecution ? 'execution' : null),
                'invoice_number' => $r->payment?->invoice?->invoice_number,
                'receipt_number' => $r->payment?->invoice?->receipt_number,
            ];
        });

        // Compute KPI summary badges
        $counts = [
            'total' => RefundRequest::count(),
            'needs_action' => RefundRequest::whereIn('status', [RefundRequest::STATUS_REQUESTED, RefundRequest::STATUS_UNDER_REVIEW])->count(),
            'processing' => RefundRequest::whereIn('status', [RefundRequest::STATUS_APPROVED, RefundRequest::STATUS_PROCESSING])->count(),
            'refunded' => RefundRequest::where('status', RefundRequest::STATUS_REFUNDED)->count(),
            'rejected' => RefundRequest::where('status', RefundRequest::STATUS_REJECTED)->count(),
        ];

        return Inertia::render('SuperAdmin/Refunds/Index', [
            'refunds' => $refunds,
            'filters' => [
                'status' => $status,
                'reason' => $reason,
                'search' => $search,
            ],
            'counts' => $counts,
        ]);
    }

    protected function resolveRefundRequest(Request $request): RefundRequest
    {
        $param = $request->route('refundRequest');

        return $param instanceof RefundRequest ? $param : RefundRequest::findOrFail($param);
    }

    /**
     * Show detailed view of a refund request.
     */
    public function show(Request $request): InertiaResponse
    {
        $refundRequest = $this->resolveRefundRequest($request);

        $refundRequest->load([
            'tenant.billingDetail',
            'payment.invoice.subscription.plan',
            'requestedBy',
            'decidedBy',
        ]);

        $tenant = $refundRequest->tenant;
        $payment = $refundRequest->payment;
        $invoice = $payment?->invoice;
        $subscription = $invoice?->subscription ?? $tenant?->subscription;
        $plan = $subscription?->plan;

        // Clinic usage since payment was made
        $paidAt = $invoice?->paid_at ?? $payment?->created_at;
        $usageCount = 0;
        if ($paidAt && $tenant) {
            $usageCount = BookingToken::where('tenant_id', $tenant->id)
                ->where('created_at', '>=', $paidAt)
                ->count();
        }

        // Clinic payment history
        $paymentHistory = PaymentTransaction::where('tenant_id', $refundRequest->tenant_id)
            ->with('invoice')
            ->latest('id')
            ->take(10)
            ->get()
            ->map(fn (PaymentTransaction $p) => [
                'id' => $p->id,
                'invoice_number' => $p->invoice?->invoice_number,
                'receipt_number' => $p->invoice?->receipt_number,
                'amount_cents' => $p->amount_cents,
                'formatted_amount' => $p->formatted_amount,
                'status' => $p->status,
                'refund_status' => $p->refund_status,
                'refunded_amount_cents' => $p->refunded_amount_cents,
                'created_at' => $p->created_at->format('d M Y H:i'),
                'card_last4' => $p->card_last4,
                'card_scheme' => $p->card_scheme,
            ]);

        // Related platform incidents overlapping the payment period
        $periodStart = $invoice?->period_start ?? $payment?->created_at?->copy()->startOfMonth();
        $periodEnd = $invoice?->period_end ?? $payment?->created_at?->copy()->endOfMonth();
        $relatedIncidents = PlatformIncident::where('started_at', '<', $periodEnd)
            ->where(function ($q) use ($periodStart) {
                $q->whereNull('ended_at')->orWhere('ended_at', '>', $periodStart);
            })
            ->get()
            ->filter(fn (PlatformIncident $inc) => $inc->affectsTenant($refundRequest->tenant_id))
            ->values()
            ->map(fn (PlatformIncident $inc) => [
                'id' => $inc->id,
                'title' => $inc->title,
                'started_at' => $inc->started_at->toIso8601String(),
                'ended_at' => $inc->ended_at?->toIso8601String(),
                'duration_hours' => $inc->duration_hours,
                'is_planned_maintenance' => $inc->is_planned_maintenance,
                'notes' => $inc->notes,
            ]);

        $maxRefundableCents = max(0, ($payment->amount_cents ?? 0) - ($payment->refunded_amount_cents ?? 0));

        return Inertia::render('SuperAdmin/Refunds/Show', [
            'refundRequest' => [
                'id' => $refundRequest->id,
                'public_id' => $refundRequest->public_id,
                'tenant_id' => $refundRequest->tenant_id,
                'reason_type' => $refundRequest->reason_type,
                'reason_label' => ucfirst(str_replace('_', ' ', $refundRequest->reason_type)),
                'description' => $refundRequest->description,
                'requested_amount_cents' => $refundRequest->requested_amount_cents,
                'formatted_requested_amount' => $refundRequest->formatted_requested_amount,
                'eligible_amount_cents' => $refundRequest->eligible_amount_cents,
                'formatted_eligible_amount' => $refundRequest->formatted_eligible_amount,
                'approved_amount_cents' => $refundRequest->approved_amount_cents,
                'formatted_approved_amount' => $refundRequest->formatted_approved_amount,
                'eligibility' => $refundRequest->eligibility,
                'eligibility_checks' => $refundRequest->eligibility_checks,
                'status' => $refundRequest->status,
                'status_label' => match ($refundRequest->status) {
                    RefundRequest::STATUS_APPROVED => 'Approved — waiting for refund',
                    RefundRequest::STATUS_REFUNDED => 'Refunded',
                    RefundRequest::STATUS_PROCESSING => 'Processing refund',
                    RefundRequest::STATUS_UNDER_REVIEW => 'Under review',
                    RefundRequest::STATUS_REQUESTED => 'Requested',
                    RefundRequest::STATUS_REJECTED => 'Rejected',
                    RefundRequest::STATUS_CANCELLED_BY_CLINIC => 'Withdrawn',
                    default => ucfirst(str_replace('_', ' ', $refundRequest->status)),
                },
                'refund_type' => $refundRequest->refund_type ?? ($refundRequest->approved_amount_cents && $refundRequest->approved_amount_cents < ($payment->amount_cents ?? 0) ? RefundRequest::TYPE_PARTIAL : RefundRequest::TYPE_FULL),
                'admin_note' => $refundRequest->admin_note,
                'decision_reason' => $refundRequest->decision_reason,
                'decided_at' => $refundRequest->decided_at?->format('d M Y H:i'),
                'decided_by' => $refundRequest->decidedBy?->name,
                'refund_method' => $refundRequest->refund_method,
                'refund_reference' => $refundRequest->refund_reference,
                'refunded_at' => $refundRequest->refunded_at?->format('d M Y H:i'),
                'credit_note_number' => $refundRequest->credit_note_number,
                'created_at' => $refundRequest->created_at->format('d M Y H:i'),
                'created_at_human' => $refundRequest->created_at->diffForHumans(),
                'requested_by_name' => $refundRequest->requestedBy?->name ?? 'Clinic Owner',
                'requested_by_email' => $refundRequest->requestedBy?->email,
            ],
            'clinic' => [
                'id' => $tenant?->id,
                'name' => $tenant?->name,
                'subdomain' => $tenant?->subdomain,
                'status' => $tenant?->status,
                'email' => $tenant?->billingDetail?->billing_email ?? $tenant?->email,
                'phone' => $tenant?->billingDetail?->phone ?? $tenant?->phone,
                'address' => $tenant?->billingDetail?->address ?? $tenant?->address,
                'legal_name' => $tenant?->billingDetail?->legal_name,
                'tax_id' => $tenant?->billingDetail?->tax_id,
            ],
            'payment' => [
                'id' => $payment?->id,
                'amount_cents' => $payment?->amount_cents,
                'formatted_amount' => $payment?->formatted_amount,
                'refunded_amount_cents' => $payment?->refunded_amount_cents,
                'formatted_refunded_amount' => $payment?->formatted_refunded_amount,
                'max_refundable_cents' => $maxRefundableCents,
                'status' => $payment?->status,
                'refund_status' => $payment?->refund_status,
                'paid_at' => $paidAt?->format('d M Y H:i'),
                'period_start' => $invoice?->period_start?->format('d M Y'),
                'period_end' => $invoice?->period_end?->format('d M Y'),
                'invoice_number' => $invoice?->invoice_number,
                'receipt_number' => $invoice?->receipt_number,
                'gateway' => $payment?->gateway,
                'gateway_checkout_id' => $payment?->gateway_checkout_id,
                'gateway_payment_id' => $payment?->gateway_payment_id,
                'card_last4' => $payment?->card_last4,
                'card_scheme' => $payment?->card_scheme,
                'plan_name' => $plan?->name,
            ],
            'usageCount' => $usageCount,
            'relatedIncidents' => $relatedIncidents,
            'paymentHistory' => $paymentHistory,
        ]);
    }

    /**
     * Re-run automated eligibility evaluation on demand.
     */
    public function recheck(Request $request): RedirectResponse
    {
        $refundRequest = $this->resolveRefundRequest($request);
        $payment = $refundRequest->payment;
        $eval = $this->eligibilityService->evaluate(
            $payment,
            $refundRequest->reason_type,
            $refundRequest->description,
            $refundRequest->requested_amount_cents,
            null,
            $refundRequest->id
        );

        $refundRequest->update([
            'eligibility' => $eval['eligibility'],
            'eligible_amount_cents' => $eval['eligible_amount_cents'],
            'eligibility_checks' => $eval['checks'],
        ]);

        return back()->with('success', 'Eligibility checks re-evaluated with current data.');
    }

    /**
     * Approve a refund request.
     */
    public function approve(Request $request): RedirectResponse
    {
        $refundRequest = $this->resolveRefundRequest($request);

        if (! in_array($refundRequest->status, [RefundRequest::STATUS_REQUESTED, RefundRequest::STATUS_UNDER_REVIEW], true)) {
            return back()->with('error', "Cannot approve a request with status '{$refundRequest->status}'.");
        }

        $payment = $refundRequest->payment;
        $maxAllowed = max(0, $payment->amount_cents - $payment->refunded_amount_cents);

        $request->validate([
            'approved_amount_cents' => ['required', 'integer', 'min:1', "max:{$maxAllowed}"],
            'refund_type' => ['nullable', 'string', 'in:full,partial'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'decision_reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $approvedAmount = (int) $request->input('approved_amount_cents');
        $refundType = $request->input('refund_type') ?: ($approvedAmount < ($payment->amount_cents ?? 0) ? RefundRequest::TYPE_PARTIAL : RefundRequest::TYPE_FULL);
        $adminNote = $request->input('admin_note');
        $decisionReason = $request->input('decision_reason');

        // Re-check eligibility before approval
        $eval = $this->eligibilityService->evaluate(
            $payment,
            $refundRequest->reason_type,
            $refundRequest->description,
            $approvedAmount,
            null,
            $refundRequest->id
        );

        $refundRequest->update([
            'status' => RefundRequest::STATUS_APPROVED,
            'approved_amount_cents' => $approvedAmount,
            'refund_type' => $refundType,
            'eligibility' => $eval['eligibility'],
            'eligibility_checks' => $eval['checks'],
            'admin_note' => $adminNote ? trim(($refundRequest->admin_note ? $refundRequest->admin_note."\n\n" : '').$adminNote) : $refundRequest->admin_note,
            'decision_reason' => $decisionReason,
            'decided_by_admin_id' => auth()->id(),
            'decided_at' => Carbon::now('Asia/Colombo'),
        ]);

        // Cancel subscription and revoke clinic workspace access ONLY for full refunds
        // Partial refunds / service credits (e.g. downtime compensation) keep subscription and clinic access ACTIVE
        $payment = $refundRequest->payment;
        $invoice = $payment?->invoice;
        $subscription = $invoice?->subscription ?? Subscription::where('tenant_id', $refundRequest->tenant_id)->latest('id')->first();
        $tenant = $refundRequest->tenant;

        if ($refundType === RefundRequest::TYPE_FULL && $subscription && $refundRequest->reason_type !== RefundRequest::REASON_TEMPLATE_PURCHASE) {
            $reasonLabel = $decisionReason ?: match ($refundRequest->reason_type) {
                RefundRequest::REASON_FIRST_PAYMENT_UNUSED => 'First payment refunded under 7-day guarantee',
                RefundRequest::REASON_CHARGED_AFTER_CANCELLATION => 'Refunded after cancellation',
                default => 'Subscription payment refunded',
            };

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

        // Audit Log Step 1: Approve Refund (Decision recorded, waiting for manual Payments.lk refund)
        try {
            AuditLogger::log('subscription.refund_approved', [
                'tenant_id' => $refundRequest->tenant_id,
                'resource' => $refundRequest,
                'user_id' => auth()->id(),
                'metadata' => [
                    'step' => 'step_1_approve',
                    'refund_request_id' => $refundRequest->id,
                    'approved_amount_cents' => $approvedAmount,
                    'refund_type' => $refundType,
                    'decision_reason' => $decisionReason,
                    'status' => RefundRequest::STATUS_APPROVED,
                    'status_label' => 'Approved — waiting for refund',
                    'note' => $refundType === RefundRequest::TYPE_FULL
                        ? 'Approved full refund by super admin; waiting for manual Payments.lk dashboard refund. Clinic workspace access ended.'
                        : 'Approved partial refund / service credit by super admin; waiting for manual Payments.lk dashboard refund. Clinic workspace access kept active.',
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning("Could not write refund approval audit log: {$e->getMessage()}");
        }

        // NOTE: NO email sent to clinic yet in Step 1.
        // RefundApprovedMail is sent in Step 2 when the refund is executed in Payments.lk and marked completed.

        $accessMsg = $refundType === RefundRequest::TYPE_FULL
            ? 'Clinic workspace access has ended.'
            : 'Clinic workspace access remains active (partial refund / service credit).';

        return back()->with('success', 'Refund of Rs. '.number_format($approvedAmount / 100, 2).' approved — waiting for manual Payments.lk refund. '.$accessMsg);
    }

    /**
     * Reject a refund request.
     */
    public function reject(Request $request): RedirectResponse
    {
        $refundRequest = $this->resolveRefundRequest($request);

        if (! in_array($refundRequest->status, [RefundRequest::STATUS_REQUESTED, RefundRequest::STATUS_UNDER_REVIEW], true)) {
            return back()->with('error', "Cannot reject a request with status '{$refundRequest->status}'.");
        }

        $request->validate([
            'decision_reason' => ['required', 'string', 'min:5', 'max:2000'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $decisionReason = (string) $request->input('decision_reason');
        $adminNote = $request->input('admin_note');

        $refundRequest->update([
            'status' => RefundRequest::STATUS_REJECTED,
            'decision_reason' => $decisionReason,
            'admin_note' => $adminNote ? trim(($refundRequest->admin_note ? $refundRequest->admin_note."\n\n" : '').$adminNote) : $refundRequest->admin_note,
            'decided_by_admin_id' => auth()->id(),
            'decided_at' => Carbon::now('Asia/Colombo'),
        ]);

        // Send rejection email to clinic
        $tenant = $refundRequest->tenant;
        $clinicEmail = $tenant?->billingDetail?->billing_email ?? $refundRequest->requestedBy?->email;
        $disputePolicyUrl = url('/refund-policy#disputes');

        if ($clinicEmail) {
            try {
                Mail::to($clinicEmail)->send(new RefundRejectedMail(
                    $refundRequest,
                    $tenant?->name ?? 'Clinic',
                    $decisionReason,
                    $disputePolicyUrl
                ));
            } catch (\Throwable $e) {
                Log::warning("Failed to dispatch refund rejection email: {$e->getMessage()}");
            }
        }

        return back()->with('success', 'Refund request rejected and clinic notified.');
    }

    /**
     * Process / Mark as refunded after executing in merchant dashboard or via bank transfer.
     */
    public function process(Request $request): RedirectResponse
    {
        $refundRequest = $this->resolveRefundRequest($request);

        $request->validate([
            'refund_method' => ['required', 'string', 'in:payments_lk_dashboard,bank_transfer,api'],
            'refund_reference' => ['required', 'string', 'min:3', 'max:100'],
            'refund_date' => ['required', 'date'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'cancel_subscription' => ['nullable', 'boolean'],
        ]);

        try {
            $this->refundProcessor->process($refundRequest, [
                'method' => (string) $request->input('refund_method'),
                'reference' => (string) $request->input('refund_reference'),
                'refund_date' => (string) $request->input('refund_date'),
                'admin_id' => auth()->id(),
                'admin_note' => $request->input('admin_note'),
                'cancel_subscription' => $request->boolean('cancel_subscription', true),
            ]);

            return back()->with('success', "Refund completed successfully. Credit Note {$refundRequest->credit_note_number} generated and clinic notified.");
        } catch (\Throwable $e) {
            return back()->with('error', "Refund processing failed: {$e->getMessage()}");
        }
    }

    /**
     * Download or stream the Credit Note PDF.
     */
    public function downloadCreditNote(Request $request): Response
    {
        $refundRequest = $this->resolveRefundRequest($request);

        if (empty($refundRequest->credit_note_number)) {
            abort(404, 'Credit note has not been issued yet for this request.');
        }

        return $this->pdfService->downloadResponse($refundRequest);
    }
}
