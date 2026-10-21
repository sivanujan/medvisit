import React from 'react';
import { Head } from '@inertiajs/react';
import { CalendarX, Phone, MapPin, Building2, Clock } from 'lucide-react';

interface Props {
    clinicName: string;
    phone?: string;
    address?: string;
}

export default function BookingUnavailable({ clinicName, phone, address }: Props) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
            <Head title={`Online Booking Unavailable - ${clinicName}`} />

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
                <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                        <CalendarX className="w-8 h-8 text-amber-400" />
                    </div>

                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Online Booking Unavailable
                    </h1>

                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                        Online appointment scheduling for <span className="font-semibold text-white">{clinicName}</span> is temporarily offline.
                    </p>

                    {/* Direct Contact Card */}
                    <div className="mt-6 p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-3">
                        <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                            Contact Clinic Directly
                        </div>

                        {phone && (
                            <div className="flex items-center space-x-3 text-sm text-slate-200">
                                <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
                                    <Phone className="w-3.5 h-3.5" />
                                </div>
                                <a
                                    href={`tel:${phone}`}
                                    className="font-semibold text-teal-400 hover:text-teal-300 transition"
                                >
                                    {phone}
                                </a>
                            </div>
                        )}

                        {address && (
                            <div className="flex items-start space-x-3 text-xs text-slate-300">
                                <div className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <span className="leading-relaxed">{address}</span>
                            </div>
                        )}

                        <div className="flex items-center space-x-3 text-xs text-slate-400 pt-2 border-t border-slate-700/60">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>In-person walk-in consultations may still be available.</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
                Powered by MedVisit Healthcare OS
            </footer>
        </div>
    );
}
