import React, { useEffect, useState } from 'react';
import {
    PartyPopper,
    CheckCircle2,
    ArrowRight,
    ExternalLink,
    Sparkles,
    Globe,
    Tv,
    Printer,
    Pill,
    MapPin,
    Clock,
    LayoutDashboard,
} from 'lucide-react';
import { SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    onComplete: () => void;
    onJumpToStep: (stepId: number) => void;
    saving: boolean;
    isCompleted: boolean;
}

export default function StepCelebration({
    tenant,
    form,
    onComplete,
    onJumpToStep,
    saving,
    isCompleted,
}: Props) {
    const brand = form.brand_color || '#0E9E8F';
    const initial = (tenant.name.trim().charAt(0) || 'C').toUpperCase();

    return (
        <div className="space-y-6">
            {!isCompleted ? (
                /* Pre-launch Review Checklist */
                <div className="space-y-6">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setup Complete · Ready to Launch</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                            Review your clinic settings
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Double check your configuration below before unlocking your full dashboard.
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="space-y-2.5">
                        {/* 1. Identity & Brand */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {form.logo_url ? (
                                    <img
                                        src={form.logo_url}
                                        alt="Logo"
                                        className="h-9 w-9 object-contain rounded-xl border border-slate-200 dark:border-white/10 p-0.5 bg-white"
                                    />
                                ) : (
                                    <div
                                        className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                                        style={{ background: brand }}
                                    >
                                        {initial}
                                    </div>
                                )}
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Identity & Brand
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <span>Color:</span>
                                        <span
                                            className="inline-block h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: brand }}
                                        />
                                        <span className="font-mono">{brand}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onJumpToStep(2)}
                                className="text-xs font-semibold text-[#1E6FD9] dark:text-[#5c9df4] hover:underline cursor-pointer"
                            >
                                Edit
                            </button>
                        </div>

                        {/* 2. Location */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-[#1E6FD9]/10 text-[#1E6FD9]">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Location & Phone
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                                        {form.city}, {form.district} · {form.phone}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onJumpToStep(4)}
                                className="text-xs font-semibold text-[#1E6FD9] dark:text-[#5c9df4] hover:underline cursor-pointer"
                            >
                                Edit
                            </button>
                        </div>

                        {/* 3. Opening Hours */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-[#0E9E8F]/10 text-[#0E9E8F]">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Opening Hours
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {Object.values(form.opening_hours).filter((d) => d.open).length} days open weekly
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onJumpToStep(5)}
                                className="text-xs font-semibold text-[#1E6FD9] dark:text-[#5c9df4] hover:underline cursor-pointer"
                            >
                                Edit
                            </button>
                        </div>

                        {/* 4. Booking & Pharmacy */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Booking & Pharmacy
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Online booking: {form.online_booking_enabled ? 'Active' : 'Disabled'} ·
                                        Dispensary: {form.pharmacy_enabled ? 'Active' : 'Disabled'}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onJumpToStep(7)}
                                className="text-xs font-semibold text-[#1E6FD9] dark:text-[#5c9df4] hover:underline cursor-pointer"
                            >
                                Edit
                            </button>
                        </div>

                        {/* 5. Printing & Directory */}
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                    <Printer className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        Printing & Directory
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Format: {form.print_receipt_format.toUpperCase()} ·
                                        Directory: {form.directory_enabled ? 'Listed' : 'Unlisted'}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onJumpToStep(9)}
                                className="text-xs font-semibold text-[#1E6FD9] dark:text-[#5c9df4] hover:underline cursor-pointer"
                            >
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Launch Action */}
                    <div className="pt-2">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onComplete}
                            className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white shadow-xl shadow-[#1E6FD9]/20 hover:shadow-2xl hover:shadow-[#1E6FD9]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            style={{
                                background: `linear-gradient(135deg, #1E6FD9 0%, ${brand} 100%)`,
                            }}
                        >
                            <PartyPopper className="w-5 h-5" />
                            <span>{saving ? 'Finalizing your clinic...' : 'Complete setup & launch dashboard'}</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Post-launch Celebration Screen */
                <div className="text-center py-6 space-y-6">
                    <div className="relative inline-flex items-center justify-center">
                        <div
                            className="absolute -inset-4 rounded-full blur-2xl opacity-40 animate-pulse"
                            style={{ background: brand }}
                        />
                        <div
                            className="relative h-20 w-20 rounded-3xl shadow-xl flex items-center justify-center text-white"
                            style={{
                                background: `linear-gradient(135deg, #1E6FD9 0%, ${brand} 100%)`,
                            }}
                        >
                            <PartyPopper className="w-10 h-10 animate-bounce" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Congratulations!
                        </h2>
                        <p className="text-sm font-semibold" style={{ color: brand }}>
                            {tenant.name} is now live and ready to welcome patients.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                            Your website, queue TV display, online token booking, and reception printing have
                            been successfully configured and unlocked.
                        </p>
                    </div>

                    {/* TV Motif Card in Celebration */}
                    <div className="p-4 rounded-2xl bg-slate-950 text-white max-w-xs mx-auto border border-slate-800 shadow-xl space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#0E9E8F]">
                            NOW SERVING
                        </div>
                        <div className="text-4xl font-black font-mono">01</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                            {tenant.name} · Live Queue
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="space-y-3 pt-2 max-w-sm mx-auto">
                        <a
                            href="/dashboard"
                            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white shadow-xl shadow-[#1E6FD9]/20 hover:shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                            style={{
                                background: `linear-gradient(135deg, #1E6FD9 0%, ${brand} 100%)`,
                            }}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Go to clinic dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                        </a>

                        <a
                            href={`https://${tenant.subdomain}.medvisit.lk`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <span>View your public clinic website</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
