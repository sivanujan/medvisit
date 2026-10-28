import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import BarcodeScanner from '@/Components/Pharmacy/BarcodeScanner';
import LinkBarcodeModal, { LinkedBarcodeResult } from '@/Components/Pharmacy/LinkBarcodeModal';
import { formatLKR, formatDateDMY } from '@/Utils/formatters';
import { useDebounce } from '@/Hooks/useDebounce';
import { usePermission } from '@/Hooks/usePermission';
import {
    Package,
    Search,
    Plus,
    Boxes,
    FileSpreadsheet,
    Barcode,
    SlidersHorizontal,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    DollarSign,
    Layers,
    ChevronRight,
    ChevronDown,
    X,
    Building2,
    Truck,
    Loader2,
    Pencil,
    Trash2,
    Ban,
    Check,
    Receipt,
    MoreVertical,
    ShieldAlert,
    Copy,
    ArrowRightLeft,
    TrendingUp,
    Download,
    ExternalLink,
    Info,
    RefreshCw,
    LayoutGrid,
    List,
    AlertCircle,
    History,
    Tag,
    Pill,
    Printer,
    ArrowUpRight,
    ArrowDownRight,
    FileText,
    HelpCircle,
    ArrowLeft,
    Sparkles,
} from 'lucide-react';

export interface BatchInputRow {
    batch_number: string;
    expiry_date: string;
    quantity: string;
    cost_price: string;
    supplier_id?: string;
}

export interface MedicineBatchItem {
    id: number;
    batch_number: string;
    expiry_date?: string | null;
    quantity_remaining: number;
    quantity_received: number;
    cost_price_cents: number;
    supplier_id?: number | null;
    supplier_name?: string | null;
    received_at?: string | null;
    stock_receipt_id?: number | null;
    status: 'ok' | 'expiring_soon' | 'expired';
}

export interface MedicineMovementItem {
    id: number;
    type: string;
    quantity: number;
    batch_number?: string | null;
    receipt_number?: string | null;
    reason?: string | null;
    user_name: string;
    created_at: string;
}

export interface MedicineStockItem {
    id: number;
    display_name: string;
    normalized_display_name: string;
    generic_name: string;
    strength_form: string;
    dosage_form?: string;
    strength?: string;
    brand_name?: string | null;
    base_unit: string;
    selling_price_cents: number;
    cost_price_cents: number;
    margin_percent?: number | null;
    reorder_level?: number | null;
    effective_reorder_level: number;
    shelf_location?: string | null;
    is_active: boolean;
    total_quantity: number;
    nearest_expiry?: string | null;
    nearest_expiry_raw?: string | null;
    nearest_expiry_urgency: 'ok' | 'expiring_soon' | 'expired';
    batch_count: number;
    batches?: MedicineBatchItem[];
    last_movements?: MedicineMovementItem[];
    has_movements?: boolean;
    status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'inactive';
    has_possible_duplicate: boolean;
    duplicate_pair_key?: string | null;
    brand_flag?: {
        is_generic_brand: boolean;
        known_brand: string;
    } | null;
}

export interface DuplicatePairItem {
    pair_key: string;
    reason: string;
    medicine_a: {
        id: number;
        display_name: string;
        normalized_name: string;
        generic_name: string;
        strength_form: string;
        brand_name?: string | null;
        total_quantity: number;
        selling_price_cents: number;
        batches_count: number;
        is_active: boolean;
        has_history: boolean;
    };
    medicine_b: {
        id: number;
        display_name: string;
        normalized_name: string;
        generic_name: string;
        strength_form: string;
        brand_name?: string | null;
        total_quantity: number;
        selling_price_cents: number;
        batches_count: number;
        is_active: boolean;
        has_history: boolean;
    };
}

export const STATUS_LABELS: Record<string, string> = {
    in_stock: 'In stock',
    low_stock: 'Low stock',
    out_of_stock: 'Out of stock',
    expiring_soon: 'Expiring soon',
    expired: 'Expired',
    inactive: 'Inactive',
};

