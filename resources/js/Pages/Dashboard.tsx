import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
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
    Sparkles,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    Monitor,
    Play,
    Phone,
    Search,
    FileText,
    Check,
    RefreshCw,
    X,
    Info,
    Tv,
    Volume2,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import TvPairingModal from '@/Pages/Queue/Components/TvPairingModal';

// --- Lightweight Helpers & Hooks ---

/** Count-up animation hook respecting prefers-reduced-motion */
function useCountUp(target: number, duration: number = 600): number {
    const [count, setCount] = useState(target);
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
        if (prefersReducedMotion || target === 0) {
            setCount(target);
            return;
        }

        let startTime: number | null = null;
        let animationFrame: number;
        const startVal = 0;
        const diff = target - startVal;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            setCount(Math.round(startVal + diff * eased));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            }
        };

        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    }, [target, duration, prefersReducedMotion]);

    return count;
}

/** Lightweight SVG Sparkline component (no chart library needed) */
function Sparkline({
    data,
    color = '#1E6FD9',
    height = 28,
    width = 76,
}: {
    data: number[];
    color?: string;
    height?: number;
    width?: number;
}) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;

    const points = data
        .map((val, idx) => {
            const x = (idx / (data.length - 1)) * (width - 6) + 3;
            const y = height - 4 - ((val - min) / range) * (height - 8);
            return `${x},${y}`;
        })
        .join(' ');

    const lastX = width - 3;
    const lastY = height - 4 - ((data[data.length - 1] - min) / range) * (height - 8);

    return (
        <svg
            width={width}
            height={height}
            className="overflow-visible inline-block shrink-0"
            aria-hidden="true"
        >
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
        </svg>
    );
}

// --- Interfaces ---

