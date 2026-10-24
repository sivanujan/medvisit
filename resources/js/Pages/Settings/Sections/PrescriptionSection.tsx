import React from 'react';
import { FileText, Printer, Stethoscope, CheckCircle2, ShieldCheck } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import GlassSelect from '@/Components/UI/GlassSelect';
import { FormInstance } from '../types';

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
    clinicName: string;
}

export default function PrescriptionSection({ form, clinicName }: Props) {
    const { data, setData, errors } = form;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Prescription print settings
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure clinical prescription printing, doctor credentials, and dosage language formats.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <FileText className="w-4 h-4 text-[#1E6FD9]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Print layout & format
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {/* Enable Prescription Print */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                            <div className="min-w-0 pr-4">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Enable prescription paper printing
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Allows doctors and dispensaries to print official PDF slips directly from consultation.
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={data.prescription_print_enabled}
                                    onChange={(e) => setData('prescription_print_enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                            </label>
                        </div>

                        {/* Print Language */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Dosage instructions language
                            </label>
                            <GlassSelect
                                value={data.prescription_print_language}
                                onValueChange={(val) => setData('prescription_print_language', val as 'en' | 'ta' | 'si')}
                                options={[
                                    { value: 'en', label: 'English (TDS, BD, After meals)' },
                                    { value: 'ta', label: 'Tamil (தமிழ் - உணவுக்கு பின்)' },
                                    { value: 'si', label: 'Sinhala (සිංහල - කෑමට පසු)' },
                                ]}
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Controls the language for frequency, food relationship, and special dosing instructions.
                            </p>
                        </div>

                        {/* Show Doctor Registration */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                            <div className="min-w-0 pr-4">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Display doctor SLMC registration number
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Print official Sri Lanka Medical Council (SLMC) license under doctor signature.
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={data.prescription_print_show_doctor_reg}
                                    onChange={(e) => setData('prescription_print_show_doctor_reg', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E6FD9]" />
                            </label>
                        </div>

                        {/* Show Diagnosis */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                            <div className="min-w-0 pr-4">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Include clinical diagnosis & ICD tags
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Show clinical assessment and disease codes on the patient copy.
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={data.prescription_print_show_diagnosis}
                                    onChange={(e) => setData('prescription_print_show_diagnosis', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E6FD9]" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Prescription layout"
                    subtitle="How the printed prescription sheet appears"
                >
                    <div className="w-full max-w-[340px] mx-auto bg-white text-slate-900 p-5 rounded-2xl border border-slate-200 shadow-md text-xs space-y-3 font-sans">
                        <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                            <div>
                                <h4 className="font-extrabold text-sm uppercase text-[#1E6FD9]">
                                    {clinicName || 'Clinic Prescription'}
                                </h4>
                                <p className="text-[10px] text-slate-500">Official Medical Prescription</p>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-[11px]">Dr. K. Sivalingam</div>
                                {data.prescription_print_show_doctor_reg && (
                                    <div className="text-[9px] text-slate-500 font-mono">SLMC #24819</div>
                                )}
                            </div>
                        </div>

                        {data.prescription_print_show_diagnosis && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] space-y-0.5">
                                <span className="font-bold text-slate-600 block">Diagnosis:</span>
                                <span className="text-slate-800">Essential Hypertension (I10)</span>
                            </div>
                        )}

                        <div className="space-y-2 py-1">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-[#1E6FD9] text-sm">℞</span>
                                <div className="text-[11px]">
                                    <div className="font-bold">Tab. Amlodipine 5mg</div>
                                    <div className="text-[10px] text-slate-500">
                                        {data.prescription_print_language === 'ta'
                                            ? '1 மாத்திரை • தினமும் காலை • உணவுக்கு பின்'
                                            : data.prescription_print_language === 'si'
                                            ? 'පෙති 1 • දිනපතා උදෑසන • කෑමට පසු'
                                            : '1 Tab • Daily Morning • After meals'} • 30 Days
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[9px] text-slate-400">
                            <span>Signed electronically via MedVisit</span>
                            <span className="font-mono">#{Date.now().toString().slice(-6)}</span>
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
