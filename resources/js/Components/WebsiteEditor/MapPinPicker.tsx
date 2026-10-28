import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin,
    Navigation,
    AlertCircle,
    CheckCircle2,
    Maximize2,
    Minimize2,
    Compass,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';

interface Props {
    latitude: number | null;
    longitude: number | null;
    onChange: (lat: number | null, lng: number | null) => void;
    district?: string;
    city?: string;
    className?: string;
}

const SRI_LANKA_BOUNDS = {
    minLat: 5.5,
    maxLat: 10.1,
    minLng: 79.4,
    maxLng: 82.3,
};

export const SRI_LANKA_DISTRICT_CENTERS: Record<string, [number, number]> = {
    Colombo: [6.9271, 79.8612],
    Gampaha: [7.0917, 79.9999],
    Kalutara: [6.5854, 79.9607],
    Kandy: [7.2906, 80.6337],
    Matale: [7.4675, 80.6234],
    'Nuwara Eliya': [6.9497, 80.7891],
    Galle: [6.0535, 80.2210],
    Matara: [5.9549, 80.5550],
    Hambantota: [6.1248, 81.1185],
    Jaffna: [9.6615, 80.0255],
    Kilinochchi: [9.3803, 80.3770],
    Mannar: [8.9810, 79.9044],
    Vavuniya: [8.7514, 80.4971],
    Mullaitivu: [9.2671, 80.8143],
    Batticaloa: [7.7170, 81.7000],
    Ampara: [7.2912, 81.6747],
    Trincomalee: [8.5874, 81.2152],
    Kurunegala: [7.4863, 80.3623],
    Puttalam: [8.0362, 79.8283],
    Anuradhapura: [8.3114, 80.4037],
    Polonnaruwa: [7.9403, 81.0188],
    Badulla: [6.9934, 81.0550],
    Monaragala: [6.8728, 81.3507],
    Ratnapura: [6.6828, 80.4037],
    Kegalle: [7.2513, 80.3464],
};

