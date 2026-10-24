import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';
import {
    Stethoscope,
    MapPin,
    Calendar,
    Clock,
    Phone,
    Building2,
    ArrowUpRight,
    ChevronRight,
    ShieldCheck,
    CheckCircle2,
    ExternalLink,
    Sparkles,
} from 'lucide-react';

interface ScheduleItem {
    day_of_week?: number;
    day_name?: string;
    start_time?: string;
    end_time?: string;
    room?: string;
}

interface DoctorItem {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    slug: string;
    photo_url: string | null;
    formatted_fee: string | null;
    session_schedules: ScheduleItem[];
    booking_url: string;
}

interface ListingItem {
    id: number;
    name: string;
    slug: string;
    district: string;
    city: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    whatsapp: string | null;
    online_booking_enabled: boolean;
    subdomain_url: string;
}

interface Props {
    listing: ListingItem;
    doctor: DoctorItem;
}

export default function DoctorProfile({ listing, doctor }: Props) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        name: doctor.full_title,
        medicalSpecialty: doctor.specialty,
        worksFor: {
            '@type': 'MedicalClinic',
            name: listing.name,
            address: {
                '@type': 'PostalAddress',
                addressLocality: listing.city,
                addressRegion: listing.district,
                addressCountry: 'LK',
            },
        },
    };

    return (
        <PublicLegalLayout
            title={`${doctor.full_title} (${doctor.specialty}) — ${listing.name}, ${listing.city}`}
            description={`Consultation schedules, channeling tokens, and appointments for ${doctor.full_title} at ${listing.name} in ${listing.city}, ${listing.district}. Book online directly.`}
            isWide={true}
        >
            <Head>
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Head>

            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/" className="hover:text-primary-600 transition">Home</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/find" className="hover:text-primary-600 transition">Find Care</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href={`/clinics/${listing.slug}`} className="hover:text-primary-600 transition">
                    {listing.name}
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-900 dark:text-white font-semibold truncate max-w-xs">{doctor.full_title}</span>
            </nav>

            {/* Doctor Profile Hero Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        {doctor.photo_url ? (
                            <img
                                src={doctor.photo_url}
                                alt={doctor.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-4 ring-primary-500/20 shadow-md shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-sky-600 flex items-center justify-center text-white font-black text-3xl ring-4 ring-primary-500/20 shadow-md shrink-0">
                                {doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
                            </div>
                        )}

                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">
                                    <Stethoscope className="w-3.5 h-3.5 text-primary-600" />
                                    {doctor.specialty}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <Building2 className="w-3.5 h-3.5 text-primary-500" />
                                    {listing.name} &bull; {listing.city}
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {doctor.full_title}
                            </h1>

                            {doctor.formatted_fee && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs uppercase font-bold text-slate-400">Consultation Fee:</span>
                                    <span className="text-base font-black text-slate-900 dark:text-white">
                                        {doctor.formatted_fee}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Book Token CTA */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                        <a
                            href={doctor.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold shadow-md shadow-primary-600/30 transition-all active:scale-[0.98]"
                        >
                            <span>Book Channeling Token</span>
                            <ArrowUpRight className="w-4 h-4" />
                        </a>
                        <Link
                            href={`/clinics/${listing.slug}`}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                            <span>View All Clinic Doctors</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Timetable and Clinic Information Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Consultation Timetable (2 columns) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary-600" />
                            Consultation Timetable & Regular Sessions
                        </h2>

                        {doctor.session_schedules && doctor.session_schedules.length > 0 ? (
                            <div className="space-y-3">
                                {doctor.session_schedules.map((sched, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/40 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                {sched.day_name?.slice(0, 3) || 'Day'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {sched.day_name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{sched.start_time} - {sched.end_time}</span>
                                                    {sched.room && <span>&bull; {sched.room}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <a
                                            href={doctor.booking_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-sm"
                                        >
                                            <span>Select & Book</span>
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-xs text-slate-500">
                                Contact the clinic directly or check the booking calendar for next available dates.
                            </div>
                        )}
                    </div>
                </div>

                {/* Clinic Sidebar Card */}
                <div className="space-y-6">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary-600" />
                            Practicing At
                        </h3>

                        <h4 className="font-black text-base text-slate-900 dark:text-white mb-1">
                            <Link href={`/clinics/${listing.slug}`} className="hover:text-primary-600 transition">
                                {listing.name}
                            </Link>
                        </h4>

                        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 mt-2 mb-4">
                            <MapPin className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                            <span>{listing.address || `${listing.city}, ${listing.district}`}</span>
                        </div>

                        {listing.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-4">
                                <Phone className="w-4 h-4 text-primary-500 shrink-0" />
                                <a href={`tel:${listing.phone}`} className="font-semibold hover:text-primary-600">
                                    {listing.phone}
                                </a>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <Link
                                href={`/clinics/${listing.slug}`}
                                className="block w-full py-2.5 text-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition"
                            >
                                View Clinic Profile & Location
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLegalLayout>
    );
}
