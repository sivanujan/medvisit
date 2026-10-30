import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    ShieldCheck,
    ArrowRight,
    Loader2,
    AlertCircle,
    LogOut,
    Check,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Receipt,
    RefreshCw,
    Info,
    Tag,
} from 'lucide-react';
import LegalFooter from '@/Components/Public/LegalFooter';
import { getCentralUrl as resolveCentralUrl } from '@/Utils/centralUrl';
import { PageProps } from '@/types';
import '@/Components/Registration/registration.css';

interface PlanOption {
    id: string;
    name: string;
    price: number;
    price_formatted: string;
    price_cents: number;
    interval: string;
    target: string;
    badge?: string | null;
    description: string;
    features?: string[];
}

interface SubscriptionInfo {
    id: number;
    status: string;
    is_active: boolean;
    is_comp: boolean;
    is_trialing: boolean;
    trial_ends_at?: string;
    current_period_end?: string;
    plan_slug?: string;
}

interface Props {
    tenant: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        logo_url?: string | null;
    };
    subscription?: SubscriptionInfo | null;
    plans: PlanOption[];
    sharedFeatures: string[];
    defaultPlanSlug?: string;
    currency: string;
    currencySymbol: string;
    renewsOn: string;
    statusParam?: string | null;
}

export default function Subscribe({
    tenant,
    subscription,
    plans = [],
    sharedFeatures = [],
    defaultPlanSlug = 'pro',
    currency = 'LKR',
    currencySymbol = 'Rs.',
    renewsOn,
    statusParam,
}: Props) {
    // Default to 'pro' if available
    const initialPlanId = defaultPlanSlug && plans.some((p) => p.id === defaultPlanSlug)
        ? defaultPlanSlug
        : plans.find((p) => p.id === 'pro')?.id || plans[0]?.id || 'pro';

    const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);
    const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

    // Promo code state
    const [promoInputOpen, setPromoInputOpen] = useState(false);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [appliedPromo, setAppliedPromo] = useState<{
        code: string;
        discount_cents: number;
        final_amount_cents: number;
        discount_formatted: string;
        final_formatted: string;
        summary_text: string;
        renewal_text: string;
    } | null>(null);

    const { flash, tenant: tenantProp } = usePage<PageProps>().props;

    const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || {
        id: 'pro',
        name: 'Pro',
        price: 9000,
        price_formatted: 'Rs. 9,000',
        price_cents: 900000,
        interval: 'per month',
        target: 'per clinic',
        badge: 'Most popular',
        description: 'Comprehensive OPD channeling, queue management, and electronic prescriptions.',
        features: [],
    };

    // Auto re-validate promo code when plan changes
    useEffect(() => {
        if (appliedPromo) {
            handleApplyPromo(appliedPromo.code, selectedPlan.id);
        }
    }, [selectedPlanId]);

    const handleApplyPromo = async (codeToApply?: string, planSlugOverride?: string) => {
        const code = (codeToApply || promoCodeInput).trim().toUpperCase();
        if (!code) {
            setPromoError('Please enter a promo code.');
            return;
        }

        setApplyingPromo(true);
        setPromoError(null);

        const planSlug = planSlugOverride || selectedPlan?.id || (selectedPlan as any)?.slug || 'pro';

        // Same-origin relative endpoint always works across both central preview and tenant domains
        let endpoint = '/subscription/validate-promo';
        if (typeof window !== 'undefined' && window.location.pathname.includes('/dev/preview')) {
            endpoint = '/dev/preview/validate-promo';
        }

        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    code,
                    plan_slug: planSlug,
                }),
            });

            if (res.redirected) {
                setPromoError('Session or gateway redirect encountered. Please try again.');
                setAppliedPromo(null);
                setApplyingPromo(false);
                return;
            }

            let data: any = null;
            try {
                const text = await res.text();
                data = JSON.parse(text);
            } catch {
                data = null;
            }

            if (!res.ok || !data || !data.code || typeof data.discount_cents === 'undefined') {
                const errMsg =
                    data?.message ||
                    data?.errors?.code?.[0] ||
                    data?.errors?.plan_slug?.[0] ||
                    'Invalid promo code. Please check and try again.';
                setPromoError(errMsg);
                setAppliedPromo(null);
                setApplyingPromo(false);
                return;
            }

            setAppliedPromo({
                code: String(data.code),
                discount_cents: Number(data.discount_cents),
                final_amount_cents: Number(data.final_amount_cents),
                discount_formatted: String(data.discount_formatted || 'Rs. 0.00'),
                final_formatted: String(data.final_formatted || selectedPlan.price_formatted),
                summary_text: String(data.summary_text || ''),
                renewal_text: String(data.renewal_text || ''),
            });
            setPromoError(null);
            setApplyingPromo(false);
        } catch (err: any) {
            setPromoError(err?.message || 'Network error validating promo code.');
            setAppliedPromo(null);
            setApplyingPromo(false);
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCodeInput('');
        setPromoError(null);
    };

    const baseCentralDomain = tenantProp?.base_domain || 'medvisit.lk';
    const getCentralUrl = (path: string) => resolveCentralUrl(path, baseCentralDomain);

    const handleCheckout = (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) {
            setClientError('Tick the box above to continue.');
            return;
        }

        setIsSubmitting(true);
        setClientError(null);

        router.post(
            route('tenant.subscription.checkout'),
            {
                terms_accepted: true,
                plan_slug: selectedPlan.id,
                promo_code: appliedPromo?.code || undefined,
            },
            {
                onError: (errors) => {
                    setIsSubmitting(false);
                    const firstErr = Object.values(errors)[0];
                    if (firstErr) {
                        setClientError(String(firstErr));
                    }
                },
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('tenant.logout'));
    };

    // Return status banners
    const isCancelled = statusParam === 'cancelled' || statusParam === 'cancel';
    const isFailed = statusParam === 'failed';
    const errorMessage = clientError || flash?.error;

    // Initial clinic letter
    const clinicInitial = tenant.name ? tenant.name.charAt(0).toUpperCase() : 'M';

    // On mobile, order cards with Pro first
    const mobileOrderedPlans = [...plans].sort((a, b) => {
        if (a.id === 'pro') return -1;
        if (b.id === 'pro') return 1;
        return 0;
    });

    return (
        <div className="reg-root min-h-[100dvh] flex flex-col justify-between selection:bg-primary-100 selection:text-primary-800 antialiased overflow-x-hidden font-sans">
            <Head title="Choose your plan — MedVisit" />

            {/* Dotted grid + radial glow backdrop */}
            <div className="reg-backdrop fixed inset-0 pointer-events-none -z-10" aria-hidden="true" />

            {/* Clinic App Header Style */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    {tenant.logo_url ? (
                        <img
                            src={tenant.logo_url}
                            alt={tenant.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-[#0E9E8F] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {clinicInitial}
                        </div>
                    )}

                    <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate block">
                            {tenant.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                            Clinic Portal
                        </span>
                    </div>

                    <div className="hidden sm:inline-flex items-center gap-1.5 ml-3 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300 border border-primary/20">
                        <span>Step 2 of 2 · Activate</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <form onSubmit={handleLogout}>
                        <button
                            type="submit"
                            className="h-9 px-3.5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign out</span>
                        </button>
                    </form>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Heading & Subtext */}
                <div className="max-w-2xl mb-8 sm:mb-10 space-y-2">
                    <div className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-1">
                        <span>Step 2 of 2 · Activate</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Choose your plan
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                        Monthly, per clinic, billed in Sri Lankan Rupees. Cancel anytime from Billing.
                    </p>
                </div>

                {/* Return State Banners */}
                {isCancelled && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <span className="font-medium">
                            Payment cancelled — you can try again anytime.
                        </span>
                    </motion.div>
                )}

                {isFailed && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        <span className="font-medium">
                            Payment didn't go through. No money was taken. Try again or use another card.
                        </span>
                    </motion.div>
                )}

                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        <span className="font-medium">{errorMessage}</span>
                    </motion.div>
                )}

                {/* Split Layout: Left Plans (~60%), Right Sticky Order Summary (~40%) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: 3 Selectable Plan Cards */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Plan Cards Grid: stacked on mobile (Pro first), 3 side-by-side or stacked cleanly */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-4">
                            {(typeof window !== 'undefined' && window.innerWidth < 640
                                ? mobileOrderedPlans
                                : plans
                            ).map((plan) => {
                                const isSelected = selectedPlanId === plan.id;
                                const isPro = plan.id === 'pro';

                                return (
                                    <div
                                        key={plan.id}
                                        role="radio"
                                        aria-checked={isSelected}
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedPlanId(plan.id);
                                            setClientError(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === ' ' || e.key === 'Enter') {
                                                e.preventDefault();
                                                setSelectedPlanId(plan.id);
                                                setClientError(null);
                                            }
                                        }}
                                        className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between select-none ${
                                            isSelected
                                                ? 'bg-white/95 dark:bg-slate-900/90 border-2 border-primary shadow-xl shadow-primary/15 -translate-y-1'
                                                : 'bg-white/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/90 dark:hover:bg-slate-900/80 shadow-md'
                                        }`}
                                    >
                                        {/* Ribbon for Pro */}
                                        {plan.badge && (
                                            <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-primary to-[#0E9E8F] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                <span>{plan.badge}</span>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-center justify-between pb-3">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                                    {plan.name}
                                                </h3>
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                                        isSelected
                                                            ? 'bg-primary text-white scale-105 shadow-xs'
                                                            : 'border-2 border-slate-300 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="my-2">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                        {plan.price_formatted}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        / month
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                                    per clinic
                                                </p>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5">
                                                {plan.description}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                            <span
                                                className={`font-semibold ${
                                                    isSelected
                                                        ? 'text-primary'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {isSelected ? 'Selected plan' : 'Select plan'}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                Billed monthly
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Included in Every Plan Section (Shared features listed once) */}
                        <div className="p-6 sm:p-7 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                                <Sparkles className="w-4 h-4" />
                                <span>Included in every plan</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                {sharedFeatures.map((feat, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </div>
                                        <span className="leading-snug">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sticky Order Summary Card */}
                    <div className="lg:col-span-5 sticky top-20">
                        <div className="rounded-3xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                                    Order summary
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Activate your clinic workspace immediately.
                                </p>
                            </div>

                            {/* Summary Rows */}
                            <div className="space-y-3.5 text-xs sm:text-sm border-y border-slate-200/80 dark:border-white/10 py-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400">Selected plan</span>
                                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>{selectedPlan.name} Plan</span>
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            Monthly
                                        </span>
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400">Billing currency</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        Sri Lankan Rupee (LKR)
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400">Next renewal</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {renewsOn}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pt-1 text-[11px]">
                                    <span className="text-slate-400 dark:text-slate-500">Invoice number</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-mono italic">
                                        Issued after payment
                                    </span>
                                </div>
                            </div>

                            {/* Promo Code Section */}
                            <div className="space-y-2">
                                {!appliedPromo ? (
                                    <>
                                        {!promoInputOpen ? (
                                            <button
                                                type="button"
                                                onClick={() => setPromoInputOpen(true)}
                                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Tag className="w-3.5 h-3.5" />
                                                <span>Have a promo code?</span>
                                            </button>
                                        ) : (
                                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={promoCodeInput}
                                                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                                                        placeholder="Enter promo code"
                                                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold uppercase text-slate-900 dark:text-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={applyingPromo || !promoCodeInput.trim()}
                                                        onClick={() => handleApplyPromo()}
                                                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {applyingPromo ? 'Checking...' : 'Apply'}
                                                    </button>
                                                </div>
                                                {promoError && (
                                                    <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{promoError}</span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                                        {appliedPromo.code}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                                                        {appliedPromo.summary_text}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {appliedPromo.renewal_text}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemovePromo}
                                            className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Total Due Today (Animated roll on switch) */}
                            <div className="space-y-1 pt-1 border-t border-slate-200/80 dark:border-white/10">
                                {appliedPromo && (
                                    <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
                                        <span>Plan price</span>
                                        <span className="line-through">{selectedPlan.price_formatted}</span>
                                    </div>
                                )}
                                {appliedPromo && (
                                    <div className="flex justify-between items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 pb-1">
                                        <span>Discount ({appliedPromo.code})</span>
                                        <span>- {appliedPromo.discount_formatted}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                        Total due today
                                    </span>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={(selectedPlan?.id || (selectedPlan as any)?.slug || 'pro') + (appliedPromo?.final_formatted || '')}
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 6 }}
                                            transition={{ duration: 0.15 }}
                                            className="text-3xl font-extrabold text-primary dark:text-primary-400 tracking-tight"
                                        >
                                            {appliedPromo?.final_formatted || selectedPlan?.price_formatted || 'Rs. 9,000.00'}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>

                                {appliedPromo && (
                                    <p className="text-[11px] text-slate-500 text-right">
                                        Renews at {selectedPlan?.price_formatted || 'Rs. 9,000.00'}/mo ({appliedPromo.renewal_text})
                                    </p>
                                )}
                            </div>

                            {/* Checkout Form */}
                            <form onSubmit={handleCheckout} className="space-y-4">
                                {/* Recurring consent checkbox with exact required legal text */}
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            id="terms_consent_checkbox"
                                            checked={termsAccepted}
                                            onChange={(e) => {
                                                setTermsAccepted(e.target.checked);
                                                if (e.target.checked) setClientError(null);
                                            }}
                                            className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary/20 shrink-0 cursor-pointer w-4 h-4"
                                            required
                                        />
                                        <span className="leading-relaxed">
                                            I agree to the{' '}
                                            <a
                                                href={getCentralUrl('/terms')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline font-bold"
                                            >
                                                Terms and Conditions
                                            </a>{' '}
                                            and{' '}
                                            <a
                                                href={getCentralUrl('/refund-policy')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline font-bold"
                                            >
                                                Refund Policy
                                            </a>
                                            . My subscription is billed monthly in LKR. I will receive a reminder before each due date and can cancel anytime from the Billing page.
                                        </span>
                                    </label>
                                </div>

                                {/* Pay / Activate Button */}
                                <div className="space-y-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !termsAccepted}
                                        className={`group relative w-full h-12 sm:h-12.5 px-6 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 ${
                                            termsAccepted && !isSubmitting
                                                ? appliedPromo && appliedPromo.final_amount_cents === 0
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_16px_rgba(14,158,143,0.35)] cursor-pointer border border-emerald-500/50'
                                                    : 'bg-primary hover:bg-primary-600 text-white shadow-[0_4px_16px_rgba(30,111,217,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(30,111,217,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-primary-500/50'
                                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/80 dark:border-slate-700/60 shadow-xs'
                                        }`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                <span>Processing...</span>
                                            </>
                                        ) : appliedPromo && appliedPromo.final_amount_cents === 0 ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Activate Clinic Workspace (Free)</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Pay {appliedPromo?.final_formatted || selectedPlan?.price_formatted || 'Rs. 9,000.00'} securely</span>
                                                <ArrowRight className={`w-4 h-4 ${termsAccepted ? 'transition-transform group-hover:translate-x-1' : ''}`} />
                                            </>
                                        )}
                                    </button>

                                    {!termsAccepted && (
                                        <p className="text-center text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                            Tick the box above to continue
                                        </p>
                                    )}
                                </div>
                            </form>

                            {/* Trust Badge & Card Chips */}
                            <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        Secure payment by Payments.lk
                                    </span>
                                    {/* Text-only card chips */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                                            VISA
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                                            MASTERCARD
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>We never see or store your card details. Hosted on certified PCI-DSS checkout.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Legal Footer */}
            <LegalFooter className="border-t border-slate-200/80 dark:border-slate-800" isTenantContext={true} />
        </div>
    );
}
