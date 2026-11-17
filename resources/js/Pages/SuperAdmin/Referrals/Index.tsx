import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Gift,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Settings,
    List,
    Wallet,
    Search,
    Check,
    X,
    ExternalLink,
    Filter,
    FileSpreadsheet,
    Eye,
} from 'lucide-react';

interface ReferralItem {
    id: number;
    referrer: {
        id: string;
        name: string;
        plan: string;
        has_paid: boolean;
    };
    referred: {
        id: string;
        name: string;
        plan: string;
    };
    referral_code: string;
    status: 'registered' | 'paying' | 'reward_pending' | 'rewarded' | 'rejected' | 'cancelled';
    reward_amount_cents: number;
    reward_formatted: string;
    qualifying_invoices_count: number;
    flags: Record<string, string> | null;
    has_flags: boolean;
    rejection_reason?: string | null;
    admin_notes?: string | null;
    approved_by?: string | null;
    approved_at?: string | null;
    rejected_by?: string | null;
    rejected_at?: string | null;
    created_at: string;
}

interface LedgerEntry {
    id: number;
    tenant_name: string;
    type: string;
    amount_cents: number;
    formatted_amount: string;
    balance_after_cents: number;
    formatted_balance: string;
    expires_at?: string | null;
    is_expired: boolean;
    notes?: string | null;
    created_at: string;
}

interface Props {
    referrals: ReferralItem[];
    ledgerEntries: LedgerEntry[];
    stats: {
        total_referrals: number;
        rewarded_count: number;
        pending_review_count: number;
        flagged_count: number;
        total_credits_granted_cents: number;
        total_credits_used_cents: number;
    };
    settings: {
        enabled: boolean;
        qualifying_invoices: number;
        approval_required: boolean;
        annual_cap_multiplier: number;
        credit_expiry_months: number;
        welcome_benefit_enabled: boolean;
        welcome_benefit_type: string;
        welcome_benefit_value: number;
    };
}

