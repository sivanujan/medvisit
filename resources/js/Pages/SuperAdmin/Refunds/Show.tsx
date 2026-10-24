import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    RotateCcw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    FileText,
    CreditCard,
    Building2,
    Calendar,
    ArrowLeft,
    RefreshCw,
    Download,
    ExternalLink,
    ShieldAlert,
    Check,
    HelpCircle,
    Info,
} from 'lucide-react';
import GlassModal from '@/Components/UI/GlassModal';

interface Props {
    refundRequest: {
        id: number;
        public_id: string;
        tenant_id: string;
        reason_type: string;
        reason_label: string;
        description: string | null;
        requested_amount_cents: number;
        formatted_requested_amount: string;
        eligible_amount_cents: number;
        formatted_eligible_amount: string;
        approved_amount_cents: number | null;
        formatted_approved_amount: string | null;
        eligibility: 'eligible' | 'partially_eligible' | 'not_eligible' | 'needs_review';
        eligibility_checks: Array<{
            code: string;
            name: string;
            passed: boolean;
            message: string;
            evidence: Record<string, any>;
        }>;
        status: string;
        admin_note: string | null;
        decision_reason: string | null;
        decided_at: string | null;
        decided_by: string | null;
        refund_method: string | null;
        refund_reference: string | null;
        refunded_at: string | null;
        credit_note_number: string | null;
        created_at: string;
        created_at_human: string;
        requested_by_name: string;
        requested_by_email: string | null;
    };
    clinic: {
        id: string;
        name: string;
        subdomain: string;
        status: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        legal_name: string | null;
        tax_id: string | null;
    };
    payment: {
        id: number;
        amount_cents: number;
        formatted_amount: string;
        refunded_amount_cents: number;
        formatted_refunded_amount: string;
        max_refundable_cents: number;
        status: string;
        refund_status: string;
        paid_at: string | null;
        period_start: string | null;
        period_end: string | null;
        invoice_number: string | null;
        receipt_number: string | null;
        gateway: string;
        gateway_checkout_id: string | null;
        gateway_payment_id: string | null;
        card_last4: string | null;
        card_scheme: string | null;
        plan_name: string | null;
    };
    usageCount: number;
    relatedIncidents: Array<{
        id: number;
        title: string;
        started_at: string;
        ended_at: string | null;
        duration_hours: number;
        is_planned_maintenance: boolean;
        notes: string | null;
    }>;
    paymentHistory: Array<{
        id: number;
        invoice_number: string | null;
        receipt_number: string | null;
        amount_cents: number;
        formatted_amount: string;
        status: string;
        refund_status: string;
        refunded_amount_cents: number;
        created_at: string;
        card_last4: string | null;
        card_scheme: string | null;
    }>;
}

