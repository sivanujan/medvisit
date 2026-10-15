import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    Phone,
    MapPin,
    Stethoscope,
    CheckCircle2,
    ArrowLeft,
    AlertCircle,
    Printer,
    Share2,
    Shield,
    Sparkles,
    User,
    CreditCard,
    Ticket,
} from 'lucide-react';

interface SessionItem {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    start_time: string;
    room_number: string;
    available_tokens_count: number;
    is_full: boolean;
    total_fee_formatted: string;
}

interface Props {
    clinic: {
        name: string;
        phone?: string;
        address?: string;
        subdomain: string;
    };
    sessions: SessionItem[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function BookToken({ clinic, sessions }: Props) {
    const { flash, errors } = usePage<{
        auth: { user: any };
        flash?: { success?: string; error?: string };
        errors: Record<string, string>;
    }>().props;

    // Check if a specific session ID was requested via query param
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialSessionId = urlParams ? Number(urlParams.get('session')) : 0;

    const { data, setData, post, processing, reset } = useForm({
        doctor_session_id: initialSessionId || (sessions.length > 0 ? sessions[0].id : 0),
        name: '',
        phone: '',
        nic: '',
        city: '',
        notes: '',
        website_hp: '', // Honeypot field (hidden)
    });

    const [selectedSession, setSelectedSession] = useState<SessionItem | undefined>(
        sessions.find((s) => s.id === data.doctor_session_id) || sessions[0]
    );

    useEffect(() => {
        const found = sessions.find((s) => s.id === Number(data.doctor_session_id));
        setSelectedSession(found);
    }, [data.doctor_session_id, sessions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/book', {
            onSuccess: () => {
                reset('name', 'phone', 'nic', 'city', 'notes');
            },
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        if (!flash?.success) return;
        const text = encodeURIComponent(
            `*MedVisit Channeling Appointment - ${clinic.name}*\n${flash.success}\nClinic Hotline: ${clinic.phone || ''}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans pb-16">
            <Head title={`Book Doctor Token - ${clinic.name}`} />

            {/* Header Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4 text-teal-600" />
                        Back to {clinic.name}
                    </Link>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                            {clinic.name.charAt(0)}
                        </div>
                        <span className="font-extrabold text-sm text-slate-900 hidden sm:inline">
                            {clinic.name}
                        </span>
                    </div>

                    <span className="text-xs font-medium text-slate-500 font-mono">
                        Online Channeling Portal
                    </span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
                {/* Title & Introduction */}
                <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        Instant Digital Queue Confirmation
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Channeling Token Booking
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600">
                        Select an upcoming specialist session, enter patient details, and receive your live queue number instantly.
                    </p>
                </div>

                {/* Success Voucher (Displayed upon successful booking) */}
                {flash?.success && (
                    <div className="mb-8 p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-400 text-emerald-950 shadow-md space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h3 className="font-extrabold text-base text-emerald-900">
                                    Token Issued Successfully!
                                </h3>
                                <p className="text-xs sm:text-sm text-emerald-800 font-medium">
                                    {flash.success}
                                </p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <span className="text-emerald-700 italic">
                                Payments are collected upon arrival at the clinic reception desk.
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-100 shadow-sm"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Print Token Slip
                                </button>
                                <button
                                    type="button"
                                    onClick={handleWhatsAppShare}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-sm"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Share to WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {(flash?.error || Object.keys(errors).length > 0) && (
                    <div className="mb-8 p-4 bg-red-50 rounded-2xl border border-red-300 text-red-900 text-xs flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-bold">Booking could not be processed:</strong>
                            <p>{flash?.error || Object.values(errors)[0]}</p>
                        </div>
                    </div>
                )}

                {/* Main Booking Form Card */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-8"
                >
                    {/* Honeypot Field for Spam Protection */}
                    <input
                        type="text"
                        name="website_hp"
                        value={data.website_hp}
                        onChange={(e) => setData('website_hp', e.target.value)}
                        style={{ display: 'none' }}
                        tabIndex={-1}
                        autoComplete="off"
                    />

                    {/* Step 1: Select Channeling Session */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                                1
                            </span>
                            <h2 className="text-sm font-bold text-slate-900">
                                Select Specialist Channeling Session
                            </h2>
                        </div>

                        {sessions.length === 0 ? (
                            <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 border border-slate-200">
                                No active channeling sessions available for booking right now. Please check back soon or contact the clinic reception.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sessions.map((sess) => (
                                    <label
                                        key={sess.id}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                                            sess.is_full
                                                ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                                                : Number(data.doctor_session_id) === sess.id
                                                ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-1 ring-teal-600'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <input
                                                    type="radio"
                                                    name="doctor_session_id"
                                                    disabled={sess.is_full}
                                                    checked={Number(data.doctor_session_id) === sess.id}
                                                    onChange={() => setData('doctor_session_id', sess.id)}
                                                    className="sr-only"
                                                />
                                                <span className="text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                                                    {sess.doctor_specialty}
                                                </span>
                                                <h3 className="font-extrabold text-sm text-slate-900 pt-1">
                                                    {sess.doctor_name}
                                                </h3>
                                                <p className="text-xs text-slate-500">{sess.room_number}</p>
                                            </div>

                                            <span className="text-xs font-bold text-slate-900">
                                                {sess.total_fee_formatted}
                                            </span>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-600 font-medium">{sess.session_date}</span>
                                            <span className="font-mono font-bold text-teal-700">{sess.start_time}</span>
                                        </div>

                                        <div className="mt-2 text-[11px]">
                                            {sess.is_full ? (
                                                <span className="font-bold text-red-600">Full</span>
                                            ) : (
                                                <span className="font-semibold text-emerald-700">
                                                    {sess.available_tokens_count} spots left
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Patient Information */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                                2
                            </span>
                            <h2 className="text-sm font-bold text-slate-900">
                                Patient Details
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Patient Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. K. A. Perera"
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50 py-2.5 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Mobile Phone (+94) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+94 77 123 4567"
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50 py-2.5 px-3"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Token updates and approximate consult times will be sent here.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    NIC / Passport (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={data.nic}
                                    onChange={(e) => setData('nic', e.target.value)}
                                    placeholder="199012345678 or 901234567V"
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50 py-2.5 px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    City / District
                                </label>
                                <input
                                    type="text"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    placeholder="e.g. Colombo, Kandy, Galle"
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50 py-2.5 px-3"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Short Clinical Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Reason for visit or any existing medical history..."
                                    className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50 py-2 px-3"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notice & Approximate Timing Disclaimer */}
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-amber-950">
                            <Clock className="w-4 h-4 text-amber-700" />
                            <span>Sri Lankan Doctor Channeling Notice</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            Token consultation times are calculated <strong>approximately</strong> based on doctor consult velocity. To ensure smooth queue flow, please arrive at the clinic lounge 15 minutes before your estimated time. Maximum 1 active token per phone per session.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={processing || sessions.length === 0 || selectedSession?.is_full}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-black text-sm shadow-xl shadow-teal-600/30 transition-all disabled:opacity-50"
                        >
                            <Ticket className="w-4 h-4" />
                            {processing ? 'Issuing Channeling Token...' : 'Confirm & Issue Appointment Token'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
