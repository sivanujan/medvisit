import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Shield,
    Search,
    Filter,
    Download,
    Eye,
    X,
    Calendar,
    User,
    Building2,
    Globe,
    Terminal,
    Copy,
    Check,
} from 'lucide-react';

interface AuditItem {
    id: string;
    tenant_id?: string | null;
    user_id?: number | null;
    action: string;
    resource_type?: string | null;
    resource_id?: string | null;
    metadata?: Record<string, any> | null;
    ip_address?: string | null;
    user_agent?: string | null;
    reason?: string | null;
    created_at: string;
    user?: { name: string; email: string; roles?: Array<{ name: string }> } | null;
    tenant?: { name: string } | null;
}

interface Props {
    events: {
        data: AuditItem[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
        action?: string;
        tenant_id?: string;
        user_id?: string;
        date_from?: string;
        date_to?: string;
    };
    availableActions: string[];
    availableClinics: Array<{ id: string; name: string }>;
    availableUsers: Array<{ id: number; name: string; email: string }>;
}

export default function AuditLogsIndex({
    events,
    filters,
    availableActions = [],
    availableClinics = [],
    availableUsers = [],
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [actionFilter, setActionFilter] = useState(filters.action || '');
    const [tenantFilter, setTenantFilter] = useState(filters.tenant_id || '');
    const [userFilter, setUserFilter] = useState(filters.user_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Side Drawer for inspecting row metadata
    const [selectedEvent, setSelectedEvent] = useState<AuditItem | null>(null);
    const [copied, setCopied] = useState(false);

    const handleFilter = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get('/super-admin/audit-logs', {
            search,
            action: actionFilter,
            tenant_id: tenantFilter,
            user_id: userFilter,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true });
    };

    const handleCopyJson = () => {
        if (!selectedEvent) return;
        navigator.clipboard.writeText(JSON.stringify(selectedEvent.metadata || {}, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getActionBadgeClass = (action: string) => {
        if (action.includes('suspend') || action.includes('delete') || action.includes('failed') || action.includes('destroy')) {
            return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        }
        if (action.includes('impersonate') || action.includes('warning') || action.includes('reset')) {
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        }
        if (action.includes('login') || action.includes('create') || action.includes('active') || action.includes('paid')) {
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        }
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    };

    const exportUrl = `/super-admin/audit-logs/export?${new URLSearchParams({
        search,
        action: actionFilter,
        tenant_id: tenantFilter,
        user_id: userFilter,
        date_from: dateFrom,
        date_to: dateTo,
    }).toString()}`;

    return (
        <PlatformLayout>
            <Head title="Platform Audit Trail — MedVisit Platform" />

            <div className="space-y-6">
                {/* Header with Export */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Shield className="w-6 h-6 text-indigo-500" />
                            Platform Audit Log
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Immutable security audit trail capturing administrator operations, clinic suspensions, and security events.
                        </p>
                    </div>

                    <a
                        href={exportUrl}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs sm:text-sm shadow-sm transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Export Filtered CSV
                    </a>
                </div>

                {/* Filter Toolbar */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                    <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                        <div className="lg:col-span-2 relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search action, IP, resource ID..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-xs sm:text-sm"
                            />
                        </div>

                        <div>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                            >
                                <option value="">All Actions</option>
                                {availableActions.map((act) => (
                                    <option key={act} value={act}>{act}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={tenantFilter}
                                onChange={(e) => setTenantFilter(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                            >
                                <option value="">All Clinics</option>
                                {availableClinics.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                                placeholder="From Date"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                Apply Filters
                            </button>
                        </div>
                    </form>
                </div>

                {/* Audit Log Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4">Actor</th>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4">Clinic / Scope</th>
                                    <th className="py-3 px-4">Resource Target</th>
                                    <th className="py-3 px-4">IP Address</th>
                                    <th className="py-3 px-4 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {events.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-slate-400">
                                            No audit events found matching filters.
                                        </td>
                                    </tr>
                                ) : (
                                    events.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => setSelectedEvent(item)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        >
                                            <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                                                {item.created_at}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {item.user?.name || 'System Engine'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {item.user?.roles?.[0]?.name ? item.user.roles[0].name.replace('_', ' ') : 'Central'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${getActionBadgeClass(item.action)}`}>
                                                    {item.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {item.tenant?.name || 'Central Platform'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-slate-500">
                                                {item.resource_type ? `${item.resource_type} #${item.resource_id || ''}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-slate-400">
                                                {item.ip_address || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEvent(item);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="View Metadata Drawer"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Side Drawer for Inspecting Metadata */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
                    <div
                        className="fixed inset-0"
                        onClick={() => setSelectedEvent(null)}
                    />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-200 dark:border-white/10 animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadgeClass(selectedEvent.action)} mb-1`}>
                                    {selectedEvent.action}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Audit Event Details</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedEvent(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Timestamp:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-200">{selectedEvent.created_at}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Actor:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {selectedEvent.user?.name || 'System Engine'} ({selectedEvent.user?.email || 'N/A'})
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Clinic:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedEvent.tenant?.name || 'Central Platform'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">IP Address:</span>
                                    <span className="font-mono">{selectedEvent.ip_address || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">User Agent:</span>
                                    <span className="truncate max-w-[200px]" title={selectedEvent.user_agent || ''}>
                                        {selectedEvent.user_agent || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Metadata JSON Viewer */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Sanitized Metadata (Secrets Redacted):</span>
                                    <button
                                        type="button"
                                        onClick={handleCopyJson}
                                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                        {copied ? 'Copied' : 'Copy JSON'}
                                    </button>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-72">
                                    <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}
