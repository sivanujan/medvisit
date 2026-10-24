import React, { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    Globe,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Save,
    ExternalLink,
    ShieldAlert,
    Info,
    Check,
} from 'lucide-react';

export interface DirectorySettingsData {
    enabled: boolean;
    consented_at: string | null;
    district: string;
    city: string;
    latitude: number;
    longitude: number;
    has_pinned: boolean;
    description: string;
    services: string[];
    active_doctors_count: number;
    missing_fields: string[];
    preview_url: string;
    districts: string[];
    fixed_services: string[];
    is_owner: boolean;
}

interface Props {
    settings: DirectorySettingsData;
}

const SRI_LANKA_BOUNDS = {
    minLat: 5.8,
    maxLat: 9.9,
    minLng: 79.6,
    maxLng: 82.0,
};

export default function DirectorySettingsTab({ settings }: Props) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    const [locationError, setLocationError] = useState<string | null>(null);

    const form = useForm({
        directory_enabled: settings.enabled,
        consent: false,
        directory_district: settings.district,
        directory_city: settings.city,
        directory_latitude: settings.has_pinned ? settings.latitude : (null as number | null),
        directory_longitude: settings.has_pinned ? settings.longitude : (null as number | null),
        directory_description: settings.description || '',
        directory_services: settings.services || ['OPD Consultation', 'Specialist Channeling'],
    });

    // Custom map pin icon
    const createPinIcon = () => {
        return L.divIcon({
            className: 'custom-directory-pin',
            html: `
                <div style="position: relative; width: 34px; height: 34px;">
                    <div style="
                        width: 34px;
                        height: 34px;
                        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid #ffffff;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
                    </div>
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -34],
        });
    };

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const initialLat = form.data.directory_latitude ?? settings.latitude ?? 6.9271;
        const initialLng = form.data.directory_longitude ?? settings.longitude ?? 79.8612;
        const initialZoom = form.data.directory_latitude ? 14 : 8;

        const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: initialZoom,
            minZoom: 7,
            maxZoom: 18,
            maxBounds: [
                [SRI_LANKA_BOUNDS.minLat - 0.5, SRI_LANKA_BOUNDS.minLng - 0.5],
                [SRI_LANKA_BOUNDS.maxLat + 0.5, SRI_LANKA_BOUNDS.maxLng + 0.5],
            ],
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add initial marker if coordinates exist
        if (form.data.directory_latitude && form.data.directory_longitude) {
            const marker = L.marker([form.data.directory_latitude, form.data.directory_longitude], {
                draggable: true,
                icon: createPinIcon(),
            }).addTo(map);

            marker.on('dragend', (e) => {
                const latlng = e.target.getLatLng();
                updateCoordinates(latlng.lat, latlng.lng);
            });

            markerRef.current = marker;
        }

        // Click to place / move pin
        map.on('click', (e: L.LeafletMouseEvent) => {
            updateCoordinates(e.latlng.lat, e.latlng.lng);
        });

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
        };
    }, []);

    const updateCoordinates = (lat: number, lng: number) => {
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));

        // Validate within Sri Lanka bounds
        if (
            roundedLat < SRI_LANKA_BOUNDS.minLat ||
            roundedLat > SRI_LANKA_BOUNDS.maxLat ||
            roundedLng < SRI_LANKA_BOUNDS.minLng ||
            roundedLng > SRI_LANKA_BOUNDS.maxLng
        ) {
            setLocationError('Selected point is outside Sri Lanka. Please click inside Sri Lanka boundaries.');
            return;
        }

        setLocationError(null);
        form.setData((prev) => ({
            ...prev,
            directory_latitude: roundedLat,
            directory_longitude: roundedLng,
        }));

        if (mapInstanceRef.current) {
            if (!markerRef.current) {
                const newMarker = L.marker([roundedLat, roundedLng], {
                    draggable: true,
                    icon: createPinIcon(),
                }).addTo(mapInstanceRef.current);

                newMarker.on('dragend', (e) => {
                    const latlng = e.target.getLatLng();
                    updateCoordinates(latlng.lat, latlng.lng);
                });

                markerRef.current = newMarker;
            } else {
                markerRef.current.setLatLng([roundedLat, roundedLng]);
            }
        }
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                updateCoordinates(latitude, longitude);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 15);
                }
            },
            (err) => {
                setLocationError(`Could not detect location: ${err.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const toggleService = (service: string) => {
        const current = form.data.directory_services || [];
        if (current.includes(service)) {
            form.setData('directory_services', current.filter((s) => s !== service));
        } else {
            form.setData('directory_services', [...current, service]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/settings/directory', {
            preserveScroll: true,
        });
    };

    if (!settings.is_owner) {
        return (
            <div className="max-w-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-bold">Owner Access Required</h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Only the clinic owner or authorized administrator can configure public directory listing and consent to publishing clinic doctor schedules.
                    </p>
                </div>
            </div>
        );
    }

    const hasCoordinates = form.data.directory_latitude !== null && form.data.directory_longitude !== null;
    const isReadyToPublish =
        form.data.directory_enabled &&
        form.data.directory_district &&
        hasCoordinates &&
        settings.active_doctors_count > 0;

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800/50 flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Public Clinic & Doctor Directory
                                {form.data.directory_enabled ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircle2 className="w-3 h-3" /> Opted In
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        Disabled
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Feature your clinic and active doctor channeling sessions on the central MedVisit directory (medvisit.lk/find). Patients can find your clinic on the map and book appointments.
                            </p>
                        </div>
                    </div>

                    <a
                        href={settings.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview Listing
                    </a>
                </div>

                {/* Missing checklist banner */}
                {settings.missing_fields.length > 0 && form.data.directory_enabled && (
                    <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs">
                        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            Listing Pending: Complete the following requirements to be published
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300 ml-1">
                            {settings.missing_fields.map((field) => (
                                <li key={field}>{field}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Opt-In & Consent Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        1. Listing Status & Legal Consent
                    </h3>

                    <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Publish clinic on MedVisit public directory
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                When enabled, your clinic profile and active doctors will appear in search results on medvisit.lk.
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={form.data.directory_enabled}
                            onChange={(e) => form.setData('directory_enabled', e.target.checked)}
                            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                    </label>

                    {form.data.directory_enabled && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 space-y-3">
                            {settings.consented_at ? (
                                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Consent confirmed on {settings.consented_at}.
                                </div>
                            ) : (
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.consent}
                                        onChange={(e) => form.setData('consent', e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700"
                                    />
                                    <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                        I hereby consent and agree to publish our clinic profile, location, and active doctor channeling schedules on the public MedVisit directory (medvisit.lk). I understand patients will be directed to our clinic subdomain to book channeling tokens. <span className="text-red-500 font-bold">*</span>
                                    </span>
                                </label>
                            )}
                            {form.errors.consent && (
                                <p className="text-xs text-red-600 dark:text-red-400">{form.errors.consent}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Location & Map Pin Picker */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                2. Clinic Map Location & Region
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Click on the map or drag the pin to set your exact clinic entrance. Required for "Near Me" patient searches.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50 transition-colors self-start"
                        >
                            <MapPin className="w-3.5 h-3.5" />
                            Use My Current Location
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                District <span className="text-red-500">*</span>
                            </label>
                            <GlassSelect
                                value={form.data.directory_district}
                                onValueChange={(val) => form.setData('directory_district', val)}
                                placeholder="Select District"
                                options={settings.districts.map((d) => ({ value: d, label: d }))}
                            />
                            {form.errors.directory_district && (
                                <p className="text-xs text-red-600 mt-1">{form.errors.directory_district}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                City / Town <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.data.directory_city}
                                onChange={(e) => form.setData('directory_city', e.target.value)}
                                placeholder="e.g. Maharagama, Nugegoda, Jaffna Town"
                                className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            />
                            {form.errors.directory_city && (
                                <p className="text-xs text-red-600 mt-1">{form.errors.directory_city}</p>
                            )}
                        </div>
                    </div>

                    {/* Coordinates status badge */}
                    <div className="flex flex-wrap items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary-500" />
                            {hasCoordinates ? (
                                <>
                                    Latitude: <strong className="text-slate-900 dark:text-slate-100">{form.data.directory_latitude}</strong>,
                                    Longitude: <strong className="text-slate-900 dark:text-slate-100">{form.data.directory_longitude}</strong>
                                </>
                            ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                    No pin placed yet. Click on the map to set your location.
                                </span>
                            )}
                        </span>
                        {hasCoordinates && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Pinned
                            </span>
                        )}
                    </div>

                    {locationError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{locationError}</p>
                    )}

                    {/* Leaflet Map Canvas */}
                    <div
                        ref={mapContainerRef}
                        className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 z-0"
                    />
                </div>

                {/* 3. Description & Services */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            3. Directory Description & Available Services
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Brief highlight of your medical facility and services offered for patients browsing the directory.
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Short Clinic Description (Max 300 characters)
                            </label>
                            <span className={`text-[11px] font-mono ${
                                form.data.directory_description.length > 280
                                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                                    : 'text-slate-400'
                            }`}>
                                {form.data.directory_description.length}/300
                            </span>
                        </div>
                        <textarea
                            rows={3}
                            maxLength={300}
                            value={form.data.directory_description}
                            onChange={(e) => form.setData('directory_description', e.target.value)}
                            placeholder="e.g. Modern family health center offering specialist channeling, OPD consultation, pharmacy, and rapid diagnostic laboratory tests with friendly care."
                            className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        {form.errors.directory_description && (
                            <p className="text-xs text-red-600 mt-1">{form.errors.directory_description}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Services Provided (Tag filters)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {settings.fixed_services.map((service) => {
                                const isSelected = form.data.directory_services.includes(service);
                                return (
                                    <button
                                        key={service}
                                        type="button"
                                        onClick={() => toggleService(service)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                            isSelected
                                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {service}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/30 transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {form.processing ? 'Saving Settings...' : 'Save Directory Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
