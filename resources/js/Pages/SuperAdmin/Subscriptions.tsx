import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import {
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Clock,
    Gift,
    Calendar,
    ArrowUpRight,
    Search,
    ShieldCheck,
    Check,
    Building2,
    RotateCcw,
    DollarSign,
    Send,
    Filter,
} from 'lucide-react';

interface Plan {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
}

interface SubscriptionItem {
    id: number;
    tenant_id: string;
    clinic_name: string;
    subdomain: string;
    plan_name: string;
    plan_slug: string;
    status: string;
    is_active: boolean;
    is_in_grace: boolean;
    current_period_start?: string;
    current_period_end?: string;
    trial_ends_at?: string;
    created_by?: string;
    latest_invoice?: {
        id: number;
        invoice_number: string;
        amount_cents: number;
        status: string;
    } | null;
}

interface TransactionItem {
    id: number;
    clinic_name: string;
    invoice_number?: string;
    amount_formatted: string;
    gateway: string;
    status: string;
    created_at?: string;
}

interface FailedPaymentItem {
    id: number;
    clinic_name: string;
    invoice_id?: number;
    invoice_number?: string;
    amount_formatted: string;
    gateway: string;
    created_at?: string;
}

interface Props {
    subscriptions: SubscriptionItem[];
    recentTransactions: TransactionItem[];
    failedPayments?: FailedPaymentItem[];
    plans: Plan[];
    revenueSummary?: {
        mrr_lkr: number;
        collected_this_month_lkr: number;
        outstanding_past_due_lkr: number;
    };
    filters?: {
        status: string;
        plan: string;
        search: string;
    };
}

