import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Megaphone,
    Bell,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Send,
    Eye,
    Copy,
    X,
    Radio,
    Mail,
    Smartphone,
    MessageSquare,
    ExternalLink,
    Trash2,
    Users,
    Building2,
    BarChart3,
    ArrowUpRight,
} from 'lucide-react';

interface AnnouncementItem {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'update' | 'warning' | 'maintenance' | 'billing';
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partially_failed' | 'cancelled';
    channels: string[];
    audience_type: string;
    scheduled_at?: string | null;
    sent_at?: string | null;
    created_at: string;
    creator?: { name: string } | null;
}

interface Props {
    announcements: {
        data: AnnouncementItem[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
    metrics: {
        total: number;
        sent: number;
        scheduled: number;
        drafts: number;
        read_rate: number;
        click_rate: number;
    };
    availableClinics: Array<{ id: string; name: string }>;
    availablePlans: Array<{ id: number; name: string; slug: string }>;
}

const TEMPLATES = [
    {
        name: 'Planned Maintenance',
        type: 'maintenance',
        title: 'Scheduled Maintenance Notice',
        message: '<p>MedVisit Platform will undergo routine system maintenance on Sunday between 02:00 AM and 04:00 AM (Asia/Colombo). During this period, the system may experience brief intermittent pauses. Please conclude your dispensing and consultations ahead of this window.</p>',
        cta_label: 'Status Page',
        cta_url: 'https://status.medvisit.lk',
    },
    {
        name: 'New Feature Announcement',
        type: 'update',
        title: 'New Feature: Enhanced RxTerms Drug Lookup',
        message: '<p>We have updated the global medicine catalog with instant brand/generic autocomplete from standard RxTerms. When prescribing or dispensing, search suggestions now load faster with dosage form hints.</p>',
        cta_label: 'Explore Catalog',
        cta_url: '/pharmacy/medicines',
    },
    {
        name: 'Monthly Billing Reminder',
        type: 'billing',
        title: 'Subscription Invoice Reminder',
        message: '<p>This is a reminder that your monthly clinic subscription invoice has been generated. Please review your billing portal to ensure uninterrupted access to the clinic workspace.</p>',
        cta_label: 'View Billing',
        cta_url: '/settings/billing',
    },
];

export default function AnnouncementsIndex({
    announcements,
    filters,
    metrics,
    availableClinics = [],
    availablePlans = [],
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');

    // Compose Modal state
    const [composeOpen, setComposeOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info',
        cta_label: '',
        cta_url: '',
        channels: ['in_app', 'banner', 'email'],
        audience_type: 'all',
        target_clinic_ids: [] as string[],
        target_plans: [] as string[],
        target_statuses: [] as string[],
        target_recipient_roles: ['clinic_admin'],
        banner_start_at: '',
        banner_end_at: '',
        banner_dismissible: true,
        action: 'send', // draft, send, schedule
        scheduled_at: '',
    });

    const [audienceSummary, setAudienceSummary] = useState('Calculating recipients...');
    const [previewTab, setPreviewTab] = useState<'edit' | 'preview_email' | 'preview_banner'>('edit');
    const [testSendLoading, setTestSendLoading] = useState(false);
    const [testSendFeedback, setTestSendFeedback] = useState<string | null>(null);

    // Live Audience Count Query
    useEffect(() => {
        if (!composeOpen) return;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch('/super-admin/announcements/audience-count', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    },
                    body: JSON.stringify({
                        audience_type: formData.audience_type,
                        target_clinic_ids: formData.target_clinic_ids,
                        target_plans: formData.target_plans,
                        target_statuses: formData.target_statuses,
                        target_recipient_roles: formData.target_recipient_roles,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setAudienceSummary(data.summary || `${data.clinics_count} clinics · ${data.people_count} people`);
                }
            } catch {
                setAudienceSummary('Unable to calculate recipients');
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [
        composeOpen,
        formData.audience_type,
        formData.target_clinic_ids,
        formData.target_plans,
        formData.target_statuses,
        formData.target_recipient_roles,
    ]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/super-admin/announcements', {
            search,
            status: statusFilter,
            type: typeFilter,
        }, { preserveState: true });
    };

    const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
        setFormData((prev) => ({
            ...prev,
            title: tpl.title,
            message: tpl.message,
            type: tpl.type,
            cta_label: tpl.cta_label,
            cta_url: tpl.cta_url,
        }));
    };

    const handleSendTest = async () => {
        setTestSendLoading(true);
        setTestSendFeedback(null);
        try {
            const res = await fetch('/super-admin/announcements/test-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    title: formData.title || 'Untitled Test',
                    message: formData.message || '<p>No content entered</p>',
                    type: formData.type,
                    cta_label: formData.cta_label,
                    cta_url: formData.cta_url,
                }),
            });
            const data = await res.json();
            setTestSendFeedback(data.message || 'Test email dispatched.');
        } catch {
            setTestSendFeedback('Failed sending test email.');
        } finally {
            setTestSendLoading(false);
        }
    };

    const handleSubmit = (actionType: 'draft' | 'send' | 'schedule') => {
        router.post('/super-admin/announcements', {
            ...formData,
            action: actionType,
        }, {
            onSuccess: () => {
                setComposeOpen(false);
            },
        });
    };

    const getTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'maintenance':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            case 'warning':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'billing':
                return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
            case 'update':
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            default:
                return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Sent
                    </span>
                );
            case 'sending':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
                        <Radio className="w-3 h-3" /> Sending
                    </span>
                );
            case 'scheduled':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Clock className="w-3 h-3" /> Scheduled
                    </span>
                );
            case 'draft':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        Draft
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Cancelled
                    </span>
                );
            default:
                return <span>{status}</span>;
        }
    };

    return (
        <PlatformLayout>
            <Head title="Broadcast Announcements — MedVisit Platform" />

            <div className="space-y-6">
                {/* Header with Compose Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Megaphone className="w-6 h-6 text-indigo-500" />
                            Broadcast Announcements
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Publish system notifications, maintenance windows, and product updates to clinic apps and emails.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setFormData({
                                title: '',
                                message: '',
                                type: 'info',
                                cta_label: '',
                                cta_url: '',
                                channels: ['in_app', 'banner', 'email'],
                                audience_type: 'all',
                                target_clinic_ids: [],
                                target_plans: [],
                                target_statuses: [],
                                target_recipient_roles: ['clinic_admin'],
                                banner_start_at: '',
                                banner_end_at: '',
                                banner_dismissible: true,
                                action: 'send',
                                scheduled_at: '',
                            });
                            setComposeOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Compose Announcement
                    </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.total}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Sent</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.sent}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Scheduled</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.scheduled}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Drafts</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.drafts}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Read Rate</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.read_rate}%</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">CTA Click Rate</span>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.click_rate}%</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                    <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search announcements by title or content..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            Filter
                        </button>
                    </form>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                router.get('/super-admin/announcements', {
                                    search,
                                    status: e.target.value,
                                    type: typeFilter,
                                }, { preserveState: true });
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                        >
                            <option value="">All Statuses</option>
                            <option value="sent">Sent</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="sending">Sending</option>
                            <option value="draft">Draft</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                router.get('/super-admin/announcements', {
                                    search,
                                    status: statusFilter,
                                    type: e.target.value,
                                }, { preserveState: true });
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                        >
                            <option value="">All Types</option>
                            <option value="info">Info</option>
                            <option value="update">Update / Feature</option>
                            <option value="warning">Warning</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="billing">Billing</option>
                        </select>
                    </div>
                </div>

                {/* Announcements Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Title & Message</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Audience</th>
                                    <th className="py-3 px-4">Channels</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {announcements.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            No broadcast announcements found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    announcements.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                                    {item.message.replace(/<[^>]*>?/gm, '')}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getTypeBadgeClass(item.type)}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 capitalize text-xs">
                                                {item.audience_type}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    {item.channels.includes('in_app') && <span title="In-App Bell"><Bell className="w-3.5 h-3.5 text-indigo-500" /></span>}
                                                    {item.channels.includes('banner') && <span title="Top Banner"><Megaphone className="w-3.5 h-3.5 text-amber-500" /></span>}
                                                    {item.channels.includes('email') && <span title="Email Broadcast"><Mail className="w-3.5 h-3.5 text-blue-500" /></span>}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                                            <td className="py-3.5 px-4 text-xs text-slate-500">
                                                {item.sent_at || item.scheduled_at || item.created_at}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/super-admin/announcements/${item.id}`}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                                        title="View Delivery Report"
                                                    >
                                                        <BarChart3 className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/super-admin/announcements/${item.id}/duplicate`)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                                        title="Duplicate into Draft"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    {item.status === 'scheduled' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.post(`/super-admin/announcements/${item.id}/cancel`)}
                                                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                                            title="Cancel Scheduled Send"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {item.status === 'draft' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.delete(`/super-admin/announcements/${item.id}`)}
                                                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                            title="Delete Draft"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
                </div>
            </div>

            {/* Compose Modal */}
            {composeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                                    <Megaphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Compose Broadcast Announcement</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Target clinics, preview channels, and schedule broadcasts.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setComposeOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Templates bar */}
                        <div className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 overflow-x-auto shrink-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Templates:</span>
                            {TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.name}
                                    type="button"
                                    onClick={() => handleApplyTemplate(tpl)}
                                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-500 shrink-0"
                                >
                                    {tpl.name}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                            {/* Tabs for Edit vs Preview */}
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('edit')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                        previewTab === 'edit'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Edit Content
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('preview_email')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                        previewTab === 'preview_email'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Email Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('preview_banner')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                        previewTab === 'preview_banner'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Banner Preview
                                </button>
                            </div>

                            {previewTab === 'edit' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Announcement Title *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="e.g. Scheduled System Maintenance"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Announcement Type *
                                            </label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="info">Info</option>
                                                <option value="update">Update / Feature</option>
                                                <option value="warning">Warning</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="billing">Billing</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Message Body (HTML Allowed) *
                                        </label>
                                        <textarea
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            rows={5}
                                            placeholder="Write message in rich text or HTML (<p>, <strong>, <em>, <ul>, <li>, <a>)..."
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Call To Action (CTA) Label (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.cta_label}
                                                onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                                                placeholder="e.g. View Status Page"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                CTA Destination URL (Optional)
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.cta_url}
                                                onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Channels selection */}
                                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                            Delivery Channels:
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.channels.includes('in_app')}
                                                    onChange={(e) => {
                                                        const set = new Set(formData.channels);
                                                        if (e.target.checked) set.add('in_app'); else set.delete('in_app');
                                                        setFormData({ ...formData, channels: Array.from(set) });
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <Bell className="w-3.5 h-3.5 text-indigo-500" />
                                                In-App Bell
                                            </label>

                                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.channels.includes('banner')}
                                                    onChange={(e) => {
                                                        const set = new Set(formData.channels);
                                                        if (e.target.checked) set.add('banner'); else set.delete('banner');
                                                        setFormData({ ...formData, channels: Array.from(set) });
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                                                Top Banner
                                            </label>

                                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.channels.includes('email')}
                                                    onChange={(e) => {
                                                        const set = new Set(formData.channels);
                                                        if (e.target.checked) set.add('email'); else set.delete('email');
                                                        setFormData({ ...formData, channels: Array.from(set) });
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <Mail className="w-3.5 h-3.5 text-blue-500" />
                                                Email Broadcast
                                            </label>

                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-not-allowed" title="Coming Soon">
                                                <input type="checkbox" disabled className="rounded border-slate-300 opacity-50" />
                                                <Smartphone className="w-3.5 h-3.5" />
                                                SMS (Coming Soon)
                                            </label>
                                        </div>
                                    </div>

                                    {/* Audience Targeting */}
                                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Target Audience:
                                            </label>
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {audienceSummary}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="audience_type"
                                                    value="all"
                                                    checked={formData.audience_type === 'all'}
                                                    onChange={() => setFormData({ ...formData, audience_type: 'all' })}
                                                    className="text-indigo-600"
                                                />
                                                All Clinics
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="audience_type"
                                                    value="selected"
                                                    checked={formData.audience_type === 'selected'}
                                                    onChange={() => setFormData({ ...formData, audience_type: 'selected' })}
                                                    className="text-indigo-600"
                                                />
                                                Selected Clinics
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="audience_type"
                                                    value="filtered"
                                                    checked={formData.audience_type === 'filtered'}
                                                    onChange={() => setFormData({ ...formData, audience_type: 'filtered' })}
                                                    className="text-indigo-600"
                                                />
                                                Filter by Plan & Status
                                            </label>
                                        </div>

                                        {formData.audience_type === 'selected' && (
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-500">Select Clinics:</label>
                                                <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl p-2 bg-white dark:bg-slate-800 grid grid-cols-2 gap-1.5">
                                                    {availableClinics.map((c) => (
                                                        <label key={c.id} className="flex items-center gap-1.5 text-xs">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.target_clinic_ids.includes(c.id)}
                                                                onChange={(e) => {
                                                                    const set = new Set(formData.target_clinic_ids);
                                                                    if (e.target.checked) set.add(c.id); else set.delete(c.id);
                                                                    setFormData({ ...formData, target_clinic_ids: Array.from(set) });
                                                                }}
                                                                className="rounded text-indigo-600"
                                                            />
                                                            <span className="truncate">{c.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {formData.audience_type === 'filtered' && (
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Target Plans:</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {availablePlans.map((p) => (
                                                            <label key={p.id} className="flex items-center gap-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.target_plans.includes(p.slug)}
                                                                    onChange={(e) => {
                                                                        const set = new Set(formData.target_plans);
                                                                        if (e.target.checked) set.add(p.slug); else set.delete(p.slug);
                                                                        setFormData({ ...formData, target_plans: Array.from(set) });
                                                                    }}
                                                                    className="rounded text-indigo-600"
                                                                />
                                                                <span>{p.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Clinic Status:</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['active', 'trial', 'past_due', 'suspended'].map((st) => (
                                                            <label key={st} className="flex items-center gap-1 capitalize">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.target_statuses.includes(st)}
                                                                    onChange={(e) => {
                                                                        const set = new Set(formData.target_statuses);
                                                                        if (e.target.checked) set.add(st); else set.delete(st);
                                                                        setFormData({ ...formData, target_statuses: Array.from(set) });
                                                                    }}
                                                                    className="rounded text-indigo-600"
                                                                />
                                                                <span>{st.replace('_', ' ')}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Roles inside each clinic:</label>
                                            <div className="flex items-center gap-4 text-xs">
                                                <label className="flex items-center gap-1.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.target_recipient_roles.includes('clinic_admin')}
                                                        onChange={(e) => {
                                                            const set = new Set(formData.target_recipient_roles);
                                                            if (e.target.checked) set.add('clinic_admin'); else set.delete('clinic_admin');
                                                            setFormData({ ...formData, target_recipient_roles: Array.from(set) });
                                                        }}
                                                        className="rounded text-indigo-600"
                                                    />
                                                    Clinic Admins Only (Default)
                                                </label>
                                                <label className="flex items-center gap-1.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.target_recipient_roles.includes('doctor')}
                                                        onChange={(e) => {
                                                            const set = new Set(formData.target_recipient_roles);
                                                            if (e.target.checked) set.add('doctor'); else set.delete('doctor');
                                                            setFormData({ ...formData, target_recipient_roles: Array.from(set) });
                                                        }}
                                                        className="rounded text-indigo-600"
                                                    />
                                                    Doctors
                                                </label>
                                                <label className="flex items-center gap-1.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.target_recipient_roles.includes('all_staff')}
                                                        onChange={(e) => {
                                                            const set = new Set(formData.target_recipient_roles);
                                                            if (e.target.checked) set.add('all_staff'); else set.delete('all_staff');
                                                            setFormData({ ...formData, target_recipient_roles: Array.from(set) });
                                                        }}
                                                        className="rounded text-indigo-600"
                                                    />
                                                    All Staff
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule option */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Schedule Send Date/Time (Asia/Colombo)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={formData.scheduled_at}
                                                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Banner End Window (Optional)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={formData.banner_end_at}
                                                onChange={(e) => setFormData({ ...formData, banner_end_at: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {previewTab === 'preview_email' && (
                                <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl flex flex-col items-center">
                                    <div className="w-full max-w-lg bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                                        <div className="bg-slate-900 p-4 text-white">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                                                {formData.type}
                                            </span>
                                            <h4 className="text-base font-bold mt-2">{formData.title || 'Untitled Announcement'}</h4>
                                        </div>
                                        <div className="p-5 text-sm space-y-3">
                                            <div dangerouslySetInnerHTML={{ __html: formData.message || '<p>Announcement body preview...</p>' }} />
                                            {formData.cta_label && (
                                                <div>
                                                    <a href="#" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">
                                                        {formData.cta_label} &rarr;
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 bg-slate-50 border-t text-[11px] text-slate-500 text-center">
                                            Sent by MedVisit Platform to your clinic workspace.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {previewTab === 'preview_banner' && (
                                <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl space-y-3">
                                    <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <Megaphone className="w-5 h-5 text-indigo-600 shrink-0" />
                                            <div>
                                                <span className="font-bold mr-1.5">{formData.title || 'Announcement Title'}:</span>
                                                <span>{formData.message.replace(/<[^>]*>?/gm, '') || 'Body text preview...'}</span>
                                            </div>
                                        </div>
                                        {formData.cta_label && (
                                            <span className="px-3 py-1 bg-white dark:bg-slate-900 text-xs font-bold rounded-lg shrink-0">
                                                {formData.cta_label} &rarr;
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer with Send Test, Save Draft, Send Now */}
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSendTest}
                                    disabled={testSendLoading}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    {testSendLoading ? 'Sending...' : 'Send Test To Me'}
                                </button>
                                {testSendFeedback && (
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                        {testSendFeedback}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSubmit('draft')}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    Save as Draft
                                </button>

                                {formData.scheduled_at ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSubmit('schedule')}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                                    >
                                        Schedule Broadcast
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSubmit('send')}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                                    >
                                        Send Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}
