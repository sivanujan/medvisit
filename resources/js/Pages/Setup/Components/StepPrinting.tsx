import React from 'react';
import {
    Printer,
    Receipt,
    FileText,
    Info,
    ArrowRight,
    ArrowLeft,
    Check,
    Hash,
    Building2,
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

export default function StepPrinting({
    tenant,
    form,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 8 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Reception & token printing
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Configure thermal token slips, invoice numbering, and doctor prescription printouts.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How printing works:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Supports any standard 80mm USB / Bluetooth ESC/POS thermal receipt printer.</li>
                    <li>Token slips print directly from reception when patients arrive.</li>
                    <li>Official invoices generate sequential numbers like {form.receipt_prefix || 'REC'}-00101.</li>
                </ul>
            </div>

            {/* Main Toggle */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                            Enable reception printing
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Allow reception and cashiers to print token slips and receipts.
                        </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={form.print_enabled}
                            onChange={(e) => onChange('print_enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                    </label>
                </div>

                {form.print_enabled && (
                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-5">
                        {/* Paper Format */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Primary Receipt Format
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <label
                                    className={`p-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                                        form.print_receipt_format === '80mm'
                                            ? 'border-[#1E6FD9] bg-[#1E6FD9]/5 ring-1 ring-[#1E6FD9]/20'
                                            : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="print_receipt_format"
                                        value="80mm"
                                        checked={form.print_receipt_format === '80mm'}
                                        onChange={() => onChange('print_receipt_format', '80mm')}
                                        className="text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            80mm Thermal Receipt (Standard)
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            Thermal roll paper for POS receipt printers.
                                        </p>
                                    </div>
                                </label>

                                <label
                                    className={`p-3 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                                        form.print_receipt_format === 'a4'
                                            ? 'border-[#1E6FD9] bg-[#1E6FD9]/5 ring-1 ring-[#1E6FD9]/20'
                                            : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="print_receipt_format"
                                        value="a4"
                                        checked={form.print_receipt_format === 'a4'}
                                        onChange={() => onChange('print_receipt_format', 'a4')}
                                        className="text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            A4 Full Page / PDF
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            Standard laser or inkjet paper printer.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Receipt Prefix & Registration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Invoice number prefix
                                </label>
                                <input
                                    type="text"
                                    maxLength={8}
                                    value={form.receipt_prefix}
                                    onChange={(e) =>
                                        onChange(
                                            'receipt_prefix',
                                            e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                                        )
                                    }
                                    placeholder="REC"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold uppercase text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    e.g. {form.receipt_prefix || 'REC'}-00101
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Clinic registration / license #
                                </label>
                                <input
                                    type="text"
                                    value={form.registration_number}
                                    onChange={(e) => onChange('registration_number', e.target.value)}
                                    placeholder="e.g. PHSRC/COL/1234"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Printed on official receipts
                                </p>
                            </div>
                        </div>

                        {/* Token Slip Options */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-white/5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Token Slips & Auto-Print
                            </label>

                            <div className="space-y-2">
                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 text-xs cursor-pointer">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        Print 80mm paper slip when issuing a token
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={form.print_token_slip_enabled}
                                        onChange={(e) =>
                                            onChange('print_token_slip_enabled', e.target.checked)
                                        }
                                        className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 text-xs cursor-pointer">
                                    <div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            Auto-open printer dialog
                                        </span>
                                        <p className="text-[10px] text-slate-400">
                                            Opens print window immediately without clicking &quot;Print slip&quot;.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.print_token_slip_autoprint}
                                        onChange={(e) =>
                                            onChange('print_token_slip_autoprint', e.target.checked)
                                        }
                                        className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Print Header Toggles */}
                        <div className="flex items-center gap-6 pt-2 border-t border-slate-200/40 dark:border-white/5 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={form.print_header_show_logo}
                                    onChange={(e) =>
                                        onChange('print_header_show_logo', e.target.checked)
                                    }
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span>Show clinic name / logo</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={form.print_header_show_address}
                                    onChange={(e) =>
                                        onChange('print_header_show_address', e.target.checked)
                                    }
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span>Show address & phone</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

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
