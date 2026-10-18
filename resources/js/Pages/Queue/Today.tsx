import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import {
    Activity,
    PhoneCall,
    CheckCircle2,
    Play,
    RotateCcw,
    FastForward,
    UserX,
    UserCheck,
    Tv,
    Clock,
    Users,
    AlertCircle,
    ChevronRight,
    Stethoscope,
    RefreshCw,
    Calendar,
    Ticket,
} from 'lucide-react';

interface SessionItem {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    start_time: string;
    end_time: string;
    room_number: string;
    status: string;
    current_token_number: number;
    max_tokens: number;
    booked_tokens_count: number;
}

interface ActiveSessionDetails {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    start_time: string;
    end_time: string;
    room_number: string;
    status: string;
    current_token_number: number;
    max_tokens: number;
    fee_formatted: string;
}

interface QueueToken {
    id: number;
    token_number: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_nic: string;
    estimated_time: string;
    status: string;
    booked_via: string;
    payment_status: string;
    checked_in_at: string | null;
    called_at: string | null;
}

interface NowServing {
    id: number;
    token_number: number;
    patient_name: string;
    patient_phone: string;
    status: string;
    estimated_time: string;
    called_at: string;
}

interface QueueStats {
    total: number;
    checked_in: number;
    waiting: number;
    completed: number;
    no_show: number;
}

interface Props {
    todaySessions: SessionItem[];
    activeSession: ActiveSessionDetails | null;
    tokens: QueueToken[];
    nowServingToken: NowServing | null;
    nextInLine: any[];
    stats: QueueStats;
    isDoctor: boolean;
}