interface Props {
    medicines: {
        data: MedicineStockItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    stats: {
        total_items: number;
        stock_value_cost_cents: number;
        stock_value_selling_cents: number;
        low_stock_count: number;
        out_of_stock_count: number;
        expiring_soon_count: number;
        expired_count: number;
        possible_duplicates_count: number;
        inactive_count: number;
    };
    duplicatePairs: DuplicatePairItem[];
    suppliers?: Array<{ id: number; name: string }>;
    shelves?: string[];
    forms?: string[];
    filters: {
        search: string;
        tab: string;
        expiring_days: number;
        form?: string;
        supplier_id?: number | null;
        shelf?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
    };
    settings: {
        default_reorder_level: number;
        expiring_soon_days: number;
    };
}

export default function PharmacyStockIndex({
    medicines,
    stats,
    duplicatePairs = [],
    suppliers = [],
    shelves = [],
    forms = [],
    filters,
    settings,
}: Props) {
    const { can } = usePermission();

    // View Density Toggle: 'comfortable' | 'compact'
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

    // Barcode scanner modal
    const [scannerOpen, setScannerOpen] = useState(false);
    const [unlinkedBarcode, setUnlinkedBarcode] = useState<string | null>(null);

    // Detail Drawer
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
    const [drawerData, setDrawerData] = useState<any | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'batches' | 'movements' | 'usage'>('overview');
    const [showVoidedBatches, setShowVoidedBatches] = useState(false);
    const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'receipt' | 'dispense' | 'adjustment'>('all');
    const [movementSearch, setMovementSearch] = useState('');

    // Expandable table rows
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    // Main Table Search State (Live Debounced)
    const [tableSearch, setTableSearch] = useState(filters.search || '');
    const debouncedTableSearch = useDebounce(tableSearch, 300);
    const isInitialSearchRender = useRef(true);

    // Inline Drawer Selling Price Edit
    const [isEditingDrawerPrice, setIsEditingDrawerPrice] = useState(false);
    const [drawerPriceValue, setDrawerPriceValue] = useState('');
    const [drawerPriceSubmitting, setDrawerPriceSubmitting] = useState(false);

    // Edit Medicine Modal State
    const [editMedicineModalOpen, setEditMedicineModalOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<any | null>(null);
    const [editMedicineForm, setEditMedicineForm] = useState({
        selling_price: '',
        use_default_reorder: true,
        reorder_level: '',
        shelf_location: '',
        base_unit: 'tablet',
        pack_size: '1',
        brand_name: '',
        is_active: true,
        new_barcode: '',
        barcodes: [] as string[],
    });
    const [editMedicineInitial, setEditMedicineInitial] = useState<any | null>(null);
    const [editMedicineSubmitting, setEditMedicineSubmitting] = useState(false);
    const [editMedicineError, setEditMedicineError] = useState<string | null>(null);
    const [showUnsavedEditGuard, setShowUnsavedEditGuard] = useState(false);

    // Edit Batch Metadata Modal State
    const [editBatchModalOpen, setEditBatchModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<any | null>(null);
    const [editBatchForm, setEditBatchForm] = useState({
        batch_number: '',
        expiry_date: '',
        cost_price: '',
        supplier_id: '',
    });
    const [editBatchSubmitting, setEditBatchSubmitting] = useState(false);
    const [editBatchError, setEditBatchError] = useState<string | null>(null);

    // Void Batch Modal State
    const [voidBatchModalOpen, setVoidBatchModalOpen] = useState(false);
    const [voidingBatch, setVoidingBatch] = useState<any | null>(null);
    const [voidBatchReason, setVoidBatchReason] = useState('');
    const [voidBatchSubmitting, setVoidBatchSubmitting] = useState(false);
    const [voidBatchError, setVoidBatchError] = useState<string | null>(null);

    // Delete / Deactivate Medicine Modal State
    const [deleteMedicineModalOpen, setDeleteMedicineModalOpen] = useState(false);
    const [deletingMedicine, setDeletingMedicine] = useState<any | null>(null);
    const [deleteMedicineSubmitting, setDeleteMedicineSubmitting] = useState(false);
    const [deleteActionChoice, setDeleteActionChoice] = useState<'deactivate' | 'hard_delete'>('deactivate');

    // Add Medicine Modal State (Guided 3-step flow)
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addStep, setAddStep] = useState<1 | 2 | 3>(1);
    const [submitting, setSubmitting] = useState(false);
    const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'amber' | 'error'; message: string } | null>(null);
    const [highlightedMedicineId, setHighlightedMedicineId] = useState<number | null>(null);

    // Step 1: Catalog Search & Custom Medicine
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 250);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchActiveIndex, setSearchActiveIndex] = useState<number>(-1);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<any | null>(null);
    const [customFormActive, setCustomFormActive] = useState(false);
    const [duplicateWarningExisting, setDuplicateWarningExisting] = useState<MedicineStockItem | any | null>(null);
    const [bypassDuplicateWarning, setBypassDuplicateWarning] = useState(false);

    // Custom Medicine Form Fields
    const [customGeneric, setCustomGeneric] = useState('');
    const [customStrength, setCustomStrength] = useState('');
    const [customDosageForm, setCustomDosageForm] = useState('Tablet');
    const [customRoute, setCustomRoute] = useState('Oral');
    const [customBrand, setCustomBrand] = useState('');
    const [customManufacturer, setCustomManufacturer] = useState('');

    // Step 2: Price & Settings Form Fields
    const [brandName, setBrandName] = useState('');
    const [baseUnit, setBaseUnit] = useState('tablet');
    const [packSize, setPackSize] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [useDefaultReorder, setUseDefaultReorder] = useState(true);
    const [customReorderLevel, setCustomReorderLevel] = useState(settings.default_reorder_level.toString());
    const [shelfLocation, setShelfLocation] = useState('');
    const [barcode, setBarcode] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Step 3: Opening Stock Batches
    const [openingBatches, setOpeningBatches] = useState<BatchInputRow[]>([]);

    // Modal Validation & Guards
    const [addErrors, setAddErrors] = useState<Record<string, string>>({});
    const [showUnsavedAddGuard, setShowUnsavedAddGuard] = useState(false);

    // Quick Add Stock Modal State
    const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
    const [quickAddMedicine, setQuickAddMedicine] = useState<MedicineStockItem | any | null>(null);
    const [quickBatches, setQuickBatches] = useState<BatchInputRow[]>([
        { batch_number: '', expiry_date: '', quantity: '', cost_price: '' },
    ]);
    const [quickSubmitting, setQuickSubmitting] = useState(false);
    const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});

    // Stock Adjustment Modal State
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjustBatchId, setAdjustBatchId] = useState<number | null>(null);
    const [adjustBatchInfo, setAdjustBatchInfo] = useState<any | null>(null);
    const [adjustType, setAdjustType] = useState('adjustment_out');
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [adjustError, setAdjustError] = useState<string | null>(null);

    // Duplicates Review Modal State
    const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);
    const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);
    const [mergeKeptId, setMergeKeptId] = useState<number | null>(null);
    const [mergeReason, setMergeReason] = useState('Merged duplicate medicine records into primary entry');
    const [mergeSubmitting, setMergeSubmitting] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);

    // More Menu Dropdown State
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Watch flash messages
    const { flash } = usePage<any>().props;
    useEffect(() => {
        if (flash?.success) {
            setToast({ type: 'success', message: flash.success });
            if (flash?.created_medicine_id) {
                setHighlightedMedicineId(flash.created_medicine_id);
                setTimeout(() => setHighlightedMedicineId(null), 8000);
            }
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
        if (flash?.error) {
            setToast({ type: 'error', message: flash.error });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // Close "More" dropdown when clicked outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setMoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Live search catalog when typing in Add Medicine modal
    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setSearchResults([]);
            setSearchError(null);
            return;
        }

        let isMounted = true;
        setSearchLoading(true);
        setSearchError(null);
        fetch(`/pharmacy/catalog/search?q=${encodeURIComponent(debouncedSearch.trim())}`)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: Failed to search catalog`);
                }
                return res.json();
            })
            .then((data) => {
                if (isMounted) {
                    setSearchResults(data.results || []);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setSearchError(err.message || 'Failed to search medicine catalog');
                }
            })
            .finally(() => {
                if (isMounted) setSearchLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [debouncedSearch]);

    // Check for duplicate warning in Add Medicine Modal
    useEffect(() => {
        if (!addModalOpen) {
            setDuplicateWarningExisting(null);
            setBypassDuplicateWarning(false);
            return;
        }

        if (selectedCatalogItem?.existing_medicine) {
            setDuplicateWarningExisting(selectedCatalogItem.existing_medicine);
            return;
        }

        let targetGeneric = '';
        let targetBrand = '';

        if (customFormActive) {
            targetGeneric = customGeneric.toLowerCase().trim();
            targetBrand = customBrand.toLowerCase().trim();
        } else if (selectedCatalogItem) {
            targetGeneric = (selectedCatalogItem.generic_name || '').toLowerCase().trim();
            targetBrand = (selectedCatalogItem.brand_name || '').toLowerCase().trim();
        }

        if (!targetGeneric) {
            setDuplicateWarningExisting(null);
            return;
        }

        // Compare against existing medicines in list
        const found = medicines.data.find((m) => {
            const mGeneric = m.generic_name.toLowerCase().trim();
            const mBrand = (m.brand_name || '').toLowerCase().trim();
            if (targetBrand && mBrand && targetBrand === mBrand) {
                return true;
            }
            return targetGeneric && mGeneric === targetGeneric;
        });

        setDuplicateWarningExisting(found || null);
    }, [selectedCatalogItem, customFormActive, customGeneric, customBrand, addModalOpen]);

    const handleFilterChange = (key: string, value: any) => {
        const nextFilters = { ...filters, [key]: value };
        if (key !== 'page') {
            delete (nextFilters as any).page;
        }
        router.get('/pharmacy/medicines', nextFilters, {
            preserveState: true,
            replace: true,
        });
    };

    // Table Search Bar debounced filter trigger
    useEffect(() => {
        if (isInitialSearchRender.current) {
            isInitialSearchRender.current = false;
            return;
        }
        if (debouncedTableSearch !== (filters.search || '')) {
            handleFilterChange('search', debouncedTableSearch);
        }
    }, [debouncedTableSearch]);

    useEffect(() => {
        if (filters.search !== tableSearch) {
            setTableSearch(filters.search || '');
        }
    }, [filters.search]);

    const openDetailDrawer = async (id: number) => {
        setSelectedMedicineId(id);
        setDetailDrawerOpen(true);
        setDrawerLoading(true);
        setDrawerTab('overview');
        try {
            const res = await fetch(`/pharmacy/medicines/${id}`);
            const data = await res.json();
            setDrawerData(data);
        } catch (err) {
            console.error('Failed to load medicine details:', err);
        } finally {
            setDrawerLoading(false);
        }
    };

    const toggleRowExpand = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handlePrintBarcodeLabel = (med?: any, batch?: any) => {
        if (!med) return;
        const name = med.normalized_display_name || med.display_name;
        const code = batch?.batch_number ? `BATCH:${batch.batch_number}` : (med.barcodes?.[0] || med.barcode || `MED-${med.id}`);
        const printWindow = window.open('', '_blank', 'width=420,height=320');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Barcode Label - ${name}</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 24px; color: #0f172a; }
                            h2 { font-size: 14px; font-weight: 700; margin: 0 0 4px 0; }
                            p { font-size: 11px; color: #475569; margin: 2px 0; }
                            .barcode-box { margin: 14px auto; padding: 10px 14px; border: 1.5px dashed #0f172a; border-radius: 8px; display: inline-block; }
                            .barcode-val { font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 3px; }
                            .meta { font-size: 10px; color: #64748b; margin-top: 8px; }
                        </style>
                    </head>
                    <body>
                        <h2>${name}</h2>
                        <p>${med.generic_name || ''} · ${med.strength || med.strength_form || ''} · ${med.dosage_form || 'Tablet'}</p>
                        <div class="barcode-box">
                            <div class="barcode-val">${code}</div>
                        </div>
                        ${batch?.batch_number ? `<p class="meta">Batch: #${batch.batch_number} · Exp: ${batch.expiry_date_formatted || batch.expiry_date || 'N/A'}</p>` : ''}
                        <script>
                            window.onload = function() {
                                window.focus();
                                window.print();
                                window.close();
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            setToast({ type: 'success', message: `Barcode label ready for ${name}.` });
        }
    };

    const openEditMedicine = (med: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingMedicine(med);
        const isDefaultReorder = med.reorder_level === null || med.reorder_level === undefined || med.reorder_level === '';
        const initial = {
            selling_price: med.selling_price_cents > 0 ? (med.selling_price_cents / 100).toFixed(2) : '',
            use_default_reorder: isDefaultReorder,
            reorder_level: !isDefaultReorder ? String(med.reorder_level) : '',
            shelf_location: med.shelf_location || '',
            base_unit: med.base_unit || 'tablet',
            pack_size: med.pack_size ? String(med.pack_size) : '1',
            brand_name: med.brand_name || '',
            is_active: med.is_active ?? true,
            new_barcode: '',
            barcodes: med.barcodes || (drawerData?.medicine?.id === med.id ? (drawerData?.medicine?.barcodes || []) : []),
        };
        setEditMedicineForm(initial);
        setEditMedicineInitial(initial);
        setEditMedicineError(null);
        setShowUnsavedEditGuard(false);
        setEditMedicineModalOpen(true);

        fetch(`/pharmacy/medicines/${med.id}`)
            .then((res) => res.json())
            .then((data) => {
                if (data?.medicine) {
                    setEditingMedicine((prev: any) => ({
                        ...prev,
                        ...data.medicine,
                    }));
                    setEditMedicineForm((prev) => ({
                        ...prev,
                        barcodes: data.medicine.barcodes || prev.barcodes,
                        brand_name: prev.brand_name || data.medicine.brand_name || '',
                    }));
                }
            })
            .catch(() => {});
    };

    const isEditMedicineDirty = () => {
        if (!editMedicineInitial) return false;
        return (
            editMedicineForm.selling_price !== editMedicineInitial.selling_price ||
            editMedicineForm.use_default_reorder !== editMedicineInitial.use_default_reorder ||
            (!editMedicineForm.use_default_reorder && editMedicineForm.reorder_level !== editMedicineInitial.reorder_level) ||
            editMedicineForm.shelf_location !== editMedicineInitial.shelf_location ||
            editMedicineForm.base_unit !== editMedicineInitial.base_unit ||
            editMedicineForm.pack_size !== editMedicineInitial.pack_size ||
            editMedicineForm.brand_name !== editMedicineInitial.brand_name ||
            editMedicineForm.is_active !== editMedicineInitial.is_active ||
            editMedicineForm.new_barcode.trim() !== ''
        );
    };

    const handleCloseEditMedicine = (force = false) => {
        if (!force && isEditMedicineDirty()) {
            setShowUnsavedEditGuard(true);
            return;
        }
        setShowUnsavedEditGuard(false);
        setEditMedicineModalOpen(false);
    };

    const handleEditMedicineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMedicine) return;

        const sellingPriceNum = parseFloat(editMedicineForm.selling_price);
        if (isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
            setEditMedicineError('Selling price must be greater than 0.');
            return;
        }

        if (!editMedicineForm.use_default_reorder && editMedicineForm.reorder_level !== '') {
            const reorderNum = parseInt(editMedicineForm.reorder_level, 10);
            if (isNaN(reorderNum) || reorderNum < 0) {
                setEditMedicineError('Reorder level must be a non-negative number.');
                return;
            }
        }

        setEditMedicineSubmitting(true);
        setEditMedicineError(null);

        router.put(
            route('tenant.pharmacy.medicines.update', editingMedicine.id),
            {
                selling_price: sellingPriceNum,
                reorder_level: editMedicineForm.use_default_reorder
                    ? null
                    : (editMedicineForm.reorder_level !== '' ? parseInt(editMedicineForm.reorder_level, 10) : null),
                shelf_location: editMedicineForm.shelf_location,
                base_unit: editMedicineForm.base_unit,
                brand_name: editMedicineForm.brand_name,
                is_active: editMedicineForm.is_active,
                new_barcode: editMedicineForm.new_barcode.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditMedicineModalOpen(false);
                    setShowUnsavedEditGuard(false);
                    setToast({ type: 'success', message: 'Medicine updated successfully.' });
                    if (selectedMedicineId === editingMedicine.id || (detailDrawerOpen && drawerData?.medicine?.id === editingMedicine.id)) {
                        openDetailDrawer(editingMedicine.id);
                    }
                },
                onError: (errs) => {
                    setEditMedicineError((Object.values(errs)[0] as string) || 'Failed to update medicine.');
                },
                onFinish: () => setEditMedicineSubmitting(false),
            }
        );
    };

    const handleInlineDrawerPriceSave = () => {
        if (!drawerData?.medicine) return;
        setDrawerPriceSubmitting(true);

        router.put(
            route('tenant.pharmacy.medicines.update', drawerData.medicine.id),
            {
                selling_price: drawerPriceValue !== '' ? drawerPriceValue : 0,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingDrawerPrice(false);
                    setToast({ type: 'success', message: 'Selling price updated.' });
                    openDetailDrawer(drawerData.medicine.id);
                },
                onError: (errs) => {
                    setToast({ type: 'error', message: (Object.values(errs)[0] as string) || 'Failed to update price.' });
                },
                onFinish: () => setDrawerPriceSubmitting(false),
            }
        );
    };

    const openEditBatch = (batch: any) => {
        setEditingBatch(batch);
        setEditBatchForm({
            batch_number: batch.batch_number === 'No batch' ? '' : batch.batch_number,
            expiry_date: batch.expiry_date || '',
            cost_price: batch.cost_price_cents > 0 ? (batch.cost_price_cents / 100).toFixed(2) : '',
            supplier_id: batch.supplier_id ? batch.supplier_id.toString() : '',
        });
        setEditBatchError(null);
        setEditBatchModalOpen(true);
    };

    const handleEditBatchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBatch) return;
        setEditBatchSubmitting(true);
        setEditBatchError(null);

        router.put(
            route('tenant.pharmacy.batches.update', editingBatch.id),
            {
                batch_number: editBatchForm.batch_number,
                expiry_date: editBatchForm.expiry_date,
                cost_price: editBatchForm.cost_price,
                supplier_id: editBatchForm.supplier_id || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditBatchModalOpen(false);
                    setToast({ type: 'success', message: 'Batch updated successfully.' });
                    if (selectedMedicineId) openDetailDrawer(selectedMedicineId);
                },
                onError: (errs) => {
                    setEditBatchError((Object.values(errs)[0] as string) || 'Failed to update batch.');
                },
                onFinish: () => setEditBatchSubmitting(false),
            }
        );
    };

    const openVoidBatch = (batch: any) => {
        setVoidingBatch(batch);
        setVoidBatchReason('');
        setVoidBatchError(null);
        setVoidBatchModalOpen(true);
    };

    const handleVoidBatchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!voidingBatch || !voidBatchReason.trim()) return;

        setVoidBatchSubmitting(true);
        setVoidBatchError(null);

        router.post(
            route('tenant.pharmacy.batches.void', voidingBatch.id),
            { reason: voidBatchReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVoidBatchModalOpen(false);
                    setToast({ type: 'success', message: `Batch ${voidingBatch.batch_number} voided.` });
                    if (selectedMedicineId) openDetailDrawer(selectedMedicineId);
                },
                onError: (errs) => {
                    setVoidBatchError((Object.values(errs)[0] as string) || 'Failed to void batch.');
                },
                onFinish: () => setVoidBatchSubmitting(false),
            }
        );
    };

    const handleDeleteOrInactive = (med: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setDeletingMedicine(med);
        // If medicine has history, force choice to deactivate
        const hasHistory = med.has_movements || (med.batches && med.batches.length > 0) || med.total_quantity > 0;
        setDeleteActionChoice(hasHistory ? 'deactivate' : 'hard_delete');
        setDeleteMedicineModalOpen(true);
    };

    const confirmDeleteOrInactive = () => {
        if (!deletingMedicine) return;
        setDeleteMedicineSubmitting(true);

        if (deleteActionChoice === 'deactivate') {
            router.put(
                route('tenant.pharmacy.medicines.update', deletingMedicine.id),
                { is_active: false },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setDeleteMedicineModalOpen(false);
                        setToast({ type: 'success', message: `${deletingMedicine.normalized_display_name || deletingMedicine.display_name} deactivated.` });
                        if (detailDrawerOpen && selectedMedicineId === deletingMedicine.id) {
                            openDetailDrawer(deletingMedicine.id);
                        }
                    },
                    onFinish: () => setDeleteMedicineSubmitting(false),
                }
            );
        } else {
            router.delete(
                route('tenant.pharmacy.medicines.destroy', deletingMedicine.id),
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setDeleteMedicineModalOpen(false);
                        setDetailDrawerOpen(false);
                        setToast({ type: 'success', message: `${deletingMedicine.display_name} permanently removed.` });
                    },
                    onError: (errs) => {
                        alert(Object.values(errs)[0] || 'Cannot delete medicine with recorded history.');
                    },
                    onFinish: () => setDeleteMedicineSubmitting(false),
                }
            );
        }
    };

    const openQuickAddModal = (medicine: MedicineStockItem | any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setQuickAddMedicine(medicine);
        setQuickBatches([{ batch_number: '', expiry_date: '', quantity: '', cost_price: '' }]);
        setQuickErrors({});
        setQuickAddModalOpen(true);
    };

    const handleQuickAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddMedicine) return;

        const newErrors: Record<string, string> = {};
        const today = new Date().toISOString().split('T')[0];

        const formatted = quickBatches.map((b, idx) => {
            const qty = parseInt(b.quantity, 10);
            if (!b.batch_number?.trim()) {
                newErrors[`batches.${idx}.batch_number`] = 'Batch number is required (or N/A)';
            }
            if (!b.expiry_date) {
                newErrors[`batches.${idx}.expiry_date`] = 'Expiry date is required';
            } else if (b.expiry_date <= today) {
                newErrors[`batches.${idx}.expiry_date`] = 'Expiry date must be in the future';
            }
            if (!qty || qty <= 0) {
                newErrors[`batches.${idx}.quantity`] = 'Quantity must be at least 1';
            }
            return {
                batch_number: b.batch_number ? b.batch_number.trim() : 'N/A',
                expiry_date: b.expiry_date,
                quantity: qty || 0,
                cost_price: b.cost_price ? parseFloat(b.cost_price) : null,
            };
        });

        if (Object.keys(newErrors).length > 0) {
            setQuickErrors(newErrors);
            return;
        }

        setQuickSubmitting(true);
        router.post(
            `/pharmacy/medicines/${quickAddMedicine.id}/batches`,
            { batches: formatted },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setQuickAddModalOpen(false);
                    setQuickSubmitting(false);
                    setToast({
                        type: 'success',
                        message: `Stock added successfully to ${quickAddMedicine.normalized_display_name || quickAddMedicine.display_name}.`,
                    });
                    if (detailDrawerOpen && selectedMedicineId === quickAddMedicine.id) {
                        openDetailDrawer(quickAddMedicine.id);
                    }
                },
                onError: (errs) => {
                    setQuickSubmitting(false);
                    setQuickErrors(errs);
                    setToast({ type: 'error', message: 'Failed to add stock batches.' });
                },
            }
        );
    };

    const resetAddMedicineModal = () => {
        setAddStep(1);
        setSelectedCatalogItem(null);
        setCustomFormActive(false);
        setSearchQuery('');
        setSearchResults([]);
        setSearchActiveIndex(-1);
        setDuplicateWarningExisting(null);
        setBypassDuplicateWarning(false);
        setCustomGeneric('');
        setCustomStrength('');
        setCustomDosageForm('Tablet');
        setCustomRoute('Oral');
        setCustomBrand('');
        setCustomManufacturer('');
        setBrandName('');
        setBaseUnit('tablet');
        setPackSize('');
        setCostPrice('');
        setSellingPrice('');
        setUseDefaultReorder(true);
        setCustomReorderLevel(settings.default_reorder_level.toString());
        setShelfLocation('');
        setBarcode('');
        setIsActive(true);
        setOpeningBatches([]);
        setAddErrors({});
        setShowUnsavedAddGuard(false);
    };

    const isAddModalDirty = () => {
        return (
            selectedCatalogItem !== null ||
            customFormActive ||
            searchQuery.trim() !== '' ||
            customGeneric.trim() !== '' ||
            customBrand.trim() !== '' ||
            sellingPrice.trim() !== '' ||
            costPrice.trim() !== '' ||
            brandName.trim() !== '' ||
            shelfLocation.trim() !== '' ||
            barcode.trim() !== '' ||
            openingBatches.length > 0
        );
    };

    const handleCloseAddModal = (force = false) => {
        if (!force && isAddModalDirty()) {
            setShowUnsavedAddGuard(true);
            return;
        }
        setShowUnsavedAddGuard(false);
        setAddModalOpen(false);
        resetAddMedicineModal();
    };

    const handleSelectCatalogItem = (item: any) => {
        setSelectedCatalogItem(item);
        setSearchResults([]);
        setSearchQuery('');
        setSearchActiveIndex(-1);
        setBaseUnit(item.base_unit || 'tablet');
        if (item.brand_name) {
            setBrandName(item.brand_name);
        } else {
            setBrandName('Generic');
        }
        if (item.existing_medicine) {
            setDuplicateWarningExisting(item.existing_medicine);
        }
    };

    const handleValidateStep1 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!selectedCatalogItem && !customFormActive) {
            errors.selection = 'Please search and select a catalog medicine or enter custom medicine details.';
        } else if (customFormActive) {
            if (!customGeneric.trim()) {
                errors.customGeneric = 'Generic formula name is required.';
            }
            if (!customStrength.trim()) {
                errors.customStrength = 'Strength is required (e.g. 500 mg).';
            }
        }
        if (duplicateWarningExisting && !bypassDuplicateWarning) {
            errors.duplicate = 'This medicine already exists in stock. Choose to add stock or create as a different brand.';
        }
        setAddErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleValidateStep2 = (): boolean => {
        const errors: Record<string, string> = {};
        const sellingPriceNum = parseFloat(sellingPrice);
        if (!sellingPrice.trim() || isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
            errors.sellingPrice = 'Selling price must be greater than 0.';
        }
        if (!useDefaultReorder && customReorderLevel.trim() !== '') {
            const reorderNum = parseInt(customReorderLevel, 10);
            if (isNaN(reorderNum) || reorderNum < 0) {
                errors.reorderLevel = 'Reorder level must be a non-negative number.';
            }
        }
        if (packSize.trim() !== '') {
            const packNum = parseInt(packSize, 10);
            if (isNaN(packNum) || packNum < 1) {
                errors.packSize = 'Pack size must be at least 1.';
            }
        }
        setAddErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleContinueFromStep1 = () => {
        if (!handleValidateStep1()) return;
        if (customFormActive && !brandName) {
            setBrandName(customBrand || 'Generic');
        }
        setAddStep(2);
    };

    const handleContinueFromStep2 = () => {
        if (!handleValidateStep2()) return;
        // If opening batches is empty, add 1 empty batch prefilled with cost price
        if (openingBatches.length === 0) {
            setOpeningBatches([
                { batch_number: '', expiry_date: '', quantity: '', cost_price: costPrice, supplier_id: '' },
            ]);
        } else if (costPrice && !openingBatches[0].cost_price) {
            const next = [...openingBatches];
            next[0].cost_price = costPrice;
            setOpeningBatches(next);
        }
        setAddStep(3);
    };

    const handleAddMedicineSubmit = (e?: React.FormEvent, andAddAnother = false) => {
        if (e) e.preventDefault();
        setSaveAndAddAnother(andAddAnother);

        if (!handleValidateStep1()) {
            setAddStep(1);
            return;
        }
        if (!handleValidateStep2()) {
            setAddStep(2);
            return;
        }

        const errors: Record<string, string> = {};
        const today = new Date().toISOString().split('T')[0];

        const filteredBatches = openingBatches.filter(
            (b) => b.batch_number?.trim() || b.expiry_date || b.quantity || b.cost_price || b.supplier_id
        );

        filteredBatches.forEach((b, idx) => {
            if (!b.batch_number?.trim()) {
                errors[`batches.${idx}.batch_number`] = 'Batch number is required.';
            }
            if (!b.expiry_date) {
                errors[`batches.${idx}.expiry_date`] = 'Expiry date is required.';
            } else if (b.expiry_date <= today) {
                errors[`batches.${idx}.expiry_date`] = 'Expiry date must be in the future.';
            }
            const qtyNum = parseInt(b.quantity, 10);
            if (!b.quantity || isNaN(qtyNum) || qtyNum < 1) {
                errors[`batches.${idx}.quantity`] = 'Quantity must be at least 1.';
            }
            if (b.cost_price) {
                const costNum = parseFloat(b.cost_price);
                if (isNaN(costNum) || costNum < 0) {
                    errors[`batches.${idx}.cost_price`] = 'Cost price cannot be negative.';
                }
            }
        });

        if (Object.keys(errors).length > 0) {
            setAddErrors(errors);
            setAddStep(3);
            return;
        }

        setAddErrors({});
        setSubmitting(true);

        const sellingPriceNum = parseFloat(sellingPrice);
        const payload: any = {
            base_unit: baseUnit || 'tablet',
            selling_price: sellingPriceNum,
            reorder_level: useDefaultReorder ? null : (customReorderLevel.trim() !== '' ? parseInt(customReorderLevel, 10) : null),
            shelf_location: shelfLocation.trim() || null,
            brand_name: brandName.trim() || null,
            pack_size: packSize.trim() ? parseInt(packSize, 10) : null,
            barcode: barcode.trim() || null,
            is_active: isActive,
        };

        if (customFormActive) {
            payload.generic_name = customGeneric.trim();
            payload.strength = customStrength.trim();
            payload.dosage_form = customDosageForm || 'Tablet';
            payload.route = customRoute || 'Oral';
            payload.brand_name = brandName.trim() || customBrand.trim() || null;
            payload.manufacturer = customManufacturer.trim() || null;
        } else if (selectedCatalogItem) {
            payload.variant_id = selectedCatalogItem.variant_id;
            payload.brand_id = selectedCatalogItem.brand_id || null;
        }

        if (filteredBatches.length > 0) {
            payload.opening_batches = filteredBatches.map((b) => ({
                batch_number: b.batch_number.trim(),
                expiry_date: b.expiry_date,
                quantity: parseInt(b.quantity, 10),
                cost_price: b.cost_price ? parseFloat(b.cost_price) : null,
                supplier_id: b.supplier_id ? parseInt(b.supplier_id, 10) : null,
            }));
        }

        router.post('/pharmacy/medicines', payload, {
            preserveScroll: true,
            onSuccess: (page) => {
                setSubmitting(false);
                const createdId = (page.props as any)?.flash?.created_medicine_id;
                if (createdId) {
                    setHighlightedMedicineId(createdId);
                    setTimeout(() => setHighlightedMedicineId(null), 8000);
                }
                const successMsg = (page.props as any)?.flash?.success || 'Medicine added to stock successfully.';
                setToast({ type: 'success', message: successMsg });

                if (andAddAnother) {
                    resetAddMedicineModal();
                } else {
                    setAddModalOpen(false);
                    resetAddMedicineModal();
                }
            },
            onError: (backendErrors) => {
                setSubmitting(false);
                setAddErrors(backendErrors);
                const firstErr = Object.values(backendErrors)[0] as string;
                setToast({ type: 'error', message: firstErr || 'Failed to save medicine.' });
                if (backendErrors.selling_price || backendErrors.barcode || backendErrors.reorder_level) {
                    setAddStep(2);
                } else if (backendErrors.generic_name || backendErrors.variant_id) {
                    setAddStep(1);
                } else if (backendErrors['opening_batches.0.expiry_date'] || backendErrors.opening_batches) {
                    setAddStep(3);
                }
            },
        });
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustBatchId || !adjustQty || !adjustReason.trim()) return;

        setAdjustError(null);
        router.post(
            '/pharmacy/stock/adjust',
            {
                batch_id: adjustBatchId,
                type: adjustType,
                quantity: parseInt(adjustQty, 10),
                reason: adjustReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAdjustModalOpen(false);
                    setAdjustQty('');
                    setAdjustReason('');
                    setToast({ type: 'success', message: 'Stock adjustment recorded successfully.' });
                    if (selectedMedicineId) {
                        openDetailDrawer(selectedMedicineId);
                    }
                },
                onError: (errs) => {
                    if (errs.quantity) {
                        setAdjustError(errs.quantity);
                    }
                },
            }
        );
    };

    const handleBarcodeScanned = (barcodeScanned: string) => {
        setScannerOpen(false);
        const code = barcodeScanned.trim();
        if (!code) return;

        if (editMedicineModalOpen) {
            setEditMedicineForm((prev) => ({
                ...prev,
                new_barcode: code,
            }));
            setToast({
                type: 'success',
                message: `Barcode added: ${code}`,
            });
            return;
        }

        if (addModalOpen) {
            fetch(`/pharmacy/barcodes/${encodeURIComponent(code)}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.found && data.clinic_medicine_id) {
                        const existing = medicines.data.find((m) => m.id === data.clinic_medicine_id);
                        if (existing) {
                            setDuplicateWarningExisting(existing);
                            setToast({
                                type: 'amber',
                                message: `Barcode belongs to existing stock item: ${existing.normalized_display_name || existing.display_name}`,
                            });
                            return;
                        }
                    }
                    if (data.found) {
                        const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;
                        setSelectedCatalogItem({
                            source: 'catalog',
                            in_stock: false,
                            variant_id: data.variant_id,
                            brand_id: data.brand_id || null,
                            display_name: displayName,
                            generic_name: data.generic_name,
                            strength_form: data.variant_display,
                            brand_name: data.brand_name || null,
                            base_unit: data.base_unit || 'tablet',
                            selling_price_cents: 0,
                        });
                        setBaseUnit(data.base_unit || 'tablet');
                        setBarcode(code);
                        if (data.brand_name) setBrandName(data.brand_name);
                        setToast({
                            type: 'success',
                            message: `Barcode matched: ${displayName}`,
                        });
                    } else {
                        setBarcode(code);
                        setToast({
                            type: 'success',
                            message: `Barcode captured: ${code}. Fill in medicine details.`,
                        });
                    }
                })
                .catch(() => {
                    setBarcode(code);
                });
            return;
        }

        fetch(`/pharmacy/barcodes/${encodeURIComponent(code)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.found) {
                    const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;
                    handleFilterChange('search', data.brand_name || data.generic_name || code);
                    setToast({
                        type: 'success',
                        message: `Found: ${displayName}`,
                    });
                } else {
                    setUnlinkedBarcode(code);
                    setToast({
                        type: 'amber',
                        message: `Barcode ${code} not yet linked in catalog.`,
                    });
                }
            })
            .catch(() => {
                setToast({
                    type: 'error',
                    message: `Failed to check barcode ${code}.`,
                });
            });
    };

    const handleBarcodeLinked = (data: LinkedBarcodeResult) => {
        const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;

        if (addModalOpen) {
            setSelectedCatalogItem({
                source: 'catalog',
                in_stock: true,
                clinic_medicine_id: data.clinic_medicine_id || null,
                variant_id: data.variant_id,
                brand_id: data.brand_id || null,
                display_name: displayName,
                generic_name: data.generic_name,
                strength_form: data.variant_display,
                brand_name: data.brand_name || null,
                base_unit: data.base_unit || 'tablet',
                selling_price_cents: 0,
            });
            setBaseUnit(data.base_unit || 'tablet');
            setToast({
                type: 'success',
                message: `Barcode ${data.barcode} linked to ${data.brand_name}!`,
            });
        } else {
            router.reload({ only: ['medicines'] });
            handleFilterChange('search', data.brand_name || data.generic_name || data.barcode);
            setToast({
                type: 'success',
                message: `Barcode ${data.barcode} linked and added to stock.`,
            });
        }
        setUnlinkedBarcode(null);
    };

    // Open Duplicates Review Modal
    const openDuplicatesModal = (pairKey?: string) => {
        if (pairKey) {
            setSelectedPairKey(pairKey);
            const pair = duplicatePairs.find((p) => p.pair_key === pairKey);
            if (pair) {
                setMergeKeptId(pair.medicine_a.id);
            }
        } else if (duplicatePairs.length > 0) {
            setSelectedPairKey(duplicatePairs[0].pair_key);
            setMergeKeptId(duplicatePairs[0].medicine_a.id);
        }
        setDuplicatesModalOpen(true);
        setMergeError(null);
    };

    // Submit Merge Action
    const handleMergeSubmit = () => {
        if (!selectedPairKey || !mergeKeptId) return;
        const currentPair = duplicatePairs.find((p) => p.pair_key === selectedPairKey);
        if (!currentPair) return;

        const mergedId = currentPair.medicine_a.id === mergeKeptId ? currentPair.medicine_b.id : currentPair.medicine_a.id;

        setMergeSubmitting(true);
        setMergeError(null);

        router.post(
            '/pharmacy/medicines/merge',
            {
                kept_id: mergeKeptId,
                merged_id: mergedId,
                reason: mergeReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setMergeSubmitting(false);
                    setToast({
                        type: 'success',
                        message: 'Medicines merged successfully. All batches and history consolidated.',
                    });
                    // Remove current pair or close if none left
                    const remaining = duplicatePairs.filter((p) => p.pair_key !== selectedPairKey);
                    if (remaining.length > 0) {
                        setSelectedPairKey(remaining[0].pair_key);
                        setMergeKeptId(remaining[0].medicine_a.id);
                    } else {
                        setDuplicatesModalOpen(false);
                    }
                },
                onError: (errs) => {
                    setMergeSubmitting(false);
                    setMergeError((Object.values(errs)[0] as string) || 'Merge operation failed.');
                },
            }
        );
    };

    // Dismiss Duplicate Pair
    const handleDismissDuplicate = (pairKey: string) => {
        router.post(
            '/pharmacy/medicines/dismiss-duplicate',
            { pair_key: pairKey },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setToast({ type: 'success', message: 'Duplicate alert dismissed.' });
                    const remaining = duplicatePairs.filter((p) => p.pair_key !== pairKey);
                    if (remaining.length > 0) {
                        setSelectedPairKey(remaining[0].pair_key);
                        setMergeKeptId(remaining[0].medicine_a.id);
                    } else {
                        setDuplicatesModalOpen(false);
                    }
                },
            }
        );
    };

    const activePair = duplicatePairs.find((p) => p.pair_key === selectedPairKey);

    return (
        <AuthenticatedLayout>
            <Head title="Medicines & stock - MedVisit" />

            {/* Floating Toast Notification */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-300">
                    <div
                        className={`p-4 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center gap-3 ${
                            toast.type === 'success'
                                ? 'bg-[#0E9E8F] text-white border-white/20 shadow-[#0E9E8F]/25'
                                : toast.type === 'amber'
                                ? 'bg-amber-600 text-white border-white/20 shadow-amber-600/25'
                                : 'bg-[#FF7A59] text-white border-white/20 shadow-[#FF7A59]/25'
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

            <div className="space-y-6 max-w-full">
                {/* Header */}
                <PageHeader
                    title="Medicines & stock"
                    subtitle="Your pharmacy's medicines, batches, prices and expiry."
                    action={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Secondary: Receive Stock (GRN) */}
                            {can('pharmacy.receive_stock') && (
                                <Link
                                    href="/pharmacy/goods-receipts/create"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-sm backdrop-blur-md transition-all hover:scale-[1.01]"
                                >
                                    <Boxes className="w-4 h-4 text-[#0E9E8F]" />
                                    <span>Receive stock (GRN)</span>
                                </Link>
                            )}

                            {/* Primary: Add Medicine */}
                            {can('pharmacy.manage_medicines') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetAddMedicineModal();
                                        setAddModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white font-semibold text-xs shadow-md shadow-[#1E6FD9]/20 transition-all hover:scale-[1.01]"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add medicine</span>
                                </button>
                            )}

                            {/* "More" Menu Dropdown */}
                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                    className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                                    title="More actions"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {moreMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                        {can('pharmacy.import') && (
                                            <Link
                                                href="/pharmacy/import-csv"
                                                onClick={() => setMoreMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <FileSpreadsheet className="w-4 h-4 text-[#0E9E8F]" />
                                                <span>Import CSV</span>
                                            </Link>
                                        )}

                                        {can('pharmacy.view') && (
                                            <Link
                                                href="/pharmacy/goods-receipts"
                                                onClick={() => setMoreMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <Receipt className="w-4 h-4 text-[#1E6FD9]" />
                                                <span>Stock receipts</span>
                                            </Link>
                                        )}

                                        {can('pharmacy.view') && (
                                            <Link
                                                href="/pharmacy/suppliers"
                                                onClick={() => setMoreMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <Truck className="w-4 h-4 text-slate-500" />
                                                <span>Suppliers</span>
                                            </Link>
                                        )}

                                        {can('pharmacy.manage_medicines') && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMoreMenuOpen(false);
                                                    openDuplicatesModal();
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <ArrowRightLeft className="w-4 h-4 text-[#FF7A59]" />
                                                    <span>Possible duplicates</span>
                                                </div>
                                                {stats.possible_duplicates_count > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF7A59]/15 text-[#FF7A59] border border-[#FF7A59]/30">
                                                        {stats.possible_duplicates_count}
                                                    </span>
                                                )}
                                            </button>
                                        )}

                                        {can('pharmacy.view') && (
                                            <a
                                                href="/pharmacy/medicines-export"
                                                onClick={() => setMoreMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-white/5 mt-1 pt-2"
                                            >
                                                <Download className="w-4 h-4 text-[#0E9E8F]" />
                                                <span>Export stock (CSV)</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    }
                />

                {/* Clickable Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Total Items */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange('tab', 'all')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                            filters.tab === 'all' || !filters.tab
                                ? 'bg-[#1E6FD9]/10 border-[#1E6FD9] dark:bg-[#1E6FD9]/20 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span>Total items</span>
                            <Package className="w-4 h-4 text-[#1E6FD9]" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                            {stats.total_items}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Active catalog items</div>
                    </button>

                    {/* Stock Value */}
                    <div className="p-4 rounded-2xl border bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 backdrop-blur-xl">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span>Stock value</span>
                            <TrendingUp className="w-4 h-4 text-[#0E9E8F]" />
                        </div>
                        <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white truncate">
                            {formatLKR(stats.stock_value_selling_cents)}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 truncate">
                            Cost: {formatLKR(stats.stock_value_cost_cents)}
                        </div>
                    </div>

                    {/* Low Stock */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange('tab', 'low_stock')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                            filters.tab === 'low_stock'
                                ? 'bg-amber-500/10 border-amber-500 dark:bg-amber-500/20 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-amber-300'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span>Low stock</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.low_stock_count}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">At or below reorder</div>
                    </button>

                    {/* Out of Stock */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange('tab', 'out_of_stock')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                            filters.tab === 'out_of_stock'
                                ? 'bg-rose-500/10 border-rose-500 dark:bg-rose-500/20 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-rose-300'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <span>Out of stock</span>
                            <XCircle className="w-4 h-4" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {stats.out_of_stock_count}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Zero active units</div>
                    </button>

                    {/* Expiring Soon */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange('tab', 'expiring_soon')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                            filters.tab === 'expiring_soon'
                                ? 'bg-orange-500/10 border-orange-500 dark:bg-orange-500/20 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-orange-300'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-orange-600 dark:text-orange-400">
                            <span>Expiring in {settings.expiring_soon_days}d</span>
                            <Clock className="w-4 h-4" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {stats.expiring_soon_count}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Batches near expiry</div>
                    </button>

                    {/* Expired */}
                    <button
                        type="button"
                        onClick={() => handleFilterChange('tab', 'expired')}
                        className={`text-left p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                            filters.tab === 'expired'
                                ? 'bg-red-500/10 border-red-500 dark:bg-red-500/20 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-red-300'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-red-600 dark:text-red-400">
                            <span>Expired</span>
                            <Ban className="w-4 h-4" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                            {stats.expired_count}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Must be quarantined</div>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="space-y-3">
                    {/* Status Tabs WITH Counts */}
                    <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 scrollbar-none">
                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 shrink-0">
                            {[
                                { id: 'all', label: 'All', count: stats.total_items },
                                { id: 'low_stock', label: 'Low', count: stats.low_stock_count },
                                { id: 'out_of_stock', label: 'Out', count: stats.out_of_stock_count },
                                { id: 'expiring_soon', label: `Expiring ${settings.expiring_soon_days}d`, count: stats.expiring_soon_count },
                                { id: 'expired', label: 'Expired', count: stats.expired_count },
                                { id: 'inactive', label: 'Inactive', count: stats.inactive_count },
                                { id: 'duplicates', label: 'Possible duplicates', count: stats.possible_duplicates_count },
                            ].map((tab) => {
                                const isActive = (filters.tab || 'all') === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleFilterChange('tab', tab.id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                            isActive
                                                ? 'bg-white dark:bg-slate-900 text-[#1E6FD9] dark:text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                isActive
                                                    ? 'bg-[#1E6FD9]/15 text-[#1E6FD9] dark:bg-white/20 dark:text-white'
                                                    : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* View Density Toggle */}
                        <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 shrink-0">
                            <button
                                type="button"
                                onClick={() => setDensity('comfortable')}
                                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    density === 'comfortable'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Comfortable row spacing"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setDensity('compact')}
                                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    density === 'compact'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Compact table view"
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Search, Barcode & Dropdown Filters Bar */}
                    <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
                        {/* Search Input with Full Placeholder and Barcode Trigger */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    placeholder="Search by medicine name, generic, brand, barcode, or batch..."
                                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md outline-none focus:ring-2 focus:ring-[#1E6FD9] text-slate-900 dark:text-white placeholder-slate-400"
                                />
                                {tableSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTableSearch('');
                                            handleFilterChange('search', '');
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        title="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setScannerOpen(true)}
                                className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors shrink-0 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                                title="Scan barcode with camera or scanner"
                            >
                                <Barcode className="w-4 h-4 text-[#0E9E8F]" />
                                <span className="hidden sm:inline">Scan barcode</span>
                            </button>
                        </div>

                        {/* Dropdown Filters: Form, Supplier, Shelf, Sort */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* Form Filter */}
                            <select
                                value={filters.form || ''}
                                onChange={(e) => handleFilterChange('form', e.target.value)}
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                            >
                                <option value="">All forms</option>
                                {forms.map((f) => (
                                    <option key={f} value={f}>
                                        {f}
                                    </option>
                                ))}
                            </select>

                            {/* Supplier Filter */}
                            <select
                                value={filters.supplier_id ? String(filters.supplier_id) : ''}
                                onChange={(e) => handleFilterChange('supplier_id', e.target.value)}
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                            >
                                <option value="">All suppliers</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>

                            {/* Shelf Filter */}
                            <select
                                value={filters.shelf || ''}
                                onChange={(e) => handleFilterChange('shelf', e.target.value)}
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                            >
                                <option value="">All shelves</option>
                                {shelves.map((sh) => (
                                    <option key={sh} value={sh}>
                                        Shelf: {sh}
                                    </option>
                                ))}
                            </select>

                            {/* Sort Filter */}
                            <select
                                value={`${filters.sort || 'name'}_${filters.direction || 'asc'}`}
                                onChange={(e) => {
                                    const [sort, direction] = e.target.value.split('_');
                                    router.get(
                                        '/pharmacy/medicines',
                                        { ...filters, sort, direction },
                                        { preserveState: true, replace: true }
                                    );
                                }}
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                            >
                                <option value="name_asc">Name (A-Z)</option>
                                <option value="name_desc">Name (Z-A)</option>
                                <option value="stock_desc">Highest stock</option>
                                <option value="stock_asc">Lowest stock</option>
                                <option value="expiry_asc">Earliest expiry</option>
                                <option value="value_desc">Highest price</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Wrapped in Horizontal Scroll Container (Guarantees Shared Layout Sidebar is never clipped) */}
                <div className="w-full overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm">
                    <table className="w-full text-left text-sm min-w-[980px]">
                        <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="w-8 py-3.5 pl-4 pr-1"></th>
                                <th className="py-3.5 px-4">Medicine</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Selling price</th>
                                <th className="py-3.5 px-4">Stock level</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Nearest expiry</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {medicines.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-400">
                                        <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                        <p className="font-semibold text-sm">No medicines found matching the selected filters.</p>
                                        <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching tabs.</p>
                                    </td>
                                </tr>
                            ) : (
                                medicines.data.map((med) => {
                                    const isExpanded = expandedRows.has(med.id);
                                    const rowPadding = density === 'compact' ? 'py-2 px-4' : 'py-3.5 px-4';

                                    // Progress bar calculation
                                    const reorderRef = med.effective_reorder_level || settings.default_reorder_level || 10;
                                    const stockPercentage = Math.min(100, Math.round((med.total_quantity / (reorderRef * 2)) * 100));

                                    return (
                                        <React.Fragment key={med.id}>
                                            <tr
                                                onClick={() => openDetailDrawer(med.id)}
                                                className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-all ${
                                                    isExpanded ? 'bg-slate-50/50 dark:bg-slate-800/40' : ''
                                                } ${
                                                    highlightedMedicineId === med.id
                                                        ? 'ring-2 ring-[#0E9E8F] bg-[#0E9E8F]/15 dark:bg-[#0E9E8F]/25 animate-pulse'
                                                        : ''
                                                }`}
                                            >
                                                {/* Expand Chevron */}
                                                <td
                                                    className="py-3 pl-3 pr-1 text-center"
                                                    onClick={(e) => toggleRowExpand(med.id, e)}
                                                >
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform"
                                                        title={isExpanded ? 'Collapse batches' : 'Expand batches and recent movements'}
                                                    >
                                                        <ChevronDown
                                                            className={`w-4 h-4 transition-transform duration-200 ${
                                                                isExpanded ? 'rotate-0 text-[#1E6FD9]' : '-rotate-90'
                                                            }`}
                                                        />
                                                    </button>
                                                </td>

                                                {/* Medicine Name & Details */}
                                                <td className={rowPadding}>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {med.normalized_display_name || med.display_name}
                                                        </span>

                                                        {/* Brand Chip if not generic */}
                                                        {med.brand_name && med.brand_name.toLowerCase() !== 'generic' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                {med.brand_name}
                                                            </span>
                                                        )}

                                                        {/* Possible Duplicate Badge */}
                                                        {med.has_possible_duplicate && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDuplicatesModal(med.duplicate_pair_key || undefined);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF7A59]/15 text-[#FF7A59] border border-[#FF7A59]/30 hover:bg-[#FF7A59]/25 transition-colors"
                                                                title="Potential duplicate record detected. Click to review side-by-side."
                                                            >
                                                                <AlertCircle className="w-3 h-3" />
                                                                <span>Possible duplicate</span>
                                                            </button>
                                                        )}

                                                        {/* Shelf Chip */}
                                                        {med.shelf_location && (
                                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-medium bg-teal-50 dark:bg-teal-950/40 text-[#0E9E8F] border border-teal-200/60 dark:border-teal-800/60">
                                                                Shelf: {med.shelf_location}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {med.generic_name} &bull; {med.strength_form}
                                                    </div>
                                                </td>

                                                {/* Selling Price (Single Line nowrap + Tooltip for Cost & Margin) */}
                                                <td className={`${rowPadding} whitespace-nowrap`}>
                                                    {med.selling_price_cents > 0 ? (
                                                        <div
                                                            className="flex items-baseline gap-1.5"
                                                            title={`Cost price: ${formatLKR(med.cost_price_cents)} · Margin: ${
                                                                med.margin_percent !== null ? `${med.margin_percent}%` : 'N/A'
                                                            }`}
                                                        >
                                                            <span className="font-bold text-slate-900 dark:text-white">
                                                                {formatLKR(med.selling_price_cents)}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-normal">
                                                                per {med.base_unit}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                                Price not set
                                                            </span>
                                                            {can('pharmacy.manage_medicines') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => openEditMedicine(med, e)}
                                                                    className="text-[11px] font-bold text-[#1E6FD9] hover:underline"
                                                                >
                                                                    Set price
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Stock Level with Mini Progress Bar & Reorder Level */}
                                                <td className={rowPadding}>
                                                    <div className="flex items-baseline gap-1">
                                                        <span
                                                            className={`font-extrabold ${
                                                                med.total_quantity <= 0
                                                                    ? 'text-rose-600 dark:text-rose-400'
                                                                    : med.total_quantity <= med.effective_reorder_level
                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                    : 'text-slate-900 dark:text-white'
                                                            }`}
                                                        >
                                                            {med.total_quantity}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {med.base_unit}s
                                                        </span>
                                                    </div>

                                                    {/* Mini bar & reorder level */}
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    med.total_quantity <= 0
                                                                        ? 'bg-rose-500'
                                                                        : med.total_quantity <= med.effective_reorder_level
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-[#0E9E8F]'
                                                                }`}
                                                                style={{ width: `${stockPercentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                            reorder at {med.effective_reorder_level}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Nearest Expiry in Sri Lankan d/m/Y format & Batch Popover trigger */}
                                                <td className={`${rowPadding} whitespace-nowrap text-xs font-medium`}>
                                                    {med.nearest_expiry ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={`font-semibold ${
                                                                    med.nearest_expiry_urgency === 'expired'
                                                                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                                                                        : med.nearest_expiry_urgency === 'expiring_soon'
                                                                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                                                                        : 'text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                {med.nearest_expiry}
                                                            </span>

                                                            {med.batch_count > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => toggleRowExpand(med.id, e)}
                                                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                                    title={`${med.batch_count} active batches available. Click to inspect all batches.`}
                                                                >
                                                                    +{med.batch_count - 1} batch{med.batch_count > 2 ? 'es' : ''}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>

                                                {/* Status Pill */}
                                                <td className={rowPadding}>
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            med.status === 'in_stock'
                                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                                : med.status === 'low_stock'
                                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                                : med.status === 'out_of_stock'
                                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                                                : med.status === 'expiring_soon'
                                                                ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30'
                                                                : med.status === 'expired'
                                                                ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {STATUS_LABELS[med.status] || med.status}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className={`${rowPadding} text-right`} onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Quick Add Stock (+) */}
                                                        {can('pharmacy.receive_stock') && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openQuickAddModal(med, e)}
                                                                className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#0E9E8F] hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800/80 transition-colors"
                                                                title="Quick add stock / batch"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Edit Medicine */}
                                                        {can('pharmacy.manage_medicines') && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openEditMedicine(med, e)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E6FD9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                title="Edit medicine settings"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Detail Drawer Chevron */}
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetailDrawer(med.id)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="View batches & movements"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable Inline Batches & Movement Ledger */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/70 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-white/10">
                                                    <td colSpan={7} className="py-4 px-6">
                                                        <div className="space-y-4">
                                                            {/* Batch Ledger */}
                                                            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-850 overflow-hidden shadow-sm">
                                                                <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                    <div className="flex items-center gap-2">
                                                                        <Layers className="w-3.5 h-3.5 text-[#1E6FD9]" />
                                                                        <span>Active batches for {med.normalized_display_name || med.display_name}</span>
                                                                    </div>
                                                                    <span className="text-[11px] font-normal text-slate-400">
                                                                        FEFO ordered (earliest expiry first)
                                                                    </span>
                                                                </div>

                                                                {!med.batches || med.batches.length === 0 ? (
                                                                    <div className="py-5 text-center text-xs text-slate-400">
                                                                        No active batches currently in stock.
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full overflow-x-auto">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-white/5">
                                                                                <tr>
                                                                                    <th className="py-2 px-3">Batch no.</th>
                                                                                    <th className="py-2 px-3">Expiry (d/m/Y)</th>
                                                                                    <th className="py-2 px-3">Remaining / Received</th>
                                                                                    <th className="py-2 px-3">Cost / unit</th>
                                                                                    <th className="py-2 px-3">Supplier</th>
                                                                                    <th className="py-2 px-3">Received date</th>
                                                                                    <th className="py-2 px-3">Status</th>
                                                                                    <th className="py-2 px-3 text-right">Actions</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                                                {med.batches.map((b) => (
                                                                                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                                                                                        <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                                                            {b.batch_number}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                                                                                            {formatDateDMY(b.expiry_date)}
                                                                                        </td>
                                                                                        <td className="py-2 px-3">
                                                                                            <span className="font-extrabold text-slate-900 dark:text-white">
                                                                                                {b.quantity_remaining}
                                                                                            </span>
                                                                                            <span className="text-slate-400 ml-1">
                                                                                                / {b.quantity_received} {med.base_unit}s
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                                                                                            {formatLKR(b.cost_price_cents)}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                                                                            {b.supplier_name || '—'}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-slate-500">
                                                                                            {formatDateDMY(b.received_at)}
                                                                                        </td>
                                                                                        <td className="py-2 px-3">
                                                                                            {b.status === 'expired' ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                                                    Expired
                                                                                                </span>
                                                                                            ) : b.status === 'expiring_soon' ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                                                    Expiring soon
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                                                    OK
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-right">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    setAdjustBatchId(b.id);
                                                                                                    setAdjustBatchInfo({
                                                                                                        batch_number: b.batch_number,
                                                                                                        quantity_remaining: b.quantity_remaining,
                                                                                                        base_unit: med.base_unit,
                                                                                                        medicine_name: med.normalized_display_name || med.display_name,
                                                                                                    });
                                                                                                    setAdjustModalOpen(true);
                                                                                                }}
                                                                                                className="text-[11px] font-semibold text-[#1E6FD9] hover:underline"
                                                                                            >
                                                                                                Adjust
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Last 5 Stock Movements */}
                                                            {med.last_movements && med.last_movements.length > 0 && (
                                                                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-850 overflow-hidden shadow-sm">
                                                                    <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                        <div className="flex items-center gap-2">
                                                                            <History className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                                                            <span>Recent stock movements</span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openDetailDrawer(med.id)}
                                                                            className="text-[11px] text-[#1E6FD9] hover:underline font-semibold"
                                                                        >
                                                                            Full audit ledger &rarr;
                                                                        </button>
                                                                    </div>
                                                                    <div className="w-full overflow-x-auto">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-white/5">
                                                                                <tr>
                                                                                    <th className="py-2 px-3">Type</th>
                                                                                    <th className="py-2 px-3">Quantity</th>
                                                                                    <th className="py-2 px-3">Batch</th>
                                                                                    <th className="py-2 px-3">Reason / Ref</th>
                                                                                    <th className="py-2 px-3">By</th>
                                                                                    <th className="py-2 px-3">Timestamp</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                                                {med.last_movements.map((m) => (
                                                                                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                                                                                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                                                                            {m.type.replace('_', ' ')}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono font-bold">
                                                                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                                                                                            {m.batch_number || '—'}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-slate-500">
                                                                                            {m.reason || m.receipt_number || '—'}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                                                                            {m.user_name}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-slate-400">
                                                                                            {m.created_at}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {medicines.last_page > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page {medicines.current_page} of {medicines.last_page} ({medicines.total} total items)
                        </div>
                        <div className="flex items-center gap-1.5">
                            {medicines.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                        link.active
                                            ? 'bg-[#1E6FD9] text-white shadow-sm'
                                            : link.url
                                            ? 'bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            : 'opacity-40 cursor-not-allowed bg-transparent text-slate-400'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MEDICINE DETAIL DRAWER */}
            {detailDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setDetailDrawerOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Drawer Panel: width ~520px, full height, scrolls inside, sticky header and footer */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="drawer-medicine-title"
                        className="relative w-full max-w-[520px] bg-white dark:bg-slate-900 h-full shadow-2xl z-10 flex flex-col border-l border-slate-200/80 dark:border-white/10 overflow-hidden"
                    >
                        {/* Sticky Header */}
                        <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 id="drawer-medicine-title" className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                        {drawerData?.medicine?.normalized_display_name || drawerData?.medicine?.display_name || 'Medicine details'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                        {drawerData?.medicine?.generic_name || 'Generic'} &bull; {drawerData?.medicine?.strength || drawerData?.medicine?.strength_form || '—'} &bull; {drawerData?.medicine?.dosage_form || 'Tablet'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {can('pharmacy.manage_medicines') && drawerData?.medicine && (
                                        <button
                                            type="button"
                                            onClick={() => openEditMedicine(drawerData.medicine)}
                                            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#1E6FD9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            title="Edit medicine settings"
                                            aria-label="Edit medicine settings"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setDetailDrawerOpen(false)}
                                        className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        aria-label="Close details drawer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Badges row: Brand chip + Status pill */}
                            <div className="flex items-center gap-2 pt-0.5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                    {drawerData?.medicine?.brand_name || 'Generic'}
                                </span>
                                {(() => {
                                    const med = drawerData?.medicine;
                                    if (!med) return null;
                                    const isInactive = !med.is_active;
                                    const isOutOfStock = med.total_quantity <= 0;
                                    const isLow = med.total_quantity <= (med.reorder_level ?? settings.default_reorder_level);

                                    if (isInactive) {
                                        return (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                                Inactive
                                            </span>
                                        );
                                    }
                                    if (isOutOfStock) {
                                        return (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                Out of stock
                                            </span>
                                        );
                                    }
                                    if (isLow) {
                                        return (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                Low stock
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            In stock
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Sticky Tabs Strip with counts and accessible keyboard navigation */}
                        <div
                            role="tablist"
                            aria-label="Medicine details tabs"
                            className="shrink-0 px-6 pt-3 pb-2 border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center gap-1.5 z-10"
                        >
                            {(
                                [
                                    { id: 'overview', label: 'Overview', count: null },
                                    { id: 'batches', label: 'Batches', count: drawerData?.batches?.length ?? 0 },
                                    { id: 'movements', label: 'Movements', count: drawerData?.movements?.length ?? 0 },
                                    { id: 'usage', label: 'Usage', count: drawerData?.usage?.length ?? 0 },
                                ] as const
                            ).map((tab) => {
                                const isActive = drawerTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setDrawerTab(tab.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            isActive
                                                ? 'bg-[#1E6FD9] text-white shadow-sm shadow-[#1E6FD9]/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count !== null && (
                                            <span
                                                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                    isActive
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Scrolling Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {drawerLoading ? (
                                <div className="py-20 text-center text-slate-400 space-y-3">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1E6FD9]" />
                                    <p className="text-xs font-semibold">Loading medicine history & batches...</p>
                                </div>
                            ) : (
                                <>
                                    {/* TAB 1: OVERVIEW */}
                                    {drawerTab === 'overview' && (
                                        <div className="space-y-5">
                                            {/* KPI Row of 3 Cards in Sentence Case */}
                                            <div className="grid grid-cols-3 gap-3">
                                                {/* Card 1: Stock */}
                                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
                                                    <div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                                                            Stock
                                                        </span>
                                                        <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                                                            {drawerData?.medicine?.total_quantity ?? 0} {drawerData?.medicine?.base_unit || 'tablet'}s
                                                        </span>
                                                    </div>
                                                    <div className="mt-2.5 space-y-1">
                                                        {(() => {
                                                            const total = drawerData?.medicine?.total_quantity ?? 0;
                                                            const reorder = drawerData?.medicine?.reorder_level ?? settings.default_reorder_level;
                                                            const percent = Math.min(100, Math.round((total / Math.max(reorder * 2, 1)) * 100));
                                                            const isLow = total <= reorder;
                                                            return (
                                                                <>
                                                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-[#0E9E8F]'}`}
                                                                            style={{ width: `${percent}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 block">
                                                                        Reorder at {reorder}
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Card 2: Selling price with inline pencil */}
                                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                                Selling price
                                                            </span>
                                                            {can('pharmacy.manage_medicines') && !isEditingDrawerPrice && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsEditingDrawerPrice(true);
                                                                        setDrawerPriceValue(
                                                                            drawerData?.medicine?.selling_price_cents > 0
                                                                                ? (drawerData.medicine.selling_price_cents / 100).toFixed(2)
                                                                                : ''
                                                                        );
                                                                    }}
                                                                    className="p-1 rounded text-slate-400 hover:text-[#1E6FD9] transition-colors"
                                                                    title="Edit selling price"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isEditingDrawerPrice ? (
                                                            <div className="flex items-center gap-1 mt-1.5">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={drawerPriceValue}
                                                                    onChange={(e) => setDrawerPriceValue(e.target.value)}
                                                                    placeholder="0.00"
                                                                    className="w-16 px-1.5 py-0.5 text-xs rounded border border-[#1E6FD9] bg-white dark:bg-slate-900 font-bold"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleInlineDrawerPriceSave();
                                                                        if (e.key === 'Escape') setIsEditingDrawerPrice(false);
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={drawerPriceSubmitting}
                                                                    onClick={handleInlineDrawerPriceSave}
                                                                    className="p-1 rounded bg-[#0E9E8F] text-white"
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsEditingDrawerPrice(false)}
                                                                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-base font-extrabold text-[#0E9E8F] mt-0.5 block truncate">
                                                                {drawerData?.medicine?.selling_price_cents > 0
                                                                    ? formatLKR(drawerData.medicine.selling_price_cents)
                                                                    : 'Not set'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 block mt-1">
                                                        per {drawerData?.medicine?.base_unit || 'tablet'}
                                                    </span>
                                                </div>

                                                {/* Card 3: Cost & margin with tooltip explaining formula */}
                                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                                Cost & margin
                                                            </span>
                                                            <div className="relative group cursor-pointer inline-flex items-center">
                                                                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#1E6FD9]" />
                                                                <div className="absolute right-0 bottom-full mb-2 w-52 p-2 rounded-xl bg-slate-900 text-white text-[11px] leading-tight shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30">
                                                                    margin = profit ÷ selling price<br />
                                                                    ({formatLKR(drawerData?.medicine?.profit_cents ?? 0)} ÷ {formatLKR(drawerData?.medicine?.selling_price_cents ?? 0)}) &times; 100 = {drawerData?.medicine?.margin_percent ?? 0}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                                                            Cost: {formatLKR(drawerData?.medicine?.cost_price_cents ?? 0)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            (drawerData?.medicine?.margin_percent ?? 0) < 0
                                                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                                : 'bg-[#0E9E8F]/15 text-[#0E9E8F]'
                                                        }`}>
                                                            Margin {drawerData?.medicine?.margin_percent !== null ? `${drawerData.medicine.margin_percent}%` : '0%'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expiry Card */}
                                            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2.5">
                                                    <Calendar className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                                                    <div>
                                                        <span className="text-slate-400 text-[11px] block">Nearest expiry date</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {drawerData?.batches && drawerData.batches.length > 0 && drawerData.batches[0].expiry_date_formatted
                                                                ? drawerData.batches[0].expiry_date_formatted
                                                                : (drawerData?.medicine?.nearest_expiry_formatted || 'No active batches')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9]">
                                                        {drawerData?.batches?.filter((b: any) => !b.is_voided && b.quantity_remaining > 0).length || 0} active batches
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details Breakdown List (Sentence case, normal font, clean links) */}
                                            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">RxTerms code:</span>
                                                    {drawerData?.medicine?.rxterms_code ? (
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {drawerData.medicine.rxterms_code}
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400">Not linked</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchQuery(drawerData?.medicine?.generic_name || '');
                                                                    setAddModalOpen(true);
                                                                }}
                                                                className="text-[#1E6FD9] hover:underline font-semibold text-[11px]"
                                                            >
                                                                Link to catalog
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Generic name:</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {drawerData?.medicine?.generic_name || 'Generic'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Strength & form:</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {drawerData?.medicine?.strength || drawerData?.medicine?.strength_form || '—'} {drawerData?.medicine?.dosage_form || ''}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Brand:</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {drawerData?.medicine?.brand_name || 'Generic'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Reorder level:</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {drawerData?.medicine?.reorder_level !== null
                                                            ? `${drawerData.medicine.reorder_level} units`
                                                            : `Clinic default (${settings.default_reorder_level})`}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Shelf location:</span>
                                                    {drawerData?.medicine?.shelf_location ? (
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {drawerData.medicine.shelf_location}
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400">Not set</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditMedicine(drawerData.medicine)}
                                                                className="text-[#1E6FD9] hover:underline font-semibold text-[11px]"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Barcodes:</span>
                                                    {drawerData?.medicine?.barcodes && drawerData.medicine.barcodes.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {drawerData.medicine.barcodes.map((bc: string) => (
                                                                <span
                                                                    key={bc}
                                                                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                                                                >
                                                                    {bc}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-400">None</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    openEditMedicine(drawerData.medicine);
                                                                    setScannerOpen(true);
                                                                }}
                                                                className="text-[#1E6FD9] hover:underline font-semibold text-[11px]"
                                                            >
                                                                Scan to add
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Prescriptions linked:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDrawerTab('usage')}
                                                        className="font-semibold text-[#1E6FD9] hover:underline flex items-center gap-1"
                                                    >
                                                        <span>{drawerData?.medicine?.prescriptions_count || 0} prescriptions</span>
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Recent Activity: last 5 movements with View all action */}
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        Recent activity
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDrawerTab('movements')}
                                                        className="text-[11px] font-bold text-[#1E6FD9] hover:underline"
                                                    >
                                                        View all &rarr;
                                                    </button>
                                                </div>

                                                {drawerData?.movements && drawerData.movements.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {drawerData.movements.slice(0, 5).map((m: any) => (
                                                            <div
                                                                key={m.id}
                                                                className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-850 flex items-center justify-between text-xs"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                                        m.quantity > 0
                                                                            ? 'bg-emerald-500/10 text-emerald-600'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                                    }`}>
                                                                        {m.quantity > 0 ? (
                                                                            <ArrowDownRight className="w-3.5 h-3.5" />
                                                                        ) : (
                                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                                                            {m.type.replace('_', ' ')}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400">
                                                                            {m.user_name} &bull; {m.created_at}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className={`font-bold font-mono ${
                                                                    m.quantity > 0 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
                                                                }`}>
                                                                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                                                        No stock movements recorded yet.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: BATCHES */}
                                    {drawerTab === 'batches' && (
                                        <div className="space-y-3.5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    Stock batches ({drawerData?.batches?.length || 0})
                                                </h4>
                                                {drawerData?.batches?.some((b: any) => b.is_voided) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowVoidedBatches(!showVoidedBatches)}
                                                        className="text-[11px] font-semibold text-[#1E6FD9] hover:underline"
                                                    >
                                                        {showVoidedBatches ? 'Hide voided' : 'Show voided'}
                                                    </button>
                                                )}
                                            </div>

                                            {(() => {
                                                const allBatches = drawerData?.batches || [];
                                                const displayedBatches = showVoidedBatches
                                                    ? allBatches
                                                    : allBatches.filter((b: any) => !b.is_voided);

                                                if (displayedBatches.length === 0) {
                                                    return (
                                                        <div className="text-center py-12 space-y-2 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                                            <Boxes className="w-8 h-8 mx-auto text-slate-300" />
                                                            <p className="text-xs text-slate-500 font-semibold">
                                                                {showVoidedBatches ? 'No batches found.' : 'No active batches currently in stock.'}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => openQuickAddModal(drawerData?.medicine)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E9E8F] text-white text-xs font-bold shadow-sm"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>Receive stock batch</span>
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return displayedBatches.map((batch: any) => (
                                                    <div
                                                        key={batch.id}
                                                        className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                                                            batch.is_voided
                                                                ? 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 opacity-70'
                                                                : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-850 shadow-sm'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                    <span className="font-mono">Batch #{batch.batch_number}</span>
                                                                    {batch.is_voided ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                            Voided
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                            Active
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 mt-1 space-x-1.5">
                                                                    <span>Qty: <strong>{batch.quantity_remaining}</strong> / {batch.quantity_received}</span>
                                                                    <span>&bull;</span>
                                                                    <span>Cost: {formatLKR(batch.cost_price_cents)}</span>
                                                                    <span>&bull;</span>
                                                                    <span>Supplier: {batch.supplier_name || 'N/A'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                                                                    Exp: {batch.expiry_date_formatted || formatDateDMY(batch.expiry_date)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                    Rec: {batch.received_at_formatted || '—'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Batch Actions */}
                                                        {!batch.is_voided && can('pharmacy.manage_medicines') && (
                                                            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                                {batch.receipt_number ? (
                                                                    <span className="text-[10px] text-[#1E6FD9] font-medium flex items-center gap-1">
                                                                        <Receipt className="w-3 h-3" />
                                                                        <span>GRN: {batch.receipt_number}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400">Direct batch</span>
                                                                )}
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handlePrintBarcodeLabel(drawerData?.medicine, batch)}
                                                                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                                                        title="Print barcode label for this batch"
                                                                    >
                                                                        <Printer className="w-3 h-3 text-slate-400" />
                                                                        <span>Print label</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAdjustBatchInfo({
                                                                                batch_id: batch.id,
                                                                                batch_number: batch.batch_number,
                                                                                medicine_name: drawerData?.medicine?.normalized_display_name || drawerData?.medicine?.display_name,
                                                                                quantity_remaining: batch.quantity_remaining,
                                                                                base_unit: drawerData?.medicine?.base_unit || 'tablet',
                                                                            });
                                                                            setAdjustBatchId(batch.id);
                                                                            setAdjustQty('');
                                                                            setAdjustReason('');
                                                                            setAdjustError(null);
                                                                            setAdjustModalOpen(true);
                                                                        }}
                                                                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#1E6FD9] hover:bg-[#1E6FD9]/10 flex items-center gap-1"
                                                                    >
                                                                        <SlidersHorizontal className="w-3 h-3" />
                                                                        <span>Adjust qty</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}

                                    {/* TAB 3: MOVEMENTS */}
                                    {drawerTab === 'movements' && (
                                        <div className="space-y-3.5">
                                            {/* Movements Filter Strip */}
                                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                                {(['all', 'receipt', 'dispense', 'adjustment'] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setMovementTypeFilter(type)}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                                                            movementTypeFilter === type
                                                                ? 'bg-[#1E6FD9] text-white'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>

                                            {(() => {
                                                const allMovements = drawerData?.movements || [];
                                                const filtered = allMovements.filter((m: any) => {
                                                    if (movementTypeFilter !== 'all') {
                                                        if (movementTypeFilter === 'receipt' && !m.type.includes('receipt') && m.type !== 'opening_stock') return false;
                                                        if (movementTypeFilter === 'dispense' && !m.type.includes('dispense')) return false;
                                                        if (movementTypeFilter === 'adjustment' && !m.type.includes('adjust')) return false;
                                                    }
                                                    return true;
                                                });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <p className="text-xs text-slate-400 py-8 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                                            No movements found matching the selected filter.
                                                        </p>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-2">
                                                        {filtered.map((m: any) => (
                                                            <div
                                                                key={m.id}
                                                                className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-850 flex items-center justify-between text-xs"
                                                            >
                                                                <div className="min-w-0 pr-2">
                                                                    <div className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                                                                        <span>{m.type.replace('_', ' ')}</span>
                                                                        {m.batch_number && (
                                                                            <span className="font-mono text-[10px] text-slate-400">
                                                                                (Batch #{m.batch_number})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                                        {m.reason || m.receipt_number || 'Standard movement'} &bull; by {m.user_name}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <div
                                                                        className={`font-mono font-extrabold ${
                                                                            m.quantity > 0 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
                                                                        }`}
                                                                    >
                                                                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 mt-0.5">{m.created_at}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* TAB 4: USAGE */}
                                    {drawerTab === 'usage' && (
                                        <div className="space-y-3.5">
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Prescriptions & dispenses ({drawerData?.usage?.length || 0})
                                            </h4>

                                            {drawerData?.usage && drawerData.usage.length > 0 ? (
                                                <div className="space-y-2.5">
                                                    {drawerData.usage.map((u: any) => (
                                                        <div
                                                            key={u.id}
                                                            className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-850 space-y-1.5 text-xs shadow-sm"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-[#1E6FD9]">
                                                                    {u.prescription_number}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {u.date}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                    {u.patient_name}
                                                                </span>
                                                                <span className="text-[11px] text-slate-500">
                                                                    {u.doctor_name}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                                <span>Dose: {u.dose} ({u.frequency || 'Daily'})</span>
                                                                <span>Qty: <strong>{u.quantity_dispensed || u.quantity_prescribed}</strong></span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                                                    <FileText className="w-8 h-8 mx-auto text-slate-300" />
                                                    <p className="text-xs font-medium">No prescription or dispensing records yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Sticky Footer Actions */}
                        <div className="shrink-0 px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center gap-2.5 z-20">
                            <button
                                type="button"
                                onClick={() => openQuickAddModal(drawerData?.medicine)}
                                className="flex-1 py-2.5 rounded-xl bg-[#0E9E8F] hover:bg-[#0b8276] text-white text-xs font-bold shadow-md shadow-[#0E9E8F]/20 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add stock (GRN)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (drawerData?.batches && drawerData.batches.length > 0) {
                                        const firstActive = drawerData.batches.find((b: any) => !b.is_voided && b.quantity_remaining > 0) || drawerData.batches[0];
                                        setAdjustBatchInfo({
                                            batch_id: firstActive.id,
                                            batch_number: firstActive.batch_number,
                                            medicine_name: drawerData?.medicine?.normalized_display_name || drawerData?.medicine?.display_name,
                                            quantity_remaining: firstActive.quantity_remaining,
                                            base_unit: drawerData?.medicine?.base_unit || 'tablet',
                                        });
                                        setAdjustBatchId(firstActive.id);
                                        setAdjustQty('');
                                        setAdjustReason('');
                                        setAdjustError(null);
                                        setAdjustModalOpen(true);
                                    } else {
                                        setToast({ type: 'amber', message: 'No stock batches exist to adjust.' });
                                    }
                                }}
                                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                title="Adjust batch inventory"
                            >
                                Adjust stock
                            </button>

                            <button
                                type="button"
                                onClick={() => handlePrintBarcodeLabel(drawerData?.medicine)}
                                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                title="Print barcode label"
                            >
                                <Printer className="w-4 h-4" />
                            </button>

                            {can('pharmacy.manage_medicines') && drawerData?.medicine && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteOrInactive(drawerData.medicine)}
                                    className="px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                                >
                                    {drawerData.medicine.has_history ? 'Deactivate' : 'Delete'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DUPLICATES REVIEW MODAL (Side-by-side comparison & Merge) */}
            <GlassModal
                isOpen={duplicatesModalOpen}
                onClose={() => setDuplicatesModalOpen(false)}
                maxWidth="max-w-4xl"
                title="Review possible duplicate medicines"
                subtitle="Compare flagged duplicate pairs side-by-side and safely consolidate batches, movements, and prescriptions."
            >
                {duplicatePairs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-[#0E9E8F] mb-3" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">No duplicate medicines detected</h4>
                        <p className="text-xs text-slate-400 mt-1">All catalog items have distinct generic formulas and brands.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Pair selector tabs if multiple */}
                        {duplicatePairs.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {duplicatePairs.map((pair, idx) => (
                                    <button
                                        key={pair.pair_key}
                                        type="button"
                                        onClick={() => {
                                            setSelectedPairKey(pair.pair_key);
                                            setMergeKeptId(pair.medicine_a.id);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                            selectedPairKey === pair.pair_key
                                                ? 'bg-[#1E6FD9] text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        Pair {idx + 1}: {pair.medicine_a.generic_name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activePair && (
                            <div className="space-y-4">
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Match trigger: <strong>{activePair.reason}</strong></span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDismissDuplicate(activePair.pair_key)}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                                    >
                                        Dismiss (Not duplicates)
                                    </button>
                                </div>

                                {/* Side-by-Side Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Medicine A Card */}
                                    <div
                                        onClick={() => setMergeKeptId(activePair.medicine_a.id)}
                                        className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                                            mergeKeptId === activePair.medicine_a.id
                                                ? 'border-[#1E6FD9] bg-[#1E6FD9]/5 dark:bg-[#1E6FD9]/15 ring-2 ring-[#1E6FD9]'
                                                : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-850 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Option A (Record #{activePair.medicine_a.id})
                                            </span>
                                            <input
                                                type="radio"
                                                checked={mergeKeptId === activePair.medicine_a.id}
                                                onChange={() => setMergeKeptId(activePair.medicine_a.id)}
                                                className="text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                            />
                                        </div>

                                        <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                                            {activePair.medicine_a.normalized_name}
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Raw: {activePair.medicine_a.display_name}
                                        </p>

                                        <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Generic:</span>
                                                <span className="font-semibold">{activePair.medicine_a.generic_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Strength/Form:</span>
                                                <span className="font-semibold">{activePair.medicine_a.strength_form}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Brand:</span>
                                                <span className="font-semibold">{activePair.medicine_a.brand_name || 'Generic'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Current stock:</span>
                                                <span className="font-bold text-[#0E9E8F]">{activePair.medicine_a.total_quantity} units</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Selling price:</span>
                                                <span className="font-bold">{formatLKR(activePair.medicine_a.selling_price_cents)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Batches count:</span>
                                                <span>{activePair.medicine_a.batches_count} batches</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 text-center">
                                            <span
                                                className={`text-xs font-bold ${
                                                    mergeKeptId === activePair.medicine_a.id
                                                        ? 'text-[#1E6FD9]'
                                                        : 'text-slate-400'
                                                }`}
                                            >
                                                {mergeKeptId === activePair.medicine_a.id ? '✓ Keep this primary medicine' : 'Select to keep'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Medicine B Card */}
                                    <div
                                        onClick={() => setMergeKeptId(activePair.medicine_b.id)}
                                        className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                                            mergeKeptId === activePair.medicine_b.id
                                                ? 'border-[#1E6FD9] bg-[#1E6FD9]/5 dark:bg-[#1E6FD9]/15 ring-2 ring-[#1E6FD9]'
                                                : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-850 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Option B (Record #{activePair.medicine_b.id})
                                            </span>
                                            <input
                                                type="radio"
                                                checked={mergeKeptId === activePair.medicine_b.id}
                                                onChange={() => setMergeKeptId(activePair.medicine_b.id)}
                                                className="text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                            />
                                        </div>

                                        <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                                            {activePair.medicine_b.normalized_name}
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Raw: {activePair.medicine_b.display_name}
                                        </p>

                                        <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Generic:</span>
                                                <span className="font-semibold">{activePair.medicine_b.generic_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Strength/Form:</span>
                                                <span className="font-semibold">{activePair.medicine_b.strength_form}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Brand:</span>
                                                <span className="font-semibold">{activePair.medicine_b.brand_name || 'Generic'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Current stock:</span>
                                                <span className="font-bold text-[#0E9E8F]">{activePair.medicine_b.total_quantity} units</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Selling price:</span>
                                                <span className="font-bold">{formatLKR(activePair.medicine_b.selling_price_cents)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Batches count:</span>
                                                <span>{activePair.medicine_b.batches_count} batches</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 text-center">
                                            <span
                                                className={`text-xs font-bold ${
                                                    mergeKeptId === activePair.medicine_b.id
                                                        ? 'text-[#1E6FD9]'
                                                        : 'text-slate-400'
                                                }`}
                                            >
                                                {mergeKeptId === activePair.medicine_b.id ? '✓ Keep this primary medicine' : 'Select to keep'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Merge Reason & Confirmation */}
                                <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                                    {mergeError && (
                                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                                            {mergeError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Merge audit reason
                                        </label>
                                        <input
                                            type="text"
                                            value={mergeReason}
                                            onChange={(e) => setMergeReason(e.target.value)}
                                            placeholder="Reason for consolidating duplicate entries..."
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setDuplicatesModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            disabled={mergeSubmitting}
                                            onClick={handleMergeSubmit}
                                            className="px-5 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/20 flex items-center gap-2"
                                        >
                                            {mergeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                                            <span>Consolidate & merge into kept medicine</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </GlassModal>

            {/* ADD MEDICINE MODAL (Guided 3-step flow) */}
            {addModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
                        onClick={() => handleCloseAddModal()}
                        aria-hidden="true"
                    />

                    {/* Modal Card */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-medicine-title"
                        className="relative w-full sm:max-w-[760px] max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[92vh] max-sm:rounded-b-none z-10"
                    >
                        {/* Sticky Header */}
                        <div className="shrink-0 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-11 h-11 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center border border-[#1E6FD9]/20 shadow-sm shrink-0">
                                        <Pill className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 id="add-medicine-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                            Add medicine
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            Find it in the catalog, set the price, and add opening stock.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCloseAddModal()}
                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                    aria-label="Close dialog"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Slim Stepper */}
                            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs font-semibold">
                                {/* Step 1 */}
                                <button
                                    type="button"
                                    onClick={() => setAddStep(1)}
                                    className={`flex items-center gap-2 py-1 px-2.5 rounded-xl transition-all ${
                                        addStep === 1
                                            ? 'bg-[#1E6FD9]/10 text-[#1E6FD9] font-bold border border-[#1E6FD9]/30'
                                            : selectedCatalogItem || customFormActive
                                            ? 'text-[#0E9E8F] hover:bg-[#0E9E8F]/10'
                                            : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                        addStep === 1
                                            ? 'bg-[#1E6FD9] text-white'
                                            : selectedCatalogItem || customFormActive
                                            ? 'bg-[#0E9E8F] text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {selectedCatalogItem || customFormActive ? <Check className="w-3 h-3" /> : '1'}
                                    </span>
                                    <span className="truncate">1. Find medicine</span>
                                </button>

                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />

                                {/* Step 2 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (handleValidateStep1()) setAddStep(2);
                                    }}
                                    className={`flex items-center gap-2 py-1 px-2.5 rounded-xl transition-all ${
                                        addStep === 2
                                            ? 'bg-[#1E6FD9]/10 text-[#1E6FD9] font-bold border border-[#1E6FD9]/30'
                                            : parseFloat(sellingPrice) > 0
                                            ? 'text-[#0E9E8F] hover:bg-[#0E9E8F]/10'
                                            : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                        addStep === 2
                                            ? 'bg-[#1E6FD9] text-white'
                                            : parseFloat(sellingPrice) > 0
                                            ? 'bg-[#0E9E8F] text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {parseFloat(sellingPrice) > 0 ? <Check className="w-3 h-3" /> : '2'}
                                    </span>
                                    <span className="truncate">2. Price & settings</span>
                                </button>

                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />

                                {/* Step 3 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (handleValidateStep1() && handleValidateStep2()) setAddStep(3);
                                    }}
                                    className={`flex items-center gap-2 py-1 px-2.5 rounded-xl transition-all ${
                                        addStep === 3
                                            ? 'bg-[#1E6FD9]/10 text-[#1E6FD9] font-bold border border-[#1E6FD9]/30'
                                            : openingBatches.length > 0 && openingBatches[0].batch_number
                                            ? 'text-[#0E9E8F] hover:bg-[#0E9E8F]/10'
                                            : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                        addStep === 3
                                            ? 'bg-[#1E6FD9] text-white'
                                            : openingBatches.length > 0 && openingBatches[0].batch_number
                                            ? 'bg-[#0E9E8F] text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {openingBatches.length > 0 && openingBatches[0].batch_number ? <Check className="w-3 h-3" /> : '3'}
                                    </span>
                                    <span className="truncate">3. Opening stock</span>
                                </button>
                            </div>
                        </div>

                        {/* Scrolling Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Global Error Banner */}
                            {Object.keys(addErrors).length > 0 && (
                                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{Object.values(addErrors)[0]}</span>
                                </div>
                            )}

                            {/* ================= STEP 1: FIND MEDICINE ================= */}
                            {addStep === 1 && (
                                <div className="space-y-4">
                                    {/* Duplicate Alert Card */}
                                    {duplicateWarningExisting && !bypassDuplicateWarning && (
                                        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-100 space-y-3 animate-in fade-in duration-200">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                                                    <AlertTriangle className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                                                        Already in your stock: {duplicateWarningExisting.normalized_display_name || duplicateWarningExisting.display_name}
                                                    </h5>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                                        You currently have <strong>{duplicateWarningExisting.total_quantity} {duplicateWarningExisting.base_unit || 'unit'}s</strong> in stock.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAddModalOpen(false);
                                                        resetAddMedicineModal();
                                                        openQuickAddModal(duplicateWarningExisting);
                                                    }}
                                                    className="px-3.5 py-2 rounded-xl bg-[#0E9E8F] hover:bg-[#0b8074] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Boxes className="w-4 h-4" />
                                                    <span>Add stock to it</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBypassDuplicateWarning(true);
                                                        setBrandName('');
                                                        setAddStep(2);
                                                    }}
                                                    className="px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                                                >
                                                    Add as a different brand &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected Medicine Chip */}
                                    {selectedCatalogItem && (
                                        <div className="p-4 rounded-2xl bg-[#1E6FD9]/10 border border-[#1E6FD9]/30 flex items-center justify-between gap-3 animate-in fade-in">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-[#1E6FD9]/20 text-[#1E6FD9] flex items-center justify-center shrink-0">
                                                    <Pill className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#1E6FD9] text-white">
                                                            {selectedCatalogItem.is_custom ? 'Custom' : 'RxTerms'}
                                                        </span>
                                                        {selectedCatalogItem.brand_name && (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                                {selectedCatalogItem.brand_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white mt-1 truncate">
                                                        {selectedCatalogItem.display_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {selectedCatalogItem.generic_name} &bull; {selectedCatalogItem.strength_form}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCatalogItem(null);
                                                    setDuplicateWarningExisting(null);
                                                }}
                                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}

                                    {/* Search and Results (when no item selected and not in custom form) */}
                                    {!selectedCatalogItem && !customFormActive && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    Search medicine catalog (RxTerms & synonyms)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomFormActive(true);
                                                        setSelectedCatalogItem(null);
                                                    }}
                                                    className="text-xs font-bold text-[#1E6FD9] hover:underline flex items-center gap-1"
                                                >
                                                    <span>Can't find it? Add custom medicine</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (searchResults.length === 0) return;
                                                            if (e.key === 'ArrowDown') {
                                                                e.preventDefault();
                                                                setSearchActiveIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
                                                            } else if (e.key === 'ArrowUp') {
                                                                e.preventDefault();
                                                                setSearchActiveIndex((prev) => Math.max(prev - 1, 0));
                                                            } else if (e.key === 'Enter' && searchActiveIndex >= 0) {
                                                                e.preventDefault();
                                                                handleSelectCatalogItem(searchResults[searchActiveIndex]);
                                                            }
                                                        }}
                                                        placeholder="Search by generic, brand or synonym (e.g. Paracetamol, Panadol)"
                                                        className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1E6FD9] shadow-sm font-medium"
                                                    />
                                                    {searchLoading && (
                                                        <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3.5 text-[#1E6FD9]" />
                                                    )}
                                                    {searchQuery && !searchLoading && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchQuery('');
                                                                setSearchResults([]);
                                                            }}
                                                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Scan Barcode Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setScannerOpen(true)}
                                                    className="px-3.5 py-3 rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                                    title="Scan medicine barcode"
                                                >
                                                    <Barcode className="w-4 h-4 text-[#0E9E8F]" />
                                                    <span className="hidden sm:inline">Scan barcode</span>
                                                </button>
                                            </div>

                                            {addErrors.selection && (
                                                <p className="text-xs text-rose-500 font-medium">{addErrors.selection}</p>
                                            )}

                                            {/* Results List */}
                                            {searchResults.length > 0 && (
                                                <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-white/5 shadow-xl">
                                                    {searchResults.map((item: any, idx: number) => {
                                                        const isFocused = searchActiveIndex === idx;
                                                        return (
                                                            <button
                                                                key={`${item.variant_id}_${item.brand_id || idx}`}
                                                                type="button"
                                                                onClick={() => handleSelectCatalogItem(item)}
                                                                onMouseEnter={() => setSearchActiveIndex(idx)}
                                                                className={`w-full text-left p-3.5 transition-colors flex items-center justify-between gap-3 ${
                                                                    isFocused
                                                                        ? 'bg-[#1E6FD9]/10 dark:bg-[#1E6FD9]/20'
                                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                                                }`}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                                            {item.display_name}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                            item.is_custom
                                                                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                                                                                : 'bg-[#1E6FD9]/15 text-[#1E6FD9] dark:text-[#5fa2f8] border border-[#1E6FD9]/30'
                                                                        }`}>
                                                                            {item.is_custom ? 'Custom' : 'RxTerms'}
                                                                        </span>
                                                                        {item.in_stock && (
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                                                In stock
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                                        {item.generic_name} &bull; {item.strength_form}
                                                                    </div>
                                                                    {item.synonym_hint && (
                                                                        <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-[#0E9E8F] dark:text-[#2dd4bf]">
                                                                            <Sparkles className="w-3 h-3" />
                                                                            <span>matched '{item.synonym_hint.matched_term}' &rarr; {item.synonym_hint.canonical_name}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {item.brand_name && (
                                                                    <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                                                        {item.brand_name}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {searchQuery.trim().length > 1 && !searchLoading && searchResults.length === 0 && (
                                                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        No matching catalog medicine found for "{searchQuery}".
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomGeneric(searchQuery);
                                                            setCustomFormActive(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E6FD9]/10 text-[#1E6FD9] hover:bg-[#1E6FD9]/20 font-bold text-xs transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Add "{searchQuery}" as a custom medicine</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Custom Medicine Form */}
                                    {customFormActive && (
                                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 space-y-4 animate-in fade-in">
                                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                                        Custom
                                                    </span>
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                        Custom medicine registration
                                                    </h4>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomFormActive(false);
                                                        setSelectedCatalogItem(null);
                                                    }}
                                                    className="text-xs font-semibold text-[#1E6FD9] hover:underline flex items-center gap-1"
                                                >
                                                    <ArrowLeft className="w-3.5 h-3.5" />
                                                    <span>Back to catalog search</span>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Generic formula name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={customGeneric}
                                                        onChange={(e) => setCustomGeneric(e.target.value)}
                                                        placeholder="e.g. Paracetamol"
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                                    />
                                                    {addErrors.customGeneric && (
                                                        <p className="text-[10px] text-rose-500 mt-1">{addErrors.customGeneric}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Strength *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={customStrength}
                                                        onChange={(e) => setCustomStrength(e.target.value)}
                                                        placeholder="e.g. 500 mg, 10 mg/ml"
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                                    />
                                                    {addErrors.customStrength && (
                                                        <p className="text-[10px] text-rose-500 mt-1">{addErrors.customStrength}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Dosage form
                                                    </label>
                                                    <select
                                                        value={customDosageForm}
                                                        onChange={(e) => setCustomDosageForm(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                                    >
                                                        {['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Eye Drops', 'Ear Drops', 'Inhaler', 'Suppository', 'Solution', 'Sachet', 'Other'].map((f) => (
                                                            <option key={f} value={f}>
                                                                {f}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Route
                                                    </label>
                                                    <select
                                                        value={customRoute}
                                                        onChange={(e) => setCustomRoute(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                                    >
                                                        {['Oral', 'Topical', 'Intravenous', 'Intramuscular', 'Subcutaneous', 'Inhalation', 'Ophthalmic', 'Otic', 'Nasal', 'Rectal'].map((r) => (
                                                            <option key={r} value={r}>
                                                                {r}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Brand name (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customBrand}
                                                        onChange={(e) => {
                                                            setCustomBrand(e.target.value);
                                                            setBrandName(e.target.value);
                                                        }}
                                                        placeholder="e.g. Panadol (or leave blank for generic)"
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Manufacturer (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customManufacturer}
                                                        onChange={(e) => setCustomManufacturer(e.target.value)}
                                                        placeholder="e.g. GlaxoSmithKline"
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ================= STEP 2: PRICE & SETTINGS ================= */}
                            {addStep === 2 && (
                                <div className="space-y-6">
                                    {/* Summary Pill of Chosen Medicine */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center shrink-0">
                                                <Pill className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {selectedCatalogItem?.display_name || `${customGeneric} ${customStrength} ${customDosageForm}`}
                                                </h5>
                                                <p className="text-[11px] text-slate-400">
                                                    {selectedCatalogItem?.generic_name || customGeneric} &bull; {brandName || 'Generic'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAddStep(1)}
                                            className="text-xs font-semibold text-[#1E6FD9] hover:underline"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    {/* Section: Brand, Unit, Pack size */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Brand name
                                            </label>
                                            <input
                                                type="text"
                                                value={brandName}
                                                onChange={(e) => setBrandName(e.target.value)}
                                                placeholder="e.g. Panadol (or Generic)"
                                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Base unit *
                                            </label>
                                            <select
                                                value={baseUnit}
                                                onChange={(e) => setBaseUnit(e.target.value)}
                                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                            >
                                                {['tablet', 'capsule', 'ml', 'piece', 'sachet', 'vial', 'ampoule', 'bottle', 'tube', 'box', 'pack', 'patch', 'drop', 'inhaler'].map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Pack size (optional)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={packSize}
                                                onChange={(e) => setPackSize(e.target.value)}
                                                placeholder="e.g. 10 tablets per strip"
                                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                            {addErrors.packSize && (
                                                <p className="text-[10px] text-rose-500 mt-1">{addErrors.packSize}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section: Pricing with Live Feedback */}
                                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Pricing per {baseUnit}
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            {/* Cost Price */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Cost price per {baseUnit}
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                                                        Rs.
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={costPrice}
                                                        onChange={(e) => setCostPrice(e.target.value)}
                                                        placeholder="e.g. 12.50"
                                                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-[#1E6FD9]"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">Optional, used to calculate margins and prefill opening batches.</p>
                                            </div>

                                            {/* Selling Price */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Selling price per {baseUnit} *
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                                                        Rs.
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        required
                                                        value={sellingPrice}
                                                        onChange={(e) => setSellingPrice(e.target.value)}
                                                        placeholder="e.g. 18.00"
                                                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-[#1E6FD9]"
                                                    />
                                                </div>
                                                {addErrors.sellingPrice && (
                                                    <p className="text-[10px] text-rose-500 mt-1">{addErrors.sellingPrice}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Live Margin & Feedback Banner */}
                                        {(() => {
                                            const sell = parseFloat(sellingPrice);
                                            const cost = parseFloat(costPrice);
                                            if (!isNaN(sell) && sell > 0 && !isNaN(cost) && cost > 0) {
                                                const profit = sell - cost;
                                                const margin = Math.round((profit / sell) * 100);
                                                const isLoss = sell < cost;

                                                return (
                                                    <div
                                                        className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                                                            isLoss
                                                                ? 'bg-[#FF7A59]/10 border-[#FF7A59]/40 text-[#FF7A59]'
                                                                : 'bg-[#0E9E8F]/10 border-[#0E9E8F]/40 text-[#0E9E8F]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isLoss ? (
                                                                <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF7A59]" />
                                                            ) : (
                                                                <TrendingUp className="w-4 h-4 shrink-0 text-[#0E9E8F]" />
                                                            )}
                                                            <span className="font-semibold">
                                                                {isLoss
                                                                    ? `Selling below cost! Margin ${margin}% · Loss Rs. ${Math.abs(profit).toFixed(2)} per ${baseUnit}`
                                                                    : `Margin ${margin}% · Profit Rs. ${profit.toFixed(2)} per ${baseUnit}`}
                                                            </span>
                                                        </div>
                                                        <span className="font-mono text-[11px] font-bold">
                                                            {formatLKR(Math.round(sell * 100))}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    {/* Reorder Level */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Reorder level
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setUseDefaultReorder(true)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                                        useDefaultReorder
                                                            ? 'bg-[#1E6FD9] text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    Use clinic default ({settings.default_reorder_level})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseDefaultReorder(false)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                                        !useDefaultReorder
                                                            ? 'bg-[#1E6FD9] text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    Custom
                                                </button>
                                            </div>
                                        </div>

                                        {!useDefaultReorder && (
                                            <input
                                                type="number"
                                                min="0"
                                                value={customReorderLevel}
                                                onChange={(e) => setCustomReorderLevel(e.target.value)}
                                                placeholder="e.g. 15"
                                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                        )}
                                        {addErrors.reorderLevel && (
                                            <p className="text-[10px] text-rose-500 mt-1">{addErrors.reorderLevel}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400">
                                            Low stock warning will trigger when total remaining stock reaches this level.
                                        </p>
                                    </div>

                                    {/* Shelf Location with Suggestions */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Shelf location
                                        </label>
                                        <input
                                            type="text"
                                            value={shelfLocation}
                                            onChange={(e) => setShelfLocation(e.target.value)}
                                            placeholder="e.g. Shelf A-12"
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1E6FD9]"
                                        />
                                        {shelves && shelves.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-slate-400">Recent shelves:</span>
                                                {shelves.slice(0, 6).map((sh) => (
                                                    <button
                                                        key={sh}
                                                        type="button"
                                                        onClick={() => setShelfLocation(sh)}
                                                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-[#1E6FD9]/15 hover:text-[#1E6FD9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                                    >
                                                        {sh}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Barcode input */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Barcode
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={barcode}
                                                onChange={(e) => setBarcode(e.target.value)}
                                                placeholder="Scan or type barcode"
                                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setScannerOpen(true)}
                                                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#0E9E8F]/15 hover:text-[#0E9E8F] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                            >
                                                <Barcode className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                                <span>Scan</span>
                                            </button>
                                        </div>
                                        {addErrors.barcode && (
                                            <p className="text-[10px] text-rose-500 mt-1">{addErrors.barcode}</p>
                                        )}
                                    </div>

                                    {/* Availability Switch */}
                                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Availability
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={(e) => setIsActive(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#0E9E8F]"></div>
                                            </label>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <span className={`font-semibold ${isActive ? 'text-[#0E9E8F]' : 'text-slate-400'}`}>
                                                {isActive ? 'Available for prescribing and dispensing' : 'Deactivated / Hidden'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ================= STEP 3: OPENING STOCK ================= */}
                            {addStep === 3 && (
                                <div className="space-y-5">
                                    {/* Explainer Notice */}
                                    <div className="p-4 rounded-2xl bg-[#0E9E8F]/10 border border-[#0E9E8F]/30 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-3">
                                        <Info className="w-4 h-4 text-[#0E9E8F] shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-bold text-[#0E9E8F] dark:text-[#2dd4bf]">
                                                Opening stock batches (optional)
                                            </h5>
                                            <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                                                Record existing stock on your shelves to establish initial inventory with FEFO expiry tracking. If you don't have stock right now, you can skip this step and add stock later using <strong>Receive stock (GRN)</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Batch Rows Table */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Batch records ({openingBatches.length})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpeningBatches((prev) => [
                                                        ...prev,
                                                        {
                                                            batch_number: '',
                                                            expiry_date: '',
                                                            quantity: '',
                                                            cost_price: costPrice,
                                                            supplier_id: '',
                                                        },
                                                    ])
                                                }
                                                className="text-xs font-bold text-[#0E9E8F] hover:underline flex items-center gap-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Add another batch</span>
                                            </button>
                                        </div>

                                        {openingBatches.map((b, idx) => {
                                            const today = new Date();
                                            let expiryWarning: string | null = null;
                                            let isExpired = false;

                                            if (b.expiry_date) {
                                                const expDate = new Date(b.expiry_date);
                                                const diffTime = expDate.getTime() - today.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                if (diffDays <= 0) {
                                                    isExpired = true;
                                                    expiryWarning = 'Must be in the future';
                                                } else if (diffDays < 90) {
                                                    expiryWarning = `Expiring soon (${diffDays} days left)`;
                                                }
                                            }

                                            const qtyNum = parseInt(b.quantity, 10);
                                            const packNum = parseInt(packSize, 10);
                                            const packHelper = !isNaN(qtyNum) && !isNaN(packNum) && packNum > 1 && qtyNum >= packNum
                                                ? `= ${(qtyNum / packNum).toFixed(1)} strips/packs`
                                                : null;

                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                            Batch #{idx + 1}
                                                        </span>
                                                        {openingBatches.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpeningBatches((prev) => prev.filter((_, i) => i !== idx))}
                                                                className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                                                                title="Remove batch row"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                        {/* Batch Number */}
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Batch no. *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={b.batch_number}
                                                                onChange={(e) => {
                                                                    const next = [...openingBatches];
                                                                    next[idx].batch_number = e.target.value;
                                                                    setOpeningBatches(next);
                                                                }}
                                                                placeholder="e.g. B-2024-01"
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                                                            />
                                                            {addErrors[`batches.${idx}.batch_number`] && (
                                                                <p className="text-[10px] text-rose-500 mt-1">{addErrors[`batches.${idx}.batch_number`]}</p>
                                                            )}
                                                        </div>

                                                        {/* Expiry Date */}
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Expiry date *
                                                            </label>
                                                            <input
                                                                type="date"
                                                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                                                value={b.expiry_date}
                                                                onChange={(e) => {
                                                                    const next = [...openingBatches];
                                                                    next[idx].expiry_date = e.target.value;
                                                                    setOpeningBatches(next);
                                                                }}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                            />
                                                            {expiryWarning && (
                                                                <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${
                                                                    isExpired ? 'text-rose-500' : 'text-amber-500'
                                                                }`}>
                                                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                                                    <span>{expiryWarning}</span>
                                                                </p>
                                                            )}
                                                            {addErrors[`batches.${idx}.expiry_date`] && (
                                                                <p className="text-[10px] text-rose-500 mt-1">{addErrors[`batches.${idx}.expiry_date`]}</p>
                                                            )}
                                                        </div>

                                                        {/* Quantity */}
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Quantity ({baseUnit}s) *
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={b.quantity}
                                                                onChange={(e) => {
                                                                    const next = [...openingBatches];
                                                                    next[idx].quantity = e.target.value;
                                                                    setOpeningBatches(next);
                                                                }}
                                                                placeholder="e.g. 50"
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                                                            />
                                                            {packHelper && (
                                                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{packHelper}</p>
                                                            )}
                                                            {addErrors[`batches.${idx}.quantity`] && (
                                                                <p className="text-[10px] text-rose-500 mt-1">{addErrors[`batches.${idx}.quantity`]}</p>
                                                            )}
                                                        </div>

                                                        {/* Cost Price */}
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Cost per {baseUnit} (Rs.)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={b.cost_price}
                                                                onChange={(e) => {
                                                                    const next = [...openingBatches];
                                                                    next[idx].cost_price = e.target.value;
                                                                    setOpeningBatches(next);
                                                                }}
                                                                placeholder={costPrice || '0.00'}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Optional Supplier */}
                                                    {suppliers && suppliers.length > 0 && (
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Supplier (optional)
                                                            </label>
                                                            <select
                                                                value={b.supplier_id || ''}
                                                                onChange={(e) => {
                                                                    const next = [...openingBatches];
                                                                    next[idx].supplier_id = e.target.value;
                                                                    setOpeningBatches(next);
                                                                }}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                                                            >
                                                                <option value="">Select supplier...</option>
                                                                {suppliers.map((s) => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Total Line Summary */}
                                    {(() => {
                                        let totalQty = 0;
                                        let totalCost = 0;
                                        openingBatches.forEach((b) => {
                                            const q = parseInt(b.quantity, 10);
                                            if (!isNaN(q) && q > 0) {
                                                totalQty += q;
                                                const c = parseFloat(b.cost_price || costPrice);
                                                if (!isNaN(c) && c > 0) {
                                                    totalCost += q * c;
                                                }
                                            }
                                        });

                                        if (totalQty > 0) {
                                            return (
                                                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                        <span className="font-semibold">
                                                            Total opening stock: <strong>{totalQty} {baseUnit}s</strong>
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">
                                                        Value: {formatLKR(Math.round(totalCost * 100))}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer Actions */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                {addStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setAddStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>Back</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleCloseAddModal()}
                                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="flex items-center gap-2.5">
                                {addStep === 1 && (
                                    <button
                                        type="button"
                                        onClick={handleContinueFromStep1}
                                        className="px-6 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/25 flex items-center gap-2 transition-all"
                                    >
                                        <span>Continue to price & settings</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}

                                {addStep === 2 && (
                                    <button
                                        type="button"
                                        onClick={handleContinueFromStep2}
                                        className="px-6 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/25 flex items-center gap-2 transition-all"
                                    >
                                        <span>Continue to opening stock</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}

                                {addStep === 3 && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => {
                                                setOpeningBatches([]);
                                                handleAddMedicineSubmit(undefined, false);
                                            }}
                                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                        >
                                            Skip opening stock
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => handleAddMedicineSubmit(undefined, true)}
                                            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            Save & add another
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => handleAddMedicineSubmit(undefined, false)}
                                            className="px-6 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/25 flex items-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                            <span>Save medicine</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UNSAVED DATA CONFIRMATION MODAL */}
            {showUnsavedAddGuard && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setShowUnsavedAddGuard(false)}
                    />
                    <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 shadow-2xl z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    Discard unsaved medicine?
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    You have entered details that will be lost if you close.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={() => setShowUnsavedAddGuard(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Keep editing
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCloseAddModal(true)}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors"
                            >
                                Discard & close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK ADD STOCK MODAL */}
            <GlassModal
                isOpen={quickAddModalOpen}
                onClose={() => setQuickAddModalOpen(false)}
                title="Add stock batch"
                subtitle={`Receive quick stock batch into ${quickAddMedicine?.normalized_display_name || quickAddMedicine?.display_name || ''}`}
            >
                <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                    {quickBatches.map((b, idx) => (
                        <div key={idx} className="space-y-3 p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Batch number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={b.batch_number}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[idx].batch_number = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        placeholder="e.g. B-9982"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-mono"
                                    />
                                    {quickErrors[`batches.${idx}.batch_number`] && (
                                        <p className="text-[10px] text-rose-500 mt-1">{quickErrors[`batches.${idx}.batch_number`]}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Expiry date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={b.expiry_date}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[idx].expiry_date = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900"
                                    />
                                    {quickErrors[`batches.${idx}.expiry_date`] && (
                                        <p className="text-[10px] text-rose-500 mt-1">{quickErrors[`batches.${idx}.expiry_date`]}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Quantity ({quickAddMedicine?.base_unit}s) *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={b.quantity}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[idx].quantity = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        placeholder="e.g. 50"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-bold"
                                    />
                                    {quickErrors[`batches.${idx}.quantity`] && (
                                        <p className="text-[10px] text-rose-500 mt-1">{quickErrors[`batches.${idx}.quantity`]}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Unit cost (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={b.cost_price}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[idx].cost_price = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        placeholder="0.00"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setQuickAddModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={quickSubmitting}
                            className="px-5 py-2.5 rounded-xl bg-[#0E9E8F] hover:bg-[#0b8276] text-white text-xs font-bold shadow-md shadow-[#0E9E8F]/20 flex items-center gap-2"
                        >
                            {quickSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Receive batch into stock</span>
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* EDIT MEDICINE MODAL */}
            {editMedicineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
                        onClick={() => handleCloseEditMedicine()}
                        aria-hidden="true"
                    />

                    {/* Modal Card */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-medicine-title"
                        className="relative w-full sm:max-w-[640px] max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[92vh] max-sm:rounded-b-none z-10"
                    >
                        {/* Sticky Header */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center border border-[#1E6FD9]/20 shadow-sm shrink-0">
                                    <Pill className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 id="edit-medicine-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                        Edit medicine
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {editingMedicine?.generic_name || 'Medicine'} {editingMedicine?.strength || editingMedicine?.strength_form || ''} {editingMedicine?.dosage_form || ''} &bull; {editingMedicine?.brand_name || 'Generic'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleCloseEditMedicine()}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                aria-label="Close dialog"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrolling Body */}
                        <form onSubmit={handleEditMedicineSubmit} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {editMedicineError && (
                                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{editMedicineError}</span>
                                    </div>
                                )}

                                {/* Grouped Section 1: Pricing */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Pricing
                                        </h4>
                                        <span className="text-[11px] text-slate-400">
                                            {editingMedicine?.last_price_change_date
                                                ? `Last price change: ${editingMedicine.last_price_change_date}`
                                                : 'No recorded price changes'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* Cost Price: read-only from latest batch with calculation tooltip */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                    <span>Cost price</span>
                                                    <div className="relative group cursor-pointer inline-flex items-center">
                                                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#1E6FD9] transition-colors" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-xl bg-slate-900 text-white text-[11px] leading-tight shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-30">
                                                            Unit cost from the latest received stock batch. Used to calculate your margin and profit.
                                                        </div>
                                                    </div>
                                                </label>
                                                <span className="text-[10px] font-semibold text-slate-400">Read-only (from latest batch)</span>
                                            </div>
                                            <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-between">
                                                <span>
                                                    {editingMedicine?.cost_price_cents > 0
                                                        ? formatLKR(editingMedicine.cost_price_cents)
                                                        : 'No batch cost'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-normal">per {editMedicineForm.base_unit || 'tablet'}</span>
                                            </div>
                                        </div>

                                        {/* Selling Price: input with inner Rs. prefix */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Selling price <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative flex items-center">
                                                <span className="absolute left-3.5 text-xs font-bold text-slate-400 select-none pointer-events-none">
                                                    Rs.
                                                </span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    required
                                                    value={editMedicineForm.selling_price}
                                                    onChange={(e) => setEditMedicineForm({ ...editMedicineForm, selling_price: e.target.value })}
                                                    placeholder="e.g. 15.00"
                                                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-bold focus:ring-2 focus:ring-[#1E6FD9] focus:border-[#1E6FD9] transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Feedback Under Pricing */}
                                    {(() => {
                                        const sellingNum = parseFloat(editMedicineForm.selling_price) || 0;
                                        const costNum = (editingMedicine?.cost_price_cents || 0) / 100;
                                        const profit = sellingNum - costNum;
                                        const margin = sellingNum > 0 ? Math.round((profit / sellingNum) * 100) : 0;
                                        const isBelowCost = costNum > 0 && sellingNum > 0 && sellingNum < costNum;

                                        if (sellingNum <= 0) {
                                            return (
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-400">
                                                    Enter a selling price to see live profit and margin feedback.
                                                </div>
                                            );
                                        }

                                        if (isBelowCost) {
                                            return (
                                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                                    <div className="flex-1 font-semibold">
                                                        <span>Selling price is below cost (Cost: {formatLKR(editingMedicine.cost_price_cents)}) &bull; Margin {margin}% &bull; Loss Rs. {Math.abs(profit).toFixed(2)} per {editMedicineForm.base_unit || 'tablet'}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="p-3 rounded-xl bg-[#0E9E8F]/10 border border-[#0E9E8F]/25 text-[#0E9E8F] text-xs flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                <span className="font-bold">
                                                    Margin {margin}% &bull; Profit Rs. {profit.toFixed(2)} per {editMedicineForm.base_unit || 'tablet'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Grouped Section 2: Stock control */}
                                <div className="space-y-3.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Stock control
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* Reorder Level with Clinic Default Toggle */}
                                        <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    Low-stock reorder threshold
                                                </label>
                                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editMedicineForm.use_default_reorder}
                                                        onChange={(e) => setEditMedicineForm({
                                                            ...editMedicineForm,
                                                            use_default_reorder: e.target.checked,
                                                            reorder_level: e.target.checked ? '' : (editMedicineForm.reorder_level || String(settings.default_reorder_level)),
                                                        })}
                                                        className="rounded text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                                    />
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                        Use clinic default ({settings.default_reorder_level})
                                                    </span>
                                                </label>
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    disabled={editMedicineForm.use_default_reorder}
                                                    value={editMedicineForm.use_default_reorder ? settings.default_reorder_level : editMedicineForm.reorder_level}
                                                    onChange={(e) => setEditMedicineForm({ ...editMedicineForm, reorder_level: e.target.value })}
                                                    placeholder="e.g. 15"
                                                    className={`w-full px-3.5 py-2 text-xs rounded-xl border ${
                                                        editMedicineForm.use_default_reorder
                                                            ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-white/5 cursor-not-allowed'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-[#1E6FD9]'
                                                    }`}
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                You'll see a low-stock alert below this level.
                                            </p>
                                        </div>

                                        {/* Base unit select */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Base unit
                                            </label>
                                            <select
                                                disabled={editingMedicine?.has_movements}
                                                value={editMedicineForm.base_unit}
                                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, base_unit: e.target.value })}
                                                className={`w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold ${
                                                    editingMedicine?.has_movements ? 'cursor-not-allowed opacity-60' : ''
                                                }`}
                                            >
                                                {['tablet', 'capsule', 'ml', 'piece', 'vial', 'bottle', 'sachet', 'tube', 'ampoule', 'patch', 'drop', 'inhaler'].map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                            {editingMedicine?.has_movements && (
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Base unit is locked because stock movements exist.
                                                </p>
                                            )}
                                        </div>

                                        {/* Pack size */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Pack size
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={editMedicineForm.pack_size}
                                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, pack_size: e.target.value })}
                                                placeholder="e.g. 10"
                                                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">Units per standard dispenser strip or pack.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Grouped Section 3: Location & identity */}
                                <div className="space-y-3.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Location & identity
                                    </h4>

                                    {/* Shelf Location */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Shelf location
                                        </label>
                                        <input
                                            type="text"
                                            value={editMedicineForm.shelf_location}
                                            onChange={(e) => setEditMedicineForm({ ...editMedicineForm, shelf_location: e.target.value })}
                                            placeholder="e.g. Shelf A-3"
                                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        />
                                        {/* Recent Shelf Suggestions */}
                                        {shelves && shelves.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                <span className="text-[10px] text-slate-400">Suggestions:</span>
                                                {shelves.slice(0, 6).map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setEditMedicineForm({ ...editMedicineForm, shelf_location: s })}
                                                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-[#1E6FD9]/15 hover:text-[#1E6FD9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Barcodes list + Scan to add */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Barcodes
                                        </label>
                                        {editMedicineForm.barcodes && editMedicineForm.barcodes.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {editMedicineForm.barcodes.map((bc) => (
                                                    <span
                                                        key={bc}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10"
                                                    >
                                                        <Barcode className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                                        <span>{bc}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400">No barcodes registered yet.</p>
                                        )}

                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="text"
                                                value={editMedicineForm.new_barcode}
                                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, new_barcode: e.target.value })}
                                                placeholder="e.g. 8901234567890"
                                                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-mono placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setScannerOpen(true)}
                                                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#0E9E8F]/15 hover:text-[#0E9E8F] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                            >
                                                <Barcode className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                                <span>Scan to add</span>
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400">Barcode must be unique within the clinic.</p>
                                    </div>

                                    {/* Brand with Generic Option */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Brand name
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setEditMedicineForm({ ...editMedicineForm, brand_name: 'Generic' })}
                                                className="text-[11px] font-bold text-[#1E6FD9] hover:underline"
                                            >
                                                Set as Generic
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={editMedicineForm.brand_name}
                                            onChange={(e) => setEditMedicineForm({ ...editMedicineForm, brand_name: e.target.value })}
                                            placeholder="e.g. Lipitor (or Generic)"
                                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>

                                {/* Grouped Section 4: Availability */}
                                <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Availability
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editMedicineForm.is_active}
                                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, is_active: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#0E9E8F]"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs">
                                        <span className={`font-semibold ${editMedicineForm.is_active ? 'text-[#0E9E8F]' : 'text-slate-400'}`}>
                                            {editMedicineForm.is_active ? 'Available for prescribing and dispensing' : 'Deactivated / Hidden'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        When turned off, this medicine is hidden from the prescription catalog and dispense counter search. All existing stock, batches, and patient history remain preserved.
                                    </p>
                                </div>
                            </div>

                            {/* Sticky Footer: Cancel and Save changes */}
                            <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => handleCloseEditMedicine()}
                                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editMedicineSubmitting}
                                    className="px-6 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/25 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {editMedicineSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>Save changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Unsaved Changes Confirmation Guard Dialog */}
            {showUnsavedEditGuard && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowUnsavedEditGuard(false)} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-3 z-10">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Discard unsaved changes?</h4>
                        <p className="text-xs text-slate-500">You have unsaved changes in this form. If you close now, your edits will be lost.</p>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowUnsavedEditGuard(false)}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Keep editing
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUnsavedEditGuard(false);
                                    setEditMedicineModalOpen(false);
                                }}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
                            >
                                Discard changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STOCK ADJUSTMENT MODAL */}
            <GlassModal
                isOpen={adjustModalOpen}
                onClose={() => setAdjustModalOpen(false)}
                title="Adjust stock level"
                subtitle={`Batch #${adjustBatchInfo?.batch_number} · ${adjustBatchInfo?.medicine_name}`}
            >
                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                    {adjustError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                            {adjustError}
                        </div>
                    )}

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 text-xs flex justify-between">
                        <span className="text-slate-400">Current batch balance:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                            {adjustBatchInfo?.quantity_remaining} {adjustBatchInfo?.base_unit}s
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Adjustment type
                        </label>
                        <select
                            value={adjustType}
                            onChange={(e) => setAdjustType(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-semibold"
                        >
                            <option value="adjustment_out">Decrease stock (Damaged, Expired, Lost)</option>
                            <option value="adjustment_in">Increase stock (Audit correction, Found units)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Quantity to adjust ({adjustBatchInfo?.base_unit}s) *
                        </label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={adjustQty}
                            onChange={(e) => setAdjustQty(e.target.value)}
                            placeholder="e.g. 5"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-bold"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Mandatory adjustment reason *
                        </label>
                        <input
                            type="text"
                            required
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="e.g. Broken ampoules during shelf reorganization"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setAdjustModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/20"
                        >
                            Commit adjustment
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* EDIT BATCH MODAL */}
            <GlassModal
                isOpen={editBatchModalOpen}
                onClose={() => setEditBatchModalOpen(false)}
                title="Edit batch metadata"
                subtitle={`Batch #${editingBatch?.batch_number}`}
            >
                <form onSubmit={handleEditBatchSubmit} className="space-y-4">
                    {editBatchError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                            {editBatchError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Batch number
                            </label>
                            <input
                                type="text"
                                required
                                value={editBatchForm.batch_number}
                                onChange={(e) => setEditBatchForm({ ...editBatchForm, batch_number: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Expiry date
                            </label>
                            <input
                                type="date"
                                required
                                value={editBatchForm.expiry_date}
                                onChange={(e) => setEditBatchForm({ ...editBatchForm, expiry_date: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Unit cost (Rs.)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editBatchForm.cost_price}
                                onChange={(e) => setEditBatchForm({ ...editBatchForm, cost_price: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Supplier
                            </label>
                            <select
                                value={editBatchForm.supplier_id}
                                onChange={(e) => setEditBatchForm({ ...editBatchForm, supplier_id: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900"
                            >
                                <option value="">No supplier</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setEditBatchModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editBatchSubmitting}
                            className="px-5 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#155ab7] text-white text-xs font-bold shadow-md shadow-[#1E6FD9]/20"
                        >
                            Update batch
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* VOID BATCH MODAL */}
            <GlassModal
                isOpen={voidBatchModalOpen}
                onClose={() => setVoidBatchModalOpen(false)}
                title="Void stock batch"
                subtitle={`Batch #${voidingBatch?.batch_number}`}
            >
                <form onSubmit={handleVoidBatchSubmit} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs">
                        Voiding will permanently zero the remaining balance of this batch and exclude it from active stock.
                    </div>

                    {voidBatchError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                            {voidBatchError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for voiding *
                        </label>
                        <input
                            type="text"
                            required
                            value={voidBatchReason}
                            onChange={(e) => setVoidBatchReason(e.target.value)}
                            placeholder="e.g. Manufacturer recall, contaminated shipment"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setVoidBatchModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={voidBatchSubmitting}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                        >
                            Confirm void batch
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* DELETE / DEACTIVATE MODAL (Delete protection rules enforced) */}
            <GlassModal
                isOpen={deleteMedicineModalOpen}
                onClose={() => setDeleteMedicineModalOpen(false)}
                title={deleteActionChoice === 'deactivate' ? 'Deactivate medicine' : 'Delete medicine'}
                subtitle={deletingMedicine?.normalized_display_name || deletingMedicine?.display_name}
            >
                <div className="space-y-4">
                    {/* Delete protection notice */}
                    {deletingMedicine?.has_movements || (deletingMedicine?.batches && deletingMedicine.batches.length > 0) || deletingMedicine?.total_quantity > 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span>Hard delete blocked: Historical records exist</span>
                            </div>
                            <p>
                                Hard delete is permanently blocked because this medicine has recorded batches, stock movements, or prescription lines.
                                You can safely <strong>Deactivate</strong> it instead. It will be hidden from prescribing and dispensing while preserving all legal medical audit records.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs">
                            This medicine has zero recorded history or batches. Permanent hard deletion is allowed.
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setDeleteMedicineModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={deleteMedicineSubmitting}
                            onClick={confirmDeleteOrInactive}
                            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md ${
                                deleteActionChoice === 'deactivate'
                                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                            }`}
                        >
                            {deleteMedicineSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />}
                            <span>{deleteActionChoice === 'deactivate' ? 'Deactivate medicine' : 'Permanently delete'}</span>
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={handleBarcodeScanned}
            />

            {/* Link Barcode Modal */}
            {unlinkedBarcode && (
                <LinkBarcodeModal
                    isOpen={Boolean(unlinkedBarcode)}
                    barcode={unlinkedBarcode}
                    onClose={() => setUnlinkedBarcode(null)}
                    onSuccess={handleBarcodeLinked}
                />
            )}
        </AuthenticatedLayout>
    );
}
