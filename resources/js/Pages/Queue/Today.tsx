import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    Activity,
    PhoneCall,
    CheckCircle2,
    Play,
    RotateCcw,
    UserX,
    UserCheck,
    Tv,
    Clock,
    Users,
    ChevronRight,
    Stethoscope,
    Calendar,
    Ticket,
    Search,
    Volume2,
    VolumeX,
    Pause,
    PlayCircle,
    StopCircle,
    ArrowUp,
    ArrowDown,
    Plus,
    X,
    Smartphone,
    Globe,
    AlertTriangle,
    Undo2,
    Timer,
    Flame,
    Sparkles,
} from 'lucide-react';

interface SessionItem {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    start_time: string;
    end_time: string;
    room_number: string;
    status: 'scheduled' | 'in_progress' | 'paused' | 'completed' | string;
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
    average_consult_minutes: number;
    estimated_finish_time: string;
}

interface QueueToken {
    id: number;
    token_number: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_phone_masked: string;
    patient_nic: string;
    visit_type: string;
    estimated_time: string;
    status: 'booked' | 'checked_in' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'no_show' | 'cancelled' | string;
    booked_via: string;
    is_walk_in: boolean;
    is_arrived: boolean;
    payment_status: 'paid' | 'pending' | string;
    fee_formatted: string;
    checked_in_at: string | null;
    called_at: string | null;
}

interface NowServing {
    id: number;
    token_number: number;
    patient_name: string;
    patient_phone: string;
    patient_phone_masked: string;
    visit_type: string;
    payment_status: string;
    fee_formatted: string;
    status: string;
    estimated_time: string;
    called_at: string;
    called_timestamp: number;
    duration_seconds: number;
}

interface QueueStats {
    total: number;
    checked_in: number;
    waiting: number;
    completed: number;
    skipped: number;
    no_show: number;
    average_consult_minutes: number;
    estimated_finish_time: string;
}

interface UpcomingSession {
    id: number;
    doctor_name: string;
    doctor_specialty: string;
    date_formatted: string;
    start_time: string;
    room_number: string;
    booked_tokens_count: number;
    max_tokens: number;
}

interface NextUpcomingSessionToday {
    id: number;
    doctor_name: string;
    start_time: string;
    starts_in_minutes: number;
    starts_in_text: string;
    booked_count: number;
}

interface Props {
    todaySessions: SessionItem[];
    activeSession: ActiveSessionDetails | null;
    tokens: QueueToken[];
    nowServingToken: NowServing | null;
    nextInLine: any[];
    stats: QueueStats;
    upcomingSessions: UpcomingSession[];
    hasCompletedAnySessionEver: boolean;
    nextUpcomingSessionToday: NextUpcomingSessionToday | null;
    isDoctor: boolean;
}

// Soft Hospital Two-Tone Chime Synthesizer
const playSoftHospitalChime = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Note 1: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Note 2: E5 (659.25 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.22);
        gain2.gain.setValueAtTime(0.25, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 1.1);
    } catch (e) {
        console.warn('Audio chime playback error:', e);
    }
};

