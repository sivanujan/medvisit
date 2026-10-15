import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Ticket, CheckCircle2, AlertCircle, XCircle, Clock, Calendar, Phone } from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

interface TokenInfo {
    id: number;
    token_number: number;
    status: string;
    doctor_name: string;
    specialty: string;
    session_date: string;
    start_time: string;
    estimated_time: string | null;
    patient_name: string;
    total_fee_formatted: string;
    signed_cancel_token?: string;
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
    token?: TokenInfo | null;
    message?: string;
}

export default function BookingStatus({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    token,
    message,
}: Props) {
    const { post, processing } = useForm();

    const handleCancel = () => {
        if (!token?.signed_cancel_token) return;
        if (confirm('Are you sure you want to cancel this appointment token? This cannot be undone.')) {
            post(`/tokens/${token.signed_cancel_token}/cancel`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans flex flex-col">
            <Head title={`Token Appointment - ${clinic.name}`} />

            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            <main id="main-content" className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-12">
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                        <Ticket className="w-3.5 h-3.5" />
                        Patient Appointment Status
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Channeling Token Verification
                    </h1>
                </div>

                {message && (
                    <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {token ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Appointment Token
                                </span>
                                <span className="font-mono text-3xl font-black text-teal-700">
                                    #{token.token_number}
                                </span>
                            </div>

                            <span
                                className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                                    token.status === 'cancelled'
                                        ? 'bg-rose-100 text-rose-800'
                                        : token.status === 'completed'
                                        ? 'bg-slate-100 text-slate-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                }`}
                            >
                                {token.status}
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Patient Name:</span>
                                <strong className="text-slate-900">{token.patient_name}</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Specialist:</span>
                                <strong className="text-slate-900">{token.doctor_name}</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Specialty:</span>
                                <span className="text-teal-700 font-semibold">{token.specialty}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Session Date:</span>
                                <strong className="text-slate-900">{token.session_date}</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Start Time:</span>
                                <strong className="font-mono">{token.start_time}</strong>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Total Consultation Fee:</span>
                                <strong className="text-slate-900">{token.total_fee_formatted}</strong>
                            </div>
                        </div>

                        {token.status === 'booked' && token.signed_cancel_token && (
                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={processing}
                                    className="w-full py-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>{processing ? 'Cancelling...' : 'Cancel Appointment Token'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
                        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
                        <h3 className="text-base font-bold text-slate-900">No Token Record Found</h3>
                        <p className="text-xs text-slate-500">
                            Check the link sent via SMS or book a new channeling token online.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/book"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Book a Token</span>
                            </Link>
                        </div>
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
