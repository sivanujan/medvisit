import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import LandingNav from '@/Components/Landing/LandingNav';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import {
    ShieldCheck,
    Ticket,
    Stethoscope,
    Pill,
    ArrowRight,
    Sparkles,
    Tv,
    CalendarCheck,
    RotateCcw,
    CheckCircle2,
    Lock,
    Clock,
    Activity,
    Users,
    ChevronRight,
    MapPin,
    AlertCircle,
    UserCheck,
} from 'lucide-react';

interface RoleInfo {
    name: string;
    title: string;
    description: string;
    email: string;
    icon: string;
    badge: string;
    tourKey: string;
}

interface ActiveSession {
    id: number;
    doctor_name: string;
    specialty: string;
    token_code: string;
    status: string;
    room: string;
    start_time: string;
    end_time: string;
    current_token: number;
    max_tokens: number;
}

interface RememberedLead {
    id: number;
    contact_name: string;
    clinic_name: string;
    phone: string;
    email?: string | null;
    city?: string | null;
    roles_tried?: string[];
}

interface DemoPageProps {
    rememberedLead?: RememberedLead | null;
    roles: Record<string, RoleInfo>;
    activeSessions: ActiveSession[];
    demoUrls: {
        root: string;
        tv: string;
        booking: string;
    };
    turnstileSiteKey?: string;
    preselectedRole?: string | null;
}

