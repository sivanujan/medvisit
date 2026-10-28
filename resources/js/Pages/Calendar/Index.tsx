import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
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
    Plus,
    X,
    Copy,
    Edit3,
    Ticket,
    ChevronDown,
    Search,
    Stethoscope,
    Phone,
    Info,
    Check,
} from 'lucide-react';

export interface DoctorColor {
    id: number;
    bg: string;
    border: string;
    text: string;
    badge: string;
    hex: string;
    name: string;
}

export interface DoctorItem {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    color: DoctorColor;
}

export interface CalendarSession {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    start_time: string;
    end_time: string;
    start_time_raw: string; // "09:00"
    end_time_raw: string; // "12:00"
    max_tokens: number;
    booked_tokens_count: number;
    available_tokens_count: number;
    raw_status: string;
    status: string;
    effective_status: 'live' | 'overrunning' | 'not_started' | 'scheduled' | 'paused' | 'completed' | 'cancelled';
    status_label: string;
    is_overrunning: boolean;
    is_past_unstarted: boolean;
    room_number: string;
    cancellation_reason: string | null;
    notes: string | null;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_formatted: string;
    color: DoctorColor;
}

export interface RosterToken {
    id: number;
    token_number: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_nic: string;
    estimated_time: string | null;
    status: string;
    payment_status: string;
    doctor_fee?: number;
    clinic_fee?: number;
}

interface Props {
    view: 'day' | 'week' | 'month' | 'agenda';
    selectedDate: string;
    selectedDoctorIds?: number[];
    startDate: string;
    endDate: string;
    days: string[];
    doctors: DoctorItem[];
    sessions: CalendarSession[];
    rooms?: string[];
    serverTimeColombo?: string;
}

