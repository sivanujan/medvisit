import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Stethoscope,
    Sparkles,
    ShieldCheck,
    AlertCircle,
    User,
    Mail,
    FileText,
    Check,
    CreditCard,
    Info,
    HelpCircle,
    HeartHandshake,
} from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import PhoneVerificationSection from '@/Components/Booking/PhoneVerificationSection';

interface VisitTypeItem {
    id: number;
    name: string;
    code: string;
    pricing_type: string;
    percentage_value?: number;
    fixed_fee_cents?: number;
    is_default?: boolean;
}

interface Props {
    clinic: {
        name: string;
        subdomain: string;
        phone: string;
        address: string;
        logo_url?: string;
        whatsapp_number?: string;
        opening_hours?: string;
        allow_any_doctor?: boolean;
    };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    theme?: string;
    requirePhoneVerification?: boolean;
    verificationChannels?: string[];
    initialVerifiedPhone?: string | null;
    doctor: {
        id: number;
        name: string;
        title: string;
        full_title: string;
        specialty: string;
        slug: string;
        photo_url?: string | null;
        avg_consultation_minutes: number;
    };
    session: {
        id: number;
        session_date_raw: string;
        session_date_formatted: string;
        start_time: string;
        end_time: string;
        room_number: string;
        max_tokens: number;
        available_tokens: number;
        next_token_number: number;
        approx_time: string;
    };
    feeBreakdown: {
        doctor_fee_formatted: string;
        clinic_fee_formatted: string;
        online_fee_formatted: string | null;
        total_formatted: string;
        total_cents: number;
    };
    visitTypes: VisitTypeItem[];
    arrivalNote: string;
}

