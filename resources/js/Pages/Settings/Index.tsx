import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    Settings,
    Building2,
    Calendar,
    Receipt,
    Globe,
    ShieldAlert,
    Save,
    CheckCircle2,
    Clock,
    CreditCard,
    Filter,
    Search,
    User,
    Activity,
    Eye,
    Hash,
    MapPin,
    Phone,
} from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_name: string;
    user_email?: string;
    created_at: string;
    created_at_relative: string;
}

interface Props {
    profile: {
        name: string;
        subdomain: string;
        phone: string;
        address: string;
        registration_number: string;
        logo_url: string;
        plan: string;
        status: string;
    };
    sessionDefaults: {
        default_avg_consultation_minutes: number;
        default_max_tokens: number;
        cancellation_window_hours: number;
        auto_generate_days: number;
    };
    billingSettings: {
        billing_timing: string;
        receipt_prefix: string;
        tax_percentage: number;
        accepted_methods: string[];
        currency: string;
    };
    onlineBookingSettings: {
        online_booking_enabled: boolean;
        max_active_tokens_per_phone: number;
        require_staff_approval: boolean;
        require_phone_verification: boolean;
        phone_verification_methods: string[];
        platform_available_channels: string[];
    };
    auditLogs: AuditLog[];
    availableActions: string[];
    filters: {
        action: string;
        search: string;
        date: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function SettingsIndex({
    profile,
    sessionDefaults,
    billingSettings,
    onlineBookingSettings,
    auditLogs,
    availableActions,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState<
        'profile' | 'sessions' | 'billing' | 'online' | 'audit'
    >('profile');

    // Profile Form
    const profileForm = useForm({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        registration_number: profile.registration_number,
        logo_url: profile.logo_url,
    });

    // Session Defaults Form
    const sessionForm = useForm({
        default_avg_consultation_minutes: sessionDefaults.default_avg_consultation_minutes,
        default_max_tokens: sessionDefaults.default_max_tokens,
        cancellation_window_hours: sessionDefaults.cancellation_window_hours,
        auto_generate_days: sessionDefaults.auto_generate_days,
    });

    // Billing Form
    const billingForm = useForm({
        billing_timing: billingSettings.billing_timing,
        receipt_prefix: billingSettings.receipt_prefix,
        tax_percentage: billingSettings.tax_percentage,
        accepted_methods: billingSettings.accepted_methods,
    });

    // Online Booking Form
    const onlineForm = useForm({
        online_booking_enabled: onlineBookingSettings.online_booking_enabled,
        max_active_tokens_per_phone: onlineBookingSettings.max_active_tokens_per_phone,
        require_staff_approval: onlineBookingSettings.require_staff_approval,
        require_phone_verification: onlineBookingSettings.require_phone_verification ?? true,
        phone_verification_methods: onlineBookingSettings.phone_verification_methods ?? ['whatsapp', 'textlk'],
    });

    const toggleVerificationMethod = (channel: string) => {
        const current = onlineForm.data.phone_verification_methods || [];
        const exists = current.includes(channel);
        if (exists && current.length === 1) return; // Keep at least 1 method
        const next = exists ? current.filter((m) => m !== channel) : [...current, channel];
        onlineForm.setData('phone_verification_methods', next);
    };

    // Audit Filters State
    const [auditFilters, setAuditFilters] = useState(filters);

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.put('/settings/profile', { preserveScroll: true });
    };

    const handleSessionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sessionForm.put('/settings/session-defaults', { preserveScroll: true });
    };

    const handleBillingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        billingForm.put('/settings/billing', { preserveScroll: true });
    };

