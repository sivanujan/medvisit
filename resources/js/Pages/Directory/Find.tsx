import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Search,
    MapPin,
    Calendar,
    Stethoscope,
    Building2,
    Navigation,
    Phone,
    ExternalLink,
    Clock,
    X,
    Filter,
    Layers,
    Map as MapIcon,
    List,
    ChevronRight,
    ArrowUpRight,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';

interface ClinicInfo {
    id: number;
    name: string;
    slug: string;
    district: string;
    city: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    online_booking_enabled: boolean;
    subdomain_url: string;
    latitude: number | null;
    longitude: number | null;
}

interface ScheduleItem {
    day_of_week?: number;
    day_name?: string;
    start_time?: string;
    end_time?: string;
    room?: string;
}

interface FormattedDoctor {
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
    distance_km: number | null;
    clinic: ClinicInfo | null;
}

interface FormattedListing {
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
    distance_km: number | null;
    doctors: Array<{
        id: number;
        name: string;
        title: string;
        specialty: string;
        slug: string;
        photo_url: string | null;
        formatted_fee: string | null;
        booking_url: string;
    }>;
}

interface Props {
    doctors: FormattedDoctor[];
    listings: FormattedListing[];
    filters: {
        q: string;
        district: string;
        specialty: string;
        day: number | '';
        service: string;
        tab: 'doctors' | 'clinics';
        lat: number | null;
        lng: number | null;
    };
    districts: string[];
    specialties: string[];
    fixedServices: string[];
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
];

