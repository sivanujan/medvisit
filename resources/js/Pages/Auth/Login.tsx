import React, { FormEventHandler, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock,
    LogIn,
    ArrowRight,
    Globe,
    Building2,
    Shield,
    CheckCircle2,
    Search,
    Send,
    ArrowLeft,
    Sparkles,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import {
    GlassLabel,
    GlassInput,
    GlassError,
    GlassCheckbox,
} from '@/Components/UI/FormControls';

interface Props {
    status?: string;
    canResetPassword?: boolean;
    showDemoCredentials?: boolean;
}

export default function Login({
    status,
    canResetPassword = false,
    showDemoCredentials = false,
}: Props) {
    // Mode: 'find' (Find Your Clinic) vs 'admin' (Platform Admin Login)
    const [mode, setMode] = useState<'find' | 'admin'>('find');

    // Subdomain form
    const subdomainForm = useForm({
        subdomain: '',
    });

    // Email lookup form
    const emailLookupForm = useForm({
        email: '',
    });

    // Admin login form
    const adminForm = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submitSubdomain: FormEventHandler = (e) => {
        e.preventDefault();
        subdomainForm.post(route('find.clinic.subdomain'));
    };

    const submitEmailLookup: FormEventHandler = (e) => {
        e.preventDefault();
        emailLookupForm.post(route('find.clinic.email'), {
            onSuccess: () => emailLookupForm.reset(),
        });
    };

    const submitAdmin: FormEventHandler = (e) => {
        e.preventDefault();
        adminForm.post(route('login'), {
            onFinish: () => adminForm.reset('password'),
        });
    };

    const fillDemo = (email: string) => {
        adminForm.setData({
            email,
            password: 'Password123!',
            remember: false,
        });
    };

    const currentSubdomain = subdomainForm.data.subdomain.trim().toLowerCase() || 'your-clinic';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-primary-100 selection:text-primary-800">
            <Head title={mode === 'find' ? 'Find Your Clinic • MedVisit' : 'Platform Admin Sign In'} />

            {/* Ambient Background Glow */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-500/15 dark:bg-primary-500/20 blur-3xl" />
                <div className="absolute top-1/2 -right-32 w-[30rem] h-[30rem] rounded-full bg-secondary-500/15 dark:bg-secondary-500/20 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-accent-500/10 dark:bg-accent-500/15 blur-3xl" />
            </div>

            {/* Header */}
            <header className="h-18 px-4 sm:px-8 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
                <Link href="/" className="group flex items-center gap-2">
                    <ApplicationLogo className="h-8 sm:h-9 w-auto transition-transform group-hover:scale-105" />
                </Link>
                <div className="flex items-center gap-4">
                    <Link
                        href={route('register')}
                        className="text-xs font-bold text-primary hover:underline hidden sm:inline"
                    >
                        Register a New Clinic
                    </Link>
                    <ThemeToggle size="sm" />
                </div>
            </header>

            {/* Main Content: Split Desktop Layout */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Forms */}
                <div className="lg:col-span-7 max-w-lg mx-auto w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl space-y-6"
                    >
                        {/* Status Flash Messages */}
                        {status && (
                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                                <span>{status}</span>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* MODE 1: FIND YOUR CLINIC */}
                            {mode === 'find' && (
                                <motion.div
                                    key="find"
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                            Find Your Clinic
                                        </h1>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Enter your clinic address or search by your work email to access your MedVisit workspace.
                                        </p>
                                    </div>

                                    {/* Option 1: Enter Subdomain */}
                                    <form onSubmit={submitSubdomain} className="space-y-3">
                                        <GlassLabel htmlFor="subdomain" required>
                                            Clinic Address / Subdomain
                                        </GlassLabel>
                                        <div className="relative flex rounded-xl border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                                            <input
                                                id="subdomain"
                                                type="text"
                                                value={subdomainForm.data.subdomain}
                                                placeholder="e.g. ruhunu"
                                                autoFocus
                                                onChange={(e) =>
                                                    subdomainForm.setData(
                                                        'subdomain',
                                                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                                    )
                                                }
                                                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none bg-transparent"
                                            />
                                            <span className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 text-xs font-mono text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-white/10 flex items-center shrink-0">
                                                .medvisit.lk
                                            </span>
                                        </div>
                                        <GlassError message={subdomainForm.errors.subdomain} />

                                        <button
                                            type="submit"
                                            disabled={subdomainForm.processing || !subdomainForm.data.subdomain}
                                            className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                            <span>
                                                {subdomainForm.processing
                                                    ? 'Locating Clinic...'
                                                    : 'Go to Clinic Sign In'}
                                            </span>
                                        </button>
                                    </form>

                                    {/* Divider */}
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200 dark:border-white/10" />
                                        </div>
                                        <span className="relative px-3 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Don't remember your clinic URL?
                                        </span>
                                    </div>

                                    {/* Option 2: Search by Email */}
                                    <form onSubmit={submitEmailLookup} className="space-y-3">
                                        <GlassLabel htmlFor="lookup_email">
                                            Search by Your Registered Work Email
                                        </GlassLabel>
                                        <GlassInput
                                            id="lookup_email"
                                            type="email"
                                            value={emailLookupForm.data.email}
                                            placeholder="doctor@hospital.lk"
                                            icon={<Mail className="w-4 h-4" />}
                                            error={!!emailLookupForm.errors.email}
                                            onChange={(e) => emailLookupForm.setData('email', e.target.value)}
                                        />
                                        <GlassError message={emailLookupForm.errors.email} />

                                        <button
                                            type="submit"
                                            disabled={emailLookupForm.processing || !emailLookupForm.data.email}
                                            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>
                                                {emailLookupForm.processing
                                                    ? 'Searching...'
                                                    : 'Email Me Clinic Access Links'}
                                            </span>
                                        </button>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                                            For security and privacy, clinic memberships are never displayed on-screen.
                                        </p>
                                    </form>

                                    {/* Footer Switcher */}
                                    <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <Link
                                            href={route('register')}
                                            className="font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <span>Register a Clinic</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => setMode('admin')}
                                            className="text-[11px] font-semibold text-slate-400 hover:text-primary dark:hover:text-primary-300 transition-colors cursor-pointer"
                                        >
                                            Platform Admin Login &rarr;
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* MODE 2: PLATFORM ADMIN LOGIN */}
                            {mode === 'admin' && (
                                <motion.div
                                    key="admin"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-primary" />
                                                Platform Admin
                                            </h1>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Central MedVisit system administration access.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setMode('find')}
                                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            <span>Find Clinic</span>
                                        </button>
                                    </div>

                                    <form onSubmit={submitAdmin} className="space-y-4">
                                        <div>
                                            <GlassLabel htmlFor="admin_email" required>
                                                Email Address
                                            </GlassLabel>
                                            <GlassInput
                                                id="admin_email"
                                                type="email"
                                                name="email"
                                                value={adminForm.data.email}
                                                placeholder="superadmin@medvisit.test"
                                                icon={<Mail className="w-4 h-4" />}
                                                error={!!adminForm.errors.email}
                                                autoComplete="username"
                                                autoFocus
                                                onChange={(e) => adminForm.setData('email', e.target.value)}
                                            />
                                            <GlassError message={adminForm.errors.email} />
                                        </div>

                                        <div>
                                            <GlassLabel htmlFor="admin_password" required>
                                                Password
                                            </GlassLabel>
                                            <GlassInput
                                                id="admin_password"
                                                type="password"
                                                name="password"
                                                value={adminForm.data.password}
                                                placeholder="••••••••••••"
                                                icon={<Lock className="w-4 h-4" />}
                                                error={!!adminForm.errors.password}
                                                autoComplete="current-password"
                                                onChange={(e) => adminForm.setData('password', e.target.value)}
                                            />
                                            <GlassError message={adminForm.errors.password} />
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <GlassCheckbox
                                                id="remember"
                                                label="Remember this device"
                                                checked={adminForm.data.remember}
                                                onChange={(e) => adminForm.setData('remember', e.target.checked)}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={adminForm.processing}
                                            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <LogIn className="w-4 h-4" />
                                            <span>{adminForm.processing ? 'Signing in...' : 'Sign In'}</span>
                                        </button>
                                    </form>

                                    {/* Quick Demo Credentials Autofill (Strictly Local Environment) */}
                                    {showDemoCredentials && (
                                        <div className="pt-4 border-t border-slate-200/70 dark:border-white/10">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                                Local Dev Accounts (1-Click Fill)
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fillDemo('superadmin@medvisit.test')}
                                                    className="p-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer"
                                                >
                                                    <span className="block text-primary font-bold">Super Admin</span>
                                                    <span className="block truncate text-[10px] text-slate-400">
                                                        superadmin@medvisit.test
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fillDemo('clinicadmin@medvisit.test')}
                                                    className="p-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer"
                                                >
                                                    <span className="block text-secondary font-bold">Clinic Admin</span>
                                                    <span className="block truncate text-[10px] text-slate-400">
                                                        clinicadmin@medvisit.test
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Right Column: Live Animated Clinic URL Preview */}
                <div className="hidden lg:block lg:col-span-5">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="p-8 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden"
                    >
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
                                Subdomain Routing
                            </span>
                            <h2 className="text-xl font-bold tracking-tight text-white">
                                Dedicated Clinic Subdomain
                            </h2>
                            <p className="text-xs text-slate-400">
                                Each healthcare provider operates in their own isolated tenant environment.
                            </p>
                        </div>

                        {/* Browser Bar Mockup */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-500">https://</span>
                            <span className="text-white font-bold transition-all">
                                {currentSubdomain}
                            </span>
                            <span className="text-slate-500">.medvisit.lk/login</span>
                        </div>

                        <div className="space-y-3 pt-2 text-xs text-slate-400 border-t border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>Sri Lanka Data Compliance & Encrypted Medical Records</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary-400" />
                                <span>Multi-Tenant Practice & Token Queue Isolation</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
