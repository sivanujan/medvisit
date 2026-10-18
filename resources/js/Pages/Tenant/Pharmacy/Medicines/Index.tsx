import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface MedicineStockItem {
    id: number;
    display_name: string;
    generic_name: string;
    strength_form: string;
    brand_name?: string | null;
    base_unit: string;
    selling_price_cents: number;
    reorder_level?: number | null;
    shelf_location?: string | null;
    is_active: boolean;
    total_quantity: number;
    nearest_expiry?: string | null;
    all_active_expiries?: string[];
    extra_batches_count?: number;
    batch_count: number;
    batches?: Array<{
        id: number;
        batch_number: string;
        expiry_date?: string | null;
        quantity_remaining: number;
        quantity_received: number;
        cost_price_cents: number;
        supplier_id?: number | null;
        supplier_name?: string | null;
        received_at?: string | null;
        status: 'ok' | 'expiring_soon' | 'expired';
    }>;
    has_movements?: boolean;
    status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'inactive';
}

export const STATUS_LABELS: Record<string, string> = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    inactive: 'Inactive',
};

export interface BatchInputRow {
    batch_number: string;
    expiry_date: string;
    quantity: string;
    cost_price: string;
}

interface Props {
    medicines: {
        data: MedicineStockItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    suppliers?: Array<{ id: number; name: string }>;
    filters: {
        search: string;
        filter: string;
        expiring_days: number;
    };
    settings: {
        default_reorder_level: number;
        expiring_soon_days: number;
    };
}

export default function PharmacyStockIndex({
    medicines,
    suppliers = [],
    filters,
    settings,
}: Props) {
    const { can } = usePermission();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isLookupInProgress, setIsLookupInProgress] = useState(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
    const [drawerData, setDrawerData] = useState<any | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Expandable table rows
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    // Drawer Voided batches toggle
    const [showVoidedBatches, setShowVoidedBatches] = useState(false);

    // Inline Drawer Selling Price Edit
    const [isEditingDrawerPrice, setIsEditingDrawerPrice] = useState(false);
    const [drawerPriceValue, setDrawerPriceValue] = useState('');
    const [drawerPriceSubmitting, setDrawerPriceSubmitting] = useState(false);

    // Edit Medicine Modal State
    const [editMedicineModalOpen, setEditMedicineModalOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<any | null>(null);
    const [editMedicineForm, setEditMedicineForm] = useState({
        selling_price: '',
        reorder_level: '',
        shelf_location: '',
        base_unit: '',
        is_active: true,
    });
    const [editMedicineSubmitting, setEditMedicineSubmitting] = useState(false);
    const [editMedicineError, setEditMedicineError] = useState<string | null>(null);

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

    // Delete / Inactive Medicine Modal State
    const [deleteMedicineModalOpen, setDeleteMedicineModalOpen] = useState(false);
    const [deletingMedicine, setDeletingMedicine] = useState<any | null>(null);
    const [deleteMedicineSubmitting, setDeleteMedicineSubmitting] = useState(false);

    // Add Medicine Modal State
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'amber' | 'error'; message: string } | null>(null);
    const [unlinkedBarcode, setUnlinkedBarcode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 250);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<any | null>(null);
    const [customFormActive, setCustomFormActive] = useState(false);

    // Add Medicine Form Fields
    const [sellingPrice, setSellingPrice] = useState('');
    const [reorderLevel, setReorderLevel] = useState(settings.default_reorder_level.toString());
    const [shelfLocation, setShelfLocation] = useState('');
    const [baseUnit, setBaseUnit] = useState('tablet');
    const [openingBatches, setOpeningBatches] = useState<BatchInputRow[]>([]);

    // Custom Medicine Form Fields
    const [customGeneric, setCustomGeneric] = useState('');
    const [customStrength, setCustomStrength] = useState('');
    const [customDosageForm, setCustomDosageForm] = useState('Tablet');
    const [customRoute, setCustomRoute] = useState('Oral');
    const [customBrand, setCustomBrand] = useState('');
    const [customManufacturer, setCustomManufacturer] = useState('');

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

    // Watch flash messages
    const { flash } = usePage<any>().props;
    useEffect(() => {
        if (flash?.success) {
            setToast({ type: 'success', message: flash.success });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
        if (flash?.error) {
            setToast({ type: 'error', message: flash.error });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

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

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            '/pharmacy/medicines',
            { ...filters, [key]: value },
            { preserveState: true, replace: true }
        );
    };

    const openDetailDrawer = async (id: number) => {
        setSelectedMedicineId(id);
        setDetailDrawerOpen(true);
        setDrawerLoading(true);
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

    const openEditMedicine = (med: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingMedicine(med);
        setEditMedicineForm({
            selling_price: med.selling_price_cents > 0 ? (med.selling_price_cents / 100).toFixed(2) : '',
            reorder_level: med.reorder_level != null ? med.reorder_level.toString() : '',
            shelf_location: med.shelf_location || '',
            base_unit: med.base_unit || 'tablet',
            is_active: med.is_active ?? true,
        });
        setEditMedicineError(null);
        setEditMedicineModalOpen(true);
    };

    const handleEditMedicineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMedicine) return;
        setEditMedicineSubmitting(true);
        setEditMedicineError(null);

        router.put(
            route('tenant.pharmacy.medicines.update', editingMedicine.id),
            {
                selling_price: editMedicineForm.selling_price !== '' ? editMedicineForm.selling_price : 0,
                reorder_level: editMedicineForm.reorder_level !== '' ? parseInt(editMedicineForm.reorder_level) : null,
                shelf_location: editMedicineForm.shelf_location,
                base_unit: editMedicineForm.base_unit,
                is_active: editMedicineForm.is_active,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditMedicineModalOpen(false);
                    setToast({ type: 'success', message: 'Medicine updated successfully.' });
                    if (selectedMedicineId === editingMedicine.id) {
                        openDetailDrawer(editingMedicine.id);
                    }
                },
                onError: (errs) => {
                    setEditMedicineError(Object.values(errs)[0] as string || 'Failed to update medicine.');
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
                    setToast({ type: 'error', message: Object.values(errs)[0] as string || 'Failed to update price.' });
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
                    setEditBatchError(Object.values(errs)[0] as string || 'Failed to update batch.');
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
                    setVoidBatchError(Object.values(errs)[0] as string || 'Failed to void batch.');
                },
                onFinish: () => setVoidBatchSubmitting(false),
            }
        );
    };

    const handleDeleteOrInactive = (med: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setDeletingMedicine(med);
        setDeleteMedicineModalOpen(true);
    };

    const confirmDeleteOrInactive = () => {
        if (!deletingMedicine) return;
        setDeleteMedicineSubmitting(true);

        if (deletingMedicine.has_movements) {
            router.put(
                route('tenant.pharmacy.medicines.update', deletingMedicine.id),
                { is_active: false },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setDeleteMedicineModalOpen(false);
                        setToast({ type: 'success', message: `${deletingMedicine.display_name} marked as inactive.` });
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
                        setToast({ type: 'success', message: `${deletingMedicine.display_name} removed from stock.` });
                    },
                    onFinish: () => setDeleteMedicineSubmitting(false),
                }
            );
        }
    };

    const addOpeningBatchRow = () => {
        setOpeningBatches((prev) => [
            ...prev,
            { batch_number: '', expiry_date: '', quantity: '', cost_price: '' },
        ]);
    };

    const updateOpeningBatchRow = (index: number, field: keyof BatchInputRow, value: string) => {
        setOpeningBatches((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeOpeningBatchRow = (index: number) => {
        setOpeningBatches((prev) => prev.filter((_, i) => i !== index));
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
                newErrors[`batches.${idx}.batch_number`] = 'Batch number is required (enter N/A if none)';
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
        router.post(`/pharmacy/medicines/${quickAddMedicine.id}/batches`, { batches: formatted }, {
            preserveScroll: true,
            onSuccess: () => {
                setQuickAddModalOpen(false);
                setQuickSubmitting(false);
                setToast({ type: 'success', message: `Stock added successfully to ${quickAddMedicine.display_name}.` });
                router.reload({ only: ['medicines'] });
                if (detailDrawerOpen && selectedMedicineId === quickAddMedicine.id) {
                    openDetailDrawer(quickAddMedicine.id);
                }
            },
            onError: (errs) => {
                setQuickSubmitting(false);
                setQuickErrors(errs);
                setToast({ type: 'error', message: 'Failed to add stock batches.' });
            },
        });
    };

    const handleAddMedicineSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: any = {
            base_unit: baseUnit,
            selling_price: sellingPrice,
            reorder_level: reorderLevel ? parseInt(reorderLevel, 10) : null,
            shelf_location: shelfLocation || null,
        };

        if (customFormActive) {
            payload.generic_name = customGeneric;
            payload.strength = customStrength;
            payload.dosage_form = customDosageForm;
            payload.route = customRoute;
            payload.brand_name = customBrand || null;
            payload.manufacturer = customManufacturer || null;
        } else if (selectedCatalogItem) {
            payload.variant_id = selectedCatalogItem.variant_id;
            payload.brand_id = selectedCatalogItem.brand_id;
        } else {
            return;
        }

        const validOpeningBatches = openingBatches
            .filter((b) => b.quantity && parseInt(b.quantity, 10) > 0)
            .map((b) => ({
                batch_number: b.batch_number?.trim() || 'N/A',
                expiry_date: b.expiry_date,
                quantity: parseInt(b.quantity, 10),
                cost_price: b.cost_price ? parseFloat(b.cost_price) : null,
            }));

        if (validOpeningBatches.length > 0) {
            payload.opening_batches = validOpeningBatches;
        }

        setSubmitting(true);
        router.post('/pharmacy/medicines', payload, {
            preserveScroll: true,
            onSuccess: (page) => {
                setAddModalOpen(false);
                setSelectedCatalogItem(null);
                setCustomFormActive(false);
                setSearchQuery('');
                setSellingPrice('');
                setShelfLocation('');
                setOpeningBatches([]);
                setSubmitting(false);

                const successMsg = page.props?.flash?.success || 'Medicine added to clinic stock successfully.';
                setToast({ type: 'success', message: successMsg });

                // Reload the stock list immediately
                router.reload({ only: ['medicines'] });
            },
            onError: (errs) => {
                setSubmitting(false);
                const errMsg = Object.values(errs)[0] || 'Already in your stock.';
                setToast({ type: 'error', message: String(errMsg) });
            },
        });
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustBatchId || !adjustQty || !adjustReason.trim()) return;

        setAdjustError(null);
        router.post('/pharmacy/stock/adjust', {
            batch_id: adjustBatchId,
            type: adjustType,
            quantity: parseInt(adjustQty, 10),
            reason: adjustReason,
        }, {
            onSuccess: () => {
                setAdjustModalOpen(false);
                setAdjustQty('');
                setAdjustReason('');
                if (selectedMedicineId) {
                    openDetailDrawer(selectedMedicineId);
                }
            },
            onError: (errs) => {
                if (errs.quantity) {
                    setAdjustError(errs.quantity);
                }
            },
        });
    };

    const handleBarcodeScanned = (barcode: string) => {
        setScannerOpen(false);
        const code = barcode.trim();
        if (!code) return;

        setIsLookupInProgress(true);
        fetch(`/pharmacy/barcodes/${encodeURIComponent(code)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.found) {
                    const displayName = `${data.generic_name} ${data.variant_display}${data.brand_name ? ` (${data.brand_name})` : ''}`;
                    if (addModalOpen) {
                        setSelectedCatalogItem({
                            source: 'catalog',
                            in_stock: Boolean(data.clinic_medicine_id),
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
                            message: `Barcode matched: ${displayName}`,
                        });
                    } else {
                        handleFilterChange('search', data.brand_name || data.generic_name || code);
                        setToast({
                            type: 'success',
                            message: `Found: ${displayName}`,
                        });
                    }
                } else {
                    // Unknown barcode -> open Link Barcode modal!
                    setUnlinkedBarcode(code);
                    setToast({
                        type: 'amber',
                        message: `Barcode ${code} not yet linked to any brand in the catalog.`,
                    });
                }
            })
            .catch(() => {
                setToast({
                    type: 'error',
                    message: `Failed to check barcode ${code}.`,
                });
            })
            .finally(() => {
                setIsLookupInProgress(false);
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
                message: `Barcode ${data.barcode} linked to ${data.brand_name} and added to clinic stock.`,
            });
        }
        setUnlinkedBarcode(null);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pharmacy & Inventory Stock - MedVisit" />

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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Pharmacy & Inventory"
                    subtitle="Track clinic medicines, batch expiry dates, stock movements and selling prices."
                    action={
                        <div className="flex flex-wrap gap-2.5">
                            {can('pharmacy.view') && (
                                <Link
                                    href="/pharmacy/receipts"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm"
                                >
                                    <Receipt className="w-4 h-4 text-indigo-600" />
                                    <span>Stock Receipts</span>
                                </Link>
                            )}

                            {can('pharmacy.import') && (
                                <Link
                                    href="/pharmacy/import"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    <span>Import CSV</span>
                                </Link>
                            )}

                            {can('pharmacy.receive_stock') && (
                                <Link
                                    href="/pharmacy/receipts/create"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm"
                                >
                                    <Boxes className="w-4 h-4 text-teal-600" />
                                    <span>Receive Stock (GRN)</span>
                                </Link>
                            )}

                            {can('pharmacy.manage_medicines') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddModalOpen(true);
                                        setSelectedCatalogItem(null);
                                        setCustomFormActive(false);
                                        setSearchQuery('');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.01]"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Medicine to Stock</span>
                                </button>
                            )}
                        </div>
                    }
                />

                {/* Filter Tabs & Search Bar */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        {/* Tab Chips */}
                        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 w-full sm:w-auto">
                            {[
                                { id: 'all', label: 'All Stock' },
                                { id: 'low_stock', label: 'Low Stock' },
                                { id: 'out_of_stock', label: 'Out of Stock' },
                                { id: 'expiring_soon', label: `Expiring Soon (${settings.expiring_soon_days}d)` },
                                { id: 'expired', label: 'Expired' },
                                { id: 'inactive', label: 'Inactive' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleFilterChange('filter', tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        filters.filter === tab.id
                                            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input with Barcode Trigger */}
                        <div className="relative w-full sm:w-80 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    defaultValue={filters.search}
                                    placeholder="Search medicine, brand or shelf..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleFilterChange('search', (e.target as HTMLInputElement).value);
                                        }
                                    }}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setScannerOpen(true)}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300"
                                title="Scan barcode with camera or scanner"
                            >
                                <Barcode className="w-5 h-5 text-teal-600" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stock Table */}
                <GlassCard className="p-0 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="w-8 py-3.5 pl-3 pr-1"></th>
                                <th className="py-3.5 px-4">Medicine & Strength</th>
                                <th className="py-3.5 px-4">Brand</th>
                                <th className="py-3.5 px-4">Shelf</th>
                                <th className="py-3.5 px-4">Selling Price</th>
                                <th className="py-3.5 px-4">Stock Level</th>
                                <th className="py-3.5 px-4">Nearest Expiry</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                            {medicines.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-14 text-center text-slate-400">
                                        No medicines found in stock matching this filter.
                                    </td>
                                </tr>
                            ) : (
                                medicines.data.map((med) => {
                                    const isOut = med.total_quantity <= 0;
                                    const isLow = !isOut && med.reorder_level != null && med.total_quantity <= med.reorder_level;
                                    const isExpanded = expandedRows.has(med.id);

                                    return (
                                        <React.Fragment key={med.id}>
                                            <tr
                                                onClick={() => openDetailDrawer(med.id)}
                                                className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                                                    isExpanded ? 'bg-slate-50/40 dark:bg-slate-800/30' : ''
                                                }`}
                                            >
                                                {/* Expand Chevron Column */}
                                                <td
                                                    className="py-3.5 pl-3 pr-1 text-center"
                                                    onClick={(e) => toggleRowExpand(med.id, e)}
                                                >
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform"
                                                        title={isExpanded ? 'Collapse batches' : 'Expand batches to see expiry dates'}
                                                    >
                                                        <ChevronDown
                                                            className={`w-4 h-4 transition-transform duration-200 ${
                                                                isExpanded ? 'rotate-0' : '-rotate-90'
                                                            }`}
                                                        />
                                                    </button>
                                                </td>

                                                {/* Medicine Name */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {med.display_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {med.generic_name} &bull; {med.strength_form}
                                                    </div>
                                                </td>

                                                {/* Brand */}
                                                <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                                                    {med.brand_name || <span className="text-slate-400 italic">Generic</span>}
                                                </td>

                                                {/* Shelf */}
                                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                    {med.shelf_location || '-'}
                                                </td>

                                                {/* Selling Price */}
                                                <td className="py-3.5 px-4">
                                                    {med.selling_price_cents > 0 ? (
                                                        <div>
                                                            <span className="font-bold text-slate-900 dark:text-white">
                                                                {formatLKR(med.selling_price_cents)}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                                                                / {med.base_unit}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                                Price not set
                                                            </span>
                                                            {can('pharmacy.manage_medicines') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => openEditMedicine(med, e)}
                                                                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                                                                >
                                                                    <Pencil className="w-2.5 h-2.5" />
                                                                    Set price
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Stock Level */}
                                                <td className="py-3.5 px-4">
                                                    <span className={`font-extrabold ${
                                                        isOut
                                                            ? 'text-rose-600 dark:text-rose-400'
                                                            : isLow
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : 'text-slate-900 dark:text-white'
                                                    }`}>
                                                        {med.total_quantity}
                                                    </span>
                                                    <span className="text-xs text-slate-500 ml-1">
                                                        {med.base_unit}s
                                                    </span>
                                                </td>

                                                {/* Nearest Expiry */}
                                                <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                    {med.nearest_expiry ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{formatDateDMY(med.nearest_expiry)}</span>
                                                            {(med.extra_batches_count ?? 0) > 0 && (
                                                                <span
                                                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-help"
                                                                    title={`All active batch expiries:\n${med.all_active_expiries?.map((d) => formatDateDMY(d)).join('\n') || ''}`}
                                                                >
                                                                    +{med.extra_batches_count} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                                                        med.status === 'in_stock'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : med.status === 'low_stock'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                            : med.status === 'out_of_stock'
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                            : med.status === 'expiring_soon'
                                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                                            : med.status === 'expired'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}>
                                                        {STATUS_LABELS[med.status] || med.status}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => openQuickAddModal(med, e)}
                                                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                                                            title="Add stock to this medicine"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            Add stock
                                                        </button>

                                                        {can('pharmacy.manage_medicines') && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openEditMedicine(med, e)}
                                                                className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                title="Edit medicine details"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {can('pharmacy.manage_medicines') && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteOrInactive(med, e)}
                                                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                title={med.has_movements ? 'Mark inactive' : 'Remove from stock'}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => openDetailDrawer(med.id)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                            title="View details"
                                                        >
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable Inline Batches Table */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800">
                                                    <td colSpan={9} className="py-3 px-6">
                                                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                                                            <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                <span>Active Batches for {med.display_name}</span>
                                                                <span className="text-[11px] font-normal text-slate-500">
                                                                    Sorted by expiry date ascending
                                                                </span>
                                                            </div>

                                                            {!med.batches || med.batches.length === 0 ? (
                                                                <div className="py-4 text-center text-xs text-slate-400">
                                                                    No active batches currently in stock for this medicine.
                                                                </div>
                                                            ) : (
                                                                <table className="w-full text-left text-xs">
                                                                    <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100 dark:border-slate-700">
                                                                        <tr>
                                                                            <th className="py-2 px-3">Batch No</th>
                                                                            <th className="py-2 px-3">Expiry (DD/MM/YYYY)</th>
                                                                            <th className="py-2 px-3">Remaining / Received</th>
                                                                            <th className="py-2 px-3">Cost / unit</th>
                                                                            <th className="py-2 px-3">Supplier</th>
                                                                            <th className="py-2 px-3">Received Date</th>
                                                                            <th className="py-2 px-3">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
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
                                                                                            Expiring Soon
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                                            OK
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
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
                </GlassCard>
            </div>

            {/* DETAIL DRAWER */}
            {detailDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setDetailDrawerOpen(false)}
                    />

                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
                        <div className="space-y-6">
                            {/* Drawer Header */}
                            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {drawerData?.medicine?.display_name || 'Medicine Details'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {drawerData?.medicine?.generic_name} &bull; {drawerData?.medicine?.strength_form}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {can('pharmacy.manage_medicines') && drawerData?.medicine && (
                                        <button
                                            type="button"
                                            onClick={() => openEditMedicine(drawerData.medicine)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            title="Edit medicine settings"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setDetailDrawerOpen(false)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {drawerLoading ? (
                                <div className="py-12 text-center text-slate-400">Loading batch details...</div>
                            ) : (
                                <>
                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Stock</span>
                                            <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                                {drawerData?.medicine?.total_quantity} {drawerData?.medicine?.base_unit}s
                                            </span>
                                        </div>

                                        {/* Selling Price Card with Inline Edit */}
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">Selling Price</span>
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
                                                        className="text-slate-400 hover:text-teal-600 p-0.5"
                                                        title="Edit price directly"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>

                                            {isEditingDrawerPrice ? (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={drawerPriceValue}
                                                        onChange={(e) => setDrawerPriceValue(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-24 px-2 py-1 text-xs rounded border border-teal-500 dark:border-teal-400 bg-white dark:bg-slate-900 font-bold"
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
                                                        className="p-1 rounded bg-teal-600 hover:bg-teal-700 text-white"
                                                        title="Save"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingDrawerPrice(false)}
                                                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : drawerData?.medicine?.selling_price_cents > 0 ? (
                                                <span className="text-base font-extrabold text-teal-600">
                                                    {formatLKR(drawerData?.medicine?.selling_price_cents)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                    Price not set
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Shelf Location</span>
                                            <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">
                                                {drawerData?.medicine?.shelf_location || 'None'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Batches Section */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Stock Batches
                                                </h4>
                                                {drawerData?.batches?.some((b: any) => b.is_voided) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowVoidedBatches(!showVoidedBatches)}
                                                        className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                                                    >
                                                        {showVoidedBatches ? 'Hide voided' : 'Show voided'}
                                                    </button>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => openQuickAddModal(drawerData.medicine)}
                                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-sm transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add stock
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {(() => {
                                                const allBatches = drawerData?.batches || [];
                                                const displayedBatches = showVoidedBatches
                                                    ? allBatches
                                                    : allBatches.filter((b: any) => !b.is_voided);

                                                if (displayedBatches.length === 0) {
                                                    return (
                                                        <p className="text-xs text-slate-400 italic">
                                                            {showVoidedBatches ? 'No batches found.' : 'No active batches in stock.'}
                                                        </p>
                                                    );
                                                }

                                                return displayedBatches.map((batch: any) => {
                                                    const today = new Date().toISOString().slice(0, 10);
                                                    const isExpired = batch.expiry_date && batch.expiry_date < today;

                                                    return (
                                                        <div
                                                            key={batch.id}
                                                            className={`p-3 rounded-xl border text-xs transition-colors ${
                                                                batch.is_voided
                                                                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 opacity-75'
                                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    {/* Batch Number & Status */}
                                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                        <span className="font-mono">Batch #{batch.batch_number}</span>
                                                                        {batch.is_voided ? (
                                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                                Voided
                                                                            </span>
                                                                        ) : isExpired ? (
                                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                                Expired
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                                Active
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Prominent Expiry Line */}
                                                                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                                                                        <span className="text-slate-500 font-medium">Expiry:</span>
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                                                            {formatDateDMY(batch.expiry_date)}
                                                                        </span>
                                                                    </div>

                                                                    {/* Metadata */}
                                                                    <div className="text-[11px] text-slate-500 mt-1 space-x-1">
                                                                        <span>Cost: {formatLKR(batch.cost_price_cents)}</span>
                                                                        <span>&bull;</span>
                                                                        <span>Supplier: {batch.supplier_name || 'N/A'}</span>
                                                                        <span>&bull;</span>
                                                                        <span>Received: {formatDateDMY(batch.received_at)}</span>
                                                                    </div>

                                                                    {batch.is_voided && (
                                                                        <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                                                                            Void Reason: {batch.void_reason || 'No reason specified'}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Quantity Remaining */}
                                                                <div className="text-right">
                                                                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                                        {batch.quantity_remaining}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 block">
                                                                        /{batch.quantity_received} received
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Batch Actions */}
                                                            {!batch.is_voided && (
                                                                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                                                    {can('pharmacy.adjust_stock') && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setAdjustBatchId(batch.id);
                                                                                setAdjustBatchInfo(batch);
                                                                                setAdjustModalOpen(true);
                                                                            }}
                                                                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px]"
                                                                        >
                                                                            Adjust Qty
                                                                        </button>
                                                                    )}

                                                                    {can('pharmacy.manage_medicines') && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openEditBatch(batch)}
                                                                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1"
                                                                        >
                                                                            <Pencil className="w-3 h-3" />
                                                                            Edit
                                                                        </button>
                                                                    )}

                                                                    {can('pharmacy.adjust_stock') && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openVoidBatch(batch)}
                                                                            disabled={batch.has_dispense}
                                                                            title={batch.has_dispense ? 'Cannot void: batch has already been dispensed' : 'Void batch'}
                                                                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[11px] inline-flex items-center gap-1"
                                                                        >
                                                                            <Ban className="w-3 h-3" />
                                                                            Void
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Movement Ledger */}
                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Stock Ledger History
                                        </h4>
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                            {drawerData?.movements?.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No movements recorded yet.</p>
                                            ) : (
                                                drawerData?.movements?.map((m: any) => (
                                                    <div
                                                        key={m.id}
                                                        className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-750 text-[11px] flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div>
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                                                    {m.type.replace('_', ' ')}
                                                                </span>
                                                                {m.batch_number && (
                                                                    <span className="font-mono text-slate-600 dark:text-slate-300 ml-1.5">
                                                                        — Batch {m.batch_number}
                                                                        {m.receipt_number ? ` (${m.receipt_number})` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {m.reason && (
                                                                <div className="text-slate-500 mt-0.5">
                                                                    Reason: {m.reason}
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                                {m.created_at} by {m.user_name}
                                                            </div>
                                                        </div>
                                                        <span className={`font-mono font-extrabold text-xs shrink-0 ml-2 ${
                                                            m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD MEDICINE TO STOCK MODAL */}
            <GlassModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add Medicine to Clinic Stock"
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
                    {!customFormActive ? (
                        <>
                            {/* Unified Search Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Search Medicine Catalog
                                </label>
                                <div className="relative flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setSelectedCatalogItem(null);
                                            }}
                                            placeholder="Type generic name, brand or scan barcode..."
                                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setScannerOpen(true)}
                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 shrink-0"
                                        title="Scan barcode with camera or scanner"
                                    >
                                        <Barcode className="w-5 h-5 text-teal-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Error Banner */}
                            {searchError && (
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>{searchError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSearchError(null)}
                                        className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 p-0.5"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Loading State */}
                            {searchLoading && (
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" />
                                    <span>Searching medicine catalog...</span>
                                </div>
                            )}

                            {/* Empty State: No medicines found */}
                            {!searchLoading && !searchError && debouncedSearch.trim().length >= 2 && searchResults.length === 0 && !selectedCatalogItem && (
                                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-2">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        No medicines found for &ldquo;<span className="font-semibold text-slate-900 dark:text-slate-200">{debouncedSearch.trim()}</span>&rdquo;
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomGeneric(debouncedSearch.trim());
                                            setCustomFormActive(true);
                                        }}
                                        className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add custom medicine</span>
                                    </button>
                                </div>
                            )}

                            {/* Search Results Dropdown List */}
                            {!searchLoading && !searchError && searchResults.length > 0 && !selectedCatalogItem ? (
                                <div className="max-h-52 overflow-y-auto space-y-1.5 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                                    {searchResults.map((item, idx) => {
                                        const isAlreadyInStock = Boolean(item.in_stock || item.source === 'stock');
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    if (isAlreadyInStock) {
                                                        setSearchError(`"${item.display_name}" is already in your clinic stock.`);
                                                        return;
                                                    }
                                                    setSelectedCatalogItem(item);
                                                    setBaseUnit(item.base_unit || 'tablet');
                                                    if (item.selling_price_cents > 0) {
                                                        setSellingPrice((item.selling_price_cents / 100).toFixed(2));
                                                    }
                                                }}
                                                className={`p-2.5 rounded-lg transition-colors text-xs flex items-center justify-between ${
                                                    isAlreadyInStock
                                                        ? 'bg-amber-50/60 dark:bg-amber-950/20 cursor-not-allowed'
                                                        : 'hover:bg-white dark:hover:bg-slate-700 cursor-pointer'
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {item.display_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {item.generic_name} &bull; {item.strength_form}
                                                    </div>
                                                </div>
                                                {isAlreadyInStock ? (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                        Already in your stock
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                                                        Select
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {/* Selected Item Card */}
                            {selectedCatalogItem && (
                                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                                            {selectedCatalogItem.display_name}
                                        </span>
                                        <span className="text-[11px] text-teal-700 dark:text-teal-400">
                                            {selectedCatalogItem.generic_name} ({selectedCatalogItem.strength_form})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCatalogItem(null)}
                                        className="text-teal-600 hover:text-teal-800 text-xs font-bold"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {/* Not found toggle */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCustomFormActive(true)}
                                    className="text-xs text-teal-600 hover:text-teal-800 dark:text-teal-400 font-semibold"
                                >
                                    Can't find your medicine? Add a custom medicine &rarr;
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Custom Medicine Submission Form */
                        <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    New Medicine Submission
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCustomFormActive(false)}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                    Back to Catalog Search
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Generic Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={customGeneric}
                                        onChange={(e) => setCustomGeneric(e.target.value)}
                                        placeholder="e.g. Paracetamol"
                                        required
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Strength *
                                    </label>
                                    <input
                                        type="text"
                                        value={customStrength}
                                        onChange={(e) => setCustomStrength(e.target.value)}
                                        placeholder="e.g. 500 mg"
                                        required
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Dosage Form *
                                    </label>
                                    <select
                                        value={customDosageForm}
                                        onChange={(e) => setCustomDosageForm(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    >
                                        <option value="Tablet">Tablet</option>
                                        <option value="Capsule">Capsule</option>
                                        <option value="Syrup">Syrup</option>
                                        <option value="Suspension">Suspension</option>
                                        <option value="Solution">Solution</option>
                                        <option value="Injection">Injection</option>
                                        <option value="Cream">Cream</option>
                                        <option value="Ointment">Ointment</option>
                                        <option value="Gel">Gel</option>
                                        <option value="Drops">Drops</option>
                                        <option value="Inhaler">Inhaler</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Administration Route
                                    </label>
                                    <select
                                        value={customRoute}
                                        onChange={(e) => setCustomRoute(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    >
                                        <option value="Oral">Oral</option>
                                        <option value="Topical">Topical</option>
                                        <option value="Injection">Injection</option>
                                        <option value="Ophthalmic">Ophthalmic</option>
                                        <option value="Inhalation">Inhalation</option>
                                        <option value="Nasal">Nasal</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Brand Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={customBrand}
                                        onChange={(e) => setCustomBrand(e.target.value)}
                                        placeholder="e.g. Panadol"
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Manufacturer
                                    </label>
                                    <input
                                        type="text"
                                        value={customManufacturer}
                                        onChange={(e) => setCustomManufacturer(e.target.value)}
                                        placeholder="e.g. GSK"
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clinic Stock Settings Fields */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Base Unit *
                            </label>
                            <select
                                value={baseUnit}
                                onChange={(e) => setBaseUnit(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="tablet">Tablet</option>
                                <option value="capsule">Capsule</option>
                                <option value="ml">ml</option>
                                <option value="bottle">Bottle</option>
                                <option value="tube">Tube</option>
                                <option value="vial">Vial</option>
                                <option value="piece">Piece</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Selling Price (LKR) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                placeholder="0.00"
                                required
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Reorder Level
                            </label>
                            <input
                                type="number"
                                value={reorderLevel}
                                onChange={(e) => setReorderLevel(e.target.value)}
                                placeholder="10"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Shelf / Storage Location (Optional)
                        </label>
                        <input
                            type="text"
                            value={shelfLocation}
                            onChange={(e) => setShelfLocation(e.target.value)}
                            placeholder="e.g. Cabinet B, Shelf 2"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                    </div>

                    {/* Opening Stock Section (Optional) */}
                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Boxes className="w-4 h-4 text-teal-600" />
                                    Opening Stock (Optional)
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    Add initial stock batches on creation, or leave empty to start with 0 stock.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addOpeningBatchRow}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                + Add another batch
                            </button>
                        </div>

                        {openingBatches.length > 0 && (
                            <div className="space-y-2">
                                {openingBatches.map((batch, bIdx) => (
                                    <div
                                        key={bIdx}
                                        className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-center"
                                    >
                                        <div className="col-span-3">
                                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                                Batch # *
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. B001"
                                                value={batch.batch_number}
                                                onChange={(e) => updateOpeningBatchRow(bIdx, 'batch_number', e.target.value)}
                                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                                Expiry Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={batch.expiry_date}
                                                onChange={(e) => updateOpeningBatchRow(bIdx, 'expiry_date', e.target.value)}
                                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                                Qty ({baseUnit}s) *
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="30"
                                                value={batch.quantity}
                                                onChange={(e) => updateOpeningBatchRow(bIdx, 'quantity', e.target.value)}
                                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                                Cost / unit
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={batch.cost_price}
                                                onChange={(e) => updateOpeningBatchRow(bIdx, 'cost_price', e.target.value)}
                                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-end pt-3">
                                            <button
                                                type="button"
                                                onClick={() => removeOpeningBatchRow(bIdx)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                title="Remove batch row"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || (!customFormActive && !selectedCatalogItem)}
                            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{submitting ? 'Saving...' : 'Save to My Stock'}</span>
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* STOCK ADJUSTMENT MODAL */}
            <GlassModal
                isOpen={adjustModalOpen}
                onClose={() => setAdjustModalOpen(false)}
                title={`Adjust Stock: Batch #${adjustBatchInfo?.batch_number || 'N/A'}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Current Remaining in Batch: <strong>{adjustBatchInfo?.quantity_remaining} units</strong>. Every adjustment is recorded immutably in the stock ledger.
                    </p>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Adjustment Type
                        </label>
                        <select
                            value={adjustType}
                            onChange={(e) => setAdjustType(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                            <option value="adjustment_out">Remove Stock (Inventory Correction)</option>
                            <option value="adjustment_in">Add Stock (Inventory Correction)</option>
                            <option value="expired">Mark as Expired</option>
                            <option value="damaged">Mark as Damaged</option>
                            <option value="return_to_supplier">Return to Supplier</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Quantity *
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={adjustQty}
                            onChange={(e) => setAdjustQty(e.target.value)}
                            placeholder="Enter units..."
                            required
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        {adjustError && (
                            <p className="text-xs text-rose-600 mt-1 font-medium">{adjustError}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Mandatory Reason *
                        </label>
                        <textarea
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="e.g. Physical inventory audit discrepancy, broken bottle..."
                            rows={2}
                            required
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setAdjustModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!adjustQty || !adjustReason.trim()}
                            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md"
                        >
                            Record Adjustment
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* QUICK ADD STOCK MODAL */}
            <GlassModal
                isOpen={quickAddModalOpen}
                onClose={() => setQuickAddModalOpen(false)}
                title={`Add Stock: ${quickAddMedicine?.display_name || 'Medicine'}`}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Quickly add incoming batches of <strong>{quickAddMedicine?.display_name}</strong> without creating a full GRN receipt. Movements are logged directly in the stock ledger.
                    </p>

                    <div className="space-y-2">
                        {quickBatches.map((batch, bIdx) => (
                            <div
                                key={bIdx}
                                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-start"
                            >
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                        Batch # *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. B001"
                                        value={batch.batch_number}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[bIdx].batch_number = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        required
                                        className={`w-full px-2.5 py-1 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                                            quickErrors[`batches.${bIdx}.batch_number`] ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    />
                                    {quickErrors[`batches.${bIdx}.batch_number`] && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{quickErrors[`batches.${bIdx}.batch_number`]}</p>
                                    )}
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                        Expiry Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={batch.expiry_date}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[bIdx].expiry_date = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        required
                                        className={`w-full px-2.5 py-1 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                                            quickErrors[`batches.${bIdx}.expiry_date`] ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    />
                                    {quickErrors[`batches.${bIdx}.expiry_date`] && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{quickErrors[`batches.${bIdx}.expiry_date`]}</p>
                                    )}
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                        Qty ({quickAddMedicine?.base_unit || 'units'}) *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="100"
                                        value={batch.quantity}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[bIdx].quantity = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        required
                                        className={`w-full px-2.5 py-1 text-xs rounded-lg border bg-white dark:bg-slate-800 ${
                                            quickErrors[`batches.${bIdx}.quantity`] ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                                        }`}
                                    />
                                    {quickErrors[`batches.${bIdx}.quantity`] && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{quickErrors[`batches.${bIdx}.quantity`]}</p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                                        Cost / unit (Rs.)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={batch.cost_price}
                                        onChange={(e) => {
                                            const next = [...quickBatches];
                                            next[bIdx].cost_price = e.target.value;
                                            setQuickBatches(next);
                                        }}
                                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end pt-4">
                                    {quickBatches.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setQuickBatches((prev) => prev.filter((_, i) => i !== bIdx))}
                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                                            title="Remove batch row"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => setQuickBatches((prev) => [...prev, { batch_number: '', expiry_date: '', quantity: '', cost_price: '' }])}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            + Add another batch
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickAddModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={quickSubmitting}
                                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5"
                            >
                                {quickSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{quickSubmitting ? 'Adding...' : 'Add Batches to Stock'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </GlassModal>

            {/* EDIT MEDICINE MODAL */}
            <GlassModal
                isOpen={editMedicineModalOpen}
                onClose={() => setEditMedicineModalOpen(false)}
                title={`Edit Medicine: ${editingMedicine?.display_name || ''}`}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleEditMedicineSubmit} className="space-y-4">
                    {editMedicineError && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                            {editMedicineError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Selling Price (Rs.) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editMedicineForm.selling_price}
                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, selling_price: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">Price charged to patients per unit</span>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Reorder Alert Level
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={editMedicineForm.reorder_level}
                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, reorder_level: e.target.value })}
                                placeholder="e.g. 10"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">Triggers low stock alert</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Shelf Location
                            </label>
                            <input
                                type="text"
                                value={editMedicineForm.shelf_location}
                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, shelf_location: e.target.value })}
                                placeholder="e.g. Rack A-1"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Base Unit
                            </label>
                            <input
                                type="text"
                                value={editMedicineForm.base_unit}
                                disabled={Boolean(editingMedicine?.has_movements)}
                                onChange={(e) => setEditMedicineForm({ ...editMedicineForm, base_unit: e.target.value })}
                                placeholder="tablet, capsule, bottle..."
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                            />
                            {editingMedicine?.has_movements && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                                    Unit cannot be changed once stock movements exist.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="is_active_toggle"
                            checked={editMedicineForm.is_active}
                            onChange={(e) => setEditMedicineForm({ ...editMedicineForm, is_active: e.target.checked })}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            Medicine is Active (available for prescribing & dispensing)
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setEditMedicineModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editMedicineSubmitting}
                            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5"
                        >
                            {editMedicineSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* EDIT BATCH METADATA MODAL */}
            <GlassModal
                isOpen={editBatchModalOpen}
                onClose={() => setEditBatchModalOpen(false)}
                title={`Edit Batch #${editingBatch?.batch_number || ''}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleEditBatchSubmit} className="space-y-4">
                    {editBatchError && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                            {editBatchError}
                        </div>
                    )}

                    <p className="text-xs text-slate-500">
                        Updating batch metadata writes an audit trail entry. To adjust quantities, use the <strong>Adjust Qty</strong> button instead.
                    </p>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Batch Number *
                        </label>
                        <input
                            type="text"
                            required
                            value={editBatchForm.batch_number}
                            onChange={(e) => setEditBatchForm({ ...editBatchForm, batch_number: e.target.value })}
                            placeholder="e.g. B001"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Expiry Date * (DD/MM/YYYY)
                        </label>
                        <input
                            type="date"
                            required
                            value={editBatchForm.expiry_date}
                            onChange={(e) => setEditBatchForm({ ...editBatchForm, expiry_date: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        {editingBatch?.received_at && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                Must be after received date ({formatDateDMY(editingBatch.received_at)})
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Cost / Unit (Rs.) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={editBatchForm.cost_price}
                                onChange={(e) => setEditBatchForm({ ...editBatchForm, cost_price: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Supplier
                            </label>
                            <select
                                value={editBatchForm.supplier_id}
                                onChange={(e) => setEditBatchForm({ ...editBatchForm, supplier_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="">No supplier</option>
                                {suppliers.map((sup) => (
                                    <option key={sup.id} value={sup.id.toString()}>
                                        {sup.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setEditBatchModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editBatchSubmitting || !editBatchForm.batch_number.trim() || !editBatchForm.expiry_date}
                            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5"
                        >
                            {editBatchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Save Batch</span>
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* VOID BATCH MODAL */}
            <GlassModal
                isOpen={voidBatchModalOpen}
                onClose={() => setVoidBatchModalOpen(false)}
                title={`Void Batch #${voidingBatch?.batch_number || ''}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleVoidBatchSubmit} className="space-y-4">
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Reversal notice:</strong> Voiding this batch will reverse all its remaining{' '}
                        <strong>{voidingBatch?.quantity_remaining} units</strong> by recording an immutable void movement in the ledger. The batch will be marked voided.
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Mandatory Void Reason *
                        </label>
                        <textarea
                            value={voidBatchReason}
                            onChange={(e) => setVoidBatchReason(e.target.value)}
                            placeholder="e.g. Incorrect delivery received, wrong strength entered in batch..."
                            rows={3}
                            required
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        {voidBatchError && (
                            <p className="text-xs text-rose-600 mt-1 font-medium">{voidBatchError}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setVoidBatchModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={voidBatchSubmitting || !voidBatchReason.trim()}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5"
                        >
                            {voidBatchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Confirm Void Batch</span>
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* DELETE / INACTIVE MEDICINE MODAL */}
            <GlassModal
                isOpen={deleteMedicineModalOpen}
                onClose={() => setDeleteMedicineModalOpen(false)}
                title={deletingMedicine?.has_movements ? 'Deactivate Medicine' : 'Remove Medicine from Stock'}
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    {deletingMedicine?.has_movements ? (
                        <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                <strong>Stock history exists:</strong> <strong>{deletingMedicine.display_name}</strong> has stock ledger movements or batches on record and cannot be deleted.
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Would you like to mark this medicine as <strong>Inactive</strong> instead? It will be hidden from prescription dropdowns and active stock lists.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                                <strong>Warning:</strong> This medicine has no stock movements and will be completely removed from your clinic stock catalog.
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Are you sure you want to remove <strong>{deletingMedicine?.display_name}</strong> from stock?
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setDeleteMedicineModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDeleteOrInactive}
                            disabled={deleteMedicineSubmitting}
                            className={`px-5 py-2 rounded-xl text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5 ${
                                deletingMedicine?.has_movements
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                        >
                            {deleteMedicineSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>
                                {deletingMedicine?.has_movements ? 'Mark Inactive' : 'Remove from Stock'}
                            </span>
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleBarcodeScanned}
                isLocked={Boolean(unlinkedBarcode) || isLookupInProgress}
                title="Scan Medicine Barcode"
            />

            {/* Link Unknown Barcode Modal */}
            <LinkBarcodeModal
                isOpen={Boolean(unlinkedBarcode)}
                barcode={unlinkedBarcode || ''}
                onClose={() => setUnlinkedBarcode(null)}
                onSuccess={handleBarcodeLinked}
                submitLabel="Link Barcode"
            />
        </AuthenticatedLayout>
    );
}
