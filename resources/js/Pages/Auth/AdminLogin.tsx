import React, { FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Lock, Mail } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { AuthAlert, AuthField, AuthSubmit } from '@/Components/ClinicAuth/AuthControls';
import { inOrder } from '@/Components/ClinicAuth/ClinicAuthLayout';
import '@/Components/ClinicAuth/clinic-auth.css';

interface Props {
    status?: string;
    showDemoCredentials?: boolean;
}

/**
 * Platform admin sign-in. Served only at /admin/login (and /login?mode=admin);
 * no public page links here.
 */
export default function AdminLogin({ status, showDemoCredentials = false }: Props) {
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
        setData((prev) => ({
            ...prev,
            email,
            password: 'Password123!',
        }));
    };

    return (
        <div className="ca-root flex min-h-[100dvh] flex-col antialiased">
            <Head title="Platform admin sign in">
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
                <ApplicationLogo className="h-8 w-auto sm:h-9" />
                <ThemeToggle size="sm" />
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
                <div className="w-full max-w-[400px]">
                    <h1 className="ca-in text-3xl font-semibold tracking-[-0.02em]" style={inOrder(0)}>
                        Platform admin sign in
                    </h1>
                    <p className="ca-in mt-2 text-base text-[color:var(--ca-muted)]" style={inOrder(1)}>
                        For MedVisit staff only. Clinic teams sign in on their clinic's own address.
                    </p>

                    <div className="mt-8">
                        {status && <AuthAlert tone="success">{status}</AuthAlert>}
                        <form onSubmit={submit} noValidate className="space-y-5">
                            <AuthField
                                id="admin_email"
                                label="Email"
                                icon={Mail}
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                autoComplete="username"
                                autoFocus
                                error={errors.email}
                                wrapperStyle={inOrder(2)}
                            />
                            <AuthField
                                id="admin_password"
                                label="Password"
                                icon={Lock}
                                type="password"
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoComplete="current-password"
                                revealable
                                error={errors.password}
                                wrapperStyle={inOrder(3)}
                            />
                            <label className="ca-in inline-flex cursor-pointer items-center gap-2.5 text-sm" style={inOrder(4)}>
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-[18px] w-[18px] rounded border-slate-400 text-primary focus:ring-primary dark:border-slate-500 dark:bg-slate-800"
                                />
                                Remember this device
                            </label>
                            <AuthSubmit busy={processing} busyLabel="Signing in…" style={inOrder(5)}>
                                Sign in
                            </AuthSubmit>
                        </form>

                        {showDemoCredentials && (
                            <div className="mt-8 border-t border-[color:var(--ca-line)] pt-5">
                                <p className="text-sm font-medium text-[color:var(--ca-muted)]">Local dev accounts</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {['superadmin@medvisit.test', 'clinicadmin@medvisit.test'].map((email) => (
                                        <button
                                            key={email}
                                            type="button"
                                            onClick={() => fillDemo(email)}
                                            className="truncate rounded-xl border border-[color:var(--ca-line)] px-3 py-2 text-left text-xs font-medium hover:border-primary"
                                        >
                                            {email}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-[color:var(--ca-muted)]">Password: <code className="font-mono text-slate-800 dark:text-slate-200">Password123!</code></p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
