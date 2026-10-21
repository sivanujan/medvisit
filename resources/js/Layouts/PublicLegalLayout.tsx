import React, { PropsWithChildren } from 'react';
import { Head } from '@inertiajs/react';
import LegalFooter from '@/Components/Public/LegalFooter';
import PublicHeader from '@/Components/Public/PublicHeader';

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
    progressPercent,
    children,
}: PropsWithChildren<Props>) {
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

            <PublicHeader progressPercent={progressPercent} />

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