export default function TodayQueueIndex({
    todaySessions,
    activeSession,
    tokens,
    nowServingToken,
    nextInLine,
    stats,
    isDoctor,
}: Props) {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Auto-refresh queue every 6 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['todaySessions', 'activeSession', 'tokens', 'nowServingToken', 'nextInLine', 'stats'],
            });
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const switchSession = (sessionId: number) => {
        router.get('/sessions/today', { session_id: sessionId }, { preserveScroll: true });
    };

    const callNext = () => {
        if (!activeSession) return;
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/call-next`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const recall = () => {
        if (!activeSession) return;
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/recall`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const startConsultation = () => {
        if (!activeSession) return;
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/start`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const completeConsultation = () => {
        if (!activeSession) return;
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/complete`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const completeAndNext = () => {
        if (!activeSession) return;
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/complete-and-next`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsActionLoading(false),
            }
        );
    };

    const checkInToken = (token: QueueToken) => {
        router.post(`/sessions/today/${token.id}/check-in`, {}, { preserveScroll: true });
    };

    const markNoShow = (token: QueueToken) => {
        if (confirm(`Mark Token #${token.token_number} (${token.patient_name}) as No-Show?`)) {
            router.post(`/sessions/today/${token.id}/no-show`, {}, { preserveScroll: true });
        }
    };

    const filteredTokens = tokens.filter((t) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'waiting') return t.status === 'booked' || t.status === 'checked_in';
        return t.status === statusFilter;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Today's Channeling Queue" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Queue Manager', href: '/dashboard' },
                        { label: "Today's Queue" },
                    ]}
                    title="Today's Channeling Queue"
                    subtitle="Control patient progression, call tokens to consultation rooms, and synchronize live with waiting-room TV."
                    actions={
                        <a
                            href="/queue/tv"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-colors"
                        >
                            <Tv className="w-4 h-4 text-primary" />
                            <span>Open TV Display ↗</span>
                        </a>
                    }
                />

                {/* Session Tabs (if multiple sessions running today) */}
                {todaySessions.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {todaySessions.map((s) => {
                            const isSelected = activeSession?.id === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => switchSession(s.id)}
                                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                                        isSelected
                                            ? 'bg-primary text-white border-primary shadow-sm'
                                            : 'bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{s.doctor_name}</span>
                                    <span className="opacity-75 text-[11px] ml-1.5">
                                        ({s.room_number} • {s.start_time})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {!activeSession ? (
                    <GlassCard className="py-8">
                        <EmptyState
                            icon={Clock}
                            title="No sessions today"
                            description="There are no doctor channeling sessions scheduled for today. Add a doctor or create a session to open today's queue."
                            action={
                                <Link
                                    href="/calendar"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Create a session</span>
                                </Link>
                            }
                            secondaryAction={
                                <div className="flex items-center gap-2.5">
                                    <Link
                                        href="/doctors"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs"
                                    >
                                        <Stethoscope className="w-3.5 h-3.5 text-primary" />
                                        <span>Add a doctor</span>
                                    </Link>
                                    <Link
                                        href="/calendar"
                                        className="text-xs text-primary font-semibold hover:underline"
                                    >
                                        View calendar →
                                    </Link>
                                </div>
                            }
                            guide={[
                                {
                                    step: 1,
                                    title: 'Add your doctors',
                                    description: 'Register specialist profiles and consultation fees.',
                                },
                                {
                                    step: 2,
                                    title: 'Schedule sessions',
                                    description: 'Set date, room, and token capacity on the calendar.',
                                },
                                {
                                    step: 3,
                                    title: 'Call & serve tokens',
                                    description: 'Control patient progression and sync live with TV.',
                                },
                            ]}
                        />
                    </GlassCard>
                ) : (
                    <div className="space-y-6">
                        {/* HERO: NOW SERVING & ACTION COMMAND CENTER */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* NOW SERVING CARD (6 COLS) */}
                            <GlassCard className="lg:col-span-6 bg-gradient-to-br from-white/90 to-primary-50/30 dark:from-slate-900/90 dark:to-primary-950/20 border-primary/20 relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                                            Now Serving in {activeSession.room_number}
                                        </span>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {activeSession.doctor_name}
                                        </span>
                                    </div>

                                    {nowServingToken ? (
                                        <div className="mt-4 flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-3xl bg-primary text-white font-black text-4xl flex items-center justify-center shadow-lg shadow-primary/30">
                                                #{nowServingToken.token_number}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                                    {nowServingToken.patient_name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {nowServingToken.patient_phone}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                            nowServingToken.status === 'in_consultation'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {nowServingToken.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        Called: {nowServingToken.called_at || 'Just now'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center">
                                            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                                                No patient currently called
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Press "Call Next Patient" below to summon the first patient in line.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center gap-2">
                                    {nowServingToken?.status === 'in_consultation' ? (
                                        <>
                                            <Link
                                                href={`/doctor/consultation/${nowServingToken.id}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
                                            >
                                                <Stethoscope className="w-4 h-4" />
                                                <span>Consultation & Rx</span>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={completeAndNext}
                                                disabled={isActionLoading}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                                                title="Complete consultation and immediately call next in queue"
                                            >
                                                <FastForward className="w-4 h-4" />
                                                <span>Complete & Next</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={completeConsultation}
                                                disabled={isActionLoading}
                                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span>Complete</span>
                                            </button>
                                        </>
                                    ) : nowServingToken?.status === 'called' ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={startConsultation}
                                                disabled={isActionLoading}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                                            >
                                                <Play className="w-4 h-4" />
                                                <span>Start Consultation</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={recall}
                                                disabled={isActionLoading}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60"
                                                title="Repeat audio chime on waiting-room TV"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Recall</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => markNoShow(nowServingToken as any)}
                                                disabled={isActionLoading}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60"
                                            >
                                                <UserX className="w-3.5 h-3.5" />
                                                <span>No-Show</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={callNext}
                                            disabled={isActionLoading || stats.waiting === 0}
                                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all hover:-translate-y-0.5"
                                        >
                                            <PhoneCall className="w-4 h-4" />
                                            <span>Call Next Patient</span>
                                        </button>
                                    )}
                                </div>
                            </GlassCard>

                            {/* NEXT 3 IN LINE & STATS (6 COLS) */}
                            <div className="lg:col-span-6 space-y-4">
                                {/* Stats Ribbon */}
                                <div className="grid grid-cols-4 gap-2.5 text-center">
                                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total</span>
                                        <span className="text-lg font-black text-slate-900 dark:text-white">
                                            {stats.total}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs">
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase block">Present</span>
                                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                            {stats.checked_in}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs">
                                        <span className="text-[10px] font-bold text-primary uppercase block">Waiting</span>
                                        <span className="text-lg font-black text-primary">
                                            {stats.waiting}
                                        </span>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Done</span>
                                        <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                                            {stats.completed}
                                        </span>
                                    </div>
                                </div>

                                {/* Next 3 in Line Preview */}
                                <GlassCard className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Upcoming in Line
                                        </h4>
                                        <span className="text-[11px] text-slate-400">
                                            {nextInLine.length} queued
                                        </span>
                                    </div>

                                    {nextInLine.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-4 text-center italic">
                                            No more patients waiting in queue.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {nextInLine.map((item, idx) => (
                                                <div
                                                    key={item.id}
                                                    className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                                            #{item.token_number}
                                                        </span>
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {item.patient_name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] text-slate-400">
                                                            {item.estimated_time}
                                                        </span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                                item.status === 'checked_in'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {item.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </GlassCard>
                            </div>
                        </div>

                        {/* FULL QUEUE TABLE */}
                        <GlassCard className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" />
                                    <span>All Tokens for this Session ({filteredTokens.length})</span>
                                </h3>

                                {/* Filter pills */}
                                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                                    {['all', 'waiting', 'checked_in', 'completed', 'no_show'].map((filter) => (
                                        <button
                                            key={filter}
                                            type="button"
                                            onClick={() => setStatusFilter(filter)}
                                            className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                                                statusFilter === filter
                                                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                            }`}
                                        >
                                            {filter.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-2.5 px-3">Token #</th>
                                            <th className="py-2.5 px-3">Patient</th>
                                            <th className="py-2.5 px-3">Contact</th>
                                            <th className="py-2.5 px-3">Est. Time</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Billing</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filteredTokens.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12">
                                                    <EmptyState
                                                        icon={Users}
                                                        title="No patients in queue"
                                                        description="There are no patient tokens waiting or booked for this session yet."
                                                        action={
                                                            <Link
                                                                href="/bookings"
                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                                            >
                                                                <Ticket className="w-3.5 h-3.5" />
                                                                <span>Issue token</span>
                                                            </Link>
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTokens.map((t) => (
                                                <tr
                                                    key={t.id}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors ${
                                                        t.token_number === activeSession.current_token_number
                                                            ? 'bg-primary-50/20 dark:bg-primary-950/20 font-semibold'
                                                            : ''
                                                    }`}
                                                >
                                                    <td className="py-2.5 px-3">
                                                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                                                            #{t.token_number}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                                        {t.patient_name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                                        {t.patient_phone}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                                                        {t.estimated_time}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                                t.status === 'completed'
                                                                    ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                                                    : t.status === 'in_consultation'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : t.status === 'called'
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : t.status === 'checked_in'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {t.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                t.payment_status === 'paid'
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'bg-amber-50 text-amber-700'
                                                            }`}
                                                        >
                                                            {t.payment_status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Link
                                                                href={`/doctor/consultation/${t.id}`}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
                                                                title="Open Consultation & Prescription"
                                                            >
                                                                <Stethoscope className="w-3 h-3" />
                                                                <span>Rx</span>
                                                            </Link>
                                                            {t.status === 'booked' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => checkInToken(t)}
                                                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                                                >
                                                                    Check In
                                                                </button>
                                                            )}

                                                            {['booked', 'checked_in'].includes(t.status) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => markNoShow(t)}
                                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                                    title="Mark No-Show"
                                                                >
                                                                    <UserX className="w-3.5 h-3.5" />
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
                        </GlassCard>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
