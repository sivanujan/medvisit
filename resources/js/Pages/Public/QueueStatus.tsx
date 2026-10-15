import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Activity, Clock, Calendar, CheckCircle2, Phone, AlertCircle } from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

interface QueueSession {
    id: number;
    doctor_name: string;
    specialty: string;
    room: string;
    currentToken: number | null;
    status: string;
    totalTokens: number;
}

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
    activeSessions?: QueueSession[];
}

export default function QueueStatus({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    activeSessions = [],
}: Props) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans flex flex-col">
            <Head title={`Live Queue Status - ${clinic.name}`} />

            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12">
                <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold shadow-xs">
                        <Activity className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                        Live Waiting Lounge Status
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Live Consultation Queue
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600">
                        Real-time token display synchronized with consulting suites.
                    </p>
                </div>

                {activeSessions.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto shadow-xs">
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mx-auto">
                            <Clock className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            No Active Consultations at This Moment
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Doctor sessions begin according to their scheduled timetable. Check upcoming schedules or reserve your token.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/book"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Book a Token Online</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSessions.map((session) => (
                            <div
                                key={session.id}
                                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                                            {session.specialty}
                                        </span>
                                        <h3 className="font-extrabold text-sm text-slate-900 pt-1">
                                            {session.doctor_name}
                                        </h3>
                                        <p className="text-xs text-slate-500">{session.room}</p>
                                    </div>

                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mt-1" />
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                        Now Serving Token
                                    </span>
                                    <span className="font-mono text-3xl font-black text-teal-700">
                                        #{session.currentToken ?? '—'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <PublicSiteFooter
                clinic={clinic}
                footerConfig={footerConfig}
                themePreset={theme}
            />
        </div>
    );
}
