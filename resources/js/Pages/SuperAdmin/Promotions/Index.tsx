import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Tag,
    Gift,
    Plus,
    Search,
    Copy,
    Check,
    Download,
    Mail,
    RefreshCw,
    XCircle,
    Calendar,
    Users,
    AlertCircle,
    CheckCircle2,
    Clock,
    Layers,
    Trash2,
    Edit2,
    Power,
    ExternalLink,
    Filter,
} from 'lucide-react';

interface PromoCodeItem {
    id: number;
    code: string;
    notes?: string | null;
    type: string;
    value: number;
    value_display: string;
    duration: string;
    duration_months?: number | null;
    eligible_plans: string[];
    new_clinics_only: boolean;
    max_redemptions?: number | null;
    times_redeemed: number;
    redemptions_count: number;
    valid_from?: string | null;
    valid_until?: string | null;
    is_active: boolean;
    is_expired: boolean;
    can_delete: boolean;
    created_at: string;
    creator?: { id: number; name: string } | null;
}

interface InviteItem {
    id: number;
    recipient_email: string;
    recipient_name?: string | null;
    clinic_name?: string | null;
    plan_slug: string;
    free_period_type: string;
    free_period_value: number;
    free_period_display: string;
    status: string;
    expires_at: string;
    registered_at?: string | null;
    registered_tenant?: { id: string; name: string } | null;
    notes?: string | null;
    creator?: { id: number; name: string } | null;
}

interface RedemptionItem {
    id: number;
    promo_code: string;
    tenant_name: string;
    tenant_id: string;
    invoice_number?: string | null;
    status: string;
    discount_type: string;
    discount_formatted: string;
    final_formatted: string;
    reserved_at?: string | null;
    activated_at?: string | null;
    months_remaining?: number | null;
}

interface PlanItem {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
}

interface Props {
    activeTab: 'codes' | 'invites' | 'history';
    promoCodes: PromoCodeItem[];
    invites: InviteItem[];
    redemptions: RedemptionItem[];
    plans: PlanItem[];
    totalActiveCodes: number;
    totalRedemptionsCount: number;
    totalInvitesSent: number;
    flash?: {
        created_invite_token?: string | null;
        created_invite_url?: string | null;
    };
}

