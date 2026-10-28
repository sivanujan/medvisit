import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import {
    Sparkles,
    ShieldCheck,
    Ticket,
    Stethoscope,
    Pill,
    Tv,
    Calendar,
    ArrowRight,
    MessageCircle,
    CheckCircle2,
    Clock,
    X,
    RotateCcw,
    FileText,
    Volume2,
} from 'lucide-react';
import axios from 'axios';

interface DemoShowcaseProps {
    turnstileSiteKey?: string;
}

export default function DemoShowcase({ turnstileSiteKey }: DemoShowcaseProps) {
    // 3-frame cycling preview state
    const [currentFrame, setCurrentFrame] = useState<number>(0);
    const [isPaused, setIsPaused] = useState<boolean>(false);

    // Modal state for "Book a guided demo"
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
    const [formSuccess, setFormSuccess] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Guided demo form fields
    const [contactName, setContactName] = useState('');
    const [clinicName, setClinicName] = useState('');
    const [phone, setPhone] = useState('');
    const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening'>('morning');
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const turnstileContainerRef = useRef<HTMLDivElement>(null);

    // Auto-advance frames every 4 seconds unless paused or reduced motion is preferred
    useEffect(() => {
        if (isPaused) return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) return;

        const timer = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % 3);
        }, 4000);

        return () => clearInterval(timer);
    }, [isPaused]);

    // Handle Turnstile widget mounting
    useEffect(() => {
        if (!modalOpen) return;

        let widgetId: string | null = null;
        const siteKey = turnstileSiteKey || '1x00000000000000000000AA'; // Test / fallback key

        if (typeof window !== 'undefined' && (window as any).turnstile && turnstileContainerRef.current) {
            try {
                widgetId = (window as any).turnstile.render(turnstileContainerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => setTurnstileToken(token),
                    'error-callback': () => setTurnstileToken('demo-bypass-token'),
                });
            } catch (e) {
                // Ignore turnstile render error
            }
        }

        return () => {
            if (widgetId && (window as any).turnstile) {
                try {
                    (window as any).turnstile.remove(widgetId);
                } catch (e) {
                    // Ignore cleanup error
                }
            }
        };
    }, [modalOpen, turnstileSiteKey]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitting(true);
        setFormError(null);

        try {
            await axios.post('/api/leads/request-demo', {
                contact_name: contactName,
                clinic_name: clinicName,
                phone: phone,
                preferred_time: preferredTime,
                source: 'guided_demo_request',
                cf_turnstile_response: turnstileToken || 'demo_token',
            });

            setFormSuccess(true);
        } catch (err: any) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.errors?.phone?.[0] ||
                'Unable to schedule guided demo. Please try again or chat on WhatsApp.';
            setFormError(msg);
        } finally {
            setFormSubmitting(false);
        }
    };

    const roles = [
        {
            key: 'clinic_admin',
            label: 'Clinic admin',
            icon: ShieldCheck,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
        },
        {
            key: 'receptionist',
            label: 'Receptionist',
            icon: Ticket,
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20',
        },
        {
            key: 'doctor',
            label: 'Doctor',
            icon: Stethoscope,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20',
        },
        {
            key: 'pharmacist',
            label: 'Pharmacist',
            icon: Pill,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20',
        },
    ];

    return (
        <section
            id="demo-showcase"
            aria-labelledby="demo-showcase-title"
            className="py-16 sm:py-24 relative overflow-hidden bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 border-y border-slate-200/80 dark:border-white/5"
        >
            {/* Background Glow Accents */}
            <div
                aria-hidden="true"
                className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none"
            />
            <div
                aria-hidden="true"
                className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none"
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
                    {/* LEFT COLUMN: Headings, Role Chips, CTAs */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wide uppercase">
                            <Sparkles className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
                            <span>See MedVisit in action</span>
                        </div>

                        <h2
                            id="demo-showcase-title"
                            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
                        >
                            Try MedVisit — <br className="hidden sm:inline" />
                            <span className="bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] bg-clip-text text-transparent">
                                no sign-up needed
                            </span>
                        </h2>

                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                            Explore a real clinic with doctors, patients, tokens and pharmacy. Pick a role and click
                            around.
                        </p>

                        {/* 4 Compact Role Chips */}
                        <div className="pt-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                                Test as any clinic role:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {roles.map((r) => {
                                    const IconComp = r.icon;
                                    return (
                                        <Link
                                            key={r.key}
                                            href={`/demo?role=${r.key}`}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-all active:scale-95 ${r.bg}`}
                                            title={`Explore demo as ${r.label}`}
                                        >
                                            <IconComp className={`w-4 h-4 shrink-0 ${r.color}`} />
                                            <span className="truncate">{r.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CTAs: Try live demo + Book guided demo */}
                        <div className="pt-3 flex flex-wrap items-center gap-3.5">
                            <Link
                                href="/demo"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] hover:from-blue-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 active:scale-98 transition-all"
                            >
                                <span>Try the live demo</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>

                            <button
                                type="button"
                                onClick={() => {
                                    setModalOpen(true);
                                    setFormSuccess(false);
                                    setFormError(null);
                                }}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-white font-bold text-sm shadow-2xs active:scale-98 transition-all"
                            >
                                <Calendar className="w-4 h-4 text-primary-500" />
                                <span>Book a guided demo</span>
                            </button>
                        </div>

                        {/* Trust Line */}
                        <div className="pt-2 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <RotateCcw className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                            <span>Demo data is fictional and resets every night.</span>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Stacked Mini Mock of the Demo cycling through 3 frames */}
                    <div
                        className="lg:col-span-6 relative"
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                    >
                        <div className="relative mx-auto max-w-lg rounded-3xl p-2 bg-gradient-to-br from-slate-200/80 via-white to-slate-200/80 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-xl">
                            {/* Window Topbar */}
                            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80 inline-block" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block" />
                                    <span className="ml-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                        demo.medvisit.lk
                                    </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                    Frame {currentFrame + 1} of 3
                                </span>
                            </div>

                            {/* Frame Display Area */}
                            <div className="p-4 sm:p-5 min-h-[340px] flex flex-col justify-between">
                                {/* FRAME 0: Receptionist Issuing Token */}
                                {currentFrame === 0 && (
                                    <div className="animate-in fade-in duration-300 space-y-3.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                                    <Ticket className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                        Receptionist Counter
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500">
                                                        Walk-in channeling token issuance
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
                                                Ready
                                            </span>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Doctor:</span>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    Dr. Nimal Senaratne
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Patient:</span>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    Sivanesan Thanabalasingam
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">NIC / Phone:</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                    DEMO-000001 • +94 70 000 0001
                                                </span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <div className="text-left">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                        Generated Token
                                                    </span>
                                                    <span className="text-2xl font-black text-[#1E6FD9]">
                                                        NS-07
                                                    </span>
                                                </div>
                                                <div className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Token Printed</span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                            Step 1: Patient receives token NS-07 with instant simulated SMS confirmation.
                                        </p>
                                    </div>
                                )}

                                {/* FRAME 1: Waiting Room TV Calling NS-07 */}
                                {currentFrame === 1 && (
                                    <div className="animate-in fade-in duration-300 space-y-3.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                    <Tv className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                        Waiting Room TV
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500">
                                                        Token-only broadcast mode
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                <Volume2 className="w-3 h-3 animate-bounce" />
                                                Calling Now
                                            </span>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 text-white border border-indigo-500/30 shadow-lg text-center space-y-3">
                                            <div className="text-[11px] uppercase tracking-widest text-indigo-300 font-bold">
                                                Now Serving • இப்போது அழைக்கப்படும்
                                            </div>
                                            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white py-1">
                                                NS-07
                                            </div>
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold">
                                                <span>Room 01 (Dr. Nimal Senaratne)</span>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                            Step 2: Chime sounds in English, Sinhala, and Tamil. Patient proceeds to Room 01.
                                        </p>
                                    </div>
                                )}

                                {/* FRAME 2: Tamil Bilingual Prescription */}
                                {currentFrame === 2 && (
                                    <div className="animate-in fade-in duration-300 space-y-3.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                        Digital Prescription
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500">
                                                        Auto-translated Tamil instructions
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                                                SLMC DEMO-1001
                                            </span>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                        1. Amoxicillin 500mg Capsule
                                                    </span>
                                                    <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                                                        உணவுக்குப் பின் 1 மாத்திரை በቀን 3 முறை (tds)
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-slate-500">
                                                    Qty: 15
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                        2. Paracetamol 500mg Tablet
                                                    </span>
                                                    <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                                                        தேவைப்படும்போது 2 மாத்திரை (prn)
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-slate-500">
                                                    Qty: 10
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                            Step 3: Pharmacist receives digital slip and dispenses medications directly.
                                        </p>
                                    </div>
                                )}

                                {/* Interactive Frame Navigation Dots */}
                                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        {[0, 1, 2].map((idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setCurrentFrame(idx)}
                                                className={`h-2 rounded-full transition-all ${
                                                    currentFrame === idx
                                                        ? 'w-6 bg-[#1E6FD9]'
                                                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                                                }`}
                                                aria-label={`Jump to preview frame ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-slate-600 dark:text-slate-400">
                                        {isPaused ? 'Paused on hover' : 'Auto-cycling'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GUIDED DEMO MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-white relative">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            aria-label="Close modal"
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {formSuccess ? (
                            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-500 mx-auto flex items-center justify-center">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                    Demo Request Received!
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
                                    Thank you, <strong>{contactName}</strong>. Our team will contact you on WhatsApp to
                                    conduct a 15-minute walkthrough for <strong>{clinicName}</strong>.
                                </p>
                                <div className="pt-2">
                                    <a
                                        href="https://wa.me/94701291688"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span>Message us now on WhatsApp</span>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                        Book a Guided Demo
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Personal 1-on-1 walkthrough tailored to your medical practice.
                                    </p>
                                </div>

                                {formError && (
                                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                                        {formError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Your Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Dr. K. Nimalan"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Clinic / Medical Centre Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Jaffna Family Health Clinic"
                                        value={clinicName}
                                        onChange={(e) => setClinicName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        WhatsApp Mobile Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="077 123 4567"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Preferred Time
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['morning', 'afternoon', 'evening'] as const).map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setPreferredTime(t)}
                                                className={`py-2 rounded-xl text-xs font-bold capitalize border transition ${
                                                    preferredTime === t
                                                        ? 'bg-blue-600/20 text-blue-600 dark:text-blue-300 border-blue-500/50'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Turnstile Widget */}
                                <div ref={turnstileContainerRef} className="pt-1 flex justify-center" />

                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50"
                                >
                                    {formSubmitting ? 'Submitting...' : 'Request Guided Walkthrough'}
                                </button>

                                <div className="text-center pt-2">
                                    <a
                                        href="https://wa.me/94701291688"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold inline-flex items-center gap-1 transition"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Chat on WhatsApp instead (070 129 1688)</span>
                                    </a>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
