import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { GlassModal } from '@/Components/UI/GlassModal';
import {
    Building2,
    Search,
    Download,
    Eye,
    ShieldAlert,
    CheckCircle2,
    Clock,
    Phone,
    Mail,
    ChevronRight,
    Filter,
    Stethoscope,
    Ticket,
    RefreshCw,
    AlertTriangle,
    RotateCcw,
} from 'lucide-react';

interface ClinicItem {
    id: string;
    name: string;
    subdomain: string;
    url: string;
    phone?: string;
    plan: string;
    status: string;
    mrr_lkr: number;
    owner_name: string;
    owner_email: string;
    doctors_count: number;
    tokens_this_month: number;
    trial_ends_at?: string;
    created_at: string;
    deleted_at?: string | null;
}

interface IndexProps {
    clinics: {
        data: ClinicItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    filters: {
        search: string;
        status: string;
        plan: string;
        archived: boolean;
    };
    plans: Array<{ name: string; slug: string }>;
}

export default function ClinicsIndex({ clinics, filters, plans }: IndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [plan, setPlan] = useState(filters.plan || 'all');
    const [archived, setArchived] = useState(filters.archived || false);

    // Suspend Modal state
    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [targetClinic, setTargetClinic] = useState<ClinicItem | null>(null);
    const [suspendReason, setSuspendReason] = useState('');

    const handleFilterSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            '/super-admin/clinics',
            { search, status, plan, archived: archived ? '1' : undefined },
            { preserveState: true }
        );
    };

    const handleSuspend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetClinic || !suspendReason) return;

        router.post(
            `/super-admin/clinics/${targetClinic.id}/suspend`,
            { reason: suspendReason },
            {
                onSuccess: () => {
                    setSuspendModalOpen(false);
                    setSuspendReason('');
                    setTargetClinic(null);
                },
            }
        );
    };

    const handleReactivate = (clinic: ClinicItem) => {
        if (confirm(`Reactivate clinic "${clinic.name}"?`)) {
            router.post(`/super-admin/clinics/${clinic.id}/reactivate`);
        }
    };

    const handleRestore = (clinic: ClinicItem) => {
        if (confirm(`Restore archived clinic "${clinic.name}"?`)) {
            router.post(`/super-admin/clinics/${clinic.id}/restore`);
        }
    };

    return (
        <PlatformLayout>
            <Head title="Clinics Directory • MedVisit Platform" />

            <PageHeader
                eyebrow="Fleet Management"
                title="Clinics Directory"
                subtitle={`Managing ${clinics.total} healthcare tenant workspaces across Sri Lanka.`}
                actions={
                    <div className="flex items-center gap-2.5">
                        <a
                            href={`/super-admin/clinics?export=csv&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                        </a>
                    </div>
                }
            />

            {/* Filter Bar */}
            <GlassCard className="p-4 mt-6">
                <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by clinic name, subdomain, owner, phone..."
                            className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            router.get(
                                '/super-admin/clinics',
                                { search, status: e.target.value, plan, archived: archived ? '1' : undefined },
                                { preserveState: true }
                            );
                        }}
                        className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="past_due">Past Due</option>
                        <option value="suspended">Suspended</option>
                        <option value="comp">Comp</option>
                    </select>

                    {/* Plan Filter */}
                    <select
                        value={plan}
                        onChange={(e) => {
                            setPlan(e.target.value);
                            router.get(
                                '/super-admin/clinics',
                                { search, status, plan: e.target.value, archived: archived ? '1' : undefined },
                                { preserveState: true }
                            );
                        }}
                        className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Plans</option>
                        {plans.map((p) => (
                            <option key={p.slug} value={p.slug}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    {/* Archived Toggle */}
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer px-2">
                        <input
                            type="checkbox"
                            checked={archived}
                            onChange={(e) => {
                                setArchived(e.target.checked);
                                router.get(
                                    '/super-admin/clinics',
                                    { search, status, plan, archived: e.target.checked ? '1' : undefined },
                                    { preserveState: true }
                                );
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Archived (Soft-Deleted)</span>
                    </label>

                    <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
                    >
                        Filter
                    </button>
                </form>
            </GlassCard>

            {/* Clinics Table */}
            <GlassCard className="mt-6 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3.5">Clinic Workspace</th>
                                <th className="px-4 py-3.5">Owner / Contact</th>
                                <th className="px-4 py-3.5">Plan & MRR</th>
                                <th className="px-4 py-3.5">Status</th>
                                <th className="px-4 py-3.5">Usage (Mo)</th>
                                <th className="px-4 py-3.5">Registered</th>
                                <th className="px-4 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {clinics.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No clinics found matching the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                clinics.data.map((clinic) => (
                                    <tr key={clinic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                        {/* Clinic Name & Subdomain */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    {clinic.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/super-admin/clinics/${clinic.id}`}
                                                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition"
                                                    >
                                                        {clinic.name}
                                                    </Link>
                                                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        <span>{clinic.subdomain}.medvisit.lk</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Owner / Contact */}
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                {clinic.owner_name}
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                                {clinic.owner_email || clinic.phone || 'No direct contact'}
                                            </div>
                                        </td>

                                        {/* Plan & MRR */}
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                {clinic.plan}
                                            </div>
                                            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                                                {clinic.mrr_lkr > 0 ? `Rs. ${clinic.mrr_lkr.toLocaleString()}/mo` : 'Rs. 0.00'}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4">
                                            {clinic.deleted_at ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                    Archived
                                                </span>
                                            ) : clinic.status === 'suspended' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                    Suspended
                                                </span>
                                            ) : clinic.status === 'active' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                                                    {clinic.status}
                                                </span>
                                            )}
                                        </td>

                                        {/* Usage metrics */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1" title="Active Doctors">
                                                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                                                    {clinic.doctors_count}
                                                </span>
                                                <span className="flex items-center gap-1" title="Tokens this month">
                                                    <Ticket className="w-3.5 h-3.5 text-slate-400" />
                                                    {clinic.tokens_this_month}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Created At */}
                                        <td className="px-4 py-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                            {clinic.created_at}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link
                                                    href={`/super-admin/clinics/${clinic.id}`}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                    title="View Clinic Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>

                                                {clinic.deleted_at ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRestore(clinic)}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                                                        title="Restore Clinic"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                ) : clinic.status === 'suspended' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReactivate(clinic)}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                                                        title="Reactivate Clinic"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTargetClinic(clinic);
                                                            setSuspendModalOpen(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                                        title="Suspend Clinic"
                                                    >
                                                        <ShieldAlert className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {clinics.links && clinics.links.length > 3 && (
                    <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                            Showing {clinics.data.length} of {clinics.total} clinics
                        </span>
                        <div className="flex items-center gap-1">
                            {clinics.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                                        link.active
                                            ? 'bg-indigo-600 text-white font-bold'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    } ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* Suspend Confirmation Modal */}
            <GlassModal
                isOpen={suspendModalOpen}
                onClose={() => {
                    setSuspendModalOpen(false);
                    setTargetClinic(null);
                    setSuspendReason('');
                }}
                title={`Suspend Workspace: ${targetClinic?.name}`}
            >
                <form onSubmit={handleSuspend} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        When suspended, all clinic staff will be blocked and shown an account suspended notice. Public online bookings will immediately show 503 unavailable.
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Suspension Reason (Required for Audit Log) *
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            placeholder="e.g. Overdue payment over 45 days / Terms of service violation..."
                            className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSuspendModalOpen(false);
                                setTargetClinic(null);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!suspendReason.trim()}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50"
                        >
                            Confirm Suspension
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
