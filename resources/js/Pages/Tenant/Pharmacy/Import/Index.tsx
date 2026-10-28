import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import { formatLKR, formatDateLK, formatDateDMY } from '@/Utils/formatters';
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
    ChevronDown,
    SlidersHorizontal,
    Info,
    History,
    FileCheck2,
    FileWarning,
    Sparkles,
    Trash2,
    ExternalLink,
    Check,
    Edit3,
    Save,
    RotateCcw,
    X,
} from 'lucide-react';

interface PreviewRow {
    row_index: number;
    status: 'matched' | 'new_medicine' | 'error';
    match_type?: string;
    is_existing_medicine?: boolean;
    existing_clinic_medicine_id?: number | null;
    errors: string[];
    warnings?: string[];
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

interface ImportHistoryItem {
    id: string;
    created_at: string;
    user_name: string;
    user_email?: string;
    metadata?: {
        file_name?: string;
        file_hash?: string;
        total_rows?: number;
        created_medicines?: number;
        created_batches?: number;
        created_receipts?: number;
        opening_stock_batches?: number;
        total_value_cents?: number;
        receipts?: Array<{
            id: number;
            receipt_number: string;
            supplier_name: string;
            invoice_number: string;
            items_count: number;
            total_cost_cents: number;
        }>;
    };
}

interface ImportResultData {
    success: boolean;
    total_imported: number;
    total_skipped?: number;
    created_medicines: number;
    created_receipts: number;
    created_batches: number;
    opening_stock_batches: number;
    total_value_cents: number;
    receipt_records?: Array<{
        id: number;
        receipt_number: string;
        supplier_name: string;
        invoice_number: string;
        items_count: number;
        total_cost_cents: number;
    }>;
}

const CANONICAL_FIELDS: Array<{
    key: string;
    label: string;
    required: boolean;
    description: string;
}> = [
    { key: 'generic_name', label: 'Generic name', required: true, description: 'Active pharmaceutical ingredient (e.g. Paracetamol, Metformin)' },
    { key: 'strength', label: 'Strength', required: true, description: 'Dosage strength (e.g. 500 mg, 850 mg)' },
    { key: 'quantity', label: 'Quantity', required: true, description: 'Number of units received (positive integer)' },
    { key: 'batch_number', label: 'Batch number', required: true, description: 'Manufacturer batch or lot number (use "N/A" if none)' },
    { key: 'expiry_date', label: 'Expiry date', required: true, description: 'DD/MM/YYYY or YYYY-MM-DD (must be in the future)' },
    { key: 'dosage_form', label: 'Dosage form', required: false, description: 'Tablet, Capsule, Syrup, Injection, Cream (defaults to Tablet)' },
    { key: 'brand_name', label: 'Brand name', required: false, description: 'Commercial trade brand (e.g. Panadol, Glucophage)' },
    { key: 'manufacturer', label: 'Manufacturer', required: false, description: 'Pharmaceutical maker (e.g. GSK, Merck, SPMC)' },
    { key: 'barcode', label: 'Barcode', required: false, description: 'UPC/EAN product barcode for quick scanner lookups' },
    { key: 'base_unit', label: 'Base unit', required: false, description: 'Unit of dispensing: tablet, capsule, bottle, vial' },
    { key: 'cost_price', label: 'Cost price (LKR)', required: false, description: 'Purchase cost per unit in Sri Lankan Rupees' },
    { key: 'selling_price', label: 'Selling price (LKR)', required: false, description: 'Retail patient price in LKR (defaults to cost + 30%)' },
    { key: 'supplier_name', label: 'Supplier name', required: false, description: 'Leave empty for Opening Stock. Provide with invoice for a GRN.' },
    { key: 'invoice_number', label: 'Invoice number', required: false, description: 'Supplier bill/invoice number to group items into a GRN receipt.' },
];

export default function StockImportIndex() {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Template menu dropdown
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    const templateMenuRef = useRef<HTMLDivElement>(null);

    // Detected headers & mappings
    const [headers, setHeaders] = useState<string[]>([]);
    const [sampleRows, setSampleRows] = useState<string[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [rememberMapping, setRememberMapping] = useState(true);

    // Re-import & Duplicate detection info
    const [fileHash, setFileHash] = useState<string | null>(null);
    const [isDuplicateFile, setIsDuplicateFile] = useState(false);
    const [duplicateFileInfo, setDuplicateFileInfo] = useState<any>(null);
    const [duplicateInvoices, setDuplicateInvoices] = useState<string[]>([]);

    // Preview data
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [validRowsCount, setValidRowsCount] = useState(0);
    const [warningRowsCount, setWarningRowsCount] = useState(0);
    const [errorRowsCount, setErrorRowsCount] = useState(0);
    const [newMedicinesCount, setNewMedicinesCount] = useState(0);
    const [existingMedicinesCount, setExistingMedicinesCount] = useState(0);
    const [batchesCount, setBatchesCount] = useState(0);
    const [openingStockCount, setOpeningStockCount] = useState(0);
    const [grnGroupsCount, setGrnGroupsCount] = useState(0);
    const [totalUnits, setTotalUnits] = useState(0);
    const [totalCostCents, setTotalCostCents] = useState(0);

    // Review Filters & Options
    const [reviewFilter, setReviewFilter] = useState<'all' | 'ready' | 'warnings' | 'errors' | 'new' | 'existing' | 'opening' | 'grn'>('all');
    const [skipErrors, setSkipErrors] = useState(true);
    const [page, setPage] = useState(1);
    const rowsPerPage = 20;

    // Inline Editing
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<{
        quantity: number;
        batch_number: string;
        expiry_date: string;
        cost_price_rupees: number;
        selling_price_rupees: number;
    }>({
        quantity: 0,
        batch_number: '',
        expiry_date: '',
        cost_price_rupees: 0,
        selling_price_rupees: 0,
    });

    // Import Execution & Results
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResultData | null>(null);

    // History Modal
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState<ImportHistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Mobile side-panel collapse
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close template menu on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
                setIsTemplateMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load saved mapping on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('medvisit_stock_import_mapping');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object') {
                    setColumnMapping(parsed);
                }
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    // Fetch history
    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch(route('tenant.pharmacy.import.history'), {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.history)) {
                setHistoryList(data.history);
            }
        } catch {
            // Ignore fetch errors
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleOpenHistory = () => {
        setIsHistoryOpen(true);
        loadHistory();
    };

    // Handle File Drop / Select
    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile) return;

        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'txt') {
            setUploadError('Only Excel (.xlsx) and CSV (.csv) files are supported.');
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            setUploadError('File size exceeds 5MB limit. Please split your file or reduce its size.');
            return;
        }

        setFile(selectedFile);
        setUploadError(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // Upload & Parse Preview
    const handleParseFile = async (customMap?: Record<string, string>) => {
        if (!file) {
            fileInputRef.current?.click();
            return;
        }

        setUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', file);
        if (customMap) {
            formData.append('mapping', JSON.stringify(customMap));
        }

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

            const rawPreview: PreviewRow[] = data.preview || [];
            setPreviewRows(rawPreview);
            setTotalRows(data.total_rows || rawPreview.length);
            setValidRowsCount(data.valid_count ?? 0);
            setWarningRowsCount(data.warning_count ?? 0);
            setErrorRowsCount(data.error_count ?? 0);
            setNewMedicinesCount(data.new_medicines_count ?? 0);
            setExistingMedicinesCount(data.existing_medicines_count ?? 0);
            setBatchesCount(data.batches_count ?? 0);
            setOpeningStockCount(data.opening_stock_count ?? 0);
            setGrnGroupsCount(data.grn_groups_count ?? 0);
            setTotalUnits(data.total_units ?? 0);
            setTotalCostCents(data.total_cost_cents ?? 0);

            setHeaders(data.headers || []);
            setSampleRows(data.sample_rows || []);
            setFileHash(data.file_hash || null);
            setIsDuplicateFile(Boolean(data.is_duplicate_file));
            setDuplicateFileInfo(data.duplicate_file_info || null);
            setDuplicateInvoices(data.duplicate_invoices || []);

            const currentMap = customMap || data.auto_mapping || {};
            setColumnMapping(currentMap);

            if (rememberMapping) {
                try {
                    localStorage.setItem('medvisit_stock_import_mapping', JSON.stringify(currentMap));
                } catch {
                    // Ignore localStorage quota
                }
            }

            // Move to Step 2 if not mapped yet, or Step 3 if user requested review
            if (!customMap && step === 1) {
                setStep(2);
            } else {
                setStep(3);
            }
        } catch (err: any) {
            setUploadError(err.message || 'An unexpected error occurred while parsing the file.');
        } finally {
            setUploading(false);
        }
    };

    // Confirm & Execute Import
    const handleConfirmImport = async () => {
        const rowsToImport = skipErrors
            ? previewRows.filter((r) => r.status !== 'error')
            : previewRows;

        if (rowsToImport.length === 0) {
            setUploadError('There are no valid rows to import.');
            return;
        }

        setIsImporting(true);
        setImportProgress(15);
        setStep(4);
        setUploadError(null);

        const progressTimer = setInterval(() => {
            setImportProgress((p) => (p < 85 ? p + 15 : p));
        }, 300);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(route('tenant.pharmacy.import.confirm'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    rows: rowsToImport,
                    file_hash: fileHash,
                    file_name: file?.name || 'Stock_Import',
                }),
            });

            clearInterval(progressTimer);
            setImportProgress(100);

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to complete stock import.');
            }

            setImportResult({
                success: true,
                total_imported: data.total_imported ?? rowsToImport.length,
                total_skipped: errorRowsCount,
                created_medicines: data.created_medicines ?? 0,
                created_receipts: data.created_receipts ?? 0,
                created_batches: data.created_batches ?? 0,
                opening_stock_batches: data.opening_stock_batches ?? 0,
                total_value_cents: data.total_value_cents ?? 0,
                receipt_records: data.receipt_records || [],
            });
        } catch (err: any) {
            clearInterval(progressTimer);
            setUploadError(err.message || 'An unexpected error occurred during import.');
            setStep(3); // return to review so user can inspect
        } finally {
            setIsImporting(false);
        }
    };

    // Filter preview rows
    const filteredRows = useMemo(() => {
        return previewRows.filter((row) => {
            if (reviewFilter === 'ready') return row.status === 'matched' && (!row.warnings || row.warnings.length === 0);
            if (reviewFilter === 'warnings') return (row.warnings && row.warnings.length > 0) || row.status === 'new_medicine';
            if (reviewFilter === 'errors') return row.status === 'error';
            if (reviewFilter === 'new') return row.status === 'new_medicine';
            if (reviewFilter === 'existing') return row.is_existing_medicine || row.status === 'matched';
            if (reviewFilter === 'opening') {
                const s = (row.data.supplier_name || '').trim();
                const inv = (row.data.invoice_number || '').trim();
                return s === '' && inv === '';
            }
            if (reviewFilter === 'grn') {
                const s = (row.data.supplier_name || '').trim();
                const inv = (row.data.invoice_number || '').trim();
                return s !== '' || inv !== '';
            }
            return true;
        });
    }, [previewRows, reviewFilter]);

    // Paginated rows
    const paginatedRows = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filteredRows.slice(start, start + rowsPerPage);
    }, [filteredRows, page]);

    const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

    // Start inline edit
    const startEditingRow = (row: PreviewRow) => {
        setEditingRowIndex(row.row_index);
        setEditFormData({
            quantity: row.data.quantity,
            batch_number: row.data.batch_number || '',
            expiry_date: row.data.expiry_date || '',
            cost_price_rupees: (row.data.cost_price_cents || 0) / 100,
            selling_price_rupees: (row.data.selling_price_cents || 0) / 100,
        });
    };

    // Save inline edit
    const saveEditingRow = (rowIndex: number) => {
        setPreviewRows((prev) =>
            prev.map((r) => {
                if (r.row_index !== rowIndex) return r;

                const qty = Number(editFormData.quantity) || 0;
                const costCents = Math.round(Number(editFormData.cost_price_rupees) * 100) || 0;
                const sellingCents = Math.round(Number(editFormData.selling_price_rupees) * 100) || 0;

                const newErrors = [...r.errors.filter((e) => !e.toLowerCase().includes('quantity') && !e.toLowerCase().includes('expiry') && !e.toLowerCase().includes('batch'))];
                const newWarnings = [...(r.warnings || []).filter((w) => !w.toLowerCase().includes('expiry') && !w.toLowerCase().includes('selling price'))];

                if (qty <= 0) {
                    newErrors.push('Quantity must be greater than zero');
                }
                if (!editFormData.batch_number.trim()) {
                    newErrors.push('Batch number is required (use "N/A" if none)');
                }
                if (!editFormData.expiry_date.trim()) {
                    newErrors.push('Expiry date is required');
                } else {
                    const d = new Date(editFormData.expiry_date);
                    if (isNaN(d.getTime())) {
                        newErrors.push('Invalid expiry date format');
                    } else if (d <= new Date()) {
                        newErrors.push('Expiry date must be in the future');
                    }
                }

                if (sellingCents > 0 && costCents > sellingCents) {
                    newWarnings.push(`Selling price (${formatLKR(sellingCents)}) is below cost price (${formatLKR(costCents)})`);
                }

                const newStatus = newErrors.length > 0 ? 'error' : (r.matched ? 'matched' : 'new_medicine');

                return {
                    ...r,
                    status: newStatus,
                    errors: newErrors,
                    warnings: newWarnings,
                    data: {
                        ...r.data,
                        quantity: qty,
                        batch_number: editFormData.batch_number.trim() || 'N/A',
                        expiry_date: editFormData.expiry_date.trim(),
                        cost_price_cents: costCents,
                        selling_price_cents: sellingCents,
                    },
                };
            })
        );
        setEditingRowIndex(null);
    };

    // Download error rows as CSV
    const downloadErrorRowsCsv = () => {
        const errorRows = previewRows.filter((r) => r.status === 'error');
        if (errorRows.length === 0) return;

        const headers = [
            'row_number',
            'generic_name',
            'strength',
            'dosage_form',
            'brand_name',
            'batch_number',
            'expiry_date',
            'quantity',
            'cost_price',
            'selling_price',
            'supplier_name',
            'invoice_number',
            'errors',
        ];

        const csvLines = [headers.join(',')];
        errorRows.forEach((r) => {
            const line = [
                r.row_index,
                `"${(r.data.generic_name || '').replace(/"/g, '""')}"`,
                `"${(r.data.strength || '').replace(/"/g, '""')}"`,
                `"${(r.data.dosage_form || '').replace(/"/g, '""')}"`,
                `"${(r.data.brand_name || '').replace(/"/g, '""')}"`,
                `"${(r.data.batch_number || '').replace(/"/g, '""')}"`,
                `"${(r.data.expiry_date || '').replace(/"/g, '""')}"`,
                r.data.quantity,
                ((r.data.cost_price_cents || 0) / 100).toFixed(2),
                ((r.data.selling_price_cents || 0) / 100).toFixed(2),
                `"${(r.data.supplier_name || '').replace(/"/g, '""')}"`,
                `"${(r.data.invoice_number || '').replace(/"/g, '""')}"`,
                `"${r.errors.join('; ').replace(/"/g, '""')}"`,
            ];
            csvLines.push(line.join(','));
        });

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `import_errors_${file?.name || 'stock'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download import report
    const downloadImportReportCsv = () => {
        const headers = ['Receipt / Type', 'Invoice #', 'Supplier', 'Medicine', 'Batch', 'Expiry Date', 'Qty', 'Unit Cost (LKR)', 'Total Cost (LKR)'];
        const csvLines = [headers.join(',')];

        previewRows
            .filter((r) => (skipErrors ? r.status !== 'error' : true))
            .forEach((r) => {
                const isOpening = !r.data.supplier_name && !r.data.invoice_number;
                const receiptNum = isOpening ? 'Opening Stock' : (r.data.invoice_number || 'GRN');
                const costRupees = (r.data.cost_price_cents || 0) / 100;
                const totalCostRupees = costRupees * r.data.quantity;

                const line = [
                    `"${receiptNum}"`,
                    `"${r.data.invoice_number || ''}"`,
                    `"${r.data.supplier_name || 'Clinic'}"`,
                    `"${r.data.generic_name} ${r.data.strength}"`,
                    `"${r.data.batch_number}"`,
                    `"${r.data.expiry_date || ''}"`,
                    r.data.quantity,
                    costRupees.toFixed(2),
                    totalCostRupees.toFixed(2),
                ];
                csvLines.push(line.join(','));
            });

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `medvisit_stock_import_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Reset wizard
    const resetWizard = () => {
        setStep(1);
        setFile(null);
        setPreviewRows([]);
        setImportResult(null);
        setUploadError(null);
        setFileHash(null);
        setIsDuplicateFile(false);
        setDuplicateFileInfo(null);
        setDuplicateInvoices([]);
        setPage(1);
    };

    // Unmatched required fields count
    const unmatchedRequiredFields = useMemo(() => {
        return CANONICAL_FIELDS.filter((f) => f.required && !columnMapping[f.key]);
    }, [columnMapping]);

    return (
        <AuthenticatedLayout>
            <Head title="Import Stock — Pharmacy" />

            <div className="max-w-7xl mx-auto space-y-6 pb-24 font-sans min-w-0 w-full overflow-x-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('tenant.pharmacy.medicines')}
                            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Back to medicines"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Import stock
                                </h1>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    Guided wizard
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Add opening stock or supplier invoices from Excel or CSV.
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleOpenHistory}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <History className="w-4 h-4 text-slate-500" />
                            <span>Import history</span>
                        </button>

                        {/* Split Download Template Button */}
                        <div className="relative" ref={templateMenuRef}>
                            <div className="inline-flex rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 overflow-hidden">
                                <a
                                    href={`${route('tenant.pharmacy.import.template')}?format=xlsx`}
                                    download="medvisit_stock_import_template.xlsx"
                                    className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors border-r border-slate-200/80 dark:border-white/10"
                                    title="Download standard Excel template with 3 example rows and instruction guide"
                                >
                                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span>Download template</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
                                    className="px-2.5 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    aria-label="More template formats"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isTemplateMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* Template dropdown options */}
                            {isTemplateMenuOpen && (
                                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-2 z-40 backdrop-blur-2xl">
                                    <a
                                        href={`${route('tenant.pharmacy.import.template')}?format=xlsx`}
                                        download="medvisit_stock_import_template.xlsx"
                                        onClick={() => setIsTemplateMenuOpen(false)}
                                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                                            <FileSpreadsheet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                Excel Spreadsheet (.xlsx)
                                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                    Recommended
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                Includes 3 sample rows and a dedicated "How to fill" reference sheet.
                                            </p>
                                        </div>
                                    </a>

                                    <a
                                        href={`${route('tenant.pharmacy.import.template')}?format=csv`}
                                        download="medvisit_stock_import_template.csv"
                                        onClick={() => setIsTemplateMenuOpen(false)}
                                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mt-1"
                                    >
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                Plain CSV (.csv)
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                Standard comma-separated format compatible with any software.
                                            </p>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Wizard Stepper Bar */}
                <GlassCard className="p-3 sm:p-4" animate={false}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                        {[
                            { number: 1, title: 'Upload', desc: 'Select Excel or CSV file', icon: Upload },
                            { number: 2, title: 'Match columns', desc: 'Map file headers to fields', icon: SlidersHorizontal },
                            { number: 3, title: 'Review', desc: 'Verify stock & warnings', icon: FileCheck2 },
                            { number: 4, title: 'Import & result', desc: 'Execute & view summary', icon: Sparkles },
                        ].map((s) => {
                            const isCompleted = step > s.number;
                            const isCurrent = step === s.number;
                            const isUpcoming = step < s.number;
                            const canClick = isCompleted || isCurrent;

                            return (
                                <button
                                    key={s.number}
                                    type="button"
                                    disabled={!canClick || isImporting}
                                    onClick={() => {
                                        if (canClick && !isImporting) setStep(s.number as any);
                                    }}
                                    className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl text-left transition-all relative ${
                                        isCurrent
                                            ? 'bg-primary/10 border-2 border-primary text-primary shadow-sm dark:bg-primary/20'
                                            : isCompleted
                                            ? 'bg-slate-50/80 dark:bg-slate-800/50 border border-emerald-500/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            : 'opacity-50 border border-slate-200/50 dark:border-white/5 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${
                                            isCompleted
                                                ? 'bg-emerald-600 text-white'
                                                : isCurrent
                                                ? 'bg-primary text-white shadow-md shadow-primary/25'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                        }`}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs sm:text-sm font-bold truncate">
                                            {s.title}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                                            {s.desc}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </GlassCard>

                {/* Error Banner */}
                {uploadError && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 shadow-sm animate-shake">
                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-bold">Import issue</h4>
                            <p className="mt-0.5 text-xs sm:text-sm">{uploadError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setUploadError(null)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* STEP 1: UPLOAD FILE                                                       */}
                {/* ========================================================================= */}
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Upload Area */}
                        <GlassCard className="p-6 lg:col-span-2 space-y-6 flex flex-col justify-between" animate={false}>
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary" />
                                        <span>Step 1: Upload stock spreadsheet</span>
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Select your opening stock records or supplier delivery invoices in Excel (.xlsx) or CSV format.
                                    </p>
                                </div>

                                {/* Drag and Drop Zone */}
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                                        isDragging
                                            ? 'border-primary bg-primary/10 scale-[1.01]'
                                            : file
                                            ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20'
                                            : 'border-slate-200/90 dark:border-white/10 hover:border-primary/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                    />

                                    {file ? (
                                        <div className="space-y-3">
                                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                                                <FileCheck2 className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white break-all">
                                                    {file.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {(file.size / 1024).toFixed(1)} KB · Ready to match columns
                                                </p>
                                            </div>
                                            <div className="pt-2 flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fileInputRef.current?.click();
                                                    }}
                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                                                >
                                                    Change file
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFile(null);
                                                    }}
                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 flex items-center gap-1.5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                                                <FileSpreadsheet className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                                    Drop your Excel or CSV file here
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    or <span className="text-primary font-semibold underline underline-offset-2">browse computer</span>
                                                </div>
                                            </div>
                                            <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">.xlsx</span>
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">.csv</span>
                                                <span>· Max 5 MB · Up to 2,000 rows</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="pt-6 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {file ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" />
                                            File verified and ready
                                        </span>
                                    ) : (
                                        <span>No file selected yet</span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleParseFile()}
                                    disabled={uploading}
                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Analyzing file...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Continue</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </GlassCard>

                        {/* Side Panel: What your file needs */}
                        <GlassCard className="p-6 space-y-6" animate={false}>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Info className="w-4 h-4 text-primary" />
                                    <span>What your file needs</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Format guidelines for instant matching
                                </p>
                            </div>

                            {/* Required Columns Chips */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                                    Required Columns (6)
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Generic name', 'Strength', 'Dosage form', 'Batch number', 'Expiry date', 'Quantity'].map((col) => (
                                        <span
                                            key={col}
                                            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
                                        >
                                            {col} *
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Columns Chips */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                                    Optional Columns
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Barcode', 'Brand name', 'Manufacturer', 'Base unit', 'Cost price', 'Selling price', 'Supplier name', 'Invoice number'].map((col) => (
                                        <span
                                            key={col}
                                            className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-white/5"
                                        >
                                            {col}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Date Formats Table */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                                    Accepted Date Formats
                                </span>
                                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden text-xs">
                                    <div className="grid grid-cols-2 p-2 bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10">
                                        <span>Format</span>
                                        <span>Evaluates to</span>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-white/5 text-[11px]">
                                        <div className="grid grid-cols-2 p-2 font-mono">
                                            <span className="text-primary font-bold">05/06/2027</span>
                                            <span className="text-slate-600 dark:text-slate-300">5 June 2027 (DD/MM)</span>
                                        </div>
                                        <div className="grid grid-cols-2 p-2 font-mono">
                                            <span>25.12.2026</span>
                                            <span className="text-slate-600 dark:text-slate-300">25 Dec 2026</span>
                                        </div>
                                        <div className="grid grid-cols-2 p-2 font-mono">
                                            <span>2026-12-25</span>
                                            <span className="text-slate-600 dark:text-slate-300">25 Dec 2026</span>
                                        </div>
                                        <div className="grid grid-cols-2 p-2 font-mono">
                                            <span>Excel Serial</span>
                                            <span className="text-slate-600 dark:text-slate-300">Auto-detected</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rules Callouts */}
                            <div className="space-y-2.5 pt-2">
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                                    <Layers className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                    <span>
                                        <strong>Multi-batch rule:</strong> Multiple rows with the same medicine create separate stock batches without duplicating the medicine.
                                    </span>
                                </div>

                                <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 text-xs flex items-start gap-2.5">
                                    <FileText className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
                                    <span>
                                        <strong>Opening stock vs GRN:</strong> Rows with empty supplier/invoice are imported as opening stock. Rows with supplier and invoice generate GRN receipts.
                                    </span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* STEP 2: MATCH COLUMNS                                                     */}
                {/* ========================================================================= */}
                {step === 2 && (
                    <GlassCard className="p-6 space-y-6" animate={false}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                                    <span>Step 2: Match file columns</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    We auto-detected column matches based on your headers. Confirm or adjust the mappings below.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {unmatchedRequiredFields.length > 0 ? (
                                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4" />
                                        {unmatchedRequiredFields.length} required field{unmatchedRequiredFields.length > 1 ? 's' : ''} unmatched
                                    </span>
                                ) : (
                                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" />
                                        All required fields matched
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Column Mapping Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {CANONICAL_FIELDS.map((field) => {
                                const selectedHeader = columnMapping[field.key] || '';
                                const isMatched = Boolean(selectedHeader);
                                const headerIndex = headers.indexOf(selectedHeader);

                                // Sample preview values from first 3 rows
                                const sampleValues = sampleRows
                                    .map((row) => (headerIndex >= 0 ? row[headerIndex] : ''))
                                    .filter(Boolean)
                                    .slice(0, 3);

                                return (
                                    <div
                                        key={field.key}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            field.required && !isMatched
                                                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-sm'
                                                : isMatched
                                                ? 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/10'
                                                : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 opacity-80'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {field.label}
                                                </label>
                                                {field.required ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                                                        Optional
                                                    </span>
                                                )}
                                            </div>

                                            {isMatched && (
                                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <Check className="w-3.5 h-3.5" />
                                                    Matched
                                                </span>
                                            )}
                                        </div>

                                        {/* Dropdown selector */}
                                        <select
                                            value={selectedHeader}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setColumnMapping((prev) => ({
                                                    ...prev,
                                                    [field.key]: val,
                                                }));
                                            }}
                                            className={`w-full text-xs font-medium rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                                                field.required && !isMatched
                                                    ? 'border-rose-400 dark:border-rose-700'
                                                    : 'border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            <option value="">— Do not map —</option>
                                            {headers.map((h) => (
                                                <option key={h} value={h}>
                                                    Column: "{h}"
                                                </option>
                                            ))}
                                        </select>

                                        {/* Sample preview values */}
                                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {sampleValues.length > 0 ? (
                                                <span>
                                                    <strong>Sample:</strong> {sampleValues.map((v) => `"${v}"`).join(', ')}
                                                </span>
                                            ) : (
                                                <span className="italic">{field.description}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Options & Action Bar */}
                        <div className="pt-6 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={rememberMapping}
                                    onChange={(e) => setRememberMapping(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                                />
                                <span>Remember this column mapping for next time</span>
                            </label>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                                >
                                    Back to file
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleParseFile(columnMapping)}
                                    disabled={uploading || unmatchedRequiredFields.length > 0}
                                    className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Applying mapping...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Continue to review</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {/* ========================================================================= */}
                {/* STEP 3: REVIEW & PREVIEW                                                  */}
                {/* ========================================================================= */}
                {step === 3 && (
                    <div className="space-y-6">
                        {/* Duplicate File Warning Banner */}
                        {isDuplicateFile && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="font-bold">Re-import warning: identical file detected</h4>
                                    <p>
                                        This exact spreadsheet was previously imported on{' '}
                                        <strong>
                                            {duplicateFileInfo?.imported_at ? formatDateLK(duplicateFileInfo.imported_at) : 'earlier date'}
                                        </strong>
                                        . Proceeding will add additional batches to your existing inventory.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Summary Filter Chips */}
                        <GlassCard className="p-4 sm:p-5" animate={false}>
                            <div className="flex flex-wrap items-center gap-2">
                                {[
                                    { id: 'all', label: 'All rows', count: totalRows, badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white' },
                                    { id: 'ready', label: 'Ready', count: validRowsCount - warningRowsCount, badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' },
                                    { id: 'warnings', label: 'Warnings', count: warningRowsCount, badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' },
                                    { id: 'errors', label: 'Errors', count: errorRowsCount, badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' },
                                    { id: 'new', label: 'New medicines', count: newMedicinesCount, badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' },
                                    { id: 'existing', label: 'Existing medicines', count: existingMedicinesCount, badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' },
                                    { id: 'batches', label: 'Batches', count: batchesCount, badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
                                    { id: 'opening', label: 'Opening stock', count: openingStockCount, badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' },
                                    { id: 'grn', label: 'GRN invoices', count: grnGroupsCount, badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' },
                                ].map((tab) => {
                                    const active = reviewFilter === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => {
                                                setReviewFilter(tab.id as any);
                                                setPage(1);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                                active
                                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <span>{tab.label}</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor}`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </GlassCard>

                        {/* Preview Table Container (Rigidly contained horizontally with scroll) */}
                        <GlassCard className="p-0 overflow-hidden" animate={false}>
                            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Import preview ({filteredRows.length} rows)
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Showing page {page} of {totalPages}. Click "Edit" on any row to quickly correct values.
                                    </p>
                                </div>

                                {errorRowsCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={downloadErrorRowsCsv}
                                        className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-rose-100 transition-colors shadow-sm"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download error rows ({errorRowsCount} CSV)</span>
                                    </button>
                                )}
                            </div>

                            {/* Table */}
                            <div className="w-full overflow-x-auto min-w-0 max-w-full">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                                            <th className="py-3 px-3 w-12 text-center">#</th>
                                            <th className="py-3 px-3 w-28">Status</th>
                                            <th className="py-3 px-4 min-w-[200px]">Medicine</th>
                                            <th className="py-3 px-3">Batch</th>
                                            <th className="py-3 px-3">Expiry</th>
                                            <th className="py-3 px-3 text-right">Qty</th>
                                            <th className="py-3 px-3 text-right">Cost</th>
                                            <th className="py-3 px-3 text-right">Sell Price</th>
                                            <th className="py-3 px-3">Supplier / Invoice</th>
                                            <th className="py-3 px-4 min-w-[200px]">Validation & Messages</th>
                                            <th className="py-3 px-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {paginatedRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                                                    No rows match the selected filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedRows.map((row) => {
                                                const isRowEditing = editingRowIndex === row.row_index;
                                                const isError = row.status === 'error';
                                                const hasWarnings = row.warnings && row.warnings.length > 0;
                                                const isOpening = !row.data.supplier_name && !row.data.invoice_number;

                                                return (
                                                    <tr
                                                        key={row.row_index}
                                                        className={`transition-colors ${
                                                            isError
                                                                ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                                                                : hasWarnings
                                                                ? 'bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/60'
                                                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                                        }`}
                                                    >
                                                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                                                            {row.row_index}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-3 px-3 whitespace-nowrap">
                                                            {isError ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                                                    <XCircle className="w-3 h-3" />
                                                                    Error
                                                                </span>
                                                            ) : row.status === 'new_medicine' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                                                    <Sparkles className="w-3 h-3" />
                                                                    New med
                                                                </span>
                                                            ) : hasWarnings ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Warning
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Ready
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Medicine */}
                                                        <td className="py-3 px-4">
                                                            <div className="font-bold text-slate-900 dark:text-white">
                                                                {row.data.brand_name ? `${row.data.brand_name} · ` : ''}
                                                                {row.data.generic_name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                                <span>{row.data.strength}</span>
                                                                <span>·</span>
                                                                <span>{row.data.dosage_form}</span>
                                                                {row.is_existing_medicine && (
                                                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                                                        (Adds to existing clinic stock)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Batch */}
                                                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                                                            {isRowEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editFormData.batch_number}
                                                                    onChange={(e) =>
                                                                        setEditFormData((p) => ({ ...p, batch_number: e.target.value }))
                                                                    }
                                                                    className="w-24 text-xs px-2 py-1 rounded-lg border border-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                                />
                                                            ) : (
                                                                <span>{row.data.batch_number}</span>
                                                            )}
                                                        </td>

                                                        {/* Expiry Date */}
                                                        <td className="py-3 px-3 whitespace-nowrap">
                                                            {isRowEditing ? (
                                                                <input
                                                                    type="date"
                                                                    value={editFormData.expiry_date}
                                                                    onChange={(e) =>
                                                                        setEditFormData((p) => ({ ...p, expiry_date: e.target.value }))
                                                                    }
                                                                    className="text-xs px-2 py-1 rounded-lg border border-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                                />
                                                            ) : row.data.expiry_date ? (
                                                                <span
                                                                    className={`font-semibold ${
                                                                        new Date(row.data.expiry_date) <= new Date()
                                                                            ? 'text-rose-600 dark:text-rose-400'
                                                                            : new Date(row.data.expiry_date) < new Date(Date.now() + 90 * 86400000)
                                                                            ? 'text-amber-600 dark:text-amber-400'
                                                                            : 'text-emerald-600 dark:text-emerald-400'
                                                                    }`}
                                                                >
                                                                    {formatDateLK(row.data.expiry_date)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-rose-500 font-bold">Missing</span>
                                                            )}
                                                        </td>

                                                        {/* Quantity */}
                                                        <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                            {isRowEditing ? (
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={editFormData.quantity}
                                                                    onChange={(e) =>
                                                                        setEditFormData((p) => ({ ...p, quantity: Number(e.target.value) }))
                                                                    }
                                                                    className="w-20 text-xs px-2 py-1 rounded-lg border border-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right"
                                                                />
                                                            ) : (
                                                                <span>{row.data.quantity.toLocaleString()}</span>
                                                            )}
                                                        </td>

                                                        {/* Cost Price */}
                                                        <td className="py-3 px-3 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                                                            {isRowEditing ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editFormData.cost_price_rupees}
                                                                    onChange={(e) =>
                                                                        setEditFormData((p) => ({ ...p, cost_price_rupees: Number(e.target.value) }))
                                                                    }
                                                                    className="w-20 text-xs px-2 py-1 rounded-lg border border-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right"
                                                                />
                                                            ) : (
                                                                formatLKR(row.data.cost_price_cents)
                                                            )}
                                                        </td>

                                                        {/* Selling Price */}
                                                        <td className="py-3 px-3 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                                                            {isRowEditing ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={editFormData.selling_price_rupees}
                                                                    onChange={(e) =>
                                                                        setEditFormData((p) => ({ ...p, selling_price_rupees: Number(e.target.value) }))
                                                                    }
                                                                    className="w-20 text-xs px-2 py-1 rounded-lg border border-primary bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right"
                                                                />
                                                            ) : (
                                                                formatLKR(row.data.selling_price_cents)
                                                            )}
                                                        </td>

                                                        {/* Supplier / Invoice */}
                                                        <td className="py-3 px-3 whitespace-nowrap">
                                                            {isOpening ? (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50">
                                                                    Opening stock
                                                                </span>
                                                            ) : (
                                                                <div>
                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                        {row.data.supplier_name || 'General'}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-slate-500">
                                                                        {row.data.invoice_number}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Messages / Warnings / Errors */}
                                                        <td className="py-3 px-4">
                                                            {row.errors.length > 0 && (
                                                                <div className="text-rose-600 dark:text-rose-400 font-semibold space-y-0.5">
                                                                    {row.errors.map((e, idx) => (
                                                                        <div key={idx} className="flex items-start gap-1">
                                                                            <span>•</span>
                                                                            <span>{e}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {row.warnings && row.warnings.length > 0 && (
                                                                <div className="text-amber-700 dark:text-amber-300 space-y-0.5 mt-0.5">
                                                                    {row.warnings.map((w, idx) => (
                                                                        <div key={idx} className="flex items-start gap-1">
                                                                            <span>•</span>
                                                                            <span>{w}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {row.errors.length === 0 && (!row.warnings || row.warnings.length === 0) && (
                                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                                    Valid and ready to import
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Inline Actions */}
                                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                                            {isRowEditing ? (
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => saveEditingRow(row.row_index)}
                                                                        className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                                                        title="Save changes"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingRowIndex(null)}
                                                                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                                        title="Cancel"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditingRow(row)}
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                    title="Edit row directly"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Showing {(page - 1) * rowsPerPage + 1} to{' '}
                                        {Math.min(page * rowsPerPage, filteredRows.length)} of {filteredRows.length} rows
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-40"
                                        >
                                            Previous
                                        </button>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {page} / {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* Review Summary & Confirmation Bar */}
                        <GlassCard className="p-6 space-y-6" animate={false}>
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                {/* Totals stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                                        <div className="text-[11px] font-semibold text-slate-500 uppercase">
                                            Total Units
                                        </div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                            {totalUnits.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                                        <div className="text-[11px] font-semibold text-slate-500 uppercase">
                                            Stock Value (Cost)
                                        </div>
                                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {formatLKR(totalCostCents)}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                                        <div className="text-[11px] font-semibold text-slate-500 uppercase">
                                            Batches
                                        </div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                            {batchesCount}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                                        <div className="text-[11px] font-semibold text-slate-500 uppercase">
                                            Receipts / Opening
                                        </div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                                            {grnGroupsCount} GRN / {openingStockCount} Open
                                        </div>
                                    </div>
                                </div>

                                {/* Skip error rows option */}
                                {errorRowsCount > 0 && (
                                    <label className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={skipErrors}
                                            onChange={(e) => setSkipErrors(e.target.checked)}
                                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                                        />
                                        <span className="text-xs text-rose-900 dark:text-rose-200">
                                            <strong>Skip {errorRowsCount} row{errorRowsCount > 1 ? 's' : ''} with errors</strong> and import the remaining {validRowsCount} valid rows
                                        </span>
                                    </label>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm transition-colors"
                                >
                                    Back to match columns
                                </button>

                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={validRowsCount === 0 || (!skipErrors && errorRowsCount > 0)}
                                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                        Import {skipErrors ? validRowsCount : totalRows} rows into inventory
                                    </span>
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* STEP 4: IMPORT & RESULT                                                   */}
                {/* ========================================================================= */}
                {step === 4 && (
                    <GlassCard className="p-8 sm:p-12 text-center space-y-8 max-w-3xl mx-auto" animate={false}>
                        {isImporting ? (
                            <div className="space-y-6 py-6" aria-live="polite">
                                <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                                    <RefreshCw className="w-10 h-10 animate-spin" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        Importing stock batches...
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                        Recording inventory ledger movements, creating GRN receipts, and saving batches safely inside a single database transaction.
                                    </p>
                                </div>

                                {/* Animated Progress Bar */}
                                <div className="max-w-md mx-auto space-y-2">
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80 dark:border-white/10">
                                        <div
                                            className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-300"
                                            style={{ width: `${importProgress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-500">
                                        {importProgress}% completed
                                    </span>
                                </div>
                            </div>
                        ) : importResult ? (
                            <div className="space-y-8" aria-live="polite">
                                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                                    <Sparkles className="w-10 h-10" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                                        Stock import complete!
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                                        All verified batches have been successfully added to your clinic pharmacy stock ledger.
                                    </p>
                                </div>

                                {/* Summary Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-left">
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5">
                                        <span className="text-[11px] uppercase font-bold text-slate-400">
                                            Imported rows
                                        </span>
                                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                            {importResult.total_imported.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5">
                                        <span className="text-[11px] uppercase font-bold text-slate-400">
                                            Batches created
                                        </span>
                                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                            {importResult.created_batches.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5">
                                        <span className="text-[11px] uppercase font-bold text-slate-400">
                                            New medicines
                                        </span>
                                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                            {importResult.created_medicines.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5">
                                        <span className="text-[11px] uppercase font-bold text-slate-400">
                                            GRNs created
                                        </span>
                                        <div className="text-xl font-bold text-primary mt-1">
                                            {importResult.created_receipts.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5">
                                        <span className="text-[11px] uppercase font-bold text-slate-400">
                                            Opening stock entries
                                        </span>
                                        <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                                            {importResult.opening_stock_batches.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5">
                                        <span className="text-[11px] uppercase font-bold text-slate-400">
                                            Total inventory value
                                        </span>
                                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                            {formatLKR(importResult.total_value_cents)}
                                        </div>
                                    </div>
                                </div>

                                {/* GRN receipt links */}
                                {importResult.receipt_records && importResult.receipt_records.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 text-left space-y-2">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Created GRN receipts:
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {importResult.receipt_records.map((rec) => (
                                                <Link
                                                    key={rec.id}
                                                    href={route('tenant.pharmacy.receipts')}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-primary hover:underline shadow-sm"
                                                >
                                                    <span>{rec.receipt_number}</span>
                                                    <span className="text-[10px] text-slate-400">({rec.supplier_name})</span>
                                                    <ExternalLink className="w-3 h-3 text-slate-400" />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="pt-6 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-center gap-3">
                                    <Link
                                        href={route('tenant.pharmacy.medicines')}
                                        className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
                                    >
                                        <Boxes className="w-4 h-4" />
                                        <span>View stock catalog</span>
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={downloadImportReportCsv}
                                        className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Download import report</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetWizard}
                                        className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Import another file</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </GlassCard>
                )}
            </div>

            {/* Import History Modal */}
            <GlassModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                title="Stock import history"
                subtitle="Recent batch import events recorded in your clinic audit log"
                maxWidth="max-w-3xl"
            >
                <div className="space-y-4">
                    {isLoadingHistory ? (
                        <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                            <span>Loading past import events...</span>
                        </div>
                    ) : historyList.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            No past stock import records found for this clinic.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {historyList.map((item) => {
                                const meta = item.metadata || {};
                                return (
                                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {meta.file_name || 'Import spreadsheet'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                    Successful
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                <span>Imported by {item.user_name}</span>
                                                <span>·</span>
                                                <span>{formatDateLK(item.created_at)}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 flex flex-wrap gap-3">
                                                <span><strong>{meta.total_rows ?? 0}</strong> rows</span>
                                                <span><strong>{meta.created_batches ?? 0}</strong> batches</span>
                                                <span><strong>{meta.created_receipts ?? 0}</strong> GRNs</span>
                                                {meta.total_value_cents && (
                                                    <span>Value: <strong>{formatLKR(meta.total_value_cents)}</strong></span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <span className="text-[11px] font-mono text-slate-400 block">
                                                {formatDateDMY(item.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
