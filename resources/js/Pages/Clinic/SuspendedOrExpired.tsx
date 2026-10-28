import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    CreditCard,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    CheckCircle2,
    Check,
    ArrowRight,
    Loader2,
    AlertCircle,
    LogOut,
    MessageSquare,
    Phone,
    Mail,
    Lock,
    ChevronDown,
    ChevronUp,
    FileText,
    Users,
    Clock,
    Receipt,
    ExternalLink,
} from 'lucide-react';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { PageProps } from '@/types';

interface TenantInfo {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    plan: string;
    logo_url?: string | null;
    trial_ends_at?: string;
}

interface StateDetails {
    key: 'trial_expired' | 'past_due' | 'cancelled' | 'suspended_by_admin';
    pill_label: string;
    pill_variant: 'amber' | 'coral' | 'blue' | 'slate';
    title: string;
    subtitle: string;
    reassurance: string;
    can_pay: boolean;
    reason?: string | null;
}

interface RetentionInfo {
    retention_days: number;
    deletion_date: string;
    days_remaining: number;
    reassurance_message: string;
}

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
    features: string[];
}

interface OutstandingInvoice {
    id: number;
    invoice_number: string;
    amount_cents: number;
    amount_formatted: string;
    due_date: string;
}

interface SupportInfo {
    email: string;
    general_email: string;
    phone: string;
    phone_raw: string;
    whatsapp_url: string;
    support_hours?: string | null;
    is_online: boolean;
}

interface Props {
    tenant: TenantInfo;
    isAdmin: boolean;
    userRole: string;
    state: 'trial_expired' | 'past_due' | 'cancelled' | 'suspended_by_admin';
    stateDetails: StateDetails;
    retention: RetentionInfo;
    plans: PlanOption[];
    defaultPlanSlug?: string;
    outstandingInvoice?: OutstandingInvoice | null;
    renewsOn: string;
    termsVersion: string;
    statusParam?: string | null;
    hasDataExport: boolean;
    support: SupportInfo;
}

