import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import Modal from '@/Components/Modal';
import { getCentralUrl } from '@/Utils/centralUrl';
import {
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    FileText,
    Download,
    Eye,
    Building2,
    Mail,
    Phone,
    MapPin,
    Hash,
    Save,
    RotateCcw,
    XCircle,
    AlertTriangle,
    Sparkles,
    Check,
    ChevronLeft,
    ChevronRight,
    X,
    ArrowDownRight,
    Shield,
    Undo2,
    Receipt,
    Info,
    HelpCircle,
} from 'lucide-react';

interface CurrentPlanInfo {
    name: string;
    price_cents: number;
    formatted_price: string;
    status_key: 'active' | 'trial' | 'past_due' | 'cancelling' | 'expired' | 'comp' | 'none' | 'cancelled';
    status_label: string;
    is_comp: boolean;
    is_trialing: boolean;
    is_cancelling: boolean;
    cancels_at_period_end: boolean;
    period_start?: string | null;
    period_end?: string | null;
    formatted_period?: string | null;
    trial_ends_at?: string | null;
    days_remaining?: number | null;
    features: string[];
    pending_plan?: {
        id: number;
        name: string;
        effective_date?: string | null;
    } | null;
}

interface PlanItem {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
    formatted_price: string;
    billing_interval: string;
    badge?: string | null;
    description?: string | null;
    features: string[];
    is_current: boolean;
    is_pending_downgrade: boolean;
    is_upgrade: boolean;
    is_downgrade: boolean;
}

interface PaymentHistoryItem {
    id: number;
    invoice_number: string;
    receipt_number?: string | null;
    type: 'subscription' | 'proration' | 'manual';
    description: string;
    amount_cents: number;
    formatted_amount: string;
    issue_date?: string | null;
    paid_at?: string | null;
    status: 'paid' | 'unpaid' | 'void' | 'failed';
    payment_method: string;
    card_details?: string | null;
    download_url: string;
    view_url: string;
    pay_url?: string | null;
    payment_id?: number | null;
    refund_status?: string | null;
    refunded_amount_cents?: number;
    refundable_amount_cents?: number;
    can_request_refund?: boolean;
    latest_refund?: {
        id: number;
        public_id: string;
        status: string;
        status_label: string;
        reason: string;
        reason_label: string;
        requested_amount_cents: number;
        formatted_requested_amount: string;
        approved_amount_cents?: number | null;
        formatted_approved_amount?: string | null;
        decision_reason?: string | null;
        credit_note_number?: string | null;
        credit_note_url?: string | null;
        created_at: string;
        decided_at?: string | null;
        refunded_at?: string | null;
        can_cancel: boolean;
    } | null;
}

interface PlatformIncidentItem {
    id: number;
    title: string;
    started_at: string;
    resolved_at: string;
    duration_minutes: number;
}

interface BillingCenterProps {
    tenant: {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        address?: string | null;
    };
    currentPlan: CurrentPlanInfo | null;
    actions: {
        can_change_plan: boolean;
        can_cancel: boolean;
        can_resume: boolean;
        has_unpaid_invoice: boolean;
        unpaid_invoice_amount?: string | null;
    };
    billingDetails: {
        legal_name: string;
        billing_email: string;
        phone: string;
        address: string;
        tax_id: string;
    };
    plans?: PlanItem[];
    sharedFeatures?: string[];
    termsVersion?: string;
    paymentHistory: PaymentHistoryItem[];
    upcomingInvoice: {
        date: string;
        plan_name: string;
        amount: string;
        is_scheduled_downgrade: boolean;
    } | null;
    incidents?: PlatformIncidentItem[];
}

/**
 * Convert string to Title Case for invoice address display preview.
 */
function toTitleCase(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
        .join(' ');
}

// Concise per-tier highlight bullets
const planHighlights: Record<string, string[]> = {
    basic: [
        'Single doctor practice',
        'Appointments & live token queue',
        'Digital patient records',
    ],
    pro: [
        'Multi-doctor scheduling',
        'Live TV queue calling',
        'Prescription & dispensing workflow',
        'SMS queue notifications',
    ],
    advanced: [
        'High-capacity clinic roster',
        'Multiple reception desks',
        'Complete doctor payout accounting',
        'Priority SLA support',
    ],
};

