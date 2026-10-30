import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import {
    Building2,
    Calendar,
    CreditCard,
    MessageSquare,
    FileText,
    Shield,
    ExternalLink,
    Lock,
    Unlock,
    Download,
    KeyRound,
    Clock,
    UserCheck,
    Stethoscope,
    Users,
    Pill,
    Ticket,
    CheckCircle2,
    AlertTriangle,
    Mail,
    Phone,
    Plus,
    Trash2,
    RotateCcw,
    DollarSign,
    Gift,
    ShieldCheck,
    ArrowUpRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ShowProps {
    clinic: {
        id: string;
        name: string;
        subdomain: string;
        url: string;
        phone?: string;
        address?: string;
        logo_url?: string | null;
        plan: string;
        status: string;
        trial_ends_at?: string | null;
        is_suspended: boolean;
        deleted_at?: string | null;
        pharmacy_enabled: boolean;
        created_at: string;
        owner?: {
            id: number;
            name: string;
            email: string;
            email_verified_at?: string | null;
            last_login?: string;
        } | null;
        stats: {
            doctors_count: number;
            staff_count: number;
            patients_count: number;
            prescriptions_count: number;
        };
    };
    monthlyTokens: Array<{ month: string; count: number }>;
    subscription?: any;
    transactions: any[];
    messaging: {
        sms_total: number;
        whatsapp_total: number;
        verified_total: number;
    };
    notes: Array<{
        id: number;
        author_name: string;
        type: string;
        note: string;
        created_at_human: string;
    }>;
    auditLogs: Array<{
        id: number;
        event_name: string;
        actor: string;
        metadata: any;
        created_at_human: string;
    }>;
    agreement_acceptances?: Array<{
        id: number;
        user_name: string;
        user_email: string;
        terms_version: string;
        privacy_version: string;
        refund_version: string;
        dispute_version: string;
        accepted_at: string;
        ip_address: string | null;
        user_agent: string | null;
    }>;
    exports: Array<{
        id: string;
        status: string;
        is_expired: boolean;
        expires_at?: string;
        download_url?: string | null;
        created_at: string;
    }>;
    plans: any[];
}

export default function ClinicShow({
    clinic,
    monthlyTokens,
    subscription,
    transactions,
    messaging,
    notes,
    auditLogs,
    agreement_acceptances = [],
    exports,
    plans,
}: ShowProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'messaging' | 'notes' | 'audit' | 'agreements'>('overview');

    // Modals
    const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
    const [impersonateReason, setImpersonateReason] = useState('');

    const [extendTrialModalOpen, setExtendTrialModalOpen] = useState(false);
    const [extendDays, setExtendDays] = useState(14);

    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportPassword, setExportPassword] = useState('');

    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [suspendReason, setSuspendReason] = useState('');

    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState('general');

    // Impersonation submit
    const handleImpersonate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!impersonateReason.trim()) return;

        router.post(
            `/super-admin/clinics/${clinic.id}/impersonate`,
            { reason: impersonateReason },
            {
                onFinish: () => {
                    setImpersonateModalOpen(false);
                    setImpersonateReason('');
                },
            }
        );
    };

    // Suspend submit
    const handleSuspend = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/super-admin/clinics/${clinic.id}/suspend`, { reason: suspendReason }, {
            onSuccess: () => {
                setSuspendModalOpen(false);
                setSuspendReason('');
            },
        });
    };

    // Reactivate
    const handleReactivate = () => {
        if (confirm(`Reactivate clinic "${clinic.name}"?`)) {
            router.post(`/super-admin/clinics/${clinic.id}/reactivate`);
        }
    };

    // Extend trial
    const handleExtendTrial = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/super-admin/clinics/${clinic.id}/extend-trial`, { days: extendDays }, {
            onSuccess: () => setExtendTrialModalOpen(false),
        });
    };

    // Resend invite / password reset
    const handleResetPassword = () => {
        if (confirm(`Send password reset email to ${clinic.owner?.email}?`)) {
            router.post(`/super-admin/clinics/${clinic.id}/reset-password`);
        }
    };

    // Export data
    const handleExport = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/super-admin/clinics/${clinic.id}/export`, { password: exportPassword }, {
            onSuccess: () => {
                setExportModalOpen(false);
                setExportPassword('');
            },
        });
    };

    // Add note
    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        router.post(`/super-admin/clinics/${clinic.id}/notes`, {
            note: noteText,
            type: noteType,
        }, {
            onSuccess: () => setNoteText(''),
        });
    };

    // Soft Delete
    const handleDelete = () => {
        if (confirm(`Archive clinic "${clinic.name}"? The subdomain "${clinic.subdomain}" will be reserved for 30 days before permanent purging.`)) {
            router.delete(`/super-admin/clinics/${clinic.id}`);
        }
    };

    // Restore
    const handleRestore = () => {
        if (confirm(`Restore archived clinic "${clinic.name}"?`)) {
            router.post(`/super-admin/clinics/${clinic.id}/restore`);
        }
    };

    return (
        <PlatformLayout
            breadcrumbs={[
                { label: 'Clinics', href: '/super-admin/clinics' },
                { label: clinic.name },
            ]}
        >
            <Head title={`${clinic.name} • Clinic Detail`} />

            {/* Header with High-Impact Platform Actions */}
            <PageHeader
                eyebrow={clinic.deleted_at ? 'Archived Clinic' : clinic.is_suspended ? 'Suspended Workspace' : 'Active Tenant'}
                title={clinic.name}
                subtitle={`Subdomain: ${clinic.subdomain}.medvisit.lk — ID: ${clinic.id}`}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Impersonation Button */}
                        <button
                            type="button"
                            onClick={() => setImpersonateModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Login as Clinic Admin</span>
                        </button>

                        {/* 2. Direct Subdomain Link */}
                        <a
                            href={clinic.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Public App</span>
                        </a>

                        {/* 3. Suspend / Reactivate / Restore */}
                        {clinic.deleted_at ? (
                            <button
                                type="button"
                                onClick={handleRestore}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore Clinic</span>
                            </button>
                        ) : clinic.is_suspended ? (
                            <button
                                type="button"
                                onClick={handleReactivate}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                            >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setSuspendModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                            </button>
                        )}

                        {/* 4. Data Export */}
                        <button
                            type="button"
                            onClick={() => setExportModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export Data</span>
                        </button>

                        {/* 5. Soft Delete / Archive */}
                        {!clinic.deleted_at && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="Archive Clinic (30-day restore window)"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                }
            />

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 mt-6 overflow-x-auto scrollbar-none">
                {[
                    { id: 'overview', label: 'Overview', icon: Building2 },
                    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
                    { id: 'messaging', label: 'Messaging & OTP', icon: MessageSquare },
                    { id: 'notes', label: `Internal Notes (${notes.length})`, icon: FileText },
                    { id: 'agreements', label: `Agreements (${agreement_acceptances.length})`, icon: ShieldCheck },
                    { id: 'audit', label: 'Audit Trail', icon: Shield },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                                active
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6 mt-6">
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <GlassCard className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Stethoscope className="w-4 h-4 text-indigo-500" />
                                <span>Doctors Roster</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                                {clinic.stats.doctors_count}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Users className="w-4 h-4 text-cyan-500" />
                                <span>Staff Accounts</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                                {clinic.stats.staff_count}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Ticket className="w-4 h-4 text-emerald-500" />
                                <span>Total Patients</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                                {clinic.stats.patients_count}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Pill className="w-4 h-4 text-purple-500" />
                                <span>Prescriptions Issued</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                                {clinic.stats.prescriptions_count}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Split Row: Clinic Profile + Monthly Tokens Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Clinic Profile & Owner Card (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            <GlassCard className="p-5 space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Information</h3>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-400">Plan:</span>
                                        <span className="font-semibold">{clinic.plan}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-400">Phone:</span>
                                        <span className="font-semibold">{clinic.phone || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-400">Address:</span>
                                        <span className="font-semibold text-right max-w-[200px] truncate">{clinic.address || 'Sri Lanka'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-400">Pharmacy Module:</span>
                                        <span className={`font-semibold ${clinic.pharmacy_enabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {clinic.pharmacy_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-400">Registered:</span>
                                        <span className="font-semibold">{clinic.created_at}</span>
                                    </div>
                                    {clinic.trial_ends_at && (
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-400">Trial Ends:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-cyan-600">{clinic.trial_ends_at}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setExtendTrialModalOpen(true)}
                                                    className="text-[10px] text-indigo-600 underline font-semibold"
                                                >
                                                    Extend
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>

                            {/* Owner Contact */}
                            <GlassCard className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clinic Administrator</h3>
                                    <button
                                        type="button"
                                        onClick={handleResetPassword}
                                        className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                        Send Password Reset
                                    </button>
                                </div>
                                {clinic.owner ? (
                                    <div className="space-y-2 text-xs">
                                        <div className="font-bold text-slate-900 dark:text-white">{clinic.owner.name}</div>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{clinic.owner.email}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 pt-1">
                                            Last logged in: {clinic.owner.last_login || 'Recently'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400">No owner account linked.</div>
                                )}
                            </GlassCard>
                        </div>

                        {/* 6-Month Token Volume Chart (7 cols) */}
                        <div className="lg:col-span-7">
                            <GlassCard className="p-5 h-full flex flex-col">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Monthly Channeling Volume</h3>
                                <p className="text-xs text-slate-400 mb-4">Patient tokens created per month</p>
                                <div className="h-64 w-full flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyTokens}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                            <Tooltip formatter={(v: any) => [v, 'Tokens']} />
                                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: BILLING & INVOICES */}
            {activeTab === 'billing' && (
                <div className="space-y-6 mt-6">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Subscription</h3>
                                <p className="text-xs text-slate-400">Plan and recurring billing details</p>
                            </div>
                            {subscription && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => router.post(`/super-admin/subscriptions/${subscription.id}/toggle-comp`)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 transition"
                                    >
                                        Toggle Comp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.post(`/super-admin/subscriptions/${subscription.id}/extend`)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 transition"
                                    >
                                        Extend 30 Days
                                    </button>
                                </div>
                            )}
                        </div>

                        {subscription ? (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                    <span className="text-slate-400">Plan:</span>
                                    <div className="font-bold text-sm mt-0.5">{subscription.plan?.name}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                    <span className="text-slate-400">Status:</span>
                                    <div className="font-bold text-sm mt-0.5 text-emerald-500 uppercase">{subscription.status}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                    <span className="text-slate-400">Current Period End:</span>
                                    <div className="font-bold text-sm mt-0.5">{subscription.current_period_end || 'N/A'}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                    <span className="text-slate-400">Price:</span>
                                    <div className="font-bold text-sm mt-0.5 font-mono">
                                        Rs. {((subscription.plan?.price_cents ?? 0) / 100).toLocaleString()}/mo
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400">No active subscription record found.</div>
                        )}
                    </GlassCard>

                    {/* Invoices List */}
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Subscription Invoices</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200 dark:border-white/10 text-slate-400 text-[11px] uppercase">
                                    <tr>
                                        <th className="py-2.5">Invoice #</th>
                                        <th className="py-2.5">Amount</th>
                                        <th className="py-2.5">Status</th>
                                        <th className="py-2.5">Due Date</th>
                                        <th className="py-2.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {subscription?.invoices?.length > 0 ? (
                                        subscription.invoices.map((inv: any) => (
                                            <tr key={inv.id}>
                                                <td className="py-3 font-mono font-semibold">{inv.invoice_number}</td>
                                                <td className="py-3 font-mono font-bold">Rs. {(inv.amount_cents / 100).toLocaleString()}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-slate-400">{inv.due_date || 'N/A'}</td>
                                                <td className="py-3 text-right">
                                                    {inv.status !== 'paid' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.post(`/super-admin/subscriptions/invoices/${inv.id}/mark-paid`)}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                                        >
                                                            Mark Paid Offline
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-slate-400">No invoices logged for this clinic.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* TAB 3: MESSAGING USAGE */}
            {activeTab === 'messaging' && (
                <div className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <GlassCard className="p-4">
                            <span className="text-xs text-slate-400">Total SMS Dispatched</span>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {messaging.sms_total}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Text.lk Gateway</div>
                        </GlassCard>

                        <GlassCard className="p-4">
                            <span className="text-xs text-slate-400">WhatsApp Messages</span>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {messaging.whatsapp_total}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Meta Cloud API</div>
                        </GlassCard>

                        <GlassCard className="p-4">
                            <span className="text-xs text-slate-400">Phone Verifications</span>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {messaging.verified_total}
                            </div>
                            <div className="text-[11px] text-emerald-500 mt-1">Successfully Verified</div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {/* TAB 4: INTERNAL NOTES */}
            {activeTab === 'notes' && (
                <div className="space-y-6 mt-6">
                    {/* Add Note Form */}
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Internal Super Admin Note</h3>
                        <form onSubmit={handleAddNote} className="space-y-3">
                            <div className="flex items-center gap-3">
                                <select
                                    value={noteType}
                                    onChange={(e) => setNoteType(e.target.value)}
                                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 font-medium"
                                >
                                    <option value="general">General Note</option>
                                    <option value="call">Call Log</option>
                                    <option value="promise">Promise / Agreement</option>
                                </select>
                            </div>
                            <textarea
                                rows={3}
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Write internal notes about this clinic (call summary, pricing commitments, requested features)..."
                                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={!noteText.trim()}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
                                >
                                    Save Internal Note
                                </button>
                            </div>
                        </form>
                    </GlassCard>

                    {/* Notes List */}
                    <div className="space-y-3">
                        {notes.length === 0 ? (
                            <div className="text-xs text-slate-400 py-6 text-center">No internal notes added for this clinic yet.</div>
                        ) : (
                            notes.map((n) => (
                                <GlassCard key={n.id} className="p-4 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{n.author_name}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                {n.type}
                                            </span>
                                        </div>
                                        <span className="text-slate-400 text-[11px]">{n.created_at_human}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {n.note}
                                    </p>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 5: AUDIT TRAIL */}
            {activeTab === 'audit' && (
                <div className="space-y-4 mt-6">
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Clinic Audit Trail</h3>
                        <div className="space-y-2">
                            {auditLogs.length === 0 ? (
                                <div className="text-xs text-slate-400 py-6 text-center">No audit events recorded for this clinic yet.</div>
                            ) : (
                                auditLogs.map((log) => (
                                    <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 flex items-start justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{log.event_name}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">by {log.actor}</div>
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <pre className="text-[10px] text-slate-500 font-mono mt-1 max-w-lg overflow-x-auto">
                                                    {JSON.stringify(log.metadata, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-400">{log.created_at_human}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* TAB 6: AGREEMENTS & LEGAL ACCEPTANCES */}
            {activeTab === 'agreements' && (
                <div className="space-y-4 mt-6">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Legal Agreement Acceptances
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Read-only record of Terms & Conditions, Privacy, Refund, and Dispute policy versions accepted by clinic administrators.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {agreement_acceptances.length === 0 ? (
                                <div className="text-xs text-slate-400 py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200/40 dark:border-white/5">
                                    No legal agreement acceptance records found for this clinic.
                                </div>
                            ) : (
                                agreement_acceptances.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-2.5 text-xs"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200/50 dark:border-white/5">
                                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>{acc.user_name}</span>
                                                <span className="text-slate-400 font-normal">({acc.user_email})</span>
                                            </div>
                                            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                                                {new Date(acc.accepted_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5">
                                                <div className="text-slate-400 text-[10px]">Terms Version</div>
                                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{acc.terms_version}</div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5">
                                                <div className="text-slate-400 text-[10px]">Privacy Version</div>
                                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{acc.privacy_version}</div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5">
                                                <div className="text-slate-400 text-[10px]">Refund Version</div>
                                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{acc.refund_version}</div>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5">
                                                <div className="text-slate-400 text-[10px]">Dispute Version</div>
                                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{acc.dispute_version}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 pt-1">
                                            {acc.ip_address && (
                                                <span>IP: <strong className="font-mono text-slate-600 dark:text-slate-300">{acc.ip_address}</strong></span>
                                            )}
                                            {acc.user_agent && (
                                                <span className="truncate max-w-md" title={acc.user_agent}>
                                                    UA: {acc.user_agent}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Impersonation Reason Modal */}
            <GlassModal
                isOpen={impersonateModalOpen}
                onClose={() => setImpersonateModalOpen(false)}
                title={`Impersonate Clinic: ${clinic.name}`}
            >
                <form onSubmit={handleImpersonate} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                        <strong>Security & Compliance Notice:</strong> You are about to log in as the clinic administrator. A single-use token valid for 60 seconds will be generated. The session auto-expires in 30 minutes, and a persistent red banner will remain visible. All actions will be audit-logged.
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Impersonation (Required) *
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={impersonateReason}
                            onChange={(e) => setImpersonateReason(e.target.value)}
                            placeholder="e.g. Investigating doctor billing discrepancy ticket #2849..."
                            className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 focus:ring-2 focus:ring-rose-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setImpersonateModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!impersonateReason.trim()}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50"
                        >
                            Confirm & Access Clinic
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Extend Trial Modal */}
            <GlassModal
                isOpen={extendTrialModalOpen}
                onClose={() => setExtendTrialModalOpen(false)}
                title="Extend Clinic Trial"
            >
                <form onSubmit={handleExtendTrial} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Days to Extend *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="90"
                            value={extendDays}
                            onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setExtendTrialModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Confirm Extension
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Data Export Password Confirmation Modal */}
            <GlassModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                title="Export Sensitive Clinic Data"
            >
                <form onSubmit={handleExport} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                        This export contains sensitive patient directories, doctor fee structures, and billing records. Re-enter your super admin password to authorize the encrypted zip generation.
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Your Super Admin Password *
                        </label>
                        <input
                            type="password"
                            required
                            value={exportPassword}
                            onChange={(e) => setExportPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setExportModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!exportPassword}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Authorize Export
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Suspend Confirmation Modal */}
            <GlassModal
                isOpen={suspendModalOpen}
                onClose={() => setSuspendModalOpen(false)}
                title={`Suspend Workspace: ${clinic.name}`}
            >
                <form onSubmit={handleSuspend} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                        Suspending this clinic will immediately block staff from logging in and show an Account Suspended notice. Online booking will return 503 unavailable.
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Reason (Required) *
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            placeholder="Reason for suspension..."
                            className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setSuspendModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!suspendReason.trim()}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                        >
                            Confirm Suspension
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
