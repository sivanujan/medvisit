import React, { PropsWithChildren } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-primary-100 selection:text-primary-800 overflow-hidden">
            {/* Ambient Background Glow */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-500/15 dark:bg-primary-500/20 blur-3xl" />
                <div className="absolute top-1/2 -right-32 w-[28rem] h-[28rem] rounded-full bg-secondary-500/15 dark:bg-secondary-500/20 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-accent-500/10 dark:bg-accent-500/15 blur-3xl" />
            </div>

            {/* Top Right Theme Toggle & Home Link */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-20">
                <Link
                    href="/"
                    className="text-xs font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-300 transition-colors"
                >
                    Back to MedVisit
                </Link>
                <ThemeToggle size="sm" />
            </div>

            {/* Logo */}
            <div className="mb-6 flex flex-col items-center">
                <Link href="/" className="group inline-flex items-center gap-2">
                    <ApplicationLogo className="h-10 sm:h-12 w-auto transition-transform group-hover:scale-105" />
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Modern Healthcare Practice & Clinic SaaS
                </p>
            </div>

            {/* Glass Container Card */}
            <div className="w-full sm:max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl dark:shadow-2xl">
                {children}
            </div>

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                &copy; {new Date().getFullYear()} MedVisit Inc. Sri Lanka. Secure & Compliant.
            </p>
        </div>
    );
}
