import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import { GlassInput, GlassLabel, GlassError, GlassTextarea } from '@/Components/UI/FormControls';
import DatePickerLK from '@/Components/UI/DatePickerLK';
import BarcodeScanner from '@/Components/Pharmacy/BarcodeScanner';
import LinkBarcodeModal, { LinkedBarcodeResult } from '@/Components/Pharmacy/LinkBarcodeModal';
import { formatLKR, formatDateLK } from '@/Utils/formatters';
import { useDebounce } from '@/Hooks/useDebounce';
import { applyBarcodeScanToLines, ScannableLineItem } from '@/Utils/barcodeScannerLogic';
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
    RotateCcw,
    Printer,
    Boxes,
    TrendingUp,
    TrendingDown,
    Check,
    DollarSign,
    Sparkles,
    ShieldCheck,
    Tag,
} from 'lucide-react';

interface SupplierItem {
    id: number;
    name: string;
    phone?: string | null;
}

export interface ReceiptLineItem extends ScannableLineItem {
    dosage_form?: string;
    free_quantity?: number;
    pack_quantity?: number;
    is_packs_mode?: boolean;
    last_cost_price?: number | null; // in Rupees
    update_selling_price?: boolean;
}

interface Props {
    suppliers: SupplierItem[];
    defaultDate: string;
}

