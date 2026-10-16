import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Clock,
    Calendar as CalendarIcon,
    MapPin,
    Stethoscope,
    Sparkles,
    CheckCircle2,
    Users,
    AlertCircle,
    ArrowRight,
    Shield,
} from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

interface SessionItem {
    id: number;
    doctor_name: string;
    specialty: string;
    start_time: string;
    end_time: string;
    time_range: string;
    room_number: string;
    max_tokens: number;
    booked_tokens: number;
    available_tokens: number;
    is_full: boolean;
    progress_percentage: number;
    approx_time: string;
    fee_formatted: string;
}

interface DayAvailability {
    has_sessions: boolean;
    is_full: boolean;
    is_past: boolean;
    open_sessions_count: number;
    total_sessions_count: number;
    sessions: SessionItem[];
}

interface DoctorInfo {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    slmc_number?: string;
    slug: string;
    photo_url?: string | null;
    bio?: string | null;
    room?: string;
    fee_formatted?: string;
    avg_consultation_minutes: number;
}

interface Props {
    clinic: {
        name: string;
        subdomain: string;
        phone: string;
        address: string;
        logo_url?: string;
        whatsapp_number?: string;
        opening_hours?: string;
        allow_any_doctor?: boolean;
    };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    theme?: string;
    doctor: DoctorInfo;
    initialYear: number;
    initialMonth: number;
    initialAvailability: Record<string, DayAvailability>;
    firstAvailableDate: string | null;
}

