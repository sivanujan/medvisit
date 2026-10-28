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
    const { impersonation, clinic_setup, auth } = usePage<any>().props as {
        impersonation?: {
            is_active: boolean;
            impersonator_name: string;
            reason?: string;
            return_url?: string;
        } | null;
        clinic_setup?: {
            needs_setup: boolean;
            in_grace: boolean;
            grace_days_remaining: number;
            grace_until?: string | null;
            banner_dismissed: boolean;
            current_step: number;
        } | null;
        auth?: {
            user?: {
                id: number;
                roles?: Array<{ name: string }>;
            };
        };
    };

    const [setupDismissed, setSetupDismissed] = useState<boolean>(() => {
        return !!clinic_setup?.banner_dismissed;
    });

    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('medvisit_dismissed_banners') || '[]');
        } catch {
            return [];
        }
    });

    const isAdmin = auth?.user?.roles?.some((r) => r.name === 'clinic_admin' || r.name === 'super_admin');
    const showSetupBanner = isAdmin && clinic_setup?.needs_setup && clinic_setup?.in_grace && !setupDismissed;

    const handleDismissSetupBanner = async () => {
        setSetupDismissed(true);
        try {
            await fetch('/setup/dismiss-banner', {
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
            {/* Clinic Setup Grace Banner */}
            {showSetupBanner && (
                <div className="w-full px-4 py-3 rounded-2xl border border-[#1E6FD9]/30 bg-gradient-to-r from-[#1E6FD9]/15 via-[#0E9E8F]/10 to-[#1E6FD9]/15 backdrop-blur-md flex items-center justify-between gap-3 text-xs sm:text-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-xs">
                            ✓
                        </div>
                        <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                                Finish clinic setup:
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                                {clinic_setup?.grace_days_remaining} {clinic_setup?.grace_days_remaining === 1 ? 'day' : 'days'} remaining in your grace period. Complete logo, opening hours, and receipt printing to tailor your clinic workspace.
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href="/setup"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E6FD9] hover:bg-[#1858ad] text-white font-bold text-xs transition-colors shadow-xs"
                        >
                            <span>Finish setup (~3 min)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                        <button
                            type="button"
                            onClick={handleDismissSetupBanner}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Dismiss for this session"
                            aria-label="Dismiss setup banner"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
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
