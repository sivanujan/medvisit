import React, { useState, PropsWithChildren } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, X, ArrowRight } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import LegalFooter from '@/Components/Public/LegalFooter';
import { PageProps } from '@/types';

interface Props {
    title: string;
    description?: string;
    isWide?: boolean;
    progressPercent?: number;
}

export default function PublicLegalLayout({
    title,
    description = 'MedVisit official merchant policies, terms, and pricing for Sri Lankan healthcare providers.',
    isWide = false,
    progressPercent = 0,
    children,
}: PropsWithChildren<Props>) {
    const { auth } = usePage<PageProps>().props;
    const currentUrl = usePage().url;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { label: 'Pricing', path: '/pricing' },
        { label: 'Terms', path: '/terms' },
        { label: 'Refund', path: '/refund-policy' },
        { label: 'Disputes', path: '/dispute-policy' },
        { label: 'Privacy', path: '/privacy-policy' },
    ];

    const isLinkActive = (path: string) => {
        // Strip query string
        const cleanCurrent = currentUrl.split('?')[0];
        return cleanCurrent === path;
    };

    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary-100 selection:text-primary-800 relative overflow-x-hidden">
            <Head>
                <title>{`${title} — MedVisit`}</title>
                <meta name="description" content={description} />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            {/* Print Stylesheet */}
            <style>{`
                @media print {
                    header, footer, aside, nav, button, [role="note"], .print\\:hidden {
                        display: none !important;
                    }
                    body, main {
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    * {
                        box-shadow: none !important;
                        text-shadow: none !important;
                        backdrop-filter: none !important;
                    }
                    a {
                        text-decoration: underline !important;
                        color: black !important;
                    }
                }
            `}</style>

            {/* Ambient Background Glow Layer */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden print:hidden">
                <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-3xl" />
                <div className="absolute -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-accent-500/10 dark:bg-accent-500/10 blur-3xl" />
            </div>

            {/* Sticky Glass Navbar */}
            <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl print:hidden">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="group flex items-center gap-2" aria-label="MedVisit Home">
                            <ApplicationLogo className="h-8 sm:h-9 w-auto transition-transform group-hover:scale-105" />
                        </Link>

                        {/* Desktop Navigation */}
                        <nav
                            aria-label="Legal & policy navigation"
                            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                            {navLinks.map((link) => {
                                const active = isLinkActive(link.path);
                                return (
                                    <Link
                                        key={link.path}
                                        href={link.path}
                                        aria-current={active ? 'page' : undefined}
                                        className={`px-3 py-1.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                            active
                                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-400 font-bold shadow-xs'
                                                : 'hover:text-primary dark:hover:text-primary-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <ThemeToggle size="sm" />

                        {auth?.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-xl bg-primary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white shadow-sm shadow-primary/30 transition hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2">
                                <a
                                    href="/login"
                                    className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition hover:bg-white dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    Sign In
                                </a>
                                <a
                                    href="/register"
                                    className="rounded-xl bg-gradient-to-r from-primary to-secondary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    Get Started
                                </a>
                            </div>
                        )}

                        {/* Mobile Menu Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-2">
                        <nav aria-label="Mobile main navigation" className="space-y-1">
                            {navLinks.map((link) => {
                                const active = isLinkActive(link.path);
                                return (
                                    <Link
                                        key={link.path}
                                        href={link.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        aria-current={active ? 'page' : undefined}
                                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                            active
                                                ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{link.label}</span>
                                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </Link>
                                );
                            })}
                        </nav>

                        {!auth?.user && (
                            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 gap-2">
                                <a
                                    href="/login"
                                    className="text-center py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                                >
                                    Sign In
                                </a>
                                <a
                                    href="/register"
                                    className="text-center py-2 px-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-xs font-bold text-white shadow-sm"
                                >
                                    Get Started
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Reading Progress Bar Under Sticky Header */}
                <div
                    aria-hidden="true"
                    className="w-full h-1 bg-slate-200/50 dark:bg-slate-800/50 overflow-hidden"
                >
                    <div
                        className="h-full bg-gradient-to-r from-primary via-secondary to-accent motion-safe:transition-all motion-safe:duration-150"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </header>

            {/* Main Page Body */}
            <main className="flex-1 w-full py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
                <div className={`mx-auto ${isWide ? 'max-w-6xl' : 'max-w-3xl'}`}>
                    {children}
                </div>
            </main>

            {/* Public Legal Footer */}
            <LegalFooter />
        </div>
    );
}
