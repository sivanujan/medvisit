import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    RotateCcw,
    Search,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    ArrowUpRight,
    Filter,
    ShieldAlert,
    Building2,
    Calendar,
} from 'lucide-react';

interface RefundItem {
    id: number;
    public_id: string;
    tenant: {
        id: string;
        name: string;
    };
    reason_type: string;
    reason_label: string;
    requested_amount_cents: number;
    formatted_requested_amount: string;
    eligible_amount_cents: number;
    formatted_eligible_amount: string;
    approved_amount_cents: number | null;
    formatted_approved_amount: string | null;
    eligibility: 'eligible' | 'partially_eligible' | 'not_eligible' | 'needs_review';
    status: string;
    credit_note_number: string | null;
    created_at: string;
    created_at_human: string;
    is_overdue: boolean;
    overdue_type: 'decision' | 'execution' | null;
    invoice_number?: string;
    receipt_number?: string;
}

interface Props {
    refunds: {
        data: RefundItem[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        status?: string;
        reason?: string;
        search?: string;
    };
    counts: {
        total: number;
        needs_action: number;
        processing: number;
        refunded: number;
        rejected: number;
    };
}

export default function RefundsIndex({ refunds, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [reasonFilter, setReasonFilter] = useState(filters.reason || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/super-admin/refunds', {
            search: search || undefined,
            status: statusFilter || undefined,
            reason: reasonFilter || undefined,
        }, { preserveState: true });
    };

    const handleFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        router.get('/super-admin/refunds', {
            search: search || undefined,
            status: newStatus || undefined,
            reason: reasonFilter || undefined,
        }, { preserveState: true });
    };

    const getEligibilityBadge = (eligibility: string) => {
        switch (eligibility) {
            case 'eligible':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Eligible</span>;
            case 'partially_eligible':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"><Clock className="w-3 h-3" /> Partial</span>;
            case 'needs_review':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><AlertTriangle className="w-3 h-3" /> Needs Review</span>;
            case 'not_eligible':
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3" /> Ineligible</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'refunded':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">Refunded</span>;
            case 'approved':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">Approved — waiting for refund</span>;
            case 'processing':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 animate-pulse">Approved — waiting for refund</span>;
            case 'under_review':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">Under Review</span>;
            case 'rejected':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">Rejected</span>;
            case 'cancelled_by_clinic':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/30">Withdrawn</span>;
            case 'requested':
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">Requested</span>;
        }
    };

    return (
        <PlatformLayout>
            <Head title="Refund Requests - Super Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3 font-display">
                            <span className="p-2.5 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20">
                                <RotateCcw className="w-6 h-6" />
                            </span>
                            Refund Requests
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Review, verify automated policy eligibility, and process clinic subscription payment refunds.
                        </p>
                    </div>

                    <Link
                        href="/super-admin/incidents"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                    >
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Platform Incidents
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onClick={() => handleFilterChange('requested')}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            statusFilter === 'requested'
                                ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20'
                                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-amber-500/30 shadow-sm'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span>Needs Review</span>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {counts.needs_action}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">2-day decision target</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleFilterChange('approved')}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            statusFilter === 'approved'
                                ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
                                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-blue-500/30 shadow-sm'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span>Approved — waiting for refund</span>
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[#1E6FD9] dark:text-blue-400">
                            {counts.processing}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Payments.lk dashboard action</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleFilterChange('refunded')}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            statusFilter === 'refunded'
                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20'
                                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-emerald-500/30 shadow-sm'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span>Completed</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {counts.refunded}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Credit notes issued</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleFilterChange('')}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                            statusFilter === ''
                                ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-white/20'
                                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-slate-300 shadow-sm'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span>Total Claims</span>
                            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {counts.total}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">All historical requests</div>
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-sm space-y-3">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by clinic name, request ID, credit note, or invoice..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                            >
                                <option value="">All Statuses</option>
                                <option value="approved">Approved — waiting for refund</option>
                                <option value="requested">Needs Review (Requested)</option>
                                <option value="refunded">Refunded (Completed)</option>
                                <option value="rejected">Rejected</option>
                                <option value="cancelled_by_clinic">Withdrawn</option>
                            </select>

                            <select
                                value={reasonFilter}
                                onChange={(e) => {
                                    setReasonFilter(e.target.value);
                                    router.get('/super-admin/refunds', {
                                        search: search || undefined,
                                        status: statusFilter || undefined,
                                        reason: e.target.value || undefined,
                                    }, { preserveState: true });
                                }}
                                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                            >
                                <option value="">All Reasons</option>
                                <option value="duplicate_charge">Duplicate Charge</option>
                                <option value="charged_after_cancellation">Charged After Cancellation</option>
                                <option value="first_payment_unused">First Payment (Unused)</option>
                                <option value="billing_error">Billing Error</option>
                                <option value="downtime">Platform Downtime</option>
                                <option value="other">Other / Custom</option>
                            </select>

                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium rounded-xl bg-[#1E6FD9] hover:bg-[#1658b0] text-white shadow-sm transition-colors"
                            >
                                Filter
                            </button>
                        </div>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200/80 dark:border-white/10">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold">Clinic & Payment</th>
                                    <th className="px-4 py-3.5 font-semibold">Reason & Eligibility</th>
                                    <th className="px-4 py-3.5 font-semibold text-right">Requested / Approved</th>
                                    <th className="px-4 py-3.5 font-semibold">Status</th>
                                    <th className="px-4 py-3.5 font-semibold">SLA / Age</th>
                                    <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {refunds.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                            <RotateCcw className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                                            <p className="font-medium text-slate-700 dark:text-slate-300">No refund requests found</p>
                                            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    refunds.data.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <span>{r.tenant.name}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                                                    <span>ID: <code className="font-mono text-slate-700 dark:text-slate-300">{r.public_id}</code></span>
                                                    {r.invoice_number && <span>• Inv: {r.invoice_number}</span>}
                                                    {r.credit_note_number && (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• {r.credit_note_number}</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                                    {r.reason_label}
                                                </div>
                                                <div className="mt-1">
                                                    {getEligibilityBadge(r.eligibility)}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-right">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {r.formatted_requested_amount}
                                                </div>
                                                {r.approved_amount_cents !== null && r.approved_amount_cents !== r.requested_amount_cents && (
                                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                        Appr: {r.formatted_approved_amount}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                {getStatusBadge(r.status)}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{r.created_at_human}</span>
                                                </div>
                                                {r.is_overdue && (
                                                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        Overdue {r.overdue_type === 'decision' ? '(> 2d review)' : '(> 5d refund)'}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={`/super-admin/refunds/${r.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20 dark:text-blue-400 hover:bg-[#1E6FD9] hover:text-white transition-all shadow-sm"
                                                >
                                                    Review <ArrowUpRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {refunds.last_page > 1 && (
                        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs text-slate-500">
                            <span>Showing {refunds.data.length} of {refunds.total} requests</span>
                            <div className="flex gap-1">
                                {refunds.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                            link.active
                                                ? 'bg-[#1E6FD9] text-white border-[#1E6FD9]'
                                                : link.url
                                                ? 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                : 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PlatformLayout>
    );
}
