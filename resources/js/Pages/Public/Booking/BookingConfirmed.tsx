import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Calendar,
    Clock,
    MapPin,
    Phone,
    Share2,
    Download,
    Eye,
    XCircle,
    MessageCircle,
    ExternalLink,
    AlertTriangle,
    Sparkles,
    ShieldCheck,
    Mail,
    ArrowRight,
} from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

interface Props {
    clinic: {
        name: string;
        subdomain: string;
        phone: string;
        address: string;
        logo_url?: string;
        whatsapp_number?: string;
        opening_hours?: string;
    };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    theme?: string;
    token: {
        id: number;
        token_number: number;
        status: string;
        approx_time: string;
        signed_code: string;
        created_at_formatted: string;
        fee_formatted: string;
    };
    doctor: {
        name: string;
        title: string;
        full_title: string;
        specialty: string;
        photo_url?: string | null;
    };
    session: {
        session_date_formatted: string;
        time_range: string;
        room_number: string;
    };
    patient: {
        name: string;
        phone: string;
        email?: string | null;
    };
    googleCalendarUrl: string;
    icsUrl: string;
    queueUrl: string;
    cancelUrl: string;
}

export default function BookingConfirmed({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    token,
    doctor,
    session,
    patient,
    googleCalendarUrl,
    icsUrl,
    queueUrl,
    cancelUrl,
}: Props) {
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const isCancelled = token.status === 'cancelled';

    // WhatsApp Share Text
    const whatsappMessage = encodeURIComponent(
        `Channeling Appointment Confirmed!\n\n` +
        `Token: #${token.token_number}\n` +
        `Doctor: ${doctor.full_title} (${doctor.specialty})\n` +
        `Date: ${session.session_date_formatted}\n` +
        `Session: ${session.time_range}\n` +
        `Estimated Time: ${token.approx_time}\n` +
        `Patient: ${patient.name}\n` +
        `Clinic: ${clinic.name}\n` +
        `Address: ${clinic.address}\n\n` +
        `Track live queue status: ${window.location.origin}${queueUrl}`
    );
    const whatsappShareUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${clinic.name}, ${clinic.address}`
    )}`;

    const handleConfirmCancel = () => {
        setIsCancelling(true);
        router.post(
            cancelUrl,
            {},
            {
                onFinish: () => {
                    setIsCancelling(false);
                    setShowCancelModal(false);
                },
            }
        );
    };

    useEffect(() => {
        // Enforce bright, clean healthcare theme on public booking pages
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }, []);

    return (
        <div
            data-public-booking="true"
            className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-teal-100 selection:text-teal-900 relative isolate"
        >
            {/* Subtle Calendly dot mesh texture */}
            <div
                className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"
                aria-hidden="true"
            />

            <Head title={`Token #${token.token_number} Confirmed - ${clinic.name}`} />

            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Status Notice if Cancelled */}
                {isCancelled && (
                    <div className="mb-8 p-4 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                            <p className="font-bold">This booking has been cancelled</p>
                            <p className="text-xs text-rose-700">Token #{token.token_number} is no longer valid. You can book a new appointment at any time.</p>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden"
                >
                    {/* Top Confirmed Hero Banner */}
                    <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 text-white p-8 sm:p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -translate-x-8 translate-y-8 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 max-w-lg mx-auto">
                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4 text-emerald-300 shadow-inner">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 mb-3 tracking-wide uppercase">
                                Appointment Confirmed
                            </span>

                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                                Your Token Number is #{token.token_number}
                            </h1>

                            <p className="text-sm sm:text-base text-teal-100 font-medium">
                                Approximate Consultation Time: <strong className="text-white text-lg underline decoration-teal-300 underline-offset-4">{token.approx_time}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Booking Details Grid */}
                    <div className="p-6 sm:p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pb-8 border-b border-slate-100">
                            
                            {/* Doctor & Clinic Info */}
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Specialist & Location
                                </p>
                                <div className="flex items-start gap-4">
                                    {doctor.photo_url ? (
                                        <img
                                            src={doctor.photo_url}
                                            alt={doctor.full_title}
                                            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-sm shrink-0"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 font-bold text-lg flex items-center justify-center shrink-0 border border-teal-200">
                                            {doctor.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 leading-snug">
                                            {doctor.full_title}
                                        </h3>
                                        <p className="text-xs font-medium text-teal-700">{doctor.specialty}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {session.room_number} &bull; {clinic.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2 text-xs text-slate-500 space-y-1">
                                    <p className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                        <span>{clinic.address}</span>
                                    </p>
                                    <a
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-teal-700 font-semibold hover:underline mt-1"
                                    >
                                        <span>Open in Google Maps</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            {/* Schedule & Patient Details */}
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Date, Time & Patient
                                </p>
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span className="font-semibold text-slate-900">{session.session_date_formatted}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>Session: {session.time_range} (Approx: <strong>{token.approx_time}</strong>)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>Patient: <strong>{patient.name}</strong> ({patient.phone})</span>
                                    </div>
                                    {patient.email && (
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                                            <span>Email sent to: <strong>{patient.email}</strong></span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between items-center">
                                    <span className="text-slate-500">Estimated Total Fee</span>
                                    <span className="text-sm font-bold text-slate-900">{token.fee_formatted}</span>
                                </div>
                            </div>

                        </div>

                        {/* Interactive Buttons (Google Cal, .ics, WhatsApp, Queue, Cancel) */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                                Fast Actions & Sharing
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Google Calendar */}
                                <a
                                    href={googleCalendarUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-slate-700 hover:text-teal-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                                >
                                    <Calendar className="w-4 h-4 text-teal-600" />
                                    <span>Google Calendar</span>
                                </a>

                                {/* Download .ics */}
                                <a
                                    href={icsUrl}
                                    download
                                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-slate-700 hover:text-teal-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                                >
                                    <Download className="w-4 h-4 text-teal-600" />
                                    <span>Download .ics</span>
                                </a>

                                {/* Share on WhatsApp */}
                                <a
                                    href={whatsappShareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 text-emerald-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                                >
                                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                                    <span>Share on WhatsApp</span>
                                </a>

                                {/* View Live Queue Status */}
                                <Link
                                    href={queueUrl}
                                    className="p-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-teal-600/30"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>Live Queue Status</span>
                                </Link>
                            </div>
                        </div>

                        {/* Cancel Booking Section */}
                        {!isCancelled && (
                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    Need to change plans? You can cancel this appointment with one tap.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(true)}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                                >
                                    Cancel Booking
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Back to Home or Book Another */}
                <div className="mt-8 text-center">
                    <Link
                        href="/book"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
                    >
                        <span>Book Another Appointment</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Cancel Confirmation Modal */}
                {showCancelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                Cancel Token #{token.token_number}?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 mb-6">
                                Are you sure you want to cancel your appointment with {doctor.full_title} on {session.session_date_formatted}? This token will be released back to other patients.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={isCancelling}
                                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Keep Booking
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCancel}
                                    disabled={isCancelling}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-semibold text-white flex items-center justify-center gap-2"
                                >
                                    {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>

            <PublicSiteFooter
                clinic={clinic}
                footerConfig={footerConfig}
            />
        </div>
    );
}
