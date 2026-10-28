import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    MessageSquare,
    Smartphone,
    Mail,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Calendar,
    DollarSign,
    Filter,
    ShieldAlert,
    TrendingUp,
} from 'lucide-react';

interface ClinicBreakdownItem {
    tenant_id: string;
    clinic_name: string;
    sms_count: number;
    sms_failed: number;
    sms_cost: number;
    wa_count: number;
    wa_failed: number;
    email_count: number;
    email_failed: number;
    total_volume: number;
    success_rate: number;
}

interface FailureItem {
    id: string;
    channel: string;
    recipient_masked: string;
    clinic_name: string;
    reason: string;
    created_at: string;
}

interface Props {
    month: string;
    activeTab: 'overview' | 'sms' | 'whatsapp' | 'email';
    costPerSms: number;
    providers: {
        sms: { status: string; message: string; is_configured: boolean };
        whatsapp: { status: string; message: string; is_configured: boolean };
        email: { status: string; message: string; is_configured: boolean };
    };
    platformTotals: {
        total_messages: number;
        sms_sent: number;
        sms_delivered: number;
        sms_failed: number;
        sms_success_rate: number;
        sms_estimated_cost: number;
        sms_unconfigured_skipped: number;
        wa_sent: number;
        wa_delivered: number;
        wa_failed: number;
        wa_success_rate: number;
        wa_unconfigured_skipped: number;
        email_sent: number;
        email_failed: number;
        email_success_rate: number;
    };
    clinicBreakdown: ClinicBreakdownItem[];
    recentFailures: FailureItem[];
}

