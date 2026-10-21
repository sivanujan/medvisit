import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, ShieldCheck, ArrowRight, Loader2, AlertCircle, LogOut } from 'lucide-react';
import LegalFooter from '@/Components/Public/LegalFooter';
import { PageProps } from '@/types';

interface Plan {
    name: string;
    price_cents: number;
    formatted_price: string;
    billing_interval?: string;
    features: string[];
}

interface Subscription {
    id: number;
    status: string;
    is_active: boolean;
    is_comp: boolean;
    is_trialing: boolean;
    trial_ends_at?: string;
    current_period_end?: string;
    plan?: Plan;
}

interface Invoice {
    id: number;
    invoice_number: string;
    amount_cents: number;
    formatted_amount: string;
    due_date?: string;
    period_start?: string;
    period_end?: string;
}

interface Props {
    tenant: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    subscription?: Subscription | null;
    invoice?: Invoice | null;
    standardPlan?: Plan | null;
}

export default function Subscribe({ tenant, subscription, invoice, standardPlan }: Props) {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);
    const { flash, tenant: tenantProp } = usePage<PageProps>().props;

    const baseCentralDomain = tenantProp?.base_domain || 'medvisit.lk';
    const getCentralUrl = (path: string) => {
        if (typeof window !== 'undefined') {
            const port = window.location.port ? `:${window.location.port}` : '';
            return `${window.location.protocol}//${baseCentralDomain}${port}${path}`;
        }
        return `https://${baseCentralDomain}${path}`;
    };

    const plan = subscription?.plan || standardPlan || {
        name: 'MedVisit Standard',
        price_cents: 500000,
        formatted_price: 'Rs. 5,000.00',
        billing_interval: 'month',
        features: [
            'Unlimited Channeling Sessions & Doctor Roster',
            'Live Queue TV Display & Real-time Calling',
            'SMS Queue Alerts & WhatsApp Confirmations',
            'Prescription Management & Direct Clinic Dispensing',
            'Complete Financial Settlements & Doctor Payouts',
        ],
    };

    const handleCheckout = (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) {
            setClientError('You must agree to the Terms and Conditions and Refund Policy to proceed.');
            return;
        }
        setIsSubmitting(true);
        setClientError(null);
        router.post(route('tenant.subscription.checkout'), {
            terms_accepted: true,
        }, {
            onError: (errors) => {
                setIsSubmitting(false);
                const firstErr = Object.values(errors)[0];
                if (firstErr) {
                    setClientError(firstErr);
                }
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('tenant.logout'));
    };

    const errorMessage = clientError || flash?.error;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
            <Head title="Subscribe to MedVisit" />

            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
                        MV
                    </div>
                    <div>
                        <span className="font-semibold text-white tracking-tight">{tenant.name}</span>
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Clinic Workspace
                        </span>
                    </div>
                </div>

                <form onSubmit={handleLogout}>
                    <button
                        type="submit"
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </form>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-4xl w-full">
                    {/* Welcome Banner */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium mb-3">
                            <span>Step 2 of 2: Activate Clinic Subscription</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Unlock your clinical operations
                        </h1>
                        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
                            Complete your monthly subscription payment to start managing doctor rosters, appointments, live patient queues, and electronic prescriptions.
                        </p>
                    </div>

                    {errorMessage && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Plan Details & Features (7 cols) */}
                        <div className="lg:col-span-7 bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
                            <div className="flex items-baseline justify-between border-b border-slate-700/70 pb-6 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                                    <p className="text-xs text-slate-400 mt-1">Full-featured clinic management suite</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-extrabold text-white tracking-tight">
                                        {plan.formatted_price}
                                    </div>
                                    <div className="text-xs text-slate-400">per month</div>
                                </div>
                            </div>

                            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4">
                                Everything included in your plan:
                            </h3>

                            <ul className="space-y-3.5 text-sm text-slate-300">
                                {plan.features && plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start space-x-3">
                                        <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-8 pt-6 border-t border-slate-700/70 text-xs text-slate-400 flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                                <span>Cancel anytime. Transparent monthly billing in Sri Lankan Rupees (LKR).</span>
                            </div>
                        </div>

                        {/* Order & Payment Summary (5 cols) */}
                        <div className="lg:col-span-5 bg-gradient-to-b from-slate-800 to-slate-800/80 border border-teal-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl relative">
                            <div className="absolute -top-3 right-6 bg-teal-500 text-slate-950 font-semibold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                                Ready to Pay
                            </div>

                            <h3 className="text-base font-semibold text-white mb-4">Invoice Summary</h3>

                            <div className="space-y-3 text-sm text-slate-300 border-b border-slate-700/80 pb-4 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Invoice Number</span>
                                    <span className="font-mono text-xs text-slate-200">
                                        {invoice?.invoice_number || 'INV-PENDING'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Billing Period</span>
                                    <span>1 Month</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Currency</span>
                                    <span>Sri Lankan Rupee (LKR)</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-baseline mb-6">
                                <span className="font-semibold text-white">Total Due Today</span>
                                <span className="text-2xl font-bold text-teal-400">
                                    {invoice?.formatted_amount || plan.formatted_price}
                                </span>
                            </div>

                            <form onSubmit={handleCheckout} className="space-y-4">
                                {/* Recurring-payment consent checkbox required for merchant review */}
                                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            id="terms_consent_checkbox"
                                            checked={termsAccepted}
                                            onChange={(e) => {
                                                setTermsAccepted(e.target.checked);
                                                if (e.target.checked) setClientError(null);
                                            }}
                                            className="mt-0.5 rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500/30 focus:ring-offset-0 transition cursor-pointer shrink-0"
                                            required
                                        />
                                        <span className="leading-relaxed text-slate-300">
                                            I agree to the{' '}
                                            <a
                                                href={getCentralUrl('/terms')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-teal-400 hover:text-teal-300 underline font-semibold"
                                            >
                                                Terms and Conditions
                                            </a>{' '}
                                            and{' '}
                                            <a
                                                href={getCentralUrl('/refund-policy')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-teal-400 hover:text-teal-300 underline font-semibold"
                                            >
                                                Refund Policy
                                            </a>
                                            , and I authorise MedVisit to charge the selected plan amount in LKR every month until I cancel. I can cancel anytime from the Billing page.
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !termsAccepted}
                                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-teal-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                            <span>Connecting to Payments.lk...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Pay {invoice?.formatted_amount || plan.formatted_price}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Trust & Security Badge - strictly matching user requirement 1 */}
                            <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-start space-x-2.5 text-xs text-slate-400">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    Secure checkout hosted by Payments.lk — we never see or store your card details.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Legal & Compliance Footer */}
            <LegalFooter className="border-t border-slate-800 bg-slate-950/80" isTenantContext={true} />
        </div>
    );
}
