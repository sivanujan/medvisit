import React from 'react';
import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    config: PublicConfig;
}

export default function PricingPreview({ config }: Props) {
    const plans = [config.plans.basic, config.plans.pro, config.plans.advanced].filter(Boolean);

    return (
        <section aria-labelledby="lp-pricing-title" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                    <h2 id="lp-pricing-title" className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
                        One monthly price per clinic
                    </h2>
                    <p className="mt-4 text-base sm:text-lg leading-relaxed text-[color:var(--lp-muted)]">
                        Billed monthly in rupees, with no lock-in. Cancel from your billing page whenever you like.
                    </p>
                </div>
                <Link
                    href="/pricing"
                    className="inline-flex shrink-0 rounded-xl px-1 py-1 text-base font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary dark:text-primary-300"
                >
                    Compare plans in detail
                </Link>
            </div>

            <ul className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-end">
                {plans.map((plan) => {
                    const featured = !!plan.badge;
                    return (
                        <li key={plan.id} className={featured ? 'lp-board-shadow' : ''}>
                            <div
                                className={`lp-ticket rounded-[24px] [--notch-y:58%] ${
                                    featured ? 'lp-board text-white' : 'lp-tile'
                                }`}
                            >
                                <div className={`px-6 ${featured ? 'pt-8 pb-7' : 'pt-6 pb-6'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-xl font-semibold">{plan.name}</h3>
                                        {plan.badge && (
                                            <span className="rounded-full bg-[#ff7a59] px-3 py-1 text-xs font-semibold text-[#3b0d02]">
                                                {plan.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-5 flex items-baseline gap-2">
                                        <span className="lp-tabular text-4xl font-bold tracking-tight">{plan.price_formatted}</span>
                                    </p>
                                    <p className={`mt-1 text-sm ${featured ? 'text-blue-100/85' : 'text-[color:var(--lp-muted)]'}`}>
                                        {plan.interval} {plan.target}
                                    </p>
                                </div>
                                <div className="lp-perf mx-5" />
                                <div className="px-6 py-5">
                                    <Link
                                        href="/pricing"
                                        aria-label={`See what's in the ${plan.name} plan`}
                                        className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                                            featured
                                                ? 'bg-white text-primary-700 hover:bg-primary-50'
                                                : 'border border-[color:var(--lp-line)] hover:border-primary hover:text-primary dark:hover:text-primary-300'
                                        }`}
                                    >
                                        See plan details
                                    </Link>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-8 text-center">
                <p className="text-sm text-[color:var(--lp-muted)]">
                    Not sure yet?{' '}
                    <Link
                        href="/demo"
                        className="font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                    >
                        <span>Try the live demo →</span>
                    </Link>
                </p>
            </div>

            {config.shared_features?.length > 0 && (
                <div className="mt-10">
                    <h3 className="text-base font-semibold">Every plan includes</h3>
                    <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {config.shared_features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2.5 text-[0.95rem] text-[color:var(--lp-muted)]">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
