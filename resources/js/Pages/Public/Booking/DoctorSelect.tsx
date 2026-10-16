import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Search,
    Stethoscope,
    Calendar,
    Clock,
    Sparkles,
    ChevronRight,
    Users,
    ShieldCheck,
    ArrowRight,
} from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';

interface DoctorItem {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    slmc_number: string;
    slug: string;
    photo_url: string | null;
    bio: string | null;
    min_fee_formatted: string;
    next_available: string | null;
    avg_consultation_minutes: number;
    direct_url: string;
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
    doctors: DoctorItem[];
    specialties: string[];
    allowAnyDoctor?: boolean;
}

export default function DoctorSelect({
    clinic,
    headerConfig,
    footerConfig,
    theme = 'medvisit-teal',
    doctors = [],
    specialties = [],
    allowAnyDoctor = false,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

    useEffect(() => {
        // Enforce bright, clean healthcare theme on public booking pages
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }, []);

    const filteredDoctors = useMemo(() => {
        return doctors.filter((doc) => {
            const matchesSearch =
                doc.full_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (doc.bio && doc.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
                doc.slmc_number.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesSpecialty =
                selectedSpecialty === 'all' || doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase();

            return matchesSearch && matchesSpecialty;
        });
    }, [doctors, searchQuery, selectedSpecialty]);

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

            <Head title={`Book an Appointment - ${clinic.name}`} />

            {/* Shared Public Header */}
            <PublicSiteHeader
                clinic={clinic}
                headerConfig={headerConfig}
                themePreset={theme}
            />

            {/* Hero / Step Title */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/60 mb-3 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>Online Channeling Portal</span>
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
                        Select a Specialist
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500">
                        Choose your doctor to check real-time session dates, room allocations, and token availability.
                    </p>
                </div>

                {/* Search & Specialty Filters */}
                <div className="max-w-3xl mx-auto mb-8 space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by doctor name, specialty, or qualifications..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/90 text-sm shadow-xs placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Filter Chips */}
                    {specialties.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                            <button
                                type="button"
                                onClick={() => setSelectedSpecialty('all')}
                                className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                                    selectedSpecialty === 'all'
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                                }`}
                            >
                                All Specialties ({doctors.length})
                            </button>
                            {specialties.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSelectedSpecialty(s)}
                                    className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                                        selectedSpecialty === s
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Option: Any Available Doctor */}
                {allowAnyDoctor && selectedSpecialty === 'all' && !searchQuery && (
                    <div className="max-w-3xl mx-auto mb-6">
                        <Link
                            href="/book/any"
                            className="group block p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/30 hover:border-teal-500 hover:shadow-md transition-all"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-teal-700 transition-colors">
                                                Any Available Doctor
                                            </h3>
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                                                Fastest Booking
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Show all available channeling slots across our medical team.
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                                    <span>Browse Slots</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Doctor Cards Grid */}
                {filteredDoctors.length === 0 ? (
                    <div className="max-w-md mx-auto text-center py-12 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">No matching doctors found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Try adjusting your search query or selecting a different specialty.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedSpecialty('all');
                            }}
                            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60"
                        >
                            Reset Search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDoctors.map((doc) => (
                            <div
                                key={doc.id}
                                className="group bg-white rounded-3xl border border-slate-200/80 hover:border-teal-400 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-200 p-6 flex flex-col justify-between shadow-xs"
                            >
                                <div>
                                    {/* Top: Avatar & Info */}
                                    <div className="flex items-start gap-3.5">
                                        {doc.photo_url ? (
                                            <img
                                                src={doc.photo_url}
                                                alt={doc.full_title}
                                                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-xs"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-2xl bg-teal-50/80 text-teal-800 flex items-center justify-center text-lg font-black border border-teal-200/70 shadow-xs shrink-0">
                                                {doc.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-extrabold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                                {doc.full_title}
                                            </h3>
                                            <p className="text-xs font-bold text-teal-700 mt-0.5">
                                                {doc.specialty}
                                            </p>
                                            <div className="inline-flex items-center gap-1 mt-1 text-[11px] text-slate-400 font-medium">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                <span>SLMC #{doc.slmc_number}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio / Qualifications */}
                                    {doc.bio && (
                                        <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                                            {doc.bio}
                                        </p>
                                    )}

                                    {/* Availability & Fee Badges */}
                                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Next Session:</span>
                                            </span>
                                            <span className={`font-bold ${doc.next_available ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {doc.next_available || 'No upcoming dates'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Consultation Fee:</span>
                                            <span className="font-extrabold text-teal-700">
                                                {doc.min_fee_formatted}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="mt-5 pt-3">
                                    <Link
                                        href={doc.direct_url}
                                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 group-hover:scale-[1.01] transition-all"
                                    >
                                        <span>See Availability</span>
                                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Shared Public Footer */}
            <PublicSiteFooter clinic={clinic} footerConfig={footerConfig} />
        </div>
    );
}
