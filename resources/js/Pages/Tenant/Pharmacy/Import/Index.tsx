import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GlassCard from '@/Components/UI/GlassCard';
import { formatLKR } from '@/Utils/formatters';
import {
    FileSpreadsheet,
    Download,
    Upload,
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Package,
    Layers,
    FileText,
    ArrowRight,
    RefreshCw,
    Calendar,
    Boxes,
} from 'lucide-react';

interface PreviewRow {
    row_index: number;
    status: 'matched' | 'new_medicine' | 'error';
    match_type?: string;
    errors: string[];
    data: {
        barcode?: string | null;
        generic_name: string;
        strength: string;
        dosage_form: string;
        brand_name?: string | null;
        manufacturer?: string | null;
        batch_number?: string | null;
        expiry_date?: string | null;
        quantity: number;
        base_unit: string;
        cost_price_cents: number;
        selling_price_cents: number;
        supplier_name?: string | null;
        invoice_number?: string | null;
    };
    matched?: {
        variant_id: number;
        brand_id?: number | null;
        medicine_name: string;
        variant_display: string;
        brand_name?: string | null;
    } | null;
}

export default function StockImportIndex() {
    const [step, setStep] = useState<1 | 2>(1);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Preview data
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [validRowsCount, setValidRowsCount] = useState(0);
    const [errorRowsCount, setErrorRowsCount] = useState(0);

    const [confirming, setConfirming] = useState(false);

    // Handle File Drop / Select
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadError(null);
        }
    };

    // Upload & Preview
    const handleUploadPreview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(route('tenant.pharmacy.import.preview'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setUploadError(data.message || 'Failed to process import file.');
                setUploading(false);
                return;
            }

            const rawPreview = data.preview || data.rows || [];
            setPreviewRows(rawPreview);
            setTotalRows(data.total_rows || rawPreview.length);
            setValidRowsCount(data.valid_count ?? data.valid_rows_count ?? 0);
            setErrorRowsCount(data.error_count ?? data.error_rows_count ?? 0);
            setStep(2);
        } catch (err: any) {
            setUploadError(err.message || 'An unexpected error occurred while parsing the file.');
        } finally {
            setUploading(false);
        }
    };

    // Confirm Import
    const handleConfirmImport = () => {
        const validRows = previewRows.filter((r) => r.status !== 'error');
        if (validRows.length === 0) return;

        setConfirming(true);
        router.post(
            route('tenant.pharmacy.import.confirm'),
            { rows: validRows as any },
            {
                onError: (errs) => {
                    setConfirming(false);
                    setUploadError(errs.rows || 'Import failed.');
                },
            }
        );
    };

    const newMedicinesCount = previewRows.filter((r) => r.status === 'new_medicine').length;
    const matchedCount = previewRows.filter((r) => r.status === 'matched').length;

    return (
        <AuthenticatedLayout>
            <Head title="Import Stock via CSV/Excel — Pharmacy" />

            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('tenant.pharmacy.medicines')}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="w-6 h-6 text-primary" />
                                Bulk Stock Import
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Import opening inventory or supplier invoices with multi-batch support via Excel (.xlsx) or CSV
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`${route('tenant.pharmacy.import.template')}?format=xlsx`}
                            download="medvisit_stock_import_template.xlsx"
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download Excel (.xlsx)
                        </a>
                        <a
                            href={`${route('tenant.pharmacy.import.template')}?format=csv`}
                            download="medvisit_stock_import_template.csv"
                            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            Download CSV
                        </a>
                    </div>
                </div>

                {uploadError && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                        <XCircle className="w-5 h-5 shrink-0" />
                        <span>{uploadError}</span>
                    </div>
                )}

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <GlassCard className="p-6 lg:col-span-2 space-y-6">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-primary" />
                                    Step 1: Upload Stock Spreadsheet
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Select an .xlsx or .csv file containing your medicine stock rows. Maximum 2,000 rows per import.
                                </p>
                            </div>

                            <form onSubmit={handleUploadPreview} className="space-y-6">
                                <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                                    <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <label
                                        htmlFor="csvFileInput"
                                        className="cursor-pointer font-semibold text-primary hover:underline text-sm block"
                                    >
                                        {file ? file.name : 'Choose Excel (.xlsx) or CSV (.csv) file to upload'}
                                    </label>
                                    <p className="text-xs text-slate-400 mt-1">
                                        or drag and drop your file here (Max 5MB)
                                    </p>
                                    <input
                                        id="csvFileInput"
                                        type="file"
                                        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'No file chosen'}
                                    </span>

                                    <button
                                        type="submit"
                                        disabled={!file || uploading}
                                        className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Parsing File...
                                            </>
                                        ) : (
                                            <>
                                                <span>Parse & Preview</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </GlassCard>

                        {/* Guide Card */}
                        <GlassCard className="p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Expected Columns & Formats
                            </h3>

                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">Required Columns:</div>
                                    <div className="text-slate-500 mt-0.5 space-y-0.5 font-mono text-[11px]">
                                        <div>generic_name, strength, dosage_form</div>
                                        <div>batch_number, expiry_date, quantity</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">Optional Columns:</div>
                                    <div className="text-slate-500 mt-0.5 font-mono text-[11px]">
                                        barcode, brand_name, manufacturer, base_unit, cost_price, selling_price, supplier_name, invoice_number
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Accepted Date Formats
                                    </div>
                                    <div className="text-[11px] leading-relaxed">
                                        <code>YYYY-MM-DD</code> (e.g. 2026-12-25), <code>DD/MM/YYYY</code> (e.g. 25/12/2026), or <code>DD.MM.YYYY</code> (e.g. 25.12.2026).
                                    </div>
                                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-1">
                                        Expiry date must be in the future (past dates rejected).
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <Boxes className="w-3.5 h-3.5" /> Multiple Batches & GRNs
                                    </div>
                                    <div className="text-[11px] leading-relaxed">
                                        The same medicine on multiple lines with different batches creates separate batches. Rows without supplier/invoice are imported as <strong>Opening Stock</strong> (no GRN). Rows with supplier+invoice create a GRN.
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Step 2: Match Preview */}
                {step === 2 && (
                    <div className="space-y-6">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <GlassCard className="p-4">
                                <div className="text-xs uppercase font-bold text-slate-400">Total Rows</div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    {totalRows}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4">
                                <div className="text-xs uppercase font-bold text-emerald-500">Catalog Matched</div>
                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    {matchedCount}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4">
                                <div className="text-xs uppercase font-bold text-blue-500">New Medicines</div>
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                                    {newMedicinesCount}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4">
                                <div className="text-xs uppercase font-bold text-rose-500">Errors</div>
                                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                    {errorRowsCount}
                                </div>
                            </GlassCard>
                        </div>

                        {/* Preview Table */}
                        <GlassCard className="p-0 overflow-hidden">
                            <div className="p-4 border-b border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Preview & Batch Verification Results
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Verify batch numbers, expiry dates, quantities, and GRN vs Opening Stock mapping before saving
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Upload Another File
                                </button>
                            </div>

                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                                        <tr className="border-b border-slate-200 dark:border-white/10 uppercase tracking-wider text-slate-500 font-bold">
                                            <th className="px-4 py-3">Row</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Medicine & Brand</th>
                                            <th className="px-4 py-3">Batch Number</th>
                                            <th className="px-4 py-3">Expiry Date</th>
                                            <th className="px-4 py-3">Qty</th>
                                            <th className="px-4 py-3">Cost / Sell</th>
                                            <th className="px-4 py-3">Entry Type</th>
                                            <th className="px-4 py-3">Validation & Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                                        {previewRows.map((row) => {
                                            const hasError = row.status === 'error';
                                            const isOpening = !row.data.supplier_name && !row.data.invoice_number;

                                            return (
                                                <tr
                                                    key={row.row_index}
                                                    className={`transition-colors ${
                                                        hasError
                                                            ? 'bg-rose-500/5 hover:bg-rose-500/10'
                                                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                                                    }`}
                                                >
                                                    <td className="px-4 py-3 font-mono text-slate-400">
                                                        #{row.row_index}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {row.status === 'matched' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                                                <CheckCircle2 className="w-3 h-3" /> Matched
                                                            </span>
                                                        )}
                                                        {row.status === 'new_medicine' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                                                                <Layers className="w-3 h-3" /> New Medicine
                                                            </span>
                                                        )}
                                                        {row.status === 'error' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[10px]">
                                                                <XCircle className="w-3 h-3" /> Error
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {row.data.generic_name} {row.data.strength}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {row.data.dosage_form}
                                                            {row.data.brand_name ? ` • Brand: ${row.data.brand_name}` : ''}
                                                            {row.data.manufacturer ? ` (${row.data.manufacturer})` : ''}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        {row.data.batch_number || (
                                                            <span className="text-rose-600 font-normal">Missing</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span className={`font-mono ${
                                                            !row.data.expiry_date
                                                                ? 'text-rose-600 font-bold'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {row.data.expiry_date || 'Missing'}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3 font-semibold">
                                                        <span className={row.data.quantity <= 0 ? 'text-rose-600 font-bold' : ''}>
                                                            {row.data.quantity} {row.data.base_unit}s
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <div>{formatLKR(row.data.cost_price_cents || 0)}</div>
                                                        <div className="text-slate-400 text-[11px]">
                                                            Sell: {formatLKR(row.data.selling_price_cents || 0)}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {isOpening ? (
                                                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                                Opening Stock
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                                                                    GRN
                                                                </span>
                                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                                    {row.data.supplier_name} ({row.data.invoice_number})
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {row.errors.length > 0 ? (
                                                            <div className="space-y-0.5">
                                                                {row.errors.map((err, eIdx) => (
                                                                    <div key={eIdx} className="text-rose-600 dark:text-rose-400 font-medium text-[11px] flex items-center gap-1">
                                                                        <span>&bull;</span> {err}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">
                                                                {row.matched ? `Matched: ${row.matched.medicine_name} ${row.matched.variant_display}` : 'Valid for import'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold transition-colors"
                                >
                                    Cancel & Re-upload
                                </button>

                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={confirming || validRowsCount === 0}
                                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {confirming ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Importing Stock...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Import {validRowsCount} Valid Item{validRowsCount === 1 ? '' : 's'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
