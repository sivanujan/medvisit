import React, { useState, useRef, useEffect } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import {
    Sparkles,
    RotateCcw,
    Tv,
    CalendarCheck,
    ChevronDown,
    ExternalLink,
    ShieldCheck,
    Ticket,
    Stethoscope,
    Pill,
    X,
    Check,
    Compass,
    Lightbulb,
    ArrowRight,
    LogOut,
} from 'lucide-react';

interface DemoRoleInfo {
    name: string;
    title: string;
    description: string;
    email: string;
    icon: string;
    badge: string;
    tourKey: string;
}

interface TourStep {
    title: string;
    description: string;
    actionUrl?: string;
    actionLabel?: string;
}

export default function DemoTopBanner() {
    const { tenant, auth, is_demo, demo_roles } = usePage<any>().props as {
        tenant?: { id: string; name: string; is_demo?: boolean; subdomain?: string };
        auth?: { user?: { name: string; roles?: string[] } };
        is_demo?: boolean;
        demo_roles?: Record<string, DemoRoleInfo>;
    };

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [tourOpen, setTourOpen] = useState(false);
    const [hintDismissed, setHintDismissed] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!is_demo && !tenant?.is_demo) {
        return null;
    }

    const currentRoles = auth?.user?.roles || [];
    let currentRoleKey = 'clinic_admin';
    if (currentRoles.includes('pharmacist')) currentRoleKey = 'pharmacist';
    else if (currentRoles.includes('doctor')) currentRoleKey = 'doctor';
    else if (currentRoles.includes('receptionist')) currentRoleKey = 'receptionist';
    else if (currentRoles.includes('clinic_admin')) currentRoleKey = 'clinic_admin';

    const rolesMap: Record<
        string,
        {
            label: string;
            icon: React.ReactNode;
            user: string;
            tryThisHint: string;
            quickAction: { label: string; url: string };
            steps: TourStep[];
        }
    > = {
        clinic_admin: {
            label: 'Clinic Admin',
            icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />,
            user: 'Dr. K. Nimalan',
            tryThisHint:
                'Inspect clinic fee settings, review doctor token codes (NS, AP, PJ, FF), or manage reception queue settings.',
            quickAction: { label: 'Doctor Setup', url: '/doctors' },
            steps: [
                {
                    title: '1. Multi-Doctor Configuration',
                    description:
                        'View and edit 4 Sri Lankan doctors with custom token codes, consultation room assignments, and split fee structures.',
                    actionUrl: '/doctors',
                    actionLabel: 'Open Doctors List',
                },
                {
                    title: '2. Live Queue Oversight',
                    description:
                        'Monitor live patient queue pacing, token arrival statuses, and active consultation rooms across the medical centre.',
                    actionUrl: '/sessions/today',
                    actionLabel: "View Today's Queue",
                },
                {
                    title: '3. Waiting Room TV Display',
                    description:
                        'Configure token-only privacy display modes, trilingual voice calls (English, Sinhala, Tamil), and audio chimes.',
                    actionUrl: '/queue/tv',
                    actionLabel: 'Preview Waiting Room TV',
                },
            ],
        },
        receptionist: {
            label: 'Receptionist',
            icon: <Ticket className="w-3.5 h-3.5 text-teal-400" />,
            user: 'Sanduni Silva',
            tryThisHint:
                'Issue a new channeling token for Dr. Nimal, mark patient arrived, or preview the waiting room TV calling.',
            quickAction: { label: 'Issue Walk-In Token', url: '/sessions/today' },
            steps: [
                {
                    title: '1. Fast Token Issuing',
                    description:
                        'Generate walking-in or phone channeling tokens with automatic token prefix numbering (e.g. NS-04, AP-03).',
                    actionUrl: '/sessions/today',
                    actionLabel: 'Open Today Queue',
                },
                {
                    title: '2. Mark Patient Arrived',
                    description:
                        'When patients enter the waiting room, mark them arrived to bump them into the doctor’s ready-to-call consultation list.',
                    actionUrl: '/sessions/today',
                    actionLabel: 'Manage Waiting Queue',
                },
                {
                    title: '3. Multi-Channel Reminders',
                    description:
                        'In production, automated SMS/WhatsApp alerts fire on token creation and when 2 tokens remain before consultation.',
                },
            ],
        },
        doctor: {
            label: 'Doctor',
            icon: <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />,
            user: 'Dr. Nimal Senaratne',
            tryThisHint:
                'Start consultation for token NS-03, add diagnosis & prescription with Tamil/Sinhala directions, and click Finish.',
            quickAction: { label: 'Consultation Desk', url: '/doctor/consultation' },
            steps: [
                {
                    title: '1. Call Next Patient',
                    description:
                        'Call the next waiting patient into Room 01 with a single click. Broadcasts instantly to the Waiting Room TV.',
                    actionUrl: '/doctor/consultation',
                    actionLabel: 'Go to Consultation Desk',
                },
                {
                    title: '2. Bilingual Rx Prescribing',
                    description:
                        'Write medications with standard Sri Lankan abbreviations (bd, tds, nocte) and automatic Tamil & Sinhala dosage translation.',
                    actionUrl: '/doctor/consultation',
                    actionLabel: 'Test Prescription Form',
                },
                {
                    title: '3. Digital Pharmacy Handoff',
                    description:
                        'Once saved, prescription slips route directly to the in-house pharmacy dispensary queue in real time.',
                },
            ],
        },
        pharmacist: {
            label: 'Pharmacist',
            icon: <Pill className="w-3.5 h-3.5 text-amber-400" />,
            user: 'Rohan Perera',
            tryThisHint:
                'Select a completed prescription from the dispensary queue, verify batch items, and click Dispense & Print.',
            quickAction: { label: 'Dispense Queue', url: '/pharmacy/dispense' },
            steps: [
                {
                    title: '1. Live Dispense Queue',
                    description:
                        'Review incoming electronic prescriptions completed by doctors in real time, with full patient vitals and allergies.',
                    actionUrl: '/pharmacy/dispense',
                    actionLabel: 'View Dispense Queue',
                },
                {
                    title: '2. Batch Stock Deduction',
                    description:
                        'Automatically verify batch numbers, FEFO expiration dates, and itemised pricing before dispensing.',
                    actionUrl: '/pharmacy/medicines',
                    actionLabel: 'Check Medicine Stock',
                },
                {
                    title: '3. Receipt & Slip Printing',
                    description:
                        'Generate 80mm thermal POS slips and formatted A4 pharmacy receipts with doctor SLMC and clinic tax headers.',
                },
            ],
        },
    };

    const activeRoleMeta = rolesMap[currentRoleKey] || rolesMap.clinic_admin;

    const handleSwitchRole = (roleKey: string) => {
        setDropdownOpen(false);
        if (roleKey === currentRoleKey) return;
        router.post('/demo-switch-role', { role: roleKey }, { preserveScroll: false });
    };

    return (
        <>
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-3 sm:px-4 py-2 text-xs font-medium sticky top-0 z-50 border-b border-indigo-500/20 shadow-md">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left: Sandbox indicator & Reset timing */}
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white font-extrabold text-[10px] tracking-wide uppercase shrink-0 shadow-xs">
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            <span>Public Demo Sandbox</span>
                        </span>
                        <span className="hidden md:inline text-slate-300 truncate text-[11px]">
                            Nightly reset at <strong className="text-white">03:00 Colombo time</strong> • Safe playground (no real SMS or charges)
                        </span>
                    </div>

                    {/* Right: Role Switcher & Live Quicklinks */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Role Switcher Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-slate-100 text-xs font-semibold transition"
                                title="Switch demo persona"
                            >
                                {activeRoleMeta.icon}
                                <span>Role: <strong>{activeRoleMeta.label}</strong></span>
                                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1.5 z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-800">
                                        Switch Persona
                                    </div>
                                    <div className="mt-1 space-y-0.5">
                                        {(['clinic_admin', 'receptionist', 'doctor', 'pharmacist'] as const).map((rKey) => {
                                            const isSelected = rKey === currentRoleKey;
                                            const rMeta = rolesMap[rKey];
                                            return (
                                                <button
                                                    key={rKey}
                                                    type="button"
                                                    onClick={() => handleSwitchRole(rKey)}
                                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                                                        isSelected
                                                            ? 'bg-blue-600/30 text-blue-200 font-bold border border-blue-500/30'
                                                            : 'text-slate-200 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {rMeta.icon}
                                                        <div className="truncate">
                                                            <div className="font-semibold">{rMeta.label}</div>
                                                            <div className="text-[10px] text-slate-400">{rMeta.user}</div>
                                                        </div>
                                                    </div>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Guided Tour Modal Trigger */}
                        <button
                            type="button"
                            onClick={() => setTourOpen(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-200 text-xs font-semibold transition"
                            title="Interactive role guide"
                        >
                            <Compass className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline">Role Tour</span>
                        </button>

                        {/* Waiting Room TV screen */}
                        <a
                            href="/queue/tv"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-200 text-xs font-semibold transition"
                        >
                            <Tv className="w-3.5 h-3.5 text-teal-400" />
                            <span>Live TV</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>

                        {/* Patient booking */}
                        <a
                            href="/book"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-xs font-semibold transition"
                        >
                            <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
                            <span>Book Online</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>

                        {/* Exit Demo / Back to Central Demo Hub */}
                        <a
                            href="/demo"
                            title="Exit demo sandbox and return to the main Demo Hub overview"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-rose-500/30 border border-white/15 hover:border-rose-500/40 text-slate-300 hover:text-white text-xs font-semibold transition group"
                        >
                            <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-200 transition-colors" />
                            <span>Exit Demo</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* "Try This" Hint Bar */}
            {!hintDismissed && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200 backdrop-blur-xs flex items-center justify-between gap-3">
                    <div className="max-w-7xl mx-auto flex-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] tracking-wide uppercase shrink-0">
                                <Lightbulb className="w-3 h-3 text-amber-500" />
                                <span>Try this</span>
                            </span>
                            <span className="truncate text-slate-700 dark:text-slate-300 text-xs">
                                <strong>{activeRoleMeta.label}:</strong> {activeRoleMeta.tryThisHint}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={activeRoleMeta.quickAction.url}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs transition"
                            >
                                <span>{activeRoleMeta.quickAction.label}</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setHintDismissed(true)}
                                aria-label="Dismiss hint"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Guided Tour Modal */}
            {tourOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-white">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    {activeRoleMeta.icon}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-base">
                                        Guided Tour: {activeRoleMeta.label}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Persona: {activeRoleMeta.user}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTourOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3.5">
                            {activeRoleMeta.steps.map((st, i) => (
                                <div
                                    key={i}
                                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60"
                                >
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>{st.title}</span>
                                        {st.actionUrl && (
                                            <Link
                                                href={st.actionUrl}
                                                onClick={() => setTourOpen(false)}
                                                className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                            >
                                                <span>{st.actionLabel || 'Go'}</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                        {st.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Switch role anytime via top banner</span>
                            <button
                                type="button"
                                onClick={() => setTourOpen(false)}
                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