export default function DemoPage({
    rememberedLead,
    roles,
    activeSessions = [],
    demoUrls,
    turnstileSiteKey,
    preselectedRole,
}: DemoPageProps) {
    const getInitialRole = () => {
        const valid = ['clinic_admin', 'receptionist', 'doctor', 'pharmacist'];
        if (preselectedRole && valid.includes(preselectedRole)) {
            return preselectedRole;
        }
        if (typeof window !== 'undefined') {
            const param = new URLSearchParams(window.location.search).get('role');
            if (param && valid.includes(param)) {
                return param;
            }
        }
        return 'clinic_admin';
    };

    const [selectedRole, setSelectedRole] = useState<string>(getInitialRole);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // If user has a remembered lead, allow instant launch or toggle new details
    const [useNewLead, setUseNewLead] = useState(false);

    // Form inputs
    const [contactName, setContactName] = useState(rememberedLead?.contact_name || '');
    const [clinicName, setClinicName] = useState(rememberedLead?.clinic_name || '');
    const [phone, setPhone] = useState(rememberedLead?.phone || '');
    const [email, setEmail] = useState(rememberedLead?.email || '');
    const [city, setCity] = useState(rememberedLead?.city || 'Jaffna');
    const [consent, setConsent] = useState(true);

    const isRemembered = Boolean(rememberedLead && !useNewLead);

    const roleDetails = {
        clinic_admin: {
            title: 'Clinic Admin & Owner',
            persona: 'Dr. K. Nimalan',
            badge: 'Full Clinic Control',
            description: 'Explore the executive dashboard, track daily clinic revenue, configure doctor fee splits, manage staff privileges, and view audit trails.',
            highlights: ['Revenue & settlement reports', 'Doctor split configuration', 'Staff & clinic settings'],
            icon: ShieldCheck,
            color: 'from-blue-600 to-indigo-600',
            borderHover: 'hover:border-blue-500',
            bgGlow: 'bg-blue-500/10',
            accentText: 'text-blue-600 dark:text-blue-400',
        },
        receptionist: {
            title: 'Reception & Cashier',
            persona: 'Sanduni Silva',
            badge: 'Fast Outpatient Flow',
            description: 'Issue tokens in under 15 seconds, check in walk-in & online patients, collect card/cash payments with auto-calculated doctor/clinic fees, and print thermal slips.',
            highlights: ['15-sec token issuance', 'Live waiting lounge queue', 'Split fee receipt printing'],
            icon: Ticket,
            color: 'from-teal-600 to-emerald-600',
            borderHover: 'hover:border-teal-500',
            bgGlow: 'bg-teal-500/10',
            accentText: 'text-teal-600 dark:text-teal-400',
        },
        doctor: {
            title: 'Consultant Doctor',
            persona: 'Dr. Nimal Senaratne',
            badge: 'Consultation Station',
            description: 'Call the next patient with 1 click, view clinical history, compose prescriptions with evidence-based templates in English, Tamil, or Sinhala, and auto-route to pharmacy.',
            highlights: ['1-click next patient call', 'Multilingual prescriptions (EN/TA/SI)', '6 ready-made clinical templates'],
            icon: Stethoscope,
            color: 'from-sky-600 to-blue-700',
            borderHover: 'hover:border-sky-500',
            bgGlow: 'bg-sky-500/10',
            accentText: 'text-sky-600 dark:text-sky-400',
        },
        pharmacist: {
            title: 'Chief Pharmacist',
            persona: 'Rohan Perera',
            badge: 'Dispense Counter',
            description: 'Receive prescriptions in real-time as doctors finalize them. Deplete stock batches with FIFO expiry tracking, monitor reorder alerts, and manage supplier GRNs.',
            highlights: ['Real-time dispense queue', 'Batch expiry & stock alerts', 'Supplier purchase GRNs'],
            icon: Pill,
            color: 'from-amber-500 to-orange-600',
            borderHover: 'hover:border-amber-500',
            bgGlow: 'bg-amber-500/10',
            accentText: 'text-amber-600 dark:text-amber-400',
        },
    };

    const handleLaunch = async (e?: React.FormEvent, directRole?: string) => {
        if (e) e.preventDefault();

        const roleToLaunch = directRole || selectedRole;
        setSelectedRole(roleToLaunch);
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = {
                role: roleToLaunch,
                contact_name: contactName || rememberedLead?.contact_name || 'Dr. Guest',
                clinic_name: clinicName || rememberedLead?.clinic_name || 'Demo Medical Clinic',
                phone: phone || rememberedLead?.phone || '0770001111',
                email: email || undefined,
                city: city || undefined,
                consent: consent,
            };

            const response = await fetch('/demo/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                const err = data.errors ? Object.values(data.errors)[0] : data.message || 'Unable to launch demo sandbox.';
                setErrorMessage(Array.isArray(err) ? err[0] : err);
                setIsSubmitting(false);
                return;
            }

            // Redirect into the demo sandbox signed URL
            window.location.href = data.redirect_url;
        } catch (err: any) {
            setErrorMessage('Network error while connecting to the demo clinic. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-primary-500 selection:text-white">
            <Head>
                <title>Interactive Demo Clinic — MedVisit</title>
                <meta
                    name="description"
                    content="Experience MedVisit with 1-click role logins. Try the clinic admin, receptionist, doctor, and pharmacy stations in a realistic sandbox clinic."
                />
            </Head>

            {/* Navigation */}
            <LandingNav />

            {/* Ambient Lighting */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-10 left-1/4 w-[34rem] h-[34rem] rounded-full bg-[#1E6FD9]/10 dark:bg-[#1E6FD9]/15 blur-[120px]" />
                <div className="absolute top-1/3 right-10 w-[30rem] h-[30rem] rounded-full bg-[#0E9E8F]/10 dark:bg-[#0E9E8F]/15 blur-[120px]" />
                <div className="absolute bottom-10 left-1/3 w-[28rem] h-[28rem] rounded-full bg-[#FF7A59]/5 dark:bg-[#FF7A59]/10 blur-[120px]" />
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wide uppercase mb-4">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Instant Sandbox • No Installation • Zero Real SMS</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Experience MedVisit <br className="hidden sm:inline" />
                        <span className="bg-gradient-to-r from-[#1E6FD9] via-[#0E9E8F] to-[#FF7A59] bg-clip-text text-transparent">
                            live in your browser
                        </span>
                    </h1>

                    <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
                        Explore our fictional <strong>MedVisit Demo Medical Centre (Jaffna)</strong>.
                        Pick a role below to test realistic outpatient token issuance, live waiting room TV queues, multilingual prescriptions, and pharmacy dispensing.
                    </p>

                    {/* Live Outpatient Status Bar */}
                    <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md text-xs">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Clinic Status: <strong>Open Now</strong></span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 hidden sm:inline">•</div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Activity className="w-3.5 h-3.5 text-blue-500" />
                            <span>{activeSessions.length} active channeling sessions today</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 hidden sm:inline">•</div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Nightly reset: <strong>03:00 Colombo time</strong></span>
                        </div>
                    </div>
                </div>

                {/* Remembered Lead Returning Banner */}
                {isRemembered && rememberedLead && (
                    <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/40 dark:to-teal-950/40 border border-blue-200 dark:border-blue-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-md shadow-blue-600/20">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                    Welcome back, {rememberedLead.contact_name}!
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300">
                                    Saved practice: <strong>{rememberedLead.clinic_name}</strong> • Phone: {rememberedLead.phone}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={() => setUseNewLead(true)}
                                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline px-2 py-1"
                            >
                                Change details
                            </button>
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-300 font-bold">
                                1-Click Launch Enabled
                            </span>
                        </div>
                    </div>
                )}

                {/* 4 Role Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {(Object.keys(roleDetails) as Array<keyof typeof roleDetails>).map((rKey) => {
                        const r = roleDetails[rKey];
                        const Icon = r.icon;
                        const isSelected = selectedRole === rKey;
                        const alreadyTried = rememberedLead?.roles_tried?.includes(rKey);

                        return (
                            <div
                                key={rKey}
                                onClick={() => {
                                    setSelectedRole(rKey);
                                    if (isRemembered) {
                                        handleLaunch(undefined, rKey);
                                    }
                                }}
                                className={`cursor-pointer group relative p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between border ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:shadow-lg'
                                } ${r.borderHover}`}
                            >
                                <div>
                                    {/* Top Row: Icon & Badge */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${r.color} shadow-md`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {r.badge}
                                            </span>
                                            {alreadyTried && (
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                    <span>Explored</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Persona Name & Title */}
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        {r.persona}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                        {r.title}
                                    </h3>

                                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {r.description}
                                    </p>

                                    {/* Feature Pills */}
                                    <div className="mt-3.5 space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        {r.highlights.map((h, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                <CheckCircle2 className={`w-3.5 h-3.5 ${r.accentText} shrink-0`} />
                                                <span className="truncate">{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action button */}
                                <div className="mt-5 pt-3">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                                            isSelected
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        <span>{isRemembered ? `Enter as ${r.persona.split(' ')[0]}` : 'Select Role'}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Form or Instant Launch Card */}
                <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {isRemembered
                                    ? `Ready to explore as ${roleDetails[selectedRole as keyof typeof roleDetails]?.title}`
                                    : 'Quick Access Pass'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isRemembered
                                    ? 'Click below to enter the sandbox immediately with your saved session.'
                                    : 'Provide your clinic details once. We will remember you for 30 days.'}
                            </p>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={(e) => handleLaunch(e)}>
                        {!isRemembered && (
                            <div className="space-y-4 mb-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Your Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={contactName}
                                            onChange={(e) => setContactName(e.target.value)}
                                            placeholder="Dr. Samantha Perera"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Clinic / Hospital Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={clinicName}
                                            onChange={(e) => setClinicName(e.target.value)}
                                            placeholder="Colombo Family Clinic"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            WhatsApp Mobile <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="077 123 4567"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                                            Sri Lankan mobile (07X or +94 7X)
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            City / District (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Colombo, Jaffna, Kandy..."
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* WhatsApp Follow-up Consent */}
                                <div className="flex items-start gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="consent"
                                        checked={consent}
                                        onChange={(e) => setConsent(e.target.checked)}
                                        className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="consent" className="text-[11px] text-slate-600 dark:text-slate-400">
                                        I agree to receive a brief WhatsApp message with a demo summary and Sri Lankan onboarding assistance. (No spam, guaranteed).
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#1E6FD9] via-[#0E9E8F] to-[#0E9E8F] hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.99]"
                        >
                            {isSubmitting ? (
                                <span>Entering demo sandbox...</span>
                            ) : (
                                <>
                                    <span>Launch Demo as {roleDetails[selectedRole as keyof typeof roleDetails]?.title}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Safety guarantee */}
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Isolated sandbox resets every night at 03:00. Zero patient data leaves Sri Lanka.</span>
                    </div>
                </div>

                {/* Additional Demo Touchpoints (Waiting TV + Online Booking) */}
                <div className="mt-14 pt-10 border-t border-slate-200/80 dark:border-white/10">
                    <div className="text-center max-w-xl mx-auto mb-8">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Complementary Demo Experiences
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Test the public channels patients and receptionists interact with simultaneously.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Waiting Room TV */}
                        <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                <Tv className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Waiting Room Live TV Screen</h3>
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                        Live
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    Full-screen display designed for TV lounge monitors with Sinhala and Tamil announcements, token calling chimes, and instant WebSocket updates.
                                </p>
                                <a
                                    href={demoUrls.tv}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                >
                                    <span>Launch Waiting Room TV in new tab</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Patient Online Channeling */}
                        <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <CalendarCheck className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Patient Channeling Booking Flow</h3>
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        Public
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                    Test how patients view doctor schedules, select upcoming slots, verify their phone with simulated OTP (Demo code: <strong>123456</strong>), and book tokens.
                                </p>
                                <a
                                    href={demoUrls.booking}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    <span>Test Patient Online Booking</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