export default function PromotionsIndex({
    activeTab: initialTab = 'codes',
    promoCodes = [],
    invites = [],
    redemptions = [],
    plans = [],
    totalActiveCodes = 0,
    totalRedemptionsCount = 0,
    totalInvitesSent = 0,
    flash,
}: Props) {
    const [currentTab, setCurrentTab] = useState<'codes' | 'invites' | 'history'>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    // Modals
    const [createCodeOpen, setCreateCodeOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<PromoCodeItem | null>(null);
    const [createInviteOpen, setCreateInviteOpen] = useState(false);
    const [inviteSuccessModal, setInviteSuccessModal] = useState<{ url: string; token: string } | null>(
        flash?.created_invite_url ? { url: flash.created_invite_url, token: flash.created_invite_token || '' } : null
    );

    // Promo Code Form
    const codeForm = useForm({
        code: '',
        notes: '',
        type: 'percent',
        value: 20,
        duration: 'once',
        duration_months: 1,
        eligible_plans: ['*'],
        new_clinics_only: false,
        max_redemptions: '',
        valid_from: '',
        valid_until: '',
        is_active: true,
    });

    // Invite Form
    const inviteForm = useForm({
        recipient_email: '',
        recipient_name: '',
        clinic_name: '',
        plan_slug: 'pro',
        free_period_type: 'months',
        free_period_value: 1,
        expiry_days: 14,
        notes: '',
        send_email: true,
    });

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(text);
        setTimeout(() => setCopiedUrl(null), 2500);
    };

    const handleCreateCode = (e: React.FormEvent) => {
        e.preventDefault();
        codeForm.post('/super-admin/promotions/codes', {
            onSuccess: () => {
                setCreateCodeOpen(false);
                codeForm.reset();
            },
        });
    };

    const handleUpdateCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCode) return;
        codeForm.put(`/super-admin/promotions/codes/${editingCode.id}`, {
            onSuccess: () => {
                setEditingCode(null);
                codeForm.reset();
            },
        });
    };

    const handleToggleActive = (code: PromoCodeItem) => {
        router.post(`/super-admin/promotions/codes/${code.id}/toggle-active`, {}, {
            preserveScroll: true,
        });
    };

    const handleDeleteCode = (code: PromoCodeItem) => {
        if (!confirm(`Are you sure you want to delete promo code ${code.code}? This cannot be undone.`)) return;
        router.delete(`/super-admin/promotions/codes/${code.id}`, {
            preserveScroll: true,
        });
    };

    const handleCreateInvite = (e: React.FormEvent) => {
        e.preventDefault();
        inviteForm.post('/super-admin/promotions/invites', {
            onSuccess: () => {
                setCreateInviteOpen(false);
                inviteForm.reset();
            },
        });
    };

    const handleResendInvite = (invite: InviteItem) => {
        if (!confirm(`Re-send invite email to ${invite.recipient_email}? A fresh 14-day token will be generated.`)) return;
        router.post(`/super-admin/promotions/invites/${invite.id}/resend`, {}, {
            preserveScroll: true,
        });
    };

    const handleRevokeInvite = (invite: InviteItem) => {
        if (!confirm(`Revoke the invite link for ${invite.recipient_email}? They will no longer be able to use it.`)) return;
        router.post(`/super-admin/promotions/invites/${invite.id}/revoke`, {}, {
            preserveScroll: true,
        });
    };

    const filteredCodes = promoCodes.filter(
        (c) =>
            c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredInvites = invites.filter(
        (inv) =>
            inv.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.recipient_name && inv.recipient_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (inv.clinic_name && inv.clinic_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredRedemptions = redemptions.filter(
        (r) =>
            r.promo_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.tenant_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PlatformLayout>
            <Head title="Promotions & Invites — Super Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Tag className="w-6 h-6 text-primary" />
                            <span>Promotions & Invites</span>
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Manage promotional discount codes, free-access invite links, and track redemption revenue impact.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                codeForm.reset();
                                setCreateCodeOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-primary/20 transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Promo Code</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                inviteForm.reset();
                                setCreateInviteOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                            <Gift className="w-4 h-4" />
                            <span>Generate Invite</span>
                        </button>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Tag className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Promo Codes</span>
                            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalActiveCodes}</div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Redemptions</span>
                            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalRedemptionsCount}</div>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Invites Sent</span>
                            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalInvitesSent}</div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentTab('codes')}
                            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                                currentTab === 'codes'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Promo Codes ({promoCodes.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setCurrentTab('invites')}
                            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                                currentTab === 'invites'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Gift className="w-3.5 h-3.5" />
                            <span>Free Invites ({invites.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setCurrentTab('history')}
                            className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                                currentTab === 'history'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Redemptions History</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="pl-9 pr-4 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 w-48 sm:w-64"
                            />
                        </div>

                        {currentTab === 'history' && (
                            <a
                                href="/super-admin/promotions/redemptions/export"
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>CSV</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* TAB 1: PROMO CODES */}
                {currentTab === 'codes' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-5 py-3.5">Code</th>
                                        <th className="px-5 py-3.5">Discount</th>
                                        <th className="px-5 py-3.5">Duration</th>
                                        <th className="px-5 py-3.5">Eligible Plans</th>
                                        <th className="px-5 py-3.5">Usage</th>
                                        <th className="px-5 py-3.5">Validity</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                    {filteredCodes.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                                                No promo codes found. Click "Create Promo Code" to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCodes.map((code) => (
                                            <tr key={code.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10">
                                                            {code.code}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(code.code)}
                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                            title="Copy code"
                                                        >
                                                            {copiedUrl === code.code ? (
                                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    {code.notes && (
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs truncate">
                                                            {code.notes}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {code.value_display}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-400 capitalize">
                                                    {code.duration === 'repeating'
                                                        ? `${code.duration_months} month(s)`
                                                        : code.duration}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {code.eligible_plans.map((p) => (
                                                            <span
                                                                key={p}
                                                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase"
                                                            >
                                                                {p === '*' ? 'All Plans' : p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {code.new_clinics_only && (
                                                        <span className="inline-block mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                            New clinics only
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {code.times_redeemed}
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {code.max_redemptions !== null ? ` / ${code.max_redemptions}` : ' (unlimited)'}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-[11px]">
                                                    {code.valid_until ? (
                                                        <div>Until {code.valid_until}</div>
                                                    ) : (
                                                        <div>No expiry</div>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {code.is_expired ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                            Expired
                                                        </span>
                                                    ) : code.is_active ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleActive(code)}
                                                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                                                code.is_active
                                                                    ? 'border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                                                                    : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                                            }`}
                                                            title={code.is_active ? 'Deactivate code' : 'Activate code'}
                                                        >
                                                            <Power className="w-3.5 h-3.5" />
                                                        </button>

                                                        {code.can_delete ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCode(code)}
                                                                className="p-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs transition-colors cursor-pointer"
                                                                title="Delete code"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <span
                                                                className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                                                title="Used codes cannot be deleted (deactivate instead)"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
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
                )}

                {/* TAB 2: FREE-ACCESS INVITES */}
                {currentTab === 'invites' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-5 py-3.5">Recipient</th>
                                        <th className="px-5 py-3.5">Target Clinic</th>
                                        <th className="px-5 py-3.5">Plan</th>
                                        <th className="px-5 py-3.5">Free Period</th>
                                        <th className="px-5 py-3.5">Expiry</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5">Registered Clinic</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                    {filteredInvites.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                                                No invitations generated yet. Click "Generate Invite" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvites.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {inv.recipient_name || 'Invited Administrator'}
                                                    </div>
                                                    <div className="text-[11px] font-mono text-slate-500">{inv.recipient_email}</div>
                                                </td>

                                                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                                                    {inv.clinic_name || '—'}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="font-mono uppercase font-semibold text-primary">
                                                        {inv.plan_slug}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {inv.free_period_display}
                                                </td>

                                                <td className="px-5 py-4 text-slate-500 text-[11px]">
                                                    {inv.expires_at}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {inv.status === 'registered' ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                            Registered
                                                        </span>
                                                    ) : inv.status === 'revoked' ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                            Revoked
                                                        </span>
                                                    ) : inv.status === 'expired' ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500">
                                                            Expired
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                                                            Sent (Pending)
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {inv.registered_tenant ? (
                                                        <a
                                                            href={`/super-admin/clinics/${inv.registered_tenant.id}`}
                                                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                                                        >
                                                            <span>{inv.registered_tenant.name}</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Not registered yet</span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {inv.status === 'sent' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResendInvite(inv)}
                                                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition-colors"
                                                                    title="Resend email"
                                                                >
                                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRevokeInvite(inv)}
                                                                    className="p-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs transition-colors cursor-pointer"
                                                                    title="Revoke invite link"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
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
                )}

                {/* TAB 3: REDEMPTIONS HISTORY */}
                {currentTab === 'history' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-5 py-3.5">Promo Code</th>
                                        <th className="px-5 py-3.5">Clinic</th>
                                        <th className="px-5 py-3.5">Invoice #</th>
                                        <th className="px-5 py-3.5">Discount</th>
                                        <th className="px-5 py-3.5">Final Total</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5">Activated At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                    {filteredRedemptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                                                No redemptions recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRedemptions.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-4 font-mono font-bold text-primary">
                                                    {r.promo_code}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {r.tenant_name}
                                                    </div>
                                                    <div className="text-[11px] font-mono text-slate-400">
                                                        {r.tenant_id}.medvisit.lk
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">
                                                    {r.invoice_number || '—'}
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {r.discount_formatted}
                                                </td>

                                                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                                                    {r.final_formatted}
                                                </td>

                                                <td className="px-5 py-4 capitalize">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        r.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-600'
                                                            : r.status === 'reserved'
                                                            ? 'bg-amber-500/10 text-amber-600'
                                                            : 'bg-slate-500/10 text-slate-500'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-slate-500 text-[11px]">
                                                    {r.activated_at || r.reserved_at || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* CREATE PROMO CODE MODAL */}
            {createCodeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
                    <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Tag className="w-5 h-5 text-primary" />
                                <span>Create Promo Code</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreateCodeOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCode} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Promo Code (Leave blank to auto-generate)
                                    </label>
                                    <input
                                        type="text"
                                        value={codeForm.data.code}
                                        onChange={(e) => codeForm.setData('code', e.target.value.toUpperCase())}
                                        placeholder="e.g. LAUNCH50"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-mono font-bold uppercase"
                                    />
                                    {codeForm.errors.code && <p className="text-rose-500 mt-1">{codeForm.errors.code}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Discount Type
                                    </label>
                                    <select
                                        value={codeForm.data.type}
                                        onChange={(e) => codeForm.setData('type', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                    >
                                        <option value="percent">Percentage Off (%)</option>
                                        <option value="fixed">Fixed LKR Off (Rs.)</option>
                                        <option value="free_months">Free Months (100% off)</option>
                                        <option value="extra_trial_days">Extra Trial Days (+Days)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {codeForm.data.type === 'percent'
                                            ? 'Percent Value (%)'
                                            : codeForm.data.type === 'fixed'
                                            ? 'Discount in LKR (Rs.)'
                                            : codeForm.data.type === 'free_months'
                                            ? 'Number of Free Months'
                                            : 'Extra Trial Days'}
                                    </label>
                                    <input
                                        type="number"
                                        value={codeForm.data.value}
                                        onChange={(e) => codeForm.setData('value', Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                        min={1}
                                    />
                                    {codeForm.errors.value && <p className="text-rose-500 mt-1">{codeForm.errors.value}</p>}
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Duration
                                    </label>
                                    <select
                                        value={codeForm.data.duration}
                                        onChange={(e) => codeForm.setData('duration', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                    >
                                        <option value="once">First invoice only</option>
                                        <option value="repeating">Repeating (N months)</option>
                                        <option value="forever">Forever (All renewals)</option>
                                    </select>
                                </div>
                            </div>

                            {codeForm.data.duration === 'repeating' && (
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Number of Months
                                    </label>
                                    <input
                                        type="number"
                                        value={codeForm.data.duration_months}
                                        onChange={(e) => codeForm.setData('duration_months', Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                        min={1}
                                        max={36}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Eligible Plans
                                </label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {['*', 'basic', 'pro', 'advanced'].map((slug) => {
                                        const isChecked = codeForm.data.eligible_plans.includes(slug);
                                        return (
                                            <button
                                                key={slug}
                                                type="button"
                                                onClick={() => {
                                                    if (slug === '*') {
                                                        codeForm.setData('eligible_plans', ['*']);
                                                    } else {
                                                        const current = codeForm.data.eligible_plans.filter((p) => p !== '*');
                                                        const next = isChecked
                                                            ? current.filter((p) => p !== slug)
                                                            : [...current, slug];
                                                        codeForm.setData('eligible_plans', next.length === 0 ? ['*'] : next);
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                                                    isChecked
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                {slug === '*' ? 'All Plans' : slug.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Max Redemptions (Leave blank for unlimited)
                                    </label>
                                    <input
                                        type="number"
                                        value={codeForm.data.max_redemptions}
                                        onChange={(e) => codeForm.setData('max_redemptions', e.target.value)}
                                        placeholder="Unlimited"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                        min={1}
                                    />
                                </div>

                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={codeForm.data.new_clinics_only}
                                            onChange={(e) => codeForm.setData('new_clinics_only', e.target.checked)}
                                            className="w-4 h-4 rounded text-primary"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            New clinics only
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Internal Notes
                                </label>
                                <textarea
                                    value={codeForm.data.notes || ''}
                                    onChange={(e) => codeForm.setData('notes', e.target.value)}
                                    placeholder="Purpose of this code, campaign details..."
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setCreateCodeOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={codeForm.processing}
                                    className="px-6 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white font-bold cursor-pointer shadow-md shadow-primary/20"
                                >
                                    {codeForm.processing ? 'Saving...' : 'Create Promo Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GENERATE INVITE MODAL */}
            {createInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
                    <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <span>Generate Free-Access Invite Link</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreateInviteOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvite} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Recipient Work Email <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteForm.data.recipient_email}
                                    onChange={(e) => inviteForm.setData('recipient_email', e.target.value)}
                                    placeholder="doctor@clinic.lk"
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                />
                                {inviteForm.errors.recipient_email && (
                                    <p className="text-rose-500 mt-1">{inviteForm.errors.recipient_email}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Recipient Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteForm.data.recipient_name}
                                        onChange={(e) => inviteForm.setData('recipient_name', e.target.value)}
                                        placeholder="Dr. Samantha Perera"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Clinic Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteForm.data.clinic_name}
                                        onChange={(e) => inviteForm.setData('clinic_name', e.target.value)}
                                        placeholder="Perera Medicare"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Included Plan
                                    </label>
                                    <select
                                        value={inviteForm.data.plan_slug}
                                        onChange={(e) => inviteForm.setData('plan_slug', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 uppercase font-semibold text-primary"
                                    >
                                        <option value="basic">Basic (Rs. 7,000)</option>
                                        <option value="pro">Pro (Rs. 9,000)</option>
                                        <option value="advanced">Advanced (Rs. 15,000)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Free Period Unit
                                    </label>
                                    <select
                                        value={inviteForm.data.free_period_type}
                                        onChange={(e) => inviteForm.setData('free_period_type', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                                    >
                                        <option value="months">Months</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Free Period Duration
                                    </label>
                                    <input
                                        type="number"
                                        value={inviteForm.data.free_period_value}
                                        onChange={(e) => inviteForm.setData('free_period_value', Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold"
                                        min={1}
                                        max={365}
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        Send branded email via Resend
                                    </span>
                                    <p className="text-[11px] text-slate-400">
                                        Sends the official invitation email directly to {inviteForm.data.recipient_email || 'recipient'}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={inviteForm.data.send_email}
                                    onChange={(e) => inviteForm.setData('send_email', e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setCreateInviteOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteForm.processing}
                                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                                >
                                    {inviteForm.processing ? 'Generating...' : 'Generate & Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INVITE SUCCESS MODAL WITH COPY BUTTON */}
            {inviteSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
                    <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Invitation Link Generated
                                </h3>
                                <p className="text-xs text-slate-500">
                                    This single-use link is valid for 14 days and bound to the recipient's email address.
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 space-y-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Secure Invite URL
                            </span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteSuccessModal.url}
                                    className="w-full text-xs font-mono bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-white p-0"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(inviteSuccessModal.url)}
                                    className="px-3 py-1 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                    {copiedUrl === inviteSuccessModal.url ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Link</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setInviteSuccessModal(null)}
                                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}

