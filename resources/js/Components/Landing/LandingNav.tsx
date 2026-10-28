import React from 'react';
import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { User } from '@/types';

interface Props {
    user?: User | null;
    canLogin?: boolean;
    canRegister?: boolean;
    tenantSubdomain?: string;
}

export default function LandingNav({ user, canLogin = true, canRegister = false, tenantSubdomain }: Props) {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-950/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <Link href="/" className="group flex shrink-0 items-center gap-2 rounded-xl" aria-label="MedVisit home">
                        <ApplicationLogo className="h-8 sm:h-9 w-auto transition-transform group-hover:scale-105" />
                    </Link>
                    {tenantSubdomain && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-secondary-50 dark:bg-secondary-950/60 px-3 py-1 text-xs font-semibold text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                            {tenantSubdomain}
                        </span>
                    )}
                </div>

                <nav aria-label="Main" className="flex items-center gap-1.5 sm:gap-3">
                    <Link
                        href="/demo"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-colors bg-teal-500/10 border border-teal-500/20"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        <span>Try demo</span>
                    </Link>

                    {!tenantSubdomain && (
                        <Link
                            href="/pricing"
                            className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary-300 px-3 py-2 rounded-xl transition-colors"
                        >
                            Pricing
                        </Link>
                    )}

                    <ThemeToggle size="sm" />

                    {user ? (
                        <Link
                            href={route('dashboard')}
                            className="rounded-xl bg-primary px-3.5 sm:px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary-600"
                        >
                            Open dashboard
                        </Link>
                    ) : (
                        <>
                            {canLogin && (
                                <Link
                                    href={route('login')}
                                    className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 px-3.5 sm:px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-white dark:hover:bg-slate-800"
                                >
                                    Sign in
                                </Link>
                            )}
                            {canRegister && (
                                <Link
                                    href={route('register')}
                                    className="hidden min-[400px]:inline-flex rounded-xl bg-primary px-3.5 sm:px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary-600"
                                >
                                    Get started
                                </Link>
                            )}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
