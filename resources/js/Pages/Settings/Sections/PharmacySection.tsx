import React from 'react';
import { Pill, Package, AlertTriangle, ShieldCheck, Check, Clock } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { PharmacySettingsData, FormInstance } from '../types';

interface Props {
    form: FormInstance<{
        pharmacy_enabled: boolean;
        default_reorder_level: number;
        expiring_soon_threshold_days: number;
        stock_reduction_mode: 'dispense' | 'consultation';
        prescription_print_enabled: boolean;
        prescription_print_language: 'en' | 'ta' | 'si';
        prescription_print_show_doctor_reg: boolean;
        prescription_print_show_diagnosis: boolean;
    }>;
    pharmacySettings?: PharmacySettingsData;
}

export default function PharmacySection({ form }: Props) {
    const { data, setData, errors } = form;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Pharmacy & stock
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure dispensary inventory management, reorder alerts and stock deduction triggers.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Pill className="w-4 h-4 text-[#0E9E8F]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Dispensary module
                        </h3>
                    </div>

                    {/* Master Switch */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                        <div className="min-w-0 pr-4">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Enable clinic pharmacy module
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Activates dispensary counters, medicine batches, stock replenishment and prescription dispensing.
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={data.pharmacy_enabled}
                                onChange={(e) => setData('pharmacy_enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                        </label>
                    </div>

                    <div className="space-y-4 pt-2">
                        {/* Reorder Level */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Default reorder alert threshold
                            </label>
                            <div className="relative w-full sm:w-48">
                                <input
                                    type="number"
                                    min={0}
                                    max={10000}
                                    value={data.default_reorder_level}
                                    onChange={(e) =>
                                        setData('default_reorder_level', parseInt(e.target.value) || 0)
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]/30 font-semibold"
                                    required
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                                    units
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Triggers amber low-stock badge when total inventory falls below this count.
                            </p>
                            {errors.default_reorder_level && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {errors.default_reorder_level}
                                </p>
                            )}
                        </div>

                        {/* Expiration Threshold */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Expiration warning window (days)
                            </label>
                            <div className="relative w-full sm:w-48">
                                <input
                                    type="number"
                                    min={7}
                                    max={365}
                                    value={data.expiring_soon_threshold_days}
                                    onChange={(e) =>
                                        setData('expiring_soon_threshold_days', parseInt(e.target.value) || 60)
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]/30 font-semibold"
                                    required
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                                    days prior
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Batches expiring within this window display an alert badge in the medicine directory.
                            </p>
                            {errors.expiring_soon_threshold_days && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {errors.expiring_soon_threshold_days}
                                </p>
                            )}
                        </div>

                        {/* Reduction Mode */}
                        <div className="space-y-2 pt-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Stock reduction trigger
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setData('stock_reduction_mode', 'dispense')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                                        data.stock_reduction_mode === 'dispense'
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/50 text-emerald-950 dark:text-emerald-200 shadow-xs'
                                            : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold">On physical dispense</span>
                                        {data.stock_reduction_mode === 'dispense' && (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Deduct quantity when pharmacist confirms issue at dispensary counter.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setData('stock_reduction_mode', 'consultation')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                                        data.stock_reduction_mode === 'consultation'
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/50 text-emerald-950 dark:text-emerald-200 shadow-xs'
                                            : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold">On doctor prescription</span>
                                        {data.stock_reduction_mode === 'consultation' && (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Deduct quantity immediately when doctor prescribes medication.
                                    </p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Stock alert preview"
                    subtitle="How inventory indicators look in pharmacy"
                >
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Medicine Inventory Row
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                Active stock
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">Amoxicillin 500mg</div>
                                    <div className="text-[10px] text-slate-400 font-mono">Batch #BAT-2026-081</div>
                                </div>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    8 tablets
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Low stock (below {data.default_reorder_level})</span>
                                </span>

                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                                    <Clock className="w-3 h-3" />
                                    <span>Expiring in 45 days (&lt; {data.expiring_soon_threshold_days}d)</span>
                                </span>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            Reduction timing: <strong>{data.stock_reduction_mode === 'dispense' ? 'Dispensary Counter' : 'Consultation Desk'}</strong>
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