export default function PatientDetails({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    doctor,
    session,
    feeBreakdown,
    visitTypes = [],
    arrivalNote,
    requirePhoneVerification = true,
    verificationChannels = ['whatsapp', 'textlk'],
    initialVerifiedPhone = null,
}: Props) {
    const defaultVisitType = visitTypes.find((v) => v.is_default) || (visitTypes.length > 0 ? visitTypes[0] : null);

    const [draftSessionId] = useState<string>(() => 'draft_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now());
    const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(() => {
        if (!requirePhoneVerification) return true;
        return !!initialVerifiedPhone;
    });

    const { data, setData, post, processing, errors } = useForm({
        doctor_session_id: session.id,
        name: '',
        phone: initialVerifiedPhone || '',
        nic: '',
        email: '',
        city: '',
        visit_type_id: defaultVisitType ? defaultVisitType.id : '',
        notes: '',
        is_booking_for_other: false,
        other_patient_name: '',
        consent: false,
        website_hp: '', // Honeypot field
        verification_session_id: draftSessionId,
    });

    useEffect(() => {
        // Enforce bright, clean healthcare theme on public booking pages
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/book');
    };

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

            <Head title={`Patient Details - Channeling with ${doctor.full_title} - ${clinic.name}`} />

            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                {/* Back button */}
                <div className="mb-6">
                    <Link
                        href={`/book/${doctor.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 group-hover:text-teal-600 transition-transform" />
                        <span>Change Date or Session</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: Booking Summary Panel */}
                    <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg shadow-slate-200/40 sticky top-24">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 mb-1">
                                    Appointment Summary
                                </span>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {doctor.full_title}
                                </h2>
                                <p className="text-xs font-medium text-slate-500">{doctor.specialty}</p>
                            </div>

                            <Link
                                href={`/book/${doctor.slug}`}
                                className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-4"
                            >
                                Change
                            </Link>
                        </div>

                        {/* Session Date & Time */}
                        <div className="py-5 space-y-4 border-b border-slate-100 text-sm">
                            <div className="flex items-start gap-3 text-slate-700">
                                <Calendar className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-900">{session.session_date_formatted}</p>
                                    <p className="text-xs text-slate-500">{session.start_time} – {session.end_time}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-slate-700">
                                <Clock className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-900">Estimated Consultation</p>
                                    <p className="text-xs text-slate-500">
                                        Token #{session.next_token_number} &bull; Approx. ~{session.approx_time}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-slate-700">
                                <MapPin className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-900">{clinic.name}</p>
                                    <p className="text-xs text-slate-500">{session.room_number} &bull; {clinic.address}</p>
                                </div>
                            </div>
                        </div>

                        {/* Fee Breakdown (Step 4 Preview) */}
                        <div className="py-5 border-b border-slate-100">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                Fee Breakdown
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Doctor Consultation Fee</span>
                                    <span className="font-medium text-slate-900">{feeBreakdown.doctor_fee_formatted}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Clinic Facility & Service Fee</span>
                                    <span className="font-medium text-slate-900">{feeBreakdown.clinic_fee_formatted}</span>
                                </div>
                                {feeBreakdown.online_fee_formatted && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Online Platform Fee</span>
                                        <span className="font-medium text-slate-900">{feeBreakdown.online_fee_formatted}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                                    <span>Total Payable at Clinic</span>
                                    <span className="text-teal-700 text-base">{feeBreakdown.total_formatted}</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrival Instructions */}
                        <div className="pt-5">
                            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-900 leading-relaxed">
                                    {arrivalNote}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Patient Details Form */}
                    <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-lg shadow-slate-200/40">
                        <div className="mb-8">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/60 mb-2">
                                <User className="w-3.5 h-3.5 text-teal-600" />
                                <span>Step 3 of 3 &bull; Patient Registration</span>
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Enter Patient Information
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                An instant SMS/digital channeling token and estimated consultation time will be issued upon confirmation.
                            </p>
                        </div>

                        {/* Top General Error */}
                        {errors.doctor_session_id && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Unable to issue token</p>
                                    <p>{errors.doctor_session_id}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Honeypot hidden input */}
                            <div className="hidden" aria-hidden="true">
                                <input
                                    type="text"
                                    name="website_hp"
                                    value={data.website_hp}
                                    onChange={(e) => setData('website_hp', e.target.value)}
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </div>

                            {/* Booking for someone else toggle */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_booking_for_other}
                                        onChange={(e) => setData('is_booking_for_other', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-slate-800">
                                            Booking for someone else?
                                        </span>
                                        <p className="text-xs text-slate-500">
                                            Book on behalf of a parent, child, or family member using your contact number.
                                        </p>
                                    </div>
                                </label>

                                {data.is_booking_for_other && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 pt-3 border-t border-slate-200/60 space-y-1"
                                    >
                                        <label className="block text-xs font-semibold text-slate-700">
                                            Patient's Full Name (Person Seeing Doctor) *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.other_patient_name}
                                            onChange={(e) => setData('other_patient_name', e.target.value)}
                                            placeholder="e.g. Master K. Sivalingam"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                            required={data.is_booking_for_other}
                                        />
                                        {errors.other_patient_name && (
                                            <p className="text-xs text-rose-600 mt-1">{errors.other_patient_name}</p>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                            {/* Primary Contact Full Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    {data.is_booking_for_other ? 'Your Name (Contact Person) *' : 'Full Name *'}
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Priyantha Jayawardena"
                                    className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                                        errors.name
                                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                            : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/20'
                                    }`}
                                    required
                                />
                                {errors.name && (
                                    <p className="text-xs text-rose-600 font-medium">{errors.name}</p>
                                )}
                            </div>

                            {/* Phone Input (+94) */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Mobile Phone Number *
                                </label>
                                <PhoneInput
                                    value={data.phone}
                                    onChange={(val) => {
                                        setData('phone', val);
                                        if (requirePhoneVerification && isPhoneVerified) {
                                            setIsPhoneVerified(false);
                                        }
                                    }}
                                    placeholder="077 123 4567"
                                    error={errors.phone}
                                    required
                                />
                                <p className="text-[11px] text-slate-400">
                                    Sri Lanka mobile number (+94). Token details and updates will be sent here.
                                </p>
                                {errors.phone && (
                                    <p className="text-xs text-rose-600 font-medium">{errors.phone}</p>
                                )}

                                {/* Phone Verification Component (Reverse WhatsApp + Text.lk SMS) */}
                                <PhoneVerificationSection
                                    phone={data.phone}
                                    sessionId={draftSessionId}
                                    isVerified={isPhoneVerified}
                                    setIsVerified={setIsPhoneVerified}
                                    requireVerification={requirePhoneVerification}
                                    allowedChannels={verificationChannels}
                                    initialVerifiedPhone={initialVerifiedPhone}
                                    onChangeNumber={() => setData('phone', '')}
                                />
                            </div>

                            {/* NIC and Email in 2 columns */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                        NIC / Passport (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.nic}
                                        onChange={(e) => setData('nic', e.target.value)}
                                        placeholder="e.g. 199012345678"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                    />
                                    {errors.nic && (
                                        <p className="text-xs text-rose-600 font-medium">{errors.nic}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                        Email Address (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400">
                                        To receive calendar invitation and email receipt.
                                    </p>
                                    {errors.email && (
                                        <p className="text-xs text-rose-600 font-medium">{errors.email}</p>
                                    )}
                                </div>
                            </div>

                            {/* Visit Type Selection (if configured) */}
                            {visitTypes.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                        Consultation Type
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {visitTypes.map((vt) => {
                                            const isSelected = String(data.visit_type_id) === String(vt.id);
                                            return (
                                                <button
                                                    key={vt.id}
                                                    type="button"
                                                    onClick={() => setData('visit_type_id', vt.id)}
                                                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                        isSelected
                                                            ? 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-600 text-teal-950 font-semibold'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="text-xs">{vt.name}</span>
                                                    {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Short Reason / Medical Notes */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Reason for Visit / Clinical Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Brief description of symptoms, routine check-up, prescription renewal..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                />
                            </div>

                            {/* Consent Checkbox */}
                            <div className="pt-2">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.consent}
                                        onChange={(e) => setData('consent', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 rounded border-slate-300 mt-1 focus:ring-teal-500"
                                        required
                                    />
                                    <span className="text-xs text-slate-600 leading-relaxed">
                                        I confirm that the details provided are accurate. I understand that appointment times are approximate based on patient consultation duration and agree to the clinic channeling policies.
                                    </span>
                                </label>
                                {errors.consent && (
                                    <p className="text-xs text-rose-600 font-medium mt-1">{errors.consent}</p>
                                )}
                            </div>

                            {/* Review & Confirm Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={processing || !data.consent || (requirePhoneVerification && !isPhoneVerified)}
                                    className="w-full py-4 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 transition-all hover:scale-[1.005] active:scale-[0.995]"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Issuing Token #{session.next_token_number}...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-5 h-5" />
                                            <span>Confirm Booking &bull; Token #{session.next_token_number}</span>
                                        </>
                                    )}
                                </button>

                                {requirePhoneVerification && !isPhoneVerified && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50/90 py-2.5 px-3 rounded-xl border border-amber-200 mt-2.5">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                        <span>Verify your mobile number to continue</span>
                                    </div>
                                )}

                                <p className="text-center text-[11px] text-slate-400 mt-2">
                                    No payment required now. Pay cash or card at the clinic reception upon arrival.
                                </p>
                            </div>
                        </form>
                    </div>

                </div>
            </main>

            <PublicSiteFooter
                clinic={clinic}
                footerConfig={footerConfig}
            />
        </div>
    );
}
