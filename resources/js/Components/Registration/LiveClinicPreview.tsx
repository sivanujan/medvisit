import React, { useEffect, useRef, useState } from 'react';
import {
    Building2,
    Lock,
    MapPin,
    Phone,
    ShieldCheck,
    UserCheck,
    CheckCircle2,
    Loader2,
    Check,
    AlertCircle,
    Mail,
    Sparkles,
} from 'lucide-react';
import { usePrefersReducedMotion } from '@/Components/Landing/useLandingMotion';
import './registration.css';

interface SubdomainResult {
    available: boolean;
    reason?: string;
    suggestions?: string[];
}

interface Props {
    step: 1 | 2 | 3 | 4 | 5;
    clinicName: string;
    clinicType: string;
    district: string;
    city: string;
    clinicPhone: string;
    subdomain: string;
    adminName: string;
    adminEmail: string;
    adminMobile: string;
    checkingSubdomain?: boolean;
    subdomainResult?: SubdomainResult | null;
    isVerified?: boolean;
    publicDomain?: string;
    isMobileCollapsible?: boolean;
}

function useColomboClock(active: boolean): string {
    const format = () =>
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Colombo',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(new Date());

    const [time, setTime] = useState(format);

    useEffect(() => {
        if (!active) return;
        const id = window.setInterval(() => setTime(format()), 15000);
        return () => window.clearInterval(id);
    }, [active]);

    return time.toUpperCase();
}