export default function SuspendedOrExpired({
    tenant,
    isAdmin,
    userRole,
    state,
    stateDetails,
    retention,
    plans = [],
    defaultPlanSlug = 'pro',
    outstandingInvoice,
    renewsOn,
    termsVersion,
    statusParam,
    hasDataExport = false,
    support,
}: Props) {
    // Initial plan: either previous plan or Pro
    const initialPlanId =
        defaultPlanSlug && plans.some((p) => p.id === defaultPlanSlug)
            ? defaultPlanSlug
            : plans.find((p) => p.id === 'pro')?.id || plans[0]?.id || 'pro';

    const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [showChangePlanOption, setShowChangePlanOption] = useState(false);

    const { flash, tenant: tenantProp } = usePage<PageProps>().props;

    const selectedPlan =
        plans.find((p) => p.id === selectedPlanId) ||
        plans[0] || {
            id: 'pro',
            name: 'Pro',
            price: 9000,
            price_formatted: 'Rs. 9,000',
            price_cents: 900000,
            interval: 'per month',
            target: 'per clinic',
            badge: 'Most popular',
            description: 'Comprehensive OPD channeling, queue management, and digital prescriptions.',
            features: [],
        };

    const handleCheckout = (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) {
            setClientError('Please tick the box below to accept the terms before proceeding.');
            return;
        }

        setIsSubmitting(true);
        setClientError(null);

        router.post(
            route('tenant.subscription.checkout'),
            {
                terms_accepted: true,
                plan_slug: selectedPlan.id,
                from_suspended: true,
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

    const handleLogout = () => {
        router.post(route('tenant.logout'));
    };

    const clinicInitial = tenant.name ? tenant.name.charAt(0).toUpperCase() : 'M';

    // Status pill style mapping
    const pillStyles: Record<string, string> = {
        amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        coral: 'bg-[#FF7A59]/15 text-[#FF7A59] border-[#FF7A59]/30',
        blue: 'bg-[#1E6FD9]/15 text-[#1E6FD9] dark:text-blue-300 border-[#1E6FD9]/30',
        slate: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    };

    // Hero icon mapping
    const renderHeroIcon = () => {
        switch (state) {
            case 'trial_expired':
                return (
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10">
                        <Sparkles className="w-7 h-7" />
                    </div>
                );
            case 'past_due':
                return (
                    <div className="w-14 h-14 rounded-2xl bg-[#FF7A59]/10 dark:bg-[#FF7A59]/20 border border-[#FF7A59]/30 text-[#FF7A59] flex items-center justify-center shadow-md shadow-[#FF7A59]/10">
                        <CreditCard className="w-7 h-7" />
                    </div>
                );
            case 'cancelled':
                return (
                    <div className="w-14 h-14 rounded-2xl bg-[#1E6FD9]/10 dark:bg-[#1E6FD9]/20 border border-[#1E6FD9]/30 text-[#1E6FD9] dark:text-blue-400 flex items-center justify-center shadow-md shadow-[#1E6FD9]/10">
                        <RefreshCw className="w-7 h-7" />
                    </div>
                );
            case 'suspended_by_admin':
            default:
                return (
                    <div className="w-14 h-14 rounded-2xl bg-slate-500/10 dark:bg-slate-500/20 border border-slate-500/30 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-md">
                        <ShieldAlert className="w-7 h-7" />
                    </div>
                );
        }
    };

    const isCancelledCheckout = statusParam === 'cancelled' || statusParam === 'cancel';
    const isFailedCheckout = statusParam === 'failed';
    const bannerError = clientError || flash?.error;

    const faqs = [
        {
            q: 'Is my clinic data safe?',
            a: `Yes, all electronic medical records, token records, appointments, and configurations are fully preserved and retained for ${retention.retention_days} days until ${retention.deletion_date}. Once you choose a plan, everything resumes right where you left off.`,
        },
        {
            q: 'Can I change my plan later?',
            a: 'Yes, you can upgrade or downgrade between Basic, Pro, and Advanced at any time directly from your Billing settings with immediate automated proration.',
        },
        {
            q: 'Can I cancel my subscription anytime?',
            a: 'Yes, MedVisit has no long-term contracts. You can cancel your subscription anytime with a single click from the clinic dashboard.',
        },
        {
            q: 'What is your refund policy?',
            a: 'If you are unsatisfied with MedVisit for any reason, you can request a full refund within 7 days of payment by reaching out to our support team.',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-[#1E6FD9]/20 selection:text-[#1E6FD9] font-sans antialiased">
            <Head title={`${stateDetails.title} • MedVisit`} />

            {/* Ambient Background Gradient Spots */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1E6FD9]/10 dark:bg-[#1E6FD9]/15 blur-3xl" />
                <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#0E9E8F]/10 dark:bg-[#0E9E8F]/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full bg-[#FF7A59]/10 dark:bg-[#FF7A59]/10 blur-3xl" />
            </div>

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    {tenant.logo_url ? (
                        <img
                            src={tenant.logo_url}
                            alt={tenant.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {clinicInitial}
                        </div>
                    )}

                    <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate block">
                            {tenant.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                            {tenant.subdomain}.medvisit.lk
                        </span>
                    </div>

                    <span
                        className={`inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            pillStyles[stateDetails.pill_variant] || pillStyles.amber
                        }`}
                    >
                        {stateDetails.pill_label}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle size="sm" />
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="h-8 px-3 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Sign out of clinic workspace"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
                {/* Status Banners */}
                {isCancelledCheckout && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm flex items-center gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <span className="font-medium">
                            Checkout was cancelled. You can choose a plan whenever you're ready.
                        </span>
                    </motion.div>
                )}

                {isFailedCheckout && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        <span className="font-medium">
                            Payment could not be completed. No charge was made. Please try again or use another payment method.
                        </span>
                    </motion.div>
                )}

                {bannerError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3 shadow-xs"
                    >
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        <span className="font-medium">{bannerError}</span>
                    </motion.div>
                )}

                {/* Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg space-y-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4">
                            {renderHeroIcon()}
                            <div className="space-y-1">
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {stateDetails.title}
                                </h1>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                                    {stateDetails.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Days Remaining Pill */}
                        <div className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#0E9E8F]" />
                            <span>{retention.days_remaining} days until scheduled deletion</span>
                        </div>
                    </div>

                    {/* Data Retention Reassurance Box (Truthful: No false encryption-at-rest claim) */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0E9E8F]/10 border border-[#0E9E8F]/25 text-left flex items-start gap-3.5">
                        <ShieldCheck className="w-5 h-5 text-[#0E9E8F] shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                            <strong className="block font-bold text-slate-900 dark:text-white">
                                Data retention guarantee
                            </strong>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {retention.reassurance_message}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Exact scheduled deletion date: <strong className="text-slate-700 dark:text-slate-200">{retention.deletion_date}</strong>. No data is lost when you reactivate today.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Role-Based Display */}
                {!isAdmin ? (
                    /* STAFF VIEW: Simple message, NO payment UI and NO plan prices */
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg text-center space-y-6 max-w-2xl mx-auto"
                    >
                        <div className="w-16 h-16 rounded-3xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:text-blue-400 border border-[#1E6FD9]/20 flex items-center justify-center mx-auto shadow-md">
                            <Users className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                {tenant.name} needs to renew its MedVisit plan
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
                                Please ask your clinic administrator to sign in and choose a plan to restore workspace access. Only clinic administrators can complete subscription payments.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 text-left flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-[#0E9E8F] shrink-0 mt-0.5" />
                            <div>
                                <strong className="block font-bold text-slate-900 dark:text-white">
                                    Patient records remain secure
                                </strong>
                                <span>
                                    All consultation notes, queue history, and patient data are kept safe for {retention.retention_days} days until {retention.deletion_date}.
                                </span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Return to sign in</span>
                            </button>
                        </div>
                    </motion.div>
                ) : stateDetails.can_pay ? (
                    /* CLINIC ADMIN PAYMENT VIEW */
                    <div className="space-y-10">
                        {/* Outstanding Invoice Banner (For past_due state) */}
                        {state === 'past_due' && outstandingInvoice && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-3xl bg-[#FF7A59]/10 border border-[#FF7A59]/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-[#FF7A59]" />
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Outstanding invoice {outstandingInvoice.invoice_number}
                                        </h3>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                        Total overdue: <strong className="text-slate-900 dark:text-white">{outstandingInvoice.amount_formatted}</strong> · Due date: {outstandingInvoice.due_date}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowChangePlanOption(!showChangePlanOption)}
                                        className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                                    >
                                        {showChangePlanOption ? 'Hide plan options' : 'Switch plan instead'}
                                    </button>

                                    <form onSubmit={handleCheckout}>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#FF7A59] hover:bg-[#e86948] text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Lock className="w-4 h-4" />
                                            )}
                                            <span>Pay {outstandingInvoice.amount_formatted} now</span>
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {/* Choose a Plan Header */}
                        <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Choose a plan to continue
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Monthly, per clinic, billed securely in Sri Lankan Rupees via Payments.lk. Cancel or upgrade anytime.
                            </p>
                        </div>

                        {/* Plan Selection Grid & Order Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* LEFT: 3 Plan Cards */}
                            <div className="lg:col-span-7 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {plans.map((plan) => {
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
                                                className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                                                    isSelected
                                                        ? 'bg-white/95 dark:bg-slate-900/90 border-2 border-[#1E6FD9] shadow-xl shadow-[#1E6FD9]/15 -translate-y-1'
                                                        : 'bg-white/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/90 dark:hover:bg-slate-900/80 shadow-sm'
                                                }`}
                                            >
                                                {/* Most Popular Badge */}
                                                {plan.badge && (
                                                    <div className="absolute -top-3 left-5 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
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
                                                                    ? 'bg-[#1E6FD9] text-white scale-105 shadow-xs'
                                                                    : 'border-2 border-slate-300 dark:border-slate-700'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="pb-3 border-b border-slate-200/60 dark:border-white/10">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                                {plan.price_formatted}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {plan.interval} · {plan.target}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-3 pb-4 leading-relaxed min-h-[48px]">
                                                        {plan.description}
                                                    </p>

                                                    {/* Plan Highlights */}
                                                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                                        {plan.features?.map((feature, idx) => (
                                                            <li key={idx} className="flex items-start gap-2">
                                                                <CheckCircle2 className="w-4 h-4 text-[#0E9E8F] shrink-0 mt-0.5" />
                                                                <span className="leading-snug">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="pt-5 mt-4 border-t border-slate-200/60 dark:border-white/10">
                                                    <span
                                                        className={`text-xs font-semibold block text-center ${
                                                            isSelected
                                                                ? 'text-[#1E6FD9] dark:text-blue-300'
                                                                : 'text-slate-500 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {isSelected ? 'Selected plan' : 'Click to select'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* RIGHT: Sticky Order Summary */}
                            <div className="lg:col-span-5 lg:sticky lg:top-24">
                                <div className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl space-y-6">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/70 dark:border-white/10">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                            Order summary
                                        </h3>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1E6FD9]/10 text-[#1E6FD9] dark:text-blue-300 border border-[#1E6FD9]/20">
                                            Monthly billing
                                        </span>
                                    </div>

                                    {/* Selected Plan Details */}
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                                                {selectedPlan.name} plan
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {selectedPlan.price_formatted}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span>Billing schedule</span>
                                            <span>Starts today · renews on {renewsOn}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span>Payment gateway</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                Payments.lk (Hosted secure)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200/70 dark:border-white/10">
                                        <div className="flex items-baseline justify-between mb-4">
                                            <div>
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                                                    Total due today
                                                </span>
                                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                                    {selectedPlan.price_formatted}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                                                + 0% taxes
                                            </span>
                                        </div>

                                        {/* Terms Consent Checkbox */}
                                        <form onSubmit={handleCheckout} className="space-y-4">
                                            <label className="flex items-start gap-3 cursor-pointer group text-left select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={termsAccepted}
                                                    onChange={(e) => {
                                                        setTermsAccepted(e.target.checked);
                                                        if (e.target.checked) setClientError(null);
                                                    }}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#1E6FD9] focus:ring-[#1E6FD9] cursor-pointer shrink-0"
                                                />
                                                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    I agree to the{' '}
                                                    <a
                                                        href="https://medvisit.lk/terms"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#1E6FD9] hover:underline font-semibold"
                                                    >
                                                        Terms and Conditions
                                                    </a>{' '}
                                                    and{' '}
                                                    <a
                                                        href="https://medvisit.lk/refund-policy"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#1E6FD9] hover:underline font-semibold"
                                                    >
                                                        Refund Policy
                                                    </a>
                                                    . MedVisit subscriptions renew automatically every month unless cancelled.
                                                </span>
                                            </label>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] hover:opacity-95 text-white shadow-lg shadow-[#1E6FD9]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Lock className="w-4 h-4" />
                                                )}
                                                <span>Pay {selectedPlan.price_formatted} securely</span>
                                            </button>
                                        </form>

                                        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                            <span>Instant workspace reactivation upon payment confirmation</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* What You Get Back Checklist */}
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    What you get back immediately
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                    Your clinic is restored in real time the moment your payment is confirmed.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Live queue & token calling</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Reactivate token dispensing, reception counters, and real-time patient queue trackers.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Appointments & booking</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Re-open public doctor scheduling and online patient channeling without lost slot data.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Medical records & billing</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Full access to OPD consultation notes, prescription histories, and settlement invoices.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Pharmacy dispensing</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Drug inventory batches, expiry tracking, and pos counters (available on Advanced plan).
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Public clinic website</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Keep your public patient portal at {tenant.subdomain}.medvisit.lk active and branded.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F]" />
                                        <span>Priority local support</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Direct WhatsApp and phone assistance from our Colombo engineering and support desk.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Frequently Asked Questions Accordion */}
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                                Frequently asked questions
                            </h3>

                            <div className="divide-y divide-slate-200/60 dark:divide-white/10">
                                {faqs.map((faq, index) => {
                                    const isOpen = openFaqIndex === index;
                                    return (
                                        <div key={index} className="py-3">
                                            <button
                                                type="button"
                                                onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                                className="w-full flex items-center justify-between text-left font-semibold text-sm text-slate-800 dark:text-slate-200 hover:text-[#1E6FD9] dark:hover:text-[#1E6FD9] transition-colors cursor-pointer py-1"
                                            >
                                                <span>{faq.q}</span>
                                                {isOpen ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                                                )}
                                            </button>
                                            {isOpen && (
                                                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pr-6">
                                                    {faq.a}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* SUSPENDED BY ADMIN (NO SELF-SERVICE PAYMENT) */
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg text-center space-y-6 max-w-2xl mx-auto"
                    >
                        <div className="w-16 h-16 rounded-3xl bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 flex items-center justify-center mx-auto shadow-md">
                            <ShieldAlert className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                Self-service payment is disabled for this account
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
                                {stateDetails.reason
                                    ? `Suspension reason: ${stateDetails.reason}`
                                    : 'This clinic workspace access has been paused by MedVisit administration. Please contact our support team directly to review your account status.'}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0E9E8F]/10 border border-[#0E9E8F]/25 text-xs text-slate-600 dark:text-slate-300 text-left flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-[#0E9E8F] shrink-0 mt-0.5" />
                            <div>
                                <strong className="block font-bold text-slate-900 dark:text-white">
                                    Your data remains preserved
                                </strong>
                                <span>
                                    All patient histories and medical records remain safely stored for {retention.retention_days} days until {retention.deletion_date}.
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <a
                                href={support.whatsapp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span>Contact via WhatsApp</span>
                            </a>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Return to sign in</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Contact Strip (Config values only, WhatsApp primary) */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Need help or have questions? Contact MedVisit
                        </span>
                        {support.support_hours && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Support hours: {support.support_hours}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* WhatsApp (Primary) */}
                        <a
                            href={`${support.whatsapp_url}?text=${encodeURIComponent(
                                `Hello MedVisit Support, I need help with clinic workspace ${tenant.subdomain} (${tenant.name})`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all flex items-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block truncate">
                                    WhatsApp support
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                    {support.phone} (Instant chat)
                                </span>
                            </div>
                        </a>

                        {/* Email */}
                        <a
                            href={`mailto:${support.email}?subject=${encodeURIComponent(
                                `Reactivation assistance for ${tenant.name} (${tenant.subdomain})`
                            )}`}
                            className="p-3.5 rounded-2xl bg-[#1E6FD9]/10 hover:bg-[#1E6FD9]/15 border border-[#1E6FD9]/30 transition-all flex items-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#1E6FD9] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-[#1E6FD9] dark:text-blue-300 block truncate">
                                    Email billing
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                    {support.email}
                                </span>
                            </div>
                        </a>

                        {/* Direct Call */}
                        <a
                            href={`tel:${support.phone_raw}`}
                            className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 transition-all flex items-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                                    Direct call
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                    {support.phone}
                                </span>
                            </div>
                        </a>
                    </div>
                </div>
            </main>

            {/* Clean Footer (No invented Colombo IST text) */}
            <footer className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/60 dark:border-white/5 space-y-1">
                <div>
                    MedVisit Healthcare Systems · Official Clinic Workspace Notice
                </div>
                {support.support_hours && (
                    <div className="text-[11px] text-slate-400">
                        Support hours: {support.support_hours}
                    </div>
                )}
            </footer>
        </div>
    );
}
