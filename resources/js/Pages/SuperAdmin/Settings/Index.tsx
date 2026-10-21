import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Sliders,
    Save,
    RotateCcw,
    AlertTriangle,
    CheckCircle2,
    Building2,
    CreditCard,
    Shield,
    MessageSquare,
    Users,
    Wrench,
    Globe,
} from 'lucide-react';

interface Props {
    settings: Record<string, any>;
    plans: Array<{ id: number; name: string; slug: string }>;
    baseDomain: string;
}

export default function PlatformSettingsIndex({ settings, plans = [], baseDomain }: Props) {
    const [activeTab, setActiveTab] = useState<'general' | 'signups' | 'billing' | 'messaging' | 'security' | 'maintenance'>('general');
    const [form, setForm] = useState<Record<string, any>>({ ...settings });
    const [isDirty, setIsDirty] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Track unsaved changes
    useEffect(() => {
        const hasChanged = JSON.stringify(form) !== JSON.stringify(settings);
        setIsDirty(hasChanged);
    }, [form, settings]);

    // Unsaved changes beforeunload warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.put('/super-admin/settings', form, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDirty(false);
                setSuccessMessage('Settings saved successfully.');
                setTimeout(() => setSuccessMessage(null), 3000);
            },
        });
    };

    const handleReset = () => {
        setForm({ ...settings });
        setIsDirty(false);
    };

    return (
        <PlatformLayout>
            <Head title="Platform Settings — MedVisit Platform" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header with Save / Unsaved Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Sliders className="w-6 h-6 text-indigo-500" />
                            Platform Configuration & Policies
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Central platform parameters, onboarding rules, billing grace periods, and maintenance mode.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isDirty && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Unsaved Changes
                            </span>
                        )}
                        {successMessage && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {successMessage}
                            </span>
                        )}
                        {isDirty && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Revert
                            </button>
                        )}
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            Save Settings
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3 overflow-x-auto">
                    {[
                        { id: 'general', label: 'General', icon: Globe },
                        { id: 'signups', label: 'Clinics & Signups', icon: Users },
                        { id: 'billing', label: 'Billing & Grace Days', icon: CreditCard },
                        { id: 'messaging', label: 'Messaging & OTP', icon: MessageSquare },
                        { id: 'security', label: 'Security & 2FA', icon: Shield },
                        { id: 'maintenance', label: 'Maintenance Mode', icon: Wrench },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    active
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Form Body by Tab */}
                <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-4 max-w-2xl">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
                                Platform Branding & Support Contact
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Platform Name
                                </label>
                                <input
                                    type="text"
                                    value={form['general.platform_name'] || ''}
                                    onChange={(e) => setForm({ ...form, 'general.platform_name': e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Support Email (shown to clinics)
                                    </label>
                                    <input
                                        type="email"
                                        value={form['general.support_email'] || ''}
                                        onChange={(e) => setForm({ ...form, 'general.support_email': e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Support Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={form['general.support_phone'] || ''}
                                        onChange={(e) => setForm({ ...form, 'general.support_phone': e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Support WhatsApp Number
                                </label>
                                <input
                                    type="text"
                                    value={form['general.support_whatsapp'] || ''}
                                    onChange={(e) => setForm({ ...form, 'general.support_whatsapp': e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Base System Domain (Read-only from tenancy config)
                                </label>
                                <input
                                    type="text"
                                    value={baseDomain}
                                    disabled
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm cursor-not-allowed font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {/* Signups Tab */}
                    {activeTab === 'signups' && (
                        <div className="space-y-4 max-w-2xl">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
                                Self-Service Clinic Registration & Trials
                            </h3>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">Allow Public Clinic Signups</div>
                                    <div className="text-[11px] text-slate-500">Enable or close the public /register portal.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={!!form['signups.open']}
                                    onChange={(e) => setForm({ ...form, 'signups.open': e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Default Free Trial Duration (Days)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={form['signups.trial_days'] || 30}
                                        onChange={(e) => setForm({ ...form, 'signups.trial_days': parseInt(e.target.value) || 30 })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Default Signup Plan
                                    </label>
                                    <select
                                        value={form['signups.default_plan_slug'] || 'starter'}
                                        onChange={(e) => setForm({ ...form, 'signups.default_plan_slug': e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    >
                                        {plans.map((p) => (
                                            <option key={p.slug} value={p.slug}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">Require Email Verification on Signup</div>
                                    <div className="text-[11px] text-slate-500">Require clinic owner email verification before provisioning database.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={!!form['signups.require_email_verification']}
                                    onChange={(e) => setForm({ ...form, 'signups.require_email_verification': e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-4 max-w-2xl">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
                                Invoicing, Grace Periods & Currency
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Grace Period After Due Date (Days)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={form['billing.grace_days'] ?? 3}
                                        onChange={(e) => setForm({ ...form, 'billing.grace_days': parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                                        Clinic continues to operate during grace period before suspension.
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Renewal Reminder Days Before Expiry
                                    </label>
                                    <input
                                        type="text"
                                        value={form['billing.reminder_days'] || '7,1'}
                                        onChange={(e) => setForm({ ...form, 'billing.reminder_days': e.target.value })}
                                        placeholder="e.g. 7,1"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">Comma-separated days (e.g. 7,1).</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    Platform Currency (Read-only)
                                </label>
                                <input
                                    type="text"
                                    value={form['billing.currency'] || 'LKR'}
                                    disabled
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm cursor-not-allowed font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {/* Messaging Tab */}
                    {activeTab === 'messaging' && (
                        <div className="space-y-4 max-w-2xl">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
                                SMS Tariff & Gateway Routing
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        SMS Cost Per Message (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={form['messaging.sms_cost_per_message'] || 1.85}
                                        onChange={(e) => setForm({ ...form, 'messaging.sms_cost_per_message': parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        SMS Sender ID / Header
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={11}
                                        value={form['messaging.sender_name'] || 'MedVisit'}
                                        onChange={(e) => setForm({ ...form, 'messaging.sender_name': e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-4 max-w-2xl">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
                                Super Administrator Authentication & Session Limits
                            </h3>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">Enforce 2FA for All Super Admins</div>
                                    <div className="text-[11px] text-slate-500">Requires TOTP setup upon login. (Default ON in production, OFF locally).</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={!!form['security.enforce_2fa_super_admin']}
                                    onChange={(e) => setForm({ ...form, 'security.enforce_2fa_super_admin': e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Super Admin Inactive Session Lifetime (Minutes)
                                </label>
                                <input
                                    type="number"
                                    min={15}
                                    max={10080}
                                    value={form['security.session_lifetime_minutes'] || 120}
                                    onChange={(e) => setForm({ ...form, 'security.session_lifetime_minutes': parseInt(e.target.value) || 120 })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Maintenance Mode Tab */}
                    {activeTab === 'maintenance' && (
                        <div className="space-y-4 max-w-2xl">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
                                Platform-Wide Scheduled Maintenance Banner
                            </h3>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white">Display Maintenance Notice</div>
                                    <div className="text-[11px] text-slate-500">
                                        Renders an un-dismissible notification banner at the top of all clinic workspaces. Super admin access is never blocked.
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={!!form['maintenance.enabled']}
                                    onChange={(e) => setForm({ ...form, 'maintenance.enabled': e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Maintenance Banner Notice Text
                                </label>
                                <textarea
                                    rows={3}
                                    value={form['maintenance.banner_text'] || ''}
                                    onChange={(e) => setForm({ ...form, 'maintenance.banner_text': e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    required
                                />
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </PlatformLayout>
    );
}