export default function ReceiveStockCreate({ suppliers: initialSuppliers, defaultDate }: Props) {
    const { auth, tenant } = usePage<any>().props;
    const DRAFT_STORAGE_KEY = `medvisit_grn_draft_${tenant?.id || 'default'}_${auth?.user?.id || 'guest'}`;

    const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
    const [supplierId, setSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [receivedDate, setReceivedDate] = useState(defaultDate);
    const [invoiceTotal, setInvoiceTotal] = useState<string>(''); // in Rupees for reconciliation
    const [notes, setNotes] = useState('');

    const [items, setItems] = useState<ReceiptLineItem[]>([]);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isLookupInProgress, setIsLookupInProgress] = useState(false);
    const [unlinkedBarcode, setUnlinkedBarcode] = useState<string | null>(null);

    // Banner, Toast & Modals
    const [bannerNotice, setBannerNotice] = useState<{
        type: 'success' | 'amber' | 'error';
        message: string;
        action?: { label: string; onClick: () => void };
    } | null>(null);
    const [toast, setToast] = useState<{
        type: 'success' | 'amber' | 'error';
        message: string;
    } | null>(null);

    const [draftNotice, setDraftNotice] = useState<{
        savedAt: string;
        itemsCount: number;
        draft: any;
    } | null>(null);
    const hasLoadedDraftRef = useRef(false);

    const [safetyWarning, setSafetyWarning] = useState<{
        medicineName: string;
        count: number;
    } | null>(null);

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

    // Search input ref to focus when empty
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Check for draft on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                const hasLines = Array.isArray(parsed.items) && parsed.items.length > 0;
                const hasMeta = parsed.invoiceNumber || parsed.notes || parsed.supplierId || parsed.invoiceTotal;
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

        if (items.length === 0 && !invoiceNumber && !notes && !supplierId && !invoiceTotal) {
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
                        invoiceTotal,
                        notes,
                        items,
                        savedAt: new Date().toISOString(),
                    })
                );
            } catch {
                // storage full or private mode
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [supplierId, invoiceNumber, receivedDate, invoiceTotal, notes, items, DRAFT_STORAGE_KEY]);

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
        if (d.invoiceTotal) setInvoiceTotal(d.invoiceTotal);
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

    const handleCancelPrompt = () => {
        if (items.length > 0 || invoiceNumber || notes || invoiceTotal) {
            setCancelModalOpen(true);
        } else {
            clearDraftStorage();
            router.visit(route('tenant.pharmacy.medicines'));
        }
    };

    const confirmDiscardAndExit = () => {
        clearDraftStorage();
        setCancelModalOpen(false);
        router.visit(route('tenant.pharmacy.medicines'));
    };

    const handleClearAllLines = () => {
        if (items.length === 0) return;
        if (window.confirm(`Are you sure you want to remove all ${items.length} line items from this GRN?`)) {
            setItems([]);
            clearDraftStorage();
            setToast({
                type: 'amber',
                message: 'All GRN line items removed.',
            });
        }
    };

    // Catalog Search for adding items
    const [catalogSearch, setCatalogSearch] = useState('');
    const debouncedCatalogSearch = useDebounce(catalogSearch, 220);
    const [catalogResults, setCatalogResults] = useState<any[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

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
                setCatalogResults(data.results || data.data || []);
                setSearchDropdownOpen(true);
            })
            .catch((err) => console.error('Catalog search error:', err))
            .finally(() => setCatalogLoading(false));
    }, [debouncedCatalogSearch]);

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setSearchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Add item from catalog search
    const handleSelectCatalogItem = (res: any) => {
        const lastCostRupees = res.last_cost_cents ? res.last_cost_cents / 100 : res.existing_medicine?.last_cost_cents ? res.existing_medicine.last_cost_cents / 100 : null;
        const defaultCostStr = lastCostRupees !== null ? String(lastCostRupees.toFixed(2)) : '';
        const sellRupees = res.selling_price_cents ? (res.selling_price_cents / 100).toFixed(2) : '';

        const packSize = Number(res.pack_size) || 1;
        const baseUnit = res.base_unit || (
            res.dosage_form?.toLowerCase().includes('syrup')
                ? 'ml'
                : res.dosage_form?.toLowerCase().includes('inhaler')
                ? 'dose'
                : 'tablet'
        );

        // Check if an item with same medicine already exists with empty batch
        const existingIdx = items.findIndex((it) => {
            const matchesMed = (it.clinic_medicine_id && it.clinic_medicine_id === res.clinic_medicine_id) ||
                (it.medicine_variant_id && it.medicine_variant_id === res.variant_id && it.medicine_brand_id === (res.brand_id || null));
            return matchesMed && (!it.batch_number || it.batch_number.trim() === '');
        });

        if (existingIdx !== -1) {
            // Already present with empty batch -> focus it
            setToast({
                type: 'amber',
                message: `${res.display_name} is already in the list at row #${existingIdx + 1}.`,
            });
            setCatalogSearch('');
            setSearchDropdownOpen(false);
            const el = document.getElementById(`batch-input-${existingIdx}`);
            el?.focus();
            return;
        }

        const newItem: ReceiptLineItem = {
            clinic_medicine_id: res.clinic_medicine_id || null,
            medicine_variant_id: res.variant_id,
            medicine_brand_id: res.brand_id || null,
            display_name: res.display_name,
            generic_name: res.generic_name,
            brand_name: res.brand_name || null,
            dosage_form: res.dosage_form || res.strength_form,
            base_unit: baseUnit,
            pack_size: packSize,
            batch_number: '',
            expiry_date: '',
            quantity: packSize > 1 ? packSize : 100,
            free_quantity: 0,
            pack_quantity: packSize > 1 ? 1 : 1,
            is_packs_mode: packSize > 1,
            cost_price: defaultCostStr,
            last_cost_price: lastCostRupees,
            selling_price: sellRupees,
            update_selling_price: false,
        };

        setItems((prev) => [...prev, newItem]);
        setCatalogSearch('');
        setSearchDropdownOpen(false);

        // Focus the newly added batch input after render
        setTimeout(() => {
            const newIndex = items.length;
            const el = document.getElementById(`batch-input-${newIndex}`);
            el?.focus();
        }, 100);
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
                                message: `${displayName}: Qty incremented to ${result.quantity} ${data.base_unit || 'tablets'} (Row #${result.lineIndex + 1})`,
                            });
                        } else {
                            setToast({
                                type: 'success',
                                message: `${displayName} (+${packSize} ${data.base_unit || 'tablets'}) added to GRN`,
                            });
                        }

                        return result.lines;
                    });
                } else {
                    setScannerOpen(false);
                    setUnlinkedBarcode(trimmedCode);
                    setBannerNotice({
                        type: 'amber',
                        message: `Barcode ${trimmedCode} is not linked to any brand in the catalog.`,
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

    // Duplicate medicine with empty batch/expiry for another batch
    const duplicateBatchLine = (index: number) => {
        const source = items[index];
        const newLine: ReceiptLineItem = {
            clinic_medicine_id: source.clinic_medicine_id,
            medicine_variant_id: source.medicine_variant_id,
            medicine_brand_id: source.medicine_brand_id,
            display_name: source.display_name,
            generic_name: source.generic_name,
            brand_name: source.brand_name,
            dosage_form: source.dosage_form,
            base_unit: source.base_unit,
            pack_size: source.pack_size,
            batch_number: '',
            expiry_date: '',
            quantity: source.pack_size ? source.pack_size : 100,
            free_quantity: 0,
            pack_quantity: 1,
            is_packs_mode: source.is_packs_mode,
            cost_price: source.cost_price || '',
            last_cost_price: source.last_cost_price,
            selling_price: source.selling_price || '',
            update_selling_price: false,
        };

        setItems((prev) => {
            const next = [...prev];
            next.splice(index + 1, 0, newLine);
            return next;
        });

        setToast({
            type: 'success',
            message: `Added another batch row for ${source.display_name}`,
        });

        setTimeout(() => {
            const el = document.getElementById(`batch-input-${index + 1}`);
            el?.focus();
        }, 100);
    };

    // Barcode linked callback
    const handleBarcodeLinked = (data: LinkedBarcodeResult) => {
        const packSize = Number(data.pack_size) || 1;
        const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;

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

            return result.lines;
        });

        setBannerNotice({
            type: 'success',
            message: `Barcode ${data.barcode} linked successfully and added to GRN items.`,
        });
        setUnlinkedBarcode(null);
    };

    // Update item field with merge detection
    const updateItem = (index: number, field: keyof ReceiptLineItem, value: any) => {
        setItems((prev) => {
            const next = [...prev];
            const current = { ...next[index], [field]: value };

            // Handle packs / units synchronization
            if (field === 'pack_quantity' && current.pack_size && current.pack_size > 1) {
                const packs = Number(value) || 0;
                current.quantity = packs * current.pack_size;
            } else if (field === 'quantity' && current.pack_size && current.pack_size > 1) {
                const units = Number(value) || 0;
                current.pack_quantity = Number((units / current.pack_size).toFixed(2));
            } else if (field === 'is_packs_mode' && value === true && current.pack_size && current.pack_size > 1) {
                current.pack_quantity = Number(((Number(current.quantity) || 0) / current.pack_size).toFixed(2));
            }

            next[index] = current;
            return next;
        });

        // Clear error for this field if set
        if (errors[`items.${index}.${String(field)}`]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`items.${index}.${String(field)}`];
                return next;
            });
        }
    };

    // Merge two identical medicine + batch rows
    const handleMergeRows = (sourceIdx: number, targetIdx: number) => {
        const source = items[sourceIdx];
        const target = items[targetIdx];

        const mergedQty = (Number(target.quantity) || 0) + (Number(source.quantity) || 0);
        const mergedFree = (Number(target.free_quantity) || 0) + (Number(source.free_quantity) || 0);

        setItems((prev) => {
            const next = [...prev];
            next[targetIdx] = {
                ...target,
                quantity: mergedQty,
                free_quantity: mergedFree,
                pack_quantity: target.pack_size && target.pack_size > 1 ? Number((mergedQty / target.pack_size).toFixed(2)) : undefined,
            };
            return next.filter((_, i) => i !== sourceIdx);
        });

        setToast({
            type: 'success',
            message: `Merged duplicate batch into row #${targetIdx + 1} (Total units: ${mergedQty + mergedFree}).`,
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
        axios
            .post(route('tenant.pharmacy.suppliers.store'), {
                name: newSupplierName.trim(),
                phone: newSupplierPhone.trim() || null,
            })
            .then((res) => {
                const newSupp = {
                    id: res.data?.supplier?.id || Date.now(),
                    name: newSupplierName.trim(),
                    phone: newSupplierPhone.trim() || null,
                };
                setSuppliers((prev) => [...prev, newSupp]);
                setSupplierId(String(newSupp.id));
                setSupplierModalOpen(false);
                setNewSupplierName('');
                setNewSupplierPhone('');
                setToast({
                    type: 'success',
                    message: `Supplier "${newSupp.name}" created and selected.`,
                });
            })
            .catch(() => {
                // Fallback via Inertia router
                router.post(
                    route('tenant.pharmacy.suppliers.store'),
                    { name: newSupplierName, phone: newSupplierPhone },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setSupplierModalOpen(false);
                            setNewSupplierName('');
                            setNewSupplierPhone('');
                        },
                    }
                );
            })
            .finally(() => setCreatingSupplier(false));
    };

    // Totals Calculations
    const totalBilledUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalFreeUnits = items.reduce((sum, item) => sum + (Number(item.free_quantity) || 0), 0);
    const totalUnits = totalBilledUnits + totalFreeUnits;

    const totalCostCents = items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = parseFloat(item.cost_price) || 0;
        return sum + Math.round(qty * cost * 100);
    }, 0);

    // Invoice Reconciliation
    const enteredInvoiceRupees = parseFloat(invoiceTotal) || 0;
    const hasInvoiceTotal = invoiceTotal.trim() !== '' && !isNaN(enteredInvoiceRupees) && enteredInvoiceRupees >= 0;
    const enteredInvoiceCents = Math.round(enteredInvoiceRupees * 100);
    const reconciliationDiffCents = enteredInvoiceCents - totalCostCents;
    const isInvoiceMatched = hasInvoiceTotal && reconciliationDiffCents === 0;

    // Check near-expiry (< 90 days from receivedDate)
    const isNearExpiry = (expiryDateStr: string) => {
        if (!expiryDateStr || expiryDateStr.length < 10) return false;
        try {
            const exp = new Date(expiryDateStr).getTime();
            const rec = new Date(receivedDate).getTime();
            const diffDays = Math.ceil((exp - rec) / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= 90;
        } catch {
            return false;
        }
    };

    const isExpired = (expiryDateStr: string) => {
        if (!expiryDateStr) return false;
        return expiryDateStr <= receivedDate;
    };

    // Calculate expiry days remaining
    const getExpiryDaysRemaining = (expiryDateStr: string) => {
        try {
            const exp = new Date(expiryDateStr).getTime();
            const rec = new Date(receivedDate).getTime();
            return Math.ceil((exp - rec) / (1000 * 60 * 60 * 24));
        } catch {
            return 0;
        }
    };

    // Form Validation on Primary Button Click
    const validateAndOpenConfirm = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setErrors({});

        // 1. Check if items exist
        if (items.length === 0) {
            setErrors({ items: 'Please add at least one medicine item to receive.' });
            setToast({
                type: 'amber',
                message: 'No medicines added. Use the search bar above or scan barcodes to begin.',
            });
            searchInputRef.current?.focus();
            return;
        }

        // 2. Validate line items
        const newErrors: Record<string, string> = {};
        let firstInvalidFieldId: string | null = null;

        for (let i = 0; i < items.length; i++) {
            const it = items[i];

            if (!it.batch_number || !it.batch_number.trim()) {
                newErrors[`items.${i}.batch_number`] = 'Batch number is required (enter N/A if none).';
                if (!firstInvalidFieldId) firstInvalidFieldId = `batch-input-${i}`;
            }

            if (!it.expiry_date) {
                newErrors[`items.${i}.expiry_date`] = 'Expiry date is required.';
                if (!firstInvalidFieldId) firstInvalidFieldId = `expiry-input-${i}`;
            } else if (it.expiry_date <= receivedDate) {
                newErrors[`items.${i}.expiry_date`] = `Expired: date must be after received date (${formatDateLK(receivedDate)}).`;
                if (!firstInvalidFieldId) firstInvalidFieldId = `expiry-input-${i}`;
            }

            if (!it.quantity || Number(it.quantity) <= 0) {
                newErrors[`items.${i}.quantity`] = 'Quantity must be at least 1 unit.';
                if (!firstInvalidFieldId) firstInvalidFieldId = `qty-input-${i}`;
            }

            if (it.cost_price === '' || isNaN(parseFloat(it.cost_price)) || parseFloat(it.cost_price) < 0) {
                newErrors[`items.${i}.cost_price`] = 'Cost price per unit is required (>= 0).';
                if (!firstInvalidFieldId) firstInvalidFieldId = `cost-input-${i}`;
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setToast({
                type: 'error',
                message: 'Please resolve highlighted errors in the items table.',
            });
            if (firstInvalidFieldId) {
                const el = document.getElementById(firstInvalidFieldId);
                el?.focus();
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // 3. Safety check: warn if more than 20 lines of same medicine
        const counts: Record<string, { name: string; count: number }> = {};
        for (const it of items) {
            const key = `${it.medicine_variant_id ?? ''}_${it.medicine_brand_id ?? ''}_${it.display_name}`;
            if (!counts[key]) counts[key] = { name: it.display_name, count: 0 };
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

        // Everything valid -> Open confirm modal
        setConfirmModalOpen(true);
    };

    // Actual submission to backend
    const handleConfirmSubmit = () => {
        setSubmitting(true);
        const payload = {
            supplier_id: supplierId ? Number(supplierId) : null,
            invoice_number: invoiceNumber ? invoiceNumber.trim() : null,
            received_date: receivedDate,
            notes: notes ? notes.trim() : null,
            items: items.map((it) => ({
                clinic_medicine_id: it.clinic_medicine_id || null,
                medicine_variant_id: it.medicine_variant_id || null,
                medicine_brand_id: it.medicine_brand_id || null,
                display_name: it.display_name,
                base_unit: it.base_unit,
                batch_number: it.batch_number ? it.batch_number.trim() : 'N/A',
                expiry_date: it.expiry_date || null,
                quantity: Number(it.quantity),
                free_quantity: Number(it.free_quantity) || 0,
                cost_price: it.cost_price,
                selling_price: it.update_selling_price && it.selling_price ? it.selling_price : null,
            })),
        };

        axios
            .post('/pharmacy/receipts?format=json', payload)
            .then((res) => {
                clearDraftStorage();
                setConfirmModalOpen(false);
                setSuccessReceipt(res.data?.receipt || {
                    receipt_number: `GRN-${new Date().getFullYear()}-RECENT`,
                    total_cost_cents: totalCostCents,
                    total_units: totalUnits,
                    items_count: items.length,
                    supplier_name: suppliers.find((s) => String(s.id) === supplierId)?.name || '—',
                    invoice_number: invoiceNumber || '—',
                    received_date: receivedDate,
                });
            })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    setErrors(err.response.data.errors);
                    setToast({
                        type: 'error',
                        message: 'Server validation error. Please check highlighted fields.',
                    });
                } else {
                    setToast({
                        type: 'error',
                        message: err.response?.data?.message || 'Failed to save GRN. Please try again.',
                    });
                }
                setConfirmModalOpen(false);
            })
            .finally(() => {
                setSubmitting(false);
            });
    };

    // Reset for another receipt
    const handleReceiveMore = () => {
        setSuccessReceipt(null);
        setItems([]);
        setInvoiceNumber('');
        setInvoiceTotal('');
        setNotes('');
        setSupplierId('');
        setErrors({});
        setReceivedDate(defaultDate);
        clearDraftStorage();
        setTimeout(() => searchInputRef.current?.focus(), 150);
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    // Selected supplier object
    const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId);

    // ==========================================
    // SUCCESS STATE VIEW
    // ==========================================
    if (successReceipt) {
        return (
            <AuthenticatedLayout>
                <Head title={`GRN ${successReceipt.receipt_number} Created — Pharmacy`} />

                <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <GlassCard className="p-8 sm:p-10 text-center relative overflow-hidden space-y-6 border-emerald-500/30">
                        {/* Glow orb */}
                        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-secondary text-white flex items-center justify-center shadow-xl shadow-emerald-500/30">
                            <Check className="w-10 h-10 stroke-[3]" />
                        </div>

                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Goods Received Note Created
                            </span>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                Stock received successfully
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                All medicine batches, stock movement ledger entries, and supplier records have been updated in your clinic pharmacy.
                            </p>
                        </div>

                        {/* GRN Pill Card */}
                        <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 shadow-xs max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 block">GRN number</span>
                                <span className="text-base font-extrabold text-primary font-mono">
                                    {successReceipt.receipt_number}
                                </span>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 block">Total cost</span>
                                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                    {formatLKR(successReceipt.total_cost_cents)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 block">Total units</span>
                                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                    {successReceipt.total_units} units
                                </span>
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 block">Received date</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {formatDateLK(successReceipt.received_date || receivedDate)}
                                </span>
                            </div>
                        </div>

                        {/* Supplier and Invoice meta if present */}
                        {(successReceipt.supplier_name || successReceipt.invoice_number) && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-3">
                                {successReceipt.supplier_name && (
                                    <span>Supplier: <strong className="text-slate-700 dark:text-slate-300">{successReceipt.supplier_name}</strong></span>
                                )}
                                {successReceipt.supplier_name && successReceipt.invoice_number && <span>•</span>}
                                {successReceipt.invoice_number && (
                                    <span>Invoice #: <strong className="text-slate-700 dark:text-slate-300">{successReceipt.invoice_number}</strong></span>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={handlePrintReceipt}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4 text-slate-500" />
                                <span>Print GRN</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleReceiveMore}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Receive more</span>
                            </button>

                            <Link
                                href={route('tenant.pharmacy.medicines')}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Boxes className="w-4 h-4 text-secondary" />
                                <span>View stock</span>
                            </Link>
                        </div>
                    </GlassCard>
                </div>
            </AuthenticatedLayout>
        );
    }

    // ==========================================
    // MAIN RECEIVE STOCK FORM VIEW
    // ==========================================
    return (
        <AuthenticatedLayout>
            <Head title="Receive stock (GRN) — Pharmacy" />

            {/* Accessible Live Region for Barcode Scans & Announcers */}
            <div aria-live="polite" className="sr-only">
                {toast ? toast.message : ''}
            </div>

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

            <div className="w-full max-w-6xl mx-auto space-y-6 pb-28 min-w-0">
                {/* 1. Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleCancelPrompt}
                            className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-white/10 transition-colors shadow-xs"
                            title="Back to medicines"
                            aria-label="Back to medicines"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    Receive stock
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                    GRN
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Record medicines delivered by your supplier.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setScannerOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-sm flex items-center gap-2 transition-all border border-emerald-500/30 shadow-xs"
                        >
                            <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Scan barcode</span>
                            <span className="hidden md:inline text-[10px] uppercase font-bold opacity-75 px-1 py-0.5 rounded bg-emerald-500/20">
                                Camera
                            </span>
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
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Restore unsaved GRN draft?
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    An unsaved draft from {draftNotice.savedAt} with {draftNotice.itemsCount} line items was found on this device.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                type="button"
                                onClick={handleDiscardDraft}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                            >
                                Discard draft
                            </button>
                            <button
                                type="button"
                                onClick={handleRestoreDraft}
                                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore draft</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Feedback Banner Notice */}
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

                {/* 2. Card: Supplier & Invoice */}
                <GlassCard className="p-5 sm:p-6 space-y-4 relative z-30 overflow-visible">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            <span>Supplier & invoice</span>
                        </h2>
                        {selectedSupplier?.phone && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Phone: {selectedSupplier.phone}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Supplier searchable select */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <GlassLabel htmlFor="supplier" className="mb-0">
                                    Supplier
                                </GlassLabel>
                                <button
                                    type="button"
                                    onClick={() => setSupplierModalOpen(true)}
                                    className="text-xs text-primary hover:underline font-semibold"
                                >
                                    + New supplier
                                </button>
                            </div>
                            <select
                                id="supplier"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                                    bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                                    text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15"
                            >
                                <option value="">Select supplier (optional)</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.phone ? `(${s.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Supplier invoice no. */}
                        <div>
                            <GlassLabel htmlFor="invoiceNumber">Supplier invoice no.</GlassLabel>
                            <GlassInput
                                id="invoiceNumber"
                                placeholder="e.g. INV-2026-0042"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                            />
                        </div>

                        {/* Received date using custom DatePickerLK */}
                        <div>
                            <GlassLabel htmlFor="receivedDate" required>
                                Received date
                            </GlassLabel>
                            <DatePickerLK
                                id="receivedDate"
                                value={receivedDate}
                                onChange={setReceivedDate}
                                allowFutureDates={false}
                                align="right"
                            />
                        </div>

                        {/* Invoice total for reconciliation */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <GlassLabel htmlFor="invoiceTotal" className="mb-0">
                                    Invoice total (Rs.)
                                </GlassLabel>
                                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                                    Rs.
                                </span>
                                <input
                                    id="invoiceTotal"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={invoiceTotal}
                                    onChange={(e) => setInvoiceTotal(e.target.value)}
                                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                                        bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                                        text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15"
                                />
                            </div>
                        </div>

                        {/* Notes / PO reference - Full Width */}
                        <div className="sm:col-span-2 lg:col-span-4">
                            <GlassLabel htmlFor="notes">Notes / PO reference</GlassLabel>
                            <GlassInput
                                id="notes"
                                placeholder="Delivery order notes, purchase order reference or remarks..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* 3. Card: Items */}
                <GlassCard className="p-5 sm:p-6 space-y-5 relative z-10">
                    {/* Items Card Header + Large Search Bar */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span>Items ({items.length})</span>
                                </h2>
                                {items.length > 0 && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Total units: <strong>{totalUnits}</strong>
                                    </span>
                                )}
                            </div>

                            {items.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearAllLines}
                                    className="text-xs px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-semibold flex items-center gap-1.5 border border-rose-200/80 dark:border-rose-900/40 self-start sm:self-auto"
                                    title="Clear all line items"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Clear all</span>
                                </button>
                            )}
                        </div>

                        {/* Large Medicine Search Bar */}
                        <div ref={searchContainerRef} className="relative w-full">
                            <div className="relative">
                                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search medicine to add (generic, brand or barcode)..."
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    onFocus={() => {
                                        if (catalogResults.length > 0) setSearchDropdownOpen(true);
                                    }}
                                    className="w-full pl-12 pr-10 py-3 rounded-2xl text-sm font-medium
                                        bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-white/10
                                        text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                                        focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none shadow-sm transition-all"
                                />
                                {catalogLoading && (
                                    <div className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                )}
                                {catalogSearch && !catalogLoading && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCatalogSearch('');
                                            setCatalogResults([]);
                                            setSearchDropdownOpen(false);
                                        }}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Results showing Current Stock and Last Cost */}
                            {searchDropdownOpen && catalogResults.length > 0 && (
                                <div className="absolute top-full mt-2 left-0 right-0 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="p-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-50 dark:bg-slate-800/40">
                                        Catalog medicines ({catalogResults.length} matches)
                                    </div>
                                    {catalogResults.map((res, idx) => {
                                        const stockQty = res.total_quantity ?? res.existing_medicine?.total_quantity ?? 0;
                                        const inStock = stockQty > 0;
                                        const lastCost = res.last_cost_cents ? res.last_cost_cents / 100 : res.existing_medicine?.last_cost_cents ? res.existing_medicine.last_cost_cents / 100 : null;

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectCatalogItem(res)}
                                                className="w-full text-left p-3.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between gap-4 group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                            {res.display_name}
                                                        </span>
                                                        {res.brand_name && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                {res.brand_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                                        <span>{res.generic_name}</span>
                                                        <span>•</span>
                                                        <span>{res.strength_form || res.dosage_form}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 text-right">
                                                    <div>
                                                        <span className={`text-xs font-bold block ${inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                            {inStock ? `${stockQty} in stock` : '0 in stock'}
                                                        </span>
                                                        {lastCost !== null ? (
                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                                                                Last cost: {formatLKR(Math.round(lastCost * 100))}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 block">
                                                                No prior cost
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white flex items-center justify-center transition-all">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {errors.items && <GlassError message={errors.items} />}

                    {/* Empty State */}
                    {items.length === 0 ? (
                        <div className="py-14 px-6 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-white/[0.01] space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-inner">
                                <Package className="w-8 h-8 stroke-[1.8]" />
                            </div>
                            <div className="space-y-1 max-w-md mx-auto">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    No medicines added to this GRN yet
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Search by generic name, brand or barcode to add items, or scan incoming boxes directly with your camera.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => searchInputRef.current?.focus()}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    <Search className="w-3.5 h-3.5" />
                                    <span>Search medicine</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScannerOpen(true)}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    <Barcode className="w-3.5 h-3.5 text-secondary" />
                                    <span>Scan barcode</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Items List: Desktop Table / Mobile Cards */
                        <div className="space-y-4">
                            {/* Desktop Column Header Guide (lg screens) */}
                            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                                <span className="col-span-3">Medicine</span>
                                <span className="col-span-1">Batch no.</span>
                                <span className="col-span-2">Expiry date</span>
                                <span className="col-span-2">Quantity</span>
                                <span className="col-span-1">Free qty</span>
                                <span className="col-span-1">Cost / unit</span>
                                <span className="col-span-1">Selling price</span>
                                <span className="col-span-1 text-right">Line total</span>
                            </div>

                            {/* Line Item Rows */}
                            {items.map((item, index) => {
                                const qty = Number(item.quantity) || 0;
                                const freeQty = Number(item.free_quantity) || 0;
                                const cost = parseFloat(item.cost_price) || 0;
                                const lineTotalCents = Math.round(qty * cost * 100);

                                // Near expiry check
                                const nearExpiry = isNearExpiry(item.expiry_date);
                                const expired = isExpired(item.expiry_date);
                                const daysRemaining = getExpiryDaysRemaining(item.expiry_date);

                                // Cost change indicator
                                const lastCost = item.last_cost_price;
                                const hasLastCost = lastCost !== null && lastCost !== undefined && lastCost > 0;
                                const costDiffPct = hasLastCost && cost > 0
                                    ? ((cost - lastCost) / lastCost) * 100
                                    : null;

                                // Selling price margin calculation
                                const sellPrice = parseFloat(item.selling_price) || 0;
                                const hasSellPrice = sellPrice > 0;
                                const marginPct = hasSellPrice && cost > 0
                                    ? ((sellPrice - cost) / sellPrice) * 100
                                    : null;

                                // Check for identical medicine + batch in another row
                                const duplicateBatchIndex = items.findIndex((it, i) =>
                                    i !== index &&
                                    it.batch_number &&
                                    it.batch_number.trim() !== '' &&
                                    it.batch_number.trim().toLowerCase() === (item.batch_number || '').trim().toLowerCase() &&
                                    ((it.clinic_medicine_id && it.clinic_medicine_id === item.clinic_medicine_id) ||
                                     (it.medicine_variant_id && it.medicine_variant_id === item.medicine_variant_id && it.medicine_brand_id === item.medicine_brand_id))
                                );

                                return (
                                    <div
                                        key={index}
                                        className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/90 dark:border-white/5 space-y-3 relative transition-all hover:border-slate-300 dark:hover:border-white/10 shadow-xs"
                                    >
                                        {/* Row Top: Medicine Name, Form, Brand & Actions */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                                    {index + 1}
                                                </span>
                                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                                    {item.display_name}
                                                </span>
                                                {item.brand_name && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                                        {item.brand_name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400">
                                                    {item.generic_name} • {item.base_unit}
                                                </span>
                                                {item.pack_size && item.pack_size > 1 && (
                                                    <span className="text-xs text-secondary font-medium">
                                                        ({item.pack_size} {item.base_unit}s/pack)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => duplicateBatchLine(index)}
                                                    className="px-2.5 py-1 text-xs rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold flex items-center gap-1 transition-colors"
                                                    title="Add another batch for this medicine"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>+ Add batch</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                    title="Remove row"
                                                    aria-label="Remove row"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Duplicate Batch merge prompt if same medicine and batch exists */}
                                        {duplicateBatchIndex !== -1 && duplicateBatchIndex < index && (
                                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                                    <span>
                                                        Same batch <strong>{item.batch_number}</strong> also in row #{duplicateBatchIndex + 1}.
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMergeRows(index, duplicateBatchIndex)}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
                                                >
                                                    Merge rows
                                                </button>
                                            </div>
                                        )}

                                        {/* Editable Fields Grid (Desktop 8 columns / Mobile cards) */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 items-start">
                                            {/* 1. Batch No. */}
                                            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                                                <GlassLabel htmlFor={`batch-input-${index}`} required>
                                                    Batch no.
                                                </GlassLabel>
                                                <GlassInput
                                                    id={`batch-input-${index}`}
                                                    placeholder="e.g. B2601"
                                                    value={item.batch_number}
                                                    onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                                                    error={Boolean(errors[`items.${index}.batch_number`])}
                                                />
                                                {errors[`items.${index}.batch_number`] && (
                                                    <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                        {errors[`items.${index}.batch_number`]}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 2. Expiry Date */}
                                            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <GlassLabel htmlFor={`expiry-input-${index}`} required className="mb-0">
                                                        Expiry date
                                                    </GlassLabel>
                                                    {nearExpiry && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                                            {daysRemaining}d left
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    id={`expiry-input-${index}`}
                                                    type="date"
                                                    value={item.expiry_date}
                                                    onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                                                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none transition-all
                                                        bg-white/80 dark:bg-slate-900/60 text-slate-900 dark:text-white
                                                        border ${
                                                            errors[`items.${index}.expiry_date`] || expired
                                                                ? 'border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                                                                : nearExpiry
                                                                ? 'border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'
                                                                : 'border-slate-200/90 dark:border-white/10 focus:border-primary'
                                                        }`}
                                                />
                                                {errors[`items.${index}.expiry_date`] && (
                                                    <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                        {errors[`items.${index}.expiry_date`]}
                                                    </span>
                                                )}
                                                {!errors[`items.${index}.expiry_date`] && nearExpiry && (
                                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                                                        Near-expiry (&lt; 90 days)
                                                    </span>
                                                )}
                                            </div>

                                            {/* 3. Quantity: Packs / Units Toggle */}
                                            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <GlassLabel htmlFor={`qty-input-${index}`} required className="mb-0">
                                                        Quantity
                                                    </GlassLabel>
                                                    {item.pack_size && item.pack_size > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItem(index, 'is_packs_mode', !item.is_packs_mode)}
                                                            className="text-[10px] font-bold text-primary hover:underline"
                                                        >
                                                            Switch to {item.is_packs_mode ? 'Units' : 'Packs'}
                                                        </button>
                                                    )}
                                                </div>

                                                {item.pack_size && item.pack_size > 1 && item.is_packs_mode ? (
                                                    <div className="space-y-1">
                                                        <div className="relative">
                                                            <input
                                                                id={`qty-input-${index}`}
                                                                type="number"
                                                                min="0.1"
                                                                step="any"
                                                                value={item.pack_quantity ?? ''}
                                                                onChange={(e) => updateItem(index, 'pack_quantity', parseFloat(e.target.value) || 0)}
                                                                className="w-full px-3 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:border-primary outline-none"
                                                                placeholder="Packs"
                                                            />
                                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400">
                                                                Packs
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 block">
                                                            = {item.quantity} {item.base_unit}s
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <input
                                                            id={`qty-input-${index}`}
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                                                            className={`w-full px-3 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border ${
                                                                errors[`items.${index}.quantity`] ? 'border-rose-500' : 'border-slate-200/90 dark:border-white/10'
                                                            } text-slate-900 dark:text-white focus:border-primary outline-none`}
                                                            placeholder="Units"
                                                        />
                                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400">
                                                            {item.base_unit}s
                                                        </span>
                                                    </div>
                                                )}
                                                {errors[`items.${index}.quantity`] && (
                                                    <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                        {errors[`items.${index}.quantity`]}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 4. Free Qty */}
                                            <div className="col-span-1 lg:col-span-1">
                                                <GlassLabel htmlFor={`free-qty-${index}`}>Free qty</GlassLabel>
                                                <input
                                                    id={`free-qty-${index}`}
                                                    type="number"
                                                    min="0"
                                                    value={item.free_quantity || ''}
                                                    onChange={(e) => updateItem(index, 'free_quantity', parseInt(e.target.value, 10) || 0)}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:border-primary outline-none"
                                                />
                                            </div>

                                            {/* 5. Cost / Unit */}
                                            <div className="col-span-1 sm:col-span-1 lg:col-span-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <GlassLabel htmlFor={`cost-input-${index}`} required className="mb-0">
                                                        Cost / unit
                                                    </GlassLabel>
                                                    {costDiffPct !== null && (
                                                        <span
                                                            className={`text-[10px] font-bold flex items-center gap-0.5 ${
                                                                costDiffPct > 0.01
                                                                    ? 'text-rose-600 dark:text-rose-400'
                                                                    : costDiffPct < -0.01
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : 'text-slate-400'
                                                            }`}
                                                            title={`Prior cost: Rs. ${lastCost?.toFixed(2)}`}
                                                        >
                                                            {costDiffPct > 0.01 ? (
                                                                <>+{costDiffPct.toFixed(1)}% <TrendingUp className="w-2.5 h-2.5" /></>
                                                            ) : costDiffPct < -0.01 ? (
                                                                <>{costDiffPct.toFixed(1)}% <TrendingDown className="w-2.5 h-2.5" /></>
                                                            ) : (
                                                                '0%'
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                                        Rs.
                                                    </span>
                                                    <input
                                                        id={`cost-input-${index}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={item.cost_price}
                                                        onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                                                        className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border ${
                                                            errors[`items.${index}.cost_price`] ? 'border-rose-500' : 'border-slate-200/90 dark:border-white/10'
                                                        } text-slate-900 dark:text-white focus:border-primary outline-none`}
                                                    />
                                                </div>
                                                {errors[`items.${index}.cost_price`] && (
                                                    <span className="text-[11px] text-rose-500 font-medium block mt-1">
                                                        {errors[`items.${index}.cost_price`]}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 6. Selling Price (Optional update + margin preview) */}
                                            <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <GlassLabel htmlFor={`sell-input-${index}`} className="mb-0">
                                                        Selling price
                                                    </GlassLabel>
                                                    {marginPct !== null && (
                                                        <span
                                                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                                marginPct >= 20
                                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                    : marginPct > 0
                                                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                                            }`}
                                                        >
                                                            {marginPct.toFixed(0)}% margin
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                                        Rs.
                                                    </span>
                                                    <input
                                                        id={`sell-input-${index}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="Optional"
                                                        value={item.selling_price || ''}
                                                        onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
                                                        className="w-full pl-8 pr-3 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white focus:border-primary outline-none"
                                                    />
                                                </div>
                                                {sellPrice > 0 && (
                                                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(item.update_selling_price)}
                                                            onChange={(e) => updateItem(index, 'update_selling_price', e.target.checked)}
                                                            className="rounded border-slate-300 text-primary focus:ring-primary w-3.5 h-3.5"
                                                        />
                                                        <span>Update clinic price</span>
                                                    </label>
                                                )}
                                            </div>

                                            {/* 7. Line Total */}
                                            <div className="col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col justify-end text-right">
                                                <span className="text-[11px] font-semibold text-slate-400 mb-1 lg:hidden">
                                                    Line total
                                                </span>
                                                <div className="h-9 px-3 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-end font-extrabold text-sm text-slate-900 dark:text-white tabular-nums">
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
            </div>

            {/* 4. Sticky Bottom Summary Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 shadow-2xl py-3 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Metrics: Items, Units, Cost & Invoice Match Badge */}
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                        <div>
                            <span className="text-[11px] font-semibold text-slate-400 block">Items</span>
                            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                {items.length}
                            </span>
                        </div>
                        <div className="h-7 w-px bg-slate-200 dark:bg-white/10" />
                        <div>
                            <span className="text-[11px] font-semibold text-slate-400 block">Total units</span>
                            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                {totalUnits}
                                {totalFreeUnits > 0 && (
                                    <span className="text-xs text-secondary font-medium ml-1">
                                        ({totalFreeUnits} free)
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="h-7 w-px bg-slate-200 dark:bg-white/10" />
                        <div>
                            <span className="text-[11px] font-semibold text-slate-400 block">Total cost</span>
                            <span className="text-lg sm:text-xl font-extrabold text-primary tabular-nums">
                                {formatLKR(totalCostCents)}
                            </span>
                        </div>

                        {/* Invoice Reconciliation Badge */}
                        {hasInvoiceTotal && (
                            <>
                                <div className="h-7 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 block">Reconciliation</span>
                                    {isInvoiceMatched ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                            Matches invoice ✓
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {reconciliationDiffCents > 0
                                                ? `Diff: ${formatLKR(reconciliationDiffCents)} under`
                                                : `Diff: ${formatLKR(Math.abs(reconciliationDiffCents))} over`}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Buttons: Cancel and Primary Receive stock */}
                    <div className="flex items-center gap-3 justify-end shrink-0">
                        <button
                            type="button"
                            onClick={handleCancelPrompt}
                            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={validateAndOpenConfirm}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-4 focus-visible:ring-primary/20"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Receive stock & create GRN</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. Confirm Modal Before Posting */}
            <GlassModal
                isOpen={confirmModalOpen}
                onClose={() => !submitting && setConfirmModalOpen(false)}
                title="Confirm stock receipt (GRN)"
            >
                <div className="space-y-5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Please review the summary details below before generating this Goods Received Note.
                    </p>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/10 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400 block font-medium">Supplier</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {selectedSupplier?.name || 'No supplier specified'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Supplier invoice no.</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {invoiceNumber || '—'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Received date</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {formatDateLK(receivedDate)}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block font-medium">Line items</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {items.length} items ({totalUnits} total units)
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Total invoice cost
                            </span>
                            <span className="text-base font-extrabold text-primary font-mono">
                                {formatLKR(totalCostCents)}
                            </span>
                        </div>

                        {hasInvoiceTotal && (
                            <div className="text-xs flex items-center justify-between pt-1">
                                <span className="text-slate-400">Invoice reconciliation</span>
                                <span className={`font-bold ${isInvoiceMatched ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {isInvoiceMatched ? 'Matches invoice ✓' : `Diff: ${formatLKR(Math.abs(reconciliationDiffCents))}`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Quick preview of lines */}
                    <div className="max-h-48 overflow-y-auto space-y-2 divide-y divide-slate-100 dark:divide-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl p-2.5 text-xs">
                        {items.map((it, i) => (
                            <div key={i} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                                <div className="truncate">
                                    <span className="font-bold text-slate-900 dark:text-white">{it.display_name}</span>
                                    <span className="text-slate-400 ml-1.5">Batch: {it.batch_number}</span>
                                </div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                    {it.quantity} {it.base_unit}s
                                    {Number(it.free_quantity) > 0 && <span className="text-secondary ml-1">+{it.free_quantity} free</span>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => setConfirmModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Back to edit
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleConfirmSubmit}
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Receiving stock...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Confirm & receive stock</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* Cancel Confirmation Modal */}
            <GlassModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                title="Discard unsaved changes?"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        You have {items.length} line items entered in this Goods Received Note. Discarding will clear your draft and return to the stock list.
                    </p>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setCancelModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            Keep editing
                        </button>
                        <button
                            type="button"
                            onClick={confirmDiscardAndExit}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-600/20"
                        >
                            Discard & leave
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* Barcode Scanner Modal with Continuous Mode */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={handleBarcodeDetected}
                isLocked={Boolean(unlinkedBarcode) || isLookupInProgress}
                title="Scan barcode for GRN"
                allowContinuous={true}
                initialContinuous={false}
            />

            {/* Link Unknown Barcode Modal */}
            <LinkBarcodeModal
                isOpen={Boolean(unlinkedBarcode)}
                barcode={unlinkedBarcode || ''}
                onClose={() => setUnlinkedBarcode(null)}
                onSuccess={handleBarcodeLinked}
                submitLabel="Link & add to GRN"
            />

            {/* Safety Warning Modal for >20 lines of same medicine */}
            <GlassModal
                isOpen={Boolean(safetyWarning)}
                onClose={() => setSafetyWarning(null)}
                title="Safety warning: duplicate lines detected"
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
                                Having more than 20 rows of the same medicine often indicates an accidental camera scanner loop.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setSafetyWarning(null)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            Review lines
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSafetyWarning(null);
                                setConfirmModalOpen(true);
                            }}
                            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-600/20"
                        >
                            Confirm anyway
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* Quick Add Supplier Modal */}
            <GlassModal
                isOpen={supplierModalOpen}
                onClose={() => setSupplierModalOpen(false)}
                title="Add new supplier"
            >
                <form onSubmit={handleCreateSupplier} className="space-y-4">
                    <div>
                        <GlassLabel htmlFor="newSupplierName" required>
                            Supplier name
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
                        <GlassLabel htmlFor="newSupplierPhone">Phone number</GlassLabel>
                        <GlassInput
                            id="newSupplierPhone"
                            placeholder="011 234 5678"
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
                            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
                        >
                            {creatingSupplier ? 'Creating...' : 'Save supplier'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