interface DashboardProps {
    tenant?: {
        id: string;
        name: string;
        subdomain: string;
        currency: string;
        currency_symbol: string;
        base_domain?: string;
        public_domain?: string;
        public_clinic_url?: string;
        logo_url?: string;
    };
    userRole?: 'clinic_admin' | 'doctor' | 'receptionist';
    canViewMoney?: boolean;
    stats?: {
        todayPatientsCount: number;
        patientsTrend?: number;
        patientsSparkline?: number[];
        waitingCount: number;
        activeSessionsCount: number;
        sessionsTrend?: number;
        sessionsSparkline?: number[];
        todayCollections: string;
        collectionsTrend?: number;
        collectionsSparkline?: number[];
        todayDoctorFees: string;
        todayClinicFees: string;
    };
    timelineSessions?: Array<{
        id: number;
        doctor_id: number;
        doctor_name: string;
        specialty: string;
        room_number: string;
        start_time: string;
        end_time: string;
        start_minutes: number;
        end_minutes: number;
        status: string;
        current_token_number: number;
        booked_tokens_count: number;
        max_tokens: number;
    }>;
    runningSessions?: Array<{
        id: number;
        doctor_name: string;
        specialty: string;
        room_number: string;
        status: string;
        current_token_number: number;
        nowServing: {
            token_number: number;
            patient_name: string;
            status: string;
        } | null;
        nextInLine: Array<{
            token_number: number;
            patient_name: string;
            estimated_time: string;
        }>;
        waitingCount: number;
        estimatedWaitMinutes: number;
    }>;
    activeSession?: {
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
    queue?: {
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
    upcomingSessions?: Array<{
        id: number;
        doctor_name: string;
        specialty: string;
        date: string;
        raw_date?: string;
        start_time: string;
        end_time: string;
        room_number: string;
        status: string;
        booked_tokens_count: number;
        max_tokens: number;
        fee_formatted: string;
    }>;
    alerts?: Array<{
        id: string;
        type: 'warning' | 'info' | 'notice';
        title: string;
        message: string;
        action_label: string;
        action_href: string;
    }>;
    checklist?: {
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
        publicClinicUrl?: string;
    };
}

export default function Dashboard({
    tenant = {
        id: '',
        name: 'Clinic Workspace',
        subdomain: 'clinic',
        currency: 'LKR',
        currency_symbol: 'Rs.',
        base_domain: 'medvisit.localhost',
        public_domain: 'medvisit.lk',
        public_clinic_url: 'https://clinic.medvisit.lk',
    },
    userRole = 'clinic_admin',
    canViewMoney = true,
    stats = {
        todayPatientsCount: 0,
        patientsTrend: 0,
        patientsSparkline: [0, 0, 0, 0, 0, 0, 0],
        waitingCount: 0,
        activeSessionsCount: 0,
        sessionsTrend: 0,
        sessionsSparkline: [0, 0, 0, 0, 0, 0, 0],
        todayCollections: 'Rs. 0.00',
        collectionsTrend: 0,
        collectionsSparkline: [0, 0, 0, 0, 0, 0, 0],
        todayDoctorFees: 'Rs. 0.00',
        todayClinicFees: 'Rs. 0.00',
    },
    timelineSessions = [],
    runningSessions = [],
    activeSession = null,
    queue = { nowServing: null, nextInLine: [], tokens: [] },
    upcomingSessions = [],
    alerts = [],
    checklist = {
        completedCount: 5,
        totalCount: 5,
        percentage: 100,
        publicClinicUrl: 'https://clinic.medvisit.lk',
        items: {
            add_doctor: true,
            create_schedule: true,
            invite_staff: true,
            publish_website: true,
            take_first_booking: true,
        },
    },
}: DashboardProps) {
    const { auth } = usePage<any>().props;
    const userFirstName = auth?.user?.name ? auth.user.name.split(' ')[0] : 'Doctor';

    // Checklist / Setup state
    const isSetupIncomplete = (checklist?.completedCount ?? 5) < 5;
    const [tvPairingOpen, setTvPairingOpen] = useState(false);
    const [dismissedSetup, setDismissedSetup] = useState<boolean>(() => {
        try {
            return (
                typeof window !== 'undefined' &&
                localStorage.getItem(`mv_dismiss_setup_${tenant.id}`) === 'true'
            );
        } catch {
            return false;
        }
    });

    const isSetupMode = isSetupIncomplete && !dismissedSetup;

    const handleDismissSetup = () => {
        setDismissedSetup(true);
        try {
            localStorage.setItem(`mv_dismiss_setup_${tenant.id}`, 'true');
        } catch {
            // ignore
        }
    };

    const handleRestoreSetup = () => {
        setDismissedSetup(false);
        try {
            localStorage.removeItem(`mv_dismiss_setup_${tenant.id}`);
        } catch {
            // ignore
        }
    };

    // Colombo Live Clock & Greeting
    const [currentTime, setCurrentTime] = useState<{
        greeting: string;
        formattedDate: string;
        colomboMinutes: number;
    }>(() => {
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
        else if (hour >= 17) greeting = 'Good evening';

        let dateStr = '';
        try {
            dateStr = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Colombo',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(now);
        } catch {
            dateStr = now.toLocaleDateString();
        }

        return {
            greeting,
            formattedDate: dateStr,
            colomboMinutes: hour * 60 + now.getMinutes(),
        };
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const hour = now.getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
            else if (hour >= 17) greeting = 'Good evening';

            setCurrentTime({
                greeting,
                formattedDate: new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Colombo',
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                }).format(now),
                colomboMinutes: hour * 60 + now.getMinutes(),
            });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // Step 4 domain: strictly configured public domain ({subdomain}.medvisit.lk), never request host
    const publicClinicDisplayUrl =
        checklist?.publicClinicUrl ||
        tenant?.public_clinic_url ||
        `https://${tenant.subdomain || 'clinic'}.${tenant.public_domain || 'medvisit.lk'}`;

    // 5 Setup Steps Definition
    const setupSteps = [
        {
            key: 'add_doctor',
            num: 1,
            title: 'Add your first doctor',
            shortDesc: 'Register doctor profile with SLMC number and channeling fee.',
            href: '/doctors',
            cta: 'Add doctor',
            icon: Stethoscope,
            isCompleted: !!checklist?.items?.add_doctor,
        },
        {
            key: 'create_schedule',
            num: 2,
            title: 'Create channeling sessions',
            shortDesc: 'Set up weekly consultation times, room allocations and token limits.',
            href: '/calendar',
            cta: 'Create schedule',
            icon: Calendar,
            isCompleted: !!checklist?.items?.create_schedule,
        },
        {
            key: 'invite_staff',
            num: 3,
            title: 'Invite reception staff',
            shortDesc: 'Grant role-based access for desk officers to issue tokens and manage arrivals.',
            href: '/staff',
            cta: 'Invite staff',
            icon: UserCheck,
            isCompleted: !!checklist?.items?.invite_staff,
        },
        {
            key: 'publish_website',
            num: 4,
            title: 'Publish patient booking page',
            shortDesc: `Launch your branded patient portal at ${publicClinicDisplayUrl}`,
            href: '/website',
            cta: 'Publish website',
            icon: Globe,
            isCompleted: !!checklist?.items?.publish_website,
        },
        {
            key: 'take_first_booking',
            num: 5,
            title: 'Issue your first channeling token',
            shortDesc: 'Issue a token from reception desk or test online channeling.',
            href: '/bookings',
            cta: 'Issue token',
            icon: Ticket,
            isCompleted: !!checklist?.items?.take_first_booking,
        },
    ];

    // Find next actionable step
    const nextStep = setupSteps.find((s) => !s.isCompleted) || setupSteps[0];

    // Animated count-ups for KPIs
    const countPatients = useCountUp(stats.todayPatientsCount);
    const countWaiting = useCountUp(stats.waitingCount);
    const countSessions = useCountUp(stats.activeSessionsCount);

    return (
        <AuthenticatedLayout>
            <Head title={`${tenant.name} — Clinic Control Room`} />

            {/* Ambient Background Dotted Grid & Glow */}
            <div className="space-y-6 sm:space-y-8 pb-12">
                {/* Greeting & Control Room Subheader (replaces redundant title) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Clinic Control Room · Colombo Active
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {currentTime.greeting}, {userFirstName}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {currentTime.formattedDate} · {tenant.name}
                        </p>
                    </div>

                    {/* Mode Switcher Pill (if setup not 100% completed) */}
                    {isSetupIncomplete && (
                        <div className="flex items-center gap-2">
                            {isSetupMode ? (
                                <button
                                    type="button"
                                    onClick={handleDismissSetup}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs cursor-pointer"
                                    title="Switch to daily operations view"
                                >
                                    <span>Switch to Operations mode</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleRestoreSetup}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all cursor-pointer"
                                    title="View setup progress"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Setup guide ({checklist.completedCount}/5)</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* =========================================================================
                    MODE A: SETUP MODE (Shown when onboarding is incomplete)
                   ========================================================================= */}
                {isSetupMode ? (
                    <div className="space-y-6">
                        {/* Setup Journey Grid: Left Stepper & Hero (7 cols) + Right TV Display (5 cols) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Left Column: Hero Card & 5-Step Stepper */}
                            <div className="lg:col-span-7 space-y-6">
                                {/* Hero Card with Circular Progress Ring */}
                                <GlassCard className="p-6 relative overflow-hidden bg-gradient-to-br from-white/90 via-primary-50/20 to-white/70 dark:from-slate-900/90 dark:via-primary-950/20 dark:to-slate-900/70 border-primary/25">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-primary-300">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Clinic Setup Checklist</span>
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                Let's get {tenant.name} ready
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                                Complete these 5 essentials to open live channeling and patient queuing.
                                            </p>

                                            {/* Primary Call to Action for next step */}
                                            {nextStep && (
                                                <div className="pt-3">
                                                    <Link
                                                        href={nextStep.href}
                                                        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/25 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                                                    >
                                                        <span>Next: {nextStep.title}</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>

                                        {/* Animated Circular Progress Ring SVG */}
                                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                                {/* Track */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    className="text-slate-200 dark:text-slate-800"
                                                />
                                                {/* Progress fill */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    fill="none"
                                                    stroke="url(#progress-gradient)"
                                                    strokeWidth="8"
                                                    strokeLinecap="round"
                                                    strokeDasharray={251.2}
                                                    strokeDashoffset={251.2 - (251.2 * (checklist?.percentage ?? 0)) / 100}
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                                <defs>
                                                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#1E6FD9" />
                                                        <stop offset="100%" stopColor="#0E9E8F" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center text-center">
                                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    {checklist.completedCount}/5
                                                </span>
                                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                                    Done
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* 5 Steps Stepper Journey */}
                                <div className="space-y-3">
                                    {setupSteps.map((step) => {
                                        const Icon = step.icon;
                                        const isCurrent = !step.isCompleted && step.key === nextStep.key;

                                        return (
                                            <div
                                                key={step.key}
                                                className={`p-4 rounded-2xl border transition-all duration-200 ${
                                                    step.isCompleted
                                                        ? 'bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 opacity-60'
                                                        : isCurrent
                                                        ? 'bg-white dark:bg-slate-900 border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5'
                                                        : 'bg-white/60 dark:bg-slate-900/50 border-slate-200/70 dark:border-white/5 opacity-80'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        {/* Status Icon Indicator */}
                                                        <div
                                                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                                                step.isCompleted
                                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                                    : isCurrent
                                                                    ? 'bg-primary text-white shadow-xs'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                            }`}
                                                        >
                                                            {step.isCompleted ? (
                                                                <Check className="w-4 h-4 stroke-[3]" />
                                                            ) : (
                                                                step.num
                                                            )}
                                                        </div>

                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3
                                                                    className={`text-sm font-bold ${
                                                                        step.isCompleted
                                                                            ? 'line-through text-slate-500 dark:text-slate-400'
                                                                            : 'text-slate-900 dark:text-white'
                                                                    }`}
                                                                >
                                                                    {step.title}
                                                                </h3>
                                                                {isCurrent && (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                                                        Current step
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                                                                {step.shortDesc}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Step Action Button */}
                                                    <Link
                                                        href={step.href}
                                                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                            step.isCompleted
                                                                ? 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                                : isCurrent
                                                                ? 'bg-primary hover:bg-primary-600 text-white shadow-xs shadow-primary/25'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        <span>{step.isCompleted ? 'Edit' : step.cta}</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Slim Muted Stats Strip (Replaces 4 big zero cards) */}
                                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span>Patients today: <strong className="text-slate-700 dark:text-slate-300">{stats.todayPatientsCount}</strong></span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-700">·</span>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span>Waiting: <strong className="text-slate-700 dark:text-slate-300">{stats.waitingCount}</strong></span>
                                    </div>
                                    <span className="text-slate-300 dark:text-slate-700">·</span>
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck className="w-4 h-4 text-slate-400" />
                                        <span>Sessions: <strong className="text-slate-700 dark:text-slate-300">{stats.activeSessionsCount}</strong></span>
                                    </div>
                                    {canViewMoney && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-700">·</span>
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-slate-400" />
                                                <span>Collections: <strong className="text-slate-700 dark:text-slate-300">{stats.todayCollections}</strong></span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Wall-mounted TV Display Preview (Same Component Style) */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="relative select-none">
                                    {/* Wall Bracket Drop Shadow Simulation */}
                                    <div
                                        className="absolute -inset-2 rounded-[2rem] bg-slate-950/20 dark:bg-black/60 blur-xl pointer-events-none -z-10"
                                        aria-hidden="true"
                                    />

                                    {/* Bezel Frame */}
                                    <div className="rounded-[1.6rem] p-3 bg-gradient-to-br from-[#1d2433] via-[#0a0e16] to-[#151b27] shadow-2xl border border-slate-700/60 relative overflow-hidden text-white font-sans">
                                        {/* TV Screen Container */}
                                        <div className="rounded-xl bg-[#0b0f19] p-5 border border-white/5 space-y-5">
                                            {/* TV Header Bar */}
                                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-white text-xs shadow-sm">
                                                        {tenant.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-sm text-white tracking-tight truncate max-w-[180px]">
                                                            {tenant.name}
                                                        </h3>
                                                        <span className="text-[10px] text-teal-400 font-medium">
                                                            Live Queue Display
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Online
                                                </span>
                                            </div>

                                            {/* Big Now Serving Banner */}
                                            <div className="py-6 px-4 rounded-xl bg-gradient-to-b from-primary/20 via-primary/10 to-transparent border border-primary/30 text-center space-y-1">
                                                <div className="text-[11px] font-bold uppercase tracking-widest text-primary-300">
                                                    Now Serving
                                                </div>
                                                <div className="text-5xl font-mono font-black text-white tracking-wider">
                                                    01
                                                </div>
                                                <p className="text-xs text-slate-400 pt-1">
                                                    Consultation Suite 01 · Dr. Practicing
                                                </p>
                                            </div>

                                            {/* Up Next Mini Tokens */}
                                            <div className="space-y-1.5">
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                                    Up Next
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
                                                        <span className="font-mono text-base font-bold text-slate-300">02</span>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
                                                        <span className="font-mono text-base font-bold text-slate-300">03</span>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-center">
                                                        <span className="font-mono text-base font-bold text-slate-300">04</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TV Screen Footer */}
                                            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                                <span className="truncate max-w-[200px] text-[11px]">
                                                    {publicClinicDisplayUrl}
                                                </span>
                                                <span className="text-emerald-400 font-bold text-[11px]">
                                                    Lounge Display Ready
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Wall-mounted TV queue display ready for your waiting room.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* =========================================================================
                        MODE B: OPERATIONS MODE (Normal Daily Operational Control Room)
                       ========================================================================= */
                    <div className="space-y-6 sm:space-y-8">
                        {/* 4 Main KPI Cards with Count-up, 7-day sparkline, and vs-yesterday */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 1. Today's Patients */}
                            <GlassCard className="p-5 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Today's Patients
                                    </span>
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="flex items-baseline justify-between mt-3">
                                    <div>
                                        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                            {countPatients}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                                            visits
                                        </span>
                                    </div>
                                    <Sparkline
                                        data={stats.patientsSparkline || [0, 1, 2, 3, 2, 4, stats.todayPatientsCount]}
                                        color="#1E6FD9"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    {stats.patientsTrend && stats.patientsTrend > 0 ? (
                                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                                            +{stats.patientsTrend}%
                                        </span>
                                    ) : stats.patientsTrend && stats.patientsTrend < 0 ? (
                                        <span className="inline-flex items-center text-rose-500 font-bold">
                                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                                            {stats.patientsTrend}%
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 font-medium">0%</span>
                                    )}
                                    <span>vs yesterday</span>
                                </div>
                            </GlassCard>

                            {/* 2. Waiting Now */}
                            <GlassCard className="p-5 flex flex-col justify-between border-accent/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Waiting Now
                                    </span>
                                    <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-2xl sm:text-3xl font-extrabold text-accent tracking-tight">
                                        {countWaiting}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                                        tokens in waiting area
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    <span>Estimated queue time:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                                        ~{stats.waitingCount * 10} min
                                    </span>
                                </div>
                            </GlassCard>

                            {/* 3. Sessions Today */}
                            <GlassCard className="p-5 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Sessions Today
                                    </span>
                                    <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                                        <CalendarCheck className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="flex items-baseline justify-between mt-3">
                                    <div>
                                        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                            {countSessions}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                                            doctor clinics
                                        </span>
                                    </div>
                                    <Sparkline
                                        data={stats.sessionsSparkline || [1, 2, 1, 3, 2, 1, stats.activeSessionsCount]}
                                        color="#0E9E8F"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    <Link
                                        href="/calendar"
                                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                                    >
                                        <span>View schedule</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </GlassCard>

                            {/* 4. Today's Collections (Hidden from roles without money permissions) */}
                            {canViewMoney && (
                                <GlassCard className="p-5 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Today's Collections
                                        </span>
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <Receipt className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline justify-between mt-3">
                                        <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate max-w-[140px]">
                                            {stats.todayCollections}
                                        </span>
                                        <Sparkline
                                            data={stats.collectionsSparkline || [0, 5000, 12000, 8000, 15000, 18000, 24000]}
                                            color="#10B981"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        <span className="truncate text-[11px]">
                                            Doc: {stats.todayDoctorFees}
                                        </span>
                                        <Link
                                            href="/billing"
                                            className="text-primary hover:underline font-semibold text-[11px] shrink-0"
                                        >
                                            Billing →
                                        </Link>
                                    </div>
                                </GlassCard>
                            )}
                        </div>

                        {/* Operational Alerts Card (shown only when alerts exist) */}
                        {alerts && alerts.length > 0 && (
                            <div className="space-y-3">
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            alert.type === 'warning'
                                                ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                                                : 'bg-primary-50/70 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800/40 text-primary-900 dark:text-primary-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle
                                                className={`w-5 h-5 shrink-0 mt-0.5 ${
                                                    alert.type === 'warning' ? 'text-amber-600' : 'text-primary'
                                                }`}
                                            />
                                            <div>
                                                <h4 className="text-sm font-bold">{alert.title}</h4>
                                                <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={alert.action_href}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 shadow-2xs ${
                                                alert.type === 'warning'
                                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                    : 'bg-primary hover:bg-primary-600 text-white'
                                            }`}
                                        >
                                            <span>{alert.action_label}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 1. "Today" Timeline (6 AM – 10 PM) */}
                        <GlassCard className="p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/10">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Today's Channeling Timeline
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        All doctor consultation sessions scheduled for today across consultation suites.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-slate-500">In consultation</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                        <span className="text-slate-500">Scheduled</span>
                                    </div>
                                </div>
                            </div>

                            {/* Horizontal Day Timeline Container (6 AM to 10 PM = 16 hours) */}
                            {timelineSessions && timelineSessions.length > 0 ? (
                                <div className="hidden sm:block pt-3">
                                    {/* Hour markers row (6 AM to 10 PM) */}
                                    <div className="grid grid-cols-16 text-[10px] font-mono text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-1">
                                        {Array.from({ length: 17 }).map((_, i) => {
                                            const hour = 6 + i;
                                            const label = hour <= 12 ? `${hour}am` : `${hour - 12}pm`;
                                            if (hour === 22) return <div key={i} className="text-right">10pm</div>;
                                            return <div key={i}>{label}</div>;
                                        })}
                                    </div>

                                    {/* Visual Grid Track with Moving "NOW" Line and Placed Session Blocks */}
                                    <div className="relative h-28 my-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 overflow-hidden">
                                        {/* Subtle hour grid guides */}
                                        <div className="absolute inset-0 grid grid-cols-16 pointer-events-none divide-x divide-slate-100 dark:divide-white/[0.03]" />

                                        {/* Placed Session Blocks */}
                                        {timelineSessions.map((session, idx) => {
                                            // Timeline window: 6 AM (360 min) to 10 PM (1320 min) = 960 min total
                                            const totalMinutes = 960;
                                            const startMin = Math.max(360, Math.min(1320, session.start_minutes));
                                            const endMin = Math.max(startMin + 45, Math.min(1320, session.end_minutes));
                                            const leftPct = ((startMin - 360) / totalMinutes) * 100;
                                            const widthPct = Math.max(8, ((endMin - startMin) / totalMinutes) * 100);

                                            const isRunning = session.status === 'in_progress';

                                            return (
                                                <Link
                                                    key={session.id}
                                                    href="/sessions/today"
                                                    style={{
                                                        left: `${leftPct}%`,
                                                        width: `${widthPct}%`,
                                                        top: `${(idx % 2) * 44 + 8}px`,
                                                    }}
                                                    className={`absolute h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-1.5 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer z-10 ${
                                                        isRunning
                                                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/20'
                                                            : 'bg-primary-50 dark:bg-primary-950/60 border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-200'
                                                    }`}
                                                    title={`Dr. ${session.doctor_name} (${session.room_number}) · ${session.start_time} - ${session.end_time}`}
                                                >
                                                    <div className="truncate font-bold">
                                                        {session.doctor_name}
                                                    </div>
                                                    <span className="text-[10px] font-mono opacity-85 shrink-0">
                                                        {session.booked_tokens_count}/{session.max_tokens}
                                                    </span>
                                                </Link>
                                            );
                                        })}

                                        {/* Moving "NOW" Line (Asia/Colombo) */}
                                        {currentTime.colomboMinutes >= 360 && currentTime.colomboMinutes <= 1320 && (
                                            <div
                                                style={{
                                                    left: `${((currentTime.colomboMinutes - 360) / 960) * 100}%`,
                                                }}
                                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                                            >
                                                <div className="absolute -top-1 -left-3 px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase bg-rose-500 text-white shadow-xs">
                                                    NOW
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Empty timeline state */
                                <div className="py-8 text-center text-slate-400">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        No doctor channeling sessions scheduled for today.
                                    </p>
                                    <div className="mt-3">
                                        <Link
                                            href="/calendar"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:underline"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Schedule session</span>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Mobile Vertical Schedule List */}
                            <div className="sm:hidden space-y-2.5">
                                {timelineSessions && timelineSessions.length > 0 ? (
                                    timelineSessions.map((session) => (
                                        <Link
                                            key={session.id}
                                            href="/sessions/today"
                                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {session.doctor_name}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {session.room_number} · {session.start_time} - {session.end_time}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-mono font-bold text-primary">
                                                    {session.booked_tokens_count} / {session.max_tokens}
                                                </span>
                                                <div className="text-[10px] text-slate-400">booked</div>
                                            </div>
                                        </Link>
                                    ))
                                ) : null}
                            </div>
                        </GlassCard>

                        {/* 2. Live Sessions: Mini TV-Style Cards */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                    </span>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Live Queue Sessions
                                    </h2>
                                </div>
                                <Link
                                    href="/sessions/today"
                                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                >
                                    Full Queue Monitor
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {runningSessions && runningSessions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {runningSessions.map((session) => (
                                        <GlassCard
                                            key={session.id}
                                            className="p-5 relative overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/80 dark:from-slate-900/90 dark:to-[#0d131f] border-slate-200/90 dark:border-white/10"
                                        >
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {session.doctor_name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {session.specialty} · {session.room_number}
                                                    </p>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Serving
                                                </span>
                                            </div>

                                            {/* TV-Style Token Presentation */}
                                            <div className="grid grid-cols-3 gap-3 my-4">
                                                {/* Big Now Serving Token Tile */}
                                                <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-700 text-white text-center flex flex-col justify-center shadow-md shadow-primary/20">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-200">
                                                        Now Serving
                                                    </span>
                                                    <div className="text-3xl font-mono font-black my-0.5 tracking-wider">
                                                        {session.nowServing
                                                            ? String(session.nowServing.token_number).padStart(2, '0')
                                                            : '--'}
                                                    </div>
                                                    <span className="text-[11px] text-primary-100 truncate">
                                                        {session.nowServing?.patient_name || 'Calling patient'}
                                                    </span>
                                                </div>

                                                {/* Up Next Mini Tokens (Next 3) */}
                                                <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/5 flex flex-col justify-between">
                                                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                                        <span>Up next in queue</span>
                                                        <span className="font-mono">~{session.estimatedWaitMinutes} min wait</span>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                                                        {session.nextInLine && session.nextInLine.length > 0 ? (
                                                            session.nextInLine.map((nt, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center"
                                                                >
                                                                    <div className="font-mono text-sm font-bold text-primary">
                                                                        #{String(nt.token_number).padStart(2, '0')}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                                        {nt.patient_name}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="col-span-3 py-2 text-center text-slate-400 text-xs">
                                                                No waiting patients
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons for Queue */}
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                                <Link
                                                    href={`/sessions/today`}
                                                    className="flex-1 h-9 rounded-xl font-bold text-xs bg-primary hover:bg-primary-600 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                    <span>Call next token</span>
                                                </Link>
                                                <Link
                                                    href={`/sessions/today`}
                                                    className="h-9 px-3.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <span>Open queue</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            ) : (
                                <GlassCard className="p-8 text-center text-slate-400">
                                    <Monitor className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        No Active Channeling Session Running
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                        When a doctor starts consultation or arrives at the clinic, the live TV queuing controls will appear here.
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                        <Link
                                            href="/sessions/today"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 transition-colors shadow-xs"
                                        >
                                            <span>Open Today's Queue</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </GlassCard>
                            )}
                        </div>

                        {/* 5. Quick Actions Grid (5 Tiles) */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {/* 1. Reception Token Desk */}
                                <Link
                                    href="/bookings"
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                        <Ticket className="w-5 h-5" />
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                        Token Desk
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Issue patient tokens
                                    </div>
                                </Link>

                                {/* 2. Search Patient */}
                                <Link
                                    href="/patients"
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-secondary/50 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                        Search Patient
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        NIC or phone number
                                    </div>
                                </Link>

                                {/* 3. Add Walk-in */}
                                <Link
                                    href="/bookings"
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-accent/50 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                        Add Walk-in
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Direct queue entry
                                    </div>
                                </Link>

                                {/* 4. Open TV Display */}
                                <button
                                    type="button"
                                    onClick={() => setTvPairingOpen(true)}
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/50 hover:shadow-md transition-all group cursor-pointer text-left w-full"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                        <Tv className="w-5 h-5" />
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1">
                                        <span>TV Display</span>
                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Pair waiting-room screen
                                    </div>
                                </button>

                                {/* 5. Today's Report */}
                                <Link
                                    href="/billing"
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                        Today's Report
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Revenue & summaries
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* 4. Upcoming Sessions (Next 7 Days) */}
                        <GlassCard className="p-5 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Upcoming Doctor Sessions (Next 7 Days)
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Upcoming channeling sessions scheduled for specialists.
                                    </p>
                                </div>
                                <Link
                                    href="/calendar"
                                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                >
                                    View Full Calendar
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {upcomingSessions && upcomingSessions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                                    {upcomingSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5 hover:border-primary/40 transition-all flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                            {session.doctor_name}
                                                        </h4>
                                                        <span className="text-[11px] text-primary font-medium">
                                                            {session.specialty}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-600 shrink-0 font-semibold">
                                                        {session.date}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                                    <span>{session.start_time} - {session.end_time}</span>
                                                    <span className="font-semibold">{session.fee_formatted}</span>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    Tokens: <strong className="text-slate-700 dark:text-slate-200">{session.booked_tokens_count}/{session.max_tokens}</strong>
                                                </span>
                                                <Link
                                                    href={`/bookings`}
                                                    className="text-primary font-semibold hover:underline"
                                                >
                                                    Issue Token →
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    No upcoming doctor sessions scheduled in the next 7 days.
                                </div>
                            )}
                        </GlassCard>
                    </div>
                )}
            </div>

            {/* TV Pairing Modal */}
            <TvPairingModal
                isOpen={tvPairingOpen}
                onClose={() => setTvPairingOpen(false)}
                clinicName={tenant.name}
                subdomain={tenant.subdomain}
            />
        </AuthenticatedLayout>
    );
}
