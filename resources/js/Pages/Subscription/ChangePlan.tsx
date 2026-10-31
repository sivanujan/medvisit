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
    Lock,
    Users,
} from 'lucide-react';

interface ProrationPreview {
    is_upgrade: boolean;
    remaining_days: number;
    total_period_days: number;
    proration_cents: number;
    formatted_proration: string;
    effective_immediately: boolean;
}

interface ResourceItem {
    id: number;
    name: string;
    specialization?: string;
    email?: string;
    future_sessions_count?: number;
    future_tokens_count?: number;
}

interface PlanItem {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
    formatted_price: string;
    billing_interval: string;
    features: string[];
    limits?: Record<string, number>;
    what_changes?: string[];
    is_recommended?: boolean;
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
    activePromo?: {
        code: string;
        eligible_plans: string[];
    } | null;
    plans: PlanItem[];
    activeDoctors?: ResourceItem[];
    activeStaff?: ResourceItem[];
    activeTvs?: ResourceItem[];
    recommendedTier?: string;
}

export default function ChangePlan({
    tenant,
    currentPlan,
    pendingPlan,
    periodEnd,
    activePromo,
    plans,
    activeDoctors = [],
    activeStaff = [],
    activeTvs = [],
    recommendedTier,
}: ChangePlanProps) {
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanItem | null>(null);
    const [selectedDowngradePlan, setSelectedDowngradePlan] = useState<PlanItem | null>(null);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isDowngrading, setIsDowngrading] = useState(false);
    const [downgradeErrors, setDowngradeErrors] = useState<Record<string, string>>({});

    // Downgrade resource selections (to keep active up to the lower tier limit)
    const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
    const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
    const [selectedTvIds, setSelectedTvIds] = useState<number[]>([]);

    const openDowngradeModal = (plan: PlanItem) => {
        setSelectedDowngradePlan(plan);
        setDowngradeErrors({});
        const docLimit = plan.slug === 'basic' ? 3 : (plan.slug === 'pro' ? 8 : 999);
        const staffLimit = plan.slug === 'basic' ? 5 : (plan.slug === 'pro' ? 15 : 999);
        const tvLimit = plan.slug === 'basic' ? 1 : (plan.slug === 'pro' ? 3 : 999);

        // Always prioritize keeping doctors who have booked patient tokens
        const doctorsWithBookings = activeDoctors.filter((d) => (d.future_tokens_count || 0) > 0);
        const doctorsWithBookingsIds = doctorsWithBookings.map((d) => d.id);
        const remainingSlots = Math.max(0, docLimit - doctorsWithBookingsIds.length);
        const otherDoctors = activeDoctors.filter((d) => !doctorsWithBookingsIds.includes(d.id));

        const initialSelectedDoctors = [
            ...doctorsWithBookingsIds,
            ...otherDoctors.slice(0, remainingSlots).map((d) => d.id),
        ];

        setSelectedDoctorIds(initialSelectedDoctors.slice(0, docLimit));
        setSelectedStaffIds(activeStaff.slice(0, staffLimit).map((s) => s.id));
        setSelectedTvIds(activeTvs.slice(0, tvLimit).map((t) => t.id));
    };

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
        setDowngradeErrors({});
        router.post('/settings/billing/downgrade', {
            new_plan_id: selectedDowngradePlan.id,
            keep_active_doctor_ids: selectedDoctorIds,
            keep_active_staff_ids: selectedStaffIds,
            keep_active_tv_ids: selectedTvIds,
        }, {
            onSuccess: () => setSelectedDowngradePlan(null),
            onError: (errs) => setDowngradeErrors(errs),
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
                            <span>Secure card checkout</span>
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
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                {plan.name}
                                            </h3>
                                            {plan.is_recommended && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                    <Sparkles className="w-3 h-3" />
                                                    <span>Recommended</span>
                                                </span>
                                            )}
                                        </div>
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

                                    {/* What changes on this tier */}
                                    {plan.what_changes && plan.what_changes.length > 0 && (
                                        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                                            <p className="font-bold text-slate-700 dark:text-slate-300">What changes on this plan:</p>
                                            {plan.what_changes.map((change, i) => (
                                                <div key={i} className="flex items-start gap-1.5">
                                                    <span className="text-[#1E6FD9] font-bold">•</span>
                                                    <span>{change}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                            <span>Upgrade to {plan.name}</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openDowngradeModal(plan)}
                                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition cursor-pointer"
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

                        {/* Plan change breakdown */}
                        <div className="mt-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Current Plan:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {currentPlan?.name} ({currentPlan?.formatted_price})
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>New Plan:</span>
                                <span className="font-semibold text-[#1E6FD9] dark:text-blue-400">
                                    {selectedUpgradePlan.name} ({selectedUpgradePlan.formatted_price})
                                </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
                                <span className="text-slate-900 dark:text-white">Amount Due Today:</span>
                                <span className="text-[#1E6FD9] dark:text-blue-400 text-base">
                                    {selectedUpgradePlan.formatted_price}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <Clock className="w-4 h-4 text-[#1E6FD9] shrink-0 mt-0.5" />
                            <span>
                                Upgrade takes effect immediately upon payment. A new 1-month billing period begins today.
                            </span>
                        </div>

                        {activePromo && activePromo.eligible_plans && activePromo.eligible_plans.length > 0 && !activePromo.eligible_plans.includes(selectedUpgradePlan.slug) && (
                            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Promo notice:</strong> Your active promo code (<strong>{activePromo.code}</strong>) is not eligible for the {selectedUpgradePlan.name} plan and will end upon switching.
                                </span>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    required
                                    className="mt-0.5 w-4 h-4 rounded text-[#1E6FD9] border-slate-300 dark:border-slate-700"
                                />
                                <span>
                                    I agree to the Terms and Conditions and Refund Policy. My subscription is billed monthly in LKR. I will receive a reminder before each due date and can cancel anytime from the Billing page.
                                </span>
                            </label>
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
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E6FD9] hover:bg-[#1557b0] text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>{isUpgrading ? 'Redirecting to checkout...' : `Pay ${selectedUpgradePlan.formatted_price}`}</span>
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

                            {activePromo && activePromo.eligible_plans && activePromo.eligible_plans.length > 0 && !activePromo.eligible_plans.includes(selectedDowngradePlan.slug) && (
                                <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Promo notice:</strong> Your active promo code (<strong>{activePromo.code}</strong>) is not eligible for the {selectedDowngradePlan.name} plan and will end upon switching.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Active Doctors selection if over limit */}
                        {(() => {
                            const docLimit = selectedDowngradePlan.slug === 'basic' ? 3 : (selectedDowngradePlan.slug === 'pro' ? 8 : 999);
                            if (activeDoctors.length <= docLimit) return null;

                            const doctorsWithBookings = activeDoctors.filter((d) => (d.future_tokens_count || 0) > 0);
                            const hasExcessBookedDoctors = doctorsWithBookings.length > docLimit;

                            return (
                                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-left">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-xs text-amber-900 dark:text-amber-200">
                                            Select up to {docLimit} active doctors (currently {activeDoctors.length}):
                                        </p>
                                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                            {selectedDoctorIds.length}/{docLimit} selected
                                        </span>
                                    </div>

                                    {hasExcessBookedDoctors && (
                                        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                            <div>
                                                <p className="font-bold">Cannot downgrade yet: {doctorsWithBookings.length} doctors have upcoming booked appointments</p>
                                                <p className="mt-0.5 text-[11px]">
                                                    The {selectedDowngradePlan.name} tier permits up to {docLimit} active doctors. You must cancel or move booked appointments for at least {doctorsWithBookings.length - docLimit} doctor(s) via the <Link href="/calendar" className="underline font-semibold hover:text-rose-950 dark:hover:text-white">Channeling Calendar</Link> before deactivating them.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                        {activeDoctors.map((doc) => {
                                            const checked = selectedDoctorIds.includes(doc.id);
                                            const hasBookedTokens = (doc.future_tokens_count || 0) > 0;
                                            const sessionsCount = doc.future_sessions_count || 0;
                                            const tokensCount = doc.future_tokens_count || 0;

                                            return (
                                                <div
                                                    key={doc.id}
                                                    className={`p-2.5 rounded-lg border text-xs transition ${
                                                        hasBookedTokens
                                                            ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/5'
                                                            : 'bg-white dark:bg-slate-800 border-slate-200/60 dark:border-white/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                                                    {doc.name}
                                                                </span>
                                                                {doc.specialization && (
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                        ({doc.specialization})
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Session & Booking details */}
                                                            <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px]">
                                                                {hasBookedTokens ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold">
                                                                        <Users className="w-3 h-3" />
                                                                        {tokensCount} booked patient{tokensCount === 1 ? '' : 's'} across {sessionsCount} session{sessionsCount === 1 ? '' : 's'}
                                                                    </span>
                                                                ) : sessionsCount > 0 ? (
                                                                    <span className="text-slate-600 dark:text-slate-400">
                                                                        {sessionsCount} upcoming session{sessionsCount === 1 ? '' : 's'} (0 booked tokens)
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 dark:text-slate-500">
                                                                        No upcoming sessions
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="shrink-0 flex items-center gap-1.5">
                                                            {hasBookedTokens ? (
                                                                <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>Active</span>
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            if (selectedDoctorIds.length < docLimit) {
                                                                                setSelectedDoctorIds([...selectedDoctorIds, doc.id]);
                                                                            }
                                                                        } else {
                                                                            setSelectedDoctorIds(selectedDoctorIds.filter((id) => id !== doc.id));
                                                                        }
                                                                    }}
                                                                    disabled={!checked && selectedDoctorIds.length >= docLimit}
                                                                    className="rounded text-[#1E6FD9] border-slate-300 dark:border-slate-600 cursor-pointer"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {hasBookedTokens && (
                                                        <p className="mt-1 text-[10px] text-amber-800 dark:text-amber-300/90 italic">
                                                            Cannot be deactivated while patients have booked appointments. Cancel or reschedule their sessions first.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {downgradeErrors?.keep_active_doctor_ids && (
                                        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
                                            {downgradeErrors.keep_active_doctor_ids}
                                        </p>
                                    )}

                                    <p className="text-[10px] text-amber-700 dark:text-amber-300/80">
                                        Doctors not kept will become inactive upon plan renewal. Any empty future sessions will be cancelled. Past patient records, prescriptions, and billing history are permanently kept.
                                    </p>
                                </div>
                            );
                        })()}

                        {/* Active Staff selection if over limit */}
                        {(() => {
                            const staffLimit = selectedDowngradePlan.slug === 'basic' ? 5 : (selectedDowngradePlan.slug === 'pro' ? 15 : 999);
                            if (activeStaff.length <= staffLimit) return null;

                            return (
                                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-left">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-xs text-amber-900 dark:text-amber-200">
                                            Select up to {staffLimit} staff members (currently {activeStaff.length}):
                                        </p>
                                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                            {selectedStaffIds.length}/{staffLimit} selected
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {activeStaff.map((staff) => {
                                            const checked = selectedStaffIds.includes(staff.id);
                                            return (
                                                <label key={staff.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 text-xs cursor-pointer border border-slate-200/60 dark:border-white/10">
                                                    <span className="font-medium text-slate-900 dark:text-white truncate">
                                                        {staff.name} ({staff.email})
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                if (selectedStaffIds.length < staffLimit) {
                                                                    setSelectedStaffIds([...selectedStaffIds, staff.id]);
                                                                }
                                                            } else {
                                                                setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staff.id));
                                                            }
                                                        }}
                                                        disabled={!checked && selectedStaffIds.length >= staffLimit}
                                                        className="rounded text-[#1E6FD9] border-slate-300 dark:border-slate-600"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Active TV selection if over limit */}
                        {(() => {
                            const tvLimit = selectedDowngradePlan.slug === 'basic' ? 1 : (selectedDowngradePlan.slug === 'pro' ? 3 : 999);
                            if (activeTvs.length <= tvLimit) return null;

                            return (
                                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-left">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-xs text-amber-900 dark:text-amber-200">
                                            Select up to {tvLimit} TV screen(s) (currently {activeTvs.length}):
                                        </p>
                                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                            {selectedTvIds.length}/{tvLimit} selected
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {activeTvs.map((tv) => {
                                            const checked = selectedTvIds.includes(tv.id);
                                            return (
                                                <label key={tv.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 text-xs cursor-pointer border border-slate-200/60 dark:border-white/10">
                                                    <span className="font-medium text-slate-900 dark:text-white truncate">
                                                        {tv.name}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                if (selectedTvIds.length < tvLimit) {
                                                                    setSelectedTvIds([...selectedTvIds, tv.id]);
                                                                }
                                                            } else {
                                                                setSelectedTvIds(selectedTvIds.filter((id) => id !== tv.id));
                                                            }
                                                        }}
                                                        disabled={!checked && selectedTvIds.length >= tvLimit}
                                                        className="rounded text-[#1E6FD9] border-slate-300 dark:border-slate-600"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

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
                                disabled={
                                    isDowngrading ||
                                    (activeDoctors.filter((d) => (d.future_tokens_count || 0) > 0).length >
                                        (selectedDowngradePlan.slug === 'basic' ? 3 : (selectedDowngradePlan.slug === 'pro' ? 8 : 999))) ||
                                    selectedDoctorIds.length === 0
                                }
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