    const handleOnlineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onlineForm.put('/settings/online-booking', { preserveScroll: true });
    };

    const handleAuditFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/settings', auditFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetAuditFilters = () => {
        const cleared = { action: '', search: '', date: '' };
        setAuditFilters(cleared);
        router.get('/settings', cleared, { preserveState: true });
    };

    const toggleBillingMethod = (method: string) => {
        const current = billingForm.data.accepted_methods;
        const exists = current.includes(method);
        if (exists && current.length === 1) return; // Keep at least 1 method
        const next = exists ? current.filter((m) => m !== method) : [...current, method];
        billingForm.setData('accepted_methods', next);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Clinic Settings & Audit - MedVisit" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Clinic Workspace', href: '/dashboard' },
                        { label: 'Settings & Audit' },
                    ]}
                    title="Clinic Settings & System Audit"
                    subtitle="Configure clinic identity, channeling rules, cashier workflows, and review security audit logs."
                    actions={
                        <span className="px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900/40 font-mono text-xs font-bold shadow-xs">
                            {profile.subdomain}.medvisit.lk
                        </span>
                    }
                />
                {/* Navigation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'profile'
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Clinic Profile
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('sessions')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'sessions'
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Session Defaults
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('billing')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'billing'
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Receipt className="w-4 h-4" />
                        Billing & Cashier
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('online')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'online'
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Globe className="w-4 h-4" />
                        Online Booking
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('audit')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'audit'
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Audit Trail
                    </button>
                </div>

                {/* Tab 1: Clinic Profile */}
                {activeTab === 'profile' && (
                    <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Clinic Identity & Legal Details
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Your clinic details will appear on printed token slips, bills, and the public channeling portal.
                            </p>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Clinic Name (Proper Capitalisation) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={profileForm.data.name}
                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                    placeholder="e.g. Suwasetha Medical Center"
                                    className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Saved with proper capitalization as entered (never lowercase).
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Hotline Phone (+94)
                                    </label>
                                    <PhoneInput
                                        value={profileForm.data.phone}
                                        onChange={(val) => profileForm.setData('phone', val)}
                                        placeholder="11 234 5678"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        PHSRC / SLMC Registration No.
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.data.registration_number}
                                        onChange={(e) =>
                                            profileForm.setData('registration_number', e.target.value)
                                        }
                                        placeholder="PHSRC/MED/2024/098"
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Physical Address
                                </label>
                                <textarea
                                    rows={2}
                                    value={profileForm.data.address}
                                    onChange={(e) => profileForm.setData('address', e.target.value)}
                                    placeholder="No. 123, Galle Road, Colombo 03, Sri Lanka"
                                    className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Clinic Logo URL
                                </label>
                                <input
                                    type="url"
                                    value={profileForm.data.logo_url}
                                    onChange={(e) => profileForm.setData('logo_url', e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={profileForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {profileForm.processing ? 'Saving...' : 'Save Clinic Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab 2: Session Defaults */}
                {activeTab === 'sessions' && (
                    <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Channeling Session Defaults
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Set default timings and token quotas pre-filled when creating new weekly templates and sessions.
                            </p>
                        </div>

                        <form onSubmit={handleSessionSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Avg Consultation Time (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min={3}
                                        max={60}
                                        value={sessionForm.data.default_avg_consultation_minutes}
                                        onChange={(e) =>
                                            sessionForm.setData(
                                                'default_avg_consultation_minutes',
                                                Number(e.target.value)
                                            )
                                        }
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                        Used to calculate estimated arrival times for patient tokens.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Default Max Tokens Per Session
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={sessionForm.data.default_max_tokens}
                                        onChange={(e) =>
                                            sessionForm.setData('default_max_tokens', Number(e.target.value))
                                        }
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Cancellation Cutoff Window (Hours)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={48}
                                        value={sessionForm.data.cancellation_window_hours}
                                        onChange={(e) =>
                                            sessionForm.setData(
                                                'cancellation_window_hours',
                                                Number(e.target.value)
                                            )
                                        }
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                        Hours prior to session start when patient self-cancellations lock.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Auto-Generation Days Horizon
                                    </label>
                                    <input
                                        type="number"
                                        min={7}
                                        max={90}
                                        value={sessionForm.data.auto_generate_days}
                                        onChange={(e) =>
                                            sessionForm.setData('auto_generate_days', Number(e.target.value))
                                        }
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                        Daily cron generates future sessions up to this number of days (default 30).
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={sessionForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {sessionForm.processing ? 'Saving...' : 'Save Session Defaults'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab 3: Billing & Cashier */}
                {activeTab === 'billing' && (
                    <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Cashier & Payment Collection Rules
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Choose when patient channeling fees are collected and customize receipt numbering.
                            </p>
                        </div>

                        <form onSubmit={handleBillingSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Payment Collection Timing
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                            billingForm.data.billing_timing === 'pay_at_issue'
                                                ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-500'
                                                : 'border-slate-200 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="billing_timing"
                                                value="pay_at_issue"
                                                checked={billingForm.data.billing_timing === 'pay_at_issue'}
                                                onChange={() => billingForm.setData('billing_timing', 'pay_at_issue')}
                                                className="text-primary-600"
                                            />
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Pay at Token Issue (Recommended)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 ml-5">
                                            Patients pay doctor + clinic fee when booking the token at reception or on arrival.
                                        </p>
                                    </label>

                                    <label
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                            billingForm.data.billing_timing === 'pay_after_consult'
                                                ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-500'
                                                : 'border-slate-200 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="billing_timing"
                                                value="pay_after_consult"
                                                checked={billingForm.data.billing_timing === 'pay_after_consult'}
                                                onChange={() =>
                                                    billingForm.setData('billing_timing', 'pay_after_consult')
                                                }
                                                className="text-primary-600"
                                            />
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Pay After Consultation
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 ml-5">
                                            Patients receive consultation first, then settle bill at reception before departure.
                                        </p>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Receipt Number Prefix
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        value={billingForm.data.receipt_prefix}
                                        onChange={(e) =>
                                            billingForm.setData('receipt_prefix', e.target.value.toUpperCase())
                                        }
                                        placeholder="REC"
                                        className="w-full text-xs font-mono rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                        Generated e.g.: {billingForm.data.receipt_prefix || 'REC'}-00142
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Operational Currency
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value="Sri Lankan Rupee (LKR - Rs.)"
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Accepted Payment Methods
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { id: 'cash', label: 'Cash (LKR)' },
                                        { id: 'card', label: 'Credit / Debit Card (VISA / Mastercard)' },
                                        { id: 'bank_transfer', label: 'Bank Transfer / QR' },
                                    ].map((pm) => (
                                        <button
                                            key={pm.id}
                                            type="button"
                                            onClick={() => toggleBillingMethod(pm.id)}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                                                billingForm.data.accepted_methods.includes(pm.id)
                                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-900 dark:text-primary-200'
                                                    : 'border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={billingForm.data.accepted_methods.includes(pm.id)}
                                                onChange={() => {}}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span>{pm.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={billingForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {billingForm.processing ? 'Saving...' : 'Save Billing Rules'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab 4: Online Booking */}
                {activeTab === 'online' && (
                    <div className="max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Public Online Booking & Anti-Abuse Rules
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Control how patients can book channeling slots online from your subdomain landing page.
                            </p>
                        </div>

                        <form onSubmit={handleOnlineSubmit} className="space-y-4">
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                        Enable Public Online Booking (/book)
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                        When enabled, patients can browse sessions and issue digital tokens online.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={onlineForm.data.online_booking_enabled}
                                    onChange={(e) =>
                                        onlineForm.setData('online_booking_enabled', e.target.checked)
                                    }
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Maximum Active Tokens Per Phone Number
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={onlineForm.data.max_active_tokens_per_phone}
                                    onChange={(e) =>
                                        onlineForm.setData(
                                            'max_active_tokens_per_phone',
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Prevents scalping by limiting simultaneous active tokens held by a single mobile number across your clinic.
                                </span>
                            </div>

                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                        Require Staff Review Before Token Issuance
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                        Tokens remain pending until confirmed by reception staff.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={onlineForm.data.require_staff_approval}
                                    onChange={(e) =>
                                        onlineForm.setData('require_staff_approval', e.target.checked)
                                    }
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                            </div>

                            {/* Phone Number Verification for Online Bookings */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                            Require Phone Verification for Online Bookings
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                            Requires patients to verify their Sri Lankan mobile number before issuing an online channeling token.
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={onlineForm.data.require_phone_verification}
                                        onChange={(e) =>
                                            onlineForm.setData('require_phone_verification', e.target.checked)
                                        }
                                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                </div>

                                {onlineForm.data.require_phone_verification && (
                                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Verification Methods to Offer Patients
                                        </label>
                                        <div className="flex flex-wrap gap-2.5">
                                            {(onlineBookingSettings.platform_available_channels || ['whatsapp', 'textlk']).includes('whatsapp') && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleVerificationMethod('whatsapp')}
                                                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                                                        onlineForm.data.phone_verification_methods.includes('whatsapp')
                                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={onlineForm.data.phone_verification_methods.includes('whatsapp')}
                                                        onChange={() => {}}
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>WhatsApp (Reverse Verification)</span>
                                                </button>
                                            )}

                                            {(onlineBookingSettings.platform_available_channels || ['whatsapp', 'textlk']).includes('textlk') && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleVerificationMethod('textlk')}
                                                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                                                        onlineForm.data.phone_verification_methods.includes('textlk')
                                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={onlineForm.data.phone_verification_methods.includes('textlk')}
                                                        onChange={() => {}}
                                                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <span>SMS (via Text.lk)</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 block">
                                            If only one method is selected, patients will directly use that channel without being asked.
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={onlineForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {onlineForm.processing ? 'Saving...' : 'Save Online Booking Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab 5: Audit Trail */}
                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        {/* Audit Search and Filters Bar */}
                        <form
                            onSubmit={handleAuditFilterSubmit}
                            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center gap-3"
                        >
                            <div className="flex-1 w-full relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={auditFilters.search}
                                    onChange={(e) =>
                                        setAuditFilters({ ...auditFilters, search: e.target.value })
                                    }
                                    placeholder="Search by action, user name, or IP address..."
                                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div className="w-full sm:w-48">
                                <GlassSelect
                                    value={auditFilters.action}
                                    onChange={(e) =>
                                        setAuditFilters({ ...auditFilters, action: e.target.value })
                                    }
                                    placeholder="All Actions"
                                    options={[
                                        { value: '', label: 'All Actions' },
                                        ...availableActions.map((act) => ({ value: act, label: act })),
                                    ]}
                                />
                            </div>

                            <div className="w-full sm:w-40">
                                <input
                                    type="date"
                                    value={auditFilters.date}
                                    onChange={(e) =>
                                        setAuditFilters({ ...auditFilters, date: e.target.value })
                                    }
                                    className="w-full text-xs py-2 px-3 rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    type="submit"
                                    className="px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold hover:bg-slate-900"
                                >
                                    Filter
                                </button>
                                <button
                                    type="button"
                                    onClick={resetAuditFilters}
                                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Reset
                                </button>
                            </div>
                        </form>

                        {/* Audit Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                        Security & Clinical Event Log
                                    </h3>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                    Showing latest {auditLogs.length} events
                                </span>
                            </div>

                            {auditLogs.length === 0 ? (
                                <div className="p-12 text-center text-xs text-slate-400">
                                    No audit events found matching the specified filter criteria.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] text-slate-500 font-bold">
                                                <th className="py-2.5 px-4">Action</th>
                                                <th className="py-2.5 px-4">Actor</th>
                                                <th className="py-2.5 px-4">Target / Metadata</th>
                                                <th className="py-2.5 px-4">IP Address</th>
                                                <th className="py-2.5 px-4 text-right">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {auditLogs.map((log) => (
                                                <tr
                                                    key={log.id}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                                >
                                                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${
                                                                log.action.startsWith('patient')
                                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                                    : log.action.startsWith('settings')
                                                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                                    : log.action.startsWith('staff')
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                            {log.user_name}
                                                        </div>
                                                        {log.user_email && (
                                                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                                                {log.user_email}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 max-w-sm">
                                                        {log.metadata ? (
                                                            <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 truncate">
                                                                {JSON.stringify(log.metadata)}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">None</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                                                        {log.ip_address || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="font-medium text-slate-900 dark:text-slate-100">
                                                            {log.created_at}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {log.created_at_relative}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
