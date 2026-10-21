import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Calendar,
    Users,
    Receipt,
    Shield,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    Clock,
    Activity,
    Layers,
    Building2,
    Stethoscope,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { GlassCard } from '@/Components/UI/GlassCard';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import LegalFooter from '@/Components/Public/LegalFooter';
import { PageProps } from '@/types';

interface Props extends PageProps {
    isCentral?: boolean;
    tenant?: {
        id: string;
        name: string;
        subdomain: string;
        plan: string;
        status: string;
    };
    canLogin?: boolean;
    canRegister?: boolean;
}

export default function Welcome({
    auth,
    tenant,
    isCentral,
    canLogin = true,
    canRegister = false,
}: Props) {
    const isTenant = !!tenant;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary-100 selection:text-primary-800 relative overflow-hidden">
            <Head
                title={
                    isTenant
                        ? `${tenant.name} - MedVisit Clinic Portal`
                        : 'MedVisit - Modern Healthcare & Clinic Management SaaS'
                }
            />

            {/* Ambient Background Glow Layer */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-primary-500/15 dark:bg-primary-500/20 blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-secondary-500/15 dark:bg-secondary-500/20 blur-3xl" />
                <div className="absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-accent-500/10 dark:bg-accent-500/15 blur-3xl" />
            </div>

            {/* Sticky Glass Navbar */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="group flex items-center gap-2">
                            <ApplicationLogo className="h-9 w-auto transition-transform group-hover:scale-105" />
                        </Link>
                        {isTenant && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-50 dark:bg-secondary-950/60 px-3 py-1 text-xs font-semibold text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                                {tenant.subdomain}.medvisit.test
                            </span>
                        )}
                    </div>

                    <nav className="flex items-center gap-3">
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary px-3 py-2 rounded-xl transition-colors"
                        >
                            <span>Pricing</span>
                        </Link>

                        <Link
                            href="/dev/components"
                            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-300 px-3 py-2 rounded-xl transition-colors"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>UI Showcase</span>
                        </Link>

                        <ThemeToggle size="sm" />

                        {auth?.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm shadow-primary/30 transition hover:bg-primary-600 focus:outline-none"
                            >
                                Open Dashboard
                            </Link>
                        ) : (
                            <>
                                {canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-xs transition hover:bg-white dark:hover:bg-slate-800"
                                    >
                                        Sign In
                                    </Link>
                                )}
                                {canRegister && (
                                    <Link
                                        href={route('register')}
                                        className="rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm shadow-primary/30 transition hover:bg-primary-600 focus:outline-none"
                                    >
                                        Get Started
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
                {isTenant ? (
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-secondary-500/10 border border-secondary-500/25 px-4 py-1.5 text-xs font-bold text-secondary-800 dark:text-secondary-300 mb-6">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            <span>Clinic Workspace Active &bull; Plan: {tenant.plan.toUpperCase()}</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                            Welcome to <span className="text-primary">{tenant.name}</span>
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
                            Doctor consultation management, patient token queues, digital medical records, and local LKR billing.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            {canLogin && (
                                <Link
                                    href={route('login')}
                                    className="rounded-2xl bg-gradient-to-r from-primary to-primary-600 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:shadow-xl hover:from-primary-600 hover:to-primary-700 flex items-center gap-2"
                                >
                                    <span>Clinic Staff Sign In</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                            <a
                                href="http://medvisit.test"
                                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-xs transition hover:bg-white dark:hover:bg-slate-800"
                            >
                                &larr; MedVisit Platform
                            </a>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Central SaaS Hero */}
                        <div className="text-center max-w-4xl mx-auto">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 border border-primary-500/25 px-4 py-1.5 text-xs font-bold text-primary dark:text-primary-300 mb-6 backdrop-blur-md">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Engineered for Sri Lankan Clinics & Practices</span>
                            </div>
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                                Calm, intelligent <br className="hidden sm:inline" />
                                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                                    clinic software
                                </span>{' '}
                                that doctors love.
                            </h1>
                            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                                Replace chaotic waiting rooms with live token queues, seamless OPD sessions, electronic prescriptions, and LKR receipts.
                            </p>

                            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                                <a
                                    href="http://demo.medvisit.test"
                                    className="rounded-2xl bg-gradient-to-r from-primary to-secondary px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                                >
                                    <span>Launch Demo Clinic</span>
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                                {canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-xs transition hover:bg-white dark:hover:bg-slate-800"
                                    >
                                        Platform Sign In
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Interactive UI Preview Showcase Card */}
                        <div className="mt-14 max-w-5xl mx-auto">
                            <GlassCard className="p-6 sm:p-8 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200/70 dark:border-white/10 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-900/50 text-primary flex items-center justify-center">
                                            <Stethoscope className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                                Live Consultation Roster & Token Queue
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Session OPD-104 &bull; Dr. K. Sivanujan (Consultant Physician)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status="in_consultation" pulse label="In Session" />
                                        <StatusBadge status="open" label="Queue Open" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Currently Called</p>
                                        <p className="text-3xl font-extrabold text-primary mt-1">#14</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Mrs. R. Fernando</p>
                                        <div className="mt-3">
                                            <StatusBadge status="called" label="Room 02" pulse />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Waiting in Lobby</p>
                                        <p className="text-3xl font-extrabold text-secondary mt-1">8</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Estimated wait ~15 mins</p>
                                        <div className="mt-3">
                                            <StatusBadge status="waiting" label="Next: #15 (Mr. Silva)" />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed Consults</p>
                                        <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">13</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Total registered: 21</p>
                                        <div className="mt-3">
                                            <StatusBadge status="completed" label="EHR Synced" />
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Feature Highlights Grid */}
                        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
                            <GlassCard hover className="p-6">
                                <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary flex items-center justify-center font-bold text-sm mb-4">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
                                    Doctor Sessions
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Schedule doctors, configure consultation durations, and control OPD slot quotas.
                                </p>
                            </GlassCard>

                            <GlassCard hover className="p-6">
                                <div className="w-10 h-10 rounded-2xl bg-secondary-100 dark:bg-secondary-950/60 text-secondary flex items-center justify-center font-bold text-sm mb-4">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
                                    Live Token Queue
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Real-time waiting lobby display with SMS alerts and token call chime.
                                </p>
                            </GlassCard>

                            <GlassCard hover className="p-6">
                                <div className="w-10 h-10 rounded-2xl bg-accent-100 dark:bg-accent-950/60 text-accent flex items-center justify-center font-bold text-sm mb-4">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
                                    Patient Records
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Append-only medical audit trails, consultation history, and prescription records.
                                </p>
                            </GlassCard>

                            <GlassCard hover className="p-6">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1.5">
                                    LKR Billing
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Clean Sri Lankan Rupee receipt printing, doctor share tracking, and invoice logs.
                                </p>
                            </GlassCard>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <LegalFooter className="mt-20" />
        </div>
    );
}
