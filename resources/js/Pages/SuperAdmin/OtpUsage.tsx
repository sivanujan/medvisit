import React from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Filter,
    MessageCircle,
    MessageSquare,
    PhoneCall,
    ShieldCheck,
    TrendingUp,
    XCircle,
} from 'lucide-react';

interface ChannelStat {
    channel: string;
    total: number;
    verified: number;
    failed: number;
    success_rate: number;
}

interface ClinicStat {
    tenant_id: string;
    clinic_name: string;
    subdomain: string;
    total_attempts: number;
    total_verified: number;
    overall_success_rate: number;
    by_channel: Record<string, ChannelStat>;
}

interface FailureLog {
    id: number;
    clinic_name: string;
    channel: string;
    phone_masked: string;
    status: string;
    error: string;
    created_at: string;
    timestamp: string;
}

interface Props {
    selectedMonth: string;
    summary: {
        total: number;
        verified: number;
        success_rate: number;
        whatsapp_count: number;
        textlk_count: number;
    };
    clinicStats: ClinicStat[];
    recentFailures: FailureLog[];
}

export default function OtpUsage({
    selectedMonth,
    summary,
    clinicStats = [],
    recentFailures = [],
}: Props) {
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get(
            '/super-admin/otp-usage',
            { month: e.target.value },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="OTP Verification Analytics - Super Admin - MedVisit" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Super Admin', href: '/dashboard' },
                        { label: 'OTP & SMS Analytics' },
                    ]}
                    title="Phone Verification & OTP Usage Analytics"
                    subtitle="Platform-wide reverse WhatsApp verification and Text.lk SMS OTP consumption across all clinics."
                    actions={
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Month:
                            </label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="text-xs font-semibold bg-transparent border-none p-0 focus:ring-0 text-slate-900 dark:text-white cursor-pointer"
                            />
                        </div>
                    }
                />

                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Dispatches */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Total Verification Attempts
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                            {summary.total.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Total initiated in {selectedMonth}</p>
                    </div>

                    {/* Overall Success Rate */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Overall Success Rate
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                            {summary.success_rate}%
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-1">
                            {summary.verified.toLocaleString()} numbers successfully verified
                        </p>
                    </div>

                    {/* WhatsApp Reverse Verifications */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                WhatsApp Reverse
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 fill-current" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                            {summary.whatsapp_count.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Zero-cost Meta webhook traffic</p>
                    </div>

                    {/* Text.lk SMS OTPs */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Text.lk SMS Sent
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                            {summary.textlk_count.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Direct SMS carrier dispatches</p>
                    </div>
                </div>

                {/* Clinic Usage Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Clinic OTP Usage Breakdown ({selectedMonth})
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Monthly volume and verification success rate broken down per clinic.
                            </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                            {clinicStats.length} Clinics Active
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Clinic Name</th>
                                    <th className="py-3 px-4">Total Attempts</th>
                                    <th className="py-3 px-4">Verified</th>
                                    <th className="py-3 px-4">Success Rate</th>
                                    <th className="py-3 px-4">WhatsApp Volume</th>
                                    <th className="py-3 px-4">Text.lk SMS Volume</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {clinicStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            No OTP verification activity recorded for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    clinicStats.map((clinic) => {
                                        const wa = clinic.by_channel['whatsapp'];
                                        const sms = clinic.by_channel['textlk'];

                                        return (
                                            <tr
                                                key={clinic.tenant_id}
                                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {clinic.clinic_name}
                                                        </span>
                                                        <span className="block text-[11px] font-mono text-slate-400">
                                                            {clinic.subdomain}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                                    {clinic.total_attempts}
                                                </td>
                                                <td className="py-3 px-4 text-emerald-600 font-bold">
                                                    {clinic.total_verified}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                            clinic.overall_success_rate >= 80
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                                : clinic.overall_success_rate >= 50
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                        }`}
                                                    >
                                                        {clinic.overall_success_rate}%
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    {wa ? `${wa.total} (${wa.success_rate}%)` : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    {sms ? `${sms.total} (${sms.success_rate}%)` : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Failures Audit Log */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                Recent Verification Failures & Delivery Issues
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Real-time audit trail of wrong codes, expired attempts, and carrier errors (phones are masked).
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Time</th>
                                    <th className="py-3 px-4">Clinic</th>
                                    <th className="py-3 px-4">Channel</th>
                                    <th className="py-3 px-4">Masked Phone</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Error Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {recentFailures.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            No verification failures logged recently. Everything is operating smoothly.
                                        </td>
                                    </tr>
                                ) : (
                                    recentFailures.map((failure) => (
                                        <tr
                                            key={failure.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                                {failure.created_at}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                {failure.clinic_name}
                                            </td>
                                            <td className="py-3 px-4 uppercase font-bold text-[10px]">
                                                <span
                                                    className={`px-2 py-0.5 rounded-md ${
                                                        failure.channel === 'whatsapp'
                                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                                                    }`}
                                                >
                                                    {failure.channel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                                                {failure.phone_masked}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    {failure.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                                                {failure.error}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