export default function BillingCenter({
    tenant,
    currentPlan,
    actions,
    billingDetails,
    plans = [],
    sharedFeatures = [
        'Online appointment and channeling session management',
        'Token numbers and live queue',
        'Patient records',
        'Secure cloud hosting and regular backups',
        'Email support',
    ],
    termsVersion = '2026-10-22',
    paymentHistory = [],
    upcomingInvoice,
    incidents = [],
}: BillingCenterProps) {
    // Modals & Drawers state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showChangePlanModal, setShowChangePlanModal] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [planChangeConsent, setPlanChangeConsent] = useState(false);
    const [isSubmittingPlanChange, setIsSubmittingPlanChange] = useState(false);

    // Refund Modal State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentHistoryItem | null>(null);
    const [eligibilityPreview, setEligibilityPreview] = useState<{
        loading: boolean;
        eligible: boolean | null;
        eligible_amount_cents: number;
        formatted_eligible_amount: string;
        currency: string;
        rule_applied: string;
        reasons: string[];
        breakdown?: Record<string, any>;
        requires_manual_review: boolean;
    } | null>(null);

    const refundForm = useForm({
        payment_id: 0,
        reason: 'duplicate_payment',
        platform_incident_id: '',
        requested_amount_cents: '',
        reason_details: '',
        acknowledged_policy: false,
    });

    const fetchEligibilityPreview = async (paymentId: number, reason: string, incidentId: string, details: string) => {
        if (!paymentId) return;
        setEligibilityPreview((prev) => ({
            loading: true,
            eligible: prev?.eligible ?? null,
            eligible_amount_cents: prev?.eligible_amount_cents ?? 0,
            formatted_eligible_amount: prev?.formatted_eligible_amount ?? '',
            currency: 'LKR',
            rule_applied: '',
            reasons: [],
            requires_manual_review: false,
        }));

        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/settings/billing/refund-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    reason,
                    platform_incident_id: incidentId ? parseInt(incidentId, 10) : null,
                    reason_details: details,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setEligibilityPreview({
                    loading: false,
                    ...data,
                });
            } else {
                setEligibilityPreview(null);
            }
        } catch {
            setEligibilityPreview(null);
        }
    };

    const handleOpenRefundModal = (inv: PaymentHistoryItem) => {
        setSelectedPaymentForRefund(inv);
        refundForm.setData({
            payment_id: inv.payment_id || 0,
            reason: 'duplicate_payment',
            platform_incident_id: '',
            requested_amount_cents: '',
            reason_details: '',
            acknowledged_policy: false,
        });
        setShowRefundModal(true);
        if (inv.payment_id) {
            fetchEligibilityPreview(inv.payment_id, 'duplicate_payment', '', '');
        }
    };

    const handleWithdrawRefund = (refundId: number, publicId: string) => {
        if (confirm(`Withdraw refund request ${publicId}? This will cancel the pending review.`)) {
            router.post(`/settings/billing/refunds/${refundId}/cancel`, {}, { preserveScroll: true });
        }
    };

    const submitRefundRequest = (e: React.FormEvent) => {
        e.preventDefault();
        refundForm.post('/settings/billing/refunds', {
            preserveScroll: true,
            onSuccess: () => {
                setShowRefundModal(false);
                setSelectedPaymentForRefund(null);
                refundForm.reset();
            },
        });
    };

    // Pagination for payment history (12 rows per page)
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;
    const totalPages = Math.max(1, Math.ceil(paymentHistory.length / pageSize));
    const paginatedPayments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return paymentHistory.slice(start, start + pageSize);
    }, [paymentHistory, currentPage]);

    // Billing Details Form
    const initialBillingDetails = useMemo(() => ({
        legal_name: billingDetails.legal_name || tenant.name || '',
        billing_email: billingDetails.billing_email || tenant.email || '',
        phone: billingDetails.phone || tenant.phone || '',
        address: billingDetails.address || tenant.address || '',
        tax_id: billingDetails.tax_id || '',
    }), [billingDetails, tenant]);

    const billingForm = useForm({ ...initialBillingDetails });

    // Check if billing details form has changes
    const isBillingFormDirty = useMemo(() => {
        return (
            billingForm.data.legal_name !== initialBillingDetails.legal_name ||
            billingForm.data.billing_email !== initialBillingDetails.billing_email ||
            billingForm.data.phone !== initialBillingDetails.phone ||
            billingForm.data.tax_id !== initialBillingDetails.tax_id ||
            billingForm.data.address !== initialBillingDetails.address
        );
    }, [billingForm.data, initialBillingDetails]);

    const submitBillingDetails = (e: React.FormEvent) => {
        e.preventDefault();
        billingForm.put('/settings/billing/details', {
            preserveScroll: true,
        });
    };

    // Cancellation Form
    const cancelForm = useForm({
        reason: 'Too expensive',
        reason_detail: '',
    });

    const submitCancellation = (e: React.FormEvent) => {
        e.preventDefault();
        cancelForm.post('/settings/billing/cancel', {
            preserveScroll: true,
            onSuccess: () => {
                setShowCancelModal(false);
                cancelForm.reset();
            },
        });
    };

    const handleResume = () => {
        if (confirm('Resume your subscription? Online reminders will be emailed before each due date.')) {
            router.post('/settings/billing/resume', {}, { preserveScroll: true });
        }
    };

    const handleCancelDowngrade = () => {
        if (confirm('Cancel your scheduled switch? Your current plan will continue at its regular rate.')) {
            router.post('/settings/billing/cancel-downgrade', {}, { preserveScroll: true });
        }
    };

    // Status evaluation
    const isDueSoon = Boolean(
        currentPlan &&
        currentPlan.days_remaining !== null &&
        currentPlan.days_remaining !== undefined &&
        currentPlan.days_remaining <= 5 &&
        !currentPlan.is_cancelling &&
        !currentPlan.is_comp
    );
    const isOverdue = Boolean(
        currentPlan &&
        (currentPlan.status_key === 'past_due')
    );
    const isTerminated = Boolean(
        currentPlan &&
        (currentPlan.status_key === 'cancelled' || currentPlan.status_key === 'expired')
    );
    const isCancelled = Boolean(
        currentPlan &&
        (currentPlan.is_cancelling || currentPlan.cancels_at_period_end || currentPlan.status_key === 'cancelled')
    );
    const isComp = Boolean(currentPlan?.is_comp);

    // Circular Ring calculation
    const daysRemaining = currentPlan?.days_remaining ?? (isTerminated ? 0 : 30);
    const clampedDays = Math.max(0, Math.min(30, daysRemaining));
    const ringRadius = 42;
    const ringCircumference = 2 * Math.PI * ringRadius; // ~263.89
    const ringPercentage = isComp ? 100 : (isTerminated ? 0 : Math.min(100, Math.max(0, (clampedDays / 30) * 100)));
    const ringOffset = ringCircumference - (ringPercentage / 100) * ringCircumference;

    // Ring stroke color
    let ringColorClass = 'text-[#0E9E8F] stroke-current';
    if (isTerminated) {
        ringColorClass = 'text-rose-500 stroke-current';
    } else if (isCancelled) {
        ringColorClass = 'text-slate-400 dark:text-slate-500 stroke-current';
    } else if (isOverdue) {
        ringColorClass = 'text-rose-500 stroke-current';
    } else if (isDueSoon) {
        ringColorClass = 'text-[#FF7A59] stroke-current';
    }

    // When opening Change Plan modal, pre-select next logical tier or current
    useEffect(() => {
        if (showChangePlanModal && plans.length > 0 && selectedPlanId === null) {
            const current = plans.find((p) => p.is_current);
            // Default select higher plan if available, or first other plan
            const upgradePlan = plans.find((p) => p.is_upgrade);
            setSelectedPlanId(upgradePlan ? upgradePlan.id : (current?.id ?? plans[0].id));
        }
    }, [showChangePlanModal, plans, selectedPlanId]);

    const activeSelectedPlan = useMemo(() => {
        return plans.find((p) => p.id === selectedPlanId) || null;
    }, [plans, selectedPlanId]);

    const handlePlanChangeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSelectedPlan || activeSelectedPlan.is_current || !planChangeConsent) {
            return;
        }

        setIsSubmittingPlanChange(true);
        if (activeSelectedPlan.is_upgrade) {
            router.post('/settings/billing/upgrade', {
                plan_id: activeSelectedPlan.id,
            }, {
                onFinish: () => setIsSubmittingPlanChange(false),
            });
        } else if (activeSelectedPlan.is_downgrade) {
            router.post('/settings/billing/downgrade', {
                plan_id: activeSelectedPlan.id,
            }, {
                onSuccess: () => {
                    setShowChangePlanModal(false);
                    setPlanChangeConsent(false);
                },
                onFinish: () => setIsSubmittingPlanChange(false),
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Subscription & billing" />

            <div className="space-y-6 max-w-7xl mx-auto font-['Poppins',sans-serif]">
                {/* Header: title, subtext (removed "Secure card checkout" pill per instructions) */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Settings', href: '/settings' },
                        { label: 'Subscription & billing' },
                    ]}
                    title="Subscription & billing"
                    subtitle="Your plan, payments and receipts."
                />

                {/* Unpaid Invoice Alert Banner */}
                {actions.has_unpaid_invoice && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-md">
                        <div className="flex items-start gap-3.5">
                            <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-amber-200">
                                    Payment due: subscription invoice {actions.unpaid_invoice_amount}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-amber-300/80 mt-0.5">
                                    Please settle payment online to maintain uninterrupted clinic services. Access will be paused if payment is not completed within the grace period.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/subscription/subscribe"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#1557b0] text-white font-medium text-xs transition shadow-sm shrink-0"
                        >
                            <span>Pay now</span>
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {/* Scheduled Downgrade Notice Banner */}
                {currentPlan?.pending_plan && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-md">
                        <div className="flex items-start gap-3.5">
                            <Calendar className="w-5 h-5 text-[#1E6FD9] dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-blue-200">
                                    Plan switch scheduled: {currentPlan.pending_plan.name}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-blue-300/80 mt-0.5">
                                    Your clinic will switch to {currentPlan.pending_plan.name} at your next payment due date on {currentPlan.pending_plan.effective_date}. No extra charge will occur until then.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancelDowngrade}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 transition shrink-0 cursor-pointer"
                        >
                            <span>Cancel scheduled change</span>
                        </button>
                    </div>
                )}

                {/* 1. Plan Hero Card (full width) */}
                <GlassCard className="p-6 sm:p-8 relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        {/* Left Info: Plan Name, Price, Status Pill, Period */}
                        <div className="space-y-4 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {currentPlan?.name || 'No Active Plan'}
                                </h3>
                                <div>
                                    {isTerminated ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span>Subscription Cancelled</span>
                                        </span>
                                    ) : isCancelled ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/25 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span>Access until {currentPlan?.period_end || 'period end'}</span>
                                        </span>
                                    ) : isOverdue ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            <span>Overdue / Paused</span>
                                        </span>
                                    ) : isDueSoon ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Due soon ({currentPlan?.days_remaining} day{currentPlan?.days_remaining === 1 ? '' : 's'})</span>
                                        </span>
                                    ) : isComp ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Complimentary Lifetime</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Active</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-slate-300">
                                {isComp ? (
                                    'Free lifetime access — courtesy of MedVisit'
                                ) : (
                                    <>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {currentPlan?.formatted_price || 'Rs. 0'}
                                        </span>{' '}
                                        <span className="text-slate-500 dark:text-slate-400 text-sm">/ month</span>
                                    </>
                                )}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>
                                        Current billing period:{' '}
                                        <strong className="text-slate-800 dark:text-slate-200">
                                            {currentPlan?.formatted_period ||
                                                (currentPlan?.period_start && currentPlan?.period_end
                                                    ? `${currentPlan.period_start} – ${currentPlan.period_end}`
                                                    : currentPlan?.period_end
                                                    ? `Until ${currentPlan.period_end}`
                                                    : 'Active')}
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            {/* Plan Capabilities Preview */}
                            {currentPlan?.features && currentPlan.features.length > 0 && (
                                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                                    {currentPlan.features.slice(0, 4).map((feat, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                                        >
                                            <Check className="w-3 h-3 text-[#0E9E8F] shrink-0" />
                                            <span>{feat}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Circular Ring showing days left */}
                        <div className="flex items-center justify-center sm:justify-start lg:justify-end shrink-0 py-2">
                            <div className="relative flex items-center justify-center w-36 h-36">
                                <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Track */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r={ringRadius}
                                        className="text-slate-200 dark:text-slate-800"
                                        strokeWidth="8"
                                        stroke="currentColor"
                                        fill="transparent"
                                    />
                                    {/* Animated Progress Ring */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r={ringRadius}
                                        className={`${ringColorClass} transition-all duration-1000 ease-out`}
                                        strokeWidth="8"
                                        strokeDasharray={ringCircumference}
                                        strokeDashoffset={ringOffset}
                                        strokeLinecap="round"
                                        fill="transparent"
                                    />
                                </svg>
                                {/* Center content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none px-2">
                                    {isComp ? (
                                        <>
                                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">∞</span>
                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                Lifetime
                                            </span>
                                        </>
                                    ) : isTerminated ? (
                                        <>
                                            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
                                                0
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500">
                                                Ended
                                            </span>
                                        </>
                                    ) : isCancelled ? (
                                        <>
                                            <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                                                {daysRemaining}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500">
                                                days left
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className={`text-2xl font-extrabold tracking-tight ${
                                                isDueSoon ? 'text-[#FF7A59]' : isOverdue ? 'text-rose-500' : 'text-slate-900 dark:text-white'
                                            }`}>
                                                {daysRemaining}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {daysRemaining === 1 ? 'day left' : 'days left'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {isTerminated && (
                                <Link
                                    href="/subscription/subscribe"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0E9E8F] hover:bg-[#0b8074] text-white font-medium text-xs transition shadow-sm cursor-pointer"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Re-activate subscription</span>
                                </Link>
                            )}

                            {actions.can_change_plan && (
                                <button
                                    type="button"
                                    onClick={() => setShowChangePlanModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#1557b0] text-white font-medium text-xs transition shadow-sm cursor-pointer"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span>Change plan</span>
                                </button>
                            )}

                            {/* Pay now: only when due soon (<= 5 days), overdue, or unpaid invoice */}
                            {(isDueSoon || isOverdue || actions.has_unpaid_invoice) && !isTerminated && (
                                <Link
                                    href="/subscription/subscribe"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A59] hover:bg-[#e06343] text-white font-semibold text-xs transition shadow-sm cursor-pointer"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Pay now</span>
                                </Link>
                            )}

                            {actions.can_resume && (
                                <button
                                    type="button"
                                    onClick={handleResume}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition shadow-sm cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Resume subscription</span>
                                </button>
                            )}
                        </div>

                        {actions.can_cancel && (
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                                className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-medium underline-offset-4 hover:underline transition-colors py-1.5 px-2 cursor-pointer"
                            >
                                Cancel subscription
                            </button>
                        )}
                    </div>
                </GlassCard>

                {/* 2. Next Payment Card */}
                <GlassCard className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Payment schedule
                            </span>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                {upcomingInvoice ? (
                                    <>
                                        Next payment due {upcomingInvoice.date} · {upcomingInvoice.amount} · {upcomingInvoice.plan_name}
                                    </>
                                ) : isTerminated ? (
                                    <>No upcoming payments · Subscription has ended</>
                                ) : isCancelled ? (
                                    <>No upcoming payments · Access ends on {currentPlan?.period_end || 'period end'}</>
                                ) : isComp ? (
                                    <>Complimentary clinic access · No payments due</>
                                ) : (
                                    <>Next payment schedule pending</>
                                )}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isTerminated ? (
                                    'Your subscription has been cancelled and clinic access ended. No future card charges will occur.'
                                ) : isCancelled ? (
                                    'Your subscription has been cancelled. No renewal reminders or card charges will occur.'
                                ) : (
                                    "We'll email you 7 days and 1 day before."
                                )}
                            </p>
                        </div>

                        {upcomingInvoice && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 shrink-0 self-start sm:self-center">
                                <Clock className="w-3.5 h-3.5 text-[#0E9E8F] shrink-0" />
                                <span>Manual online payment</span>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* 5. Clinic Billing Details Card */}
                <GlassCard className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#0E9E8F]" />
                                <span>Clinic billing details</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                These details appear on your official MedVisit receipts and payment confirmation vouchers.
                            </p>
                        </div>
                        {billingForm.recentlySuccessful && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Saved ✓</span>
                            </span>
                        )}
                    </div>

                    <form onSubmit={submitBillingDetails} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {/* Legal Name */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Legal name
                            </label>
                            <input
                                type="text"
                                value={billingForm.data.legal_name}
                                onChange={(e) => billingForm.setData('legal_name', e.target.value)}
                                placeholder="Registered clinic or business name"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none transition"
                            />
                            {billingForm.errors.legal_name && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.legal_name}</p>
                            )}
                        </div>

                        {/* Billing Email (required, prefilled) */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Billing email <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={billingForm.data.billing_email}
                                onChange={(e) => billingForm.setData('billing_email', e.target.value)}
                                placeholder="accounts@yourclinic.lk"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none transition"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Official receipts and payment reminders are sent here.</p>
                            {billingForm.errors.billing_email && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.billing_email}</p>
                            )}
                        </div>

                        {/* Contact Phone */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Phone
                            </label>
                            <input
                                type="text"
                                value={billingForm.data.phone}
                                onChange={(e) => billingForm.setData('phone', e.target.value)}
                                placeholder="070 129 1688"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none transition"
                            />
                            {billingForm.errors.phone && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.phone}</p>
                            )}
                        </div>

                        {/* Tax ID / VAT (optional) */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Tax ID / VAT (optional)
                            </label>
                            <input
                                type="text"
                                value={billingForm.data.tax_id}
                                onChange={(e) => billingForm.setData('tax_id', e.target.value)}
                                placeholder="e.g. VAT123456789"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none transition"
                            />
                            {billingForm.errors.tax_id && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.tax_id}</p>
                            )}
                        </div>

                        {/* Address: store as typed, display in title case */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Address
                            </label>
                            <textarea
                                rows={2}
                                value={billingForm.data.address}
                                onChange={(e) => billingForm.setData('address', e.target.value)}
                                placeholder="Street address, city, postal code"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none transition"
                            />
                            {billingForm.data.address && (
                                <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Printed on invoice (Title Case): </span>
                                    <span>{toTitleCase(billingForm.data.address)}</span>
                                </div>
                            )}
                            {billingForm.errors.address && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.address}</p>
                            )}
                        </div>

                        {/* Save Button (only enabled when dirty) */}
                        <div className="md:col-span-2 flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={!isBillingFormDirty || billingForm.processing}
                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition shadow-sm ${
                                    isBillingFormDirty && !billingForm.processing
                                        ? 'bg-[#1E6FD9] hover:bg-[#1557b0] text-white cursor-pointer'
                                        : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <Save className="w-4 h-4" />
                                <span>{billingForm.processing ? 'Saving...' : 'Save'}</span>
                            </button>
                        </div>
                    </form>
                </GlassCard>

                {/* 6. Payment History Table & Mobile Cards */}
                <GlassCard className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#0E9E8F]" />
                                <span>Payment history</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Official receipts, invoices and records for clinic accounting.
                            </p>
                        </div>
                    </div>

                    {paymentHistory.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                            <CreditCard className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2 opacity-60" />
                            <p className="font-medium">No payments yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Payment receipts will appear here after your first transaction.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block mt-4 overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="py-3 px-3">Date</th>
                                            <th className="py-3 px-3">Description</th>
                                            <th className="py-3 px-3">Amount</th>
                                            <th className="py-3 px-3">Method</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                        {paginatedPayments.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    {inv.issue_date || '—'}
                                                </td>
                                                <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200">
                                                    <div className="font-medium">{inv.description}</div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Invoice {inv.invoice_number}
                                                        {inv.receipt_number && ` · Receipt ${inv.receipt_number}`}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                    {inv.formatted_amount}
                                                </td>
                                                <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {inv.card_details || inv.payment_method}
                                                </td>
                                                <td className="py-3.5 px-3 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {inv.status === 'paid' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>Paid</span>
                                                            </span>
                                                        )}
                                                        {inv.status === 'unpaid' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                                                <Clock className="w-3 h-3" />
                                                                <span>Unpaid</span>
                                                            </span>
                                                        )}
                                                        {inv.status === 'void' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                                                                <span>Void</span>
                                                            </span>
                                                        )}
                                                        {inv.status === 'failed' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                                                <AlertCircle className="w-3 h-3" />
                                                                <span>Failed</span>
                                                            </span>
                                                        )}

                                                        {/* Refund Status Timeline Badge */}
                                                        {inv.latest_refund && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                {inv.latest_refund.status === 'requested' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-[10px]">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        <span>Refund requested</span>
                                                                    </span>
                                                                )}
                                                                {inv.latest_refund.status === 'under_review' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium text-[10px]">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        <span>Under review</span>
                                                                    </span>
                                                                )}
                                                                {inv.latest_refund.status === 'approved' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-medium text-[10px]">
                                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                                        <span>Approved</span>
                                                                    </span>
                                                                )}
                                                                {inv.latest_refund.status === 'refunded' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium text-[10px]">
                                                                        <RotateCcw className="w-2.5 h-2.5" />
                                                                        <span>Refunded</span>
                                                                    </span>
                                                                )}
                                                                {inv.latest_refund.status === 'rejected' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium text-[10px]">
                                                                        <XCircle className="w-2.5 h-2.5" />
                                                                        <span>Declined</span>
                                                                    </span>
                                                                )}
                                                                {inv.latest_refund.status === 'cancelled' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 font-medium text-[10px]">
                                                                        <span>Withdrawn</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-2 justify-end">
                                                        <a
                                                            href={inv.view_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px]"
                                                            title="View receipt"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>View</span>
                                                        </a>
                                                        <a
                                                            href={inv.download_url}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-[#0E9E8F] hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px]"
                                                            title="Download PDF"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                            <span>PDF</span>
                                                        </a>

                                                        {inv.latest_refund?.credit_note_url && (
                                                            <a
                                                                href={inv.latest_refund.credit_note_url}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition text-[11px] font-medium"
                                                                title="Download Credit Note PDF"
                                                            >
                                                                <Receipt className="w-3.5 h-3.5" />
                                                                <span>Credit Note</span>
                                                            </a>
                                                        )}

                                                        {inv.can_request_refund && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRefundModal(inv)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-[11px] font-medium cursor-pointer"
                                                                title="Request refund under policy terms"
                                                            >
                                                                <Undo2 className="w-3.5 h-3.5" />
                                                                <span>Request refund</span>
                                                            </button>
                                                        )}

                                                        {inv.latest_refund?.can_cancel && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleWithdrawRefund(inv.latest_refund!.id, inv.latest_refund!.public_id)}
                                                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] underline ml-1 cursor-pointer"
                                                                title="Withdraw pending request"
                                                            >
                                                                Withdraw
                                                            </button>
                                                        )}

                                                        {inv.status === 'unpaid' && inv.pay_url && (
                                                            <a
                                                                href={inv.pay_url}
                                                                className="ml-1 px-3 py-1 rounded-lg bg-[#0E9E8F] hover:bg-[#0b8074] text-white font-medium text-[11px] transition shadow-sm"
                                                            >
                                                                Pay now
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Stacked Cards View */}
                            <div className="md:hidden mt-4 space-y-3">
                                {paginatedPayments.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 text-xs"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {inv.description}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    Invoice {inv.invoice_number}
                                                    {inv.receipt_number && ` · Receipt ${inv.receipt_number}`}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {inv.formatted_amount}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {inv.issue_date}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                                                {inv.card_details || inv.payment_method}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {inv.status === 'paid' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Paid</span>
                                                    </span>
                                                )}
                                                {inv.status === 'unpaid' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Unpaid</span>
                                                    </span>
                                                )}
                                                {inv.status === 'failed' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[10px]">
                                                        <AlertCircle className="w-3 h-3" />
                                                        <span>Failed</span>
                                                    </span>
                                                )}

                                                {inv.latest_refund && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-[10px]">
                                                        {inv.latest_refund.status_label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-end gap-2">
                                            <a
                                                href={inv.view_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[11px]"
                                            >
                                                <Eye className="w-3 h-3" />
                                                <span>View</span>
                                            </a>
                                            <a
                                                href={inv.download_url}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[11px]"
                                            >
                                                <Download className="w-3 h-3" />
                                                <span>PDF</span>
                                            </a>

                                            {inv.latest_refund?.credit_note_url && (
                                                <a
                                                    href={inv.latest_refund.credit_note_url}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-medium"
                                                >
                                                    <Receipt className="w-3 h-3" />
                                                    <span>Credit Note</span>
                                                </a>
                                            )}

                                            {inv.can_request_refund && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenRefundModal(inv)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 text-[11px] font-medium"
                                                >
                                                    <Undo2 className="w-3 h-3" />
                                                    <span>Refund</span>
                                                </button>
                                            )}

                                            {inv.latest_refund?.can_cancel && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleWithdrawRefund(inv.latest_refund!.id, inv.latest_refund!.public_id)}
                                                    className="text-slate-400 hover:text-rose-600 text-[10px] underline ml-1"
                                                >
                                                    Withdraw
                                                </button>
                                            )}

                                            {inv.status === 'unpaid' && inv.pay_url && (
                                                <a
                                                    href={inv.pay_url}
                                                    className="px-3 py-1.5 rounded-lg bg-[#0E9E8F] text-white font-medium text-[11px]"
                                                >
                                                    Pay now
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination (after 12 rows) */}
                            {totalPages > 1 && (
                                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                    <span>
                                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                                        {Math.min(currentPage * pageSize, paymentHistory.length)} of{' '}
                                        {paymentHistory.length} payments
                                    </span>
                                    <div className="inline-flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </GlassCard>
            </div>

            {/* 3. Redesigned Change Plan Glass Modal */}
            <Modal show={showChangePlanModal} onClose={() => setShowChangePlanModal(false)} maxWidth="5xl">
                <form
                    onSubmit={handlePlanChangeSubmit}
                    className="p-6 sm:p-8 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
                        <div>
                            <h3 id="change-plan-title" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Change plan
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                All plans are billed monthly per clinic in LKR.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowChangePlanModal(false)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
                            aria-label="Close dialog"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Pending Downgrade Notice with Undo Link */}
                    {currentPlan?.pending_plan && (
                        <div className="p-3.5 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 text-slate-800 dark:text-blue-200">
                                <Calendar className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                                <span>
                                    Switching to <strong>{currentPlan.pending_plan.name}</strong> on {currentPlan.pending_plan.effective_date}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelDowngrade}
                                className="text-xs font-semibold text-[#1E6FD9] hover:text-[#1557b0] dark:text-blue-400 underline underline-offset-4 shrink-0 cursor-pointer"
                            >
                                Undo
                            </button>
                        </div>
                    )}

                    {/* 3 Plan Cards in ONE Row on Desktop (Stacked on Mobile, Current Plan First on Mobile) */}
                    <div
                        role="radiogroup"
                        aria-labelledby="change-plan-title"
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5"
                    >
                        {plans.map((p) => {
                            const isSelected = selectedPlanId === p.id;
                            const isCurrent = p.is_current;
                            const highlights = planHighlights[p.slug] || p.features;

                            return (
                                <div
                                    key={p.id}
                                    role="radio"
                                    aria-checked={isSelected}
                                    tabIndex={isCurrent ? -1 : 0}
                                    onClick={() => {
                                        if (!isCurrent) setSelectedPlanId(p.id);
                                    }}
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ' ') && !isCurrent) {
                                            e.preventDefault();
                                            setSelectedPlanId(p.id);
                                        }
                                    }}
                                    className={`relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl transition-all duration-200 select-none ${
                                        // Current plan first on mobile
                                        isCurrent ? 'order-first md:order-none' : ''
                                    } ${
                                        isCurrent
                                            ? 'border-2 border-[#0E9E8F] dark:border-[#0E9E8F] bg-[#0E9E8F]/[0.03] dark:bg-[#0E9E8F]/[0.06] cursor-default'
                                            : isSelected
                                            ? 'border-2 border-[#1E6FD9] dark:border-[#1E6FD9] ring-2 ring-[#1E6FD9]/30 bg-blue-50/50 dark:bg-blue-950/30 shadow-md cursor-pointer'
                                            : 'border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                                    }`}
                                >
                                    {/* Top Selected Badge */}
                                    {isSelected && !isCurrent && (
                                        <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#1E6FD9] text-white flex items-center justify-center shadow-xs">
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>
                                    )}

                                    <div>
                                        {/* Plan Name & Tag */}
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                                {p.name}
                                            </h4>
                                            {isCurrent ? (
                                                <span className="px-2.5 py-0.5 rounded-full bg-[#0E9E8F]/10 border border-[#0E9E8F]/30 text-[#0E9E8F] text-[11px] font-semibold">
                                                    Current plan
                                                </span>
                                            ) : p.slug === 'pro' && p.badge ? (
                                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                                                    {p.badge}
                                                </span>
                                            ) : null}
                                        </div>

                                        {/* Price */}
                                        <div className="mt-3">
                                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                {p.formatted_price}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium"> / month</span>
                                        </div>

                                        {/* Brief Description */}
                                        {p.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                                {p.description}
                                            </p>
                                        )}

                                        {/* Highlights list */}
                                        {highlights && highlights.length > 0 && (
                                            <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                                {highlights.map((feat, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <Check className="w-3.5 h-3.5 text-[#0E9E8F] shrink-0 mt-0.5" />
                                                        <span className="leading-snug">{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Action Button inside card */}
                                    <div className="mt-6 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        {isCurrent ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                                            >
                                                Your current plan
                                            </button>
                                        ) : p.is_upgrade ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPlanId(p.id);
                                                }}
                                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-[#1E6FD9] text-white ring-2 ring-[#1E6FD9]/40'
                                                        : 'bg-[#1E6FD9] hover:bg-[#1557b0] text-white'
                                                }`}
                                            >
                                                Upgrade to {p.name}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPlanId(p.id);
                                                }}
                                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                                    isSelected
                                                        ? 'border-[#1E6FD9] text-[#1E6FD9] bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-[#1E6FD9]'
                                                        : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                Switch to {p.name}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Shared "Included in every plan" list below the cards */}
                    {sharedFeatures && sharedFeatures.length > 0 && (
                        <div className="pt-2 pb-1 border-t border-slate-200/80 dark:border-white/10">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                                Included in every plan
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                {sharedFeatures.map((feat, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <Check className="w-3.5 h-3.5 text-[#0E9E8F] shrink-0 mt-0.5" />
                                        <span className="leading-snug">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected Plan Info Panel in Tinted Glass */}
                    {activeSelectedPlan && !activeSelectedPlan.is_current && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#1E6FD9]/10 border border-[#1E6FD9]/20 backdrop-blur-md space-y-3.5 text-xs">
                            {activeSelectedPlan.is_upgrade ? (
                                <div className="space-y-1">
                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                                        <ArrowUpRight className="w-4 h-4 text-[#1E6FD9]" />
                                        <span>Upgrade rule</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                                        You'll pay <strong>{activeSelectedPlan.formatted_price}</strong> now and your new monthly period starts today. Your remaining {currentPlan?.name || 'current'} days are not refunded.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                                        <ArrowDownRight className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Downgrade rule</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                                        You'll stay on {currentPlan?.name || 'current'} until <strong>{currentPlan?.period_end || 'period end'}</strong>, then switch to {activeSelectedPlan.name} at {activeSelectedPlan.formatted_price}/month.
                                    </p>
                                </div>
                            )}

                            {/* Required Consent Checkbox */}
                            <div className="pt-2 border-t border-[#1E6FD9]/20">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={planChangeConsent}
                                        onChange={(e) => setPlanChangeConsent(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-[#1E6FD9] border-slate-300 dark:border-slate-700 focus:ring-[#1E6FD9]"
                                    />
                                    <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                                        I agree to the Terms and Conditions and Refund Policy. My subscription is billed monthly in LKR. I will receive a reminder before each due date and can cancel anytime from the Billing page.
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowChangePlanModal(false)}
                            className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        {activeSelectedPlan && !activeSelectedPlan.is_current ? (
                            <button
                                type="submit"
                                disabled={!planChangeConsent || isSubmittingPlanChange}
                                className={`px-5 py-2.5 rounded-xl font-semibold text-xs text-white transition shadow-sm cursor-pointer ${
                                    planChangeConsent && !isSubmittingPlanChange
                                        ? activeSelectedPlan.is_upgrade
                                            ? 'bg-[#1E6FD9] hover:bg-[#1557b0]'
                                            : 'bg-[#0E9E8F] hover:bg-[#0b8074]'
                                        : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50'
                                }`}
                            >
                                {isSubmittingPlanChange
                                    ? 'Processing...'
                                    : activeSelectedPlan.is_upgrade
                                    ? `Continue to payment — ${activeSelectedPlan.formatted_price}`
                                    : `Schedule switch to ${activeSelectedPlan.name}`}
                            </button>
                        ) : null}
                    </div>
                </form>
            </Modal>

            {/* 4. Cancel Confirmation Modal */}
            <Modal show={showCancelModal} onClose={() => setShowCancelModal(false)} maxWidth="lg">
                <form onSubmit={submitCancellation} className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Cancel subscription
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                We are sorry to see you go. Please review what happens next:
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#0E9E8F] shrink-0 mt-0.5" />
                            <span>
                                Your clinic will remain fully active until <strong>{currentPlan?.period_end || 'the end of your period'}</strong>.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 text-[#1E6FD9] shrink-0 mt-0.5" />
                            <span>
                                <strong>Data retention:</strong> Your clinic records and patient data are kept safely for 30 days after access ends, then can be exported or permanently deleted per Terms.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#0E9E8F] shrink-0 mt-0.5" />
                            <span>No renewal charges or future reminders will be sent. You can resume anytime before your period concludes.</span>
                        </div>
                    </div>

                    {/* Cancellation reason select */}
                    <div className="mt-4 space-y-3 text-xs">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Reason for cancelling (optional)
                            </label>
                            <select
                                value={cancelForm.data.reason}
                                onChange={(e) => cancelForm.setData('reason', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none"
                            >
                                <option value="Too expensive">Too expensive</option>
                                <option value="Missing feature">Missing feature</option>
                                <option value="Closing clinic">Closing clinic</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Additional feedback (optional)
                            </label>
                            <textarea
                                rows={2}
                                value={cancelForm.data.reason_detail}
                                onChange={(e) => cancelForm.setData('reason_detail', e.target.value)}
                                placeholder="How could we have improved your experience?"
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(false)}
                            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                        >
                            Keep my plan
                        </button>
                        <button
                            type="submit"
                            disabled={cancelForm.processing}
                            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {cancelForm.processing ? 'Cancelling...' : 'Cancel subscription'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* 5. Request Refund Modal */}
            <Modal show={showRefundModal} onClose={() => setShowRefundModal(false)} maxWidth="lg">
                <form onSubmit={submitRefundRequest} className="p-6 space-y-4">
                    <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Request a subscription refund
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Evaluated automatically against our published Refund Policy.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowRefundModal(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {selectedPaymentForRefund && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                                <span>{selectedPaymentForRefund.description}</span>
                                <span className="font-bold text-slate-900 dark:text-white">{selectedPaymentForRefund.formatted_amount}</span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between text-[11px]">
                                <span>Invoice: {selectedPaymentForRefund.invoice_number}</span>
                                <span>Paid on: {selectedPaymentForRefund.issue_date || '—'}</span>
                            </div>
                        </div>
                    )}

                    {/* Reason selector */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for refund request <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={refundForm.data.reason}
                            onChange={(e) => {
                                const newReason = e.target.value;
                                refundForm.setData('reason', newReason);
                                if (selectedPaymentForRefund?.payment_id) {
                                    fetchEligibilityPreview(
                                        selectedPaymentForRefund.payment_id,
                                        newReason,
                                        refundForm.data.platform_incident_id,
                                        refundForm.data.reason_details
                                    );
                                }
                            }}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none"
                        >
                            <option value="duplicate_payment">Duplicate charge (charged twice for same period)</option>
                            <option value="cancelled_before_period">Charged after subscription cancellation</option>
                            <option value="first_payment_unused">First subscription payment unused (within 7 days)</option>
                            <option value="billing_error">Billing error (charged wrong amount)</option>
                            <option value="service_downtime">Service downtime (&gt; 48 continuous hours)</option>
                            <option value="other">Other / Special circumstances</option>
                        </select>
                    </div>

                    {/* Service downtime incident selector */}
                    {refundForm.data.reason === 'service_downtime' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Verified platform outage <span className="text-rose-500">*</span>
                            </label>
                            {incidents.length === 0 ? (
                                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                                    No verified platform outages over 48 hours are currently recorded. If you experienced downtime, describe it in detail below for manual investigation.
                                </p>
                            ) : (
                                <select
                                    value={refundForm.data.platform_incident_id}
                                    onChange={(e) => {
                                        const newIncId = e.target.value;
                                        refundForm.setData('platform_incident_id', newIncId);
                                        if (selectedPaymentForRefund?.payment_id) {
                                            fetchEligibilityPreview(
                                                selectedPaymentForRefund.payment_id,
                                                refundForm.data.reason,
                                                newIncId,
                                                refundForm.data.reason_details
                                            );
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none"
                                >
                                    <option value="">Select an outage incident...</option>
                                    {incidents.map((inc) => (
                                        <option key={inc.id} value={inc.id}>
                                            {inc.title} ({Math.round(inc.duration_minutes / 60)} hrs downtime)
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Live Eligibility Preview Card */}
                    {eligibilityPreview && (
                        <div className={`p-3.5 rounded-xl border text-xs transition ${
                            eligibilityPreview.loading
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                                : eligibilityPreview.eligible
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : eligibilityPreview.requires_manual_review
                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        }`}>
                            {eligibilityPreview.loading ? (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 animate-spin text-[#1E6FD9]" />
                                    <span>Evaluating eligibility against Refund Policy terms...</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between font-bold">
                                        <div className="flex items-center gap-1.5">
                                            {eligibilityPreview.eligible ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : eligibilityPreview.requires_manual_review ? (
                                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                            )}
                                            <span>
                                                {eligibilityPreview.eligible
                                                    ? 'Eligible under Refund Policy'
                                                    : eligibilityPreview.requires_manual_review
                                                    ? 'Requires Administrator Review'
                                                    : 'Not Eligible Under Standard Policy'}
                                            </span>
                                        </div>
                                        {eligibilityPreview.eligible_amount_cents > 0 && (
                                            <span className="text-emerald-700 dark:text-emerald-300">
                                                {eligibilityPreview.formatted_eligible_amount}
                                            </span>
                                        )}
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                                        {eligibilityPreview.reasons.map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Details Textarea */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Explanation and details <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            required
                            minLength={10}
                            value={refundForm.data.reason_details}
                            onChange={(e) => {
                                const newDetails = e.target.value;
                                refundForm.setData('reason_details', newDetails);
                            }}
                            placeholder="Please provide any supporting details or context for our administrative review (minimum 10 characters)..."
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#1E6FD9] focus:outline-none"
                        />
                        {refundForm.errors.reason_details && (
                            <p className="text-rose-500 text-xs mt-1">{refundForm.errors.reason_details}</p>
                        )}
                    </div>

                    {/* Terms Acknowledgment */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                required
                                checked={refundForm.data.acknowledged_policy}
                                onChange={(e) => refundForm.setData('acknowledged_policy', e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded text-[#1E6FD9] border-slate-300 dark:border-slate-700 focus:ring-[#1E6FD9]"
                            />
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                I confirm this refund request is accurate and agree to the{' '}
                                <a href={getCentralUrl('/refund-policy')} target="_blank" rel="noopener noreferrer" className="text-[#1E6FD9] underline">
                                    MedVisit Refund Policy
                                </a>. Requests are reviewed within 2 business days. If approved, funds are returned to the original payment source and a Credit Note will be generated.
                            </span>
                        </label>
                        {refundForm.errors.acknowledged_policy && (
                            <p className="text-rose-500 text-xs mt-1">{refundForm.errors.acknowledged_policy}</p>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowRefundModal(false)}
                            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!refundForm.data.acknowledged_policy || refundForm.data.reason_details.length < 10 || refundForm.processing}
                            className={`px-5 py-2.5 rounded-xl font-semibold text-xs text-white transition shadow-sm ${
                                refundForm.data.acknowledged_policy && refundForm.data.reason_details.length >= 10 && !refundForm.processing
                                    ? 'bg-[#1E6FD9] hover:bg-[#1557b0] cursor-pointer'
                                    : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                            }`}
                        >
                            {refundForm.processing ? 'Submitting...' : 'Submit refund request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
