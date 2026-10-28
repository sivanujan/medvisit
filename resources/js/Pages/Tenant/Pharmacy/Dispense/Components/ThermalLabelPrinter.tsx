import React from 'react';
import { Printer, X } from 'lucide-react';

export interface DispenseLabelItem {
    id: number;
    displayName: string;
    dosageForm?: string;
    strengthText?: string;
    quantity: number;
    instructionClinic: string;
    instructionEn: string;
    useClinicLanguage: boolean;
    batchNumber?: string;
    expiryDate?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    prescriptionNumber: string;
    patientName: string;
    patientPhone?: string;
    doctorName: string;
    clinicName: string;
    clinicPhone?: string;
    dispenseDate: string;
    items: DispenseLabelItem[];
}

export default function ThermalLabelPrinter({
    isOpen,
    onClose,
    prescriptionNumber,
    patientName,
    patientPhone,
    doctorName,
    clinicName,
    clinicPhone,
    dispenseDate,
    items,
}: Props) {
    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-2xl w-full p-6 space-y-6 my-8 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
                {/* Modal Header (Hidden in Print) */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Print Medicine Sticker Labels
                            </h3>
                            <p className="text-xs text-slate-500">
                                {items.length} label{items.length === 1 ? '' : 's'} ready for {patientName} · Rx {prescriptionNumber}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close print preview"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Printable Labels Area */}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible print:space-y-6">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850/60 space-y-2.5 print:border print:border-solid print:border-black print:bg-white print:p-3 print:rounded-none print:break-inside-avoid print:page-break-after-always"
                            style={{ minHeight: '120px' }}
                        >
                            {/* Sticker Header: Clinic & Date */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 print:border-black pb-1.5 text-[11px] print:text-[10px]">
                                <span className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                                    {clinicName}
                                </span>
                                <span className="text-slate-500 print:text-black font-mono">
                                    {dispenseDate}
                                </span>
                            </div>

                            {/* Patient & Rx info */}
                            <div className="flex items-center justify-between text-xs print:text-[11px]">
                                <span className="font-bold text-slate-900 dark:text-white print:text-black">
                                    {patientName} {patientPhone ? `(${patientPhone})` : ''}
                                </span>
                                <span className="text-slate-500 print:text-black font-mono text-[11px]">
                                    Rx: {prescriptionNumber}
                                </span>
                            </div>

                            {/* Medicine Details */}
                            <div className="pt-1">
                                <div className="text-sm print:text-xs font-black text-slate-950 dark:text-white print:text-black">
                                    {item.displayName}
                                    <span className="ml-2 text-xs font-normal text-slate-600 print:text-black">
                                        Qty: {item.quantity}
                                    </span>
                                </div>

                                {/* Instruction Line (Clinic Language or English) */}
                                <div className="mt-1 text-xs print:text-[11px] font-semibold text-primary-700 dark:text-primary-300 print:text-black bg-primary/5 dark:bg-primary/10 print:bg-transparent p-2 rounded-lg print:p-0">
                                    {item.useClinicLanguage ? item.instructionClinic : item.instructionEn}
                                </div>
                            </div>

                            {/* Footer: Batch, Expiry & Prescriber */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/5 print:border-black text-[10px] text-slate-400 print:text-black">
                                <span>
                                    {item.batchNumber ? `Batch: ${item.batchNumber}` : ''}
                                    {item.expiryDate ? ` · Exp: ${item.expiryDate}` : ''}
                                </span>
                                <span>Dr. {doctorName}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modal Footer (Hidden in Print) */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5 print:hidden">
                    <span className="text-xs text-slate-500">
                        Compatible with standard thermal sticker rolls (50x30mm / 70x40mm) and A4 sheets.
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Done
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print Labels</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