export default function ReferralsIndex({
    referrals,
    ledgerEntries,
    stats,
    settings,
}: Props) {
    const [activeTab, setActiveTab] = useState<'referrals' | 'ledger' | 'settings'>('referrals');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modals
    const [selectedReferral, setSelectedReferral] = useState<ReferralItem | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Approve Form
    const approveForm = useForm({
        admin_notes: '',
    });

    // Reject Form
    const rejectForm = useForm({
        reason: '',
        admin_notes: '',
    });

    // Settings Form
    const settingsForm = useForm({
        enabled: settings.enabled,
        qualifying_invoices: settings.qualifying_invoices,
        approval_required: settings.approval_required,
        annual_cap_multiplier: settings.annual_cap_multiplier,
        credit_expiry_months: settings.credit_expiry_months,
        welcome_benefit_enabled: settings.welcome_benefit_enabled,
        welcome_benefit_type: settings.welcome_benefit_type,
        welcome_benefit_value: settings.welcome_benefit_value,
    });

    const handleApprove = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReferral) return;

        approveForm.post(route('super_admin.referrals.approve', selectedReferral.id), {
            onSuccess: () => {
                setShowApproveModal(false);
                setSelectedReferral(null);
                approveForm.reset();
            },
        });
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReferral) return;

        rejectForm.post(route('super_admin.referrals.reject', selectedReferral.id), {
            onSuccess: () => {
                setShowRejectModal(false);
                setSelectedReferral(null);
                rejectForm.reset();
            },
        });
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        settingsForm.post(route('super_admin.referrals.settings'));
    };

    // Filter referrals
    const filteredReferrals = referrals.filter((r) => {
        const matchesSearch =
            r.referrer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.referred.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.referral_code?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === 'all') return true;
        if (statusFilter === 'flagged') return r.has_flags;
        if (statusFilter === 'pending') return r.status === 'reward_pending';
        return r.status === statusFilter;
    });

    const getStatusChip = (status: ReferralItem['status']) => {
        switch (status) {
            case 'rewarded':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Rewarded
                    </span>
                );
            case 'reward_pending':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Pending Review
                    </span>
                );
            case 'paying':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        Paying
                    </span>
                );
            case 'registered':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                        Registered
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                        <XCircle className="h-3 w-3" />
                        Rejected
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Cancelled
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <PlatformLayout>
            <Head title="Clinic Referrals Management — Super Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <Gift className="h-4 w-4" />
                            Growth & Partnerships
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Clinic Referrals & Credit Ledger
                        </h1>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Monitor referral rewards, review anti-abuse flags, and manage program parameters.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={route('super_admin.referrals.export')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </a>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Referrals
                        </span>
                        <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                            {stats.total_referrals}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Rewarded
                        </span>
                        <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.rewarded_count}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Pending Review
                        </span>
                        <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.pending_review_count}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Flagged Cases
                        </span>
                        <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">
                            {stats.flagged_count}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Credits Issued
                        </span>
                        <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                            Rs. {(stats.total_credits_granted_cents / 100).toLocaleString()}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Credits Used
                        </span>
                        <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                            Rs. {(stats.total_credits_used_cents / 100).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-white/10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('referrals')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                            activeTab === 'referrals'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <List className="h-4 w-4" />
                        Referrals List ({referrals.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                            activeTab === 'ledger'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Wallet className="h-4 w-4" />
                        Credit Ledger Activity ({ledgerEntries.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                            activeTab === 'settings'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Settings className="h-4 w-4" />
                        Program Settings
                    </button>
                </div>

                {/* TAB 1: REFERRALS LIST */}
                {activeTab === 'referrals' && (
                    <div className="space-y-4">
                        {/* Search and Filters */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by clinic name or code..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending Review</option>
                                    <option value="flagged">Flagged Cases</option>
                                    <option value="rewarded">Rewarded</option>
                                    <option value="paying">Paying</option>
                                    <option value="registered">Registered</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        {/* Referrals Table */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/5 dark:bg-slate-900">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Referrer Clinic</th>
                                            <th className="px-4 py-3">Referred Clinic</th>
                                            <th className="px-4 py-3">Code</th>
                                            <th className="px-4 py-3">Paid Invoices</th>
                                            <th className="px-4 py-3">Reward</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Abuse Flags</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                                        {filteredReferrals.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                                                    No referrals found matching the selected filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredReferrals.map((r) => (
                                                <tr
                                                    key={r.id}
                                                    className={`transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                                                        r.has_flags ? 'bg-rose-500/[0.03]' : ''
                                                    }`}
                                                >
                                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                                                        #{r.id}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                        <div>{r.referrer.name || r.referrer.id}</div>
                                                        <div className="text-[10px] text-slate-400 capitalize">
                                                            {r.referrer.plan} · {r.referrer.has_paid ? 'Paid' : 'Unpaid'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                        <div>{r.referred.name || r.referred.id}</div>
                                                        <div className="text-[10px] text-slate-400 capitalize">
                                                            {r.referred.plan}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                                        {r.referral_code}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                        {r.qualifying_invoices_count} / {settings.qualifying_invoices}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                                                        {r.reward_amount_cents > 0 ? r.reward_formatted : '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {getStatusChip(r.status)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {r.has_flags ? (
                                                            <div className="flex flex-col gap-1">
                                                                {Object.entries(r.flags || {}).map(([key, reason]) => (
                                                                    <span
                                                                        key={key}
                                                                        title={reason}
                                                                        className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 cursor-help"
                                                                    >
                                                                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                                                        {key}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400">Clean</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {r.status === 'reward_pending' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedReferral(r);
                                                                            setShowApproveModal(true);
                                                                        }}
                                                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-500"
                                                                    >
                                                                        <Check className="h-3 w-3" />
                                                                        Approve
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedReferral(r);
                                                                            setShowRejectModal(true);
                                                                        }}
                                                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-500"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}

                                                            {r.rejection_reason && (
                                                                <span
                                                                    title={r.rejection_reason}
                                                                    className="text-[10px] text-rose-500 max-w-[120px] truncate block text-right cursor-help"
                                                                >
                                                                    {r.rejection_reason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: CREDIT LEDGER */}
                {activeTab === 'ledger' && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/5 dark:bg-slate-900">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Clinic</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Balance After</th>
                                        <th className="px-4 py-3">Expires At</th>
                                        <th className="px-4 py-3">Notes</th>
                                        <th className="px-4 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                                    {ledgerEntries.map((e) => (
                                        <tr key={e.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="px-4 py-3 font-mono text-[11px] text-slate-500">#{e.id}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                {e.tenant_name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {e.type}
                                                </code>
                                            </td>
                                            <td className={`px-4 py-3 font-bold ${
                                                e.amount_cents >= 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {e.formatted_amount}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                {e.formatted_balance}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {e.expires_at || 'Never'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                                {e.notes || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-[11px]">
                                                {e.created_at}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: PROGRAM SETTINGS */}
                {activeTab === 'settings' && (
                    <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900 space-y-5">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                Global Referral Parameters
                            </h2>

                            {/* Enable/Disable switch */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Referral Program Active
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        When toggled off, referral links and UI are completely hidden from all clinics.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.data.enabled}
                                    onChange={(e) => settingsForm.setData('enabled', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                            </div>

                            {/* Qualifying Months */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    Qualifying Consecutive Paid Invoices
                                </label>
                                <p className="text-[11px] text-slate-500 mb-1.5">
                                    Number of monthly payments required from referred clinic before credit is awarded.
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={settingsForm.data.qualifying_invoices}
                                    onChange={(e) => settingsForm.setData('qualifying_invoices', parseInt(e.target.value) || 2)}
                                    className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                                />
                            </div>

                            {/* Approval Required */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
                                <div>
                                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Super Admin Approval Required
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Require manual approval before credits are credited to the referrer's ledger.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.data.approval_required}
                                    onChange={(e) => settingsForm.setData('approval_required', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                            </div>

                            {/* Annual Cap Multiplier */}
                            <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    Annual Reward Cap (Multiplier × Monthly Plan Price)
                                </label>
                                <p className="text-[11px] text-slate-500 mb-1.5">
                                    E.g., 12 means max 12 months of free credit per 12-month rolling period.
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={settingsForm.data.annual_cap_multiplier}
                                    onChange={(e) => settingsForm.setData('annual_cap_multiplier', parseInt(e.target.value) || 12)}
                                    className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                                />
                            </div>

                            {/* Credit Expiry */}
                            <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    Credit Expiry Period (Months)
                                </label>
                                <p className="text-[11px] text-slate-500 mb-1.5">
                                    Default is 12 months from grant date.
                                </p>
                                <input
                                    type="number"
                                    min="1"
                                    max="36"
                                    value={settingsForm.data.credit_expiry_months}
                                    onChange={(e) => settingsForm.setData('credit_expiry_months', parseInt(e.target.value) || 12)}
                                    className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={settingsForm.processing}
                                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {settingsForm.processing ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* APPROVE MODAL */}
            {showApproveModal && selectedReferral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Approve Referral Reward
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Credit <strong className="text-slate-900 dark:text-white">{selectedReferral.reward_formatted}</strong> to{' '}
                            <strong>{selectedReferral.referrer.name}</strong> for referring{' '}
                            <strong>{selectedReferral.referred.name}</strong>.
                        </p>

                        <form onSubmit={handleApprove} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={approveForm.data.admin_notes}
                                    onChange={(e) => approveForm.setData('admin_notes', e.target.value)}
                                    placeholder="Add any internal verification remarks..."
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowApproveModal(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={approveForm.processing}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                >
                                    {approveForm.processing ? 'Approving...' : 'Confirm Approval'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REJECT MODAL */}
            {showRejectModal && selectedReferral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Reject Referral Reward
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Reject reward for clinic <strong>{selectedReferral.referrer.name}</strong>. A reason is required for audit logging.
                        </p>

                        <form onSubmit={handleReject} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Rejection Reason <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={rejectForm.data.reason}
                                    onChange={(e) => rejectForm.setData('reason', e.target.value)}
                                    placeholder="E.g., Self-referral detected via IP address or same payment card"
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                                />
                                {rejectForm.errors.reason && (
                                    <p className="mt-1 text-xs text-rose-500">{rejectForm.errors.reason}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Internal Admin Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={rejectForm.data.admin_notes}
                                    onChange={(e) => rejectForm.setData('admin_notes', e.target.value)}
                                    placeholder="Additional audit remarks..."
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRejectModal(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={rejectForm.processing}
                                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                                >
                                    {rejectForm.processing ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}
