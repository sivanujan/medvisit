import React, { FormEventHandler, useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronRight, Globe, Mail, X } from 'lucide-react';
import PublicHeader from '@/Components/Public/PublicHeader';
import LegalFooter from '@/Components/Public/LegalFooter';
import { inOrder } from '@/Components/ClinicAuth/ClinicAuthLayout';
import WorkspaceMockup from '@/Components/CentralLogin/WorkspaceMockup';
import { usePrefersReducedMotion } from '@/Components/Landing/useLandingMotion';
import { AuthAlert, AuthField, AuthSubmit } from '@/Components/ClinicAuth/AuthControls';
import '@/Components/ClinicAuth/clinic-auth.css';

interface ClinicCard {
    name: string;
    subdomain: string;
    logo_url?: string | null;
    login_url: string;
    home_login_url?: string;
}

interface Props {
    status?: string;
    matchedClinics?: ClinicCard[];
    lookupEmail?: string;
    clinicRedirect?: ClinicCard;
    publicDomain?: string;
}

interface RememberedClinic {
    name: string;
    subdomain: string;
    logo_url?: string | null;
    url: string;
}

const STORAGE_KEY = 'medvisit.lastClinic';
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function readRemembered(): RememberedClinic | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as RememberedClinic) : null;
        return parsed?.name && parsed.url ? parsed : null;
    } catch {
        return null;
    }
}

/** Remembers the clinic (never the email) so the next visit can skip the lookup. */
function remember(clinic: ClinicCard) {
    try {
        const entry: RememberedClinic = {
            name: clinic.name,
            subdomain: clinic.subdomain,
            logo_url: clinic.logo_url,
            url: clinic.home_login_url || clinic.login_url.split('?')[0],
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
        // Storage can be unavailable (private mode, blocked site data); the page works without it.
    }
}

function forget() {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

function ClinicLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
    const [broken, setBroken] = useState(false);
    return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--ca-line)] bg-white p-1.5">
            {logoUrl && !broken ? (
                <img src={logoUrl} alt="" className="h-full w-full object-contain" onError={() => setBroken(true)} />
            ) : (
                <span aria-hidden="true" className="text-lg font-bold text-primary-700">
                    {name.trim().charAt(0).toUpperCase()}
                </span>
            )}
        </span>
    );
}

