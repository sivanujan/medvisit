import React from 'react';
import { Receipt, CreditCard, Banknote, Landmark, Percent, Eye, Check, ShieldCheck } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { BillingSettingsData, FormInstance } from '../types';

interface Props {
    form: FormInstance<{
        billing_timing: string;
        receipt_prefix: string;
        tax_percentage: number;
        accepted_methods: string[];
        show_clinic_share_to_doctors: boolean;
    }>;
    billingSettings: BillingSettingsData;
}

export default function BillingSection({ form }: Props) {
    const { data, setData, errors } = form;

    const togglePaymentMethod = (method: string) => {
        const current = data.accepted_methods || [];
        const exists = current.includes(method);
        if (exists && current.length === 1) return; // Keep at least 1 method
        const next = exists ? current.filter((m: string) => m !== method) : [...current, method];
        setData('accepted_methods', next);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Billing & cashier
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage cashier workflow rules, payment methods, sales tax, and doctor payout statement disclosures.
                    </p>
                </div>

                {/* Workflow Timing Card */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Receipt className="w-4 h-4 text-[#1E6FD9]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Cashier collection workflow
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setData('billing_timing', 'pay_at_issue')}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                                data.billing_timing === 'pay_at_issue'
                                    ? 'bg-primary-50/70 dark:bg-primary-950/25 border-primary-500/50 text-primary-950 dark:text-primary-200 shadow-xs'
                                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold">Collect at reception</span>
                                {data.billing_timing === 'pay_at_issue' && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                Patients pay immediately when issuing their channeling token before seeing the doctor.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setData('billing_timing', 'pay_after_consult')}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                                data.billing_timing === 'pay_after_consult'
                                    ? 'bg-primary-50/70 dark:bg-primary-950/25 border-primary-500/50 text-primary-950 dark:text-primary-200 shadow-xs'
                                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold">Collect after consult</span>
                                {data.billing_timing === 'pay_after_consult' && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                Patients pay at checkout, allowing pharmacy items and lab investigations to be added.
                            </p>
                        </button>
                    </div>

                    {/* Tax & Methods */}
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Sales tax percentage (%)
                            </label>
                            <div className="relative w-full sm:w-48">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    value={data.tax_percentage}
                                    onChange={(e) => setData('tax_percentage', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-semibold"
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                                    %
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Applied to overall bill total during checkout. Set to 0 if exempt.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Accepted payment methods
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => togglePaymentMethod('cash')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                        data.accepted_methods.includes('cash')
                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Banknote className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-bold">Cash</span>
                                    </div>
                                    {data.accepted_methods.includes('cash') && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => togglePaymentMethod('card')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                        data.accepted_methods.includes('card')
                                            ? 'bg-primary-50/60 dark:bg-primary-950/20 border-primary-500/40 text-primary-900 dark:text-primary-200'
                                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold">Debit / Credit card</span>
                                    </div>
                                    {data.accepted_methods.includes('card') && <Check className="w-3.5 h-3.5 text-primary" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => togglePaymentMethod('bank_transfer')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                        data.accepted_methods.includes('bank_transfer')
                                            ? 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-500/40 text-purple-900 dark:text-purple-200'
                                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Landmark className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs font-bold">Bank transfer</span>
                                    </div>
                                    {data.accepted_methods.includes('bank_transfer') && <Check className="w-3.5 h-3.5 text-purple-500" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doctor Payout Disclosure Card */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Eye className="w-4 h-4 text-[#0E9E8F]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Doctor settlement transparency
                        </h3>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                        <div className="min-w-0 pr-4">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Show clinic share to doctors on payout statements
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                When enabled, doctor PDF settlement statements display the clinic fee split alongside the doctor's earnings.
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={data.show_clinic_share_to_doctors}
                                onChange={(e) => setData('show_clinic_share_to_doctors', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Cashier & payout preview"
                    subtitle="How cashier timing and doctor statement adapt"
                >
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Cashier modal mode</span>
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-primary/10 text-primary">
                                {data.billing_timing === 'pay_at_issue' ? 'Immediate upfront' : 'Checkout post-consult'}
                            </span>
                        </div>

                        {/* Doctor Statement Snapshot */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-2 text-xs">
                            <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>Doctor settlement statement</span>
                                <span className="text-[10px] text-slate-400">PDF view</span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Doctor fee (10 visits):</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">Rs. 25,000.00</span>
                            </div>

                            {data.show_clinic_share_to_doctors ? (
                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5 text-[#0E9E8F]">
                                    <span>Clinic share (disclosed):</span>
                                    <span className="font-mono font-bold">Rs. 5,000.00</span>
                                </div>
                            ) : (
                                <div className="py-1 text-[10px] text-slate-400 italic">
                                    Clinic share is hidden from doctor view.
                                </div>
                            )}

                            <div className="flex justify-between pt-1 font-bold text-slate-900 dark:text-white">
                                <span>Net doctor payout:</span>
                                <span className="font-mono text-primary">Rs. 25,000.00</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {data.accepted_methods.map((m: string) => (
                                <span
                                    key={m}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                >
                                    {m.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