export default function SuperAdminSubscriptions({
    subscriptions,
    recentTransactions,
    failedPayments = [],
    plans,
    revenueSummary = { mrr_lkr: 0, collected_this_month_lkr: 0, outstanding_past_due_lkr: 0 },
    filters = { status: 'all', plan: 'all', search: '' },
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [planFilter, setPlanFilter] = useState(filters.plan || 'all');
    const [extendingSub, setExtendingSub] = useState<SubscriptionItem | null>(null);
    const [extendDays, setExtendDays] = useState('30');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilterSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            '/super-admin/subscriptions',
            { search: searchQuery, status: statusFilter, plan: planFilter },
            { preserveState: true }
        );
    };

    const handleMarkPaid = (invoiceId: number) => {
        if (!confirm('Mark this invoice as paid offline (manual bank transfer / cheque)? This will activate/extend the subscription.')) {
            return;
        }

        router.post(`/super-admin/subscriptions/invoices/${invoiceId}/mark-paid`, {}, {
            preserveScroll: true,
        });
    };

    const handleSendReminder = (invoiceId: number) => {
        router.post(`/super-admin/subscriptions/invoices/${invoiceId}/remind`, {}, {
            preserveScroll: true,
        });
    };

    const handleToggleComp = (subId: number, currentSlug: string) => {
        const action = currentSlug === 'comp' ? 'switch to standard monthly billing' : 'grant complimentary lifetime access';
        if (!confirm(`Are you sure you want to ${action} for this clinic?`)) {
            return;
        }

        router.post(`/super-admin/subscriptions/${subId}/toggle-comp`, {}, {
            preserveScroll: true,
        });
    };

    const handleExtend = () => {
        if (!extendingSub) return;
        setIsProcessing(true);

        router.post(`/super-admin/subscriptions/${extendingSub.id}/extend`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsProcessing(false);
                setExtendingSub(null);
            },
        });
    };

    return (
        <PlatformLayout>
            <Head title="Subscriptions & Invoices • MedVisit Platform" />

            <PageHeader
                eyebrow="Commercial Operations"
                title="Subscriptions & Invoices"
                subtitle="Track paying clinic workspaces, offline invoices, and transaction settlements."
            />

            {/* Revenue Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <GlassCard className="p-4">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Recurring Revenue (MRR)</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
                        Rs. {revenueSummary.mrr_lkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-emerald-500 mt-1">Active paid subscriptions only</div>
                </GlassCard>

                <GlassCard className="p-4">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Collected This Month</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                        Rs. {revenueSummary.collected_this_month_lkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Successful payment transactions</div>
                </GlassCard>

                <GlassCard className="p-4">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding / Past Due</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono text-amber-600 dark:text-amber-400">
                        Rs. {revenueSummary.outstanding_past_due_lkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-amber-500 mt-1">Pending clinic invoices</div>
                </GlassCard>
            </div>

            {/* Failed Payments Radar (if any) */}
            {failedPayments && failedPayments.length > 0 && (
                <GlassCard className="p-5 mt-6 border-rose-500/20 bg-rose-500/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                                Failed Payments ({failedPayments.length})
                            </h3>
                        </div>
                        <span className="text-xs text-rose-500 font-semibold">Requires follow-up</span>
                    </div>

                    <div className="space-y-2">
                        {failedPayments.map((fp) => (
                            <div key={fp.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-500/10 flex items-center justify-between text-xs">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">{fp.clinic_name}</div>
                                    <div className="text-slate-400 text-[11px] mt-0.5">
                                        Invoice #{fp.invoice_number} • {fp.amount_formatted} via {fp.gateway} • {fp.created_at}
                                    </div>
                                </div>
                                {fp.invoice_id && (
                                    <button
                                        type="button"
                                        onClick={() => handleSendReminder(fp.invoice_id!)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
                                    >
                                        <Send className="w-3 h-3" />
                                        <span>Send Payment Reminder</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Filters Bar */}
            <GlassCard className="p-4 mt-6">
                <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by clinic name, subdomain, invoice #..."
                            className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            router.get(
                                '/super-admin/subscriptions',
                                { search: searchQuery, status: e.target.value, plan: planFilter },
                                { preserveState: true }
                            );
                        }}
                        className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past Due</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        value={planFilter}
                        onChange={(e) => {
                            setPlanFilter(e.target.value);
                            router.get(
                                '/super-admin/subscriptions',
                                { search: searchQuery, status: statusFilter, plan: e.target.value },
                                { preserveState: true }
                            );
                        }}
                        className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white"
                    >
                        <option value="all">All Plans</option>
                        {plans.map((p) => (
                            <option key={p.slug} value={p.slug}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                    >
                        Filter
                    </button>
                </form>
            </GlassCard>

            {/* Subscriptions Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                <div className="lg:col-span-8">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Clinic Subscriptions ({subscriptions.length})
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200 dark:border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-2">Clinic</th>
                                        <th className="py-3 px-2">Plan</th>
                                        <th className="py-3 px-2">Status</th>
                                        <th className="py-3 px-2">Period End</th>
                                        <th className="py-3 px-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {subscriptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400">
                                                No subscriptions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        subscriptions.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                <td className="py-3.5 px-2">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {sub.clinic_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono">
                                                        {sub.tenant_id}.medvisit.lk
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        sub.plan_slug === 'comp'
                                                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                                    }`}>
                                                        {sub.plan_name}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        sub.status === 'active'
                                                            ? 'bg-emerald-500/15 text-emerald-600'
                                                            : 'bg-amber-500/15 text-amber-600'
                                                    }`}>
                                                        {sub.status}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-2 text-slate-500 font-mono text-[11px]">
                                                    {sub.current_period_end || 'N/A'}
                                                </td>

                                                <td className="py-3.5 px-2 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {sub.latest_invoice && sub.latest_invoice.status !== 'paid' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMarkPaid(sub.latest_invoice!.id)}
                                                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                                                title="Mark Offline Invoice as Paid"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleComp(sub.id, sub.plan_slug)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition"
                                                            title={sub.plan_slug === 'comp' ? 'Revoke Complimentary' : 'Grant Complimentary'}
                                                        >
                                                            <Gift className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setExtendingSub(sub)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                                                            title="Extend Subscription"
                                                        >
                                                            <Clock className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>

                {/* Recent Payment Transactions (4 cols) */}
                <div className="lg:col-span-4">
                    <GlassCard className="p-5 h-full flex flex-col">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                            Recent Transactions
                        </h3>

                        <div className="space-y-2.5 flex-1 overflow-y-auto">
                            {recentTransactions.length === 0 ? (
                                <div className="text-xs text-slate-400 py-6 text-center">No transactions recorded yet.</div>
                            ) : (
                                recentTransactions.map((tx) => (
                                    <div key={tx.id} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 text-xs flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                                                {tx.clinic_name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {tx.invoice_number ? `#${tx.invoice_number} • ` : ''}{tx.gateway}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                {tx.amount_formatted}
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase ${
                                                tx.status === 'succeeded' ? 'text-emerald-500' : 'text-rose-500'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Extend Period Modal */}
            <GlassModal
                isOpen={!!extendingSub}
                onClose={() => setExtendingSub(null)}
                title={`Extend Subscription: ${extendingSub?.clinic_name}`}
            >
                <div className="space-y-4 text-xs">
                    <p className="text-slate-600 dark:text-slate-300">
                        This action will extend the subscription period by <strong>30 days</strong> and set the status to active.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setExtendingSub(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleExtend}
                            disabled={isProcessing}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isProcessing ? 'Extending...' : 'Confirm Extension'}
                        </button>
                    </div>
                </div>
            </GlassModal>
        </PlatformLayout>
    );
}
