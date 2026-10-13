import React from 'react';
import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';

export interface AuthHeaderProps {
    /** Context label next to the logo, e.g. "Create your clinic" */
    subtitle?: string;
    /** Current step (1-indexed) if multi-step flow */
    step?: number;
    /** Total step count */
    totalSteps?: number;
    /** Label for the current step, e.g. "Clinic details" */
    stepLabel?: string;
    /** Which action button to display on the right */
    rightAction?: 'signin' | 'register' | 'none';
    /** Custom right-side content if overriding */
    customRightContent?: React.ReactNode;
}

export default function AuthHeader({
    subtitle = 'Create your clinic',
    step,
    totalSteps,
    stepLabel,
    rightAction = 'signin',
    customRightContent,
}: AuthHeaderProps) {
    const hasStepper = typeof step === 'number' && typeof totalSteps === 'number' && totalSteps > 0;
    const progressPercent = hasStepper ? Math.min(100, Math.max(0, (step! / totalSteps!) * 100)) : 0;

    return (
        <header className="h-[72px] sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 relative transition-colors duration-200">
            {/* Soft brand gradient bottom line */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-primary via-primary/80 to-secondary opacity-70 dark:opacity-85 pointer-events-none"
            />

            {/* Mobile full-width progress bar under header */}
            {hasStepper && (
                <div
                    aria-hidden="true"
                    className="md:hidden absolute inset-x-0 -bottom-[2px] h-[2px] bg-slate-200/60 dark:bg-slate-800 overflow-hidden"
                >
                    <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}

            {/* Same max-w-7xl container as page content for perfect edge alignment */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
                {/* Left: MedVisit Logo + Subtitle */}
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <Link
                        href="/"
                        className="group flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                        aria-label="MedVisit Home"
                    >
                        {/* Mobile: icon only ~36px */}
                        <ApplicationLogo
                            iconOnly
                            className="h-9 w-9 sm:hidden transition-transform duration-200 group-hover:scale-105"
                        />
                        {/* Desktop: full logo with icon + wordmark ~36px height */}
                        <ApplicationLogo className="hidden sm:block h-9 w-auto transition-transform duration-200 group-hover:scale-105" />
                    </Link>

                    {subtitle && (
                        <>
                            <div className="h-4 w-px bg-slate-300 dark:bg-white/15 shrink-0" aria-hidden="true" />
                            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                                {subtitle}
                            </span>
                        </>
                    )}
                </div>

                {/* Center (Desktop only): Compact Step Indicator */}
                {hasStepper && (
                    <div className="hidden md:flex flex-col items-center justify-center min-w-[200px] shrink-0">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
                            Step {step} of {totalSteps}
                            {stepLabel ? ` · ${stepLabel}` : ''}
                        </span>
                        <div className="w-44 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300 ease-out shadow-xs"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Right: Action & Theme Toggle */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {customRightContent ? (
                        customRightContent
                    ) : rightAction === 'signin' ? (
                        <>
                            <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:inline">
                                Already have a clinic?
                            </span>
                            {/* Mobile text link */}
                            <Link
                                href={route('login')}
                                className="sm:hidden text-xs font-semibold text-primary dark:text-primary-400 hover:underline"
                            >
                                Sign in
                            </Link>
                            {/* Desktop outline/glass secondary button */}
                            <Link
                                href={route('login')}
                                className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary-300 text-xs font-semibold backdrop-blur-md shadow-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                Sign in
                            </Link>
                        </>
                    ) : rightAction === 'register' ? (
                        <>
                            <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:inline">
                                New healthcare practice?
                            </span>
                            {/* Mobile text link */}
                            <Link
                                href={route('register')}
                                className="sm:hidden text-xs font-semibold text-primary dark:text-primary-400 hover:underline"
                            >
                                Register
                            </Link>
                            {/* Desktop outline/glass secondary button */}
                            <Link
                                href={route('register')}
                                className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary-300 text-xs font-semibold backdrop-blur-md shadow-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                Register clinic
                            </Link>
                        </>
                    ) : null}

                    {/* Matching round theme toggle button */}
                    <ThemeToggle size="md" />
                </div>
            </div>
        </header>
    );
}