export default function LiveClinicPreview({
    step,
    clinicName,
    clinicType,
    district,
    city,
    clinicPhone,
    subdomain,
    adminName,
    adminEmail,
    adminMobile,
    checkingSubdomain = false,
    subdomainResult = null,
    isVerified = false,
    publicDomain = 'medvisit.lk',
    isMobileCollapsible = false,
}: Props) {
    const stageRef = useRef<HTMLDivElement>(null);
    const reduced = usePrefersReducedMotion();
    const time = useColomboClock(step === 5);

    // Track one-time celebratory reveal when Step 5 is reached
    const [celebrated, setCelebrated] = useState(false);
    useEffect(() => {
        if (step === 5 && !celebrated) {
            setCelebrated(true);
        }
    }, [step, celebrated]);

    // Parallax tilt on desktop hover
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (reduced || !stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        stageRef.current.style.setProperty('--mx', x.toFixed(3));
        stageRef.current.style.setProperty('--my', y.toFixed(3));
    };

    const onMouseLeave = () => {
        if (!stageRef.current) return;
        stageRef.current.style.setProperty('--mx', '0');
        stageRef.current.style.setProperty('--my', '0');
    };

    // Fallbacks and initials
    const rawClinic = clinicName.trim();
    const displayClinic = rawClinic || 'Your Clinic';
    const clinicInitial = rawClinic ? rawClinic.charAt(0).toUpperCase() : 'M';
    const displaySubdomain = subdomain.trim().toLowerCase();

    const rawAdmin = adminName.trim();
    const displayAdmin = rawAdmin || 'Clinic Administrator';
    const adminInitial = rawAdmin ? rawAdmin.charAt(0).toUpperCase() : 'A';

    const locationText = [city.trim(), district ? `${district} District` : ''].filter(Boolean).join(', ');

    // STEP 5: Wall-mounted TV Display mockup
    if (step === 5) {
        return (
            <div
                ref={stageRef}
                className="reg-stage w-full max-w-[34rem] mx-auto select-none"
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
            >
                <div className="reg-preview-box">
                    <div className="rounded-[1.4rem] p-2 bg-gradient-to-br from-[#1d2433] via-[#0a0e16] to-[#151b27] shadow-2xl border border-slate-700/60 relative overflow-hidden">
                        {/* Celebratory reveal: one-time light sweep */}
                        {!reduced && celebrated && <div className="reg-sweep-flare" aria-hidden="true" />}

                        {/* TV Screen */}
                        <div className="relative rounded-xl overflow-hidden aspect-[16/10] flex flex-col justify-between bg-radial from-[#1E6FD9]/45 via-[#0A1830] to-[#040812] text-[#eef4ff] p-4 sm:p-5 shadow-inner">
                            {/* Screen Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white text-[#1E6FD9] flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                                        {clinicInitial}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-white tracking-tight truncate">
                                            {displayClinic}
                                        </p>
                                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Live Queue Display
                                        </p>
                                    </div>
                                </div>
                                <span className="font-mono text-xs font-semibold tracking-wider text-slate-300 tabular-nums">
                                    {time}
                                </span>
                            </div>

                            {/* Screen Body */}
                            <div className="my-auto py-2 grid grid-cols-12 gap-3 items-center">
                                {/* Now Serving */}
                                <div className="col-span-7">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                        NOW SERVING
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-5xl sm:text-6xl font-black text-[#FF7A59] tracking-tight leading-none drop-shadow-[0_0_20px_rgba(255,122,89,0.5)]">
                                            01
                                        </div>
                                    </div>
                                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15">
                                        Room 1 · Consultation
                                    </span>
                                </div>

                                {/* Up Next Column */}
                                <div className="col-span-5 text-right space-y-1.5 border-l border-white/10 pl-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        UP NEXT
                                    </span>
                                    <div className="flex flex-col items-end gap-1.5 font-mono text-sm font-bold text-slate-200">
                                        <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-white w-16 text-center">
                                            02
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300 w-16 text-center">
                                            03
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Screen Footer */}
                            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-mono text-slate-300 truncate">
                                    https://{displaySubdomain || 'yourclinic'}.{publicDomain}
                                </span>
                                <span className="text-emerald-400 font-bold shrink-0">
                                    Ready to Launch
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {!isMobileCollapsible && (
                    <div className="mt-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Sparkles className="w-3.5 h-3.5 text-[#0E9E8F]" />
                            <span>Your waiting-room queue monitor will be live at launch</span>
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // STEPS 2, 3, 4: Browser Window Mockup Frame
    // (Step 1 is the standalone glass card, steps 2-4 wrap the card inside the browser window)
    const showBrowserChrome = step >= 2;

    const previewContent = (
        <div className="space-y-4">
            {/* Clinic Card Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Clinic Initial Logo Badge */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-primary/25 shrink-0 transition-transform duration-300">
                        {clinicInitial}
                    </div>
                    <div className="min-w-0 space-y-1">
                        {rawClinic ? (
                            <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight truncate">
                                {rawClinic}
                            </h3>
                        ) : (
                            <div className="h-5 w-36 reg-shimmer-line" />
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="capitalize font-medium">
                                {clinicType || 'Medical Centre'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="font-medium text-[#0E9E8F] dark:text-[#14b8a6]">
                                Sri Lanka
                            </span>
                        </div>
                    </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300 border border-primary/20 shrink-0">
                    Step {step} Preview
                </span>
            </div>

            {/* Clinic Details Grid */}
            <div className="space-y-2 text-xs">
                {/* Location */}
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {locationText ? (
                        <span className="truncate">{locationText}</span>
                    ) : (
                        <div className="h-4 w-40 reg-shimmer-line" />
                    )}
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {clinicPhone && clinicPhone.length > 3 ? (
                        <span className="font-mono">{clinicPhone}</span>
                    ) : (
                        <div className="h-4 w-28 reg-shimmer-line" />
                    )}
                </div>
            </div>

            {/* Step 3 & 4: Admin Profile Chip */}
            {step >= 3 && (
                <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0E9E8F] to-[#1E6FD9] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                    {adminInitial}
                                </div>
                                <div className="min-w-0">
                                    {rawAdmin ? (
                                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                            {rawAdmin}
                                        </p>
                                    ) : (
                                        <div className="h-3.5 w-28 reg-shimmer-line mb-1" />
                                    )}
                                    <span className="inline-block text-[10px] font-semibold text-[#0E9E8F] dark:text-[#14b8a6]">
                                        Clinic Owner
                                    </span>
                                </div>
                            </div>

                            {/* Verification Badge (Step 4) */}
                            {step >= 4 && (
                                <div>
                                    {isVerified ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            <span>Verified</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                            <Mail className="w-3 h-3" />
                                            <span>Awaiting Code</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Admin Email & Mobile */}
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                            {adminEmail ? (
                                <p className="truncate font-mono">{adminEmail}</p>
                            ) : (
                                <div className="h-3 w-44 reg-shimmer-line" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Practice Specifications Chips */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1E6FD9] shrink-0" />
                    <div className="truncate">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Currency</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">LKR (Rs.)</p>
                    </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0E9E8F] shrink-0" />
                    <div className="truncate">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Timezone</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Asia/Colombo</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div
            ref={stageRef}
            className="reg-stage w-full max-w-[32rem] mx-auto select-none"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <div className="reg-preview-box">
                {showBrowserChrome ? (
                    /* Step 2, 3, 4: Browser Window Mockup */
                    <div className="rounded-3xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden transition-all duration-300">
                        {/* Chrome Top Bar */}
                        <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-3">
                            {/* macOS Window Dots */}
                            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A59]/85" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/85" />
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0E9E8F]/85" />
                            </div>

                            {/* Live Address Bar */}
                            <div className="flex-1 min-w-0 h-8 px-3 rounded-full bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-white/10 flex items-center justify-between gap-2 text-xs font-mono">
                                <div className="flex items-center gap-1.5 truncate">
                                    <Lock className="w-3 h-3 text-[#0E9E8F] shrink-0" />
                                    <span className="text-slate-400">https://</span>
                                    <span className="font-bold text-[#1E6FD9] dark:text-[#3b82f6] truncate">
                                        {displaySubdomain || 'yourclinic'}
                                    </span>
                                    <span className="text-slate-400">.{publicDomain}</span>
                                    <span className="reg-caret" aria-hidden="true" />
                                </div>

                                {/* Availability Indicator Badge */}
                                <div className="shrink-0 flex items-center">
                                    {checkingSubdomain && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                                            <Loader2 className="w-3 h-3 animate-spin text-[#1E6FD9]" />
                                            <span className="hidden sm:inline">Checking</span>
                                        </span>
                                    )}

                                    {!checkingSubdomain && subdomainResult && (
                                        <>
                                            {subdomainResult.available ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                    <Check className="w-3 h-3" />
                                                    <span>Available</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                    <AlertCircle className="w-3 h-3" />
                                                    <span>Taken</span>
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Viewport content */}
                        <div className="p-5 sm:p-6 bg-radial from-primary/5 dark:from-primary/10 to-transparent">
                            {previewContent}
                        </div>
                    </div>
                ) : (
                    /* Step 1: Standalone Glass Clinic Card */
                    <div className="rounded-3xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl p-6 transition-all duration-300">
                        {previewContent}
                    </div>
                )}
            </div>

            {!isMobileCollapsible && (
                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Live preview updates as you type · Your clinic address will be{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {displaySubdomain || 'yourclinic'}.{publicDomain}
                        </strong>
                    </p>
                </div>
            )}
        </div>
    );
}
