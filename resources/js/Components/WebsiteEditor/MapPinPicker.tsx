import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
    latitude: number | null;
    longitude: number | null;
    onChange: (lat: number | null, lng: number | null) => void;
}

const SRI_LANKA_BOUNDS = {
    minLat: 5.8,
    maxLat: 9.9,
    minLng: 79.6,
    maxLng: 82.0,
};

const createPinIcon = () => {
    return L.divIcon({
        className: 'custom-website-pin',
        html: `
            <div style="position: relative; width: 32px; height: 32px;">
                <div style="
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #1E6FD9 0%, #0E9E8F 100%);
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 2.5px solid #ffffff;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
                </div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

export default function MapPinPicker({ latitude, longitude, onChange }: Props) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [error, setError] = useState<string | null>(null);

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

        const initialLat = latitude ?? 6.9271; // Default to Colombo
        const initialLng = longitude ?? 79.8612;
        const initialZoom = latitude && longitude ? 14 : 9;

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

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
        };
    }, []);

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
                    mapInstanceRef.current.setView([lat, lng], 15);
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
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Map pin location
                </span>
                <button
                    type="button"
                    onClick={handleCurrentLocation}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                    <Navigation className="h-3 w-3 text-primary" />
                    Use current location
                </button>
            </div>

            <div
                ref={mapContainerRef}
                className="h-44 w-full rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 z-0"
            />

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                {hasPin ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                    </span>
                ) : (
                    <span>Click on the map or drag the pin to set entrance.</span>
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
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                        Remove pin
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </div>
            )}
        </div>
    );
}