const createPinIcon = () => {
    return L.divIcon({
        className: 'custom-website-pin',
        html: `
            <div style="position: relative; width: 36px; height: 36px;">
                <div style="
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #1E6FD9 0%, #0E9E8F 100%);
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 2.5px solid #ffffff;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
                </div>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    });
};

export default function MapPinPicker({
    latitude,
    longitude,
    onChange,
    district,
    city,
    className = '',
}: Props) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<boolean>(false);

    const updateCoords = (lat: number, lng: number) => {
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));

        if (
            roundedLat < SRI_LANKA_BOUNDS.minLat ||
            roundedLat > SRI_LANKA_BOUNDS.maxLat ||
            roundedLng < SRI_LANKA_BOUNDS.minLng ||
            roundedLng > SRI_LANKA_BOUNDS.maxLng
        ) {
            setError('Please pick a location within Sri Lanka.');
            return;
        }

        setError(null);
        onChange(roundedLat, roundedLng);

        if (mapInstanceRef.current) {
            if (!markerRef.current) {
                const marker = L.marker([roundedLat, roundedLng], {
                    draggable: true,
                    icon: createPinIcon(),
                }).addTo(mapInstanceRef.current);

                marker.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    updateCoords(pos.lat, pos.lng);
                });

                markerRef.current = marker;
            } else {
                markerRef.current.setLatLng([roundedLat, roundedLng]);
            }
        }
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        // If coordinates provided, use them; otherwise check district center, else Colombo
        const districtCenter = district ? SRI_LANKA_DISTRICT_CENTERS[district] : null;
        const initialLat = latitude ?? (districtCenter ? districtCenter[0] : 6.9271);
        const initialLng = longitude ?? (districtCenter ? districtCenter[1] : 79.8612);
        const initialZoom = latitude && longitude ? 15 : (districtCenter ? 13 : 9);

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
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        mapInstanceRef.current = map;

        if (latitude !== null && longitude !== null) {
            const marker = L.marker([latitude, longitude], {
                draggable: true,
                icon: createPinIcon(),
            }).addTo(map);

            marker.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                updateCoords(pos.lat, pos.lng);
            });

            markerRef.current = marker;
        }

        map.on('click', (e: L.LeafletMouseEvent) => {
            updateCoords(e.latlng.lat, e.latlng.lng);
        });

        // Trigger map invalidate size shortly after mount to ensure smooth tile layout
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            clearTimeout(timer);
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
        };
    }, []);

    // Handle smooth map resize when expanded state toggles
    useEffect(() => {
        const timer = setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 320);
        return () => clearTimeout(timer);
    }, [expanded]);

    // When district changes and no pin placed yet, center smoothly on district
    useEffect(() => {
        if (!mapInstanceRef.current || !district) return;
        const center = SRI_LANKA_DISTRICT_CENTERS[district];
        if (center && (latitude === null || longitude === null)) {
            mapInstanceRef.current.setView(center, 13);
        }
    }, [district]);

    const handleJumpToDistrict = () => {
        if (!district || !mapInstanceRef.current) return;
        const center = SRI_LANKA_DISTRICT_CENTERS[district];
        if (center) {
            mapInstanceRef.current.flyTo(center, 14, { duration: 0.8 });
        }
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                updateCoords(lat, lng);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lng], 16);
                }
            },
            (err) => {
                setError(`Could not detect location: ${err.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const hasPin = latitude !== null && longitude !== null;

    return (
        <div className={`space-y-2.5 ${className}`}>
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-[#1E6FD9]" />
                        <span>Clinic entrance pin</span>
                    </span>
                    {hasPin && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Pinned
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {district && SRI_LANKA_DISTRICT_CENTERS[district] && (
                        <button
                            type="button"
                            onClick={handleJumpToDistrict}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-[#0E9E8F] hover:text-[#0E9E8F] transition shadow-2xs cursor-pointer"
                            title={`Center map on ${district}`}
                        >
                            <Compass className="h-3.5 w-3.5 text-[#0E9E8F]" />
                            <span>Center {district}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCurrentLocation}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-[#1E6FD9] hover:text-[#1E6FD9] transition shadow-2xs cursor-pointer"
                        title="Detect your current GPS location"
                    >
                        <Navigation className="h-3.5 w-3.5 text-[#1E6FD9]" />
                        <span>My location</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setExpanded((prev) => !prev)}
                        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition shadow-2xs cursor-pointer ${
                            expanded
                                ? 'bg-[#1E6FD9] text-white border-[#1E6FD9]'
                                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                        title={expanded ? 'Collapse to standard height' : 'Expand map for precise entrance pinning'}
                    >
                        {expanded ? (
                            <>
                                <Minimize2 className="h-3.5 w-3.5" />
                                <span>Collapse</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="h-3.5 w-3.5 text-[#1E6FD9]" />
                                <span>Expand map</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Interactive Leaflet Map Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                <div
                    ref={mapContainerRef}
                    className={`w-full z-0 transition-[height] duration-300 ease-in-out ${
                        expanded ? 'h-[500px] sm:h-[580px]' : 'h-80 sm:h-96'
                    }`}
                />

                {/* Helpful In-Map Overlay Prompt */}
                {!hasPin && (
                    <div className="absolute top-3 right-3 z-400 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-md text-[11px] font-medium text-slate-700 dark:text-slate-300 pointer-events-none">
                        📍 Click anywhere on map to drop pin
                    </div>
                )}
            </div>

            {/* Footer Status & Actions */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                {hasPin ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-xs">
                            {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                            (drag pin anytime to fine-tune)
                        </span>
                    </span>
                ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        No pin placed yet. Click on the map to set your clinic entrance.
                    </span>
                )}

                {hasPin && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null, null);
                            if (markerRef.current && mapInstanceRef.current) {
                                mapInstanceRef.current.removeLayer(markerRef.current);
                                markerRef.current = null;
                            }
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition cursor-pointer"
                    >
                        Remove pin
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-2.5 rounded-xl">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
