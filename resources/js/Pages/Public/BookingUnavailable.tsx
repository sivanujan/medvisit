import React from 'react';
import { Head } from '@inertiajs/react';
import { Phone, MapPin, Clock, MessageCircle, PhoneCall, CalendarX } from 'lucide-react';

interface Props {
    mode?: 'booking_off' | 'technical_outage';
    clinicName: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    openingHours?: string;
    isOpenNow?: boolean;
    isDemo?: boolean;
}

export default function BookingUnavailable({
    mode = 'booking_off',
    clinicName,
    phone = '070 129 1688',
    whatsapp,
    address = 'Sri Lanka',
    openingHours = 'Mon – Sat: 08:00 AM – 08:00 PM | Sun: 08:00 AM – 02:00 PM',
    isOpenNow = true,
}: Props) {
    const isBookingOff = mode === 'booking_off';
    const waNumber = (whatsapp || phone).replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/${waNumber}`;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
            <Head title={`${isBookingOff ? 'Book by phone' : 'Online Booking Unavailable'} - ${clinicName}`} />

            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
                        MV
                    </div>
                    <div>
                        <span className="font-semibold text-white tracking-tight">{clinicName}</span>
                        <span className="text-xs text-slate-400 block">Patient Appointment Portal</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur shadow-2xl text-center">
                    {/* Icon Header */}
                    {isBookingOff ? (
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
                            <PhoneCall className="w-8 h-8 text-teal-400" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                            <CalendarX className="w-8 h-8 text-amber-400" />
                        </div>
                    )}

                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        {isBookingOff ? 'Book by phone' : 'Online Booking Unavailable'}
                    </h1>

                    {/* Explanatory Text */}
                    <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
                        {isBookingOff ? (
                            <>
                                <span className="font-semibold text-white">{clinicName}</span> takes appointments by
                                phone or at the reception.
                            </>
                        ) : (
                            <>
                                Online appointment scheduling for{' '}
                                <span className="font-semibold text-white">{clinicName}</span> is temporarily offline.
                            </>
                        )}
                    </p>

                    {/* Action Buttons (Call & WhatsApp) */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        {phone && (
                            <a
                                href={`tel:${phone}`}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/20 active:scale-98 transition-all"
                            >
                                <Phone className="w-4 h-4" />
                                <span>Call {phone}</span>
                            </a>
                        )}

                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
                        >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>Chat on WhatsApp</span>
                        </a>
                    </div>

                    {/* Direct Details Cards: Address & Opening Hours with Open now / Closed */}
                    <div className="mt-8 space-y-3.5 text-left">
                        {/* Address Card */}
                        {address && (
                            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Clinic Location
                                    </span>
                                    <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">{address}</p>
                                </div>
                            </div>
                        )}

                        {/* Opening Hours Card */}
                        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Opening Hours
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                            isOpenNow
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-slate-700/60 text-slate-400 border border-slate-600/40'
                                        }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                                            }`}
                                        />
                                        <span>{isOpenNow ? 'Open now' : 'Closed'}</span>
                                    </span>
                                </div>
                                <p className="text-sm text-slate-200 mt-1 leading-relaxed">{openingHours}</p>
                            </div>
                        </div>

                        {/* Reception Note */}
                        <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-teal-500/80 shrink-0" />
                            <span>In-person walk-in channeling tokens are issued at the clinic reception.</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
                <a
                    href="https://medvisit.lk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-400 hover:underline transition-colors"
                >
                    Powered by MedVisit
                </a>
            </footer>
        </div>
    );
}
