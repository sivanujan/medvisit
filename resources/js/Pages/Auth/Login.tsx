import React, { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import {
    GlassLabel,
    GlassInput,
    GlassError,
    GlassCheckbox,
} from '@/Components/UI/FormControls';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword?: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const fillDemo = (email: string) => {
        setData({
            email,
            password: 'Password123!',
            remember: false,
        });
    };

    return (
        <GuestLayout>
            <Head title="Sign In" />

            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Welcome Back
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Sign in to your MedVisit clinic workspace or central portal.
                </p>
            </div>

            {status && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <GlassLabel htmlFor="email" required>
                        Email Address
                    </GlassLabel>
                    <GlassInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        placeholder="you@clinic.com"
                        icon={<Mail className="w-4 h-4" />}
                        error={!!errors.email}
                        autoComplete="username"
                        autoFocus
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
                                href={route('password.request')}
                                className="text-xs font-semibold text-primary hover:text-primary-600 dark:hover:text-primary-300"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <GlassInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4" />}
                        error={!!errors.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <GlassError message={errors.password} />
                </div>

                <div className="flex items-center justify-between pt-1">
                    <GlassCheckbox
                        id="remember"
                        label="Remember this device"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    <LogIn className="w-4 h-4" />
                    <span>{processing ? 'Signing in...' : 'Sign In'}</span>
                </button>
            </form>

            {/* Quick Demo Credentials Autofill */}
            <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                    Demo Accounts (1-Click Fill)
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => fillDemo('superadmin@medvisit.test')}
                        className="p-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition-colors"
                    >
                        <span className="block text-primary font-bold">Super Admin</span>
                        <span className="block truncate text-[10px] text-slate-400">superadmin@medvisit.test</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fillDemo('clinicadmin@medvisit.test')}
                        className="p-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-left transition-colors"
                    >
                        <span className="block text-secondary font-bold">Clinic Admin</span>
                        <span className="block truncate text-[10px] text-slate-400">clinicadmin@medvisit.test</span>
                    </button>
                </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <Link
                    href={route('register')}
                    className="font-bold text-primary hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1"
                >
                    <span>Register a Clinic</span>
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </GuestLayout>
    );
}