export default function TodayQueueIndex({
    todaySessions,
    activeSession,
    tokens,
    nowServingToken,
    nextInLine,
    stats,
    upcomingSessions = [],
    hasCompletedAnySessionEver = false,
    nextUpcomingSessionToday = null,
    isDoctor,
}: Props) {
    const shouldReduceMotion = useReducedMotion();

    // Console tabs
    const [queueTab, setQueueTab] = useState<'waiting' | 'completed' | 'skipped'>('waiting');
    const [searchQuery, setSearchQuery] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [chimeEnabled, setChimeEnabled] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showDelayModal, setShowDelayModal] = useState(false);
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [justCalledPulse, setJustCalledPulse] = useState(false);

    // Live TV connection status
    const [isTvConnected, setIsTvConnected] = useState(false);
    const lastTvHeartbeatRef = useRef<number>(0);
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

    // Lightweight 5-second Undo Toast for Skip & No-Show
    const [undoToast, setUndoToast] = useState<{
        visible: boolean;
        token: QueueToken;
        actionLabel: string;
        timerId: any;
    } | null>(null);

    // Live consultation duration timer
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(nowServingToken?.duration_seconds ?? 0);

    // Sync elapsed seconds when token changes
    useEffect(() => {
        if (nowServingToken) {
            const initialElapsed = Math.max(0, Math.floor(Date.now() / 1000) - nowServingToken.called_timestamp);
            setElapsedSeconds(initialElapsed);
            setJustCalledPulse(true);
            const pulseTimer = setTimeout(() => setJustCalledPulse(false), 2000);
            return () => clearTimeout(pulseTimer);
        } else {
            setElapsedSeconds(0);
        }
    }, [nowServingToken?.token_number, nowServingToken?.called_timestamp]);

    // Live consultation clock tick
    useEffect(() => {
        if (!nowServingToken) return;
        const ticker = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(ticker);
    }, [nowServingToken]);

    const formattedElapsed = useMemo(() => {
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, [elapsedSeconds]);

    // BroadcastChannel sync & TV presence heartbeat
    useEffect(() => {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('medvisit_queue_sync');
            broadcastChannelRef.current = channel;

            channel.onmessage = (event) => {
                if (event.data?.type === 'TV_HEARTBEAT') {
                    lastTvHeartbeatRef.current = Date.now();
                    setIsTvConnected(true);
                }
            };

            const watchdog = setInterval(() => {
                if (Date.now() - lastTvHeartbeatRef.current > 7000) {
                    setIsTvConnected(false);
                }
            }, 3000);

            return () => {
                clearInterval(watchdog);
                channel.close();
            };
        }
    }, []);

    // Notify TV display of action immediately
    const notifyTvDisplay = () => {
        try {
            broadcastChannelRef.current?.postMessage({
                type: 'QUEUE_UPDATED',
                sessionId: activeSession?.id,
                timestamp: Date.now(),
            });
        } catch (e) {
            // ignore
        }
    };

    // Auto-refresh queue every 7 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['todaySessions', 'activeSession', 'tokens', 'nowServingToken', 'nextInLine', 'stats'],
            });
        }, 7000);
        return () => clearInterval(interval);
    }, []);

    // Keyboard Shortcuts (N / Space, R, C, S, X)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable shortcuts when user is typing in an input / textarea / modal
            const activeEl = document.activeElement;
            const isTyping =
                activeEl &&
                (activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    activeEl.tagName === 'SELECT' ||
                    (activeEl as HTMLElement).isContentEditable);

            if (isTyping) return;
            if (showEndConfirm || showDelayModal || showWalkInModal) return;

            const key = e.key.toUpperCase();

            // Space or N: Call Next
            if (e.code === 'Space' || key === 'N') {
                e.preventDefault();
                callNext();
            } else if (key === 'R') {
                e.preventDefault();
                recall();
            } else if (key === 'C') {
                e.preventDefault();
                completeConsultation();
            } else if (key === 'S') {
                e.preventDefault();
                skip();
            } else if (key === 'X') {
                e.preventDefault();
                if (nowServingToken) {
                    const currentTokenObj = tokens.find((t) => t.id === nowServingToken.id);
                    if (currentTokenObj) markNoShow(currentTokenObj);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSession, nowServingToken, tokens, showEndConfirm, showDelayModal, showWalkInModal]);

    // Action handlers
    const switchSession = (sessionId: number) => {
        router.get('/sessions/today', { session_id: sessionId }, { preserveScroll: true });
    };

    const callNext = () => {
        if (!activeSession) return;
        setIsActionLoading(true);
        if (chimeEnabled) playSoftHospitalChime();
        notifyTvDisplay();
        router.post(
            `/sessions/today/${activeSession.id}/call-next`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    notifyTvDisplay();
                },
            }
        );
    };

    const recall = () => {
        if (!activeSession || !nowServingToken) return;
        setIsActionLoading(true);
        if (chimeEnabled) playSoftHospitalChime();
        notifyTvDisplay();
        router.post(
            `/sessions/today/${activeSession.id}/recall`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    notifyTvDisplay();
                },
            }
        );
    };

    const completeConsultation = () => {
        if (!activeSession || !nowServingToken) return;
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/complete`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    notifyTvDisplay();
                },
            }
        );
    };

    const skip = () => {
        if (!activeSession || !nowServingToken) return;
        const currentTokenObj = tokens.find((t) => t.id === nowServingToken.id);
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${activeSession.id}/skip`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    notifyTvDisplay();
                    if (currentTokenObj) {
                        triggerUndoToast(currentTokenObj, 'skipped');
                    }
                },
            }
        );
    };

    const markNoShow = (token: QueueToken) => {
        setIsActionLoading(true);
        router.post(
            `/sessions/today/${token.id}/no-show`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsActionLoading(false);
                    notifyTvDisplay();
                    triggerUndoToast(token, 'marked as no-show');
                },
            }
        );
    };

    const triggerUndoToast = (token: QueueToken, actionLabel: string) => {
        if (undoToast?.timerId) clearTimeout(undoToast.timerId);
        const timerId = setTimeout(() => {
            setUndoToast(null);
        }, 5000);

        setUndoToast({
            visible: true,
            token,
            actionLabel,
            timerId,
        });
    };

    const undoAction = () => {
        if (!undoToast) return;
        clearTimeout(undoToast.timerId);
        const token = undoToast.token;
        setUndoToast(null);
        router.post(
            `/sessions/today/tokens/${token.id}/restore`,
            {},
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    const checkInToken = (token: QueueToken) => {
        router.post(
            `/sessions/today/${token.id}/check-in`,
            {},
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    const callSpecificToken = (token: QueueToken) => {
        if (chimeEnabled) playSoftHospitalChime();
        router.post(
            `/sessions/today/tokens/${token.id}/call`,
            {},
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    const reorderToken = (token: QueueToken, direction: 'up' | 'down') => {
        router.post(
            `/sessions/today/tokens/${token.id}/reorder`,
            { direction },
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    const pauseSession = () => {
        if (!activeSession) return;
        router.post(`/sessions/today/${activeSession.id}/pause`, {}, { preserveScroll: true });
    };

    const resumeSession = () => {
        if (!activeSession) return;
        router.post(`/sessions/today/${activeSession.id}/resume`, {}, { preserveScroll: true });
    };

    const endSession = () => {
        if (!activeSession) return;
        setShowEndConfirm(false);
        router.post(
            `/sessions/today/${activeSession.id}/end`,
            {},
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    const doctorArrived = () => {
        if (!activeSession) return;
        router.post(
            `/sessions/today/${activeSession.id}/doctor-arrived`,
            {},
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    const delaySession = (minutes: number) => {
        if (!activeSession) return;
        setShowDelayModal(false);
        router.post(
            `/sessions/today/${activeSession.id}/delay`,
            { minutes },
            {
                preserveScroll: true,
                onFinish: () => notifyTvDisplay(),
            }
        );
    };

    // Filter queue by active tab & search query
    const filteredTokens = useMemo(() => {
        return tokens.filter((t) => {
            // Tab filter
            if (queueTab === 'waiting') {
                if (!['booked', 'checked_in'].includes(t.status)) return false;
            } else if (queueTab === 'completed') {
                if (t.status !== 'completed') return false;
            } else if (queueTab === 'skipped') {
                if (!['skipped', 'no_show'].includes(t.status)) return false;
            }

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchToken = t.token_number.toString().includes(q);
                const matchName = t.patient_name.toLowerCase().includes(q);
                const matchPhone = t.patient_phone.includes(q) || t.patient_phone_masked.includes(q);
                return matchToken || matchName || matchPhone;
            }
            return true;
        });
    }, [tokens, queueTab, searchQuery]);

    // Counts for tabs
    const waitingCount = useMemo(() => tokens.filter((t) => ['booked', 'checked_in'].includes(t.status)).length, [tokens]);
    const completedCount = useMemo(() => tokens.filter((t) => t.status === 'completed').length, [tokens]);
    const skippedCount = useMemo(() => tokens.filter((t) => ['skipped', 'no_show'].includes(t.status)).length, [tokens]);

    // Determine current high-level State:
    // State 2: No sessions today
    // State 3: Sessions today but none started yet (all are scheduled)
    // State 1: Sessions running / live
    const isState2Empty = todaySessions.length === 0;
    const isState3NotStarted = todaySessions.length > 0 && todaySessions.every((s) => s.status === 'scheduled');

    return (
        <AuthenticatedLayout>
            <Head title="Today's Channeling Queue" />

            <div className="space-y-6 pb-20 sm:pb-6">
                {/* PAGE HEADER */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Queue Manager', href: '/dashboard' },
                        { label: "Today's Queue" },
                    ]}
                    title="Today's Queue"
                    subtitle="Run today's channeling sessions."
                    actions={
                        <div className="flex items-center gap-2">
                            {/* TV Display Button with Live Connection Indicator */}
                            <a
                                href="/queue/tv"
                                target="_blank"
                                rel="noreferrer"
                                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-all hover:scale-[1.02]"
                                title="Open Live TV Display in a new window or second monitor"
                            >
                                <div className="relative flex items-center justify-center">
                                    <Tv className="w-4 h-4 text-[#1E6FD9]" />
                                    <span
                                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                                            isTvConnected ? 'bg-[#0E9E8F] ring-2 ring-emerald-400/30 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    />
                                </div>
                                <span className="font-medium">Open TV display</span>
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono">
                                    {isTvConnected ? (
                                        <span className="text-[#0E9E8F] font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0E9E8F]" /> Connected
                                        </span>
                                    ) : (
                                        'Offline'
                                    )}
                                </span>
                            </a>
                        </div>
                    }
                />

                {/* 5-SECOND FLOATING UNDO TOAST */}
                <AnimatePresence>
                    {undoToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl border border-white/10 backdrop-blur-md"
                        >
                            <div className="w-2 h-2 rounded-full bg-[#FF7A59] animate-ping" />
                            <span className="text-xs font-medium">
                                Token #{undoToast.token.token_number} ({undoToast.token.patient_name}) {undoToast.actionLabel}.
                            </span>
                            <button
                                type="button"
                                onClick={undoAction}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-xs transition-colors"
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                                <span>Undo</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* =========================================================================
                    STATE 2: NO SESSIONS TODAY
                    ========================================================================= */}
                {isState2Empty ? (
                    <div className="space-y-6">
                        <GlassCard className="py-12 sm:py-16 text-center max-w-3xl mx-auto">
                            {/* TV Display Illustration (Dimmed) */}
                            <div className="mx-auto w-32 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center p-3 relative shadow-inner mb-6 opacity-75">
                                <Tv className="w-7 h-7 text-slate-400 dark:text-slate-500 mb-1" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Display Offline
                                </span>
                                <div className="absolute -bottom-2 w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                            </div>

                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                No sessions today
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                                There are no doctor channeling sessions scheduled for today. Add a doctor or create a session to open today's queue.
                            </p>

                            {/* Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                <Link
                                    href="/calendar"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-md shadow-[#1E6FD9]/20 transition-all hover:scale-[1.02]"
                                >
                                    <Calendar className="w-4 h-4" />
                                    <span>Create a session</span>
                                </Link>

                                <Link
                                    href="/doctors"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-colors"
                                >
                                    <Stethoscope className="w-4 h-4 text-[#1E6FD9]" />
                                    <span>Add a doctor</span>
                                </Link>

                                <Link
                                    href="/calendar"
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#1E6FD9] hover:underline"
                                >
                                    <span>View calendar</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {/* Upcoming Sessions this week (Next 3) */}
                            {upcomingSessions.length > 0 && (
                                <div className="mt-10 pt-8 border-t border-slate-200/70 dark:border-white/10 text-left">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Upcoming sessions later this week
                                        </h3>
                                        <Link href="/calendar" className="text-xs text-[#1E6FD9] font-medium hover:underline">
                                            Full calendar →
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {upcomingSessions.map((up) => (
                                            <div
                                                key={up.id}
                                                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-[#1E6FD9]/40 transition-colors"
                                            >
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] mb-1.5">
                                                    {up.date_formatted}
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {up.doctor_name}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {up.start_time} · {up.room_number}
                                                </p>
                                                <div className="mt-2 text-[11px] font-medium text-slate-400 flex items-center justify-between">
                                                    <span>Bookings:</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {up.booked_tokens_count}/{up.max_tokens}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* How it works (Shown ONLY until clinic has completed its first session) */}
                            {!hasCompletedAnySessionEver && (
                                <div className="mt-10 pt-8 border-t border-slate-200/70 dark:border-white/10 text-left">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                                        How today's channeling queue works
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
                                            <div className="w-7 h-7 rounded-full bg-[#1E6FD9]/10 text-[#1E6FD9] font-bold text-xs flex items-center justify-center mb-2">
                                                1
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                                Add doctors & fees
                                            </h5>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                Set specialist consultation fees and appointment duration.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
                                            <div className="w-7 h-7 rounded-full bg-[#0E9E8F]/10 text-[#0E9E8F] font-bold text-xs flex items-center justify-center mb-2">
                                                2
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                                Schedule session
                                            </h5>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                Pick date, consultation room, and max token capacity.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
                                            <div className="w-7 h-7 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] font-bold text-xs flex items-center justify-center mb-2">
                                                3
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                                Call & serve patients
                                            </h5>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                Control patient progression live and broadcast instantly to TV.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                ) : (
                    /* =========================================================================
                        STATE 1 & STATE 3: SESSIONS EXIST TODAY
                        ========================================================================= */
                    <div className="space-y-6">
                        {/* TOP SESSION SWITCHER PILLS (Horizontal Tabs) */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {todaySessions.map((s) => {
                                const isSelected = activeSession?.id === s.id;
                                const isLive = s.status === 'in_progress';
                                const isPaused = s.status === 'paused';
                                const isEnded = s.status === 'completed';

                                let dotClass = 'bg-[#1E6FD9]';
                                let statusLabel = 'Upcoming';
                                if (isLive) {
                                    dotClass = 'bg-[#0E9E8F] animate-pulse';
                                    statusLabel = 'Live';
                                } else if (isPaused) {
                                    dotClass = 'bg-amber-500';
                                    statusLabel = 'Paused';
                                } else if (isEnded) {
                                    dotClass = 'bg-slate-400';
                                    statusLabel = 'Ended';
                                }

                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => switchSession(s.id)}
                                        className={`group px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-2.5 ${
                                            isSelected
                                                ? 'bg-[#1E6FD9] text-white border-[#1E6FD9] shadow-md shadow-[#1E6FD9]/20'
                                                : 'bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white ring-2 ring-white/30' : dotClass}`} />
                                        <span>{s.doctor_name}</span>
                                        <span className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                            · {s.start_time} · {s.room_number}
                                        </span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {s.booked_tokens_count}/{s.max_tokens}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* STATE 3: COUNTDOWN CARD (When sessions exist but none started yet) */}
                        {isState3NotStarted && nextUpcomingSessionToday && (
                            <GlassCard className="p-6 bg-gradient-to-r from-[#1E6FD9]/10 via-[#0E9E8F]/10 to-transparent border-[#1E6FD9]/30">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#1E6FD9] text-white flex items-center justify-center shadow-md shadow-[#1E6FD9]/30">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] mb-1">
                                                Session upcoming today
                                            </span>
                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                                {nextUpcomingSessionToday.doctor_name} {nextUpcomingSessionToday.starts_in_text}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Scheduled start at {nextUpcomingSessionToday.start_time} · {nextUpcomingSessionToday.booked_count} patients booked
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={doctorArrived}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-[#0c8a7d] shadow-md shadow-[#0E9E8F]/20 transition-all hover:scale-[1.02]"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                            <span>Doctor arrived & start session</span>
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* TOP STATS STRIP FOR ACTIVE SESSION */}
                        {activeSession && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Waiting */}
                                <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Waiting in queue
                                        </span>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
                                            {stats.waiting}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-[#0E9E8F]/10 text-[#0E9E8F] flex items-center justify-center font-bold">
                                        <Users className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Served */}
                                <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Patients served
                                        </span>
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                            {stats.completed}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Average Consult Time */}
                                <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Average consult
                                        </span>
                                        <span className="text-2xl font-black text-[#1E6FD9] mt-0.5 block">
                                            {stats.average_consult_minutes} min
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center font-bold">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Estimated Finish Time */}
                                <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Est. finish time
                                        </span>
                                        <span className="text-2xl font-black text-[#FF7A59] mt-0.5 block">
                                            {stats.estimated_finish_time}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center font-bold">
                                        <Timer className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MAIN SPLIT CONSOLE (LEFT 60% / RIGHT 40%) */}
                        {activeSession && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* =========================================================================
                                    LEFT CONSOLE (~60%): NOW SERVING & ACTION COMMAND CENTER
                                    ========================================================================= */}
                                <GlassCard className="lg:col-span-7 bg-gradient-to-br from-white/95 via-white/85 to-[#1E6FD9]/5 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-[#1E6FD9]/10 border-slate-200/80 dark:border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                                    {/* Top Bar: Room & Audio Chime Toggle */}
                                    <div>
                                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10">
                                            <div className="flex items-center gap-2.5">
                                                <span className="relative flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E6FD9] opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1E6FD9]" />
                                                </span>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Now serving in {activeSession.room_number}
                                                </span>
                                            </div>

                                            {/* Chime toggle & Session controls */}
                                            <div className="flex items-center gap-2">
                                                {/* Soft chime toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = !chimeEnabled;
                                                        setChimeEnabled(next);
                                                        if (next) playSoftHospitalChime();
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                                                        chimeEnabled
                                                            ? 'bg-[#0E9E8F]/10 text-[#0E9E8F] border border-[#0E9E8F]/30'
                                                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                                    }`}
                                                    title="Play soft hospital chime on call"
                                                >
                                                    {chimeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                                    <span>Chime {chimeEnabled ? 'on' : 'off'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Now Serving Big Display */}
                                        {nowServingToken ? (
                                            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-6">
                                                {/* FLIP ANIMATION TOKEN BADGE */}
                                                <div className="perspective-1000">
                                                    <AnimatePresence mode="wait">
                                                        <motion.div
                                                            key={nowServingToken.token_number}
                                                            initial={shouldReduceMotion ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
                                                            animate={shouldReduceMotion ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
                                                            exit={shouldReduceMotion ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
                                                            transition={{ duration: 0.35, ease: 'easeOut' }}
                                                            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-[#1E6FD9] to-[#2582fc] text-white flex flex-col items-center justify-center shadow-xl shadow-[#1E6FD9]/30 relative overflow-hidden ${
                                                                justCalledPulse ? 'ring-4 ring-[#1E6FD9]/50 animate-pulse' : ''
                                                            }`}
                                                        >
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                                                                Token
                                                            </span>
                                                            <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                                                                #{nowServingToken.token_number}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-white/80 mt-1 capitalize">
                                                                {nowServingToken.status.replace('_', ' ')}
                                                            </span>
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </div>

                                                {/* Patient Details & Live Consultation Timer */}
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                            {nowServingToken.patient_name}
                                                        </h3>
                                                        <span
                                                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                                nowServingToken.payment_status === 'paid'
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                            }`}
                                                        >
                                                            {nowServingToken.fee_formatted} · {nowServingToken.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                        Phone: <span className="font-semibold text-slate-700 dark:text-slate-300">{nowServingToken.patient_phone_masked}</span>
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                                            {nowServingToken.visit_type}
                                                        </span>

                                                        {/* LIVE CONSULTATION TIMER */}
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-[#1E6FD9]/10 text-[#1E6FD9]">
                                                            <Timer className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                                                            <span>{formattedElapsed} in consult</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* No patient currently called */
                                            <div className="py-12 text-center">
                                                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                                                    <Users className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                                    No patient currently called
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                                    Press <span className="font-semibold text-[#1E6FD9]">Call next (Space or N)</span> below to summon the next patient into {activeSession.room_number}.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* LARGE ACTION BUTTONS (With Keyboard Shortcut Hints) */}
                                    <div className="mt-8 pt-5 border-t border-slate-200/60 dark:border-white/10 space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                            {/* CALL NEXT (Primary, Big, Space or N) */}
                                            <button
                                                type="button"
                                                onClick={callNext}
                                                disabled={isActionLoading || stats.waiting === 0}
                                                className="col-span-2 sm:col-span-2 min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-lg shadow-[#1E6FD9]/25 disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                            >
                                                <PhoneCall className="w-4 h-4" />
                                                <span>Call next</span>
                                                <kbd className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">
                                                    N or Space
                                                </kbd>
                                            </button>

                                            {/* RECALL (R) */}
                                            <button
                                                type="button"
                                                onClick={recall}
                                                disabled={isActionLoading || !nowServingToken}
                                                className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-bold text-[#0E9E8F] bg-[#0E9E8F]/10 hover:bg-[#0E9E8F]/20 border border-[#0E9E8F]/20 disabled:opacity-40 transition-colors"
                                                title="Repeat audio chime and flashing alert on waiting-room TV"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Recall</span>
                                                <kbd className="text-[9px] bg-[#0E9E8F]/20 px-1 py-0.5 rounded font-mono">
                                                    R
                                                </kbd>
                                            </button>

                                            {/* COMPLETE (C) */}
                                            <button
                                                type="button"
                                                onClick={completeConsultation}
                                                disabled={isActionLoading || !nowServingToken}
                                                className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/40 disabled:opacity-40 transition-colors"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Complete</span>
                                                <kbd className="text-[9px] bg-emerald-200/50 dark:bg-emerald-800/40 px-1 py-0.5 rounded font-mono">
                                                    C
                                                </kbd>
                                            </button>

                                            {/* SKIP (S) */}
                                            <button
                                                type="button"
                                                onClick={skip}
                                                disabled={isActionLoading || !nowServingToken}
                                                className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-800/40 disabled:opacity-40 transition-colors"
                                            >
                                                <span>Skip</span>
                                                <kbd className="text-[9px] bg-amber-200/50 dark:bg-amber-800/40 px-1 py-0.5 rounded font-mono">
                                                    S
                                                </kbd>
                                            </button>

                                            {/* NO-SHOW (X) */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (nowServingToken) {
                                                        const cur = tokens.find((t) => t.id === nowServingToken.id);
                                                        if (cur) markNoShow(cur);
                                                    }
                                                }}
                                                disabled={isActionLoading || !nowServingToken}
                                                className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-bold text-[#FF7A59] bg-[#FF7A59]/10 hover:bg-[#FF7A59]/20 border border-[#FF7A59]/20 disabled:opacity-40 transition-colors"
                                            >
                                                <UserX className="w-3.5 h-3.5" />
                                                <span>No-show</span>
                                                <kbd className="text-[9px] bg-[#FF7A59]/20 px-1 py-0.5 rounded font-mono">
                                                    X
                                                </kbd>
                                            </button>
                                        </div>

                                        {/* SESSION CONTROLS: Pause / Resume, End, Doctor arrived, Delay */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/50 dark:border-white/5 text-xs text-slate-500">
                                            <div className="flex items-center gap-2">
                                                {activeSession.status === 'paused' ? (
                                                    <button
                                                        type="button"
                                                        onClick={resumeSession}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60"
                                                    >
                                                        <Play className="w-3 h-3 fill-current" />
                                                        <span>Resume session</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={pauseSession}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 hover:bg-amber-100"
                                                    >
                                                        <Pause className="w-3 h-3" />
                                                        <span>Pause session</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => setShowDelayModal(true)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    <span>Delayed by...</span>
                                                </button>

                                                {activeSession.status === 'scheduled' && (
                                                    <button
                                                        type="button"
                                                        onClick={doctorArrived}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-[#0E9E8F] bg-[#0E9E8F]/10 hover:bg-[#0E9E8F]/20"
                                                    >
                                                        <UserCheck className="w-3 h-3" />
                                                        <span>Doctor arrived</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEndConfirm(true)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                >
                                                    <StopCircle className="w-3.5 h-3.5" />
                                                    <span>End session</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* =========================================================================
                                    RIGHT CONSOLE (~40%): THE QUEUE LIST & SEARCH
                                    ========================================================================= */}
                                <GlassCard className="lg:col-span-5 flex flex-col min-h-[460px]">
                                    {/* Header & Add Walk-in button */}
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10 gap-2">
                                        {/* Tabs */}
                                        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setQueueTab('waiting')}
                                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                                    queueTab === 'waiting'
                                                        ? 'bg-white dark:bg-slate-800 text-[#1E6FD9] dark:text-white shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                                }`}
                                            >
                                                Waiting ({waitingCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQueueTab('completed')}
                                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                                    queueTab === 'completed'
                                                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                                }`}
                                            >
                                                Completed ({completedCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQueueTab('skipped')}
                                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                                    queueTab === 'skipped'
                                                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                                }`}
                                            >
                                                Skipped ({skippedCount})
                                            </button>
                                        </div>

                                        {/* Add Walk-in Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowWalkInModal(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-[#0c8a7d] shadow-sm transition-all hover:scale-[1.02] shrink-0"
                                            title="Issue walk-in token for this session"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add walk-in</span>
                                        </button>
                                    </div>

                                    {/* Search input within queue */}
                                    <div className="py-3">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by name, phone or token #..."
                                                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Queue Rows List */}
                                    <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1 scrollbar-thin">
                                        {filteredTokens.length === 0 ? (
                                            <div className="py-12 text-center text-slate-400 text-xs">
                                                No patients in this view.
                                            </div>
                                        ) : (
                                            filteredTokens.map((token, index) => {
                                                const isCurrent = token.token_number === activeSession.current_token_number;
                                                const isArrived = token.status === 'checked_in' || ['called', 'in_consultation', 'completed'].includes(token.status);

                                                return (
                                                    <motion.div
                                                        key={token.id}
                                                        layout={!shouldReduceMotion}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={`p-3 rounded-2xl border transition-all ${
                                                            isCurrent
                                                                ? 'bg-[#1E6FD9]/10 border-[#1E6FD9]/30'
                                                                : 'bg-white/80 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:border-[#1E6FD9]/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            {/* Left: Token Chip + Name + Walk-in badge */}
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span
                                                                    className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                                                                        isCurrent
                                                                            ? 'bg-[#1E6FD9] text-white shadow-sm'
                                                                            : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    #{token.token_number}
                                                                </span>

                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                            {token.patient_name}
                                                                        </span>
                                                                        {token.is_walk_in ? (
                                                                            <span
                                                                                className="text-[10px] text-slate-400"
                                                                                title="Walk-in patient"
                                                                            >
                                                                                🚶
                                                                            </span>
                                                                        ) : (
                                                                            <span
                                                                                className="text-[10px] text-slate-400"
                                                                                title="Booked online"
                                                                            >
                                                                                🌐
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 truncate">
                                                                        {token.patient_phone_masked} · Est. {token.estimated_time}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Right: Arrival toggle & Quick actions */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {/* Check-in Arrival Status */}
                                                                {token.status === 'booked' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => checkInToken(token)}
                                                                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#1E6FD9] bg-[#1E6FD9]/10 hover:bg-[#1E6FD9]/20 transition-colors"
                                                                        title="Mark patient as arrived at clinic"
                                                                    >
                                                                        Mark arrived
                                                                    </button>
                                                                )}
                                                                {token.status === 'checked_in' && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                        Arrived
                                                                    </span>
                                                                )}

                                                                {/* Reorder Up / Down (for waiting tokens) */}
                                                                {queueTab === 'waiting' && (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => reorderToken(token, 'up')}
                                                                            disabled={index === 0}
                                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20"
                                                                            title="Move up in queue"
                                                                        >
                                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => reorderToken(token, 'down')}
                                                                            disabled={index === filteredTokens.length - 1}
                                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20"
                                                                            title="Move down in queue"
                                                                        >
                                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Call specific token */}
                                                                {['booked', 'checked_in'].includes(token.status) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => callSpecificToken(token)}
                                                                        className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-[#1E6FD9] transition-colors"
                                                                        title="Call this patient now"
                                                                    >
                                                                        <PhoneCall className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* Restore if skipped/no-show */}
                                                                {['skipped', 'no_show'].includes(token.status) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            router.post(`/sessions/today/tokens/${token.id}/restore`, {}, { preserveScroll: true });
                                                                        }}
                                                                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#1E6FD9] bg-[#1E6FD9]/10 hover:bg-[#1E6FD9]/20"
                                                                        title="Return to waiting queue"
                                                                    >
                                                                        Restore
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </GlassCard>
                            </div>
                        )}

                        {/* STICKY BOTTOM ACTION BAR FOR TABLET/MOBILE (768px and down) */}
                        {activeSession && (
                            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 p-3 sm:hidden shadow-2xl flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={callNext}
                                    disabled={isActionLoading || stats.waiting === 0}
                                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] disabled:opacity-50"
                                >
                                    <PhoneCall className="w-4 h-4" />
                                    <span>Call next</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={recall}
                                    disabled={isActionLoading || !nowServingToken}
                                    className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold text-[#0E9E8F] bg-[#0E9E8F]/10 border border-[#0E9E8F]/20 disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={completeConsultation}
                                    disabled={isActionLoading || !nowServingToken}
                                    className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Done</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* END SESSION CONFIRM MODAL */}
            <AnimatePresence>
                {showEndConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center gap-3 text-rose-600">
                                <AlertTriangle className="w-6 h-6" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    End channeling session?
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                This will mark the session with <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSession?.doctor_name}</span> as completed and finish all active consultations.
                            </p>
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEndConfirm(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={endSession}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                                >
                                    End session
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DELAY SESSION MODAL */}
            <AnimatePresence>
                {showDelayModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                    <Clock className="w-4 h-4 text-[#1E6FD9]" />
                                    <span>Delay session</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDelayModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Select delay duration. This will automatically adjust the estimated wait times for all waiting patients in this session:
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {[10, 15, 30].map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => delaySession(mins)}
                                        className="py-2.5 rounded-xl text-xs font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] hover:bg-[#1E6FD9] hover:text-white transition-all"
                                    >
                                        +{mins} min
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QUICK WALK-IN ISSUANCE MODAL */}
            <AnimatePresence>
                {showWalkInModal && activeSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-[#0E9E8F]/10 text-[#0E9E8F] flex items-center justify-center font-bold">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Quick walk-in token
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            {activeSession.doctor_name} · {activeSession.room_number}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowWalkInModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.currentTarget;
                                    const formData = new FormData(form);
                                    router.post('/bookings', {
                                        doctor_session_id: activeSession.id,
                                        new_patient_name: formData.get('patient_name'),
                                        new_patient_phone: formData.get('patient_phone'),
                                        new_patient_nic: formData.get('patient_nic'),
                                        payment_collected: formData.get('payment_collected') === 'on',
                                        payment_method: 'cash',
                                    }, {
                                        preserveScroll: true,
                                        onSuccess: () => setShowWalkInModal(false),
                                    });
                                }}
                                className="space-y-3 pt-2"
                            >
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        Patient name *
                                    </label>
                                    <input
                                        type="text"
                                        name="patient_name"
                                        required
                                        placeholder="e.g. Kasun Fernando"
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        Phone number *
                                    </label>
                                    <input
                                        type="text"
                                        name="patient_phone"
                                        required
                                        placeholder="e.g. 0771234567"
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        NIC (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        name="patient_nic"
                                        placeholder="e.g. 199012345678"
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="pay_collected"
                                        name="payment_collected"
                                        defaultChecked
                                        className="rounded border-slate-300 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                    />
                                    <label htmlFor="pay_collected" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Consultation fee collected at desk ({activeSession.fee_formatted})
                                    </label>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-white/10">
                                    <Link
                                        href={`/bookings?session_id=${activeSession.id}&action=new`}
                                        className="text-xs text-[#1E6FD9] hover:underline font-medium"
                                    >
                                        Open full booking form →
                                    </Link>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowWalkInModal(false)}
                                            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-[#0c8a7d] shadow-sm"
                                        >
                                            Issue token
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}
