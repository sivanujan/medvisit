import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    ArrowUpRight,
    ShieldCheck,
    Receipt,
} from 'lucide-react';

interface Invoice {
    id: number;
    invoice_number: string;
    amount_cents: number;
    formatted_amount: string;
    period_start?: string;
    period_end?: string;
    due_date?: string;
    status: string;
    paid_at?: string;
    payment_method?: string;
}

interface Subscription {
    status: string;
    is_active: boolean;
    is_comp: boolean;
    current_period_end?: string;
    plan_name?: string;
    plan_price?: string;
}

interface Props {
    subscription?: Subscription | null;
    invoices: Invoice[];
}

export default function SubscriptionIndex({ subscription, invoices }: Props) {
    const isComp = subscription?.is_comp;
    const isActive = subscription?.is_active;

    return (
        <AuthenticatedLayout>
            <Head title="Subscription Billing" />

            <div className="space-y-6">
                <PageHeader
                    title="Subscription & Invoices"
                    subtitle="Manage your MedVisit subscription plan, renewal dates, and payment receipts."
                />

                {/* Plan Overview Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="p-6 md:col-span-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs uppercase tracking-wider font-semibold text-teal-400">
                                    Current Plan
                                </span>
                                <h3 className="text-2xl font-bold text-white mt-1">
                                    {subscription?.plan_name || 'MedVisit Standard'}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    {isComp
                                        ? 'Complimentary Lifetime Access — Active'
                                        : `${subscription?.plan_price || 'Rs. 5,000.00'} per month`}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {isActive ? (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Active</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>Payment Required</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-400 block text-xs">Next Renewal Date</span>
                                <span className="font-semibold text-white mt-0.5 block">
                                    {isComp
                                        ? 'Never (Complimentary)'
                                        : subscription?.current_period_end || 'Pending Payment'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-xs">Billing Currency</span>
                                <span className="font-semibold text-white mt-0.5 block">
                                    Sri Lankan Rupees (LKR)
                                </span>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Quick Payment or Security Card */}
                    <GlassCard className="p-6 flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h4 className="text-base font-semibold text-white">Payment Security</h4>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Secure checkout — we never see or store your card details.
                            </p>
                        </div>

                        {!isActive && (
                            <div className="mt-6">
                                <Link
                                    href={route('tenant.subscription.subscribe')}
                                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 transition"
                                >
                                    <span>Pay Invoice Now</span>
                                    <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Invoices Table */}
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white">Billing History</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                All past monthly subscription invoices and printable receipts.
                            </p>
                        </div>
                    </div>

                    {invoices.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Receipt className="w-12 h-12 mx-auto stroke-1 mb-3 opacity-60" />
                            <p className="text-sm">No subscription invoices generated yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="border-b border-slate-700/60 text-xs uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Invoice #</th>
                                        <th className="py-3 px-4 font-semibold">Billing Period</th>
                                        <th className="py-3 px-4 font-semibold">Due Date</th>
                                        <th className="py-3 px-4 font-semibold">Amount</th>
                                        <th className="py-3 px-4 font-semibold">Status</th>
                                        <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                                            <td className="py-4 px-4 font-mono font-medium text-white">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="py-4 px-4 text-xs text-slate-400">
                                                {inv.period_start} to {inv.period_end}
                                            </td>
                                            <td className="py-4 px-4 text-xs text-slate-400">
                                                {inv.due_date || '—'}
                                            </td>
                                            <td className="py-4 px-4 font-semibold text-white">
                                                {inv.formatted_amount}
                                            </td>
                                            <td className="py-4 px-4">
                                                {inv.status === 'paid' && (
                                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Paid</span>
                                                    </span>
                                                )}
                                                {inv.status === 'unpaid' && (
                                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Unpaid</span>
                                                    </span>
                                                )}
                                                {inv.status === 'void' && (
                                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400">
                                                        <span>Void</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                {inv.status === 'paid' ? (
                                                    <Link
                                                        href={route('tenant.subscription.receipt', inv.id)}
                                                        className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 transition"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>Print Receipt</span>
                                                    </Link>
                                                ) : inv.status === 'unpaid' ? (
                                                    <Link
                                                        href={route('tenant.subscription.subscribe')}
                                                        className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
                                                    >
                                                        <span>Pay Now</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-slate-500">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>
        </AuthenticatedLayout>
    );
}