export default function CalendarIndex({
    view = 'month',
    selectedDate,
    selectedDoctorIds = [],
    startDate,
    endDate,
    days = [],
    doctors = [],
    sessions = [],
    rooms = ['Suite A', 'Suite B', 'Suite C'],
    serverTimeColombo,
}: Props) {
    const { auth } = usePage().props as any;
    const permissions: string[] = auth?.user?.permissions || [];
    const roles: string[] = auth?.user?.roles || [];
    const isClinicAdmin = roles.includes('clinic_admin') || (!roles.includes('doctor') && !roles.includes('receptionist'));
    const isReceptionist = roles.includes('receptionist');
    const isDoctor = roles.includes('doctor');
    const canManageSessions = isClinicAdmin || isReceptionist || permissions.includes('sessions.manage');
    const canIssueToken = isClinicAdmin || isReceptionist || permissions.includes('tokens.issue');

    // State
    const [activeView, setActiveView] = useState<'day' | 'week' | 'month' | 'agenda'>(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768 && view === 'month') {
            return 'agenda';
        }
        return view;
    });
    const [currentDateStr, setCurrentDateStr] = useState(selectedDate);
    const [selectedDocIds, setSelectedDocIds] = useState<number[]>(selectedDoctorIds);

    // Slide-over side panel
    const [sidePanelSession, setSidePanelSession] = useState<CalendarSession | null>(null);
    const [rosterTokens, setRosterTokens] = useState<RosterToken[]>([]);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [rosterSearch, setRosterSearch] = useState('');

    // Modals
    const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
    const [newSessionPreselectedDate, setNewSessionPreselectedDate] = useState<string>('');

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('Doctor unavailable / emergency');
    const [isCancelling, setIsCancelling] = useState(false);

    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleStartTime, setRescheduleStartTime] = useState('');
    const [rescheduleEndTime, setRescheduleEndTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);

    const [isEditQuotaModalOpen, setIsEditQuotaModalOpen] = useState(false);
    const [editMaxTokens, setEditMaxTokens] = useState(30);
    const [editRoomNumber, setEditRoomNumber] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [isUpdatingQuota, setIsUpdatingQuota] = useState(false);

    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateDate, setDuplicateDate] = useState('');
    const [isDuplicating, setIsDuplicating] = useState(false);

    // Drag-to-reschedule confirmation state
    const [dragConfirmSession, setDragConfirmSession] = useState<CalendarSession | null>(null);
    const [dragTargetDate, setDragTargetDate] = useState<string>('');
    const [dragTargetTime, setDragTargetTime] = useState<string>('');

    // Filter Popover
    const [isDocFilterOpen, setIsDocFilterOpen] = useState(false);
    const docFilterRef = useRef<HTMLDivElement>(null);

    // "+N more" Month Popover state
    const [morePopoverDate, setMorePopoverDate] = useState<string | null>(null);
    const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

    // Colombo today string
    const todayColomboStr = useMemo(() => {
        if (serverTimeColombo) {
            return serverTimeColombo.split('T')[0];
        }
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }, [serverTimeColombo]);

    // Live clock for "now" line (Asia/Colombo)
    const [nowMinutesSinceMidnight, setNowMinutesSinceMidnight] = useState<number>(() => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const d = new Date();
            setNowMinutesSinceMidnight(d.getHours() * 60 + d.getMinutes());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close popovers on click outside
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (docFilterRef.current && !docFilterRef.current.contains(e.target as Node)) {
                setIsDocFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }
            if (e.key === 'ArrowLeft') {
                navigateDate('prev');
            } else if (e.key === 'ArrowRight') {
                navigateDate('next');
            } else if (e.key.toLowerCase() === 't') {
                navigateDate('today');
            } else if (e.key === 'Escape') {
                setSidePanelSession(null);
                setMorePopoverDate(null);
                setIsDocFilterOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentDateStr, activeView, selectedDocIds]);

    // Navigation
    const goTo = (newView: 'day' | 'week' | 'month' | 'agenda', newDate: string, docIds: number[]) => {
        setActiveView(newView);
        setCurrentDateStr(newDate);
        setSelectedDocIds(docIds);

        router.get(
            '/calendar',
            {
                view: newView,
                date: newDate,
                doctor_ids: docIds.length > 0 ? docIds.join(',') : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const navigateDate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            goTo(activeView, todayColomboStr, selectedDocIds);
            return;
        }

        // Parse date safely
        const parts = currentDateStr.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);

        const delta = direction === 'next' ? 1 : -1;
        if (activeView === 'day') {
            d.setDate(d.getDate() + delta);
        } else if (activeView === 'week') {
            d.setDate(d.getDate() + delta * 7);
        } else if (activeView === 'agenda') {
            d.setDate(d.getDate() + delta * 7);
        } else {
            d.setMonth(d.getMonth() + delta);
        }

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const newDateStr = `${year}-${month}-${day}`;

        goTo(activeView, newDateStr, selectedDocIds);
    };

    const toggleDoctorFilter = (docId: number) => {
        const next = selectedDocIds.includes(docId)
            ? selectedDocIds.filter((id) => id !== docId)
            : [...selectedDocIds, docId];
        goTo(activeView, currentDateStr, next);
    };

    const selectAllDoctors = () => {
        goTo(activeView, currentDateStr, []);
    };

    // Open side panel & fetch roster
    const openSessionSidePanel = async (session: CalendarSession) => {
        setSidePanelSession(session);
        setRosterLoading(true);
        setRosterTokens([]);
        setRosterSearch('');

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

    // Open "New Session" modal
    const openNewSessionModal = (dateStr?: string) => {
        setNewSessionPreselectedDate(dateStr || currentDateStr);
        setIsNewSessionModalOpen(true);
    };

    // Action: Reschedule
    const openRescheduleModal = (session: CalendarSession) => {
        setSidePanelSession(session);
        setRescheduleDate(session.session_date);
        setRescheduleStartTime(session.start_time_raw);
        setRescheduleEndTime(session.end_time_raw);
        setIsRescheduleModalOpen(true);
    };

    const handleRescheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sidePanelSession) return;
        setIsRescheduling(true);
        router.post(
            `/calendar/sessions/${sidePanelSession.id}/reschedule`,
            {
                session_date: rescheduleDate,
                start_time: rescheduleStartTime,
                end_time: rescheduleEndTime,
            },
            {
                onSuccess: () => {
                    setIsRescheduleModalOpen(false);
                    setSidePanelSession(null);
                },
                onFinish: () => setIsRescheduling(false),
            }
        );
    };

    // Action: Edit Quota / Details
    const openEditQuotaModal = (session: CalendarSession) => {
        setSidePanelSession(session);
        setEditMaxTokens(session.max_tokens);
        setEditRoomNumber(session.room_number);
        setEditNotes(session.notes || '');
        setIsEditQuotaModalOpen(true);
    };

    const handleEditQuotaSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sidePanelSession) return;
        setIsUpdatingQuota(true);
        router.post(
            `/calendar/sessions/${sidePanelSession.id}/update`,
            {
                max_tokens: editMaxTokens,
                room_number: editRoomNumber,
                notes: editNotes,
            },
            {
                onSuccess: () => {
                    setIsEditQuotaModalOpen(false);
                    setSidePanelSession(null);
                },
                onFinish: () => setIsUpdatingQuota(false),
            }
        );
    };

    // Action: Duplicate
    const openDuplicateModal = (session: CalendarSession) => {
        setSidePanelSession(session);
        setDuplicateDate('');
        setIsDuplicateModalOpen(true);
    };

    const handleDuplicateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sidePanelSession) return;
        setIsDuplicating(true);
        router.post(
            `/calendar/sessions/${sidePanelSession.id}/duplicate`,
            {
                target_date: duplicateDate,
            },
            {
                onSuccess: () => {
                    setIsDuplicateModalOpen(false);
                    setSidePanelSession(null);
                },
                onFinish: () => setIsDuplicating(false),
            }
        );
    };

    // Action: Cancel
    const openCancelModal = (session: CalendarSession) => {
        setSidePanelSession(session);
        setCancelReason('Doctor unavailable / emergency');
        setIsCancelModalOpen(true);
    };

    const handleCancelSubmit = () => {
        if (!sidePanelSession) return;
        setIsCancelling(true);
        router.post(
            `/calendar/sessions/${sidePanelSession.id}/cancel`,
            { reason: cancelReason },
            {
                onSuccess: () => {
                    setIsCancelModalOpen(false);
                    setSidePanelSession(null);
                },
                onFinish: () => setIsCancelling(false),
            }
        );
    };

    // Drag-to-reschedule drop handler
    const handleDragRescheduleConfirm = () => {
        if (!dragConfirmSession || !dragTargetDate || !dragTargetTime) return;
        setIsRescheduling(true);

        // calculate new end time keeping same duration
        const [sh, sm] = dragConfirmSession.start_time_raw.split(':').map(Number);
        const [eh, em] = dragConfirmSession.end_time_raw.split(':').map(Number);
        const durationMin = (eh * 60 + em) - (sh * 60 + sm);

        const [tHour, tMin] = dragTargetTime.split(':').map(Number);
        const endMinTotal = tHour * 60 + tMin + durationMin;
        const endHour = Math.min(23, Math.floor(endMinTotal / 60));
        const endMinute = endMinTotal % 60;
        const newEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

        router.post(
            `/calendar/sessions/${dragConfirmSession.id}/reschedule`,
            {
                session_date: dragTargetDate,
                start_time: dragTargetTime,
                end_time: newEndTime,
            },
            {
                onSuccess: () => {
                    setDragConfirmSession(null);
                },
                onFinish: () => setIsRescheduling(false),
            }
        );
    };

    // Header Title Formatter
    const rangeTitle = useMemo(() => {
        const parts = currentDateStr.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);

        if (activeView === 'day') {
            return d.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        }
        if (activeView === 'week' || activeView === 'agenda') {
            const startParts = startDate.split('-').map(Number);
            const endParts = endDate.split('-').map(Number);
            const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
            const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

            if (start.getMonth() === end.getMonth()) {
                return `${start.getDate()} – ${end.getDate()} ${end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
            }
            return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }, [activeView, currentDateStr, startDate, endDate]);

    // Sessions grouped by date string
    const sessionsByDate = useMemo(() => {
        const map: Record<string, CalendarSession[]> = {};
        sessions.forEach((s) => {
            if (!map[s.session_date]) {
                map[s.session_date] = [];
            }
            map[s.session_date].push(s);
        });
        return map;
    }, [sessions]);

    return (
        <AuthenticatedLayout>
            <Head title="Channeling Calendar - MedVisit" />

            <div className="space-y-4 max-w-full pb-10">
                {/* CALENDAR HEADER */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                    {/* Range Title & Quick Legend */}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {rangeTitle}
                            </h1>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-white/10">
                                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                            </span>
                        </div>

                        {/* Status Legend */}
                        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Live</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Overrunning</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Scheduled</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full border border-rose-500 bg-rose-500/20" />
                                <span>Not started</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <span>Completed</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 line-through" />
                                <span>Cancelled</span>
                            </span>
                        </div>
                    </div>

                    {/* Single-Row Controls: Today, ‹ ›, View Switch, Doctor Multi-Filter, + New session */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Navigation: Today, ‹, › */}
                        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => navigateDate('today')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDate('prev')}
                                className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all"
                                title="Previous (←)"
                                aria-label="Previous period"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDate('next')}
                                className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs transition-all"
                                title="Next (→)"
                                aria-label="Next period"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* View Switcher: Month / Week / Day / Agenda */}
                        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-xs font-bold">
                            {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => goTo(v, currentDateStr, selectedDocIds)}
                                    className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                                        activeView === v
                                            ? 'bg-primary text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        {/* Multi-Select Doctor Filter */}
                        <div ref={docFilterRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDocFilterOpen(!isDocFilterOpen)}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all shadow-xs ${
                                    selectedDocIds.length > 0
                                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary border-primary/40'
                                        : 'bg-white/80 dark:bg-slate-800 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span>
                                    {selectedDocIds.length === 0
                                        ? `All doctors (${doctors.length})`
                                        : `${selectedDocIds.length} of ${doctors.length} doctors`}
                                </span>
                                <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>

                            {isDocFilterOpen && (
                                <div className="absolute right-0 mt-2 w-72 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl z-40 space-y-1">
                                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-white/5 text-[11px] font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">Filter Doctors</span>
                                        <button
                                            type="button"
                                            onClick={selectAllDoctors}
                                            className="text-primary hover:underline"
                                        >
                                            Show all
                                        </button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                                        {doctors.map((doc) => {
                                            const isSelected = selectedDocIds.includes(doc.id);
                                            return (
                                                <button
                                                    key={doc.id}
                                                    type="button"
                                                    onClick={() => toggleDoctorFilter(doc.id)}
                                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                                                        isSelected
                                                            ? 'bg-primary/10 text-primary font-bold'
                                                            : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: doc.color.hex }}
                                                        />
                                                        <span className="truncate">{doc.full_title}</span>
                                                    </div>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* "+ New session" Primary Button */}
                        {canManageSessions && (
                            <button
                                type="button"
                                onClick={() => openNewSessionModal()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New session</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* VIEW 1: MONTH VIEW */}
                {activeView === 'month' && (
                    <MonthView
                        days={days}
                        currentDateStr={currentDateStr}
                        todayStr={todayColomboStr}
                        sessionsByDate={sessionsByDate}
                        onSelectSession={openSessionSidePanel}
                        onEmptyDayClick={canManageSessions ? openNewSessionModal : undefined}
                        morePopoverDate={morePopoverDate}
                        setMorePopoverDate={setMorePopoverDate}
                        popoverAnchor={popoverAnchor}
                        setPopoverAnchor={setPopoverAnchor}
                    />
                )}

                {/* VIEW 2: WEEK VIEW (TIME GRID) */}
                {activeView === 'week' && (
                    <WeekView
                        days={days.slice(0, 7)}
                        todayStr={todayColomboStr}
                        sessionsByDate={sessionsByDate}
                        nowMinutes={nowMinutesSinceMidnight}
                        onSelectSession={openSessionSidePanel}
                        canReschedule={canManageSessions}
                        onDragReschedule={(session, newDate, newTime) => {
                            setDragConfirmSession(session);
                            setDragTargetDate(newDate);
                            setDragTargetTime(newTime);
                        }}
                    />
                )}

                {/* VIEW 3: DAY VIEW (ROOM COLUMNS TIME GRID + RICH CARDS LIST) */}
                {activeView === 'day' && (
                    <DayView
                        dateStr={currentDateStr}
                        todayStr={todayColomboStr}
                        rooms={rooms}
                        sessions={sessionsByDate[currentDateStr] || []}
                        nowMinutes={nowMinutesSinceMidnight}
                        onSelectSession={openSessionSidePanel}
                        onQuickIssue={(session) => {
                            router.visit(`/bookings?session_id=${session.id}`);
                        }}
                        onQuickQueue={(session) => {
                            router.visit(`/sessions/today?session_id=${session.id}`);
                        }}
                    />
                )}

                {/* VIEW 4: AGENDA VIEW (MOBILE-OPTIMIZED LIST GROUPED BY DAY) */}
                {activeView === 'agenda' && (
                    <AgendaView
                        days={days}
                        todayStr={todayColomboStr}
                        sessionsByDate={sessionsByDate}
                        onSelectSession={openSessionSidePanel}
                        onNewSession={canManageSessions ? openNewSessionModal : undefined}
                    />
                )}
            </div>

            {/* SLIDE-OVER SESSION SIDE PANEL */}
            {sidePanelSession && (
                <SessionSidePanel
                    session={sidePanelSession}
                    rosterTokens={rosterTokens}
                    loading={rosterLoading}
                    search={rosterSearch}
                    setSearch={setRosterSearch}
                    onClose={() => setSidePanelSession(null)}
                    canManage={canManageSessions}
                    canIssue={canIssueToken}
                    onOpenQueue={() => router.visit(`/sessions/today?session_id=${sidePanelSession.id}`)}
                    onIssueToken={() => router.visit(`/bookings?session_id=${sidePanelSession.id}`)}
                    onEditQuota={() => openEditQuotaModal(sidePanelSession)}
                    onReschedule={() => openRescheduleModal(sidePanelSession)}
                    onCancel={() => openCancelModal(sidePanelSession)}
                    onDuplicate={() => openDuplicateModal(sidePanelSession)}
                />
            )}

            {/* MODAL 1: CREATE ONE-OFF SESSION */}
            {isNewSessionModalOpen && (
                <NewSessionModal
                    isOpen={isNewSessionModalOpen}
                    onClose={() => setIsNewSessionModalOpen(false)}
                    doctors={doctors}
                    rooms={rooms}
                    defaultDate={newSessionPreselectedDate || currentDateStr}
                />
            )}

            {/* MODAL 2: EDIT SESSION QUOTA & ROOM */}
            {isEditQuotaModalOpen && sidePanelSession && (
                <GlassModal
                    isOpen={isEditQuotaModalOpen}
                    onClose={() => setIsEditQuotaModalOpen(false)}
                    title={`Edit Session Quota & Details`}
                    subtitle={`${sidePanelSession.doctor_name} • ${sidePanelSession.session_date}`}
                    maxWidth="max-w-md"
                >
                    <form onSubmit={handleEditQuotaSubmit} className="space-y-4">
                        <div className="p-3 rounded-2xl bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200/50 text-xs">
                            <span className="font-bold text-primary block">Current Bookings:</span>
                            {sidePanelSession.booked_tokens_count} of {sidePanelSession.max_tokens} slots booked.
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Maximum Token Quota *
                            </label>
                            <input
                                type="number"
                                required
                                min={sidePanelSession.booked_tokens_count || 1}
                                max={200}
                                value={editMaxTokens}
                                onChange={(e) => setEditMaxTokens(Number(e.target.value))}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Cannot be lower than already booked patients ({sidePanelSession.booked_tokens_count}).
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Consultation Room
                            </label>
                            <input
                                type="text"
                                value={editRoomNumber}
                                onChange={(e) => setEditRoomNumber(e.target.value)}
                                placeholder="e.g. Suite A / Room 2"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Session Notes (Internal)
                            </label>
                            <textarea
                                rows={2}
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Special instructions for reception or nurse..."
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsEditQuotaModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdatingQuota}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50"
                            >
                                {isUpdatingQuota ? 'Updating...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </GlassModal>
            )}

            {/* MODAL 3: RESCHEDULE MODAL */}
            {isRescheduleModalOpen && sidePanelSession && (
                <GlassModal
                    isOpen={isRescheduleModalOpen}
                    onClose={() => setIsRescheduleModalOpen(false)}
                    title="Reschedule Session"
                    subtitle={`${sidePanelSession.doctor_name} • Currently ${sidePanelSession.session_date}`}
                    maxWidth="max-w-md"
                >
                    <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                Estimated appointment times for all{' '}
                                <strong>{sidePanelSession.booked_tokens_count} booked patient(s)</strong> will be
                                automatically recalculated based on the new start time.
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
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Start Time *
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={rescheduleStartTime}
                                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    End Time *
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={rescheduleEndTime}
                                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
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
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50"
                            >
                                {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                            </button>
                        </div>
                    </form>
                </GlassModal>
            )}

            {/* MODAL 4: CANCEL SESSION CONFIRMATION */}
            {isCancelModalOpen && sidePanelSession && (
                <GlassModal
                    isOpen={isCancelModalOpen}
                    onClose={() => setIsCancelModalOpen(false)}
                    title="Cancel Channeling Session"
                    subtitle={`${sidePanelSession.doctor_name} • ${sidePanelSession.session_date}`}
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                                <strong className="block font-bold mb-0.5">High Impact Action:</strong>
                                This will cancel the session and mark{' '}
                                <strong>{sidePanelSession.booked_tokens_count} booked patient token(s)</strong> as
                                cancelled.
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
                                placeholder="e.g. Doctor medical emergency / leave"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                            >
                                Go Back
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelSubmit}
                                disabled={isCancelling}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-50"
                            >
                                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </GlassModal>
            )}

            {/* MODAL 5: DUPLICATE SESSION */}
            {isDuplicateModalOpen && sidePanelSession && (
                <GlassModal
                    isOpen={isDuplicateModalOpen}
                    onClose={() => setIsDuplicateModalOpen(false)}
                    title="Duplicate Session"
                    subtitle={`Copy ${sidePanelSession.doctor_name}'s session template to another day`}
                    maxWidth="max-w-md"
                >
                    <form onSubmit={handleDuplicateSubmit} className="space-y-4">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
                            <span className="text-slate-400 uppercase text-[10px] font-bold block">Source Session</span>
                            <span className="font-bold text-slate-800 dark:text-white block mt-0.5">
                                {sidePanelSession.doctor_name} • {sidePanelSession.start_time} - {sidePanelSession.end_time}
                            </span>
                            <span className="text-slate-500 block text-[11px]">
                                Room {sidePanelSession.room_number} • Quota {sidePanelSession.max_tokens} tokens
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Target Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={duplicateDate}
                                onChange={(e) => setDuplicateDate(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsDuplicateModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isDuplicating || !duplicateDate}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50"
                            >
                                {isDuplicating ? 'Duplicating...' : 'Duplicate Session'}
                            </button>
                        </div>
                    </form>
                </GlassModal>
            )}

            {/* MODAL 6: DRAG-TO-RESCHEDULE CONFIRMATION */}
            {dragConfirmSession && (
                <GlassModal
                    isOpen={Boolean(dragConfirmSession)}
                    onClose={() => setDragConfirmSession(null)}
                    title="Confirm Drag Reschedule"
                    subtitle="Are you sure you want to move this channeling session?"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                            <p>
                                Moving <strong>{dragConfirmSession.doctor_name}</strong> from{' '}
                                <span className="font-semibold">{dragConfirmSession.session_date} ({dragConfirmSession.start_time})</span> to:
                            </p>
                            <p className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                                {dragTargetDate} at {dragTargetTime}
                            </p>
                            {dragConfirmSession.booked_tokens_count > 0 && (
                                <p className="pt-1 text-[11px] opacity-90">
                                    Token estimated times for {dragConfirmSession.booked_tokens_count} booked patient(s) will be automatically adjusted.
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setDragConfirmSession(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDragRescheduleConfirm}
                                disabled={isRescheduling}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50"
                            >
                                {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                            </button>
                        </div>
                    </div>
                </GlassModal>
            )}
        </AuthenticatedLayout>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: MONTH VIEW
// ----------------------------------------------------------------------
interface MonthViewProps {
    days: string[];
    currentDateStr: string;
    todayStr: string;
    sessionsByDate: Record<string, CalendarSession[]>;
    onSelectSession: (s: CalendarSession) => void;
    onEmptyDayClick?: (dateStr: string) => void;
    morePopoverDate: string | null;
    setMorePopoverDate: (dateStr: string | null) => void;
    popoverAnchor: { x: number; y: number } | null;
    setPopoverAnchor: (pos: { x: number; y: number } | null) => void;
}

function MonthView({
    days,
    currentDateStr,
    todayStr,
    sessionsByDate,
    onSelectSession,
    onEmptyDayClick,
    morePopoverDate,
    setMorePopoverDate,
    popoverAnchor,
    setPopoverAnchor,
}: MonthViewProps) {
    const currentMonthIndex = new Date(currentDateStr).getMonth();

    return (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-center py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-white/5">
                {days.map((dateStr) => {
                    const parts = dateStr.split('-').map(Number);
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    const isToday = dateStr === todayStr;
                    const isCurrentMonth = d.getMonth() === currentMonthIndex;
                    const dayNum = d.getDate();
                    const daySessions = sessionsByDate[dateStr] || [];
                    const visibleSessions = daySessions.slice(0, 3);
                    const overflowCount = daySessions.length - 3;
                    const isFuture = dateStr >= todayStr;

                    return (
                        <div
                            key={dateStr}
                            onClick={(e) => {
                                // Only trigger empty day click if user clicked background
                                if (e.target === e.currentTarget && isFuture && onEmptyDayClick) {
                                    onEmptyDayClick(dateStr);
                                }
                            }}
                            className={`min-h-[130px] sm:min-h-[145px] p-2 flex flex-col justify-between transition-colors relative group ${
                                isCurrentMonth ? 'bg-transparent' : 'bg-slate-50/50 dark:bg-white/[0.02] opacity-50'
                            } ${isToday ? 'bg-primary-50/25 dark:bg-primary-950/25' : ''}`}
                        >
                            {/* Top row: day number + quick add button on hover */}
                            <div className="flex items-center justify-between mb-1.5">
                                <span
                                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                                        isToday
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {dayNum}
                                </span>

                                {isFuture && onEmptyDayClick && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEmptyDayClick(dateStr);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-opacity"
                                        title={`New session on ${dateStr}`}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Session Chips (up to 3) */}
                            <div className="space-y-1.5 flex-1 overflow-hidden">
                                {visibleSessions.map((s) => (
                                    <SessionMonthChip
                                        key={s.id}
                                        session={s}
                                        onClick={() => onSelectSession(s)}
                                    />
                                ))}

                                {/* +N more popover button */}
                                {overflowCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setPopoverAnchor({ x: rect.left, y: rect.bottom + 4 });
                                            setMorePopoverDate(dateStr);
                                        }}
                                        className="w-full text-center py-0.5 rounded-lg text-[10px] font-bold text-primary dark:text-primary-400 bg-primary-50/70 dark:bg-primary-950/40 hover:bg-primary-100 transition-colors"
                                    >
                                        +{overflowCount} more
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* "+N More" Floating Popover */}
            {morePopoverDate && popoverAnchor && (
                <div
                    className="fixed z-50 w-72 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                        top: Math.min(window.innerHeight - 320, popoverAnchor.y),
                        left: Math.min(window.innerWidth - 300, popoverAnchor.x),
                    }}
                >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Sessions on {morePopoverDate}
                        </span>
                        <button
                            type="button"
                            onClick={() => setMorePopoverDate(null)}
                            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                        {(sessionsByDate[morePopoverDate] || []).map((s) => (
                            <SessionMonthChip
                                key={s.id}
                                session={s}
                                onClick={() => {
                                    setMorePopoverDate(null);
                                    onSelectSession(s);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Month Session Chip with Tooltip
function SessionMonthChip({
    session,
    onClick,
}: {
    session: CalendarSession;
    onClick: () => void;
}) {
    const isCancelled = session.effective_status === 'cancelled';
    const isOverrunning = session.effective_status === 'overrunning';
    const isNotStarted = session.effective_status === 'not_started';
    const isLive = session.effective_status === 'live';

    // Capacity percentage
    const capPct = Math.min(100, Math.round((session.booked_tokens_count / Math.max(1, session.max_tokens)) * 100));

    // Tooltip content
    const tooltipText = `${session.doctor_name} (${session.doctor_specialty})\nTime: ${session.start_time} - ${session.end_time}\nRoom: ${session.room_number}\nFee: ${session.total_fee_formatted}\nStatus: ${session.status_label}\nBookings: ${session.booked_tokens_count}/${session.max_tokens}`;

    return (
        <button
            type="button"
            onClick={onClick}
            title={tooltipText}
            className={`w-full text-left p-1.5 rounded-xl border text-[11px] font-medium transition-all hover:scale-[1.01] hover:shadow-xs relative overflow-hidden group ${
                isCancelled
                    ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300/60 dark:border-rose-900/60 text-slate-600 dark:text-slate-400'
                    : isNotStarted
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-400 text-rose-700 dark:text-rose-300'
                    : `${session.color.bg} ${session.color.border} ${session.color.text}`
            }`}
        >
            {/* Left Doctor Color Indicator Bar */}
            <span
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: session.color.hex }}
            />

            <div className="pl-1">
                <div className="flex items-center justify-between gap-1 leading-tight">
                    <span
                        className={`font-bold truncate text-[11px] ${
                            isCancelled ? 'line-through opacity-80 text-slate-500' : ''
                        }`}
                    >
                        {session.doctor_name}
                    </span>
                    {isLive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    )}
                    {isOverrunning && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">
                            Overrun
                        </span>
                    )}
                    {isCancelled && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white shrink-0">
                            Cancelled
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between gap-1 text-[10px] opacity-80 mt-0.5">
                    <span className="truncate">{session.start_time}</span>
                    <span className="shrink-0 font-bold">
                        {session.booked_tokens_count}/{session.max_tokens}
                    </span>
                </div>

                {/* Capacity Mini Progress Bar */}
                <div className="w-full h-1 rounded-full bg-black/10 dark:bg-white/10 mt-1 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${capPct}%`,
                            backgroundColor: session.color.hex,
                        }}
                    />
                </div>
            </div>
        </button>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: WEEK VIEW (TIME GRID 06:00 - 23:00)
// ----------------------------------------------------------------------
interface WeekViewProps {
    days: string[];
    todayStr: string;
    sessionsByDate: Record<string, CalendarSession[]>;
    nowMinutes: number;
    onSelectSession: (s: CalendarSession) => void;
    canReschedule: boolean;
    onDragReschedule: (s: CalendarSession, newDate: string, newTime: string) => void;
}

function WeekView({
    days,
    todayStr,
    sessionsByDate,
    nowMinutes,
    onSelectSession,
    canReschedule,
    onDragReschedule,
}: WeekViewProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to 7:00 AM on initial mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            // 7 AM is 60 minutes after 6 AM. 60 min * 1.5px/min = 90px
            scrollContainerRef.current.scrollTop = 90;
        }
    }, []);

    // Hours list: 6 AM (06:00) to 11 PM (23:00)
    const hours = useMemo(() => {
        const arr = [];
        for (let h = 6; h <= 23; h++) {
            arr.push(h);
        }
        return arr;
    }, []);

    // 1 hour = 60px height. 1 min = 1px
    const HOUR_HEIGHT = 60;
    const START_HOUR = 6;

    // Helper: calculate top and height in px
    const getSessionGeometry = (s: CalendarSession) => {
        const [sh, sm] = s.start_time_raw.split(':').map(Number);
        const [eh, em] = s.end_time_raw.split(':').map(Number);

        const startMin = (sh - START_HOUR) * 60 + sm;
        const endMin = (eh - START_HOUR) * 60 + em;
        const durationMin = Math.max(30, endMin - startMin);

        const top = (startMin / 60) * HOUR_HEIGHT;
        const height = (durationMin / 60) * HOUR_HEIGHT;

        return { top, height };
    };

    // Calculate "now" line top position
    const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

    return (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
            {/* Week days column headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-center py-2.5 shrink-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center">
                    Time
                </div>
                {days.map((dateStr) => {
                    const parts = dateStr.split('-').map(Number);
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    const isToday = dateStr === todayStr;

                    return (
                        <div key={dateStr} className="px-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                            </span>
                            <span
                                className={`text-sm font-extrabold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                                    isToday
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-slate-800 dark:text-slate-200'
                                }`}
                            >
                                {d.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable time grid */}
            <div
                ref={scrollContainerRef}
                className="overflow-y-auto overflow-x-auto max-h-[640px] relative divide-x divide-slate-100 dark:divide-white/5"
            >
                <div
                    className="grid grid-cols-[60px_repeat(7,minmax(130px,1fr))] relative"
                    style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
                >
                    {/* Time Label Column */}
                    <div className="relative border-r border-slate-200/60 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02]">
                        {hours.map((h, i) => (
                            <div
                                key={h}
                                className="absolute w-full pr-2 text-right text-[10px] font-semibold text-slate-400 -translate-y-2"
                                style={{ top: `${i * HOUR_HEIGHT}px` }}
                            >
                                {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                            </div>
                        ))}
                    </div>

                    {/* 7 Day Columns */}
                    {days.map((dateStr) => {
                        const isToday = dateStr === todayStr;
                        const daySessions = sessionsByDate[dateStr] || [];

                        return (
                            <div
                                key={dateStr}
                                onDragOver={(e) => {
                                    if (canReschedule) e.preventDefault();
                                }}
                                onDrop={(e) => {
                                    if (!canReschedule) return;
                                    e.preventDefault();
                                    const rawSession = e.dataTransfer.getData('application/json');
                                    if (!rawSession) return;
                                    const session: CalendarSession = JSON.parse(rawSession);

                                    // calculate drop hour from rect
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const offsetY = e.clientY - rect.top;
                                    const totalMin = (offsetY / HOUR_HEIGHT) * 60 + START_HOUR * 60;
                                    const dropHour = Math.min(22, Math.max(6, Math.floor(totalMin / 60)));
                                    const dropMinute = Math.floor((totalMin % 60) / 30) * 30; // snap to 30 min
                                    const timeStr = `${String(dropHour).padStart(2, '0')}:${String(dropMinute).padStart(2, '0')}`;

                                    onDragReschedule(session, dateStr, timeStr);
                                }}
                                className={`relative border-r border-slate-100 dark:border-white/5 ${
                                    isToday ? 'bg-primary-50/15 dark:bg-primary-950/15' : ''
                                }`}
                            >
                                {/* Horizontal Hour Grid Lines */}
                                {hours.map((h, i) => (
                                    <div
                                        key={h}
                                        className="absolute left-0 right-0 border-t border-slate-100 dark:border-white/5"
                                        style={{ top: `${i * HOUR_HEIGHT}px` }}
                                    />
                                ))}

                                {/* Red "Now" Line (if today) */}
                                {isToday && nowTop >= 0 && nowTop <= hours.length * HOUR_HEIGHT && (
                                    <div
                                        className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                        style={{ top: `${nowTop}px` }}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm -ml-1" />
                                        <div className="flex-1 h-0.5 bg-rose-500 shadow-sm" />
                                    </div>
                                )}

                                {/* Session Blocks */}
                                {daySessions.map((s) => {
                                    const { top, height } = getSessionGeometry(s);
                                    const isCancelled = s.effective_status === 'cancelled';
                                    const isOverrunning = s.effective_status === 'overrunning';
                                    const isLive = s.effective_status === 'live';
                                    const capPct = Math.min(100, Math.round((s.booked_tokens_count / Math.max(1, s.max_tokens)) * 100));

                                    return (
                                        <div
                                            key={s.id}
                                            draggable={canReschedule && !isCancelled}
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('application/json', JSON.stringify(s));
                                            }}
                                            onClick={() => onSelectSession(s)}
                                            style={{
                                                top: `${top}px`,
                                                height: `${height}px`,
                                            }}
                                            className={`absolute left-1 right-1 rounded-xl p-2 border text-xs shadow-xs transition-all hover:z-30 hover:shadow-md cursor-pointer overflow-hidden flex flex-col justify-between ${
                                                isCancelled
                                                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 text-slate-600 dark:text-slate-400'
                                                    : `${s.color.bg} ${s.color.border} ${s.color.text}`
                                            } ${canReschedule && !isCancelled ? 'active:cursor-grabbing' : ''}`}
                                        >
                                            {/* Doctor & Status */}
                                            <div>
                                                <div className="flex items-center justify-between gap-1 leading-tight">
                                                    <span className={`font-extrabold truncate text-[11px] ${isCancelled ? 'line-through' : ''}`}>
                                                        {s.doctor_name}
                                                    </span>
                                                    {isLive && (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                                    )}
                                                    {isOverrunning && (
                                                        <span className="px-1 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">
                                                            Overrun
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] opacity-80 block truncate">
                                                    {s.start_time} – {s.end_time} • {s.room_number}
                                                </span>
                                            </div>

                                            {/* Quota Bar */}
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-0.5">
                                                    <span>{s.status_label}</span>
                                                    <span>{s.booked_tokens_count}/{s.max_tokens}</span>
                                                </div>
                                                <div className="w-full h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${capPct}%`,
                                                            backgroundColor: s.color.hex,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: DAY VIEW (ROOM COLUMNS + RICH CARDS)
// ----------------------------------------------------------------------
interface DayViewProps {
    dateStr: string;
    todayStr: string;
    rooms: string[];
    sessions: CalendarSession[];
    nowMinutes: number;
    onSelectSession: (s: CalendarSession) => void;
    onQuickIssue: (s: CalendarSession) => void;
    onQuickQueue: (s: CalendarSession) => void;
}

function DayView({
    dateStr,
    todayStr,
    rooms,
    sessions,
    nowMinutes,
    onSelectSession,
    onQuickIssue,
    onQuickQueue,
}: DayViewProps) {
    const isToday = dateStr === todayStr;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Group sessions by room
    const sessionsByRoom = useMemo(() => {
        const map: Record<string, CalendarSession[]> = {};
        rooms.forEach((r) => {
            map[r] = [];
        });
        sessions.forEach((s) => {
            const rm = s.room_number || rooms[0] || 'Suite A';
            if (!map[rm]) map[rm] = [];
            map[rm].push(s);
        });
        return map;
    }, [rooms, sessions]);

    const HOUR_HEIGHT = 60;
    const START_HOUR = 6;
    const hours = useMemo(() => {
        const arr = [];
        for (let h = 6; h <= 23; h++) arr.push(h);
        return arr;
    }, []);

    const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

    return (
        <div className="space-y-6">
            {/* Top Room-Based Time Grid */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Room Allocation Grid ({dateStr})
                    </span>
                    <span className="text-[11px] text-slate-400">
                        {sessions.length} scheduled session(s) across {rooms.length} rooms
                    </span>
                </div>

                {/* Rooms Grid Header */}
                <div
                    className="grid border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-center py-2 shrink-0 font-bold text-xs"
                    style={{ gridTemplateColumns: `60px repeat(${rooms.length}, minmax(140px, 1fr))` }}
                >
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time</div>
                    {rooms.map((rm) => (
                        <div key={rm} className="text-slate-700 dark:text-slate-300">
                            {rm}
                        </div>
                    ))}
                </div>

                {/* Scrollable Room Time Grid */}
                <div
                    ref={scrollRef}
                    className="overflow-y-auto overflow-x-auto max-h-[380px] relative divide-x divide-slate-100 dark:divide-white/5"
                >
                    <div
                        className="grid relative"
                        style={{
                            gridTemplateColumns: `60px repeat(${rooms.length}, minmax(140px, 1fr))`,
                            height: `${hours.length * HOUR_HEIGHT}px`,
                        }}
                    >
                        {/* Time labels */}
                        <div className="relative border-r border-slate-200/60 dark:border-white/10 bg-slate-50/30">
                            {hours.map((h, i) => (
                                <div
                                    key={h}
                                    className="absolute w-full pr-2 text-right text-[10px] font-semibold text-slate-400 -translate-y-2"
                                    style={{ top: `${i * HOUR_HEIGHT}px` }}
                                >
                                    {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                                </div>
                            ))}
                        </div>

                        {/* Room Columns */}
                        {rooms.map((rm) => {
                            const roomSessions = sessionsByRoom[rm] || [];

                            return (
                                <div key={rm} className="relative border-r border-slate-100 dark:border-white/5">
                                    {/* Hour Lines */}
                                    {hours.map((h, i) => (
                                        <div
                                            key={h}
                                            className="absolute left-0 right-0 border-t border-slate-100 dark:border-white/5"
                                            style={{ top: `${i * HOUR_HEIGHT}px` }}
                                        />
                                    ))}

                                    {/* Red now line */}
                                    {isToday && nowTop >= 0 && nowTop <= hours.length * HOUR_HEIGHT && (
                                        <div
                                            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                            style={{ top: `${nowTop}px` }}
                                        >
                                            <div className="flex-1 h-0.5 bg-rose-500 shadow-sm" />
                                        </div>
                                    )}

                                    {/* Session Blocks in this room */}
                                    {roomSessions.map((s) => {
                                        const [sh, sm] = s.start_time_raw.split(':').map(Number);
                                        const [eh, em] = s.end_time_raw.split(':').map(Number);
                                        const startMin = (sh - START_HOUR) * 60 + sm;
                                        const endMin = (eh - START_HOUR) * 60 + em;
                                        const durationMin = Math.max(30, endMin - startMin);

                                        const top = (startMin / 60) * HOUR_HEIGHT;
                                        const height = (durationMin / 60) * HOUR_HEIGHT;

                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => onSelectSession(s)}
                                                style={{ top: `${top}px`, height: `${height}px` }}
                                                className={`absolute left-1.5 right-1.5 rounded-xl p-2 border text-xs shadow-xs cursor-pointer hover:shadow-md transition-all z-10 flex flex-col justify-between ${s.color.bg} ${s.color.border} ${s.color.text}`}
                                            >
                                                <div className="leading-tight">
                                                    <span className="font-extrabold block truncate">
                                                        {s.doctor_name}
                                                    </span>
                                                    <span className="text-[10px] opacity-80 block truncate">
                                                        {s.start_time} - {s.end_time}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] font-bold opacity-80 flex items-center justify-between">
                                                    <span>{s.status_label}</span>
                                                    <span>{s.booked_tokens_count}/{s.max_tokens}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Below: Rich Session Cards List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Today's Channeling Sessions ({sessions.length})
                    </h3>
                </div>

                {sessions.length === 0 ? (
                    <GlassCard className="py-12 text-center text-slate-400">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">No sessions scheduled for this day</p>
                        <p className="text-xs text-slate-400 mt-1">Select another date or click "+ New session" above to create one.</p>
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessions.map((s) => {
                            const capPct = Math.min(100, Math.round((s.booked_tokens_count / Math.max(1, s.max_tokens)) * 100));
                            const isLive = s.effective_status === 'live';
                            const isOverrunning = s.effective_status === 'overrunning';
                            const isNotStarted = s.effective_status === 'not_started';
                            const isCancelled = s.effective_status === 'cancelled';

                            return (
                                <GlassCard
                                    key={s.id}
                                    hover
                                    className={`border-l-4 ${s.color.border} flex flex-col justify-between`}
                                >
                                    <div className="space-y-3">
                                        {/* Doctor + Status Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                                                    style={{ backgroundColor: s.color.hex, color: '#ffffff' }}
                                                >
                                                    {s.doctor_name.replace('Dr. ', '').charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {s.doctor_name}
                                                    </h4>
                                                    <p className="text-xs text-primary font-semibold truncate">
                                                        {s.doctor_specialty}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Human Status Badge */}
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 inline-flex items-center gap-1.5 ${
                                                    isLive
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                                                        : isOverrunning
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300'
                                                        : isNotStarted
                                                        ? 'bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-400'
                                                        : isCancelled
                                                        ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 line-through'
                                                        : s.status === 'completed'
                                                        ? 'bg-slate-100 dark:bg-white/10 text-slate-600'
                                                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 border border-blue-200'
                                                }`}
                                            >
                                                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                                {s.status_label}
                                            </span>
                                        </div>

                                        {/* Time & Room & Fees */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Time & Room</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                                    {s.start_time} – {s.end_time}
                                                </span>
                                                <span className="text-[11px] text-slate-500">{s.room_number}</span>
                                            </div>

                                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Fee</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                                    {s.total_fee_formatted}
                                                </span>
                                                <span className="text-[11px] text-slate-500">Doc + Clinic</span>
                                            </div>
                                        </div>

                                        {/* Capacity Progress Bar */}
                                        <div>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-500">Booked tokens</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    {s.booked_tokens_count} / {s.max_tokens}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${capPct}%`, backgroundColor: s.color.hex }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Actions */}
                                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            {isToday && !isCancelled && (
                                                <button
                                                    type="button"
                                                    onClick={() => onQuickQueue(s)}
                                                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                                    title="Open live queue"
                                                >
                                                    Queue
                                                </button>
                                            )}
                                            {!isCancelled && (
                                                <button
                                                    type="button"
                                                    onClick={() => onQuickIssue(s)}
                                                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors"
                                                    title="Issue token"
                                                >
                                                    Issue
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onSelectSession(s)}
                                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm transition-all"
                                        >
                                            Inspect roster
                                        </button>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: AGENDA VIEW (MOBILE / COMPACT LIST)
// ----------------------------------------------------------------------
interface AgendaViewProps {
    days: string[];
    todayStr: string;
    sessionsByDate: Record<string, CalendarSession[]>;
    onSelectSession: (s: CalendarSession) => void;
    onNewSession?: (dateStr: string) => void;
}

function AgendaView({
    days,
    todayStr,
    sessionsByDate,
    onSelectSession,
    onNewSession,
}: AgendaViewProps) {
    // Only show days that have sessions, plus today
    const relevantDays = useMemo(() => {
        return days.filter((d) => (sessionsByDate[d] || []).length > 0 || d === todayStr);
    }, [days, sessionsByDate, todayStr]);

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            {relevantDays.length === 0 ? (
                <GlassCard className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No channeling sessions found</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing your doctor filter or selecting another date.</p>
                </GlassCard>
            ) : (
                relevantDays.map((dateStr) => {
                    const parts = dateStr.split('-').map(Number);
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    const isToday = dateStr === todayStr;
                    const daySessions = sessionsByDate[dateStr] || [];

                    return (
                        <div key={dateStr} className="space-y-2">
                            {/* Day Header */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                                            isToday ? 'bg-primary text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        {d.getDate()}
                                    </span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {d.toLocaleDateString('en-GB', { weekday: 'long', month: 'short' })}
                                        {isToday && <span className="ml-2 text-xs text-primary font-bold">(Today)</span>}
                                    </span>
                                </div>

                                {onNewSession && (
                                    <button
                                        type="button"
                                        onClick={() => onNewSession(dateStr)}
                                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Add session</span>
                                    </button>
                                )}
                            </div>

                            {/* Sessions List */}
                            {daySessions.length === 0 ? (
                                <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                                    No sessions scheduled for this day
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {daySessions.map((s) => (
                                        <div
                                            key={s.id}
                                            onClick={() => onSelectSession(s)}
                                            className={`p-3 rounded-2xl border cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-3 ${s.color.bg} ${s.color.border}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span
                                                    className="w-1.5 h-10 rounded-full shrink-0"
                                                    style={{ backgroundColor: s.color.hex }}
                                                />
                                                <div className="min-w-0">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">
                                                        {s.doctor_name}
                                                    </span>
                                                    <span className="text-xs text-slate-500 block truncate">
                                                        {s.start_time} - {s.end_time} • {s.room_number} • {s.doctor_specialty}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                                    {s.booked_tokens_count}/{s.max_tokens}
                                                </span>
                                                <span className="text-[10px] font-semibold opacity-75 capitalize block">
                                                    {s.status_label}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: SLIDE-OVER SESSION SIDE PANEL
// ----------------------------------------------------------------------
interface SessionSidePanelProps {
    session: CalendarSession;
    rosterTokens: RosterToken[];
    loading: boolean;
    search: string;
    setSearch: (s: string) => void;
    onClose: () => void;
    canManage: boolean;
    canIssue: boolean;
    onOpenQueue: () => void;
    onIssueToken: () => void;
    onEditQuota: () => void;
    onReschedule: () => void;
    onCancel: () => void;
    onDuplicate: () => void;
}

function SessionSidePanel({
    session,
    rosterTokens,
    loading,
    search,
    setSearch,
    onClose,
    canManage,
    canIssue,
    onOpenQueue,
    onIssueToken,
    onEditQuota,
    onReschedule,
    onCancel,
    onDuplicate,
}: SessionSidePanelProps) {
    const isLive = session.effective_status === 'live';
    const isOverrunning = session.effective_status === 'overrunning';
    const isNotStarted = session.effective_status === 'not_started';
    const isCancelled = session.effective_status === 'cancelled';

    const capPct = Math.min(100, Math.round((session.booked_tokens_count / Math.max(1, session.max_tokens)) * 100));

    // Filter tokens by search query
    const filteredTokens = useMemo(() => {
        if (!search.trim()) return rosterTokens;
        const q = search.toLowerCase();
        return rosterTokens.filter(
            (t) =>
                t.patient_name.toLowerCase().includes(q) ||
                t.patient_phone.includes(q) ||
                String(t.token_number).includes(q)
        );
    }, [rosterTokens, search]);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over Drawer */}
            <div className="absolute inset-y-0 right-0 w-full sm:w-[480px] lg:w-[540px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-3 bg-slate-50/70 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0"
                            style={{ backgroundColor: session.color.hex, color: '#ffffff' }}
                        >
                            {session.doctor_name.replace('Dr. ', '').charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                                {session.doctor_name}
                            </h2>
                            <p className="text-xs font-semibold text-primary truncate">
                                {session.doctor_specialty}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status Chip */}
                        <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 inline-flex items-center gap-1.5 ${
                                isLive
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                                    : isOverrunning
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300'
                                    : isNotStarted
                                    ? 'bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-400'
                                    : isCancelled
                                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 line-through'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 border border-blue-200'
                            }`}
                        >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {session.status_label}
                        </span>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Session Date & Time</span>
                            <span className="font-extrabold text-slate-900 dark:text-white block mt-0.5">
                                {session.session_date}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                                {session.start_time} – {session.end_time}
                            </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Room & Billing</span>
                            <span className="font-extrabold text-slate-900 dark:text-white block mt-0.5">
                                {session.room_number}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                                Total fee: {session.total_fee_formatted}
                            </span>
                        </div>
                    </div>

                    {/* Capacity Meter */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Token Capacity</span>
                            <span className="font-extrabold text-primary">
                                {session.booked_tokens_count} booked / {session.max_tokens} maximum
                            </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${capPct}%`, backgroundColor: session.color.hex }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>{session.available_tokens_count} slots remaining</span>
                            <span>{capPct}% filled</span>
                        </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onOpenQueue}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Open queue</span>
                        </button>

                        {canIssue && !isCancelled && (
                            <button
                                type="button"
                                onClick={onIssueToken}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 hover:bg-emerald-100"
                            >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>Issue token</span>
                            </button>
                        )}

                        {canManage && (
                            <>
                                <button
                                    type="button"
                                    onClick={onEditQuota}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit quota</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={onReschedule}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 hover:bg-amber-100"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reschedule</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={onDuplicate}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Duplicate</span>
                                </button>

                                {!isCancelled && (
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 hover:bg-rose-100 ml-auto"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Cancel</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Booked Patient Roster */}
                    <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white">
                                Booked Patient Roster ({rosterTokens.length})
                            </h3>
                            {/* Search */}
                            <div className="relative w-44">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Search patients..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-slate-400 text-xs">
                                Loading patient roster...
                            </div>
                        ) : filteredTokens.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-200/60 dark:border-white/5">
                                {search ? 'No matching patients found' : 'No patient tokens booked for this session yet.'}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 text-xs">
                                {filteredTokens.map((t) => (
                                    <div
                                        key={t.id}
                                        className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0">
                                                {t.token_number}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="font-bold text-slate-900 dark:text-white block truncate">
                                                    {t.patient_name}
                                                </span>
                                                <span className="text-[11px] text-slate-500 block truncate">
                                                    {t.patient_phone} • Est: {t.estimated_time || '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    t.payment_status === 'paid'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700'
                                                }`}
                                            >
                                                {t.payment_status}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 capitalize">
                                                {t.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: NEW SESSION MODAL
// ----------------------------------------------------------------------
interface NewSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctors: DoctorItem[];
    rooms: string[];
    defaultDate: string;
}

function NewSessionModal({
    isOpen,
    onClose,
    doctors,
    rooms,
    defaultDate,
}: NewSessionModalProps) {
    const [doctorId, setDoctorId] = useState<number>(doctors[0]?.id || 0);
    const [sessionDate, setSessionDate] = useState(defaultDate);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:00');
    const [maxTokens, setMaxTokens] = useState(30);
    const [roomNumber, setRoomNumber] = useState(rooms[0] || 'Suite A');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            '/doctors/sessions/one-off',
            {
                doctor_id: doctorId,
                session_date: sessionDate,
                start_time: startTime,
                end_time: endTime,
                max_tokens: maxTokens,
                room_number: roomNumber,
                notes: notes,
            },
            {
                onSuccess: () => onClose(),
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Channeling Session"
            subtitle="Add a new one-off doctor session to the calendar"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Doctor Select */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Doctor Specialist *
                    </label>
                    <select
                        required
                        value={doctorId}
                        onChange={(e) => setDoctorId(Number(e.target.value))}
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-primary"
                    >
                        {doctors.map((d) => (
                            <option key={d.id} value={d.id} className="dark:bg-slate-900">
                                {d.full_title} ({d.specialty})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Session Date */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Session Date *
                    </label>
                    <input
                        type="date"
                        required
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                    />
                </div>

                {/* Start & End Time */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Start Time *
                        </label>
                        <input
                            type="time"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            End Time *
                        </label>
                        <input
                            type="time"
                            required
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Quota & Room */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Max Patient Tokens *
                        </label>
                        <input
                            type="number"
                            required
                            min={1}
                            max={200}
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(Number(e.target.value))}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 font-bold focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Room / Suite
                        </label>
                        <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            placeholder="e.g. Suite A"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Session Notes (Optional)
                    </label>
                    <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Internal instructions or patient requirements..."
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                    />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Session'}
                    </button>
                </div>
            </form>
        </GlassModal>
    );
}
