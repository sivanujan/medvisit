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
    Mail,
    Building2,
    Calendar,
    Globe,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';

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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative selection:bg-primary-100 selection:text-primary-800 overflow-hidden">
            {/* Ambient Background Glow */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-secondary-500/15 dark:bg-secondary-500/20 blur-3xl" />
                <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-primary-500/15 dark:bg-primary-500/20 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-accent-500/10 dark:bg-accent-500/15 blur-3xl" />
            </div>

            {/* Header */}
            <header className="h-18 px-4 sm:px-8 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl">
                <Link href="/" className="group flex items-center gap-2">
                    <ApplicationLogo className="h-8 sm:h-9 w-auto transition-transform group-hover:scale-105" />
                </Link>
                <ThemeToggle size="sm" />
            </header>

            {/* Main Content Card */}
            <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full p-6 sm:p-10 rounded-3xl bg-white/85 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-6 text-center"
                >
                    {/* Celebratory Icon (Subtle Breathing Motion) */}
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
                        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
                            Registration Complete • Ayubowan!
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2">
                            {registration.clinic_name} is Ready
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            Your isolated clinic workspace has been created with Sri Lankan rupees (LKR), daily token resets, and doctor consultation rooms.
                        </p>
                    </div>

                    {/* Clinic Address URL Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-left space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-primary" />
                                Your Clinic Web Address
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                Active • 14-Day Trial
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 font-mono text-xs sm:text-sm">
                            <span className="text-primary font-bold truncate mr-2">
                                {registration.clinic_url}
                            </span>
                            <button
                                type="button"
                                onClick={copyUrl}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-sans font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
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
                        </div>
                    </div>

                    {/* Email Verification Banner */}
                    <div className="p-3.5 rounded-2xl bg-primary-50/80 dark:bg-primary-950/40 border border-primary-500/20 text-left flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                                Verification Email Sent
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                We sent a confirmation link to <strong className="text-slate-700 dark:text-slate-200">{registration.admin_email}</strong>. Unverified admins can still explore and use the clinic, but staff invitations remain restricted until verified.
                            </p>
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

                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            You will be securely logged in via a signed single-use link. Bookmark your clinic address for future logins.
                        </p>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200/50 dark:border-white/5">
                &copy; {new Date().getFullYear()} MedVisit Inc. Sri Lanka. Secure healthcare practice management.
            </footer>
        </div>
    );
}
