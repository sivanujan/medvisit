import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ShieldAlert,
    Filter,
    Search,
    Calendar,
    Download,
    Eye,
    X,
    User,
    Clock,
    Activity,
    Layers,
    ArrowRight,
    CheckCircle2,
    FileSpreadsheet,
} from 'lucide-react';
import { AuditLogItem } from '../types';

interface Props {
    auditLogs: AuditLogItem[];
    availableActions: string[];
    filters: {
        action: string;
        search: string;
        date: string;
    };
}

export default function AuditSection({ auditLogs, availableActions, filters }: Props) {
    const [localFilters, setLocalFilters] = useState(filters);
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/settings/audit', localFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        const cleared = { action: '', search: '', date: '' };
        setLocalFilters(cleared);
        router.get('/settings/audit', cleared, { preserveState: true });
    };

    const handleExportCsv = () => {
        setIsExporting(true);
        const params = new URLSearchParams();
        if (localFilters.action) params.append('action', localFilters.action);
        if (localFilters.date) params.append('date', localFilters.date);
        if (localFilters.search) params.append('search', localFilters.search);

        const url = `/settings/audit/export?${params.toString()}`;
        window.location.href = url;
        setTimeout(() => setIsExporting(false), 2000);
    };

    /**
     * Format action identifier into a human-readable description.
     */
    const formatActionMessage = (log: AuditLogItem): string => {
        const meta = log.metadata || {};
        const userName = log.user_name || 'System';

        switch (log.action) {
            case 'token.issued':
                return `${userName} issued token #${meta.token_number || ''} for ${meta.doctor_name || 'Doctor'}`;
            case 'token.cancelled':
                return `${userName} cancelled token #${meta.token_number || ''} (${meta.reason || 'Patient request'})`;
            case 'token.called':
                return `${userName} called token #${meta.token_number || ''} into consultation room`;
            case 'token.completed':
                return `${userName} completed visit for token #${meta.token_number || ''}`;
            case 'session.created':
                return `${userName} scheduled session for ${meta.doctor_name || 'Doctor'} on ${meta.date || 'today'}`;
            case 'session.status_updated':
                return `${userName} changed session status to ${meta.status || ''}`;
            case 'settings.profile_updated':
                return `${userName} updated clinic profile details`;
            case 'settings.billing_updated':
                return `${userName} updated cashier billing and payment rules`;
            case 'settings.session_defaults_updated':
                return `${userName} updated channeling session defaults`;
            case 'settings.online_booking_updated':
                return `${userName} updated public online booking settings`;
            case 'settings.pharmacy_updated':
                return `${userName} updated pharmacy and stock thresholds`;
            case 'settings.directory_updated':
                return `${userName} updated public directory listing configuration`;
            case 'clinic.logo_updated':
                return `${userName} updated clinic branding logo`;
            case 'audit.exported':
                return `${userName} exported audit trail logs to CSV`;
            case 'user.login':
                return `${userName} signed into workspace from ${log.ip_address || 'device'}`;
            case 'user.logout':
                return `${userName} signed out of clinic workspace`;
            default:
                return `${userName} performed ${log.action.replace(/[._]/g, ' ')}`;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        System audit trail
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Immutable regulatory and security event logs tracking staff actions, token issues, billing changes and logins.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors shrink-0 disabled:opacity-50"
                >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>{isExporting ? 'Preparing CSV…' : 'Export CSV'}</span>
                </button>
            </div>

            {/* Filter Bar */}
            <form
                onSubmit={handleFilterSubmit}
                className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3"
            >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4 relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            value={localFilters.search}
                            onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                            placeholder="Search by user, action, IP or token..."
                            className="w-full pl-9 pr-3.5 py-2 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <select
                            value={localFilters.action}
                            onChange={(e) => setLocalFilters({ ...localFilters, action: e.target.value })}
                            className="w-full px-3 py-2 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                        >
                            <option value="">All Action Types</option>
                            {availableActions.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-3">
                        <input
                            type="date"
                            value={localFilters.date}
                            onChange={(e) => setLocalFilters({ ...localFilters, date: e.target.value })}
                            className="w-full px-3 py-2 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                        />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2">
                        <button
                            type="submit"
                            className="w-full py-2 rounded-2xl text-xs font-bold bg-[#1E6FD9] hover:bg-blue-600 text-white shadow-xs transition-colors"
                        >
                            Filter
                        </button>
                        {(localFilters.action || localFilters.search || localFilters.date) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {/* Audit Log Table / Cards */}
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                {auditLogs.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                        <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            No audit events found
                        </h4>
                        <p className="text-[11px] text-slate-400">
                            Try adjusting your filters or date search criteria.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {auditLogs.map((log) => {
                            const message = formatActionMessage(log);
                            const userInitial = (log.user_name || 'S').charAt(0).toUpperCase();

                            return (
                                <div
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Actor Avatar */}
                                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#1E6FD9]/15 to-[#0E9E8F]/15 border border-[#1E6FD9]/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                            {userInitial}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate">
                                                {message}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-semibold">
                                                    {log.action}
                                                </span>
                                                <span>•</span>
                                                <span>{log.created_at_relative}</span>
                                                {log.ip_address && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-mono text-[10px]">{log.ip_address}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="p-2 rounded-xl text-slate-400 group-hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                        title="View event payload details"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Details Drawer Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setSelectedLog(null)}
                    />

                    <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 z-10 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Audit event details
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Action:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {selectedLog.action}
                                </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Actor:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    {selectedLog.user_name} ({selectedLog.user_email || 'No email'})
                                </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Timestamp:</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {selectedLog.created_at} ({selectedLog.created_at_relative})
                                </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">IP Address:</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {selectedLog.ip_address || 'Internal'}
                                </span>
                            </div>

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                                        Payload & before/after values:
                                    </span>
                                    <pre className="p-3 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
