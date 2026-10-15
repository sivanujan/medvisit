import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    Phone,
    MapPin,
    Stethoscope,
    CheckCircle2,
    ArrowRight,
    Shield,
    Sparkles,
    User,
    ChevronRight,
    HeartPulse,
    Award,
    Activity,
} from 'lucide-react';

interface DoctorItem {
    id: number;
    name: string;
    specialty: string;
    slmc_number?: string;
    bio?: string;
    total_fee_formatted: string;
}

interface SessionItem {
    id: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    start_time: string;
    room_number: string;
    available_tokens_count: number;
    is_full: boolean;
    total_fee_formatted: string;
}

interface Section {
    id: string;
    name: string;
    enabled: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    cta_text?: string;
    cta_link?: string;
    badge?: string;
    notice?: string;
    [key: string]: any;
}

interface Props {
    clinic: {
        name: string;
        subdomain: string;
        phone?: string;
        address?: string;
    };
    sections: Section[];
    theme: string;
    isPublished: boolean;
    doctors: DoctorItem[];
    upcomingSessions: SessionItem[];
    seo: {
        title: string;
        description: string;
    };
    customPage?: {
        html: string;
        css: string;
        isPreview?: boolean;
    } | null;
}

export default function ClinicLanding({
    clinic,
    sections,
    theme,
    isPublished,
    doctors,
    upcomingSessions,
    seo,
    customPage,
}: Props) {
    const enabledSections = sections.filter((s) => s.enabled);
    const heroSection = sections.find((s) => s.id === 'hero' && s.enabled);
    const aboutSection = sections.find((s) => s.id === 'about' && s.enabled);
    const servicesSection = sections.find((s) => s.id === 'services' && s.enabled);
    const hoursSection = sections.find((s) => s.id === 'hours' && s.enabled);
    const contactSection = sections.find((s) => s.id === 'contact' && s.enabled);
    const footerSection = sections.find((s) => s.id === 'footer' && s.enabled);

    if (customPage?.html) {
        return (
            <div className="min-h-screen bg-white text-slate-900 font-sans">
                <Head>
                    <title>{seo.title || `${clinic.name} - Specialist Doctor Channeling`}</title>
                    <meta
                        name="description"
                        content={
                            seo.description ||
                            `Book specialist doctor channeling appointments online at ${clinic.name}. Verified SLMC consultants.`
                        }
                    />
                </Head>

                {customPage.isPreview && (
                    <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                            Draft Preview Mode — You are viewing unpublished builder changes.
                        </span>
                        <a
                            href="/website/builder"
                            className="px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-[11px] font-bold"
                        >
                            Return to Builder
                        </a>
                    </div>
                )}

                {customPage.css && (
                    <style dangerouslySetInnerHTML={{ __html: customPage.css }} />
                )}

                <div
                    className="medvisit-custom-page-canvas"
                    dangerouslySetInnerHTML={{ __html: customPage.html }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900 font-sans">
            <Head>
                <title>{seo.title || `${clinic.name} - Specialist Doctor Channeling`}</title>
                <meta
                    name="description"
                    content={
                        seo.description ||
                        `Book specialist doctor channeling appointments online at ${clinic.name}. Verified SLMC consultants.`
                    }
                />
            </Head>

            {/* Top Announcement Bar */}
            <header className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-teal-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                            Live Channeling Queue Active
                        </span>
                        {clinic.phone && (
                            <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
                                <Phone className="w-3 h-3 text-teal-400" />
                                {clinic.phone}
                            </span>
                        )}
                        {clinic.address && (
                            <span className="hidden lg:inline-flex items-center gap-1 text-slate-400 truncate max-w-sm">
                                <MapPin className="w-3 h-3 text-teal-400" />
                                {clinic.address}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">Sri Lanka Medical Council Verified</span>
                        <Link
                            href="/login"
                            className="text-xs font-semibold text-slate-200 hover:text-white underline underline-offset-4"
                        >
                            Staff Portal
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Navigation Header */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
                            {clinic.name.charAt(0)}
                        </div>
                        <div>
                            <span className="text-lg font-extrabold tracking-tight text-slate-900 block leading-tight">
                                {clinic.name}
                            </span>
                            <span className="text-xs text-teal-700 font-medium">
                                Specialist Channeling & Healthcare
                            </span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
                        <a href="#sessions" className="hover:text-teal-700 transition-colors">
                            This Week Sessions
                        </a>
                        <a href="#doctors" className="hover:text-teal-700 transition-colors">
                            Specialists
                        </a>
                        <a href="#services" className="hover:text-teal-700 transition-colors">
                            Services
                        </a>
                        <a href="#contact" className="hover:text-teal-700 transition-colors">
                            Contact
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/book"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all hover:shadow-lg active:scale-95"
                        >
                            <Calendar className="w-4 h-4" />
                            Book Token Online
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="space-y-16 pb-20">
                {/* 1. Hero Section */}
                {heroSection && (
                    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-white to-slate-50 pt-16 pb-20 px-4 sm:px-6">
                        <div className="max-w-5xl mx-auto text-center space-y-6">
                            {heroSection.badge && (
                                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold tracking-wide shadow-sm">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {heroSection.badge}
                                </span>
                            )}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                                {heroSection.title || 'Compassionate Care, Specialist Excellence'}
                            </h1>
                            <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                                {heroSection.subtitle ||
                                    'Book specialist channeling appointments with Sri Lanka’s leading medical practitioners. Zero waiting lounge delays with real-time digital queue updates.'}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <Link
                                    href="/book"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base shadow-xl shadow-teal-600/30 transition-all hover:-translate-y-0.5"
                                >
                                    {heroSection.cta_text || 'Book Appointment Online'}
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <a
                                    href="#sessions"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-base border border-slate-300 shadow-sm transition-all"
                                >
                                    View Doctors Roster
                                </a>
                            </div>

                            {/* Trust badges */}
                            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-teal-600" />
                                    SLMC Certified Doctors
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-teal-600" />
                                    Approximate Consultation Times
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <HeartPulse className="w-4 h-4 text-teal-600" />
                                    Instant Digital Queue Token
                                </span>
                            </div>
                        </div>
                    </section>
                )}

                {/* 2. Upcoming Sessions This Week */}
                <section id="sessions" className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                                Live Schedules
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                Upcoming Channeling Sessions
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">
                                Real-time availability for consultations over the next 7 days.
                            </p>
                        </div>
                        <Link
                            href="/book"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 group"
                        >
                            Open Full Booking Desk
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {upcomingSessions.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-800">No scheduled sessions this week</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                New specialist channeling sessions will be announced shortly. Contact the clinic desk for special appointments.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold text-xs">
                                                    {session.doctor_specialty}
                                                </span>
                                                <h3 className="text-lg font-bold text-slate-900 mt-2">
                                                    {session.doctor_name}
                                                </h3>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                {session.room_number}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Date</span>
                                                <span className="font-bold text-slate-800">{session.session_date}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Start Time</span>
                                                <span className="font-bold text-teal-700 font-mono">
                                                    {session.start_time}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500">Total Fee</span>
                                                <span className="font-bold text-slate-900">
                                                    {session.total_fee_formatted}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div>
                                            {session.is_full ? (
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                                    Session Full
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-emerald-700">
                                                    <strong className="font-bold">{session.available_tokens_count}</strong> tokens available
                                                </span>
                                            )}
                                        </div>

                                        <Link
                                            href={`/book?session=${session.id}`}
                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                session.is_full
                                                    ? 'bg-slate-100 text-slate-400 pointer-events-none'
                                                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm'
                                            }`}
                                        >
                                            Book Token
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 3. Doctors Directory */}
                <section id="doctors" className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                            Our Specialists
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                            Meet Our Medical Specialists
                        </h2>
                        <p className="text-sm text-slate-600">
                            Sri Lanka Medical Council verified consultants and physicians with decades of clinical excellence.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {doctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4 hover:border-teal-200 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-extrabold text-xl shrink-0">
                                        Dr
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-base text-slate-900">{doctor.name}</h3>
                                        <p className="text-xs font-bold text-teal-700">{doctor.specialty}</p>
                                        {doctor.slmc_number && (
                                            <p className="text-[11px] text-slate-400 font-mono">
                                                SLMC #{doctor.slmc_number}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {doctor.bio && (
                                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                                        {doctor.bio}
                                    </p>
                                )}

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Channeling Fee</span>
                                    <span className="font-bold text-slate-900">{doctor.total_fee_formatted}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. About & Clinical Highlights */}
                {aboutSection && (
                    <section className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="bg-gradient-to-br from-teal-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
                            <div className="relative z-10 max-w-2xl space-y-4">
                                <span className="inline-block px-3 py-1 rounded-full bg-teal-800/80 text-teal-200 text-xs font-bold tracking-wider uppercase">
                                    About {clinic.name}
                                </span>
                                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                                    {aboutSection.title || 'Your Family’s Trusted Medical Center'}
                                </h2>
                                <p className="text-sm sm:text-base text-teal-100/80 leading-relaxed">
                                    {aboutSection.description ||
                                        'Providing premier outpatient healthcare, specialist channeling, and diagnostic medical services with international safety protocols and Sri Lankan warmth.'}
                                </p>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left relative z-10">
                                <div>
                                    <div className="text-3xl font-black text-teal-300">
                                        {aboutSection.stat_1_number || '15+'}
                                    </div>
                                    <div className="text-xs text-teal-100/70 mt-1 font-medium">
                                        {aboutSection.stat_1_label || 'Medical Specialists'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-teal-300">
                                        {aboutSection.stat_2_number || '25,000+'}
                                    </div>
                                    <div className="text-xs text-teal-100/70 mt-1 font-medium">
                                        {aboutSection.stat_2_label || 'Satisfied Patients'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-teal-300">
                                        {aboutSection.stat_3_number || '100%'}
                                    </div>
                                    <div className="text-xs text-teal-100/70 mt-1 font-medium">
                                        {aboutSection.stat_3_label || 'Digital Queue Tracking'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 5. Services Section */}
                {servicesSection && servicesSection.items && (
                    <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                                Comprehensive Care
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                {servicesSection.title || 'Clinical Services'}
                            </h2>
                            <p className="text-sm text-slate-600">
                                {servicesSection.subtitle || 'Modern outpatient healthcare facilities designed for convenience.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {servicesSection.items.map((svc: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow space-y-2"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900 pt-2">{svc.name}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{svc.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 6. Hours & Contact */}
                <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Operating Hours */}
                        {hoursSection && (
                            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            {hoursSection.title || 'Operating Hours'}
                                        </h3>
                                        <p className="text-xs text-slate-500">Open 7 days a week</p>
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="font-semibold text-slate-600">Monday – Friday</span>
                                        <span className="font-bold text-slate-900">
                                            {hoursSection.weekdays || '07:30 AM – 10:00 PM'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="font-semibold text-slate-600">Saturday</span>
                                        <span className="font-bold text-slate-900">
                                            {hoursSection.saturday || '07:30 AM – 10:00 PM'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="font-semibold text-slate-600">Sunday</span>
                                        <span className="font-bold text-slate-900">
                                            {hoursSection.sunday || '08:00 AM – 08:00 PM'}
                                        </span>
                                    </div>
                                </div>

                                {hoursSection.emergency_note && (
                                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        {hoursSection.emergency_note}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Contact Information */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {contactSection?.title || 'Visit Our Medical Center'}
                                    </h3>
                                    <p className="text-xs text-slate-500">Easy access & convenient parking</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                {clinic.address && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="block text-slate-800 font-semibold">Address</strong>
                                            <span className="text-slate-600">{clinic.address}</span>
                                        </div>
                                    </div>
                                )}

                                {clinic.phone && (
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="block text-slate-800 font-semibold">Contact Desk</strong>
                                            <a href={`tel:${clinic.phone}`} className="text-teal-700 font-bold hover:underline">
                                                {clinic.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <Link
                                    href="/book"
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/30"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Book Channeling Token Online
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6 text-xs text-slate-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="space-y-1">
                        <span className="font-extrabold text-slate-900 text-sm">{clinic.name}</span>
                        <p className="text-slate-500 max-w-md">
                            {footerSection?.notice ||
                                'All doctor channeling schedules are subject to practitioner availability. Token appointment times are approximate.'}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Link href="/book" className="font-bold text-teal-700 hover:underline">
                            Book Token
                        </Link>
                        <Link href="/login" className="font-bold text-slate-700 hover:underline">
                            Staff Login
                        </Link>
                        <span className="text-slate-400">
                            Powered by MedVisit Sri Lanka
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