export default function RefundsShow({
    refundRequest,
    clinic,
    payment,
    usageCount,
    relatedIncidents,
    paymentHistory,
}: Props) {
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [isRechecking, setIsRechecking] = useState(false);

    const approveForm = useForm({
        approved_amount_cents: refundRequest.eligible_amount_cents > 0 ? refundRequest.eligible_amount_cents : payment.max_refundable_cents,
        admin_note: '',
        decision_reason: '',
    });

    const rejectForm = useForm({
        decision_reason: '',
        admin_note: '',
    });

    const processForm = useForm({
        refund_method: 'payments_lk_dashboard',
        refund_reference: '',
        admin_note: '',
    });

    const handleRecheck = () => {
        setIsRechecking(true);
        router.post(`/super-admin/refunds/${refundRequest.id}/recheck`, {}, {
            onFinish: () => setIsRechecking(false),
        });
    };

    const handleApprove = (e: React.FormEvent) => {
        e.preventDefault();
        approveForm.post(`/super-admin/refunds/${refundRequest.id}/approve`, {
            onSuccess: () => setShowApproveModal(false),
        });
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(`/super-admin/refunds/${refundRequest.id}/reject`, {
            onSuccess: () => setShowRejectModal(false),
        });
    };

    const handleProcess = (e: React.FormEvent) => {
        e.preventDefault();
        processForm.post(`/super-admin/refunds/${refundRequest.id}/process`, {
            onSuccess: () => setShowProcessModal(false),
        });
    };

    return (
        <PlatformLayout>
            <Head title={`Refund ${refundRequest.public_id} - Super Admin`} />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Back Link & Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/super-admin/refunds"
                            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                                    Refund Request <code className="text-[#1E6FD9] dark:text-blue-400">{refundRequest.public_id}</code>
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                    refundRequest.status === 'refunded'
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : refundRequest.status === 'approved'
                                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                        : refundRequest.status === 'rejected'
                                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}>
                                    {refundRequest.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Submitted {refundRequest.created_at} by {refundRequest.requested_by_name} ({clinic.name})
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {refundRequest.credit_note_number && (
                            <a
                                href={`/super-admin/refunds/${refundRequest.id}/credit-note`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download Credit Note ({refundRequest.credit_note_number})
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={handleRecheck}
                            disabled={isRechecking}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                            Re-run Eligibility Engine
                        </button>
                    </div>
                </div>

                {/* Main 2-Column Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (8 cols): Eligibility Checks, Usage, Incidents, Notes */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* 1. Automated Eligibility Engine Card */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-[#0E9E8F]/10 text-[#0E9E8F] dark:bg-[#0E9E8F]/20">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Automated Policy Eligibility
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Evaluated strictly against MedVisit's published Refund Policy
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        refundRequest.eligibility === 'eligible'
                                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                            : refundRequest.eligibility === 'partially_eligible'
                                            ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20'
                                            : refundRequest.eligibility === 'needs_review'
                                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                    }`}>
                                        {refundRequest.eligibility === 'eligible' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        {refundRequest.eligibility === 'needs_review' && <AlertTriangle className="w-3.5 h-3.5" />}
                                        {refundRequest.eligibility === 'not_eligible' && <XCircle className="w-3.5 h-3.5" />}
                                        {refundRequest.eligibility.replace('_', ' ')}
                                    </span>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Calculated Eligible: <strong className="text-slate-900 dark:text-white font-bold">{refundRequest.formatted_eligible_amount}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Eligibility Checks List */}
                            <div className="space-y-3">
                                {refundRequest.eligibility_checks?.map((check, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            check.passed
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-100'
                                                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-100'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {check.passed ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm flex items-center justify-between">
                                                    <span>{check.name}</span>
                                                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                                                        {check.code}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                                                    {check.message}
                                                </p>
                                                {check.evidence && Object.keys(check.evidence).length > 0 && (
                                                    <div className="mt-2 p-2 rounded bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-white/5 text-[11px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                                                        {JSON.stringify(check.evidence, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Clinic Usage Since Payment */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#1E6FD9]" />
                                    Clinic Activity & Usage Metric
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    usageCount === 0
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}>
                                    {usageCount === 0 ? 'Zero Usage Detected' : `${usageCount} Tokens Issued`}
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Total patient queue tokens and appointments created by <strong>{clinic.name}</strong> since payment date ({payment.paid_at || 'Capture'}):
                            </p>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Patient Booking Tokens Created
                                </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {usageCount}
                                </span>
                            </div>

                            {refundRequest.reason_type === 'first_payment_unused' && (
                                <div className="text-xs text-slate-500">
                                    * 7-day money-back guarantee requires strictly <strong>0</strong> bookings created since payment.
                                </div>
                            )}
                        </div>

                        {/* 3. Related Incidents (if downtime claimed or found) */}
                        {relatedIncidents.length > 0 && (
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Platform Incidents Overlapping Billing Period
                                </h3>
                                <div className="space-y-2">
                                    {relatedIncidents.map((inc) => (
                                        <div key={inc.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                                            <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                                                <span>{inc.title}</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-bold">{inc.duration_hours} hrs continuous</span>
                                            </div>
                                            <div className="text-slate-500">
                                                Started: {new Date(inc.started_at).toLocaleString()} • Ended: {inc.ended_at ? new Date(inc.ended_at).toLocaleString() : 'Ongoing'}
                                            </div>
                                            {inc.notes && <div className="text-slate-600 dark:text-slate-400 italic mt-1">{inc.notes}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Request Description & Decision History */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Description & Communication Log
                            </h3>

                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                                    Clinic Reason Description
                                </label>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 text-sm text-slate-800 dark:text-slate-200">
                                    {refundRequest.description || <span className="italic text-slate-400">No additional description was provided.</span>}
                                </div>
                            </div>

                            {refundRequest.decision_reason && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-rose-500 block mb-1">
                                        Decision Reason (Shown to Clinic)
                                    </label>
                                    <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-sm text-rose-900 dark:text-rose-100">
                                        {refundRequest.decision_reason}
                                    </div>
                                </div>
                            )}

                            {refundRequest.admin_note && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                                        Internal Admin Notes
                                    </label>
                                    <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line">
                                        {refundRequest.admin_note}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (4 cols): Action Panel, Payment Details, Clinic Info */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Action / Review Panel */}
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-[#1E6FD9]/30 p-5 shadow-md space-y-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-[#1E6FD9]" />
                                Action & Review
                            </h3>

                            {/* Pending State Actions */}
                            {['requested', 'under_review'].includes(refundRequest.status) && (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                                        Acknowledge and decide this claim. Approving moves it to <strong>Processing</strong> to execute in the Payments.lk dashboard.
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowApproveModal(true)}
                                        className="w-full py-2.5 px-4 rounded-xl bg-[#0E9E8F] hover:bg-[#0b8276] text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve Refund Request
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowRejectModal(true)}
                                        className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject Request
                                    </button>
                                </div>
                            )}

                            {/* Approved State Actions -> Ready to Mark as Refunded */}
                            {['approved', 'processing'].includes(refundRequest.status) && (
                                <div className="space-y-3">
                                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-2">
                                        <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                                            <Info className="w-4 h-4" />
                                            Manual Processing Checklist:
                                        </div>
                                        <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 text-xs">
                                            <li>Open the Payments.lk merchant dashboard.</li>
                                            <li>
                                                Refund <strong>{refundRequest.formatted_approved_amount}</strong> to card <code className="font-mono">•••• {payment.card_last4 || '0008'}</code> (Checkout ID: <code className="text-xs">{payment.gateway_checkout_id}</code>).
                                            </li>
                                            <li>Enter the refund reference below to finalize.</li>
                                        </ol>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowProcessModal(true)}
                                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Mark as Refunded
                                    </button>
                                </div>
                            )}

                            {/* Refunded Complete State */}
                            {refundRequest.status === 'refunded' && (
                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-100 space-y-2">
                                    <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Refund Completed
                                    </div>
                                    <div>
                                        Credit Note: <strong>{refundRequest.credit_note_number}</strong>
                                    </div>
                                    <div>
                                        Executed: {refundRequest.refunded_at}
                                    </div>
                                    <div>
                                        Method: {refundRequest.refund_method}
                                    </div>
                                    <div>
                                        Reference ID: <code className="font-mono font-bold">{refundRequest.refund_reference}</code>
                                    </div>
                                </div>
                            )}

                            {/* Rejected State */}
                            {refundRequest.status === 'rejected' && (
                                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                                    <div className="font-bold text-sm text-rose-700 dark:text-rose-300">
                                        Request Rejected
                                    </div>
                                    <div>Decided on: {refundRequest.decided_at} by {refundRequest.decided_by}</div>
                                </div>
                            )}
                        </div>

                        {/* Payment Context Card */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-3 text-xs">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Transaction Details
                            </h3>

                            <div className="space-y-2 text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between">
                                    <span>Invoice Number:</span>
                                    <strong className="text-slate-900 dark:text-white font-mono">{payment.invoice_number}</strong>
                                </div>
                                {payment.receipt_number && (
                                    <div className="flex justify-between">
                                        <span>Receipt Number:</span>
                                        <strong className="text-slate-900 dark:text-white font-mono">{payment.receipt_number}</strong>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Paid Amount:</span>
                                    <strong className="text-slate-900 dark:text-white">{payment.formatted_amount}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Already Refunded:</span>
                                    <strong className="text-amber-600 dark:text-amber-400">{payment.formatted_refunded_amount}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Plan:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{payment.plan_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Billing Period:</span>
                                    <span>{payment.period_start} – {payment.period_end}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Card:</span>
                                    <span className="font-mono">{payment.card_scheme || 'Card'} •••• {payment.card_last4 || '0008'}</span>
                                </div>
                                {payment.gateway_checkout_id && (
                                    <div className="flex justify-between">
                                        <span>Checkout ID:</span>
                                        <code className="text-[11px]">{payment.gateway_checkout_id}</code>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Clinic Information Card */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-3 text-xs">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                Clinic Account
                            </h3>

                            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                    {clinic.name}
                                </div>
                                <div>Subdomain: <code className="font-mono">{clinic.subdomain}</code></div>
                                <div>Status: <span className="capitalize font-medium">{clinic.status}</span></div>
                                <div>Email: {clinic.email}</div>
                                {clinic.phone && <div>Phone: {clinic.phone}</div>}
                                {clinic.legal_name && <div>Legal: {clinic.legal_name}</div>}
                                {clinic.tax_id && <div>Tax ID: {clinic.tax_id}</div>}
                            </div>
                        </div>

                        {/* Payment History Card */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-3 text-xs">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Clinic Payment History
                            </h3>
                            <div className="space-y-2">
                                {paymentHistory.map((ph) => (
                                    <div key={ph.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {ph.invoice_number || `Tx #${ph.id}`}
                                            </div>
                                            <div className="text-[11px] text-slate-400">{ph.created_at}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900 dark:text-white">{ph.formatted_amount}</div>
                                            {ph.refund_status !== 'none' && (
                                                <span className="text-[10px] text-amber-600 uppercase font-semibold">
                                                    {ph.refund_status} refund
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Approve Refund */}
            <GlassModal
                isOpen={showApproveModal}
                onClose={() => setShowApproveModal(false)}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleApprove} className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                        Approve Refund Request
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Review the approved amount. This will set the request status to <strong>Approved</strong> and notify the clinic.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Approved Amount (LKR)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs.</span>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                max={payment.max_refundable_cents / 100}
                                value={approveForm.data.approved_amount_cents / 100}
                                onChange={(e) => approveForm.setData('approved_amount_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                                className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                required
                            />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                            Maximum refundable: Rs. {(payment.max_refundable_cents / 100).toFixed(2)}
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Decision Note (Optional — visible to clinic)
                        </label>
                        <textarea
                            rows={2}
                            value={approveForm.data.decision_reason}
                            onChange={(e) => approveForm.setData('decision_reason', e.target.value)}
                            placeholder="e.g. Approved per 7-day unused guarantee."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Internal Admin Note (Private)
                        </label>
                        <textarea
                            rows={2}
                            value={approveForm.data.admin_note}
                            onChange={(e) => approveForm.setData('admin_note', e.target.value)}
                            placeholder="Internal notes regarding this approval."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowApproveModal(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={approveForm.processing}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0E9E8F] text-white hover:bg-[#0b8276] disabled:opacity-50"
                        >
                            Confirm Approval
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Modal: Reject Refund */}
            <GlassModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleReject} className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 font-display">
                        Reject Refund Request
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Please provide the exact policy reason for decline. This reason will be emailed directly to the clinic and shown on their billing dashboard.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Decline (Required — shown to clinic)
                        </label>
                        <textarea
                            rows={3}
                            value={rejectForm.data.decision_reason}
                            onChange={(e) => rejectForm.setData('decision_reason', e.target.value)}
                            placeholder="e.g. As outlined in Section 3 of our Refund Policy, partial-month cancellations and accounts with active patient appointments are not eligible for refunds."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Internal Admin Note (Private)
                        </label>
                        <textarea
                            rows={2}
                            value={rejectForm.data.admin_note}
                            onChange={(e) => rejectForm.setData('admin_note', e.target.value)}
                            placeholder="Internal notes regarding this rejection."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowRejectModal(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={rejectForm.processing || !rejectForm.data.decision_reason.trim()}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                            Decline & Notify Clinic
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Modal: Process / Mark as Refunded */}
            <GlassModal
                isOpen={showProcessModal}
                onClose={() => setShowProcessModal(false)}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleProcess} className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                        Mark as Refunded
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Record the manual refund execution. An official Credit Note will be generated and emailed to the clinic with attached PDF.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Refund Execution Method
                        </label>
                        <select
                            value={processForm.data.refund_method}
                            onChange={(e) => processForm.setData('refund_method', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            <option value="payments_lk_dashboard">Payments.lk Merchant Dashboard (Card Reversal)</option>
                            <option value="bank_transfer">Direct Bank Transfer</option>
                            <option value="api">Automated Gateway API</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Gateway or Bank Reference ID (Required)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. ref_pay_rev_98721 or Bank Tx 20261022001"
                            value={processForm.data.refund_reference}
                            onChange={(e) => processForm.setData('refund_reference', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Internal Admin Note (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={processForm.data.admin_note}
                            onChange={(e) => processForm.setData('admin_note', e.target.value)}
                            placeholder="e.g. Reversal executed via merchant portal by Thanarasan."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowProcessModal(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processForm.processing || !processForm.data.refund_reference.trim()}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Finalize & Issue Credit Note
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
