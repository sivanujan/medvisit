import React, { CSSProperties, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { MapPin, Phone } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import TvDisplay from './TvDisplay';
import '@/Components/CentralLogin/central-login.css';
import './clinic-auth.css';

export interface ClinicBranding {
    name: string;
    subdomain: string;
    logo_url?: string | null;
    phone?: string;
    address?: string;
    city?: string;
    brand_color?: string | null;
    public_domain?: string;
}

function greetingFor(hour: number): string {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function useGreeting(): string {
    const [greeting, setGreeting] = useState(() => greetingFor(new Date().getHours()));
    useEffect(() => {
        const id = window.setInterval(() => setGreeting(greetingFor(new Date().getHours())), 60_000);
        return () => window.clearInterval(id);
    }, []);
    return greeting;
}

/** The clinic's uploaded logo; its initial only when there is no logo (or it fails to load). */
function ClinicLogo({ clinic }: { clinic: ClinicBranding }) {
    const [broken, setBroken] = useState(false);
    if (clinic.logo_url && !broken) {
        return (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--ca-line)] bg-white p-1.5 shadow-sm">
                <img
                    src={clinic.logo_url}
                    alt={`${clinic.name} logo`}
                    className="h-full w-full object-contain"
                    onError={() => setBroken(true)}
                />
            </span>
        );
    }
    return (
        <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md"
            style={{ background: 'linear-gradient(140deg, var(--ca-brand), #0A7E73)' }}
        >
            {(clinic.name || 'C').trim().charAt(0).toUpperCase()}
        </span>
    );
}

interface Props {
    clinic: ClinicBranding;
    pageTitle: string;
    title: string;
    subtitle: ReactNode;
    /** The waiting-room TV: animated on sign-in, small and still on the password pages. */
    tv?: 'live' | 'still';
}

/** Delay slot in the staggered load-in; pair with the `ca-in` class. */
export const inOrder = (i: number) => ({ '--i': i }) as CSSProperties;

export default function ClinicAuthLayout({
    clinic,
    pageTitle,
    title,
    subtitle,
    tv = 'live',
    children,
}: PropsWithChildren<Props>) {
    const greeting = useGreeting();
    const domain = clinic.public_domain || 'medvisit.lk';
    const brand = clinic.brand_color || '#1E6FD9';

    return (
        <div
            className="ca-root cl-root flex min-h-[100dvh] flex-col antialiased"
            style={{ '--ca-brand': brand } as CSSProperties}
        >
            <Head title={`${pageTitle} - ${clinic.name}`} />

            <div className="cl-backdrop flex flex-1 flex-col">
                <header className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                    <ApplicationLogo className="h-8 w-auto sm:h-9" />
                    <ThemeToggle size="sm" />
                </header>

                <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] items-center gap-8 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-12 lg:pb-16">
                    <main className="w-full max-w-[440px]">
                        <div className="ca-in flex items-center gap-4" style={inOrder(0)}>
                            <ClinicLogo clinic={clinic} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{greeting}</p>
                                <p className="truncate text-xl font-semibold leading-tight">{clinic.name}</p>
                                <p className="truncate text-sm text-[color:var(--ca-muted)]">
                                    {clinic.city ? `${clinic.city}, ` : ''}
                                    {clinic.subdomain}.{domain}
                                </p>
                            </div>
                        </div>

                        <h1
                            className="ca-in mt-10 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl"
                            style={inOrder(1)}
                        >
                            {title}
                        </h1>
                        <p className="ca-in mt-2 text-base text-[color:var(--ca-muted)]" style={inOrder(2)}>
                            {subtitle}
                        </p>
                        <div className="mt-8">{children}</div>
                    </main>

                    <aside className="ca-in max-[399px]:hidden" style={inOrder(3)} aria-label={`About ${clinic.name}`}>
                        <TvDisplay
                            clinicName={clinic.name}
                            logoUrl={clinic.logo_url}
                            brandColor={clinic.brand_color}
                            still={tv === 'still'}
                        />
                        <div className="mt-1 space-y-1 text-center text-sm text-[color:var(--ca-muted)]">
                            {clinic.phone && (
                                <p className="inline-flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                    <a
                                        href={`tel:${clinic.phone.replace(/\s+/g, '')}`}
                                        className="rounded hover:underline"
                                    >
                                        {clinic.phone}
                                    </a>
                                </p>
                            )}
                            {clinic.address && (
                                <p className="flex items-start justify-center gap-1.5">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    {clinic.address}
                                </p>
                            )}
                            <p className="pt-1 text-xs">Powered by MedVisit</p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
