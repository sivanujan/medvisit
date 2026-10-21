import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Megaphone,
    ArrowLeft,
    Download,
    CheckCircle2,
    XCircle,
    Eye,
    MousePointerClick,
    Mail,
    Bell,
    Calendar,
    Users,
} from 'lucide-react';

interface RecipientItem {
    id: string;
    channel: string;
    status: string;
    email?: string | null;
    error_reason?: string | null;
    sent_at?: string | null;
    read_at?: string | null;
    dismissed_at?: string | null;
    clicked_at?: string | null;
    tenant?: { name: string } | null;
    user?: { name: string; email: string } | null;
}

interface Props {
    announcement: {
        id: string;
        title: string;
        message: string;
        type: string;
        status: string;
        channels: string[];
        created_at: string;
        sent_at?: string | null;
        creator?: { name: string } | null;
        cta_label?: string | null;
        cta_url?: string | null;
    };
    recipients: {
        data: RecipientItem[];
        links: any[];
        total: number;
    };
    stats: {
        total: number;
        delivered: number;
        failed: number;
        read: number;
        dismissed: number;
        clicked: number;
    };
}

export default function AnnouncementShow({ announcement, recipients, stats }: Props) {
    return (
        <PlatformLayout>
            <Head title={`Report: ${announcement.title} — MedVisit Platform`} />

            <div className="space-y-6">
                {/* Header with Back and Export */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/super-admin/announcements"
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                    {announcement.type}
                                </span>
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                                    {announcement.title}
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Sent on {announcement.sent_at || announcement.created_at} by {announcement.creator?.name || 'Super Admin'}
                            </p>
                        </div>
                    </div>

                    <a
                        href={`/super-admin/announcements/${announcement.id}/export`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs sm:text-sm shadow-sm transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Export Delivery CSV
                    </a>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recipients</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Delivered</span>
                        <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Failed</span>
                        <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">{stats.failed}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-cyan-600 uppercase tracking-wider">In-App Reads</span>
                        <div className="text-xl sm:text-2xl font-bold text-cyan-600 mt-1">{stats.read}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Banner Dismissals</span>
                        <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.dismissed}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">CTA Clicks</span>
                        <div className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{stats.clicked}</div>
                    </div>
                </div>

                {/* Recipient Deliveries Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Log by Clinic & Recipient</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Clinic / Tenant</th>
                                    <th className="py-3 px-4">Recipient</th>
                                    <th className="py-3 px-4">Channel</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Delivery Time</th>
                                    <th className="py-3 px-4">Interactions</th>
                                    <th className="py-3 px-4">Error Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {recipients.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No delivery records found for this announcement.
                                        </td>
                                    </tr>
                                ) : (
                                    recipients.data.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                                {rec.tenant?.name || 'All Clinics'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {rec.email || rec.user?.email || 'Clinic Broadcast'}
                                            </td>
                                            <td className="py-3 px-4 capitalize">
                                                <span className="inline-flex items-center gap-1">
                                                    {rec.channel === 'email' && <Mail className="w-3.5 h-3.5 text-blue-500" />}
                                                    {rec.channel === 'in_app' && <Bell className="w-3.5 h-3.5 text-indigo-500" />}
                                                    {rec.channel === 'banner' && <Megaphone className="w-3.5 h-3.5 text-amber-500" />}
                                                    {rec.channel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                    rec.status === 'sent' || rec.status === 'delivered' || rec.status === 'read'
                                                        ? 'bg-emerald-500/10 text-emerald-600'
                                                        : rec.status === 'failed'
                                                        ? 'bg-rose-500/10 text-rose-600'
                                                        : 'bg-slate-500/10 text-slate-600'
                                                }`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500">
                                                {rec.sent_at || 'Pending'}
                                            </td>
                                            <td className="py-3 px-4 text-xs">
                                                <div className="flex items-center gap-2">
                                                    {rec.read_at && (
                                                        <span className="inline-flex items-center gap-1 text-cyan-600" title={`Read: ${rec.read_at}`}>
                                                            <Eye className="w-3.5 h-3.5" /> Read
                                                        </span>
                                                    )}
                                                    {rec.clicked_at && (
                                                        <span className="inline-flex items-center gap-1 text-indigo-600" title={`Clicked: ${rec.clicked_at}`}>
                                                            <MousePointerClick className="w-3.5 h-3.5" /> Clicked
                                                        </span>
                                                    )}
                                                    {rec.dismissed_at && (
                                                        <span className="inline-flex items-center gap-1 text-slate-400" title={`Dismissed: ${rec.dismissed_at}`}>
                                                            Dismissed
                                                        </span>
                                                    )}
                                                    {!rec.read_at && !rec.clicked_at && !rec.dismissed_at && (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-rose-500 max-w-xs truncate">
                                                {rec.error_reason || '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PlatformLayout>
    );
}
