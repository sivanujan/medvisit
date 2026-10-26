import React from 'react';
import {
    Pill,
    Info,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Lock,
    ExternalLink,
    CheckCircle2,
} from 'lucide-react';
import { SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
    onContinue: () => void;
    onBack: () => void;
    saving: boolean;
    errors?: Record<string, string>;
}

export default function StepPharmacy({
    tenant,
    form,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    const allowsPharmacy = tenant.plan_allows_pharmacy;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 7 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Dispensary & pharmacy
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Manage your in-clinic dispensary inventory, batch stock tracking, and medication dispensing.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How the dispensary module operates:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Digital prescriptions issued by doctors flow instantly to your pharmacy desk.</li>
                    <li>Automatic real-time stock deduction, reorder warnings, and expiry tracking.</li>
                    <li>If disabled, prescriptions can still be printed or given directly to the patient.</li>
                </ul>
            </div>

            {/* Plan Gating Banner if Basic Plan */}
            {!allowsPharmacy ? (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Pharmacy module is included in Pro & Advanced plans
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Your current <strong className="uppercase">{tenant.plan_name}</strong> plan does
                                not include in-clinic dispensary stock management. You can upgrade anytime to
                                unlock inventory tracking.
                            </p>
                        </div>
                    </div>

                    <div className="pt-1">
                        <a
                            href="/billing"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-xs hover:bg-amber-600 transition-colors"
                        >
                            <span>Explore upgrade options</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            ) : (
                /* Pharmacy Toggle Card (For Pro, Advanced, Comp, Standard) */
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                                Enable in-clinic pharmacy & dispensary
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Unlocks pharmacy inventory, stock deductions, and dispensing queues.
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={form.pharmacy_enabled}
                                onChange={(e) => onChange('pharmacy_enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                        </label>
                    </div>

                    {form.pharmacy_enabled && (
                        <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Inventory Stock Deduction Mode
                            </label>

                            <div className="space-y-2">
                                <label
                                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                                        form.stock_reduction_mode === 'dispense'
                                            ? 'border-[#0E9E8F] bg-[#0E9E8F]/5 ring-1 ring-[#0E9E8F]/20'
                                            : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="stock_reduction_mode"
                                        value="dispense"
                                        checked={form.stock_reduction_mode === 'dispense'}
                                        onChange={() => onChange('stock_reduction_mode', 'dispense')}
                                        className="mt-0.5 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            When medication is dispensed (Recommended)
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Inventory is deducted the exact moment the pharmacist packages the prescription.
                                        </p>
                                    </div>
                                </label>

                                <label
                                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                                        form.stock_reduction_mode === 'bill'
                                            ? 'border-[#0E9E8F] bg-[#0E9E8F]/5 ring-1 ring-[#0E9E8F]/20'
                                            : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="stock_reduction_mode"
                                        value="bill"
                                        checked={form.stock_reduction_mode === 'bill'}
                                        onChange={() => onChange('stock_reduction_mode', 'bill')}
                                        className="mt-0.5 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            When patient bill is settled
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Inventory is deducted only after payment has been cleared at the cashier desk.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <button
                    type="button"
                    disabled={saving}
                    onClick={onContinue}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{
                        background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                    }}
                >
                    <span>{saving ? 'Saving...' : 'Save & continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
