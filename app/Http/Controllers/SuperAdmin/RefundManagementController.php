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
            $query->where('status', $status);
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
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'decision_reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $approvedAmount = (int) $request->input('approved_amount_cents');
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
            'eligibility' => $eval['eligibility'],
            'eligibility_checks' => $eval['checks'],
            'admin_note' => $adminNote ? trim(($refundRequest->admin_note ? $refundRequest->admin_note."\n\n" : '').$adminNote) : $refundRequest->admin_note,
            'decision_reason' => $decisionReason,
            'decided_by_admin_id' => auth()->id(),
            'decided_at' => Carbon::now('Asia/Colombo'),
        ]);

        // Send approval email to clinic
        $tenant = $refundRequest->tenant;
        $clinicEmail = $tenant?->billingDetail?->billing_email ?? $refundRequest->requestedBy?->email;
        $billingUrl = $tenant ? $tenant->url('/settings/billing') : url('/login');

        if ($clinicEmail) {
            try {
                Mail::to($clinicEmail)->send(new RefundApprovedMail(
                    $refundRequest,
                    $tenant?->name ?? 'Clinic',
                    $billingUrl
                ));
            } catch (\Throwable $e) {
                Log::warning("Failed to dispatch refund approval email: {$e->getMessage()}");
            }
        }

        return back()->with('success', 'Refund of Rs. '.number_format($approvedAmount / 100, 2).' approved. You can now execute and mark it as refunded.');
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
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'cancel_subscription' => ['nullable', 'boolean'],
        ]);

        try {
            $this->refundProcessor->process($refundRequest, [
                'method' => (string) $request->input('refund_method'),
                'reference' => (string) $request->input('refund_reference'),
                'admin_id' => auth()->id(),
                'admin_note' => $request->input('admin_note'),
                'cancel_subscription' => $request->boolean('cancel_subscription', true),
            ]);

            return back()->with('success', "Refund completed successfully. Credit Note {$refundRequest->credit_note_number} generated.");
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
