import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Calendar,
    Users,
    Receipt,
    Clock,
    Activity,
    ArrowRight,
    Stethoscope,
    Ticket,
    CheckCircle2,
    Circle,
    Building2,
    CalendarCheck,
    Plus,
    UserCheck,
    Globe,
    ChevronRight,
    BellRing,
    Sparkles,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { StatusBadge } from '@/Components/UI/StatusBadge';

interface DashboardProps {
    tenant: {
        id: string;
        name: string;
        subdomain: string;
        currency: string;
        currency_symbol: string;
    };
    userRole: 'clinic_admin' | 'doctor' | 'receptionist';
    stats: {
        todayPatientsCount: number;
        waitingCount: number;
        activeSessionsCount: number;
        todayCollections: string;
        todayDoctorFees: string;
        todayClinicFees: string;
    };
    activeSession: {
        id: number;
        doctor_name: string;
        specialty: string;
        room_number: string;
        time_range: string;
        current_token_number: number;
        booked_tokens_count: number;
        max_tokens: number;
        status: string;
    } | null;
    queue: {
        nowServing: {
            id: number;
            token_number: number;
            patient_name: string;
            patient_phone: string;
            status: string;
            estimated_time: string;
        } | null;
        nextInLine: Array<{
            id: number;
            token_number: number;
            patient_name: string;
            status: string;
            estimated_time: string;
        }>;
        tokens: Array<{
            id: number;
            token_number: number;
            patient_name: string;
            patient_phone: string;
            status: string;
            booked_via: string;
            estimated_time: string;
        }>;
    };
    upcomingSessions: Array<{
        id: number;
        doctor_name: string;
        specialty: string;
        date: string;
        start_time: string;
        end_time: string;
        room_number: string;
        status: string;
        booked_tokens_count: number;
        max_tokens: number;
        fee_formatted: string;
    }>;
    recentBookings: Array<{
        id: number;
        token_number: number;
        patient_name: string;
        doctor_name: string;
        session_date: string;
        estimated_time: string;
        status: string;
        booked_via: string;
        created_at_human: string;
    }>;
    checklist: {
        items: {
            add_doctor: boolean;
            create_schedule: boolean;
            invite_staff: boolean;
            publish_website: boolean;
            take_first_booking: boolean;
        };
        completedCount: number;
        totalCount: number;
        percentage: number;
    };
}

