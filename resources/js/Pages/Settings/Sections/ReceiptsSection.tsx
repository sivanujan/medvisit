import React from 'react';
import { Printer, Receipt, FileText, CheckCircle2, Hash } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { FormInstance } from '../types';

interface Props {
    form: FormInstance<{
        billing_timing: string;
        receipt_prefix: string;
        tax_percentage: number;
        accepted_methods: string[];
        show_clinic_share_to_doctors: boolean;
    }>;
    clinicName: string;
    clinicAddress: string;
    clinicPhone: string;
}

export default function ReceiptsSection({ form, clinicName, clinicAddress, clinicPhone }: Props) {
    const { data, setData, errors } = form;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Receipts & invoices
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure official invoice numbering prefixes, thermal slip formats and patient printouts.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Printer className="w-4 h-4 text-[#1E6FD9]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Invoice numbering & paper format
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {/* Receipt Prefix */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Invoice & receipt number prefix
                            </label>
                            <input
                                type="text"
                                maxLength={8}
                                value={data.receipt_prefix}
                                onChange={(e) =>
                                    setData('receipt_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                                }
                                placeholder="REC"
                                className="w-full sm:w-48 px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-mono font-bold uppercase tracking-wider"
                                required
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Generates sequential invoice IDs like <span className="font-mono font-semibold">{data.receipt_prefix || 'REC'}-00142</span>.
                            </p>
                            {errors.receipt_prefix && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">{errors.receipt_prefix}</p>
                            )}
                        </div>

                        {/* Thermal Paper standard info */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <Receipt className="w-4 h-4 text-[#0E9E8F]" />
                                <span>80mm POS Thermal Slip Compatibility</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                                MedVisit formats payment receipts specifically for industry-standard 80mm ESC/POS thermal printers (Epson, Xprinter, Rongta), printing in single-click silent mode with no page cutting margins.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="80mm payment receipt"
                    subtitle="Official customer payment voucher"
                >
                    <div className="w-full max-w-[320px] mx-auto bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 shadow-md font-mono text-xs space-y-3">
                        <div className="text-center">
                            <h4 className="font-black text-sm tracking-wide uppercase">
                                {clinicName || 'Clinic Receipt'}
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-tight">
                                {clinicAddress || 'Address, City, District'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {clinicPhone ? `Tel: ${clinicPhone}` : 'Tel: +94 -- --- ----'}
                            </p>
                        </div>

                        <div className="border-t border-b border-dashed border-slate-300 py-2 text-center space-y-0.5">
                            <span className="font-bold text-xs uppercase block text-slate-800">
                                OFFICIAL PAYMENT RECEIPT
                            </span>
                            <span className="text-[11px] font-bold text-primary block">
                                {data.receipt_prefix || 'REC'}-00142
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                                Date: {new Date().toLocaleDateString('en-GB')} 06:15 PM
                            </span>
                        </div>

                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Patient:</span>
                                <span className="font-bold">A. Perera</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Doctor:</span>
                                <span>Dr. K. Sivalingam</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-100">
                                <span>Consultation fee:</span>
                                <span className="font-semibold">Rs. 2,500.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Hospital & booking fee:</span>
                                <span className="font-semibold">Rs. 800.00</span>
                            </div>
                            {data.tax_percentage > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>Tax ({data.tax_percentage}%):</span>
                                    <span>Rs. {(3300 * (data.tax_percentage / 100)).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-1 border-t-2 border-slate-900 font-extrabold text-sm">
                                <span>TOTAL PAID:</span>
                                <span>Rs. {(3300 * (1 + data.tax_percentage / 100)).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="text-center pt-1 text-[9px] text-slate-400">
                            Cashier: Staff • Paid via Cash • MedVisit
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