export default function CalendarSessionPicker({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    doctor,
    initialYear,
    initialMonth,
    initialAvailability,
    firstAvailableDate,
}: Props) {
    const [currentYear, setCurrentYear] = useState<number>(initialYear);
    const [currentMonth, setCurrentMonth] = useState<number>(initialMonth); // 1-12
    const [availability, setAvailability] = useState<Record<string, DayAvailability>>(initialAvailability);
    const [selectedDate, setSelectedDate] = useState<string | null>(firstAvailableDate);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(false);

    // Initial check for auto-selecting first session if available
    useEffect(() => {
        if (selectedDate && availability[selectedDate]?.sessions?.length > 0) {
            const firstOpen = availability[selectedDate].sessions.find((s) => !s.is_full);
            if (firstOpen) {
                setSelectedSessionId(firstOpen.id);
            } else {
                setSelectedSessionId(null);
            }
        } else {
            setSelectedSessionId(null);
        }
    }, [selectedDate, availability]);

    // Fetch month availability when month or year changes
    const fetchMonthData = useCallback(async (year: number, month: number) => {
        setIsLoadingMonth(true);
        try {
            const res = await fetch(`/book/api/availability/${doctor.slug}?year=${year}&month=${month}`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setAvailability(data.days);

                // If currently selected date is not in the new month, auto-select first open date
                let newFirstOpen: string | null = null;
                for (const [dateStr, dayData] of Object.entries(data.days as Record<string, DayAvailability>)) {
                    if (dayData.has_sessions && !dayData.is_full) {
                        newFirstOpen = dateStr;
                        break;
                    }
                }
                setSelectedDate(newFirstOpen);
            }
        } catch (err) {
            console.error('Failed to load month availability:', err);
        } finally {
            setIsLoadingMonth(false);
        }
    }, [doctor.slug]);

    const handlePrevMonth = () => {
        const today = new Date();
        const thisYear = today.getFullYear();
        const thisMonth = today.getMonth() + 1;

        if (currentYear === thisYear && currentMonth <= thisMonth) {
            return; // Can't go to past months
        }

        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        fetchMonthData(newYear, newMonth);
    };

    const handleNextMonth = () => {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        }
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        fetchMonthData(newYear, newMonth);
    };

    // Calendar matrix generator
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday

        const days: Array<{
            dayNumber: number;
            dateStr: string;
            isCurrentMonth: boolean;
            data?: DayAvailability;
        }> = [];

        // Preceding blanks from previous month
        const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
            const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            days.push({
                dayNumber: dayNum,
                dateStr,
                isCurrentMonth: false,
            });
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({
                dayNumber: d,
                dateStr,
                isCurrentMonth: true,
                data: availability[dateStr],
            });
        }

        // Trailing blanks to complete 35 or 42 grid cells
        const totalCells = Math.ceil(days.length / 7) * 7;
        let nextD = 1;
        while (days.length < totalCells) {
            const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
            const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
            days.push({
                dayNumber: nextD,
                dateStr,
                isCurrentMonth: false,
            });
            nextD++;
        }

        return days;
    }, [currentYear, currentMonth, availability]);

    const monthName = useMemo(() => {
        return new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
        });
    }, [currentYear, currentMonth]);

    const activeSessions = selectedDate ? availability[selectedDate]?.sessions || [] : [];
    const selectedSession = activeSessions.find((s) => s.id === selectedSessionId);

    const formattedSelectedDate = useMemo(() => {
        if (!selectedDate) return '';
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
    }, [selectedDate]);

    useEffect(() => {
        // Enforce bright, clean healthcare theme on public booking pages
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }, []);

    // Handle proceed to step 3
    const handleProceed = (sessionId: number) => {
        router.visit(`/book/${doctor.slug}/${sessionId}`);
    };

    return (
        <div
            data-public-booking="true"
            className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-teal-100 selection:text-teal-900 relative isolate"
        >
            {/* Subtle Calendly dot mesh texture */}
            <div
                className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"
                aria-hidden="true"
            />

            <Head title={`Select Date & Time - ${doctor.full_title} - ${clinic.name}`} />

            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                {/* Back to doctor selection */}
                <div className="mb-6">
                    <Link
                        href="/book"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 group-hover:text-teal-600 transition-transform" />
                        <span>Change Doctor</span>
                    </Link>
                </div>

                {/* 3-Column Calendly Experience Layout Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        
                        {/* COLUMN 1: Doctor & Clinic Summary Panel (Left) */}
                        <div className="lg:col-span-4 p-6 sm:p-8 bg-gradient-to-b from-slate-50/50 to-white flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    {clinic.logo_url ? (
                                        <img
                                            src={clinic.logo_url}
                                            alt={clinic.name}
                                            className="h-9 w-auto object-contain"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {clinic.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                                            {clinic.name}
                                        </p>
                                        <p className="text-xs text-slate-400">Consultation Channeling</p>
                                    </div>
                                </div>

                                {/* Doctor Avatar & Details */}
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="relative shrink-0">
                                        {doctor.photo_url ? (
                                            <img
                                                src={doctor.photo_url}
                                                alt={doctor.full_title}
                                                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xl shadow-sm ring-2 ring-teal-500/20">
                                                {doctor.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                                            </div>
                                        )}
                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xs" title="Verified Practitioner">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                        </span>
                                    </div>

                                    <div>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 mb-1">
                                            {doctor.specialty}
                                        </span>
                                        <h2 className="text-xl font-bold text-slate-900 leading-snug">
                                            {doctor.full_title}
                                        </h2>
                                        {doctor.slmc_number && (
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">
                                                SLMC Reg: {doctor.slmc_number}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {doctor.bio && (
                                    <p className="text-xs text-slate-500 leading-relaxed mb-6 line-clamp-3">
                                        {doctor.bio}
                                    </p>
                                )}

                                {/* Key Meta Highlights */}
                                <div className="space-y-3.5 pt-4 border-t border-slate-100 text-sm">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>Approx. consultation: <strong>~{doctor.avg_consultation_minutes} mins</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>Room: <strong>{doctor.room || 'Consultation Suite'}</strong></span>
                                    </div>
                                    {doctor.fee_formatted && (
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                                            <span>Fee: <strong>{doctor.fee_formatted}</strong></span>
                                        </div>
                                    )}
                                </div>

                                {/* Active User Selection Summary in Left Bar */}
                                {(selectedDate || selectedSession) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-4 rounded-2xl bg-teal-50/80 border border-teal-200/70"
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-2">
                                            Your Selection
                                        </p>
                                        {selectedDate && (
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
                                                <CalendarIcon className="w-4 h-4 text-teal-600 shrink-0" />
                                                <span>{formattedSelectedDate}</span>
                                            </div>
                                        )}
                                        {selectedSession && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                                                <span>{selectedSession.time_range} ({selectedSession.approx_time})</span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <span>Real-time hospital token queue integration</span>
                            </div>
                        </div>

                        {/* COLUMN 2: Month Calendar Grid (Centre) */}
                        <div className="lg:col-span-5 p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                    {monthName}
                                </h3>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handlePrevMonth}
                                        disabled={isLoadingMonth}
                                        aria-label="Previous month"
                                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextMonth}
                                        disabled={isLoadingMonth}
                                        aria-label="Next month"
                                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Days Header */}
                            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                <div>Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                            </div>

                            {/* Calendar Days Cells */}
                            <div className="grid grid-cols-7 gap-1.5 relative">
                                {isLoadingMonth && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
                                        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {calendarDays.map((cell, idx) => {
                                    if (!cell.isCurrentMonth) {
                                        return (
                                            <div
                                                key={idx}
                                                className="h-12 sm:h-14 flex items-center justify-center text-xs text-slate-300 font-medium select-none"
                                            >
                                                {cell.dayNumber}
                                            </div>
                                        );
                                    }

                                    const dayData = cell.data;
                                    const hasSessions = dayData?.has_sessions ?? false;
                                    const isFull = dayData?.is_full ?? false;
                                    const isPast = dayData?.is_past ?? false;
                                    const isSelected = selectedDate === cell.dateStr;
                                    const isDisabled = !hasSessions || isPast;

                                    const ariaLabel = `${cell.dateStr}${
                                        hasSessions
                                            ? isFull
                                                ? ', All sessions full'
                                                : `, ${dayData?.open_sessions_count} sessions available`
                                            : ', No sessions'
                                    }`;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => {
                                                setSelectedDate(cell.dateStr);
                                            }}
                                            aria-label={ariaLabel}
                                            className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                                isSelected
                                                    ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30 ring-2 ring-teal-600'
                                                    : hasSessions && !isFull
                                                    ? 'bg-teal-50/70 text-teal-900 font-semibold hover:bg-teal-100/80 border border-teal-200/60'
                                                    : hasSessions && isFull
                                                    ? 'bg-slate-100 text-slate-400 cursor-pointer hover:bg-slate-200/70'
                                                    : 'text-slate-400 hover:bg-transparent cursor-not-allowed opacity-40'
                                            }`}
                                        >
                                            <span className="text-sm">{cell.dayNumber}</span>

                                            {/* Status Indicators */}
                                            {hasSessions && !isFull && (
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                                        isSelected ? 'bg-white' : 'bg-teal-600'
                                                    }`}
                                                />
                                            )}
                                            {hasSessions && isFull && (
                                                <span className="text-[9px] font-bold uppercase tracking-tight text-slate-400 mt-0.5">
                                                    Full
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                                    <span>Available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <span>Full / Closed</span>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 3: Sessions on Selected Date (Right) */}
                        <div className="lg:col-span-3 p-6 sm:p-8 bg-slate-50/30 flex flex-col justify-between">
                            <div>
                                <div className="mb-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Channeling Sessions
                                    </p>
                                    <h4 className="text-base font-bold text-slate-900">
                                        {selectedDate ? formattedSelectedDate : 'Select a date'}
                                    </h4>
                                </div>

                                {!selectedDate && (
                                    <div className="py-12 text-center text-slate-400">
                                        <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                        <p className="text-xs">Pick an available date on the calendar to view doctor sessions.</p>
                                    </div>
                                )}

                                {selectedDate && activeSessions.length === 0 && (
                                    <div className="py-12 text-center text-slate-400">
                                        <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                        <p className="text-xs font-medium text-slate-600">No sessions scheduled</p>
                                        <p className="text-xs mt-1">Please select another date with available doctor sessions.</p>
                                    </div>
                                )}

                                {selectedDate && activeSessions.length > 0 && (
                                    <div className="space-y-3">
                                        {activeSessions.map((session) => {
                                            const isSelected = selectedSessionId === session.id;
                                            return (
                                                <div
                                                    key={session.id}
                                                    onClick={() => {
                                                        if (!session.is_full) {
                                                            setSelectedSessionId(session.id);
                                                        }
                                                    }}
                                                    className={`rounded-2xl p-4 transition-all duration-200 border ${
                                                        session.is_full
                                                            ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                                                            : isSelected
                                                            ? 'bg-white border-teal-600 shadow-md ring-2 ring-teal-600/20 cursor-pointer'
                                                            : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {session.time_range}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                            {session.room_number}
                                                        </span>
                                                    </div>

                                                    {/* Progress & token availability */}
                                                    <div className="mb-2">
                                                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                                            <span>
                                                                {session.is_full ? (
                                                                    <strong className="text-rose-600">Full</strong>
                                                                ) : (
                                                                    <>
                                                                        <strong className="text-teal-700">{session.available_tokens}</strong> of {session.max_tokens} tokens left
                                                                    </>
                                                                )}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                Your approx: <strong>{session.approx_time}</strong>
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    session.is_full
                                                                        ? 'bg-rose-500'
                                                                        : session.progress_percentage > 80
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-teal-600'
                                                                }`}
                                                                style={{ width: `${session.progress_percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Calendly Style In-Card "Next" button when active */}
                                                    <AnimatePresence>
                                                        {isSelected && !session.is_full && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="pt-3 mt-2 border-t border-slate-100 overflow-hidden"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleProceed(session.id);
                                                                    }}
                                                                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-teal-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                                                >
                                                                    <span>Next</span>
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Mobile Sticky Next Bar fallback */}
                            <div className="lg:hidden mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    disabled={!selectedSession || selectedSession.is_full}
                                    onClick={() => selectedSession && handleProceed(selectedSession.id)}
                                    className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30"
                                >
                                    <span>Proceed to Patient Details</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <PublicSiteFooter
                clinic={clinic}
                footerConfig={footerConfig}
            />
        </div>
    );
}
