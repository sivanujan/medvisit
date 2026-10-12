import ApplicationLogo from '@/Components/ApplicationLogo';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

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
        <>
            <Head title={isTenant ? `${tenant.name} - MedVisit` : 'MedVisit - Sri Lankan Clinic Management SaaS'} />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 text-slate-800 antialiased font-sans">
                {/* Header Navbar */}
                <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-md">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <ApplicationLogo className="h-10 w-auto" />
                            {isTenant && (
                                <span className="inline-flex items-center rounded-full bg-secondary-50 px-3 py-1 text-xs font-semibold text-secondary-700 ring-1 ring-inset ring-secondary-600/20">
                                    {tenant.subdomain}.medvisit.test
                                </span>
                            )}
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    {canLogin && (
                                        <Link
                                            href={route('login')}
                                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-400 hover:text-primary focus:outline-none"
                                        >
                                            Log in
                                        </Link>
                                    )}
                                    {canRegister && (
                                        <Link
                                            href={route('register')}
                                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none"
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
                <main className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
                    {isTenant ? (
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-50 px-4 py-1.5 text-xs font-semibold text-secondary-700 ring-1 ring-inset ring-secondary-600/20 mb-6">
                                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                                Clinic Portal Active &bull; Plan: {tenant.plan.toUpperCase()}
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                                Welcome to <span className="text-primary">{tenant.name}</span>
                            </h1>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                                Doctor consultation sessions, patient token queue, digital records, and invoicing in Sri Lankan Rupees (LKR).
                            </p>

                            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                                {canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-primary-600 focus:outline-none"
                                    >
                                        Staff Portal Login
                                    </Link>
                                )}
                                <a
                                    href="http://medvisit.test"
                                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                    &larr; Central Platform
                                </a>
                            </div>

                            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-slate-900">Doctor Sessions</h3>
                                    <p className="mt-1 text-sm text-slate-500">Live scheduling, OPD consultations, and session timings.</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-50 text-secondary">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-slate-900">Token Queue</h3>
                                    <p className="mt-1 text-sm text-slate-500">Real-time waiting queue management with SMS token alerts.</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-slate-900">Records & Billing</h3>
                                    <p className="mt-1 text-sm text-slate-500">Secure electronic health records and fast LKR receipt generation.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-primary-600/20 mb-6">
                                <span className="h-2 w-2 rounded-full bg-primary"></span>
                                Multi-Tenant SaaS Platform &bull; Sri Lanka
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                                Modern clinic management, <br />
                                built for <span className="text-primary">Sri Lankan</span> healthcare.
                            </h1>
                            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
                                Doctor sessions, live token queues, patient records, and billing with single-database multi-tenancy.
                            </p>

                            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                                <a
                                    href="http://demo.medvisit.test"
                                    className="rounded-xl bg-secondary px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-secondary-600 focus:outline-none"
                                >
                                    Open Demo Clinic Subdomain &rarr;
                                </a>
                                {canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                    >
                                        Central Portal Login
                                    </Link>
                                )}
                            </div>

                            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-4">
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm text-left">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary font-bold">01</div>
                                    <h3 className="mt-3 text-base font-semibold text-slate-900">Doctor Sessions</h3>
                                    <p className="mt-1 text-xs text-slate-500">Flexible roster and patient slot booking.</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm text-left">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-50 text-secondary font-bold">02</div>
                                    <h3 className="mt-3 text-base font-semibold text-slate-900">Token Queue</h3>
                                    <p className="mt-1 text-xs text-slate-500">Live TV queue screen and token alerts.</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm text-left">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent font-bold">03</div>
                                    <h3 className="mt-3 text-base font-semibold text-slate-900">Patient Records</h3>
                                    <p className="mt-1 text-xs text-slate-500">Complete clinical history and prescriptions.</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm text-left">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800 font-bold">04</div>
                                    <h3 className="mt-3 text-base font-semibold text-slate-900">LKR Billing</h3>
                                    <p className="mt-1 text-xs text-slate-500">Invoicing customized for Sri Lankan clinics.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="border-t border-slate-100 bg-white py-8 text-center text-xs text-slate-400">
                    <p>&copy; {new Date().getFullYear()} MedVisit. All rights reserved. Sri Lanka.</p>
                </footer>
            </div>
        </>
    );
}
