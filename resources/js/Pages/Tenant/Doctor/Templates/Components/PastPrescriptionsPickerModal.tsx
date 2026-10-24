import React, { useState } from 'react';
import {
    X,
    FileText,
    Calendar,
    User,
    Pill,
    ArrowRight,
    Search,
    Clock,
} from 'lucide-react';

export interface RecentPrescriptionItem {
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    display_name: string;
    generic_name?: string | null;
    brand_name?: string | null;
    strength_text?: string | null;
    dosage_form: string;
    dose: string;
    frequency: string;
    timing: string;
    route?: string;
    duration_days: number;
    quantity: number;
    instructions?: string | null;
    source: string;
}

export interface RecentPrescription {
    id: number;
    prescription_number: string;
    date_formatted: string;
    patient_name: string;
    diagnosis: string;
    items_count: number;
    items: RecentPrescriptionItem[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    recentPrescriptions: RecentPrescription[];
    onSelectPrescription: (rx: RecentPrescription) => void;
}

export const PastPrescriptionsPickerModal: React.FC<Props> = ({
    isOpen,
    onClose,
    recentPrescriptions,
    onSelectPrescription,
}) => {
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filtered = recentPrescriptions.filter((rx) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            rx.prescription_number.toLowerCase().includes(q) ||
            rx.patient_name.toLowerCase().includes(q) ||
            rx.diagnosis.toLowerCase().includes(q) ||
            rx.items.some((it) => it.display_name.toLowerCase().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="min-h-full flex items-center justify-center p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="past_prescriptions_title"
                    className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 id="past_prescriptions_title" className="text-base font-bold text-slate-900 dark:text-white">
                                    Save from past prescription
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Select one of your past finalized prescriptions to load its medicines into a reusable template.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search filter */}
                    <div className="p-4 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/40 dark:bg-white/5">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search past prescriptions by patient, Rx number, diagnosis, or medicine..."
                                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                            />
                        </div>
                    </div>

                    {/* Prescriptions List */}
                    <div className="p-4 space-y-3 overflow-y-auto flex-1">
                        {filtered.length === 0 ? (
                            <div className="py-12 text-center">
                                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    No matching past prescriptions found
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Prescriptions must be finalized during a consultation before they can be loaded here.
                                </p>
                            </div>
                        ) : (
                            filtered.map((rx) => (
                                <div
                                    key={rx.id}
                                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800/40 hover:border-primary/50 dark:hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group"
                                    onClick={() => onSelectPrescription(rx)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono font-bold text-primary">
                                                    {rx.prescription_number}
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                    {rx.patient_name}
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {rx.date_formatted}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    Diagnosis:
                                                </span>
                                                <span className="text-xs text-slate-600 dark:text-slate-400 italic">
                                                    {rx.diagnosis}
                                                </span>
                                            </div>

                                            {/* Medicine Pills preview */}
                                            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                                                {rx.items.slice(0, 4).map((it, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                                    >
                                                        <Pill className="w-2.5 h-2.5 text-teal-500" />
                                                        <span>{it.display_name}</span>
                                                    </span>
                                                ))}
                                                {rx.items.length > 4 && (
                                                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                                        +{rx.items.length - 4} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors shrink-0 flex items-center gap-1 mt-1"
                                        >
                                            <span>Use as template</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex items-center justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