export default function DirectoryFind({
    doctors,
    listings,
    filters,
    districts,
    specialties,
    fixedServices,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.q || '');
    const [selectedDistrict, setSelectedDistrict] = useState(filters.district || '');
    const [selectedSpecialty, setSelectedSpecialty] = useState(filters.specialty || '');
    const [selectedDay, setSelectedDay] = useState<number | ''>(filters.day !== '' ? filters.day : '');
    const [selectedService, setSelectedService] = useState(filters.service || '');
    const [activeTab, setActiveTab] = useState<'doctors' | 'clinics'>(filters.tab || 'doctors');
    const [showMap, setShowMap] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
        filters.lat && filters.lng ? { lat: filters.lat, lng: filters.lng } : null
    );

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

    // Apply filters via Inertia GET
    const applyFilters = (overrides?: Partial<typeof filters>) => {
        const params: Record<string, any> = {
            q: overrides?.q !== undefined ? overrides.q : searchQuery,
            district: overrides?.district !== undefined ? overrides.district : selectedDistrict,
            specialty: overrides?.specialty !== undefined ? overrides.specialty : selectedSpecialty,
            day: overrides?.day !== undefined ? overrides.day : selectedDay,
            service: overrides?.service !== undefined ? overrides.service : selectedService,
            tab: overrides?.tab !== undefined ? overrides.tab : activeTab,
        };

        if (userCoords) {
            params.lat = userCoords.lat;
            params.lng = userCoords.lng;
        }

        // Clean empty keys
        Object.keys(params).forEach((k) => {
            if (params[k] === '' || params[k] === null || params[k] === undefined) {
                delete params[k];
            }
        });

        router.get('/find', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ q: searchQuery });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedDistrict('');
        setSelectedSpecialty('');
        setSelectedDay('');
        setSelectedService('');
        setUserCoords(null);
        router.get('/find', { tab: activeTab }, { preserveScroll: true });
    };

    const activeFilterCount = [
        searchQuery,
        selectedDistrict,
        selectedSpecialty,
        selectedDay !== '',
        selectedService,
        userCoords,
    ].filter(Boolean).length;

    // Browser Geolocation
    const handleNearMe = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGeoLoading(false);
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserCoords(coords);
                const params: Record<string, any> = {
                    q: searchQuery,
                    district: selectedDistrict,
                    specialty: selectedSpecialty,
                    day: selectedDay,
                    service: selectedService,
                    tab: activeTab,
                    lat: coords.lat,
                    lng: coords.lng,
                };
                Object.keys(params).forEach((k) => {
                    if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
                });
                router.get('/find', params, { preserveState: true, preserveScroll: true, replace: true });
            },
            () => {
                setGeoLoading(false);
                alert('Could not retrieve your location. Please check browser permissions.');
            },
            { timeout: 10000 }
        );
    };

    // Initialize or Update Leaflet Map
    useEffect(() => {
        if (!showMap || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: userCoords ? [userCoords.lat, userCoords.lng] : [7.8731, 80.7718],
                zoom: userCoords ? 11 : 8,
                zoomControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18,
            }).addTo(map);

            markersLayerRef.current = L.layerGroup().addTo(map);
            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;
        const layer = markersLayerRef.current;
        if (!map || !layer) return;

        layer.clearLayers();

        const bounds = L.latLngBounds([]);

        // Add user marker if available
        if (userCoords) {
            const userIcon = L.divIcon({
                className: 'user-loc-pin',
                html: `
                    <div style="width: 18px; height: 18px; background-color: #0284c7; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 12px rgba(2,132,199,0.8);"></div>
                `,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });
            L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
                .bindPopup('<strong>Your Location</strong>')
                .addTo(layer);
            bounds.extend([userCoords.lat, userCoords.lng]);
        }

        // Add clinic markers
        listings.forEach((listing) => {
            if (listing.latitude && listing.longitude) {
                const clinicIcon = L.divIcon({
                    className: 'clinic-map-pin',
                    html: `
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: linear-gradient(135deg, #0284c7, #0369a1);
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 2px solid white;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <span style="transform: rotate(45deg); color: white; font-size: 13px; font-weight: bold;">+</span>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                });

                const popupContent = `
                    <div style="font-family: inherit; min-width: 200px; padding: 4px;">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${listing.name}</h4>
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">${listing.city}, ${listing.district}</p>
                        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #0284c7;">${listing.doctor_count} Active Doctor(s)</p>
                        <div style="display: flex; gap: 6px;">
                            <a href="/clinics/${listing.slug}" style="display: inline-block; background-color: #0284c7; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 600;">View Clinic</a>
                            <a href="${listing.subdomain_url}/book" target="_blank" style="display: inline-block; background-color: #0f172a; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 600;">Book Now</a>
                        </div>
                    </div>
                `;

                const marker = L.marker([listing.latitude, listing.longitude], { icon: clinicIcon })
                    .bindPopup(popupContent)
                    .addTo(layer);

                bounds.extend([listing.latitude, listing.longitude]);
            }
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }

        setTimeout(() => map.invalidateSize(), 200);
    }, [showMap, listings, userCoords]);

    return (
        <PublicLegalLayout
            title="Find Doctors & Medical Clinics in Sri Lanka"
            description="Search verified medical practitioners, OPD channeling sessions, and clinics across Sri Lanka. Check real-time doctor timetables and book appointment tokens instantly."
            isWide={true}
        >
            {/* Hero Header */}
            <div className="relative text-center max-w-3xl mx-auto mb-8 pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50 text-xs font-semibold text-primary-700 dark:text-primary-300 mb-4 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Verified Healthcare Directory & Direct Channeling
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    Find Doctors & Clinics <br />
                    <span className="bg-gradient-to-r from-primary-600 via-sky-600 to-teal-500 bg-clip-text text-transparent">
                        Across Sri Lanka
                    </span>
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Discover trusted general physicians, specialists, and neighborhood medical centers. Check live channeling schedules and book your token directly.
                </p>
            </div>

            {/* Search & Filter Bar Container */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/40 dark:shadow-none mb-8 transition-all">
                {/* Search Input Row */}
                <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row items-stretch gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search doctor name, clinic, specialty (e.g. Cardiologist, Colombo)..."
                            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    applyFilters({ q: '' });
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md shadow-primary-600/30 transition-all active:scale-[0.98]"
                        >
                            <Search className="w-4 h-4" />
                            Search
                        </button>

                        <button
                            type="button"
                            onClick={handleNearMe}
                            disabled={geoLoading}
                            title="Find clinics near my current GPS location"
                            className={`inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all ${
                                userCoords
                                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                            }`}
                        >
                            <Navigation className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline">{geoLoading ? 'Locating...' : 'Near Me'}</span>
                        </button>
                    </div>
                </form>

                {/* Filters Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {/* District Dropdown */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            District
                        </label>
                        <select
                            value={selectedDistrict}
                            onChange={(e) => {
                                setSelectedDistrict(e.target.value);
                                applyFilters({ district: e.target.value });
                            }}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-primary-500"
                        >
                            <option value="">All 25 Districts</option>
                            {districts.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Specialty Dropdown */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Specialty
                        </label>
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => {
                                setSelectedSpecialty(e.target.value);
                                applyFilters({ specialty: e.target.value });
                            }}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-primary-500"
                        >
                            <option value="">All Specialties</option>
                            {specialties.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Day of Week */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Available Day
                        </label>
                        <select
                            value={selectedDay}
                            onChange={(e) => {
                                const val = e.target.value !== '' ? parseInt(e.target.value, 10) : '';
                                setSelectedDay(val);
                                applyFilters({ day: val });
                            }}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-primary-500"
                        >
                            <option value="">Any Day</option>
                            {DAYS_OF_WEEK.map((d) => (
                                <option key={d.value} value={d.value}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Facility / Service */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Clinic Service
                        </label>
                        <select
                            value={selectedService}
                            onChange={(e) => {
                                setSelectedService(e.target.value);
                                applyFilters({ service: e.target.value });
                            }}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-primary-500"
                        >
                            <option value="">All Services</option>
                            {fixedServices.map((svc) => (
                                <option key={svc} value={svc}>
                                    {svc}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Filter Badges & Reset */}
                {activeFilterCount > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Active filters:</span>
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                Query: "{searchQuery}"
                                <button type="button" onClick={() => { setSearchQuery(''); applyFilters({ q: '' }); }}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {selectedDistrict && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                District: {selectedDistrict}
                                <button type="button" onClick={() => { setSelectedDistrict(''); applyFilters({ district: '' }); }}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {selectedSpecialty && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                Specialty: {selectedSpecialty}
                                <button type="button" onClick={() => { setSelectedSpecialty(''); applyFilters({ specialty: '' }); }}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {selectedDay !== '' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                Day: {DAYS_OF_WEEK.find((d) => d.value === selectedDay)?.label}
                                <button type="button" onClick={() => { setSelectedDay(''); applyFilters({ day: '' }); }}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {selectedService && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                Service: {selectedService}
                                <button type="button" onClick={() => { setSelectedService(''); applyFilters({ service: '' }); }}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {userCoords && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-medium">
                                Near Current Location
                                <button type="button" onClick={() => { setUserCoords(null); applyFilters(); }}>
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-primary-600 dark:text-primary-400 font-bold hover:underline ml-auto"
                        >
                            Reset All
                        </button>
                    </div>
                )}
            </div>

            {/* View Tabs & Map Toggle Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                {/* Tabs */}
                <div className="flex items-center p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('doctors');
                            applyFilters({ tab: 'doctors' });
                        }}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'doctors'
                                ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Stethoscope className="w-4 h-4" />
                        Doctors ({doctors.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('clinics');
                            applyFilters({ tab: 'clinics' });
                        }}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'clinics'
                                ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Clinics ({listings.length})
                    </button>
                </div>

                {/* Map Toggle Button */}
                <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        showMap
                            ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/30'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                >
                    {showMap ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                    <span>{showMap ? 'Hide Map' : 'Show Map View'}</span>
                </button>
            </div>

            {/* Interactive Leaflet Map Container */}
            {showMap && (
                <div className="mb-8 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xl bg-white dark:bg-slate-900">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-600" />
                            <span className="font-semibold">Interactive Map: {listings.length} Clinic Location(s)</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Click a pin to view clinic details</span>
                    </div>
                    <div ref={mapContainerRef} className="h-96 w-full z-10" />
                </div>
            )}

            {/* Results Grid */}
            {activeTab === 'doctors' && (
                <>
                    {doctors.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Stethoscope className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">No doctors found</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                No doctors match your current search filters. Try selecting a different district, specialty, or clearing the query.
                            </p>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition"
                            >
                                Reset Search Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {doctors.map((doctor) => (
                                <div
                                    key={doctor.id}
                                    className="group flex flex-col justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 hover:shadow-xl hover:border-primary-500/40 transition-all duration-200"
                                >
                                    <div>
                                        {/* Top Row: Avatar & Specialty & Distance */}
                                        <div className="flex items-start gap-4 mb-4">
                                            {doctor.photo_url ? (
                                                <img
                                                    src={doctor.photo_url}
                                                    alt={doctor.name}
                                                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary-500/20"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-950 dark:to-primary-900/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-black text-lg ring-2 ring-primary-500/20">
                                                    {doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 mb-1">
                                                    {doctor.specialty}
                                                </span>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                    {doctor.full_title}
                                                </h3>
                                                {doctor.distance_km !== null && (
                                                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                                                        {doctor.distance_km} km away
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Clinic & Location Details */}
                                        {doctor.clinic && (
                                            <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <Link
                                                    href={`/clinics/${doctor.clinic.slug}`}
                                                    className="group/c inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-primary-600 transition"
                                                >
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover/c:text-primary-500" />
                                                    <span className="truncate">{doctor.clinic.name}</span>
                                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                                </Link>
                                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                    <span>{doctor.clinic.city}, {doctor.clinic.district}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Upcoming / Weekly Schedules */}
                                        <div className="mb-4">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Consultation Schedule
                                            </div>
                                            {doctor.session_schedules && doctor.session_schedules.length > 0 ? (
                                                <div className="space-y-1">
                                                    {doctor.session_schedules.slice(0, 3).map((sched, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                                                        >
                                                            <span className="font-semibold">{sched.day_name}</span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                                {sched.start_time} - {sched.end_time}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {doctor.session_schedules.length > 3 && (
                                                        <div className="text-[10px] text-slate-400 text-right pr-1">
                                                            +{doctor.session_schedules.length - 3} more days
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">
                                                    Sessions scheduled weekly
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer: Fee & Book Button */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                                                Consultation Fee
                                            </span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">
                                                {doctor.formatted_fee || 'At Clinic'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {doctor.clinic && (
                                                <Link
                                                    href={`/doctors/${doctor.clinic.slug}/${doctor.slug}`}
                                                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                >
                                                    Profile
                                                </Link>
                                            )}
                                            <a
                                                href={doctor.booking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm shadow-primary-600/30 transition-all"
                                            >
                                                <span>Book Token</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Clinics Grid */}
            {activeTab === 'clinics' && (
                <>
                    {listings.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">No clinics found</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                No clinics match your search filters in this area.
                            </p>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition"
                            >
                                Reset Search Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {listings.map((clinic) => (
                                <div
                                    key={clinic.id}
                                    className="group flex flex-col justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 hover:shadow-xl hover:border-primary-500/40 transition-all duration-200"
                                >
                                    <div>
                                        {/* Top Row: Logo & Clinic Name */}
                                        <div className="flex items-start gap-4 mb-4">
                                            {clinic.logo_url ? (
                                                <img
                                                    src={clinic.logo_url}
                                                    alt={clinic.name}
                                                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary-500/20"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-sky-100 dark:from-primary-950 dark:to-sky-900/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-black text-xl ring-2 ring-primary-500/20">
                                                    {clinic.name.charAt(0) || 'C'}
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 font-bold mb-0.5">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span>{clinic.city}, {clinic.district}</span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                    <Link href={`/clinics/${clinic.slug}`} className="hover:text-primary-600 transition">
                                                        {clinic.name}
                                                    </Link>
                                                </h3>
                                                {clinic.distance_km !== null && (
                                                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                                                        {clinic.distance_km} km away
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {clinic.description && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                                                {clinic.description}
                                            </p>
                                        )}

                                        {/* Services Badges */}
                                        {clinic.services && clinic.services.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {clinic.services.slice(0, 3).map((svc) => (
                                                    <span
                                                        key={svc}
                                                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                    >
                                                        {svc}
                                                    </span>
                                                ))}
                                                {clinic.services.length > 3 && (
                                                    <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                        +{clinic.services.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Active Doctors Roster Preview */}
                                        <div className="mb-4">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                                <span>Active Doctors ({clinic.doctor_count})</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {clinic.doctors.slice(0, 2).map((doc) => (
                                                    <div
                                                        key={doc.id}
                                                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs"
                                                    >
                                                        <div className="min-w-0 pr-2">
                                                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                {doc.title} {doc.name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                {doc.specialty}
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={doc.booking_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="shrink-0 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40 font-bold text-[11px] hover:bg-primary-600 hover:text-white transition"
                                                        >
                                                            Book
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            {clinic.phone && (
                                                <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-1 hover:text-primary-600">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{clinic.phone}</span>
                                                </a>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/clinics/${clinic.slug}`}
                                                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                            >
                                                Clinic Profile
                                            </Link>
                                            <a
                                                href={`${clinic.subdomain_url}/book`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm shadow-primary-600/30 transition-all"
                                            >
                                                <span>Channeling</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </PublicLegalLayout>
    );
}
