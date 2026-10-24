import React from 'react';
import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';

export default function RegistrationHeader() {
    return (
        <header className="w-full bg-transparent relative z-30 transition-colors duration-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
                {/* Brand Logo */}
                <Link
                    href="/"
                    className="group flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="MedVisit Home"
                >
                    <ApplicationLogo className="h-8 sm:h-9 w-auto transition-transform group-hover:scale-105" />
                </Link>

                {/* Right: Sign in link + Theme Toggle */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <span className="hidden sm:inline text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Already have a clinic?
                    </span>
                    <Link
                        href={route('login')}
                        className="inline-flex items-center justify-center h-9 px-3.5 sm:px-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary-300 text-xs font-semibold backdrop-blur-md shadow-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Sign in
                    </Link>

                    <div className="shrink-0 flex items-center">
                        <ThemeToggle size="md" />
                    </div>
                </div>
            </div>
        </header>
    );
}
