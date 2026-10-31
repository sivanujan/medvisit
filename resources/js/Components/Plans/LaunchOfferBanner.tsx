import React from 'react';
import { Sparkles, ArrowRight, AlertTriangle, MessageSquare } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props {
    isLaunchOffer?: boolean;
    launchOfferUntil?: string | null;
    smsQuota?: {
        used: number;
        limit: number;
        remaining: number;
        percent: number;
        is_exhausted: boolean;
        is_warning: boolean;
    } | null;
}

export default function LaunchOfferBanner({ isLaunchOffer, launchOfferUntil, smsQuota }: Props) {
    return (
        <div className="space-y-2 mb-4">
            {/* Launch Offer Banner */}
            {isLaunchOffer && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#1E6FD9]/15 via-[#0E9E8F]/15 to-[#1E6FD9]/10 border border-[#1E6FD9]/25 text-slate-800 dark:text-slate-100 text-xs shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <p className="font-medium leading-snug">
                            <strong className="font-bold text-[#1E6FD9] dark:text-[#3b8af0]">Launch offer active:</strong>{' '}
                            all Advanced tier features are unlocked free for your clinic{launchOfferUntil ? ` until ${launchOfferUntil}` : ''}.
                        </p>
                    </div>

                    <Link
                        href="/settings/billing/change-plan"
                        className="inline-flex items-center gap-1 font-semibold text-xs text-[#1E6FD9] dark:text-[#3b8af0] hover:underline shrink-0"
                    >
                        <span>Choose your plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {/* SMS Quota Exhausted Banner */}
            {smsQuota && smsQuota.is_exhausted && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-900 dark:text-rose-200 text-xs shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <p className="font-medium leading-snug">
                            <strong>Monthly SMS quota reached ({smsQuota.used}/{smsQuota.limit}).</strong> Queue alert SMS is paused. Patient booking OTP is operating on grace.
                        </p>
                    </div>

                    <Link
                        href="/settings/billing"
                        className="inline-flex items-center gap-1 font-bold text-xs text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                    >
                        <MessageSquare className="w-3 h-3" />
                        <span>Add SMS pack</span>
                    </Link>
                </div>
            )}

            {/* SMS Quota 80% Warning Banner */}
            {smsQuota && !smsQuota.is_exhausted && smsQuota.is_warning && (
                <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="font-medium leading-snug">
                            <strong>SMS alert quota at {smsQuota.percent}%:</strong> {smsQuota.remaining} messages remaining this billing cycle.
                        </p>
                    </div>

                    <Link
                        href="/settings/billing"
                        className="text-amber-700 dark:text-amber-300 font-semibold hover:underline text-xs shrink-0"
                    >
                        View billing & top-ups
                    </Link>
                </div>
            )}
        </div>
    );
}

