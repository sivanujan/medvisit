import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Home, Calendar, Phone } from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

interface Props {
    clinic: {
        name: string;
        phone?: string;
        address?: string;
        subdomain: string;
        logo_url?: string;
        whatsapp_number?: string;
        opening_hours?: string;
    };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    theme?: string;
}

export default function NotFound({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
}: Props) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans flex flex-col">
            <Head title={`Page Not Found - ${clinic.name}`} />

            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            <main id="main-content" className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mx-auto shadow-xs">
                        <AlertTriangle className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-100/70 px-3 py-1 rounded-full">
                            404 Error
                        </span>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Page Not Found
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            The clinical page or channeling link you were looking for doesn’t exist or has moved.
                        </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                        >
                            <Home className="w-4 h-4" />
                            <span>Return to Homepage</span>
                        </Link>

                        <Link
                            href="/book"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-colors"
                        >
                            <Calendar className="w-4 h-4 text-teal-600" />
                            <span>Book a Token</span>
                        </Link>
                    </div>
                </div>
            </main>

            <PublicSiteFooter
                clinic={clinic}
                footerConfig={footerConfig}
                themePreset={theme}
            />
        </div>
    );
}
