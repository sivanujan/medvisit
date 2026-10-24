import React, { useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin,
    Phone,
    Building2,
    Calendar,
    Clock,
    Stethoscope,
    ArrowUpRight,
    ChevronRight,
    ShieldCheck,
    MessageCircle,
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
    min_fee_cents: number | null;
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
    logo_url: string | null;
    description: string | null;
    services: string[];
    online_booking_enabled: boolean;
    subdomain_url: string;
    doctor_count: number;
}

interface Props {
    listing: ListingItem;
    doctors: DoctorItem[];
}

export default function ClinicProfile({ listing, doctors }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;
        if (!listing.latitude || !listing.longitude) return;

        const map = L.map(mapRef.current, {
            center: [listing.latitude, listing.longitude],
            zoom: 15,
            zoomControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const clinicIcon = L.divIcon({
            className: 'clinic-profile-pin',
            html: `
                <div style="
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #0284c7, #0369a1);
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <span style="transform: rotate(45deg); color: white; font-size: 15px; font-weight: bold;">+</span>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
        });

        L.marker([listing.latitude, listing.longitude], { icon: clinicIcon }).addTo(map);

        mapInstance.current = map;
    }, [listing]);

    // Structured Data (JSON-LD) for SEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MedicalClinic',
        name: listing.name,
        description: listing.description || `Medical clinic in ${listing.city}, ${listing.district}, Sri Lanka`,
        telephone: listing.phone || undefined,
        address: {
            '@type': 'PostalAddress',
            streetAddress: listing.address || undefined,
            addressLocality: listing.city,
            addressRegion: listing.district,
            addressCountry: 'LK',
        },
        geo: listing.latitude && listing.longitude ? {
            '@type': 'GeoCoordinates',
            latitude: listing.latitude,
            longitude: listing.longitude,
        } : undefined,
        url: listing.subdomain_url,
    };

    return (
        <PublicLegalLayout
            title={`${listing.name} — Clinic Channeling & Doctor Schedule`}
            description={`View doctor appointment schedules, consultation fees, and channeling at ${listing.name} in ${listing.city}, ${listing.district}. Book online tokens directly.`}
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
                <Link href={`/find?district=${encodeURIComponent(listing.district)}`} className="hover:text-primary-600 transition">
                    {listing.district}
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-900 dark:text-white font-semibold truncate max-w-xs">{listing.name}</span>
            </nav>

            {/* Hero Clinic Header Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        {listing.logo_url ? (
                            <img
                                src={listing.logo_url}
                                alt={listing.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover ring-4 ring-primary-500/20 shadow-md shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-sky-600 flex items-center justify-center text-white font-black text-3xl ring-4 ring-primary-500/20 shadow-md shrink-0">
                                {listing.name.charAt(0) || 'C'}
                            </div>
                        )}

                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                                    Verified Clinic
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                    {listing.city}, {listing.district}
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {listing.name}
                            </h1>

                            {listing.description && (
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                                    {listing.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Action CTAs */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                        <a
                            href={`${listing.subdomain_url}/book`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold shadow-md shadow-primary-600/30 transition-all active:scale-[0.98]"
                        >
                            <span>Book Channeling Token</span>
                            <ArrowUpRight className="w-4 h-4" />
                        </a>
                        <a
                            href={listing.subdomain_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                            <span>Visit Clinic Website</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                    </div>
                </div>

                {/* Contact & Address Bar */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {listing.phone && (
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary-600">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-[10px] uppercase font-bold text-slate-400">Phone</span>
                                <a href={`tel:${listing.phone}`} className="font-bold hover:text-primary-600">
                                    {listing.phone}
                                </a>
                            </div>
                        </div>
                    )}

                    {listing.whatsapp && (
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                                <MessageCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-[10px] uppercase font-bold text-slate-400">WhatsApp</span>
                                <a
                                    href={`https://wa.me/${listing.whatsapp.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold hover:text-emerald-600"
                                >
                                    {listing.whatsapp}
                                </a>
                            </div>
                        </div>
                    )}

                    {listing.address && (
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary-600">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="block text-[10px] uppercase font-bold text-slate-400">Address</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{listing.address}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Services Pills */}
                {listing.services && listing.services.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 mr-1">Services:</span>
                        {listing.services.map((svc) => (
                            <span
                                key={svc}
                                className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                                {svc}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content Layout: Doctors List + Map Location Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Doctors Section (2 Columns) */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-primary-600" />
                                Doctors & Channeling Roster
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {doctors.length} verified medical practitioner(s) currently available
                            </p>
                        </div>
                    </div>

                    {doctors.length === 0 ? (
                        <div className="p-8 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-500">No active doctors published yet for this clinic.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {doctors.map((doctor) => (
                                <div
                                    key={doctor.id}
                                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 hover:border-primary-500/40 transition-all shadow-sm"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            {doctor.photo_url ? (
                                                <img
                                                    src={doctor.photo_url}
                                                    alt={doctor.name}
                                                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary-500/20 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-sky-100 dark:from-primary-950 dark:to-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-black text-xl ring-2 ring-primary-500/20 shrink-0">
                                                    {doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
                                                </div>
                                            )}

                                            <div>
                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 mb-1">
                                                    {doctor.specialty}
                                                </span>
                                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                                    <Link
                                                        href={`/doctors/${listing.slug}/${doctor.slug}`}
                                                        className="hover:text-primary-600 transition"
                                                    >
                                                        {doctor.full_title}
                                                    </Link>
                                                </h3>
                                                {doctor.formatted_fee && (
                                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                        Consultation Fee:{' '}
                                                        <strong className="text-slate-900 dark:text-white font-black">
                                                            {doctor.formatted_fee}
                                                        </strong>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                                            <a
                                                href={doctor.booking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-600/30 transition-all active:scale-[0.98]"
                                            >
                                                <span>Book Token</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </a>
                                            <Link
                                                href={`/doctors/${listing.slug}/${doctor.slug}`}
                                                className="text-xs font-bold text-slate-500 hover:text-primary-600 transition"
                                            >
                                                View Doctor Profile
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Consultation Timetable */}
                                    {doctor.session_schedules && doctor.session_schedules.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                Weekly Timetable
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {doctor.session_schedules.map((sched, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300"
                                                    >
                                                        <div className="flex items-center gap-1.5 font-semibold">
                                                            <Calendar className="w-3.5 h-3.5 text-primary-500" />
                                                            <span>{sched.day_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{sched.start_time} - {sched.end_time}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: Location Map & Booking Info */}
                <div className="space-y-6">
                    {/* Location Card */}
                    {listing.latitude && listing.longitude && (
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-lg">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary-600" />
                                Clinic Location
                            </h3>
                            <div ref={mapRef} className="h-56 w-full rounded-2xl overflow-hidden mb-3 border border-slate-200 dark:border-slate-800" />
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                {listing.address || `${listing.city}, ${listing.district}`}
                            </p>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition"
                            >
                                <span>Get Directions on Google Maps</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            </a>
                        </div>
                    )}

                    {/* How It Works Card */}
                    <div className="bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/50 rounded-3xl p-5">
                        <h3 className="text-sm font-bold text-primary-900 dark:text-primary-200 mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary-600" />
                            How Online Channeling Works
                        </h3>
                        <ul className="space-y-2.5 text-xs text-primary-950/80 dark:text-primary-300">
                            <li className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-primary-900 dark:text-white font-bold shrink-0 text-[10px]">1</span>
                                <span>Select a doctor and click <strong>Book Token</strong>.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-primary-900 dark:text-white font-bold shrink-0 text-[10px]">2</span>
                                <span>Pick your preferred session date and enter your phone number.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-primary-900 dark:text-white font-bold shrink-0 text-[10px]">3</span>
                                <span>Receive your official appointment token and track the live queue.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </PublicLegalLayout>
    );
}
