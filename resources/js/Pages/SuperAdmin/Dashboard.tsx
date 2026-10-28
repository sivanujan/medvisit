import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    DollarSign,
    Building2,
    Clock,
    AlertCircle,
    UserPlus,
    UserMinus,
    Ticket,
    CreditCard,
    ArrowUpRight,
    HelpCircle,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    ExternalLink,
    Activity,
    ChevronRight,
    TrendingUp,
} from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

interface DashboardProps {
    kpis: {
        mrr_lkr: number;
        mrr_formatted: string;
        active_paying_clinics: number;
        active_trials: number;
        past_due: number;
        new_clinics_this_month: number;
        churned_this_month: number;
        tokens_issued_today: number;
        failed_payments_7d: number;
    };
    charts: {
        mrr_trend: Array<{ month: string; mrr: number }>;
        clinic_growth: Array<{ month: string; new: number; churned: number }>;
        tokens_per_day: Array<{ date: string; tokens: number }>;
    };
    needsAttention: Array<{
        id: string;
        type: string;
        severity: 'critical' | 'warning' | 'info';
        title: string;
        description: string;
        action_label: string;
        action_url: string;
        timestamp?: string;
    }>;
    recentActivity: Array<{
        id: number;
        event: string;
        actor: string;
        tenant_id?: string | null;
        metadata?: any;
        created_at_human?: string;
    }>;
    pendingMedicineReviewsCount: number;
}

export default function SuperAdminDashboard({
    kpis,
    charts,
    needsAttention,
    recentActivity,
    pendingMedicineReviewsCount,
}: DashboardProps) {
    return (
        <PlatformLayout>
            <Head title="Platform Dashboard • MedVisit" />

            {/* Header */}
            <PageHeader
                eyebrow="Platform Owner Overview"
                title="MedVisit Platform Dashboard"
                subtitle="Live subscription revenue, tenant clinic fleet health, and items requiring attention."
                actions={
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/super-admin/clinics"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/25"
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Manage Clinics</span>
                        </Link>
                        <Link
                            href="/super-admin/subscriptions"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Invoices & Billing</span>
                        </Link>
                    </div>
                }
            />

            {/* 8 Primary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* 1. MRR Card with tooltip */}
                <GlassCard className="p-4 relative group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Recurring Revenue</span>
                            <div className="relative group/tip cursor-help">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tip:block w-64 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed z-50 shadow-xl border border-white/10 pointer-events-none">
                                    Formula: Sum of monthly subscription fees from active paid clinics only. Excludes complimentary clinics, trials, cancelled accounts, and accounts past due beyond grace.
                                </div>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.mrr_formatted}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            <span>Active paid monthly volume</span>
                        </div>
                    </div>
                </GlassCard>

                {/* 2. Active Paying Clinics */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Paying Clinics</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.active_paying_clinics}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Contracted subscriber clinics</div>
                    </div>
                </GlassCard>

                {/* 3. Active Trials */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Trials</span>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.active_trials}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">14-day evaluation accounts</div>
                    </div>
                </GlassCard>

                {/* 4. Past Due / Overdue */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Past Due / Overdue</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.past_due}
                        </div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Pending subscription payment</div>
                    </div>
                </GlassCard>

                {/* 5. New Clinics This Month */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">New Clinics (This Month)</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <UserPlus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.new_clinics_this_month}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Tenant registrations logged</div>
                    </div>
                </GlassCard>

                {/* 6. Churned This Month */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Churned (This Month)</span>
                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <UserMinus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.churned_this_month}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Cancelled subscriptions</div>
                    </div>
                </GlassCard>

                {/* 7. Tokens Issued Today */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tokens Issued Today</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Ticket className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.tokens_issued_today}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Across all clinic workspaces</div>
                    </div>
                </GlassCard>

                {/* 8. Failed Payments 7d */}
                <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Failed Payments (7 Days)</span>
                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {kpis.failed_payments_7d}
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">Gateway transaction declines</div>
                    </div>
                </GlassCard>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Chart 1: 12-Month MRR Progression */}
                <GlassCard className="p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Recurring Revenue (MRR)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">12-month paid subscription trajectory in LKR</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                            Current: {kpis.mrr_formatted}
                        </span>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.mrr_trend}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Rs.${v}`} />
                                <Tooltip
                                    formatter={(val: any) => [`Rs. ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'MRR']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="mrr"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#4f46e5' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Chart 2: New vs Churned Clinics */}
                <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fleet Growth</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">New signups vs churned (6 mo)</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.clinic_growth}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="new" name="New Clinics" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="churned" name="Churned" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* Daily Channeling Volume Chart */}
            <div className="mt-6">
                <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Channeling Tokens (30 Days)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Total patient tokens generated across Sri Lankan clinics</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            Today: {kpis.tokens_issued_today} tokens
                        </span>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={charts.tokens_per_day}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip formatter={(val: any) => [val, 'Tokens Issued']} />
                                <Line
                                    type="monotone"
                                    dataKey="tokens"
                                    stroke="#06b6d4"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* Split Row: Needs Attention Radar & Recent Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Needs Attention Radar (7 cols) */}
                <div className="lg:col-span-7">
                    <GlassCard className="p-5 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Needs Attention</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {needsAttention.length} items
                            </span>
                        </div>

                        {needsAttention.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">All clear! No urgent items</div>
                                <div className="text-xs text-slate-400 mt-1">Payments, renewals, and background queues are operating normally.</div>
                            </div>
                        ) : (
                            <div className="space-y-3 flex-1 overflow-y-auto">
                                {needsAttention.map((item) => {
                                    const severityBg =
                                        item.severity === 'critical'
                                            ? 'border-rose-500/20 bg-rose-500/5'
                                            : item.severity === 'warning'
                                            ? 'border-amber-500/20 bg-amber-500/5'
                                            : 'border-blue-500/20 bg-blue-500/5';
                                    const badgeColor =
                                        item.severity === 'critical'
                                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                            : item.severity === 'warning'
                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400';

                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-3.5 rounded-2xl border ${severityBg} flex items-center justify-between gap-3`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeColor}`}>
                                                        {item.severity}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                        {item.title}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                                    {item.description}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {item.timestamp && (
                                                    <span className="text-[10px] text-slate-400 hidden sm:inline">{item.timestamp}</span>
                                                )}
                                                <Link
                                                    href={item.action_url}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs transition"
                                                >
                                                    {item.action_label}
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Recent Platform Activity Feed (5 cols) */}
                <div className="lg:col-span-5">
                    <GlassCard className="p-5 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                            </div>
                            <Link href="/super-admin/audit-logs" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                View Audit Log &rarr;
                            </Link>
                        </div>

                        {recentActivity.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400 text-xs">
                                No recent activity logged yet.
                            </div>
                        ) : (
                            <div className="space-y-3 flex-1 overflow-y-auto">
                                {recentActivity.map((act) => (
                                    <div key={act.id} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 flex items-start gap-3 text-xs">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {act.event}
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                                <span>by {act.actor}</span>
                                                {act.tenant_id && <span className="font-mono">({act.tenant_id})</span>}
                                                <span>• {act.created_at_human}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </PlatformLayout>
    );
}
