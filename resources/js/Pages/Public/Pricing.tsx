import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Check, ShieldCheck, CreditCard, Sparkles, ArrowRight, HelpCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';
import PolicyContactCard from '@/Components/Public/PolicyContactCard';
import { defaultPublicConfig, PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    config?: PublicConfig;
}

export default function Pricing({ config = defaultPublicConfig }: Props) {
    const plans = config.plans || defaultPublicConfig.plans;
    const business = config.business || defaultPublicConfig.business;
    const sharedFeatures = config.shared_features || defaultPublicConfig.shared_features;

    const planList = [
        plans.basic,
        plans.pro,
        plans.advanced,
    ];

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        {
            question: 'Can I cancel anytime?',
            answer:
                'Yes. You can cancel your subscription at any time directly from the Billing page in your clinic dashboard without contacting support. There are zero cancellation penalties or lock-in contracts. Your clinic keeps full access until the end of the billing period you have already paid for.',
        },
        {
            question: 'How do refunds work?',
            answer:
                'We provide a full refund for duplicate charges, billing errors, or if you cancel within 7 days of your first payment without using the service. If MedVisit ever experiences more than 48 continuous hours of service downtime due to our fault, we issue a pro-rata refund for the affected days. Approved refunds are returned to the original card within 7–14 working days.',
        },
        {
            question: 'What payment methods do you accept?',
            answer:
                'All subscription payments are processed securely in Sri Lankan Rupees (LKR) through Payments.lk (PAYable). We accept all valid Visa and Mastercard debit and credit cards issued by Sri Lankan and international banks.',
        },
        {
            question: 'Do prices change?',
            answer:
                'If we ever update plan prices, we provide at least 30 days prior advance notice via email to your clinic admin. You can choose to continue or cancel your subscription before any price adjustment takes effect.',
        },
    ];

    return (
        <PublicLegalLayout
            title="Pricing"
            description="Simple monthly pricing for Sri Lankan healthcare clinics. Plans starting from Rs. 7,000 per month per clinic. Billed in LKR via Payments.lk."
            isWide={true}
        >
            {/* Hero Section */}
            <div className="relative text-center max-w-3xl mx-auto mb-12 sm:mb-16 pt-2">
                {/* Large Faded Token Watermark */}
                <div
                    aria-hidden="true"
                    className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none select-none opacity-5 dark:opacity-5 text-primary -z-10"
                >
                    <span className="font-mono text-9xl font-black">LKR</span>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Transparent Sri Lankan Rupee Pricing</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Simple monthly pricing for clinics
                </h1>

                <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                    MedVisit is a clinic management and patient token system for Sri Lankan clinics. Choose the plan that fits your clinic. All prices are in Sri Lankan Rupees (LKR), billed monthly per clinic.
                </p>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-16">
                {planList.map((plan) => {
                    const isPopular = plan.badge === 'Most popular' || plan.id === 'pro';

                    return (
                        <div
                            key={plan.id}
                            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 backdrop-blur-xl ${
                                isPopular
                                    ? 'bg-white/95 dark:bg-slate-900/90 border-2 border-primary shadow-2xl shadow-primary/15 dark:shadow-primary/10 ring-4 ring-primary/10 scale-100 md:-translate-y-2'
                                    : 'bg-white/75 dark:bg-slate-900/65 border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-md'
                            }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary via-secondary to-primary text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md shadow-primary/25">
                                    Most popular
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {plan.name}
                                    </h2>
                                    {plan.badge && !isPopular && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {plan.badge}
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px]">
                                    {plan.description}
                                </p>

                                {/* Large Price Display */}
                                <div className="mt-5 pb-6 border-b border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                        <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                            {plan.price_formatted}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                            / month per clinic
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold text-secondary dark:text-secondary-400 block mt-1">
                                        Billed in LKR via Payments.lk
                                    </span>
                                </div>

                                {/* Plan Features & Included Limits */}
                                <div className="mt-6 space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Included with this plan:
                                    </p>

                                    {plan.features && plan.features.length > 0 ? (
                                        <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                                            {plan.features.map((feat, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5">
                                                    <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                                            <li className="flex items-start gap-2.5">
                                                <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                                <span>Specialist channeling & doctor roaster</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                                <span>Live patient token queue & public display</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                                <span>Patient digital records & prescriptions</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                                <span>Dedicated secure clinic subdomain</span>
                                            </li>
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-4">
                                <a
                                    href="/register"
                                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                        isPopular
                                            ? 'bg-gradient-to-r from-primary to-secondary hover:from-primary-600 hover:to-secondary-600 text-white shadow-primary/25 shadow-md active:scale-98'
                                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-98'
                                    }`}
                                >
                                    <span>Get started</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Included in Every Plan Grid */}
            <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-9 bg-gradient-to-br from-white/90 via-slate-50/80 to-secondary-50/20 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-secondary-950/20 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-sm mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-2xl bg-secondary/15 dark:bg-secondary/25 text-secondary flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                            Included in every plan
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Foundational capabilities accessible to all subscribed medical clinics
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    {sharedFeatures.map((feature, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-secondary/40 transition"
                        >
                            <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{feature}</span>
                        </div>
                    ))}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-secondary/40 transition">
                        <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">Mobile & desktop responsive dashboard</span>
                    </div>
                </div>
            </div>

            {/* Short FAQ Accordion */}
            <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-9 bg-white/80 dark:bg-slate-900/75 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-xs mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold">
                        <HelpCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Common questions about subscriptions, payments, and clinic onboarding
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaq === idx;

                        return (
                            <div
                                key={idx}
                                className="rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/20"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                                            isOpen ? 'rotate-180 text-primary' : ''
                                        }`}
                                    />
                                </button>

                                {isOpen && (
                                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/50">
                                        <p>{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Clean Info Panel for Billing Notes */}
            <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-50/90 to-white/90 dark:from-slate-900/70 dark:to-slate-800/40 border border-slate-200/90 dark:border-white/10 backdrop-blur-md mb-12 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Billing & Payment Notes
                    </h2>
                </div>

                <ul className="space-y-2.5 list-disc pl-5 leading-relaxed">
                    <li>
                        Subscriptions are billed monthly in advance in LKR through our secure payment partner, Payments.lk (PAYable). We accept Visa and Mastercard.
                    </li>
                    <li>
                        Your subscription renews automatically each month until you cancel.
                    </li>
                    <li>
                        You can cancel anytime from the Billing page in your clinic dashboard. Access continues until the end of the period you have already paid for.
                    </li>
                    <li>
                        Prices may change in the future. We will notify you by email at least 30 days before any change applies to your subscription.
                    </li>
                    <li>
                        For more details, see our{' '}
                        <Link href="/refund-policy" className="text-primary font-semibold hover:underline">
                            Refund and Cancellation Policy
                        </Link>{' '}
                        and{' '}
                        <Link href="/terms" className="text-primary font-semibold hover:underline">
                            Terms and Conditions
                        </Link>.
                    </li>
                </ul>
            </div>

            {/* Final CTA Band */}
            <div className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-primary via-primary-600 to-secondary text-white text-center shadow-xl shadow-primary/20 mb-12 relative overflow-hidden">
                <div aria-hidden="true" className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                <div aria-hidden="true" className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-black/10 blur-2xl" />

                <div className="relative z-10 max-w-xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Start managing your clinic with MedVisit
                    </h2>
                    <p className="mt-3 text-xs sm:text-sm text-white/90 leading-relaxed">
                        Join clinics across Sri Lanka streamlining patient channeling queues, token numbers, and clinical records.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href="/register"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-primary font-bold text-xs sm:text-sm shadow-md hover:bg-slate-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                            <span>Get Started Now</span>
                            <ArrowRight className="w-4 h-4" />
                        </a>
                        <Link
                            href="/terms"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs transition"
                        >
                            <span>Read Terms</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Contact Card at Bottom */}
            <div className="max-w-4xl mx-auto">
                <PolicyContactCard business={business} />
            </div>
        </PublicLegalLayout>
    );
}