function hostOf(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

const linkClass = 'rounded font-medium text-primary-700 hover:underline dark:text-primary-300';

export default function Login({
    status,
    matchedClinics,
    lookupEmail,
    clinicRedirect,
    publicDomain = 'medvisit.lk',
}: Props) {
    const [mode, setMode] = useState<'email' | 'address'>('email');
    const [remembered, setRemembered] = useState<RememberedClinic | null>(null);
    const [showChooser, setShowChooser] = useState(true);
    const [addressError, setAddressError] = useState<string | undefined>();

    const emailForm = useForm({ email: lookupEmail || '' });
    const addressForm = useForm({ subdomain: '' });

    useEffect(() => {
        setRemembered(readRemembered());
    }, []);

    // A single match (or a found clinic address) comes back as `clinicRedirect`:
    // remember it, then leave for the clinic's own sign-in page.
    // The address-bar mockup types the real address first (max 600ms; none with reduced motion).
    const reduced = usePrefersReducedMotion();
    useEffect(() => {
        if (!clinicRedirect) return;
        remember(clinicRedirect);
        if (reduced) {
            window.location.assign(clinicRedirect.login_url);
            return;
        }
        const id = window.setTimeout(() => window.location.assign(clinicRedirect.login_url), 600);
        return () => window.clearTimeout(id);
    }, [clinicRedirect, reduced]);

    useEffect(() => setShowChooser(true), [matchedClinics]);

    const emailErrors = emailForm.errors as Record<string, string | undefined>;
    const addressErrors = addressForm.errors as Record<string, string | undefined>;
    const emailNotFound = emailErrors.lookup === 'not_found';
    const chooser = showChooser && matchedClinics && matchedClinics.length > 1 ? matchedClinics : null;

    const submitEmail: FormEventHandler = (e) => {
        e.preventDefault();
        emailForm.post(route('find.clinic.email'), { preserveScroll: true });
    };

    const submitAddress: FormEventHandler = (e) => {
        e.preventDefault();
        const value = addressForm.data.subdomain.trim();
        if (!value) return setAddressError('Enter your clinic address.');
        if (!SUBDOMAIN_PATTERN.test(value)) return setAddressError('Use lowercase letters, numbers and hyphens only.');
        setAddressError(undefined);
        addressForm.post(route('find.clinic.subdomain'), { preserveScroll: true });
    };

    const switchMode = (next: 'email' | 'address') => {
        setMode(next);
        setAddressError(undefined);
        emailForm.clearErrors();
        addressForm.clearErrors();
        requestAnimationFrame(() =>
            document.getElementById(next === 'email' ? 'lookup_email' : 'clinic_address')?.focus(),
        );
    };

    const addressFieldError = addressError || addressErrors.subdomain;

    return (
        <div className="ca-root cl-root flex min-h-[100dvh] flex-col antialiased">
            <Head title="Sign in to your clinic" />
            <PublicHeader />

            {/* The shared header is fixed and 72px tall. */}
            <div className="cl-backdrop flex-1 pt-[72px]">
                <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-8 lg:py-16">
                    <main className="w-full max-w-[440px] lg:min-h-[34rem]">
                        {remembered && !clinicRedirect && (
                            <div
                                className="ca-in mb-8 flex items-center gap-2 rounded-2xl border border-[color:var(--ca-line)] bg-[color:var(--ca-field)] p-2 pr-2"
                                style={inOrder(1)}
                            >
                                <a
                                    href={remembered.url}
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                                >
                                    <ClinicLogo name={remembered.name} logoUrl={remembered.logo_url} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold">
                                            Continue to {remembered.name}
                                        </span>
                                        <span className="block truncate text-xs text-[color:var(--ca-muted)]">
                                            {hostOf(remembered.url)}
                                        </span>
                                    </span>
                                    <ChevronRight className="ca-icon h-5 w-5 shrink-0" aria-hidden="true" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        forget();
                                        setRemembered(null);
                                    }}
                                    aria-label={`Forget ${remembered.name}`}
                                    title="Forget this clinic"
                                    className="ca-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <p
                            className="ca-in text-xs font-semibold tracking-[0.14em] text-primary-700 dark:text-primary-300"
                            style={inOrder(1)}
                        >
                            CLINIC SIGN-IN
                        </p>
                        <h1
                            className="ca-in mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl"
                            style={inOrder(2)}
                        >
                            Sign in to your clinic
                        </h1>
                        <p className="ca-in mt-2 text-base text-[color:var(--ca-muted)]" style={inOrder(3)}>
                            {mode === 'email'
                                ? "Enter your work email and we'll take you to your clinic's sign-in page."
                                : "Enter your clinic's address to go to its sign-in page."}
                        </p>

                        <div className="mt-8">
                            {clinicRedirect && <AuthAlert tone="success">Opening {clinicRedirect.name}…</AuthAlert>}
                            {status && !clinicRedirect && !chooser && <AuthAlert tone="success">{status}</AuthAlert>}

                            {chooser ? (
                                <div className="ca-swap">
                                    <h2 className="text-lg font-semibold">Choose your clinic</h2>
                                    <p className="mt-1 text-sm text-[color:var(--ca-muted)]">
                                        {lookupEmail} works at more than one clinic.
                                    </p>
                                    <ul className="mt-4 space-y-2.5">
                                        {chooser.map((clinic) => (
                                            <li key={clinic.subdomain}>
                                                <a
                                                    href={clinic.login_url}
                                                    onClick={() => remember(clinic)}
                                                    className="flex items-center gap-3 rounded-2xl border border-[color:var(--ca-line)] bg-[color:var(--ca-field)] p-3 transition hover:border-primary hover:shadow-md hover:shadow-primary/10"
                                                >
                                                    <ClinicLogo name={clinic.name} logoUrl={clinic.logo_url} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate font-semibold">
                                                            {clinic.name}
                                                        </span>
                                                        <span className="block truncate text-sm text-[color:var(--ca-muted)]">
                                                            {hostOf(clinic.login_url)}
                                                        </span>
                                                    </span>
                                                    <ChevronRight
                                                        className="ca-icon h-5 w-5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() => setShowChooser(false)}
                                        className={`mt-5 text-sm ${linkClass}`}
                                    >
                                        Use a different email
                                    </button>
                                </div>
                            ) : mode === 'email' ? (
                                <div key="email" className="ca-swap">
                                    {emailNotFound && <AuthAlert tone="error">{emailForm.errors.email}</AuthAlert>}
                                    <form onSubmit={submitEmail} noValidate className="space-y-5">
                                        <AuthField
                                            id="lookup_email"
                                            label="Work email"
                                            icon={Mail}
                                            type="email"
                                            name="email"
                                            value={emailForm.data.email}
                                            onChange={(e) => emailForm.setData('email', e.target.value)}
                                            autoComplete="email"
                                            inputMode="email"
                                            autoFocus
                                            placeholder="you@yourclinic.lk"
                                            error={emailNotFound ? undefined : emailForm.errors.email}
                                            wrapperStyle={inOrder(4)}
                                        />
                                        <AuthSubmit
                                            busy={emailForm.processing}
                                            busyLabel="Finding your clinic…"
                                            style={inOrder(5)}
                                        >
                                            Continue
                                        </AuthSubmit>
                                    </form>
                                    <p className="ca-in mt-5 text-sm" style={inOrder(6)}>
                                        <button
                                            type="button"
                                            onClick={() => switchMode('address')}
                                            className={linkClass}
                                        >
                                            Know your clinic address? Enter it instead
                                        </button>
                                    </p>
                                </div>
                            ) : (
                                <div key="address" className="ca-swap">
                                    <form onSubmit={submitAddress} noValidate className="space-y-5">
                                        <div>
                                            <label htmlFor="clinic_address" className="text-sm font-medium">
                                                Clinic address
                                            </label>
                                            <div
                                                className="ca-affix mt-2 pl-3.5"
                                                data-invalid={addressFieldError ? 'true' : undefined}
                                            >
                                                <Globe className="ca-icon mr-2.5 h-5 w-5 shrink-0" aria-hidden="true" />
                                                <input
                                                    id="clinic_address"
                                                    name="subdomain"
                                                    value={addressForm.data.subdomain}
                                                    onChange={(e) => {
                                                        setAddressError(undefined);
                                                        addressForm.setData(
                                                            'subdomain',
                                                            e.target.value.toLowerCase().replace(/\s+/g, ''),
                                                        );
                                                    }}
                                                    autoComplete="off"
                                                    autoCapitalize="none"
                                                    spellCheck={false}
                                                    placeholder="yourclinic"
                                                    aria-invalid={addressFieldError ? true : undefined}
                                                    aria-describedby={
                                                        addressFieldError
                                                            ? 'clinic_address-error'
                                                            : 'clinic_address-hint'
                                                    }
                                                />
                                                <span className="shrink-0 truncate pr-3.5 text-[0.95rem] text-[color:var(--ca-muted)]">
                                                    .{publicDomain}
                                                </span>
                                            </div>
                                            {addressFieldError ? (
                                                <p
                                                    id="clinic_address-error"
                                                    className="mt-1.5 text-sm text-red-700 dark:text-red-300"
                                                >
                                                    {addressFieldError}
                                                </p>
                                            ) : (
                                                <p
                                                    id="clinic_address-hint"
                                                    className="mt-1.5 text-sm text-[color:var(--ca-muted)]"
                                                >
                                                    The first part of your clinic's web address.
                                                </p>
                                            )}
                                        </div>
                                        <AuthSubmit busy={addressForm.processing} busyLabel="Opening…" style={{}}>
                                            Go to clinic
                                        </AuthSubmit>
                                    </form>
                                    <p className="mt-5 text-sm">
                                        <button type="button" onClick={() => switchMode('email')} className={linkClass}>
                                            Use email instead
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div
                            className="ca-in mt-8 space-y-1.5 border-t border-[color:var(--ca-line)] pt-6 text-sm text-[color:var(--ca-muted)]"
                            style={inOrder(7)}
                        >
                            <p>
                                New clinic?{' '}
                                <Link href={route('register')} className={linkClass}>
                                    Register your clinic →
                                </Link>
                            </p>
                            <p>
                                Looking for a doctor?{' '}
                                <Link href="/find" className={linkClass}>
                                    Find Care →
                                </Link>
                            </p>
                        </div>
                    </main>

                    <div className="ca-in max-[399px]:hidden" style={inOrder(3)}>
                        <WorkspaceMockup
                            baseHost={publicDomain}
                            live={mode === 'address' && !chooser ? addressForm.data.subdomain : ''}
                            opening={
                                clinicRedirect
                                    ? { subdomain: clinicRedirect.subdomain, name: clinicRedirect.name }
                                    : null
                            }
                        />
                    </div>
                </div>
            </div>

            <LegalFooter />
        </div>
    );
}