export default function Dashboard({
    tenant,
    userRole,
    stats,
    activeSession,
    queue,
    upcomingSessions,
    recentBookings,
    checklist,
}: DashboardProps) {
    const isNewClinic = checklist.completedCount < 5;

    const checklistTasks = [
        {
            key: 'add_doctor',
            label: 'Add Doctor Profiles & Fees',
            description: 'Register practicing medical officers with SLMC numbers and channeling fees.',
            done: checklist.items.add_doctor,
            href: '/doctors',
            icon: Stethoscope,
        },
        {
            key: 'create_schedule',
            label: 'Schedule Channeling Sessions',
            description: 'Create weekly recurring or one-off channeling dates and token limits.',
            done: checklist.items.create_schedule,
            href: '/calendar',
            icon: Calendar,
        },
        {
            key: 'invite_staff',
            label: 'Invite Receptionist & Staff',
            description: 'Grant role-based access to desk clerks and medical staff.',
            done: checklist.items.invite_staff,
            href: '/staff',
            icon: UserCheck,
        },
        {
            key: 'publish_website',
            label: 'Configure Public Clinic Website',
            description: 'Publish your branded landing page at ' + tenant.subdomain + '.medvisit.lk.',
            done: checklist.items.publish_website,
            href: '/website',
            icon: Globe,
        },
        {
            key: 'take_first_booking',
            label: 'Issue Your First Channeling Token',
            description: 'Book a walk-in patient from reception or accept an online booking.',
            done: checklist.items.take_first_booking,
            href: '/bookings',
            icon: Ticket,
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`${tenant.name} - Overview`} />

            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                            Sri Lankan Channeling
                        </span>
                        <span className="text-xs text-slate-400 font-medium font-mono">
                            {tenant.subdomain}.medvisit.lk
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {tenant.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Live queue monitor, daily channeling sessions, and clinic collections.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/bookings"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 transition-colors shadow-md shadow-primary/20"
                    >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Issue Token</span>
                    </Link>
                    <Link
                        href="/sessions/today"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Live Queue View</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Today's Patients
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        {stats.todayPatientsCount}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Active patient visits today
                    </p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            In Waiting Room
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        {stats.waitingCount}
                    </p>
                    <p className="text-xs text-accent font-semibold mt-1">
                        Tokens waiting for doctor
                    </p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Today's Sessions
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                            <CalendarCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        {stats.activeSessionsCount}
                    </p>
                    <p className="text-xs text-secondary font-semibold mt-1">
                        Doctor clinics scheduled
                    </p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Today's Collections
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        {stats.todayCollections}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                        Doctor: {stats.todayDoctorFees} • Clinic: {stats.todayClinicFees}
                    </p>
                </GlassCard>
            </div>

            {/* Getting Started Checklist for Setup */}
            {isNewClinic && (
                <GlassCard className="p-6 mb-6 border-primary/30 bg-gradient-to-r from-primary-50/50 via-white to-secondary-50/40 dark:from-primary-950/20 dark:via-slate-900 dark:to-secondary-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-white/10">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-accent" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Getting Started with MedVisit
                                </h2>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                Complete these 5 steps to launch channeling operations for your clinic.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm font-extrabold text-primary">
                                    {checklist.completedCount} of {checklist.totalCount} completed
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                    {checklist.percentage}% progress
                                </div>
                            </div>
                            <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                                    style={{ width: `${checklist.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                        {checklistTasks.map((task) => {
                            const Icon = task.icon;
                            return (
                                <Link
                                    key={task.key}
                                    href={task.href}
                                    className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                        task.done
                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40'
                                            : 'bg-white/80 dark:bg-slate-800/60 border-slate-200/70 dark:border-white/10 hover:border-primary/50 hover:shadow-sm'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={`p-1.5 rounded-lg ${task.done ? 'bg-emerald-500/20 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            {task.done ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>
                                        <div className={`text-xs font-bold ${task.done ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                                            {task.label}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                            {task.description}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                                        <span>{task.done ? 'Manage' : 'Set up'}</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </GlassCard>
            )}

            {/* Main Operational View: Left Column (Live Queue Monitor) & Right Column (Upcoming Sessions & Activity) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Live Queue Monitor Card */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/70 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Channeling Queue Monitor
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {activeSession
                                            ? `${activeSession.doctor_name} (${activeSession.specialty}) • ${activeSession.room_number}`
                                            : 'No active session running right now'}
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/sessions/today"
                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                                Full Queue Manager
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {activeSession ? (
                            <div className="mt-5 space-y-5">
                                {/* Token Display Header */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Big Now Serving Tile */}
                                    <div className="sm:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white flex flex-col items-center justify-center text-center shadow-lg shadow-primary/20">
                                        <span className="text-xs uppercase font-bold tracking-wider text-primary-200">
                                            Now Serving
                                        </span>
                                        <div className="text-5xl font-mono font-extrabold my-1">
                                            {queue.nowServing ? String(queue.nowServing.token_number).padStart(2, '0') : '--'}
                                        </div>
                                        <p className="text-xs text-primary-100 font-semibold truncate max-w-[150px]">
                                            {queue.nowServing?.patient_name || 'Waiting for call'}
                                        </p>
                                        <span className="mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                                            {queue.nowServing?.status || 'Idle'}
                                        </span>
                                    </div>

                                    {/* Next in Line (Next 3) */}
                                    <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/10 flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Next In Line
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                Estimated arrival
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            {queue.nextInLine.length === 0 ? (
                                                <div className="col-span-3 py-6 text-center text-slate-400 text-xs">
                                                    No more booked patients in line.
                                                </div>
                                            ) : (
                                                queue.nextInLine.map((nt) => (
                                                    <div
                                                        key={nt.id}
                                                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center"
                                                    >
                                                        <div className="text-2xl font-mono font-extrabold text-primary">
                                                            {String(nt.token_number).padStart(2, '0')}
                                                        </div>
                                                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                                                            {nt.patient_name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                                            ~{nt.estimated_time || 'Soon'}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                                            <span>Session Capacity: {activeSession.booked_tokens_count} / {activeSession.max_tokens} booked</span>
                                            <span className="font-mono text-primary font-bold">{activeSession.time_range}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Today's Tokens List Preview */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Session Token Roster
                                        </h3>
                                        <span className="text-xs text-slate-400">
                                            {queue.tokens.length} total tokens issued
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10">
                                                <tr>
                                                    <th className="px-3.5 py-2.5 font-bold">Token</th>
                                                    <th className="px-3.5 py-2.5 font-bold">Patient Name</th>
                                                    <th className="px-3.5 py-2.5 font-bold">Est. Time</th>
                                                    <th className="px-3.5 py-2.5 font-bold">Source</th>
                                                    <th className="px-3.5 py-2.5 font-bold text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                                                {queue.tokens.slice(0, 5).map((tok) => (
                                                    <tr key={tok.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-3.5 py-2.5 font-mono font-extrabold text-sm text-primary">
                                                            #{String(tok.token_number).padStart(2, '0')}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white">
                                                            {tok.patient_name}
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-slate-500 dark:text-slate-400 font-mono">
                                                            {tok.estimated_time}
                                                        </td>
                                                        <td className="px-3.5 py-2.5">
                                                            <span className="capitalize text-slate-500 dark:text-slate-400">
                                                                {tok.booked_via}
                                                            </span>
                                                        </td>
                                                        <td className="px-3.5 py-2.5 text-right">
                                                            <StatusBadge
                                                                status={tok.status}
                                                            >
                                                                {tok.status.replace('_', ' ')}
                                                            </StatusBadge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-400">
                                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    No Session Scheduled for Today
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                    There are no doctor channeling clinics currently running. Schedule a session to open channeling tokens.
                                </p>
                                <div className="mt-4">
                                    <Link
                                        href="/calendar"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Schedule Doctor Session
                                    </Link>
                                </div>
                            </div>
                        )}
                    </GlassCard>

                    {/* Recent Bookings Stream */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10 mb-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                Recent Channeling Bookings
                            </h2>
                            <Link href="/bookings" className="text-xs font-semibold text-primary hover:underline">
                                View all
                            </Link>
                        </div>

                        {recentBookings.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">
                                No recent bookings recorded yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {recentBookings.map((b) => (
                                    <div key={b.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                                #{String(b.token_number).padStart(2, '0')}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {b.patient_name}
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate">
                                                    {b.doctor_name} • {b.session_date} {b.estimated_time}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[10px] text-slate-400">{b.created_at_human}</span>
                                            <StatusBadge status={b.status}>
                                                {b.status.replace('_', ' ')}
                                            </StatusBadge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Right 1 Col: Upcoming Sessions & Quick Actions */}
                <div className="space-y-6">
                    {/* Upcoming Sessions Card */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10 mb-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                Upcoming Doctor Sessions
                            </h2>
                            <Link href="/calendar" className="text-xs font-semibold text-primary hover:underline">
                                Calendar
                            </Link>
                        </div>

                        {upcomingSessions.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">
                                No upcoming doctor sessions scheduled.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5 hover:border-primary/40 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {session.doctor_name}
                                                </div>
                                                <div className="text-[11px] text-primary font-medium">
                                                    {session.specialty}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                {session.date}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                            <span>{session.start_time} - {session.end_time}</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {session.fee_formatted}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                                            <span>Tokens: {session.booked_tokens_count} / {session.max_tokens}</span>
                                            <span className="text-primary font-semibold hover:underline cursor-pointer">
                                                Book Token &rarr;
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>

                    {/* Quick Clinic Links Card */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                            Quick Operations
                        </h2>
                        <div className="space-y-2">
                            <Link
                                href="/bookings"
                                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-primary" />
                                    <span>Reception Token Desk</span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>

                            <Link
                                href="/patients"
                                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-secondary" />
                                    <span>Search Patient (NIC/Phone)</span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>

                            <Link
                                href="/doctors"
                                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-accent" />
                                    <span>Specialist Fees & SLMC</span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>

                            <Link
                                href="/billing"
                                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-500" />
                                    <span>Collections & Thermal Receipts</span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
