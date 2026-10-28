import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    Phone,
    MapPin,
    Stethoscope,
    CheckCircle2,
    AlertCircle,
    Printer,
    Share2,
    Shield,
    Sparkles,
    User,
    CreditCard,
    Ticket,
    ChevronRight,
    ArrowRight,
} from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

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
        logo_url?: string;
        whatsapp_number?: string;
        opening_hours?: string;
    };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    theme?: string;
    sessions: SessionItem[];
}

export default function BookToken({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    sessions = [],
}: Props) {
    const { flash, errors } = usePage<{
        auth: { user: any };
        flash?: { success?: string; error?: string };
        errors: Record<string, string>;
    }>().props;

    // Check if a specific session ID was requested via query param
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialSessionId = urlParams ? Number(urlParams.get('session')) : 0;

    // If query param provided a valid session ID, select it; otherwise start unselected so user chooses
    const initialMatch = sessions.find((s) => s.id === initialSessionId);

    const { data, setData, post, processing, reset } = useForm({
        doctor_session_id: initialMatch ? initialMatch.id : 0,
        name: '',
        phone: '',
        nic: '',
        city: '',
        notes: '',
        website_hp: '', // Honeypot field (hidden)
    });

    const [selectedSession, setSelectedSession] = useState<SessionItem | undefined>(initialMatch);

    useEffect(() => {
        if (data.doctor_session_id) {
            const found = sessions.find((s) => s.id === Number(data.doctor_session_id));
            setSelectedSession(found);
        } else {
            setSelectedSession(undefined);
        }
    }, [data.doctor_session_id, sessions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSession || selectedSession.is_full) return;

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

    // Determine active step for slim progress indicator
    // Step 1: Choose session, Step 2: Your details, Step 3: Confirm
    const currentStep = flash?.success ? 3 : selectedSession ? 2 : 1;

    // Submit button label and state
    const getSubmitButtonLabel = () => {
        if (!selectedSession) return 'Choose a session first';
        if (selectedSession.is_full) return 'Selected session is full';
        if (processing) return 'Issuing Channeling Token...';
        return 'Confirm & Issue Appointment Token';
    };

    const isSubmitDisabled = processing || !selectedSession || selectedSession.is_full;

    const rawPhone = (clinic.phone || '+94 70 129 1688').replace(/\s+/g, '');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans flex flex-col">
            <Head title={`Book Doctor Token - ${clinic.name}`} />

            {/* 1. Shared Public Header */}
            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            {/* 2. Slim Step Progress Bar Under Header */}
            <div className="bg-white border-b border-slate-200/80 py-3 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-center">
                    <nav
                        aria-label="Booking Progress"
                        className="inline-flex items-center gap-2 sm:gap-4 text-xs font-bold text-slate-500"
                    >
                        {/* Step 1 */}
                        <div
                            className={`flex items-center gap-1.5 ${
                                currentStep >= 1 ? 'text-teal-700' : 'text-slate-400'
                            }`}
                        >
                            <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    currentStep > 1
                                        ? 'bg-teal-600 text-white'
                                        : currentStep === 1
                                        ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-500'
                                        : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                1
                            </span>
                            <span className={currentStep === 1 ? 'font-extrabold text-slate-900' : ''}>
                                Choose session
                            </span>
                        </div>

                        <span className="text-slate-300 font-normal">·</span>

                        {/* Step 2 */}
                        <div
                            className={`flex items-center gap-1.5 ${
                                currentStep >= 2 ? 'text-teal-700' : 'text-slate-400'
                            }`}
                        >
                            <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    currentStep > 2
                                        ? 'bg-teal-600 text-white'
                                        : currentStep === 2
                                        ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-500'
                                        : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                2
                            </span>
                            <span className={currentStep === 2 ? 'font-extrabold text-slate-900' : ''}>
                                Your details
                            </span>
                        </div>

                        <span className="text-slate-300 font-normal">·</span>

                        {/* Step 3 */}
                        <div
                            className={`flex items-center gap-1.5 ${
                                currentStep === 3 ? 'text-teal-700 font-extrabold' : 'text-slate-400'
                            }`}
                        >
                            <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    currentStep === 3
                                        ? 'bg-teal-600 text-white ring-2 ring-teal-500'
                                        : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                3
                            </span>
                            <span className={currentStep === 3 ? 'font-extrabold text-slate-900' : ''}>
                                Confirm
                            </span>
                        </div>
                    </nav>
                </div>
            </div>

            {/* 3. Main Content Container */}
            <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
                {/* Introduction Header */}
                <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        Live Online Channeling Portal
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Doctor Channeling Token
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600">
                        Reserve a guaranteed specialist channeling appointment with instant digital queue confirmation.
                    </p>
                </div>

                {/* Success Voucher (Displayed upon successful booking) */}
                {flash?.success && (
                    <div className="mb-8 p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-400 text-emerald-950 shadow-md space-y-4 animate-in fade-in duration-200">
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
                                Consultation fees are collected at the clinic reception desk upon arrival.
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-100 shadow-xs transition-colors"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Token Slip</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleWhatsAppShare}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-xs transition-colors"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>Share to WhatsApp</span>
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

                {/* CASE A: No Sessions Available -> Proper Empty State */}
                {sessions.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xs text-center space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mx-auto shadow-xs">
                            <Stethoscope className="w-8 h-8" />
                        </div>

                        <div className="max-w-md mx-auto space-y-2">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                No sessions open for booking right now
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Our medical specialists update their weekly channeling suites regularly. You can reach out directly to our clinical front desk or explore our doctors roster.
                            </p>
                        </div>

                        {/* Clinic hotline call button */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <a
                                href={`tel:${rawPhone}`}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                            >
                                <Phone className="w-4 h-4" />
                                <span>Call Clinic Hotline ({clinic.phone || '070 129 1688'})</span>
                            </a>

                            <Link
                                href="/#doctors"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                            >
                                <User className="w-4 h-4 text-slate-600" />
                                <span>View our doctors</span>
                            </Link>
                        </div>

                        {/* Opening hours info */}
                        <div className="pt-4 border-t border-slate-100 max-w-sm mx-auto text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>
                                {clinic.opening_hours || 'Clinic Hours: Mon – Sat: 07:30 AM – 10:00 PM | Sun: 08:00 AM – 08:00 PM'}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* CASE B: Sessions Exist -> Step 1 Card Selection & Step 2 Form */
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8"
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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                                        1
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-extrabold text-slate-900">
                                            Choose Channeling Session
                                        </h2>
                                        <p className="text-[11px] text-slate-500">
                                            Select your medical consultant from available suites
                                        </p>
                                    </div>
                                </div>

                                {selectedSession && (
                                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                                        Session Selected
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {sessions.map((sess) => {
                                    const isSelected = Number(data.doctor_session_id) === sess.id;
                                    return (
                                        <label
                                            key={sess.id}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                                                sess.is_full
                                                    ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                                                    : isSelected
                                                    ? 'border-teal-600 bg-teal-50/60 shadow-sm ring-2 ring-teal-600'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    {/* Doctor Avatar / Initials */}
                                                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                                        {sess.doctor_name.replace(/^(Dr\.|Prof\.)\s*/i, '').charAt(0) || 'D'}
                                                    </div>

                                                    <div className="space-y-0.5">
                                                        <input
                                                            type="radio"
                                                            name="doctor_session_id"
                                                            disabled={sess.is_full}
                                                            checked={isSelected}
                                                            onChange={() => setData('doctor_session_id', sess.id)}
                                                            className="sr-only"
                                                        />
                                                        <span className="inline-block text-[10px] font-extrabold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                                                            {sess.doctor_specialty}
                                                        </span>
                                                        <h3 className="font-extrabold text-sm text-slate-900 pt-0.5 leading-tight">
                                                            {sess.doctor_name}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {sess.room_number}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-xs font-black text-slate-900 shrink-0">
                                                    {sess.total_fee_formatted}
                                                </span>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                                <span className="text-slate-600 font-medium">
                                                    {sess.session_date}
                                                </span>
                                                <span className="font-mono font-bold text-teal-700">
                                                    {sess.start_time}
                                                </span>
                                            </div>

                                            <div className="mt-2 text-[11px] flex items-center justify-between">
                                                {sess.is_full ? (
                                                    <span className="font-bold text-red-600">Full</span>
                                                ) : (
                                                    <span className="font-bold text-emerald-700">
                                                        {sess.available_tokens_count} spots left
                                                    </span>
                                                )}

                                                {isSelected && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                                        Selected
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 2: Patient Information - HIDDEN UNTIL A SESSION IS SELECTED */}
                        {selectedSession ? (
                            <div className="space-y-5 pt-6 border-t border-slate-200/80 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                                        2
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-extrabold text-slate-900">
                                            Patient Details
                                        </h2>
                                        <p className="text-[11px] text-slate-500">
                                            Token SMS confirmation and estimated consultation time will be sent here
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Patient Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="e.g. K. A. Perera"
                                            className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50/70 py-2.5 px-3 font-medium text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Mobile Phone (+94) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="+94 77 123 4567"
                                            className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50/70 py-2.5 px-3 font-medium text-slate-900"
                                        />
                                        <span className="text-[10px] text-slate-400 mt-1 block">
                                            Token updates and approximate consult times will be sent here.
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            NIC / Passport (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={data.nic}
                                            onChange={(e) => setData('nic', e.target.value)}
                                            placeholder="199012345678 or 901234567V"
                                            className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50/70 py-2.5 px-3 font-medium text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            City / District
                                        </label>
                                        <input
                                            type="text"
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                            placeholder="e.g. Colombo, Kandy, Galle"
                                            className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50/70 py-2.5 px-3 font-medium text-slate-900"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Short Clinical Notes (Optional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder="Reason for visit or any existing medical history..."
                                            className="w-full text-xs rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600 bg-slate-50/70 py-2 px-3 font-medium text-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Shortened Yellow Notice: One Friendly Line */}
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                                    <span className="text-[11px] leading-relaxed">
                                        Approximate consult times may vary with doctor velocity. Please arrive 15 minutes before your token time.
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                                Please select an available channeling session above to proceed with patient details.
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black text-sm shadow-xl transition-all ${
                                    isSubmitDisabled
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                        : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30 active:scale-98'
                                }`}
                            >
                                <Ticket className="w-4 h-4" />
                                <span>{getSubmitButtonLabel()}</span>
                            </button>
                        </div>
                    </form>
                )}
            </main>

            {/* 4. Shared Public Footer */}
            <PublicSiteFooter
                clinic={clinic}
                footerConfig={footerConfig}
                themePreset={theme}
            />
        </div>
    );
}
