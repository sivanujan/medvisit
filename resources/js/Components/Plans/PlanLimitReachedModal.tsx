import React from 'react';
import { GlassModal } from '@/Components/UI/GlassModal';
import { AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';
import { Link } from '@inertiajs/react';

export interface PlanLimitReachedDetails {
    resource: string;
    limit: number;
    plan: string;
    upgrade_plan: string;
    message?: string;
    upgrade_url?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    details: PlanLimitReachedDetails | null;
}

export default function PlanLimitReachedModal({ isOpen, onClose, details }: Props) {
    if (!details) return null;

    const resourceNames: Record<string, string> = {
        doctors: 'active doctors',
        staff: 'active staff members',
        tv_screens: 'paired TV screens',
        sms: 'monthly SMS quota',
    };

    const nextLimits: Record<string, string> = {
        doctors: details.upgrade_plan === 'Pro' ? 'up to 8 doctors' : 'unlimited doctors',
        staff: details.upgrade_plan === 'Pro' ? 'up to 15 staff members' : 'unlimited staff',
        tv_screens: details.upgrade_plan === 'Pro' ? 'up to 3 TV screens' : 'unlimited TV screens',
        sms: details.upgrade_plan === 'Pro' ? '1,000 SMS per month' : '3,000 SMS per month',
    };

    const resourceName = resourceNames[details.resource] || details.resource;
    const nextLimit = nextLimits[details.resource] || `expanded ${resourceName}`;

    return (
        <GlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="text-center p-2">
                {/* Warning Icon */}
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-4 shadow-sm shadow-amber-500/10">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    <span>Limit Reached on {details.plan}</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {details.message || `You've reached ${details.limit} ${resourceName} on ${details.plan}.`}
                </h3>

                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Upgrade to <strong>{details.upgrade_plan}</strong> to get {nextLimit} and unlock further capabilities for your clinic.
                </p>

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
                    <Link
                        href={details.upgrade_url || '/settings/billing/change-plan'}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] hover:from-[#1557b0] hover:to-[#0b8074] text-white text-xs font-bold transition shadow-md shadow-[#1E6FD9]/20 cursor-pointer"
                        onClick={onClose}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Upgrade to {details.upgrade_plan}</span>
                        <ArrowUpRight className="w-4 h-4" />
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </GlassModal>
    );
}

