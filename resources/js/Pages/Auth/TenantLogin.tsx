import React, { FormEventHandler, useEffect, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Lock, Mail } from 'lucide-react';
import ClinicAuthLayout, { ClinicBranding, inOrder } from '@/Components/ClinicAuth/ClinicAuthLayout';
import { AuthAlert, AuthField, AuthSubmit } from '@/Components/ClinicAuth/AuthControls';

interface Props {
    tenant: ClinicBranding & { id: string; status?: string };
    canResetPassword?: boolean;
    status?: string;
    error?: string;
    defaultEmail?: string;
    findClinicUrl?: string;
}

/** Seconds left on a sign-in lockout, counting down live. */
function useLockout(retryAfter?: string): number {
    const [endsAt, setEndsAt] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const seconds = Number(retryAfter);
        setEndsAt(seconds > 0 ? Date.now() + seconds * 1000 : null);
    }, [retryAfter]);

    useEffect(() => {
        if (!endsAt) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [endsAt]);

    return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}

const STAFF_ROLES = ['Doctors', 'Reception', 'Pharmacy', 'Admin'];

function formatWait(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
}

export default function TenantLogin({
    tenant,
    canResetPassword = true,
    status,
    error,
    defaultEmail = '',
    findClinicUrl = 'https://medvisit.lk/find',
}: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: defaultEmail || '',
        password: '',
        remember: false as boolean,
    });

    // The server tags credential failures and lockouts with `auth` so they show as one
    // alert, not as an invalid email field. Validation errors stay on their fields.
    const allErrors = errors as Record<string, string | undefined>;
    const authState = allErrors.auth;
    const lockoutLeft = useLockout(authState === 'throttled' ? allErrors.retry_after : undefined);
    const emailFieldError = authState ? undefined : errors.email;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <ClinicAuthLayout
            clinic={tenant}
            pageTitle="Sign in"
            title="Sign in"
            subtitle={`Welcome back to ${tenant.name}`}
        >
            {status && <AuthAlert tone="success">{status}</AuthAlert>}
            {error && <AuthAlert tone="error">{error}</AuthAlert>}
            {authState === 'failed' && <AuthAlert tone="error">Email or password is incorrect.</AuthAlert>}
            {authState === 'throttled' && lockoutLeft > 0 && (
                <AuthAlert tone="error">
                    Too many sign-in attempts. Try again in{' '}
                    <span className="whitespace-nowrap font-semibold tabular-nums">{formatWait(lockoutLeft)}</span>.
                </AuthAlert>
            )}

            <form onSubmit={submit} noValidate className="space-y-5">
                <AuthField
                    id="email"
                    label="Email"
                    icon={Mail}
                    type="email"
                    name="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    autoComplete="username"
                    inputMode="email"
                    autoFocus={!data.email}
                    placeholder="you@example.com"
                    error={emailFieldError}
                    wrapperStyle={inOrder(3)}
                />

                <AuthField
                    id="password"
                    label="Password"
                    icon={Lock}
                    type="password"
                    name="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    autoComplete="current-password"
                    // Arriving with ?email= (e.g. from "Sign in to your clinic"): go straight to the password.
                    autoFocus={!!defaultEmail}
                    placeholder="Your password"
                    revealable
                    error={errors.password}
                    wrapperStyle={inOrder(4)}
                />

                <div className="ca-in flex items-center justify-between gap-3" style={inOrder(5)}>
                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="h-[18px] w-[18px] rounded border-slate-400 text-primary focus:ring-primary dark:border-slate-500 dark:bg-slate-800"
                        />
                        Remember me
                    </label>
                    {canResetPassword && (
                        <Link
                            href="/forgot-password"
                            className="rounded text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
                        >
                            Forgot password?
                        </Link>
                    )}
                </div>

                <AuthSubmit busy={processing} disabled={lockoutLeft > 0} busyLabel="Signing in…" style={inOrder(6)}>
                    Sign in
                </AuthSubmit>
            </form>

            <div className="ca-in mt-6" style={inOrder(7)}>
                <ul className="flex flex-wrap gap-2" aria-label="Who signs in here">
                    {STAFF_ROLES.map((role) => (
                        <li
                            key={role}
                            className="rounded-full border border-[color:var(--ca-line)] bg-[color:var(--ca-field)] px-3 py-1 text-xs font-medium text-[color:var(--ca-muted)]"
                        >
                            {role}
                        </li>
                    ))}
                </ul>
                <p className="mt-2.5 text-sm text-[color:var(--ca-muted)]">All clinic staff sign in here.</p>
            </div>

            <div
                className="ca-in mt-6 border-t border-[color:var(--ca-line)] pt-5 text-sm text-[color:var(--ca-muted)]"
                style={inOrder(8)}
            >
                <p>
                    Not your clinic?{' '}
                    <a
                        href={findClinicUrl}
                        className="rounded font-medium text-primary-700 hover:underline dark:text-primary-300"
                    >
                        Find your clinic →
                    </a>
                </p>
            </div>
        </ClinicAuthLayout>
    );
}
