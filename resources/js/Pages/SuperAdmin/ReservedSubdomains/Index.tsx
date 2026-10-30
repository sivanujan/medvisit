import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Globe,
    ShieldAlert,
    Clock,
    Plus,
    Trash2,
    Search,
    AlertCircle,
    CheckCircle2,
    X,
    Layers,
    FileText,
    Slash,
    Lock,
} from 'lucide-react';

interface DatabaseRecord {
    id: number;
    subdomain: string;
    reason: string;
    notes: string | null;
    held_until: string | null;
    is_active: boolean;
    is_indefinite: boolean;
    original_tenant_id: string | null;
    created_by: string | null;
    created_at: string | null;
}

interface ConfigData {
    hold_days: number;
    exact: string[];
    routes: string[];
    contains_global: string[];
    segment_blocks: string[];
    offensive: string[];
}

interface Stats {
    total_config_exact: number;
    total_route_segments: number;
    total_db_active: number;
    total_db_holds: number;
    total_db_indefinite: number;
}

interface Props {
    databaseList: DatabaseRecord[];
    configData: ConfigData;
    stats: Stats;
    activeTab: 'database' | 'config';
    search: string;
}

export default function Index({
    databaseList,
    configData,
    stats,
    activeTab: initialTab = 'database',
    search: initialSearch = '',
}: Props) {
    const [tab, setTab] = useState<'database' | 'config'>(initialTab);
    const [search, setSearch] = useState(initialSearch);
    const [configFilter, setConfigFilter] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const addForm = useForm({
        subdomain: '',
        reason: 'Reserved by Super Admin',
        notes: '',
        hold_days: '',
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/super-admin/reserved-subdomains', { search, tab }, { preserveState: true });
    };

    const handleCreateReserved = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/super-admin/reserved-subdomains', {
            onSuccess: () => {
                setIsAddModalOpen(false);
                addForm.reset();
            },
        });
    };

    const handleDelete = (record: DatabaseRecord) => {
        if (confirm(`Remove '${record.subdomain}' from reserved subdomains?`)) {
            router.delete(`/super-admin/reserved-subdomains/${record.id}`);
        }
    };

    // Filter config exact list by search
    const filteredExact = configData.exact.filter((item) =>
        item.toLowerCase().includes(configFilter.toLowerCase())
    );

    const filteredRoutes = configData.routes.filter((item) =>
        item.toLowerCase().includes(configFilter.toLowerCase())
    );

    return (
        <PlatformLayout>
            <Head title="Reserved Subdomains — MedVisit Platform" />

            <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
                {/* Header */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:text-blue-400">
                                <Globe className="w-5 h-5" />
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Reserved Subdomains
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Prevent clinic impersonation and protect system, brand, and official health handles across MedVisit.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1E6FD9] hover:bg-[#165bb5] text-white text-xs font-bold transition shadow-sm active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Reserved Subdomain</span>
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Config Exact Blocks</span>
                            <Lock className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_config_exact}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">System, health bodies & brand handles</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Central Route Segments</span>
                            <Layers className="w-4 h-4 text-[#0E9E8F]" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_route_segments}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Dynamically synced from central routes</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Custom Database Blocks</span>
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_db_indefinite}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Manually reserved by super admin</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span>Released Clinic Holds</span>
                            <Clock className="w-4 h-4 text-[#FF7A59]" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                            {stats.total_db_holds}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Temporary {configData.hold_days}-day anti-squatting holds</p>
                    </div>
                </div>

                {/* Tabs & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTab('database')}
                            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                                tab === 'database'
                                    ? 'bg-[#1E6FD9] text-white shadow-sm'
                                    : 'bg-white/60 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            Database Blocks & Holds ({databaseList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('config')}
                            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                                tab === 'config'
                                    ? 'bg-[#1E6FD9] text-white shadow-sm'
                                    : 'bg-white/60 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            Configured Static Rules
                        </button>
                    </div>

                    {tab === 'database' ? (
                        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Search subdomain or reason..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pl-9 pr-3 py-2 text-slate-900 dark:text-white"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </form>
                    ) : (
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Filter config keywords..."
                                value={configFilter}
                                onChange={(e) => setConfigFilter(e.target.value)}
                                className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pl-9 pr-3 py-2 text-slate-900 dark:text-white"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    )}
                </div>

                {/* Tab 1: Database Blocks Table */}
                {tab === 'database' && (
                    <div className="rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                        {databaseList.length === 0 ? (
                            <div className="p-12 text-center space-y-3">
                                <Globe className="w-10 h-10 text-slate-400 mx-auto" />
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    No database reservations found
                                </p>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Subdomains blocked via super admin or temporary holds created upon permanent clinic deletion will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-5">Subdomain</th>
                                            <th className="py-3 px-5">Type / Expiry</th>
                                            <th className="py-3 px-5">Reason</th>
                                            <th className="py-3 px-5">Notes / Details</th>
                                            <th className="py-3 px-5">Added By</th>
                                            <th className="py-3 px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                                        {databaseList.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                                                <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">
                                                    {item.subdomain}.medvisit.lk
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    {item.is_indefinite ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                            <Lock className="w-3 h-3" />
                                                            <span>Indefinite Block</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                            <Clock className="w-3 h-3" />
                                                            <span>
                                                                Hold until {item.held_until ? new Date(item.held_until).toLocaleDateString() : '—'}
                                                            </span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-5 font-medium text-slate-700 dark:text-slate-300">
                                                    {item.reason}
                                                </td>
                                                <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={item.notes || ''}>
                                                    {item.notes || '—'}
                                                </td>
                                                <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400">
                                                    {item.created_by || 'System'}
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(item)}
                                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                                                        title="Remove reservation"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Configured Static Rules View */}
                {tab === 'config' && (
                    <div className="space-y-6">
                        {/* Pattern Rules Card */}
                        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                <span>Segment-Based Pattern Blocks & Scunthorpe Guards</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                To prevent false positives on legitimate Sri Lankan names (e.g. <em>padmini</em>, <em>govinda</em>), segment blocks are only matched as complete hyphen-separated segments (e.g. <em>jaffna-admin</em> is blocked, but <em>padmini</em> is permitted).
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Global Substring Blocks (Contained Anywhere)
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {configData.contains_global.map((w) => (
                                            <span key={w} className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-bold">
                                                {w}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Hyphen-Separated Segment Blocks
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {configData.segment_blocks.map((w) => (
                                            <span key={w} className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold">
                                                {w}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Exact Config Matches Card */}
                        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-blue-500" />
                                    <span>Exact Reserved Keywords ({filteredExact.length})</span>
                                </h2>
                                <span className="text-xs text-slate-500 font-medium">Read-only from config/reserved_subdomains.php</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
                                {filteredExact.map((w) => (
                                    <span key={w} className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold">
                                        {w}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Central Route First Segments Card */}
                        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[#0E9E8F]" />
                                    <span>Dynamic Central Route Segments ({filteredRoutes.length})</span>
                                </h2>
                                <span className="text-xs text-slate-500 font-medium">Cached forever; refreshed on deployment via cache:clear</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5">
                                {filteredRoutes.map((w) => (
                                    <span key={w} className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono text-xs font-semibold">
                                        {w}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Custom Reserved Subdomain Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-4 h-4 text-[#1E6FD9]" />
                                <span>Reserve Subdomain</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateReserved} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Subdomain Handle *
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. jaffna-health"
                                        value={addForm.data.subdomain}
                                        onChange={(e) => addForm.setData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                                        className="w-full text-xs rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-mono"
                                    />
                                    <span className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-r-xl text-slate-500">
                                        .medvisit.lk
                                    </span>
                                </div>
                                {addForm.errors.subdomain && (
                                    <p className="mt-1 text-xs text-rose-500 font-medium">{addForm.errors.subdomain}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Reservation Reason *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. VIP hospital partner hold / legal request"
                                    value={addForm.data.reason}
                                    onChange={(e) => addForm.setData('reason', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                                />
                                {addForm.errors.reason && (
                                    <p className="mt-1 text-xs text-rose-500 font-medium">{addForm.errors.reason}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Temporary Hold Duration (Days)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="3650"
                                    placeholder="Leave empty for indefinite permanent block"
                                    value={addForm.data.hold_days}
                                    onChange={(e) => addForm.setData('hold_days', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">If blank, this subdomain remains permanently blocked.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Internal Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional context for other administrators..."
                                    value={addForm.data.notes}
                                    onChange={(e) => addForm.setData('notes', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addForm.processing}
                                    className="px-5 py-2 text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#165bb5] rounded-xl transition shadow-sm"
                                >
                                    {addForm.processing ? 'Saving...' : 'Save Reservation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}

