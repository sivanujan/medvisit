import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import Modal from '@/Components/Modal';
import LegalFooter from '@/Components/Public/LegalFooter';
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
    ShieldCheck,
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
} from 'lucide-react';

interface CurrentPlanInfo {
    name: string;
    price_cents: number;
    formatted_price: string;
    status_key: 'active' | 'trial' | 'past_due' | 'cancelling' | 'expired' | 'comp' | 'none';
    status_label: string;
    is_comp: boolean;
    is_trialing: boolean;
    is_cancelling: boolean;
    cancels_at_period_end: boolean;
    period_start?: string | null;
    period_end?: string | null;
    trial_ends_at?: string | null;
    days_remaining?: number | null;
    features: string[];
    pending_plan?: {
        id: number;
        name: string;
        effective_date?: string | null;
    } | null;
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
    paymentHistory: PaymentHistoryItem[];
    upcomingInvoice: {
        date: string;
        plan_name: string;
        amount: string;
        is_scheduled_downgrade: boolean;
    } | null;
}

export default function BillingCenter({
    tenant,
    currentPlan,
    actions,
    billingDetails,
    paymentHistory,
    upcomingInvoice,
}: BillingCenterProps) {
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Billing Details Form
    const billingForm = useForm({
        legal_name: billingDetails.legal_name || '',
        billing_email: billingDetails.billing_email || '',
        phone: billingDetails.phone || '',
        address: billingDetails.address || '',
        tax_id: billingDetails.tax_id || '',
    });

    const submitBillingDetails = (e: React.FormEvent) => {
        e.preventDefault();
        billingForm.put('/settings/billing/details', {
            preserveScroll: true,
        });
    };

    // Cancellation Form
    const cancelForm = useForm({
        reason: 'Price / too expensive',
        reason_detail: '',
    });

    const submitCancellation = (e: React.FormEvent) => {
        e.preventDefault();
        cancelForm.post('/settings/billing/cancel', {
            preserveScroll: true,
            onSuccess: () => setShowCancelModal(false),
        });
    };

    const handleResume = () => {
        if (confirm('Are you sure you want to resume your subscription? Automatic renewal will continue at the end of the period.')) {
            router.post('/settings/billing/resume', {}, { preserveScroll: true });
        }
    };

    const handleCancelDowngrade = () => {
        if (confirm('Cancel scheduled downgrade? Your current plan will renew at its regular rate.')) {
            router.post('/settings/billing/cancel-downgrade', {}, { preserveScroll: true });
        }
    };

    const getStatusBadge = () => {
        if (!currentPlan) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>No Subscription</span>
                </span>
            );
        }

        switch (currentPlan.status_key) {
            case 'comp':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Complimentary</span>
                    </span>
                );
            case 'trial':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Free Trial</span>
                    </span>
                );
            case 'cancelling':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Cancelling at Period End</span>
                    </span>
                );
            case 'past_due':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Past Due (Grace Period)</span>
                    </span>
                );
            case 'expired':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Expired</span>
                    </span>
                );
            case 'active':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Subscription & Billing Center" />

            <div className="space-y-8">
                {/* Unified Page Header */}
                <PageHeader
                    title="Subscription & Billing Center"
                    subtitle="Manage your clinic's MedVisit plan, renewal schedules, official PDF receipts, and tax invoice details."
                    action={
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs shadow-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span>Secure card checkout</span>
                        </div>
                    }
                />

                {/* Unpaid Invoice Alert Banner */}
                {actions.has_unpaid_invoice && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-md">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-amber-200">
                                    Action Required: Pending Subscription Payment
                                </h4>
                                <p className="text-xs text-amber-300/80 mt-0.5">
                                    You have an unpaid subscription invoice of {actions.unpaid_invoice_amount}. Please settle payment to ensure uninterrupted clinic operations.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/subscription/subscribe"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition shadow-sm shrink-0"
                        >
                            <span>Pay Now</span>
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {/* Scheduled Downgrade Notice Banner */}
                {currentPlan?.pending_plan && (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-md">
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-blue-200">
                                    Plan Change Scheduled: {currentPlan.pending_plan.name}
                                </h4>
                                <p className="text-xs text-blue-300/80 mt-0.5">
                                    Your clinic will switch to {currentPlan.pending_plan.name} at the end of the current billing cycle on {currentPlan.pending_plan.effective_date}. No extra charge will occur until then.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancelDowngrade}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shrink-0"
                        >
                            <span>Cancel Scheduled Change</span>
                        </button>
                    </div>
                )}

                {/* Top Section: Plan Overview + Upcoming Renewal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Plan Card (2 Cols) */}
                    <GlassCard className="p-6 lg:col-span-2 flex flex-col justify-between">
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <span className="text-xs uppercase tracking-wider font-semibold text-teal-500 dark:text-teal-400">
                                        Current Subscription
                                    </span>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                        {currentPlan?.name || 'No Active Plan'}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        {currentPlan?.is_comp
                                            ? 'Complimentary Lifetime Access — Courtesy of MedVisit'
                                            : `${currentPlan?.formatted_price || 'Rs. 0.00'} per month`}
                                    </p>
                                </div>
                                <div className="self-start sm:self-center">
                                    {getStatusBadge()}
                                </div>
                            </div>

                            {/* Plan Key Stats Grid */}
                            <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block text-xs">Period Start</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 mt-1 block">
                                        {currentPlan?.period_start || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block text-xs">
                                        {currentPlan?.is_cancelling ? 'Access Until' : 'Current Period End'}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 mt-1 block">
                                        {currentPlan?.is_comp ? 'Never (Lifetime)' : currentPlan?.period_end || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block text-xs">Days Remaining</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100 mt-1 block">
                                        {currentPlan?.is_comp
                                            ? '∞ Unlimited'
                                            : currentPlan?.days_remaining !== null && currentPlan?.days_remaining !== undefined
                                            ? `${currentPlan.days_remaining} day${currentPlan.days_remaining === 1 ? '' : 's'}`
                                            : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Features list */}
                            {currentPlan?.features && currentPlan.features.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                                        Included Plan Capabilities
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {currentPlan.features.map((feat, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Plan Actions */}
                        <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center gap-3">
                            {actions.can_change_plan && (
                                <Link
                                    href="/settings/billing/change-plan"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs transition shadow-sm"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span>Change Plan</span>
                                </Link>
                            )}

                            {actions.can_resume && (
                                <button
                                    type="button"
                                    onClick={handleResume}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition shadow-sm"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Resume Subscription</span>
                                </button>
                            )}

                            {actions.can_cancel && (
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(true)}
                                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>Cancel Subscription</span>
                                </button>
                            )}

                            {currentPlan?.is_comp && (
                                <span className="text-xs text-slate-500 italic">
                                    Complimentary clinic account. Billing modifications are managed exclusively by MedVisit Super Admin.
                                </span>
                            )}
                        </div>
                    </GlassCard>

                    {/* Upcoming Renewal Card */}
                    <GlassCard className="p-6 flex flex-col justify-between">
                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                                Renewal Schedule
                            </span>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                Next Scheduled Invoice
                            </h4>

                            {upcomingInvoice ? (
                                <div className="mt-4 space-y-3">
                                    <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Scheduled Date</div>
                                        <div className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                                            {upcomingInvoice.date}
                                        </div>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Plan & Amount</div>
                                        <div className="text-base font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
                                            {upcomingInvoice.amount}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {upcomingInvoice.plan_name}
                                            {upcomingInvoice.is_scheduled_downgrade && ' (Scheduled Switch)'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-center text-xs text-slate-500">
                                    {currentPlan?.is_comp
                                        ? 'Complimentary subscription does not generate renewal invoices.'
                                        : currentPlan?.is_cancelling
                                        ? 'Subscription is cancelling at period end. No further renewals will be billed.'
                                        : 'No upcoming renewal scheduled.'}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 flex items-start gap-2">
                            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                                Invoices are issued at 00:00 Asia/Colombo on renewal day. Email reminders are dispatched 7 days and 1 day prior.
                            </span>
                        </div>
                    </GlassCard>
                </div>

                {/* Clinic Billing Details Section */}
                <GlassCard className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-teal-500" />
                                <span>Clinic Billing & Invoice Details</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                These details appear on your official MedVisit subscription tax receipts and payment confirmation invoices.
                            </p>
                        </div>
                        {billingForm.recentlySuccessful && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Details saved</span>
                            </span>
                        )}
                    </div>

                    <form onSubmit={submitBillingDetails} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Registered Legal Name
                            </label>
                            <input
                                type="text"
                                value={billingForm.data.legal_name}
                                onChange={(e) => billingForm.setData('legal_name', e.target.value)}
                                placeholder={tenant.name}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                            />
                            {billingForm.errors.legal_name && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.legal_name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Billing Notification Email
                            </label>
                            <input
                                type="email"
                                value={billingForm.data.billing_email}
                                onChange={(e) => billingForm.setData('billing_email', e.target.value)}
                                placeholder={tenant.email}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Receipts and payment alerts are emailed here.</p>
                            {billingForm.errors.billing_email && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.billing_email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Contact Phone
                            </label>
                            <input
                                type="text"
                                value={billingForm.data.phone}
                                onChange={(e) => billingForm.setData('phone', e.target.value)}
                                placeholder="+94 77 123 4567"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                            />
                            {billingForm.errors.phone && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.phone}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Tax ID / VAT Number (Optional)
                            </label>
                            <input
                                type="text"
                                value={billingForm.data.tax_id}
                                onChange={(e) => billingForm.setData('tax_id', e.target.value)}
                                placeholder="e.g. VAT123456789"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                            />
                            {billingForm.errors.tax_id && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.tax_id}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Registered Clinic Address
                            </label>
                            <textarea
                                rows={2}
                                value={billingForm.data.address}
                                onChange={(e) => billingForm.setData('address', e.target.value)}
                                placeholder="Full street address, city, postal code"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                            />
                            {billingForm.errors.address && (
                                <p className="text-rose-500 text-xs mt-1">{billingForm.errors.address}</p>
                            )}
                        </div>

                        <div className="md:col-span-2 flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={billingForm.processing}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{billingForm.processing ? 'Saving Changes...' : 'Save Billing Details'}</span>
                            </button>
                        </div>
                    </form>
                </GlassCard>

                {/* Invoices & Payment History Table */}
                <GlassCard className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-teal-500" />
                                <span>Invoice & Payment History</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Official receipts, invoices, and payment records for your clinic accounting.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="py-3 px-3">Date</th>
                                    <th className="py-3 px-3">Invoice #</th>
                                    <th className="py-3 px-3">Receipt #</th>
                                    <th className="py-3 px-3">Description</th>
                                    <th className="py-3 px-3">Amount</th>
                                    <th className="py-3 px-3">Payment Method</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3 text-right">PDF</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                {paymentHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-500">
                                            No billing invoices or payment records found.
                                        </td>
                                    </tr>
                                ) : (
                                    paymentHistory.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                            <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                {inv.issue_date || '—'}
                                            </td>
                                            <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="py-3.5 px-3 font-mono text-[11px] text-teal-600 dark:text-teal-400 whitespace-nowrap">
                                                {inv.receipt_number || '—'}
                                            </td>
                                            <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                                                <div>{inv.description}</div>
                                                {inv.type === 'proration' && (
                                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-teal-500/10 text-teal-400 font-medium">
                                                        Prorated Upgrade
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                {inv.formatted_amount}
                                            </td>
                                            <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                <div>{inv.card_details || inv.payment_method}</div>
                                            </td>
                                            <td className="py-3.5 px-3 whitespace-nowrap">
                                                {inv.status === 'paid' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Paid</span>
                                                    </span>
                                                )}
                                                {inv.status === 'unpaid' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-[11px]">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Unpaid</span>
                                                    </span>
                                                )}
                                                {inv.status === 'void' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-semibold text-[11px]">
                                                        <span>Void</span>
                                                    </span>
                                                )}
                                                {inv.status === 'failed' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold text-[11px]">
                                                        <AlertCircle className="w-3 h-3" />
                                                        <span>Failed</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    <a
                                                        href={inv.view_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                        title="View PDF"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </a>
                                                    <a
                                                        href={inv.download_url}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                    {inv.status === 'unpaid' && inv.pay_url && (
                                                        <a
                                                            href={inv.pay_url}
                                                            className="ml-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-[11px] transition shadow-sm"
                                                        >
                                                            Pay
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Public Legal & Merchant Compliance Footer */}
                <LegalFooter className="mt-8 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800" isTenantContext={true} />
            </div>

            {/* Cancel Subscription Confirmation Modal */}
            <Modal show={showCancelModal} onClose={() => setShowCancelModal(false)} maxWidth="lg">
                <form onSubmit={submitCancellation} className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Cancel MedVisit Subscription?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                We are sorry to see you go. Please review what happens next:
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                            <span>
                                Your clinic will remain fully operational until <strong>{currentPlan?.period_end || 'the end of your period'}</strong>.
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                            <span>No renewal charges will be made. You can resume at any time before the cycle concludes.</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>After this date, staff access will be disabled until a plan is reactivated.</span>
                        </div>
                    </div>

                    {/* Cancellation reason */}
                    <div className="mt-4 space-y-3 text-xs">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Reason for cancelling
                            </label>
                            <select
                                value={cancelForm.data.reason}
                                onChange={(e) => cancelForm.setData('reason', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            >
                                <option value="Price / too expensive">Price / too expensive</option>
                                <option value="Missing features">Missing features</option>
                                <option value="Switching to another software">Switching to another software</option>
                                <option value="Clinic closed / closing">Clinic closed / closing</option>
                                <option value="Technical issues">Technical issues</option>
                                <option value="Other">Other reason</option>
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
                                placeholder="Help us improve: what could we have done better?"
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(false)}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                        >
                            Keep My Subscription
                        </button>
                        <button
                            type="submit"
                            disabled={cancelForm.processing}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                        >
                            {cancelForm.processing ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
