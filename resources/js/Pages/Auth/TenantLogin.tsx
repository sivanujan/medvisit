import React, { FormEventHandler, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Mail,
    Lock,
    LogIn,
    Eye,
    EyeOff,
    Building2,
    ShieldCheck,
    MapPin,
    Phone,
    Globe,
    CheckCircle2,
    ArrowLeft,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import AuthHeader from '@/Components/AuthHeader';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import {
    GlassLabel,
    GlassInput,
    GlassError,
    GlassCheckbox,
} from '@/Components/UI/FormControls';
import { getAvatarInitial } from '@/Utils/name';

interface Props {
    tenant: {
        id: string;
        name: string;
        subdomain: string;
        address?: string;
        phone?: string;
        status?: string;
    };
    canResetPassword?: boolean;
    status?: string;
    error?: string;
    defaultEmail?: string;
}

export default function TenantLogin({
    tenant,
    canResetPassword = true,
    status,
    error,
    defaultEmail = '',
}: Props) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: defaultEmail || '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    const initials = getAvatarInitial(tenant.name || 'Clinic');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-primary-100 selection:text-primary-800">
            <Head title={`Sign In • ${tenant.name}`} />

            {/* Ambient Background Glow */}
            {/* Subtle Ambient Background Glows */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 left-1/4 w-[42rem] h-[32rem] rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-[120px]" />
                <div className="absolute top-1/3 -right-20 w-[36rem] h-[36rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-[130px]" />
                <div className="absolute -bottom-24 left-1/3 w-[32rem] h-[32rem] rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-[100px]" />
            </div>

            {/* Redesigned Shared Header */}
            <AuthHeader
                subtitle={tenant.name || 'Clinic Sign In'}
                customRightContent={
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-secondary-500/10 text-secondary-700 dark:text-secondary-300 border border-secondary-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-pulse" />
                            {tenant.subdomain}.medvisit.lk
                        </span>
                        <ThemeToggle size="md" />
                    </div>
                }
            />

            {/* Mobile Header Strip: Clinic Identity */}
            <div className="lg:hidden px-4 py-3 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-white/10 backdrop-blur-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                    {initials}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm truncate text-slate-900 dark:text-white">
                        {tenant.name}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {tenant.subdomain}.medvisit.lk
                    </p>
                </div>
            </div>

            {/* Split Desktop Layout */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Staff Sign In Form (7 cols on desktop) */}
                <div className="lg:col-span-7 max-w-lg mx-auto w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl space-y-6"
                    >
                        {/* Heading & Clinic Avatar */}
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-primary-600 to-secondary text-white font-black text-base flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
                                {initials}
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {tenant.name}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    Sign in to your clinical practice workspace
                                </p>
                            </div>
                        </div>

                        {/* Status / Flash Messages */}
                        {status && (
                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                                <span>{status}</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <GlassLabel htmlFor="email" required>
                                    Work Email Address
                                </GlassLabel>
                                <GlassInput
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    placeholder="doctor@clinic.lk"
                                    icon={<Mail className="w-4 h-4" />}
                                    error={!!errors.email}
                                    autoComplete="username"
                                    autoFocus={!defaultEmail}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                <GlassError message={errors.email} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <GlassLabel htmlFor="password" required className="mb-0">
                                        Password
                                    </GlassLabel>
                                    {canResetPassword && (
                                        <Link
                                            href="/forgot-password"
                                            className="text-xs font-semibold text-primary hover:text-primary-600 dark:hover:text-primary-300"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                                <div className="relative">
                                    <GlassInput
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        placeholder="••••••••••••"
                                        icon={<Lock className="w-4 h-4" />}
                                        error={!!errors.password}
                                        autoComplete="current-password"
                                        autoFocus={!!defaultEmail}
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                <GlassError message={errors.password} />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <GlassCheckbox
                                    id="remember"
                                    name="remember"
                                    label="Remember this workstation"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>{processing ? 'Signing in...' : 'Sign In to Clinic'}</span>
                            </button>
                        </form>

                        <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Not your clinic?</span>
                            <a
                                href="http://medvisit.test/login"
                                className="font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Find Your Clinic</span>
                            </a>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Clinic Identity Showcase (5 cols on desktop) */}
                <div className="hidden lg:block lg:col-span-5">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl space-y-6"
                    >
                        {/* Ambient Card Header with Brand Gradient */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-primary/20">
                                    {initials}
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        Verified Practice Workspace
                                    </span>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                        {tenant.name}
                                    </h2>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                {tenant.address && (
                                    <p className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                                        <span>{tenant.address}</span>
                                    </p>
                                )}
                                {tenant.phone && (
                                    <p className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-secondary shrink-0" />
                                        <span>{tenant.phone}</span>
                                    </p>
                                )}
                                <p className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                    <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>https://{tenant.subdomain}.medvisit.lk</span>
                                </p>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-start gap-2.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-slate-800 dark:text-slate-200">
                                        Tenant Isolation Active:
                                    </strong>{' '}
                                    Access is restricted strictly to authorized healthcare personnel registered with {tenant.name}.
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-slate-800 dark:text-slate-200">
                                        Role Redirection:
                                    </strong>{' '}
                                    Doctors are automatically routed to the consultation console, and receptionists to the token queue.
                                </div>
                            </div>
                        </div>

                        {/* Watermark / Badge */}
                        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-white/10">
                            <span>MedVisit Sri Lanka Healthcare Cloud</span>
                            <span>TLS 1.3 • AES-256</span>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
