import React from 'react';
import {
    Sparkles,
    ShieldCheck,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Clock,
    Tv,
    Globe,
    Printer,
} from 'lucide-react';
import { SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    onContinue: () => void;
    saving: boolean;
}

export default function StepWelcome({ tenant, onContinue, saving }: Props) {
    return (
        <div className="space-y-6">
            {/* Top Pill / Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] dark:text-[#5c9df4]">
                <Sparkles className="w-3.5 h-3.5 text-[#0E9E8F]" />
                <span>Subscription Active & Ready</span>
            </div>

            {/* Title & Headline */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Welcome, {tenant.name}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    Let&apos;s complete a short 3-minute setup to tailor your clinic&apos;s online presence,
                    waiting-room TV displays, receipts, and patient booking channels.
                </p>
            </div>

            {/* Plan Info Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1E6FD9]/5 via-[#0E9E8F]/5 to-transparent border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Current Subscription:
                    </span>
                    <span className="font-bold text-[#1E6FD9] dark:text-[#5c9df4] uppercase">
                        {tenant.plan_name} plan
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Renewal Date:</span>
                    <span className="font-mono">{tenant.subscription_renews_on}</span>
                </div>
            </div>

            {/* What setup configures */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    What we will configure together:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[#1E6FD9]/10 text-[#1E6FD9] shrink-0">
                            <Globe className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Clinic Website & Logo
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                Your public web address at {tenant.subdomain}.medvisit.lk
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[#0E9E8F]/10 text-[#0E9E8F] shrink-0">
                            <Tv className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Waiting-Room TV
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                Live token callouts & queue screen in your brand colors.
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[#FF7A59]/10 text-[#FF7A59] shrink-0">
                            <Printer className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                80mm Reception Slips
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                Instant token slip & invoice thermal printing.
                            </p>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Working Hours & Booking
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                Automatic patient token slots and Sri Lanka time checks.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reassurance Note */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                    Every choice can be adjusted anytime inside your clinic Settings.
                </span>
            </div>

            {/* Action CTA */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={onContinue}
                    disabled={saving}
                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg shadow-[#1E6FD9]/20 hover:shadow-xl hover:shadow-[#1E6FD9]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                        background: 'linear-gradient(135deg, #1E6FD9 0%, #0E9E8F 100%)',
                    }}
                >
                    <span>{saving ? 'Saving...' : "Let's get started"}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
