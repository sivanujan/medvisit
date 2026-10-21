import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, Bell, ShieldAlert, X, ArrowRight, UserCheck } from 'lucide-react';
import { usePage } from '@inertiajs/react';

export interface BannerItem {
    id: string;
    type: 'maintenance' | 'warning' | 'billing' | 'update' | 'info';
    title: string;
    message: string;
    dismissible: boolean;
    cta_label?: string | null;
    cta_url?: string | null;
}

export default function BannerStack() {
    const { impersonation } = usePage<any>().props as {
        impersonation?: {
            is_active: boolean;
            impersonator_name: string;
            reason?: string;
            return_url?: string;
        } | null;
    };

    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('medvisit_dismissed_banners') || '[]');
        } catch {
            return [];
        }
    });

    const fetchBanners = async () => {
        try {
            const res = await fetch('/api/announcements/active-banners');
            if (res.ok) {
                const data = await res.json();
                setBanners(data.banners || []);
            }
        } catch {
            // ignore network errors
        }
    };

    useEffect(() => {
        fetchBanners();
        const interval = setInterval(fetchBanners, 60000); // 1 minute refresh
        return () => clearInterval(interval);
    }, []);

    const handleDismiss = async (banner: BannerItem) => {
        const next = [...dismissedIds, banner.id];
        setDismissedIds(next);
        try {
            localStorage.setItem('medvisit_dismissed_banners', JSON.stringify(next));
            await fetch(`/api/announcements/${banner.id}/dismiss`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
        } catch {
            // ignore
        }
    };

    const visibleBanners = banners.filter((b) => !dismissedIds.includes(b.id));

    return (
        <div className="w-full flex flex-col space-y-2 mb-4">
            {/* Impersonation Banner */}
            {impersonation?.is_active && (
                <div className="w-full bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-lg font-medium text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <UserCheck className="w-5 h-5 shrink-0 text-slate-950 font-bold" />
                        <span className="truncate">
                            <strong>Platform Impersonation Mode:</strong> Logged in as clinic on behalf of{' '}
                            <strong>{impersonation.impersonator_name}</strong>
                            {impersonation.reason ? ` — "${impersonation.reason}"` : ''}
                        </span>
                    </div>
                    <a
                        href={impersonation.return_url || '/impersonation/exit'}
                        className="ml-3 shrink-0 px-3 py-1 rounded-lg bg-slate-950 text-white font-semibold text-xs hover:bg-slate-900 transition-colors shadow-sm"
                    >
                        Exit Impersonation
                    </a>
                </div>
            )}

            {/* Broadcast Banners */}
            {visibleBanners.map((banner) => {
                const isMaintenance = banner.type === 'maintenance';
                const isWarning = banner.type === 'warning' || banner.type === 'billing';

                const bgClass = isMaintenance
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200'
                    : isWarning
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-900 dark:text-indigo-200';

                const Icon = isMaintenance ? ShieldAlert : isWarning ? AlertTriangle : Info;

                return (
                    <div
                        key={banner.id}
                        className={`w-full px-4 py-3 rounded-2xl border backdrop-blur-md flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm transition-all shadow-sm ${bgClass}`}
                    >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <Icon className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0 opacity-90" />
                            <div className="min-w-0">
                                <span className="font-bold mr-1.5">{banner.title}:</span>
                                <span className="opacity-95">{banner.message}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {banner.cta_label && banner.cta_url && (
                                <a
                                    href={banner.cta_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 font-bold text-xs hover:opacity-90 transition-opacity shadow-xs"
                                >
                                    <span>{banner.cta_label}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {banner.dismissible && (
                                <button
                                    type="button"
                                    onClick={() => handleDismiss(banner)}
                                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    title="Dismiss announcement"
                                    aria-label="Dismiss banner"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
