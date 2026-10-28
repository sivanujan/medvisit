import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    AlertTriangle,
    Plus,
    Clock,
    CheckCircle2,
    Calendar,
    Edit2,
    Trash2,
    ArrowLeft,
    ShieldAlert,
} from 'lucide-react';
import GlassModal from '@/Components/UI/GlassModal';

interface Incident {
    id: number;
    title: string;
    started_at: string;
    ended_at: string | null;
    duration_hours: number;
    affects_all_tenants: boolean;
    tenant_ids: string[];
    is_planned_maintenance: boolean;
    notes: string | null;
    created_at: string;
}

interface Tenant {
    id: string;
    name: string;
}

interface Props {
    incidents: {
        data: Incident[];
        links: any[];
        total: number;
    };
    tenants: Tenant[];
}

export default function IncidentsIndex({ incidents, tenants }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

    const form = useForm({
        title: '',
        started_at: '',
        ended_at: '',
        affects_all_tenants: true,
        tenant_ids: [] as string[],
        is_planned_maintenance: false,
        notes: '',
    });

    const openCreate = () => {
        setEditingIncident(null);
        form.setData({
            title: '',
            started_at: new Date().toISOString().slice(0, 16),
            ended_at: '',
            affects_all_tenants: true,
            tenant_ids: [],
            is_planned_maintenance: false,
            notes: '',
        });
        setShowModal(true);
    };

    const openEdit = (inc: Incident) => {
        setEditingIncident(inc);
        form.setData({
            title: inc.title,
            started_at: inc.started_at ? inc.started_at.slice(0, 16) : '',
            ended_at: inc.ended_at ? inc.ended_at.slice(0, 16) : '',
            affects_all_tenants: inc.affects_all_tenants,
            tenant_ids: inc.tenant_ids || [],
            is_planned_maintenance: inc.is_planned_maintenance,
            notes: inc.notes || '',
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingIncident) {
            form.put(`/super-admin/incidents/${editingIncident.id}`, {
                onSuccess: () => setShowModal(false),
            });
        } else {
            form.post('/super-admin/incidents', {
                onSuccess: () => setShowModal(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this incident record?')) {
            form.delete(`/super-admin/incidents/${id}`);
        }
    };

    return (
        <PlatformLayout>
            <Head title="Platform Incidents - Super Admin" />

            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/super-admin/refunds"
                            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 font-display">
                                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20">
                                    <AlertTriangle className="w-6 h-6" />
                                </span>
                                Platform Incidents & Downtime
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Record outages and service disruptions used by the automated refund eligibility engine (&gt; 48h SLA rule).
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#1E6FD9] hover:bg-[#1658b0] text-white shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Record Incident
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200/80 dark:border-white/10">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold">Incident Title</th>
                                    <th className="px-4 py-3.5 font-semibold">Started / Ended</th>
                                    <th className="px-4 py-3.5 font-semibold">Duration</th>
                                    <th className="px-4 py-3.5 font-semibold">Type</th>
                                    <th className="px-4 py-3.5 font-semibold">Affected Clinics</th>
                                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {incidents.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                            <AlertTriangle className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                                            <p className="font-medium text-slate-700 dark:text-slate-300">No platform incidents recorded</p>
                                            <p className="text-xs text-slate-500 mt-1">Record historical or current downtime to support downtime refund claims.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    incidents.data.map((inc) => (
                                        <tr key={inc.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                                                {inc.title}
                                                {inc.notes && (
                                                    <div className="text-xs font-normal text-slate-500 mt-0.5 line-clamp-1">{inc.notes}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                                                <div>From: {new Date(inc.started_at).toLocaleString()}</div>
                                                <div>To: {inc.ended_at ? new Date(inc.ended_at).toLocaleString() : <span className="text-amber-500 font-semibold">Ongoing</span>}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                                                    inc.duration_hours > 48
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {inc.duration_hours} hrs
                                                    {inc.duration_hours > 48 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 font-semibold">&gt; 48h SLA</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {inc.is_planned_maintenance ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">Planned Maintenance</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">Unplanned Outage</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                                                {inc.affects_all_tenants ? 'All Clinics (Platform-wide)' : `${inc.tenant_ids.length} Specific Clinic(s)`}
                                            </td>
                                            <td className="px-5 py-4 text-right space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(inc)}
                                                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(inc.id)}
                                                    className="p-1.5 text-rose-500 hover:text-rose-700"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            {/* Modal: Create/Edit Incident */}
            <GlassModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                        {editingIncident ? 'Edit Incident Record' : 'Record Platform Incident'}
                    </h3>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Incident Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Primary Database Outage"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Started At
                            </label>
                            <input
                                type="datetime-local"
                                value={form.data.started_at}
                                onChange={(e) => form.setData('started_at', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Ended At (Leave blank if ongoing)
                            </label>
                            <input
                                type="datetime-local"
                                value={form.data.ended_at}
                                onChange={(e) => form.setData('ended_at', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={form.data.is_planned_maintenance}
                                onChange={(e) => form.setData('is_planned_maintenance', e.target.checked)}
                                className="rounded text-[#1E6FD9] focus:ring-0"
                            />
                            Is Planned Maintenance (Planned maintenance does not qualify for downtime refund)
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={form.data.affects_all_tenants}
                                onChange={(e) => form.setData('affects_all_tenants', e.target.checked)}
                                className="rounded text-[#1E6FD9] focus:ring-0"
                            />
                            Affects All Clinics (Platform-wide outage)
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Notes & Root Cause
                        </label>
                        <textarea
                            rows={3}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="Details, post-mortem notes, or communication references."
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1E6FD9] text-white hover:bg-[#1658b0] disabled:opacity-50"
                        >
                            {editingIncident ? 'Save Changes' : 'Record Incident'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
