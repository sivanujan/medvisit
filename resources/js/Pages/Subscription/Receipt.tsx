import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Props {
    invoice: {
        id: number;
        invoice_number: string;
        amount_cents: number;
        formatted_amount: string;
        period_start?: string;
        period_end?: string;
        paid_at?: string;
        status: string;
        payment_method: string;
    };
    clinic: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    plan?: {
        name: string;
        billing_interval?: string;
    } | null;
}

export default function Receipt({ invoice, clinic, plan }: Props) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 print:bg-white print:text-slate-900 print:py-0 print:px-0">
            <Head title={`Receipt - ${invoice.invoice_number}`} />

            <div className="max-w-3xl mx-auto space-y-6">
                {/* Print & Back Controls (hidden on print) */}
                <div className="flex items-center justify-between print:hidden">
                    <Link
                        href={route('tenant.subscription.index')}
                        className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Billing</span>
                    </Link>

                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Receipt</span>
                    </button>
                </div>

                {/* Printable Receipt Paper Container */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 sm:p-12 backdrop-blur shadow-2xl print:shadow-none print:border-none print:bg-white print:p-0">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-700/80 print:border-slate-300 pb-8 mb-8">
                        <div>
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg mb-4 print:bg-teal-600">
                                MV
                            </div>
                            <h1 className="text-xl font-bold text-white print:text-slate-900">MedVisit Sri Lanka</h1>
                            <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                                Healthcare Operating System
                            </p>
                            <p className="text-xs text-slate-400 print:text-slate-600">
                                support@medvisit.lk
                            </p>
                        </div>

                        <div className="text-right">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-emerald-600 print:text-emerald-700 mb-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>PAYMENT COMPLETED</span>
                            </span>
                            <div className="text-2xl font-bold font-mono text-white print:text-slate-900">
                                {invoice.invoice_number}
                            </div>
                            <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
                                Paid on: {invoice.paid_at || 'Confirmed'}
                            </div>
                        </div>
                    </div>

                    {/* Billed To */}
                    <div className="grid grid-cols-2 gap-8 border-b border-slate-700/80 print:border-slate-300 pb-8 mb-8 text-sm">
                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 print:text-slate-600 block mb-1">
                                Billed To
                            </span>
                            <div className="font-bold text-white print:text-slate-900 text-base">
                                {clinic.name}
                            </div>
                            {clinic.address && (
                                <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                                    {clinic.address}
                                </p>
                            )}
                            {clinic.phone && (
                                <p className="text-xs text-slate-400 print:text-slate-600">
                                    {clinic.phone}
                                </p>
                            )}
                            {clinic.email && (
                                <p className="text-xs text-slate-400 print:text-slate-600">
                                    {clinic.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 print:text-slate-600 block mb-1">
                                Payment Details
                            </span>
                            <div className="text-xs text-slate-300 print:text-slate-700 space-y-1">
                                <div>
                                    <span className="text-slate-400 print:text-slate-500">Method: </span>
                                    <span className="font-medium text-white print:text-slate-900">
                                        {invoice.payment_method}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 print:text-slate-500">Service Period: </span>
                                    <span>{invoice.period_start} to {invoice.period_end}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 print:text-slate-500">Gateway: </span>
                                    <span>Payments.lk (Hosted Checkout)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Itemized Table */}
                    <div className="border-b border-slate-700/80 print:border-slate-300 pb-8 mb-8">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider text-slate-400 print:text-slate-600 border-b border-slate-700/60 print:border-slate-200">
                                    <th className="py-2.5 font-semibold">Description</th>
                                    <th className="py-2.5 font-semibold text-right">Amount (LKR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                                <tr>
                                    <td className="py-4">
                                        <div className="font-semibold text-white print:text-slate-900">
                                            {plan?.name || 'MedVisit Standard Subscription'}
                                        </div>
                                        <div className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                                            Full suite clinic operations access for period {invoice.period_start} to {invoice.period_end}
                                        </div>
                                    </td>
                                    <td className="py-4 text-right font-mono font-medium text-white print:text-slate-900">
                                        {invoice.formatted_amount}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2 text-sm">
                            <div className="flex justify-between text-slate-400 print:text-slate-600">
                                <span>Subtotal</span>
                                <span>{invoice.formatted_amount}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 print:text-slate-600">
                                <span>Taxes</span>
                                <span>Rs. 0.00</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-700/80 print:border-slate-300 pt-2 font-bold text-base text-white print:text-slate-900">
                                <span>Total Paid</span>
                                <span className="text-teal-400 print:text-teal-700">{invoice.formatted_amount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-12 pt-6 border-t border-slate-800 print:border-slate-200 text-center text-xs text-slate-500">
                        Thank you for partnering with MedVisit. This is an electronic receipt for your subscription payment.
                    </div>
                </div>
            </div>
        </div>
    );
}
