import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import LegalFooter from '@/Components/Public/LegalFooter';
import LandingNav from '@/Components/Landing/LandingNav';
import LandingPage from '@/Components/Landing/LandingPage';
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
    canLogin = true,
    canRegister = false,
}: Props) {
    if (!tenant) {
        return (
            <>
                <Head title="MedVisit - Token queues and clinic management for Sri Lanka" />
                <LandingPage canLogin={canLogin} canRegister={canRegister} />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary-100 selection:text-primary-800 relative overflow-hidden">
            <Head title={`${tenant.name} - MedVisit Clinic Portal`} />

            {/* Ambient Background Glow Layer */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-primary-500/15 dark:bg-primary-500/20 blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-secondary-500/15 dark:bg-secondary-500/20 blur-3xl" />
                <div className="absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-accent-500/10 dark:bg-accent-500/15 blur-3xl" />
            </div>

            <LandingNav
                user={auth?.user}
                canLogin={canLogin}
                canRegister={canRegister}
                tenantSubdomain={`${tenant.subdomain}.medvisit.test`}
            />

            <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-20">
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
            </main>

            {/* Footer */}
            <LegalFooter className="mt-20" />
        </div>
    );
}
