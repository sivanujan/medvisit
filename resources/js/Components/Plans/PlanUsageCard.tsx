import React from 'react';
import { GlassCard } from '@/Components/UI/GlassCard';
import { Users, UserCheck, Tv, MessageSquare, ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface MetricItem {
    label: string;
    used: number;
    limit: number;
    icon: React.ElementType;
    unit: string;
    recommendedPlan: string;
}

interface PlanUsageCardProps {
    planName: string;
    isComp?: boolean;
    isLaunchOffer?: boolean;
    launchOfferUntil?: string | null;
    doctorsUsed: number;
    doctorsLimit: number;
    staffUsed: number;
    staffLimit: number;
    tvScreensUsed: number;
    tvScreensLimit: number;
    smsUsed: number;
    smsLimit: number;
    smsRemaining: number;
    onChangePlan?: () => void;
    onBuySmsPack?: () => void;
}

export default function PlanUsageCard({
    planName,
    isComp = false,
    isLaunchOffer = false,
    launchOfferUntil = null,
    doctorsUsed,
    doctorsLimit,
    staffUsed,
    staffLimit,
    tvScreensUsed,
    tvScreensLimit,
    smsUsed,
    smsLimit,
    smsRemaining,
    onChangePlan,
    onBuySmsPack,
}: PlanUsageCardProps) {
    const metrics: MetricItem[] = [
        {
            label: 'Active Doctors',
            used: doctorsUsed,
            limit: doctorsLimit,
            icon: Users,
            unit: 'doctors',
            recommendedPlan: doctorsLimit === 3 ? 'Pro (up to 8)' : 'Advanced (unlimited)',
        },
        {
            label: 'Active Staff Users',
            used: staffUsed,
            limit: staffLimit,
            icon: UserCheck,
            unit: 'staff',
            recommendedPlan: staffLimit === 5 ? 'Pro (up to 15)' : 'Advanced (unlimited)',
        },
        {
            label: 'Paired TV Screens',
            used: tvScreensUsed,
            limit: tvScreensLimit,
            icon: Tv,
            unit: 'screens',
            recommendedPlan: tvScreensLimit === 1 ? 'Pro (up to 3)' : 'Advanced (unlimited)',
        },
        {
            label: 'SMS Alerts (This Month)',
            used: smsUsed,
            limit: smsLimit,
            icon: MessageSquare,
            unit: 'SMS',
            recommendedPlan: smsLimit === 300 ? 'Pro (1,000)' : 'Advanced (3,000)',
        },
    ];

    return (
        <GlassCard className="p-6 sm:p-7 relative overflow-hidden">
            {/* Top Row: Plan Name & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/60 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Current Plan & Quotas
                        </span>
                        {isLaunchOffer && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#1E6FD9]/15 to-[#0E9E8F]/15 text-[#1E6FD9] border border-[#1E6FD9]/30">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Launch Offer Free Period</span>
                            </span>
                        )}
                        {isComp && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                <span>Lifetime Complimentary</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {planName}
                        </h3>
                        {isLaunchOffer && launchOfferUntil && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                · Free until {launchOfferUntil}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onBuySmsPack && (
                        <button
                            type="button"
                            onClick={onBuySmsPack}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0E9E8F] bg-[#0E9E8F]/10 hover:bg-[#0E9E8F]/20 border border-[#0E9E8F]/20 transition cursor-pointer"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Add SMS Pack</span>
                        </button>
                    )}

                    {onChangePlan ? (
                        <button
                            type="button"
                            onClick={onChangePlan}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1557b0] transition shadow-sm cursor-pointer"
                        >
                            <span>Change Plan</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <Link
                            href="/settings/billing/change-plan"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1557b0] transition shadow-sm cursor-pointer"
                        >
                            <span>Change Plan</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Quota Progress Bars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                {metrics.map((m, idx) => {
                    const isUnlimited = m.limit === -1 || isComp;
                    const percent = isUnlimited ? 0 : Math.min(100, Math.round((m.used / m.limit) * 100));
                    const isAtLimit = !isUnlimited && m.used >= m.limit;
                    const isNearLimit = !isUnlimited && percent >= 80 && !isAtLimit;

                    const barColor = isAtLimit
                        ? 'bg-rose-500'
                        : isNearLimit
                        ? 'bg-[#FF7A59]'
                        : 'bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F]';

                    return (
                        <div
                            key={idx}
                            className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                        <m.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        {m.label}
                                    </span>
                                </div>

                                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                    {isUnlimited ? (
                                        <span>{m.used} <span className="text-slate-400 font-normal">/ ∞</span></span>
                                    ) : (
                                        <span>
                                            <span className={isAtLimit ? 'text-rose-600 dark:text-rose-400' : ''}>{m.used}</span>
                                            <span className="text-slate-400 font-normal"> / {m.limit}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3">
                                <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                        style={{ width: isUnlimited ? '15%' : `${percent}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[11px] mt-1.5">
                                    <span className="text-slate-500">
                                        {isUnlimited
                                            ? 'Unlimited capacity'
                                            : isAtLimit
                                            ? 'Limit reached'
                                            : isNearLimit
                                            ? `${m.limit - m.used} remaining (${percent}% used)`
                                            : `${m.limit - m.used} remaining`}
                                    </span>

                                    {isAtLimit && !isUnlimited && (
                                        <Link
                                            href="/settings/billing/change-plan"
                                            className="text-[#1E6FD9] hover:underline font-semibold"
                                        >
                                            Upgrade for {m.recommendedPlan}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

