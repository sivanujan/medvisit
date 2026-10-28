import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Copy,
    Check,
    ExternalLink,
    ArrowRight,
    QrCode,
    Download,
    CreditCard,
    UserPlus,
    Calendar,
    Users,
    Share2,
    Clock,
    Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import RegistrationHeader from '@/Components/Registration/RegistrationHeader';
import LegalFooter from '@/Components/Public/LegalFooter';
import '@/Components/Registration/registration.css';

interface Props {
    registration: {
        clinic_name: string;
        subdomain: string;
        clinic_url: string;
        auto_login_url: string;
        trial_ends_at?: string;
        admin_email: string;
        clinic_type?: string;
        district?: string;
    };
}

export default function RegisterClinicSuccess({ registration }: Props) {
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [showQrModal, setShowQrModal] = useState(false);
    const [celebrated, setCelebrated] = useState(false);
    const [time, setTime] = useState('');

    // Respect reduced motion
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Trigger one-time light sweep celebration on load
    useEffect(() => {
        const timer = setTimeout(() => setCelebrated(true), 300);
        return () => clearTimeout(timer);
    }, []);

    // Live Colombo Clock for the TV display
    useEffect(() => {
        const updateTime = () => {
            try {
                const now = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Colombo',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                }).format(new Date());
                setTime(now);
            } catch {
                setTime(new Date().toLocaleTimeString());
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Generate QR Code PNG
    useEffect(() => {
        if (registration?.clinic_url) {
            QRCode.toDataURL(registration.clinic_url, {
                width: 280,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff',
                },
            })
                .then((url) => setQrDataUrl(url))
                .catch(() => {});
        }
    }, [registration?.clinic_url]);

    const handleCopy = () => {
        if (!registration.clinic_url) return;
        navigator.clipboard.writeText(registration.clinic_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadQr = () => {
        if (!qrDataUrl) return;
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `${registration.subdomain || 'clinic'}-address-qr.png`;
        a.click();
    };

    // Clinic display name formatting (preserve proper case as typed)
    const rawClinicName = registration.clinic_name?.trim() || 'Your Clinic';
    const clinicName =
        rawClinicName.charAt(0).toUpperCase() + rawClinicName.slice(1);
    const clinicInitial = clinicName.charAt(0).toUpperCase();

    // Timeline steps for "What happens next"
    const timelineSteps = [
        {
            num: 1,
            title: 'Choose your plan & activate',
            desc: 'Pick Basic, Pro or Advanced and pay securely in LKR.',
            icon: CreditCard,
            active: true,
        },
        {
            num: 2,
            title: 'Add your doctors',
            desc: 'Specialties, consultation fees and room assignments.',
            icon: UserPlus,
            active: false,
        },
        {
            num: 3,
            title: 'Create channeling sessions',
            desc: 'Morning and evening doctor slots with capacity limits.',
            icon: Calendar,
            active: false,
        },
        {
            num: 4,
            title: 'Invite reception staff',
            desc: 'Front-desk check-in, token issuing and patient registration.',
            icon: Users,
            active: false,
        },
        {
            num: 5,
            title: 'Share your booking page',
            desc: 'Direct patients to your dedicated online booking URL.',
            icon: Share2,
            active: false,
        },
    ];

    return (
        <div className="reg-root min-h-[100dvh] flex flex-col justify-between selection:bg-primary-100 selection:text-primary-800 antialiased overflow-x-hidden font-sans">
            <Head title={`${clinicName} is ready — MedVisit`} />

            {/* Dotted grid + radial glow backdrop */}
            <div className="reg-backdrop fixed inset-0 pointer-events-none -z-10" aria-hidden="true" />

            {/* Clean minimal Header */}
            <RegistrationHeader />

            {/* Main Stage */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
                {/* Two-Column Section: Left details, Right TV preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* LEFT COLUMN: Success Badge, Heading, Address Card, CTA */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="lg:col-span-6 space-y-6"
                    >
                        {/* Small Success Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Clinic created</span>
                        </div>

                        {/* Heading & Friendly Subtitle */}
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {clinicName} is ready
                            </h1>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                                Your clinic has its own address. Bookmark it — your staff will sign in here.
                            </p>
                        </div>

                        {/* Address Card */}
                        <div className="p-5 sm:p-6 rounded-3xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-xl space-y-4">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <span>Clinic Address</span>
                                <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                                    Staff & Patient Portal
                                </span>
                            </div>

                            {/* Normal Poppins URL Container */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/10">
                                <span
                                    className="font-medium text-sm sm:text-base text-primary dark:text-primary-400 truncate select-all"
                                    title={registration.clinic_url}
                                >
                                    {registration.clinic_url}
                                </span>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        title="Copy clinic address"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>

                                    <a
                                        href={registration.clinic_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-9 px-3 rounded-xl bg-primary hover:bg-primary-600 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shadow-primary/25"
                                        title="Open clinic portal in a new tab"
                                    >
                                        <span>Open</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* QR Code Action Strip */}
                            <div className="flex items-center justify-between pt-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setShowQrModal(!showQrModal)}
                                    className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-400 font-semibold transition-colors cursor-pointer"
                                >
                                    <QrCode className="w-4 h-4 text-primary" />
                                    <span>{showQrModal ? 'Hide QR Code' : 'Show QR Code for staff phones'}</span>
                                </button>

                                {qrDataUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDownloadQr}
                                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium transition-colors cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download PNG</span>
                                    </button>
                                )}
                            </div>

                            {/* Expandable QR Code Drawer */}
                            {showQrModal && qrDataUrl && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-2 flex flex-col items-center justify-center text-center space-y-2.5 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10"
                                >
                                    <img
                                        src={qrDataUrl}
                                        alt={`QR code for ${registration.clinic_url}`}
                                        className="w-40 h-40 rounded-xl p-1 bg-white shadow-xs"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                                        Scan with a mobile camera to instantly open your clinic sign-in portal.
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* Primary Button */}
                        <div className="pt-2 space-y-2">
                            <a
                                href={registration.auto_login_url}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-12 sm:h-12.5 px-7 rounded-xl font-semibold text-sm sm:text-base text-white bg-primary hover:bg-primary-600 shadow-[0_4px_16px_rgba(30,111,217,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(30,111,217,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 border border-primary-500/50 transition-all duration-200 cursor-pointer group"
                            >
                                <span>Choose plan & activate</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </a>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                You'll be signed in automatically.
                            </p>
                        </div>
                    </motion.div>

                    {/* RIGHT COLUMN: Wall-mounted TV Display Preview */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="lg:col-span-6 w-full max-w-[34rem] mx-auto select-none"
                    >
                        <div className="relative">
                            {/* Wall bracket drop shadow simulation */}
                            <div
                                className="absolute -inset-2 rounded-[2rem] bg-slate-950/20 dark:bg-black/60 blur-xl pointer-events-none -z-10"
                                aria-hidden="true"
                            />

                            {/* Bezel frame */}
                            <div className="rounded-[1.6rem] p-2.5 bg-gradient-to-br from-[#1d2433] via-[#0a0e16] to-[#151b27] shadow-2xl border border-slate-700/60 relative overflow-hidden">
                                {/* Celebratory light sweep on load */}
                                {!prefersReducedMotion && celebrated && (
                                    <div className="reg-sweep-flare" aria-hidden="true" />
                                )}

                                {/* TV Screen (16:10 aspect ratio) */}
                                <div className="relative rounded-xl overflow-hidden aspect-[16/10] flex flex-col justify-between bg-radial from-[#1E6FD9]/45 via-[#0A1830] to-[#040812] text-[#eef4ff] p-5 sm:p-6 shadow-inner">
                                    {/* Screen Top Header */}
                                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-white text-primary flex items-center justify-center font-black text-base shadow-sm shrink-0">
                                                {clinicInitial}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm sm:text-base text-white tracking-tight truncate">
                                                    {clinicName}
                                                </p>
                                                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Live Queue TV Display
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-slate-300 tabular-nums">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{time || '10:00:00 AM'}</span>
                                        </div>
                                    </div>

                                    {/* Screen Body: NOW SERVING 01 */}
                                    <div className="my-auto py-2 grid grid-cols-12 gap-3 items-center">
                                        {/* Now Serving */}
                                        <div className="col-span-7">
                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                                NOW SERVING
                                            </span>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <div className="text-5xl sm:text-7xl font-black text-[#FF7A59] tracking-tight leading-none drop-shadow-[0_0_24px_rgba(255,122,89,0.5)]">
                                                    01
                                                </div>
                                            </div>
                                            <span className="inline-block mt-2.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15">
                                                Room 1 · Dr. Consultation
                                            </span>
                                        </div>

                                        {/* Up Next Column */}
                                        <div className="col-span-5 text-right space-y-2 border-l border-white/10 pl-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                UP NEXT
                                            </span>
                                            <div className="flex flex-col items-end gap-1.5 font-mono text-sm sm:text-base font-bold text-slate-200">
                                                <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-white w-20 text-center">
                                                    02
                                                </span>
                                                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300 w-20 text-center">
                                                    03
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Screen Footer */}
                                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                        <span className="text-slate-300 truncate">
                                            {registration.clinic_url}
                                        </span>
                                        <span className="text-emerald-400 font-bold shrink-0">
                                            Display Online
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 text-center">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Sparkles className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                <span>Wall-mounted TV display ready for your clinic waiting lounge</span>
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* FULL-WIDTH TIMELINE: What happens next */}
                <div className="mt-14 sm:mt-18 pt-10 border-t border-slate-200/80 dark:border-white/10 space-y-6">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            What happens next
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Follow these simple steps to start channeling patients.
                        </p>
                    </div>

                    {/* Timeline: Horizontal on desktop, vertical on mobile */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                        {timelineSteps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={step.num}
                                    className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                                        step.active
                                            ? 'bg-white dark:bg-slate-900 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/20'
                                            : 'bg-white/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-white/5 opacity-75'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                                    step.active
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {step.num}
                                            </div>
                                            {step.active ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-primary-300">
                                                    Current step
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                                    Upcoming
                                                </span>
                                            )}
                                        </div>

                                        <h3
                                            className={`font-bold text-sm tracking-tight ${
                                                step.active
                                                    ? 'text-slate-900 dark:text-white'
                                                    : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {step.title}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {step.desc}
                                        </p>
                                    </div>

                                    {step.active && (
                                        <div className="pt-4">
                                            <a
                                                href={registration.auto_login_url}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-600 cursor-pointer"
                                            >
                                                <span>Activate now</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Legal Footer */}
            <LegalFooter className="border-t border-slate-200/80 dark:border-slate-800" />
        </div>
    );
}
