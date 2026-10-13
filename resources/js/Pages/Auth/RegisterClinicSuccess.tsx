import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Sparkles,
    Check,
    Copy,
    ArrowRight,
    ExternalLink,
    ShieldCheck,
    CheckCircle2,
    Users,
    Calendar,
    Globe,
    Stethoscope,
    Ticket,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import AuthHeader from '@/Components/AuthHeader';

interface Props {
    registration: {
        clinic_name: string;
        subdomain: string;
        clinic_url: string;
        auto_login_url: string;
        trial_ends_at: string;
        admin_email: string;
        clinic_type?: string;
        district?: string;
    };
}

export default function RegisterClinicSuccess({ registration }: Props) {
    const [copied, setCopied] = useState(false);

    const copyUrl = () => {
        navigator.clipboard.writeText(registration.clinic_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // Format clinic name with proper capitalization
    const clinicName = registration.clinic_name?.trim() || 'Your Clinic';
    const capitalizedClinicName =
        clinicName.charAt(0).toUpperCase() + clinicName.slice(1);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative selection:bg-primary-100 selection:text-primary-800 overflow-x-hidden">
            <Head title={`${capitalizedClinicName} is ready - MedVisit`} />

            {/* Subtle Ambient Background Glows */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 left-1/4 w-[42rem] h-[32rem] rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-[120px]" />
                <div className="absolute top-1/3 -right-20 w-[36rem] h-[36rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-[130px]" />
                <div className="absolute -bottom-24 left-1/3 w-[32rem] h-[32rem] rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-[100px]" />
            </div>

            {/* Shared Header */}
            <AuthHeader
                subtitle="Registration complete"
                rightAction="none"
            />

            {/* Main Content Card */}
            <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center my-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center"
                >
                    {/* Celebratory Icon */}
                    <div className="flex justify-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                            className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-secondary to-primary text-white flex items-center justify-center shadow-lg shadow-secondary/30 relative"
                        >
                            <Sparkles className="w-8 h-8" />
                            <div className="absolute -inset-1 rounded-3xl bg-secondary/30 -z-10 animate-ping opacity-40" />
                        </motion.div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-secondary px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                            Registration Complete • Email Verified
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2">
                            {capitalizedClinicName} is ready
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                            Your isolated clinic workspace has been created with Sri Lankan rupees (LKR), daily token resets, and doctor consultation rooms.
                        </p>
                    </div>

                    {/* Clinic Address URL Box - High Contrast in Light & Dark */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700 text-left space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5 font-bold">
                                <Globe className="w-4 h-4 text-primary" />
                                Your Clinic Web Address
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                Active • 14-Day Trial
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs sm:text-sm">
                            <span className="text-primary-700 dark:text-primary-400 font-bold break-all select-all">
                                {registration.clinic_url}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={copyUrl}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-sans font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied</span>
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
                                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-600 text-xs font-sans font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shadow-primary/20"
                                >
                                    <span>Open</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps Checklist Box - High Contrast in Light & Dark */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-3.5">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            <span className="flex items-center gap-1.5 text-primary">
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                Next Steps Checklist
                            </span>
                            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 lowercase">
                                3 quick tasks
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 dark:bg-primary-500/20 text-primary dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                    <Stethoscope className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        1. Add doctors & consultation rooms
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                                        Create doctor profiles, specify specialties, and assign consultation rooms for patient queues.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                                <div className="w-6 h-6 rounded-lg bg-secondary/10 dark:bg-secondary-500/20 text-secondary dark:text-secondary-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        2. Set clinic session schedule
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                                        Configure morning and evening channeling slots with doctor times and maximum patient capacities.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                                <div className="w-6 h-6 rounded-lg bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                    <Ticket className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        3. Invite reception staff & issue tokens
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                                        Grant front-desk receptionists access to check in walk-in patients and issue live queue tokens.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Primary Instant Auto-Login Button */}
                    <div className="pt-2 space-y-3">
                        <a
                            href={registration.auto_login_url}
                            className="w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-primary via-primary-600 to-secondary hover:shadow-xl shadow-lg shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
                        >
                            <span>Go to Clinic Dashboard</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </a>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            You will be securely logged in via a signed single-use link. Bookmark your clinic address for future logins.
                        </p>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800">
                &copy; {new Date().getFullYear()} MedVisit Inc. Sri Lanka. Secure healthcare practice management.
            </footer>
        </div>
    );
}