export default function MessagingUsageIndex({
    month,
    activeTab,
    costPerSms,
    providers,
    platformTotals,
    clinicBreakdown,
    recentFailures,
}: Props) {
    const [selectedTab, setSelectedTab] = useState(activeTab || 'overview');
    const [selectedMonth, setSelectedMonth] = useState(month);

    const handleMonthChange = (newMonth: string) => {
        setSelectedMonth(newMonth);
        router.get(
            '/super-admin/messaging',
            { month: newMonth, tab: selectedTab },
            { preserveState: true }
        );
    };

    const handleTabChange = (newTab: 'overview' | 'sms' | 'whatsapp' | 'email') => {
        setSelectedTab(newTab);
        router.get(
            '/super-admin/messaging',
            { month: selectedMonth, tab: newTab },
            { preserveState: true }
        );
    };

    return (
        <PlatformLayout>
            <Head title="Messaging & OTP Usage — MedVisit Platform" />

            <div className="space-y-6">
                {/* Header with Month Picker */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <MessageSquare className="w-6 h-6 text-indigo-500" />
                            Messaging & OTP Usage
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Platform-wide delivery analytics, gateway connectivity health, and per-clinic consumption.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Provider Connectivity Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* SMS / Text.lk */}
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">Text.lk SMS Gateway</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    providers.sms.is_configured
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                }`}>
                                    {providers.sms.is_configured ? 'Configured & Reachable' : 'Not Configured'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{providers.sms.message}</p>
                            <div className="text-[11px] text-slate-400 mt-2 font-mono">Cost: LKR {costPerSms.toFixed(2)} / message</div>
                        </div>
                    </div>

                    {/* WhatsApp Cloud API */}
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">WhatsApp Cloud API</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    providers.whatsapp.is_configured
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                }`}>
                                    {providers.whatsapp.is_configured ? 'Configured & Reachable' : 'Not Configured'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{providers.whatsapp.message}</p>
                            <div className="text-[11px] text-slate-400 mt-2">Fallback OTP channel</div>
                        </div>
                    </div>

                    {/* Email Service */}
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">Email Service (Resend/SMTP)</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Active & Sending
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{providers.email.message}</p>
                            <div className="text-[11px] text-slate-400 mt-2">Announcements & transactional</div>
                        </div>
                    </div>
                </div>

                {/* Channel Selector Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                    <button
                        type="button"
                        onClick={() => handleTabChange('overview')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedTab === 'overview'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        Overview (All Channels)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('sms')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedTab === 'sms'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        SMS (Text.lk)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('whatsapp')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedTab === 'whatsapp'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        WhatsApp
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('email')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedTab === 'email'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        Email Broadcasts
                    </button>
                </div>

                {/* KPI Metrics for Selected Channel / Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Volume</span>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {selectedTab === 'overview'
                                ? platformTotals.total_messages
                                : selectedTab === 'sms'
                                ? platformTotals.sms_sent
                                : selectedTab === 'whatsapp'
                                ? platformTotals.wa_sent
                                : platformTotals.email_sent}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Success Rate</span>
                        <div className="text-2xl font-bold text-emerald-600 mt-1">
                            {selectedTab === 'overview'
                                ? `${platformTotals.sms_success_rate}%`
                                : selectedTab === 'sms'
                                ? `${platformTotals.sms_success_rate}%`
                                : selectedTab === 'whatsapp'
                                ? `${platformTotals.wa_success_rate}%`
                                : `${platformTotals.email_success_rate}%`}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Estimated SMS Cost</span>
                        <div className="text-2xl font-bold text-indigo-600 mt-1">
                            LKR {platformTotals.sms_estimated_cost.toLocaleString()}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Config Skipped (Not Failed)</span>
                        <div className="text-2xl font-bold text-slate-600 dark:text-slate-300 mt-1">
                            {platformTotals.sms_unconfigured_skipped + platformTotals.wa_unconfigured_skipped}
                        </div>
                    </div>
                </div>

                {/* Per-Clinic Breakdown Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Consumption & Reliability by Clinic</h3>
                        <span className="text-xs text-slate-400">{clinicBreakdown.length} clinics active in {selectedMonth}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Clinic Name</th>
                                    <th className="py-3 px-4">SMS Volume</th>
                                    <th className="py-3 px-4">SMS Cost</th>
                                    <th className="py-3 px-4">WhatsApp</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Total Messages</th>
                                    <th className="py-3 px-4 text-right">Delivery Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {clinicBreakdown.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No messages logged in this billing period.
                                        </td>
                                    </tr>
                                ) : (
                                    clinicBreakdown.map((item) => (
                                        <tr key={item.tenant_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                                {item.clinic_name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span>{item.sms_count}</span>
                                                {item.sms_failed > 0 && (
                                                    <span className="text-[10px] text-rose-500 ml-1.5 font-bold">({item.sms_failed} failed)</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                                                LKR {item.sms_cost.toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span>{item.wa_count}</span>
                                                {item.wa_failed > 0 && (
                                                    <span className="text-[10px] text-rose-500 ml-1.5 font-bold">({item.wa_failed} failed)</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span>{item.email_count}</span>
                                                {item.email_failed > 0 && (
                                                    <span className="text-[10px] text-rose-500 ml-1.5 font-bold">({item.email_failed} failed)</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                {item.total_volume}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold">
                                                <span className={item.success_rate < 90 ? 'text-amber-500' : 'text-emerald-600'}>
                                                    {item.success_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Delivery Failures Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Delivery Failures (Masked Recipients)</h3>
                        </div>
                        <span className="text-xs text-slate-400">Last 50 gateway rejections</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Channel</th>
                                    <th className="py-3 px-4">Masked Recipient</th>
                                    <th className="py-3 px-4">Clinic</th>
                                    <th className="py-3 px-4">Failure Reason</th>
                                    <th className="py-3 px-4 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {recentFailures.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            No delivery failures recorded in this period. All channels healthy.
                                        </td>
                                    </tr>
                                ) : (
                                    recentFailures.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 uppercase text-xs font-bold text-slate-500">
                                                {item.channel}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                                                {item.recipient_masked}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                {item.clinic_name}
                                            </td>
                                            <td className="py-3 px-4 text-rose-600 dark:text-rose-400 text-xs max-w-sm truncate">
                                                {item.reason}
                                            </td>
                                            <td className="py-3 px-4 text-right text-xs text-slate-400">
                                                {item.created_at}
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
