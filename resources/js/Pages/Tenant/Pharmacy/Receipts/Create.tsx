import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import { GlassInput, GlassLabel, GlassError, GlassTextarea } from '@/Components/UI/FormControls';
import BarcodeScanner from '@/Components/Pharmacy/BarcodeScanner';
import LinkBarcodeModal, { LinkedBarcodeResult } from '@/Components/Pharmacy/LinkBarcodeModal';
import { formatLKR } from '@/Utils/formatters';
import { useDebounce } from '@/Hooks/useDebounce';
import {
    applyBarcodeScanToLines,
    ScannableLineItem,
} from '@/Utils/barcodeScannerLogic';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Barcode,
    Search,
    Truck,
    Calendar,
    FileText,
    Receipt,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    X,
    Package,
    Calculator,
    RotateCcw,
} from 'lucide-react';

interface SupplierItem {
    id: number;
    name: string;
    phone?: string | null;
}

export type ReceiptLineItem = ScannableLineItem;

interface Props {
    suppliers: SupplierItem[];
    defaultDate: string;
}

export default function ReceiveStockCreate({ suppliers, defaultDate }: Props) {
    const { auth, tenant } = usePage<any>().props;
    const DRAFT_STORAGE_KEY = `medvisit_grn_draft_${tenant?.id || 'default'}_${auth?.user?.id || 'guest'}`;

    const [supplierId, setSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [receivedDate, setReceivedDate] = useState(defaultDate);
    const [notes, setNotes] = useState('');

    const [items, setItems] = useState<ReceiptLineItem[]>([]);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isLookupInProgress, setIsLookupInProgress] = useState(false);
    const [unlinkedBarcode, setUnlinkedBarcode] = useState<string | null>(null);

    // Banner & Toast feedback
    const [bannerNotice, setBannerNotice] = useState<{
        type: 'success' | 'amber' | 'error';
        message: string;
        action?: { label: string; onClick: () => void };
    } | null>(null);
    const [toast, setToast] = useState<{
        type: 'success' | 'amber' | 'error';
        message: string;
    } | null>(null);

    // Draft autosave state & prompt
    const [draftNotice, setDraftNotice] = useState<{
        savedAt: string;
        itemsCount: number;
        draft: any;
    } | null>(null);
    const hasLoadedDraftRef = useRef(false);

    // Safety warning for >20 duplicate lines
    const [safetyWarning, setSafetyWarning] = useState<{
        medicineName: string;
        count: number;
    } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Check for existing draft on initial mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                const hasLines = Array.isArray(parsed.items) && parsed.items.length > 0;
                const hasMeta = parsed.invoiceNumber || parsed.notes || parsed.supplierId;
                if (hasLines || hasMeta) {
                    setDraftNotice({
                        savedAt: parsed.savedAt
                            ? new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'a previous session',
                        itemsCount: parsed.items?.length || 0,
                        draft: parsed,
                    });
                }
            }
        } catch {
            // ignore JSON parse error
        }
        hasLoadedDraftRef.current = true;
    }, [DRAFT_STORAGE_KEY]);

    // Autosave draft debounced (600ms)
    useEffect(() => {
        if (!hasLoadedDraftRef.current) return;
        if (typeof window === 'undefined') return;

        if (items.length === 0 && !invoiceNumber && !notes && !supplierId) {
            try {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            } catch {}
            return;
        }

        const timer = setTimeout(() => {
            try {
                localStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({
                        supplierId,
                        invoiceNumber,
                        receivedDate,
                        notes,
                        items,
                        savedAt: new Date().toISOString(),
                    })
                );
            } catch {
                // localStorage quota full or private mode
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [supplierId, invoiceNumber, receivedDate, notes, items, DRAFT_STORAGE_KEY]);

    const clearDraftStorage = () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            } catch {}
        }
    };

    const handleRestoreDraft = () => {
        if (!draftNotice?.draft) return;
        const d = draftNotice.draft;
        if (d.supplierId) setSupplierId(String(d.supplierId));
        if (d.invoiceNumber) setInvoiceNumber(d.invoiceNumber);
        if (d.receivedDate) setReceivedDate(d.receivedDate);
        if (d.notes) setNotes(d.notes);
        if (Array.isArray(d.items)) setItems(d.items);

        setDraftNotice(null);
        setToast({
            type: 'success',
            message: `Restored unsaved GRN draft (${d.items?.length || 0} line items).`,
        });
    };

    const handleDiscardDraft = () => {
        clearDraftStorage();
        setDraftNotice(null);
        setToast({
            type: 'amber',
            message: 'Unsaved draft discarded.',
        });
    };

    const handleCancel = () => {
        if (items.length > 0 || invoiceNumber || notes) {
            if (window.confirm('Discard unsaved GRN draft and return to stock list?')) {
                clearDraftStorage();
                router.visit(route('tenant.pharmacy.medicines'));
            }
        } else {
            clearDraftStorage();
            router.visit(route('tenant.pharmacy.medicines'));
        }
    };

    const handleClearAllLines = () => {
        if (items.length === 0) return;
        if (window.confirm(`Are you sure you want to remove all ${items.length} lines from this GRN?`)) {
            setItems([]);
            clearDraftStorage();
            setToast({
                type: 'amber',
                message: 'All GRN line items removed.',
            });
        }
    };

    // Search Catalog for adding line items
    const [catalogSearch, setCatalogSearch] = useState('');
    const debouncedCatalogSearch = useDebounce(catalogSearch, 250);
    const [catalogResults, setCatalogResults] = useState<any[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

    // Quick Supplier Modal
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierPhone, setNewSupplierPhone] = useState('');
    const [creatingSupplier, setCreatingSupplier] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Debounced catalog search
    useEffect(() => {
        if (!debouncedCatalogSearch.trim()) {
            setCatalogResults([]);
            return;
        }

        setCatalogLoading(true);
        fetch(`/pharmacy/catalog/search?q=${encodeURIComponent(debouncedCatalogSearch.trim())}`)
            .then((res) => res.json())
            .then((data) => {
                setCatalogResults(data.results || []);
                setSearchDropdownOpen(true);
            })
            .catch((err) => console.error('Catalog search error:', err))
            .finally(() => setCatalogLoading(false));
    }, [debouncedCatalogSearch]);

    // Add item from catalog search
    const handleSelectCatalogItem = (res: any) => {
        const newItem: ReceiptLineItem = {
            clinic_medicine_id: res.clinic_medicine_id || null,
            medicine_variant_id: res.variant_id,
            medicine_brand_id: res.brand_id || null,
            display_name: res.display_name,
            generic_name: res.generic_name,
            brand_name: res.brand_name || null,
            base_unit: res.base_unit || (
                res.dosage_form?.toLowerCase().includes('syrup')
                    ? 'ml'
                    : res.dosage_form?.toLowerCase().includes('inhaler')
                    ? 'dose'
                    : 'tablet'
            ),
            batch_number: '',
            expiry_date: '',
            quantity: 100,
            cost_price: '',
            selling_price: '',
        };

        setItems((prev) => [...prev, newItem]);
        setCatalogSearch('');
        setSearchDropdownOpen(false);
    };

    // Handle Barcode Scan
    const handleBarcodeDetected = (code: string) => {
        const trimmedCode = code.trim();
        if (!trimmedCode) return;

        setIsLookupInProgress(true);
        setBannerNotice(null);

        fetch(`/pharmacy/barcodes/${encodeURIComponent(trimmedCode)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.found) {
                    const packSize = Number(data.pack_size) || 1;
                    const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;

                    // Update items via applyBarcodeScanToLines (increments existing most recent line or adds 1 line)
                    setItems((prev) => {
                        const result = applyBarcodeScanToLines(prev, {
                            clinic_medicine_id: data.clinic_medicine_id || null,
                            variant_id: data.variant_id,
                            brand_id: data.brand_id ?? null,
                            display_name: displayName,
                            generic_name: data.generic_name,
                            brand_name: data.brand_name ?? null,
                            base_unit: data.base_unit || 'tablet',
                            pack_size: packSize,
                        });

                        if (result.action === 'incremented') {
                            setToast({
                                type: 'success',
                                message: `${displayName}: Qty incremented to ${result.quantity} ${data.base_unit || 'tablets'} (Line #${result.lineIndex + 1})`,
                            });
                        } else {
                            setToast({
                                type: 'success',
                                message: `${displayName} +${packSize} ${data.base_unit || 'tablets'} added to GRN`,
                            });
                        }

                        return result.lines;
                    });
                } else {
                    // Unknown barcode -> stop camera stream immediately and open Link Barcode modal
                    setScannerOpen(false);
                    setUnlinkedBarcode(trimmedCode);
                    setBannerNotice({
                        type: 'amber',
                        message: `Barcode ${trimmedCode} is not yet linked to any brand in the catalog.`,
                        action: {
                            label: 'Link this barcode',
                            onClick: () => setUnlinkedBarcode(trimmedCode),
                        },
                    });
                }
            })
            .catch(() => {
                setBannerNotice({
                    type: 'error',
                    message: `Failed to check barcode ${trimmedCode}. Please try again.`,
                });
            })
            .finally(() => {
                setIsLookupInProgress(false);
            });
    };

    // Duplicate medicine with empty batch/expiry/quantity for another batch
    const duplicateBatchLine = (index: number) => {
        const source = items[index];
        const newLine: ReceiptLineItem = {
            clinic_medicine_id: source.clinic_medicine_id,
            medicine_variant_id: source.medicine_variant_id,
            medicine_brand_id: source.medicine_brand_id,
            display_name: source.display_name,
            generic_name: source.generic_name,
            brand_name: source.brand_name,
            base_unit: source.base_unit,
            batch_number: '',
            expiry_date: '',
            pack_size: source.pack_size,
            quantity: 0,
            cost_price: source.cost_price || '',
            selling_price: source.selling_price || '',
        };

        setItems((prev) => {
            const next = [...prev];
            next.splice(index + 1, 0, newLine);
            return next;
        });

        setToast({
            type: 'success',
            message: `Added another batch line for ${source.display_name}`,
        });
    };

    // Callback when barcode is linked via LinkBarcodeModal
    const handleBarcodeLinked = (data: LinkedBarcodeResult) => {
        const packSize = Number(data.pack_size) || 1;
        const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;

        // Ensure item is added as a line in the current GRN with quantity = 1 pack (or incremented if already present)
        setItems((prev) => {
            const result = applyBarcodeScanToLines(prev, {
                clinic_medicine_id: data.clinic_medicine_id || null,
                variant_id: data.variant_id,
                brand_id: data.brand_id ?? null,
                display_name: displayName,
                generic_name: data.generic_name,
                brand_name: data.brand_name ?? null,
                base_unit: data.base_unit || 'tablet',
                pack_size: packSize,
            });

            if (result.action === 'incremented') {
                setToast({
                    type: 'success',
                    message: `${displayName}: Qty incremented to ${result.quantity} ${data.base_unit || 'tablets'} (Line #${result.lineIndex + 1})`,
                });
            } else {
                setToast({
                    type: 'success',
                    message: `${displayName} +${packSize} ${data.base_unit || 'tablets'} added to GRN`,
                });
            }

            return result.lines;
        });

        setBannerNotice({
            type: 'success',
            message: `Barcode ${data.barcode} linked successfully and added to GRN line items.`,
        });
        setUnlinkedBarcode(null);
    };

    // Update item field
    const updateItem = (index: number, field: keyof ReceiptLineItem, value: any) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // Remove item
    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    // Quick Supplier creation
    const handleCreateSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;

        setCreatingSupplier(true);
        router.post(
            route('tenant.pharmacy.suppliers.store'),
            {
                name: newSupplierName,
                phone: newSupplierPhone,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSupplierModalOpen(false);
                    setNewSupplierName('');
                    setNewSupplierPhone('');
                },
                onFinish: () => setCreatingSupplier(false),
            }
        );
    };

    // Totals
    const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalCostCents = items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        return sum + Math.round(qty * cost * 100);
    }, 0);

    // Form submit execution
    const executeSubmit = (bypassSafety = false) => {
        setErrors({});

        if (items.length === 0) {
            setErrors({ items: 'Please add at least one medicine item to the receipt.' });
            return;
        }

        // Validate items
        const newErrors: Record<string, string> = {};
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (!it.batch_number || !it.batch_number.trim()) {
                newErrors[`items.${i}.batch_number`] = 'Batch number is required (enter "N/A" if none)';
            }
            if (!it.expiry_date) {
                newErrors[`items.${i}.expiry_date`] = 'Expiry date is required';
            } else if (it.expiry_date <= receivedDate) {
                newErrors[`items.${i}.expiry_date`] = `Expiry date must be after the received date (${receivedDate}). Already-expired stock is rejected.`;
            }
            if (!it.quantity || Number(it.quantity) <= 0) {
                newErrors[`items.${i}.quantity`] = `Item #${i + 1} must have a valid quantity > 0.`;
            }
            if (!it.cost_price || parseFloat(it.cost_price) < 0) {
                newErrors[`items.${i}.cost_price`] = `Item #${i + 1} must have a valid cost price.`;
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setToast({
                type: 'error',
                message: 'Please resolve the batch number and expiry date errors before saving.',
            });
            return;
        }

        // Safety check: warn if more than 20 lines of the same medicine
        if (!bypassSafety) {
            const counts: Record<string, { name: string; count: number }> = {};
            for (const it of items) {
                const key = `${it.medicine_variant_id ?? ''}_${it.medicine_brand_id ?? ''}_${it.display_name}`;
                if (!counts[key]) {
                    counts[key] = { name: it.display_name, count: 0 };
                }
                counts[key].count++;
            }
            const excessive = Object.values(counts).find((m) => m.count > 20);
            if (excessive) {
                setSafetyWarning({
                    medicineName: excessive.name,
                    count: excessive.count,
                });
                return;
            }
        }

        setSubmitting(true);
        router.post(
            route('tenant.pharmacy.receipts.store'),
            {
                supplier_id: supplierId ? Number(supplierId) : null,
                invoice_number: invoiceNumber || null,
                received_date: receivedDate,
                notes: notes || null,
                items: items.map((it) => ({
                    clinic_medicine_id: it.clinic_medicine_id || null,
                    medicine_variant_id: it.medicine_variant_id || null,
                    medicine_brand_id: it.medicine_brand_id || null,
                    display_name: it.display_name,
                    base_unit: it.base_unit,
                    batch_number: it.batch_number ? it.batch_number.trim() : 'N/A',
                    expiry_date: it.expiry_date || null,
                    quantity: Number(it.quantity),
                    cost_price: it.cost_price,
                    selling_price: it.selling_price || null,
                })),
            },
            {
                onSuccess: () => {
                    clearDraftStorage();
                },
                onError: (errs) => {
                    setErrors(errs);
                    setSubmitting(false);
                },
            }
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeSubmit(false);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Receive Stock (GRN) — Pharmacy" />

            {/* Floating Toast Notification */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-300">
                    <div
                        className={`p-4 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center gap-3 ${
                            toast.type === 'success'
                                ? 'bg-emerald-600/95 text-white border-emerald-400/50 shadow-emerald-600/20'
                                : toast.type === 'amber'
                                ? 'bg-amber-600/95 text-white border-amber-400/50 shadow-amber-600/20'
                                : 'bg-rose-600/95 text-white border-rose-400/50 shadow-rose-600/20'
                        }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                        )}
                        <span className="text-sm font-semibold">{toast.message}</span>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('tenant.pharmacy.medicines')}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Receipt className="w-6 h-6 text-primary" />
                                Goods Received Note (GRN)
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Record incoming stock, batch numbers, expiry dates, and supplier invoice details
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setScannerOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center gap-2 transition-all border border-emerald-500/20 shadow-sm"
                        >
                            <Barcode className="w-4 h-4" />
                            Scan Barcode
                        </button>
                    </div>
                </div>

                {/* Restore Unsaved GRN Draft Banner */}
                {draftNotice && (
                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-900 dark:text-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-teal-600 text-white shrink-0 shadow-sm shadow-teal-600/30">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Restore unsaved GRN draft?
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    An unsaved draft from {draftNotice.savedAt} with {draftNotice.itemsCount} line items was found on this device.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                type="button"
                                onClick={handleDiscardDraft}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                            >
                                Discard Draft
                            </button>
                            <button
                                type="button"
                                onClick={handleRestoreDraft}
                                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore Unsaved GRN</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Notice Banner */}
                {bannerNotice && (
                    <div
                        className={`p-3.5 rounded-xl border text-sm flex items-center justify-between transition-all ${
                            bannerNotice.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : bannerNotice.type === 'amber'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            {bannerNotice.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : bannerNotice.type === 'amber' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            {bannerNotice.message}
                        </span>
                        <div className="flex items-center gap-2">
                            {bannerNotice.action && (
                                <button
                                    type="button"
                                    onClick={bannerNotice.action.onClick}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors"
                                >
                                    {bannerNotice.action.label}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setBannerNotice(null)}
                                className="text-xs font-semibold opacity-75 hover:opacity-100 px-1 py-0.5"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* GRN Details Card */}
                    <GlassCard className="p-5 sm:p-6 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            Receipt & Supplier Information
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Supplier Selector */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <GlassLabel htmlFor="supplier" className="mb-0">
                                        Supplier
                                    </GlassLabel>
                                    <button
                                        type="button"
                                        onClick={() => setSupplierModalOpen(true)}
                                        className="text-xs text-primary hover:underline font-medium"
                                    >
                                        + New Supplier
                                    </button>
                                </div>
                                <select
                                    id="supplier"
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                                        bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                                        text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 focus:border-primary"
                                >
                                    <option value="">Select a supplier (Optional)</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.phone ? `(${s.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Invoice Number */}
                            <div>
                                <GlassLabel htmlFor="invoiceNumber">Invoice / Delivery #</GlassLabel>
                                <GlassInput
                                    id="invoiceNumber"
                                    placeholder="e.g. INV-2026-0042"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                />
                            </div>

                            {/* Received Date */}
                            <div>
                                <GlassLabel htmlFor="receivedDate" required>
                                    Received Date
                                </GlassLabel>
                                <GlassInput
                                    id="receivedDate"
                                    type="date"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <GlassLabel htmlFor="notes">Notes / PO Reference</GlassLabel>
                                <GlassInput
                                    id="notes"
                                    placeholder="Optional notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {/* GRN Items Section */}
                    <GlassCard className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-primary" />
                                        Received Medicine Items ({items.length})
                                    </h2>
                                    {items.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearAllLines}
                                            className="text-xs px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium flex items-center gap-1 border border-rose-200 dark:border-rose-900/40"
                                            title="Clear all line items"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Clear all</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Search by generic name or brand name to add items, or scan barcodes
                                </p>
                            </div>

                            {/* Catalog Search Autocomplete */}
                            <div className="relative w-full sm:w-80">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Add medicine from catalog..."
                                        value={catalogSearch}
                                        onChange={(e) => setCatalogSearch(e.target.value)}
                                        onFocus={() => {
                                            if (catalogResults.length > 0) setSearchDropdownOpen(true);
                                        }}
                                        className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary outline-none"
                                    />
                                    {catalogLoading && (
                                        <div className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    )}
                                </div>

                                {/* Autocomplete Dropdown */}
                                {searchDropdownOpen && catalogResults.length > 0 && (
                                    <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                                        {catalogResults.map((res, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectCatalogItem(res)}
                                                className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                                        {res.display_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {res.generic_name} • {res.dosage_form}
                                                        {res.brand_name ? ` • Brand: ${res.brand_name}` : ''}
                                                    </div>
                                                </div>
                                                <Plus className="w-4 h-4 text-primary shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {errors.items && <GlassError message={errors.items} />}

                        {/* Items Table / List */}
                        {items.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    No medicines added to this GRN yet
                                </p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                    Use the search box above to add catalog items, or scan barcodes using your camera or handheld scanner
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item, index) => {
                                    const qty = Number(item.quantity) || 0;
                                    const cost = parseFloat(item.cost_price) || 0;
                                    const lineTotalCents = Math.round(qty * cost * 100);

                                    return (
                                        <div
                                            key={index}
                                            className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-3 relative group"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className="text-xs font-bold text-primary mr-2">
                                                        #{index + 1}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {item.display_name}
                                                    </span>
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 uppercase">
                                                        {item.base_unit}
                                                    </span>
                                                    {item.pack_size && item.pack_size > 1 && (
                                                        <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                            ({item.pack_size} {item.base_unit}s/pack)
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => duplicateBatchLine(index)}
                                                        className="px-2.5 py-1 text-xs rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold flex items-center gap-1 transition-colors"
                                                        title="Add another batch of this medicine"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        + Add another batch
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                                {/* Batch Number */}
                                                <div>
                                                    <GlassLabel className="text-[10px]" required>Batch #</GlassLabel>
                                                    <GlassInput
                                                        placeholder="e.g. B2601"
                                                        value={item.batch_number}
                                                        onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                                                        className={errors[`items.${index}.batch_number`] ? 'border-rose-500' : ''}
                                                    />
                                                    {errors[`items.${index}.batch_number`] && (
                                                        <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                            {errors[`items.${index}.batch_number`]}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Expiry Date */}
                                                <div>
                                                    <GlassLabel className="text-[10px]" required>Expiry Date</GlassLabel>
                                                    <GlassInput
                                                        type="date"
                                                        value={item.expiry_date}
                                                        onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                                        className={errors[`items.${index}.expiry_date`] ? 'border-rose-500' : ''}
                                                    />
                                                    {errors[`items.${index}.expiry_date`] && (
                                                        <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                            {errors[`items.${index}.expiry_date`]}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quantity Received in Base Units */}
                                                <div>
                                                    <GlassLabel className="text-[10px]" required>
                                                        Quantity ({item.base_unit}s)
                                                    </GlassLabel>
                                                    <GlassInput
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity || ''}
                                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                        className={errors[`items.${index}.quantity`] ? 'border-rose-500' : ''}
                                                    />
                                                    {errors[`items.${index}.quantity`] && (
                                                        <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                            {errors[`items.${index}.quantity`]}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Cost Price per Unit */}
                                                <div>
                                                    <GlassLabel className="text-[10px]" required>Cost Price/unit (Rs.)</GlassLabel>
                                                    <GlassInput
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={item.cost_price}
                                                        onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                                                        className={errors[`items.${index}.cost_price`] ? 'border-rose-500' : ''}
                                                    />
                                                    {errors[`items.${index}.cost_price`] && (
                                                        <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                            {errors[`items.${index}.cost_price`]}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Selling Price per Unit (Optional update) */}
                                                <div>
                                                    <GlassLabel className="text-[10px]">Sell Price/unit (Rs.)</GlassLabel>
                                                    <GlassInput
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="Optional"
                                                        value={item.selling_price}
                                                        onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                                                    />
                                                </div>

                                                {/* Line Total */}
                                                <div className="flex flex-col justify-end">
                                                    <span className="text-[10px] text-slate-400 font-medium mb-1">Line Total</span>
                                                    <div className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-end font-semibold text-sm text-slate-900 dark:text-white">
                                                        {formatLKR(lineTotalCents)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </GlassCard>

                    {/* GRN Summary & Submit Actions */}
                    <GlassCard className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 text-sm">
                            <div>
                                <span className="text-xs text-slate-400 block">Total Items</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {items.length}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                            <div>
                                <span className="text-xs text-slate-400 block">Total Base Units</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    {totalUnits}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                            <div>
                                <span className="text-xs text-slate-400 block">Estimated GRN Cost</span>
                                <span className="text-xl font-extrabold text-primary">
                                    {formatLKR(totalCostCents)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-center"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={submitting || items.length === 0}
                                className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Saving GRN...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Receive Stock & Create GRN</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </GlassCard>
                </form>
            </div>

            {/* Barcode Scanner Modal with De-dup and Single/Continuous Mode Toggle */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={handleBarcodeDetected}
                isLocked={Boolean(unlinkedBarcode) || isLookupInProgress}
                title="Scan Barcode for GRN"
                allowContinuous={true}
                initialContinuous={false}
            />

            {/* Link Unknown Barcode Modal */}
            <LinkBarcodeModal
                isOpen={Boolean(unlinkedBarcode)}
                barcode={unlinkedBarcode || ''}
                onClose={() => setUnlinkedBarcode(null)}
                onSuccess={handleBarcodeLinked}
                submitLabel="Link & Add to GRN"
            />

            {/* Safety Warning Modal for >20 lines of same medicine */}
            <GlassModal
                isOpen={Boolean(safetyWarning)}
                onClose={() => setSafetyWarning(null)}
                title="Safety Warning: Excessive Duplicate Lines"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-semibold text-sm">
                                {safetyWarning?.count} separate lines detected for:
                            </p>
                            <p className="font-bold text-slate-900 dark:text-white">
                                {safetyWarning?.medicineName}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300 mt-1">
                                This GRN contains {safetyWarning?.count} lines for this medicine. Having more than 20 lines of the same medicine often indicates an accidental camera scanner loop.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setSafetyWarning(null)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            Review Lines
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSafetyWarning(null);
                                executeSubmit(true);
                            }}
                            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20"
                        >
                            Confirm & Submit Anyway
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* Quick Add Supplier Modal */}
            <GlassModal
                isOpen={supplierModalOpen}
                onClose={() => setSupplierModalOpen(false)}
                title="Add New Supplier"
            >
                <form onSubmit={handleCreateSupplier} className="space-y-4">
                    <div>
                        <GlassLabel htmlFor="newSupplierName" required>
                            Supplier Name
                        </GlassLabel>
                        <GlassInput
                            id="newSupplierName"
                            placeholder="e.g. Astron Limited"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <GlassLabel htmlFor="newSupplierPhone">Phone Number</GlassLabel>
                        <GlassInput
                            id="newSupplierPhone"
                            placeholder="+94 11 234 5678"
                            value={newSupplierPhone}
                            onChange={(e) => setNewSupplierPhone(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                            type="button"
                            onClick={() => setSupplierModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creatingSupplier || !newSupplierName.trim()}
                            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-50"
                        >
                            {creatingSupplier ? 'Creating...' : 'Save Supplier'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
