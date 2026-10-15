import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Users,
    MapPin,
    AlertTriangle,
    RotateCcw,
    XCircle,
    CheckCircle2,
    CalendarDays,
    CalendarRange,
    ExternalLink,
    Filter,
} from 'lucide-react';

interface DoctorColor {
    bg: string;
    border: string;
    text: string;
    badge: string;
    hex: string;
}

interface DoctorItem {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    color: DoctorColor;
}

interface CalendarSession {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    start_time: string;
    end_time: string;
    start_time_raw: string;
    end_time_raw: string;
    max_tokens: number;
    booked_tokens_count: number;
    available_tokens_count: number;
    status: string;
    room_number: string;
    cancellation_reason: string | null;
    notes: string | null;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_formatted: string;
    color: DoctorColor;
}

interface RosterToken {
    id: number;
    token_number: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_nic: string;
    estimated_time: string | null;
    status: string;
    payment_status: string;
}

interface Props {
    view: 'day' | 'week' | 'month';
    selectedDate: string;
    selectedDoctorId: number | null;
    startDate: string;
    endDate: string;
    doctors: DoctorItem[];
    sessions: CalendarSession[];
}

export default function CalendarIndex({
    view,
    selectedDate,
    selectedDoctorId,
    startDate,
    endDate,
    doctors,
    sessions,
}: Props) {
    const [activeView, setActiveView] = useState<'day' | 'week' | 'month'>(view);
    const [currentDateStr, setCurrentDateStr] = useState(selectedDate);
    const [doctorIdFilter, setDoctorIdFilter] = useState<string>(selectedDoctorId ? String(selectedDoctorId) : '');

    // Roster Modal state
    const [selectedSession, setSelectedSession] = useState<CalendarSession | null>(null);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [rosterTokens, setRosterTokens] = useState<RosterToken[]>([]);

    // Cancel & Reschedule Modals
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('Doctor unavailable / emergency');
    const [isCancelling, setIsCancelling] = useState(false);

    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleStartTime, setRescheduleStartTime] = useState('');
    const [rescheduleEndTime, setRescheduleEndTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);

    const navigateDate = (direction: 'prev' | 'next' | 'today') => {
        const d = new Date(currentDateStr);
        if (direction === 'today') {
            const todayStr = new Date().toISOString().split('T')[0];
            goTo(activeView, todayStr, doctorIdFilter);
            return;
        }

        const delta = direction === 'next' ? 1 : -1;
        if (activeView === 'day') {
            d.setDate(d.getDate() + delta);
        } else if (activeView === 'week') {
            d.setDate(d.getDate() + delta * 7);
        } else {
            d.setMonth(d.getMonth() + delta);
        }

        const newDateStr = d.toISOString().split('T')[0];
        goTo(activeView, newDateStr, doctorIdFilter);
    };

    const goTo = (newView: 'day' | 'week' | 'month', newDate: string, docId: string) => {
        setActiveView(newView);
        setCurrentDateStr(newDate);
        router.get(
            '/calendar',
            {
                view: newView,
                date: newDate,
                doctor_id: docId || undefined,
            },
            { preserveState: true }
        );
    };

    const handleDoctorFilterChange = (newDocId: string) => {
        setDoctorIdFilter(newDocId);
        goTo(activeView, currentDateStr, newDocId);
    };

    const handleViewChange = (newView: 'day' | 'week' | 'month') => {
        goTo(newView, currentDateStr, doctorIdFilter);
    };

    const openRoster = async (session: CalendarSession) => {
        setSelectedSession(session);
        setRosterLoading(true);
        setRosterTokens([]);

        try {
            const res = await fetch(`/calendar/roster/${session.id}`);
            if (res.ok) {
                const data = await res.json();
                setRosterTokens(data.tokens || []);
            }
        } catch (e) {
            console.error('Failed to load roster', e);
        } finally {
            setRosterLoading(false);
        }
    };

    const handleCancelSession = () => {
        if (!selectedSession) return;
        setIsCancelling(true);
        router.post(
            `/calendar/sessions/${selectedSession.id}/cancel`,
            { reason: cancelReason },
            {
                onSuccess: () => {
                    setIsCancelModalOpen(false);
                    setSelectedSession(null);
                },
                onFinish: () => setIsCancelling(false),
            }
        );
    };

    const openRescheduleModal = () => {
        if (!selectedSession) return;
        setRescheduleDate(selectedSession.session_date);
        setRescheduleStartTime(selectedSession.start_time_raw);
        setRescheduleEndTime(selectedSession.end_time_raw);
        setIsRescheduleModalOpen(true);
    };

    const handleRescheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSession) return;
        setIsRescheduling(true);
        router.post(
            `/calendar/sessions/${selectedSession.id}/reschedule`,
            {
                session_date: rescheduleDate,
                start_time: rescheduleStartTime,
                end_time: rescheduleEndTime,
            },
            {
                onSuccess: () => {
                    setIsRescheduleModalOpen(false);
                    setSelectedSession(null);
                },
                onFinish: () => setIsRescheduling(false),
            }
        );
    };

    // Calculate formatted period title
    const formatPeriodTitle = () => {
        const d = new Date(currentDateStr);
        if (activeView === 'day') {
            return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (activeView === 'week') {
            const start = new Date(startDate);
            const end = new Date(endDate);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Group sessions by date string (YYYY-MM-DD)
    const sessionsByDate: Record<string, CalendarSession[]> = {};
    sessions.forEach((s) => {
        if (!sessionsByDate[s.session_date]) {
            sessionsByDate[s.session_date] = [];
        }
        sessionsByDate[s.session_date].push(s);
    });

    // Generate days for Month View grid
    const generateMonthDays = () => {
        const days = [];
        const curr = new Date(startDate);
        const end = new Date(endDate);

        while (curr <= end) {
            days.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return days;
    };

    const monthDays = activeView === 'month' ? generateMonthDays() : [];
    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <AuthenticatedLayout>
            <Head title="Channeling Calendar" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40">
                                Channeling Schedule
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                            {formatPeriodTitle()}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Click any channeling block to inspect patient roster, reschedule, or manage token quotas.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Doctor Filter */}
                        <div className="relative min-w-[200px]">
                            <select
                                value={doctorIdFilter}
                                onChange={(e) => handleDoctorFilterChange(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 py-2 pl-3 pr-8 focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Doctors ({doctors.length})</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.full_title} ({d.specialty})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* View Switcher */}
                        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-xs">
                            <button
                                type="button"
                                onClick={() => handleViewChange('month')}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                    activeView === 'month'
                                        ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Month
                            </button>
                            <button
                                type="button"
                                onClick={() => handleViewChange('week')}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                    activeView === 'week'
                                        ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Week
                            </button>
                            <button
                                type="button"
                                onClick={() => handleViewChange('day')}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                                    activeView === 'day'
                                        ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Day
                            </button>
                        </div>

                        {/* Date Navigation */}
                        <div className="inline-flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => navigateDate('prev')}
                                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
                                title="Previous"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDate('today')}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDate('next')}
                                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
                                title="Next"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* MONTH VIEW */}
                {activeView === 'month' && (
                    <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm overflow-hidden">
                        {/* Day names header */}
                        <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-center py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <div>Mon</div>
                            <div>Tue</div>
                            <div>Wed</div>
                            <div>Thu</div>
                            <div>Fri</div>
                            <div>Sat</div>
                            <div>Sun</div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-white/5">
                            {monthDays.map((dateStr) => {
                                const d = new Date(dateStr);
                                const isToday = dateStr === todayStr;
                                const dayNum = d.getDate();
                                const isCurrentMonth = d.getMonth() === new Date(currentDateStr).getMonth();
                                const daySessions = sessionsByDate[dateStr] || [];

                                return (
                                    <div
                                        key={dateStr}
                                        className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                                            isCurrentMonth
                                                ? 'bg-transparent'
                                                : 'bg-slate-50/40 dark:bg-white/[0.02] opacity-60'
                                        } ${isToday ? 'bg-primary-50/20 dark:bg-primary-950/20' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                                    isToday
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {dayNum}
                                            </span>

                                            {daySessions.length > 0 && (
                                                <span className="text-[10px] text-slate-400 font-semibold">
                                                    {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Session Chips */}
                                        <div className="space-y-1 overflow-y-auto max-h-[140px] pr-0.5">
                                            {daySessions.map((s) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => openRoster(s)}
                                                    className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-medium transition-all hover:scale-[1.02] shadow-xs ${s.color.bg} ${s.color.border} ${s.color.text} ${
                                                        s.status === 'cancelled' ? 'opacity-50 line-through' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-bold truncate">{s.doctor_name}</span>
                                                        <span className="text-[10px] shrink-0 font-semibold opacity-80">
                                                            {s.booked_tokens_count}/{s.max_tokens}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] opacity-75 truncate">
                                                        {s.start_time} • {s.room_number}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* WEEK VIEW */}
                {activeView === 'week' && (
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                        {monthDays.slice(0, 7).map((dateStr) => {
                            const d = new Date(dateStr);
                            const isToday = dateStr === todayStr;
                            const daySessions = sessionsByDate[dateStr] || [];

                            return (
                                <div
                                    key={dateStr}
                                    className={`rounded-2xl border p-3 flex flex-col gap-2 ${
                                        isToday
                                            ? 'border-primary/50 bg-primary-50/20 dark:bg-primary-950/20'
                                            : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60'
                                    }`}
                                >
                                    <div className="text-center pb-2 border-b border-slate-100 dark:border-white/5">
                                        <p className="text-[11px] font-bold uppercase text-slate-400">
                                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </p>
                                        <p
                                            className={`text-base font-extrabold ${
                                                isToday ? 'text-primary' : 'text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>

                                    <div className="space-y-2 flex-1">
                                        {daySessions.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 text-center py-6 italic">
                                                No sessions
                                            </p>
                                        ) : (
                                            daySessions.map((s) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => openRoster(s)}
                                                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all hover:shadow-md ${s.color.bg} ${s.color.border} ${s.color.text} ${
                                                        s.status === 'cancelled' ? 'opacity-50 line-through' : ''
                                                    }`}
                                                >
                                                    <span className="font-bold block truncate">{s.doctor_name}</span>
                                                    <span className="text-[11px] opacity-80 block truncate">
                                                        {s.doctor_specialty}
                                                    </span>
                                                    <div className="flex items-center justify-between text-[10px] mt-2 pt-1 border-t border-black/10 dark:border-white/10">
                                                        <span>{s.start_time}</span>
                                                        <span className="font-bold">
                                                            {s.booked_tokens_count}/{s.max_tokens}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* DAY VIEW */}
                {activeView === 'day' && (
                    <div className="space-y-3">
                        {(sessionsByDate[currentDateStr] || []).length === 0 ? (
                            <GlassCard className="text-center py-12">
                                <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                    No sessions scheduled for this day
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                                    Switch views or create a one-off session from the Doctors page.
                                </p>
                            </GlassCard>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(sessionsByDate[currentDateStr] || []).map((s) => (
                                    <GlassCard
                                        key={s.id}
                                        hover
                                        className={`border-l-4 ${s.color.border} flex flex-col justify-between`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                                        {s.doctor_name}
                                                    </h3>
                                                    <p className="text-xs text-primary font-semibold">
                                                        {s.doctor_specialty}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        s.status === 'scheduled'
                                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                            : s.status === 'in_progress'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {s.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                                                    <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                                        Time & Room
                                                    </span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {s.start_time} – {s.end_time}
                                                    </span>
                                                    <span className="block text-[11px] text-slate-500">
                                                        {s.room_number}
                                                    </span>
                                                </div>

                                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                                                    <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                                        Booked Capacity
                                                    </span>
                                                    <span className="font-bold text-primary">
                                                        {s.booked_tokens_count} / {s.max_tokens} tokens
                                                    </span>
                                                    <span className="block text-[11px] text-slate-500">
                                                        {s.available_tokens_count} slots left
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {s.total_fee_formatted}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => openRoster(s)}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm transition-all"
                                            >
                                                Inspect Roster
                                            </button>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL 1: SESSION ROSTER MODAL */}
            <GlassModal
                isOpen={Boolean(selectedSession)}
                onClose={() => setSelectedSession(null)}
                title={selectedSession ? `Session Roster: ${selectedSession.doctor_name}` : 'Session Roster'}
                subtitle={
                    selectedSession
                        ? `${selectedSession.session_date} • ${selectedSession.start_time} - ${selectedSession.end_time} • Room ${selectedSession.room_number}`
                        : ''
                }
                maxWidth="max-w-3xl"
            >
                {selectedSession && (
                    <div className="space-y-4">
                        {/* Session Summary Banner */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div>
                                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                    Specialty & Fee
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {selectedSession.doctor_specialty} • {selectedSession.total_fee_formatted}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                    Token Meter
                                </span>
                                <span className="font-bold text-primary">
                                    {selectedSession.booked_tokens_count} Booked / {selectedSession.max_tokens} Maximum
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={openRescheduleModal}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reschedule</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsCancelModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Cancel Session</span>
                                </button>
                            </div>
                        </div>

                        {/* Roster Table */}
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {rosterLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Loading tokens...
                                            </td>
                                        </tr>
                                    ) : rosterTokens.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                                No patients booked for this session yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        rosterTokens.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                <td className="py-2.5 px-3">
                                                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-xs">
                                                        {t.token_number}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                                    {t.patient_name}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                                    {t.patient_phone}
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                    {t.estimated_time || '—'}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                                        {t.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            t.payment_status === 'paid'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {t.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </GlassModal>

            {/* MODAL 2: CANCEL SESSION CONFIRMATION */}
            <GlassModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                title="Cancel Channeling Session"
                subtitle="Are you sure you want to cancel this session?"
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-bold">Important Notice:</strong>
                            All active patient tokens for this session will be marked as cancelled.
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Cancellation *
                        </label>
                        <input
                            type="text"
                            required
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g. Doctor emergency / leave"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsCancelModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelSession}
                            disabled={isCancelling}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-50"
                        >
                            {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* MODAL 3: RESCHEDULE SESSION MODAL */}
            <GlassModal
                isOpen={isRescheduleModalOpen}
                onClose={() => setIsRescheduleModalOpen(false)}
                title="Reschedule Session"
                subtitle="Select new date and times. Existing tokens will be automatically recalculated."
                maxWidth="max-w-md"
            >
                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            Estimated appointment times for all{' '}
                            <strong>{selectedSession?.booked_tokens_count ?? 0} booked patient(s)</strong> will be
                            recalculated automatically based on the doctor's average consultation duration.
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            New Session Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                New Start Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={rescheduleStartTime}
                                onChange={(e) => setRescheduleStartTime(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                New End Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={rescheduleEndTime}
                                onChange={(e) => setRescheduleEndTime(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsRescheduleModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isRescheduling}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                        >
                            {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
