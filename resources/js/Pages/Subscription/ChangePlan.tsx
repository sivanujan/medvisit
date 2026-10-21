import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import Modal from '@/Components/Modal';
import {
    ArrowLeft,
    Check,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Calendar,
    Sparkles,
    AlertCircle,
    Clock,
} from 'lucide-react';

interface ProrationPreview {
    is_upgrade: boolean;
    remaining_days: number;
    total_period_days: number;
    proration_cents: number;
    formatted_proration: string;
    effective_immediately: boolean;
}

interface PlanItem {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
    formatted_price: string;
    billing_interval: string;
    features: string[];
    is_current: boolean;
    is_pending_downgrade: boolean;
    is_upgrade: boolean;
    is_downgrade: boolean;
    proration_preview?: ProrationPreview | null;
}

interface ChangePlanProps {
    tenant: {
        id: string;
        name: string;
    };
    currentPlan: {
        id: number;
        name: string;
        formatted_price: string;
    } | null;
    pendingPlan?: {
        id: number;
        name: string;
        effective_date?: string | null;
    } | null;
    periodEnd?: string | null;
    plans: PlanItem[];
}

export default function ChangePlan({
    tenant,
    currentPlan,
    pendingPlan,
    periodEnd,
    plans,
}: ChangePlanProps) {
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanItem | null>(null);
    const [selectedDowngradePlan, setSelectedDowngradePlan] = useState<PlanItem | null>(null);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isDowngrading, setIsDowngrading] = useState(false);

    const handleUpgradeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUpgradePlan) return;

        setIsUpgrading(true);
        router.post('/settings/billing/upgrade', {
            new_plan_id: selectedUpgradePlan.id,
        }, {
            onFinish: () => setIsUpgrading(false),
        });
    };

    const handleDowngradeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDowngradePlan) return;

        setIsDowngrading(true);
        router.post('/settings/billing/downgrade', {
            new_plan_id: selectedDowngradePlan.id,
        }, {
            onSuccess: () => setSelectedDowngradePlan(null),
            onFinish: () => setIsDowngrading(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Change Subscription Plan" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Settings', href: '/settings' },
                        { label: 'Subscription & Billing', href: '/settings/billing' },
                        { label: 'Change Plan' },
                    ]}
                    title="Choose Your MedVisit Plan"
                    subtitle="Upgrade for more doctor seats and advanced features immediately, or schedule a downgrade for your next cycle."
                    action={
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs shadow-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span>Payments secured by Payments.lk</span>
                        </div>
                    }
                />

                {/* Plan Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = plan.is_current;
                        const isPending = plan.is_pending_downgrade;

                        return (
                            <GlassCard
                                key={plan.id}
                                className={`p-6 flex flex-col justify-between transition-all duration-300 ${
                                    isCurrent
                                        ? 'border-2 border-teal-500/80 dark:border-teal-400/80 shadow-lg ring-1 ring-teal-500/20'
                                        : 'hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            {plan.name}
                                        </h3>
                                        {isCurrent && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-[11px] font-semibold">
                                                Current Plan
                                            </span>
                                        )}
                                        {isPending && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold">
                                                Scheduled Switch
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                            {plan.formatted_price}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                            / {plan.billing_interval || 'month'}
                                        </span>
                                    </div>

                                    {/* Features list */}
                                    <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                                        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                                            Features Included:
                                        </p>
                                        {plan.features.map((feat, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                                <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Plan Action */}
                                <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                                    {isCurrent ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium text-xs cursor-default text-center"
                                        >
                                            Your Active Plan
                                        </button>
                                    ) : plan.is_upgrade ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUpgradePlan(plan)}
                                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm"
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                            <span>Upgrade to {plan.name}</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDowngradePlan(plan)}
                                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition"
                                        >
                                            <ArrowDownRight className="w-4 h-4" />
                                            <span>Downgrade to {plan.name}</span>
                                        </button>
                                    )}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>

            {/* Upgrade Proration Confirmation Modal */}
            <Modal
                show={!!selectedUpgradePlan}
                onClose={() => setSelectedUpgradePlan(null)}
                maxWidth="md"
            >
                {selectedUpgradePlan && (
                    <form onSubmit={handleUpgradeSubmit} className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-500 shrink-0">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Upgrade to {selectedUpgradePlan.name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Immediate activation with fair prorated billing for your remaining days.
                                </p>
                            </div>
                        </div>

                        {/* Proration breakdown */}
                        <div className="mt-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Current Plan:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {currentPlan?.name} ({currentPlan?.formatted_price})
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Upgraded Plan:</span>
                                <span className="font-semibold text-teal-600 dark:text-teal-400">
                                    {selectedUpgradePlan.name} ({selectedUpgradePlan.formatted_price})
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Remaining in Cycle:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {selectedUpgradePlan.proration_preview?.remaining_days || 0} of{' '}
                                    {selectedUpgradePlan.proration_preview?.total_period_days || 30} days
                                </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
                                <span className="text-slate-900 dark:text-white">Amount Due Today:</span>
                                <span className="text-teal-600 dark:text-teal-400 text-base">
                                    {selectedUpgradePlan.proration_preview?.formatted_proration || selectedUpgradePlan.formatted_price}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-700 dark:text-teal-300 flex items-start gap-2">
                            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                Upgrades take effect immediately upon successful payment. Your next regular monthly renewal on {periodEnd} will be billed at {selectedUpgradePlan.formatted_price}.
                            </span>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSelectedUpgradePlan(null)}
                                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpgrading}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>{isUpgrading ? 'Redirecting to Payments.lk...' : 'Proceed to Checkout'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Downgrade Scheduled Confirmation Modal */}
            <Modal
                show={!!selectedDowngradePlan}
                onClose={() => setSelectedDowngradePlan(null)}
                maxWidth="md"
            >
                {selectedDowngradePlan && (
                    <form onSubmit={handleDowngradeSubmit} className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Schedule Downgrade to {selectedDowngradePlan.name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Downgrades apply at the end of your prepaid period.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                <span>
                                    You retain full access to your current {currentPlan?.name} features until{' '}
                                    <strong>{periodEnd}</strong>.
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                <span>
                                    No money is refunded for the current period, but starting {periodEnd}, you will be billed {selectedDowngradePlan.formatted_price} monthly.
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSelectedDowngradePlan(null)}
                                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                            >
                                Keep Current Plan
                            </button>
                            <button
                                type="submit"
                                disabled={isDowngrading}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                            >
                                {isDowngrading ? 'Scheduling...' : 'Confirm Downgrade'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
