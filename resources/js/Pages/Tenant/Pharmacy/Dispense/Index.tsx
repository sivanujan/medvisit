import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import BarcodeScanner from '@/Components/Pharmacy/BarcodeScanner';
import ThermalLabelPrinter, { DispenseLabelItem } from './Components/ThermalLabelPrinter';
import BatchChangeModal, { BatchAllocationEntry, BatchItemOption } from './Components/BatchChangeModal';
import HoldReasonModal from './Components/HoldReasonModal';
import {
    Pill,
    Search,
    CheckCircle2,
    Clock,
    User,
    Phone,
    Stethoscope,
    History,
    AlertCircle,
    X,
    Boxes,
    ChevronRight,
    Barcode,
    Check,
    AlertTriangle,
    ShieldAlert,
    PauseCircle,
    Printer,
    ArrowLeft,
    Layers,
    Package,
    ArrowUpRight,
    Filter,
    Calendar,
    Sparkles,
    Lock,
    RefreshCw,
    Languages,
} from 'lucide-react';
import { formatLKR } from '@/Utils/formatters';

interface QueuePrescription {
    id: number;
    prescription_number: string;
    status: string;
    token_id?: number;
    token_number?: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_age?: number | null;
    patient_gender?: string | null;
    doctor_name: string;
    doctor_id?: number;
    finalized_at: string;
    finalized_at_raw?: string;
    finalized_date: string;
    minutes_waiting: number;
    items_count: number;
    clinic_items_count: number;
    outside_items_count: number;
    all_in_stock: boolean;
    out_of_stock_count: number;
    locked_by?: {
        user_id: number;
        user_name: string;
        locked_at: string;
        is_current_user?: boolean;
    } | null;
}

interface WorkspaceItem {
    id: number;
    display_name: string;
    generic_name?: string;
    brand_name?: string;
    dosage_form?: string;
    strength_text?: string;
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    source: string;
    dose: string;
    frequency: string;
    timing: string;
    duration_days: number;
    quantity: number;
    dispensed_quantity: number;
    needed_quantity: number;
    dispense_qty: number;
    total_in_stock: number;
    batches: BatchItemOption[];
    auto_allocated_batches: BatchAllocationEntry[];
    user_allocated_batches?: BatchAllocationEntry[];
    unit_price_cents: number;
    line_total_cents: number;
    status: 'ready' | 'partially_available' | 'out_of_stock' | 'outside';
    barcodes: string[];
    instruction_clinic_lang: string;
    instruction_en: string;
    instructions?: string;
    // Client state
    is_outside_override: boolean;
    is_verified: boolean;
    use_english_instruction: boolean;
    verification_error?: string | null;
}

interface WorkspacePrescription {
    id: number;
    prescription_number: string;
    status: string;
    token_number?: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_age?: number | null;
    patient_gender?: string | null;
    doctor_name: string;
    finalized_at: string;
    is_paid: boolean;
    payment_status: string;
    bill_total_formatted: string;
    bill_total_cents: number;
}

interface TodayStats {
    waiting: number;
    in_progress: number;
    dispensed: number;
    partially_dispensed: number;
    value_dispensed_cents: number;
}

interface InventoryAlerts {
    low_stock: Array<{
        id: number;
        display_name: string;
        total_quantity: number;
        reorder_level: number;
        unit: string;
    }>;
    expiring_soon: Array<{
        id: number;
        batch_number: string;
        medicine_name: string;
        expiry_date: string;
        quantity_remaining: number;
    }>;
}

interface ClinicSettings {
    print_language: 'en' | 'ta' | 'si';
    clinic_name: string;
    clinic_phone?: string;
    clinic_address?: string;
}

interface Props {
    prescriptions: {
        data: QueuePrescription[];
        links: any[];
        total: number;
    };
    filters: {
        search: string;
        status: string;
        doctor_id?: number | null;
    };
    todayStats: TodayStats;
    inventoryAlerts: InventoryAlerts;
    clinicSettings: ClinicSettings;
    doctors: Array<{ id: number; name: string }>;
    mode: string;
}

export default function DispenseIndex({
    prescriptions,
    filters,
    todayStats,
    inventoryAlerts,
    clinicSettings,
    doctors,
    mode,
}: Props) {
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(filters.doctor_id || null);

    // Selected prescription & workspace state
    const [selectedRxId, setSelectedRxId] = useState<number | null>(null);
    const [workspaceRx, setWorkspaceRx] = useState<WorkspacePrescription | null>(null);
    const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
    const [workspaceLock, setWorkspaceLock] = useState<{
        user_id: number;
        user_name: string;
        locked_at: string;
        is_current_user?: boolean;
    } | null>(null);
    const [isLockedByOther, setIsLockedByOther] = useState(false);
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);

    // UI state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerMode, setScannerMode] = useState<'global' | 'item_verify'>('global');
    const [verifyingItemId, setVerifyingItemId] = useState<number | null>(null);
    const [batchModalItem, setBatchModalItem] = useState<WorkspaceItem | null>(null);
    const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLabelsOpen, setIsLabelsOpen] = useState(false);
    const [labelsData, setLabelsData] = useState<{
        prescriptionNumber: string;
        patientName: string;
        patientPhone?: string;
        doctorName: string;
        dispenseDate: string;
        items: DispenseLabelItem[];
    } | null>(null);

    // Dispense Success state
    const [dispenseSuccessData, setDispenseSuccessData] = useState<{
        prescriptionNumber: string;
        patientName: string;
        status: string;
        itemCount: number;
        totalFormatted: string;
        printItems: DispenseLabelItem[];
        doctorName: string;
    } | null>(null);

    // Mobile / Tablet Drawer state
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
    const [isTabletDrawerOpen, setIsTabletDrawerOpen] = useState(false);

    // Live arrival highlight tracking
    const prevQueueIdsRef = useRef<Set<number>>(new Set());
    const [newArrivalIds, setNewArrivalIds] = useState<Set<number>>(new Set());

    // Sync search input to query params instantly (debounced)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            router.get(
                '/pharmacy/dispense',
                {
                    search: val,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    doctor_id: selectedDoctorId || undefined,
                },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
    };

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/pharmacy/dispense',
            {
                search: searchTerm || undefined,
                status: status !== 'all' ? status : undefined,
                doctor_id: selectedDoctorId || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleDoctorFilterChange = (docId: number | null) => {
        setSelectedDoctorId(docId);
        router.get(
            '/pharmacy/dispense',
            {
                search: searchTerm || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                doctor_id: docId || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // Live polling for queue updates every 14 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden && !isSubmitting) {
                router.reload({
                    only: ['prescriptions', 'todayStats'],
                });
            }
        }, 14000);
        return () => clearInterval(interval);
    }, [isSubmitting]);

    // Check for newly arrived prescriptions to apply gentle highlight
    useEffect(() => {
        const currentIds = new Set(prescriptions.data.map((p) => p.id));
        if (prevQueueIdsRef.current.size > 0) {
            const fresh = new Set<number>();
            currentIds.forEach((id) => {
                if (!prevQueueIdsRef.current.has(id)) {
                    fresh.add(id);
                }
            });
            if (fresh.size > 0) {
                setNewArrivalIds(fresh);
                setTimeout(() => setNewArrivalIds(new Set()), 6000);
            }
        }
        prevQueueIdsRef.current = currentIds;
    }, [prescriptions.data]);

    // Auto-select first prescription if desktop and none selected
    useEffect(() => {
        if (!selectedRxId && prescriptions.data.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
            loadPrescriptionWorkspace(prescriptions.data[0].id);
        }
    }, [prescriptions.data]);

    // Load prescription workspace details & acquire lock
    const loadPrescriptionWorkspace = async (rxId: number) => {
        setSelectedRxId(rxId);
        setIsLoadingWorkspace(true);
        setWorkspaceError(null);
        setDispenseSuccessData(null);
        setIsMobileDetailOpen(true);
        setIsTabletDrawerOpen(false);

        try {
            const res = await fetch(`/pharmacy/dispense/${rxId}`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to load prescription review.');
            const data = await res.json();

            setWorkspaceRx(data.prescription);
            setWorkspaceLock(data.locked_by);
            setIsLockedByOther(data.is_locked_by_other);

            const items: WorkspaceItem[] = (data.items || []).map((it: any) => ({
                ...it,
                dispense_qty: it.source === 'clinic' ? it.dispense_qty : 0,
                is_outside_override: it.source === 'outside',
                is_verified: false,
                use_english_instruction: false,
                user_allocated_batches: it.auto_allocated_batches || [],
            }));

            setWorkspaceItems(items);
        } catch (err: any) {
            setWorkspaceError(err.message || 'Error loading prescription review.');
        } finally {
            setIsLoadingWorkspace(false);
        }
    };

    // Keyboard navigation in queue: Up/Down arrow moves selection, Enter opens, Ctrl+Enter dispenses
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Dispense shortcut Ctrl+Enter
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (selectedRxId && !isSubmitting && !isLockedByOther) {
                    handleDispense(false);
                }
                return;
            }

            // If focus is in an input or textarea, don't hijack arrows
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (prescriptions.data.length === 0) return;
                e.preventDefault();
                const currentIndex = prescriptions.data.findIndex((p) => p.id === selectedRxId);
                let nextIndex = 0;
                if (e.key === 'ArrowDown') {
                    nextIndex = currentIndex < prescriptions.data.length - 1 ? currentIndex + 1 : 0;
                } else {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : prescriptions.data.length - 1;
                }
                loadPrescriptionWorkspace(prescriptions.data[nextIndex].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [prescriptions.data, selectedRxId, isSubmitting, isLockedByOther]);

    // Handle editable dispense quantity
    const updateDispenseQty = (idx: number, qty: number) => {
        setWorkspaceItems((prev) => {
            const next = [...prev];
            const maxAllowed = next[idx].total_in_stock;
            const safeQty = Math.max(0, Math.min(qty, maxAllowed));
            next[idx].dispense_qty = safeQty;
            next[idx].line_total_cents = safeQty * next[idx].unit_price_cents;
            return next;
        });
    };

    // Toggle outside purchase for out-of-stock or patient choice
    const toggleOutsideOverride = (idx: number) => {
        setWorkspaceItems((prev) => {
            const next = [...prev];
            const current = next[idx].is_outside_override;
            next[idx].is_outside_override = !current;
            if (!current) {
                // Switching to outside -> zero out dispense qty
                next[idx].dispense_qty = 0;
                next[idx].line_total_cents = 0;
            } else {
                // Switching back to clinic stock
                const safeQty = Math.min(next[idx].needed_quantity, next[idx].total_in_stock);
                next[idx].dispense_qty = safeQty;
                next[idx].line_total_cents = safeQty * next[idx].unit_price_cents;
            }
            return next;
        });
    };

    // Toggle English instruction line
    const toggleItemLanguage = (idx: number) => {
        setWorkspaceItems((prev) => {
            const next = [...prev];
            next[idx].use_english_instruction = !next[idx].use_english_instruction;
            return next;
        });
    };

    // Save customized batch allocations from modal
    const handleSaveBatchAllocation = (newAllocations: BatchAllocationEntry[]) => {
        if (!batchModalItem) return;
        setWorkspaceItems((prev) => {
            const next = [...prev];
            const idx = next.findIndex((it) => it.id === batchModalItem.id);
            if (idx !== -1) {
                next[idx].user_allocated_batches = newAllocations;
                const totalAlloc = newAllocations.reduce((sum, a) => sum + a.quantity, 0);
                next[idx].dispense_qty = totalAlloc;
                next[idx].line_total_cents = totalAlloc * next[idx].unit_price_cents;
            }
            return next;
        });
        setBatchModalItem(null);
    };

    // Handle Barcode Scan Verification
    const handleBarcodeDetected = (scannedCode: string) => {
        const cleanCode = scannedCode.trim();

        if (scannerMode === 'global') {
            // Check if scanned barcode matches an item in current workspace
            let matchedIdx = -1;
            for (let i = 0; i < workspaceItems.length; i++) {
                const item = workspaceItems[i];
                if (
                    item.barcodes.includes(cleanCode) ||
                    cleanCode === String(item.clinic_medicine_id) ||
                    item.batches.some((b) => b.batch_number.toLowerCase() === cleanCode.toLowerCase())
                ) {
                    matchedIdx = i;
                    break;
                }
            }

            if (matchedIdx !== -1) {
                setWorkspaceItems((prev) => {
                    const next = [...prev];
                    next[matchedIdx].is_verified = true;
                    next[matchedIdx].verification_error = null;
                    return next;
                });
                setIsScannerOpen(false);
            } else {
                // Check if scanned code matches a prescription number in the queue!
                const matchedRx = prescriptions.data.find(
                    (p) =>
                        p.prescription_number.toLowerCase() === cleanCode.toLowerCase() ||
                        String(p.token_number) === cleanCode
                );
                if (matchedRx) {
                    loadPrescriptionWorkspace(matchedRx.id);
                    setIsScannerOpen(false);
                }
            }
        } else if (scannerMode === 'item_verify' && verifyingItemId !== null) {
            const idx = workspaceItems.findIndex((it) => it.id === verifyingItemId);
            if (idx !== -1) {
                const item = workspaceItems[idx];
                const isMatch =
                    item.barcodes.includes(cleanCode) ||
                    cleanCode === String(item.clinic_medicine_id) ||
                    item.batches.some((b) => b.batch_number.toLowerCase() === cleanCode.toLowerCase());

                setWorkspaceItems((prev) => {
                    const next = [...prev];
                    if (isMatch) {
                        next[idx].is_verified = true;
                        next[idx].verification_error = null;
                    } else {
                        next[idx].is_verified = false;
                        next[idx].verification_error = `Barcode mismatch: scanned "${cleanCode}"`;
                    }
                    return next;
                });
            }
            setIsScannerOpen(false);
            setVerifyingItemId(null);
        }
    };

    // Calculate totals for workspace
    const summaryCalculations = useMemo(() => {
        let itemsToDispenseCount = 0;
        let totalCents = 0;
        let isAnyDispensed = false;
        let isAllFullyDispensed = true;

        workspaceItems.forEach((it) => {
            if (it.is_outside_override) {
                // Marked outside
                return;
            }
            if (it.dispense_qty > 0) {
                itemsToDispenseCount++;
                totalCents += it.line_total_cents;
                isAnyDispensed = true;
            }
            if (it.dispense_qty < it.needed_quantity) {
                isAllFullyDispensed = false;
            }
        });

        return {
            itemsToDispenseCount,
            totalCents,
            isAnyDispensed,
            isAllFullyDispensed,
        };
    }, [workspaceItems]);

    // Perform Dispense Action
    const handleDispense = (isPartialRequest = false) => {
        if (!selectedRxId || !workspaceRx || isSubmitting) return;

        setIsSubmitting(true);

        const itemsPayload = workspaceItems.map((it) => {
            const allocations = (it.user_allocated_batches || []).map((b) => ({
                batch_id: b.batch_id,
                quantity: b.quantity,
            }));

            return {
                prescription_item_id: it.id,
                quantity_to_dispense: it.is_outside_override ? 0 : it.dispense_qty,
                mark_outside: it.is_outside_override,
                batch_allocations: allocations.length > 0 ? allocations : undefined,
            };
        });

        router.post(
            `/pharmacy/dispense/${selectedRxId}/confirm`,
            {
                items: itemsPayload,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);

                    // Prepare label printing data
                    const printableItems: DispenseLabelItem[] = workspaceItems
                        .filter((it) => !it.is_outside_override && it.dispense_qty > 0)
                        .map((it) => {
                            const firstBatch = it.user_allocated_batches?.[0];
                            return {
                                id: it.id,
                                displayName: it.display_name,
                                dosageForm: it.dosage_form,
                                strengthText: it.strength_text,
                                quantity: it.dispense_qty,
                                instructionClinic: it.instruction_clinic_lang,
                                instructionEn: it.instruction_en,
                                useClinicLanguage: !it.use_english_instruction,
                                batchNumber: firstBatch?.batch_number,
                                expiryDate: firstBatch?.expiry_date,
                            };
                        });

                    setDispenseSuccessData({
                        prescriptionNumber: workspaceRx.prescription_number,
                        patientName: workspaceRx.patient_name,
                        status: isPartialRequest || !summaryCalculations.isAllFullyDispensed ? 'Partially Dispensed' : 'Dispensed',
                        itemCount: summaryCalculations.itemsToDispenseCount,
                        totalFormatted: formatLKR(summaryCalculations.totalCents / 100),
                        printItems: printableItems,
                        doctorName: workspaceRx.doctor_name,
                    });

                    // Auto-load next pending prescription if available
                    const remainingQueue = prescriptions.data.filter((p) => p.id !== selectedRxId);
                    if (remainingQueue.length > 0) {
                        setTimeout(() => {
                            loadPrescriptionWorkspace(remainingQueue[0].id);
                        }, 1200);
                    } else {
                        setSelectedRxId(null);
                        setWorkspaceRx(null);
                        setWorkspaceItems([]);
                    }
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    setWorkspaceError(Object.values(errs)[0] as string || 'Failed to complete dispensing.');
                },
            }
        );
    };

    // Put prescription on hold
    const handleHoldSubmit = (reason: string) => {
        if (!selectedRxId) return;
        setIsSubmitting(true);
        router.post(
            `/pharmacy/dispense/${selectedRxId}/hold`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    setIsHoldModalOpen(false);
                    const remaining = prescriptions.data.filter((p) => p.id !== selectedRxId);
                    if (remaining.length > 0) {
                        loadPrescriptionWorkspace(remaining[0].id);
                    } else {
                        setSelectedRxId(null);
                        setWorkspaceRx(null);
                        setWorkspaceItems([]);
                    }
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    // Trigger Print Labels modal
    const openPrintLabels = () => {
        if (!workspaceRx) return;
        const printableItems: DispenseLabelItem[] = workspaceItems
            .filter((it) => !it.is_outside_override && it.dispense_qty > 0)
            .map((it) => {
                const firstBatch = it.user_allocated_batches?.[0];
                return {
                    id: it.id,
                    displayName: it.display_name,
                    dosageForm: it.dosage_form,
                    strengthText: it.strength_text,
                    quantity: it.dispense_qty,
                    instructionClinic: it.instruction_clinic_lang,
                    instructionEn: it.instruction_en,
                    useClinicLanguage: !it.use_english_instruction,
                    batchNumber: firstBatch?.batch_number,
                    expiryDate: firstBatch?.expiry_date,
                };
            });

        setLabelsData({
            prescriptionNumber: workspaceRx.prescription_number,
            patientName: workspaceRx.patient_name,
            patientPhone: workspaceRx.patient_phone,
            doctorName: workspaceRx.doctor_name,
            dispenseDate: new Date().toLocaleDateString('en-GB'),
            items: printableItems,
        });
        setIsLabelsOpen(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dispense Counter · Pharmacy" />

            <div className="space-y-5 min-w-0 pb-10">
                {/* 1. Page Header */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Pharmacy', href: '/pharmacy/medicines' },
                        { label: 'Dispense counter' },
                    ]}
                    title="Dispense counter"
                    subtitle="Prepare and hand over today's prescriptions."
                    actions={
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setScannerMode('global');
                                    setIsScannerOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all active:scale-95"
                                title="Scan barcode with camera (2s cooldown)"
                            >
                                <Barcode className="w-4 h-4 text-primary" />
                                <span>Scan barcode</span>
                            </button>

                            <Link
                                href="/pharmacy/dispense/history"
                                className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all"
                            >
                                <History className="w-4 h-4 text-secondary" />
                                <span className="hidden sm:inline">Dispense history</span>
                                <span className="sm:hidden">History</span>
                            </Link>
                        </div>
                    }
                />

                {/* 2. Stats Strip (Today) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Waiting</span>
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            {todayStats.waiting}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">In progress</span>
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            {todayStats.in_progress}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Dispensed</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            {todayStats.dispensed}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Partially dispensed</span>
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            {todayStats.partially_dispensed}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Value dispensed</span>
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        </div>
                        <div className="text-lg font-black text-primary mt-1 truncate">
                            {formatLKR(todayStats.value_dispensed_cents / 100)}
                        </div>
                    </div>
                </div>

                {/* 3. Main Two-Pane View (or Empty State) */}
                {prescriptions.data.length === 0 && !searchTerm && statusFilter === 'all' ? (
                    /* EMPTY STATE */
                    <GlassCard className="py-12 px-6 sm:px-10 text-center max-w-4xl mx-auto space-y-8">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="max-w-md mx-auto space-y-2">
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                No prescriptions waiting
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Doctors finalise prescriptions in the consultation screen; they appear here instantly.
                            </p>
                        </div>

                        {/* Quick links */}
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            <Link
                                href="/pharmacy/dispense/history"
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
                            >
                                <History className="w-3.5 h-3.5 text-primary" />
                                <span>Dispense history</span>
                            </Link>

                            <Link
                                href="/pharmacy/medicines"
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
                            >
                                <Package className="w-3.5 h-3.5 text-secondary" />
                                <span>Medicines & stock</span>
                            </Link>

                            <Link
                                href="/pharmacy/receipts/create"
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
                            >
                                <Boxes className="w-3.5 h-3.5 text-accent" />
                                <span>Receive stock (GRN)</span>
                            </Link>
                        </div>

                        {/* Mini Alert Cards (Low Stock & Expiring in 30 days) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-6 border-t border-slate-100 dark:border-white/5">
                            {/* Low Stock List */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <span>Low stock medicines</span>
                                    </h3>
                                    <Link href="/pharmacy/medicines" className="text-[11px] text-primary hover:underline flex items-center">
                                        <span>Manage</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                                {inventoryAlerts.low_stock.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">All active medicines are sufficiently stocked.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {inventoryAlerts.low_stock.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 dark:border-white/5 last:border-none">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                                    {m.display_name}
                                                </span>
                                                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                                    {m.total_quantity} left (reorder at {m.reorder_level})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Expiring Soon List */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-rose-500" />
                                        <span>Expiring in 30 days</span>
                                    </h3>
                                    <Link href="/pharmacy/receipts" className="text-[11px] text-primary hover:underline flex items-center">
                                        <span>View batches</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                                {inventoryAlerts.expiring_soon.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No batches expiring in the next 30 days.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {inventoryAlerts.expiring_soon.map((b) => (
                                            <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 dark:border-white/5 last:border-none">
                                                <div className="min-w-0 pr-2">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                                        {b.medicine_name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Batch: {b.batch_number}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                                    Exp: {b.expiry_date}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                ) : (
                    /* TWO-PANE LAYOUT */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0 items-start">
                        {/* LEFT COLUMN (~36%): Prescription Queue */}
                        <div className={`lg:col-span-4 xl:col-span-4 space-y-3 min-w-0 ${isMobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
                            {/* Queue Search & Filter Bar */}
                            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2.5">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        placeholder="Search patient, phone, Rx, token..."
                                        className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => handleSearchChange('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Filter Chips */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('all')}
                                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                            statusFilter === 'all'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        All ({prescriptions.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('waiting')}
                                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                            statusFilter === 'waiting'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        Waiting
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('partial')}
                                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                            statusFilter === 'partial'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        Partial
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFilterChange('today')}
                                        className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                            statusFilter === 'today'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        Today
                                    </button>

                                    {/* Doctor Filter Dropdown */}
                                    {doctors.length > 0 && (
                                        <select
                                            value={selectedDoctorId || ''}
                                            onChange={(e) => handleDoctorFilterChange(e.target.value ? Number(e.target.value) : null)}
                                            className="px-2 py-1 rounded-lg font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="">All Doctors</option>
                                            {doctors.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Queue Cards List */}
                            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
                                {prescriptions.data.length === 0 ? (
                                    <div className="p-8 text-center bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400">
                                        No prescriptions match current filters.
                                    </div>
                                ) : (
                                    prescriptions.data.map((rx) => {
                                        const isSelected = rx.id === selectedRxId;
                                        const isFreshArrival = newArrivalIds.has(rx.id);
                                        const isOverdue = rx.minutes_waiting >= 15;

                                        return (
                                            <div
                                                key={rx.id}
                                                onClick={() => loadPrescriptionWorkspace(rx.id)}
                                                tabIndex={0}
                                                role="button"
                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative outline-none focus:ring-2 focus:ring-primary/40 ${
                                                    isSelected
                                                        ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-sm'
                                                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                                } ${isFreshArrival ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                                            >
                                                {/* Card Top: Token Chip + Patient Name + Status */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {rx.token_number ? (
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
                                                                #{rx.token_number}
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                                                <Pill className="w-4 h-4" />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0">
                                                            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                {rx.patient_name}
                                                            </h3>
                                                            <p className="text-[11px] text-slate-500 truncate">
                                                                {rx.patient_age ? `${rx.patient_age} yrs` : ''}
                                                                {rx.patient_gender ? ` · ${rx.patient_gender}` : ''}
                                                                {` · ${rx.patient_phone}`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                            rx.status === 'partially_dispensed'
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                        }`}
                                                    >
                                                        {rx.status === 'partially_dispensed' ? 'Partial' : 'Waiting'}
                                                    </span>
                                                </div>

                                                {/* Card Middle: Doctor + Time finalized */}
                                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
                                                    <span className="truncate max-w-[160px]">
                                                        {rx.doctor_name}
                                                    </span>

                                                    <span
                                                        className={`flex items-center gap-1 font-medium ${
                                                            isOverdue
                                                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                                                : 'text-slate-400'
                                                        }`}
                                                        title={`Finalized at ${rx.finalized_at}`}
                                                    >
                                                        <Clock className="w-3 h-3" />
                                                        <span>{rx.minutes_waiting} min ago</span>
                                                    </span>
                                                </div>

                                                {/* Card Bottom: Stock Status + Items count */}
                                                <div className="flex items-center justify-between pt-2 text-[11px]">
                                                    <span className="text-slate-500 font-medium">
                                                        {rx.clinic_items_count} clinic items
                                                    </span>

                                                    {rx.all_in_stock ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                                                            <Check className="w-3 h-3" />
                                                            All in stock
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {rx.out_of_stock_count} item{rx.out_of_stock_count === 1 ? '' : 's'} short
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Concurrency lock indicator */}
                                                {rx.locked_by && !rx.locked_by.is_current_user && (
                                                    <div className="mt-2 pt-1.5 border-t border-amber-200/50 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-semibold">
                                                        <Lock className="w-3 h-3" />
                                                        <span>Being prepared by {rx.locked_by.user_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN (~64%): Workspace for selected prescription */}
                        <div
                            className={`lg:col-span-8 xl:col-span-8 min-w-0 ${
                                isMobileDetailOpen ? 'block' : 'hidden lg:block'
                            }`}
                        >
                            {/* Mobile Back Button (on mobile when viewing detail) */}
                            <div className="lg:hidden mb-3">
                                <button
                                    type="button"
                                    onClick={() => setIsMobileDetailOpen(false)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to queue</span>
                                </button>
                            </div>

                            {/* Workspace Card */}
                            {isLoadingWorkspace ? (
                                <GlassCard className="py-24 text-center">
                                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-xs text-slate-500 font-medium">
                                        Allocating FEFO batches and verifying inventory...
                                    </p>
                                </GlassCard>
                            ) : workspaceRx ? (
                                <div className="space-y-4">
                                    {/* Success notification banner after dispensing */}
                                    {dispenseSuccessData && (
                                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold">
                                                        Prescription {dispenseSuccessData.prescriptionNumber} {dispenseSuccessData.status}
                                                    </h4>
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                                        {dispenseSuccessData.itemCount} item(s) dispensed for {dispenseSuccessData.patientName} · {dispenseSuccessData.totalFormatted}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!workspaceRx) return;
                                                        setLabelsData({
                                                            prescriptionNumber: dispenseSuccessData.prescriptionNumber,
                                                            patientName: dispenseSuccessData.patientName,
                                                            doctorName: dispenseSuccessData.doctorName,
                                                            dispenseDate: new Date().toLocaleDateString('en-GB'),
                                                            items: dispenseSuccessData.printItems,
                                                        });
                                                        setIsLabelsOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span>Print labels</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDispenseSuccessData(null)}
                                                    className="p-1.5 text-emerald-700 hover:text-emerald-900"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Concurrency Lock Banner (if another pharmacist locked it) */}
                                    {isLockedByOther && workspaceLock && (
                                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                                            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>
                                                <strong>Being prepared by {workspaceLock.user_name}</strong> (Locked at{' '}
                                                {workspaceLock.locked_at ? new Date(workspaceLock.locked_at).toLocaleTimeString() : ''}).
                                                Actions are disabled to prevent duplicate dispensing.
                                            </span>
                                        </div>
                                    )}

                                    {workspaceError && (
                                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>{workspaceError}</span>
                                        </div>
                                    )}

                                    {/* Workspace Header Card */}
                                    <GlassCard className="p-4 sm:p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-3">
                                                {workspaceRx.token_number ? (
                                                    <div className="w-11 h-11 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                                                        #{workspaceRx.token_number}
                                                    </div>
                                                ) : (
                                                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                                                        <Pill className="w-5 h-5" />
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                                                            {workspaceRx.patient_name}
                                                        </h2>
                                                        <span className="text-xs text-slate-400 font-mono">
                                                            #P-{workspaceRx.patient_id}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        {workspaceRx.patient_phone}
                                                        {workspaceRx.patient_age ? ` · ${workspaceRx.patient_age} yrs` : ''}
                                                        {workspaceRx.patient_gender ? ` · ${workspaceRx.patient_gender}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-right">
                                                <div>
                                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block">
                                                        {workspaceRx.prescription_number}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 block">
                                                        Dr. {workspaceRx.doctor_name}
                                                    </span>
                                                </div>

                                                <span
                                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                                                        workspaceRx.is_paid
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    }`}
                                                >
                                                    {workspaceRx.payment_status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Prescribed Items List */}
                                        <div className="space-y-3.5">
                                            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
                                                <span>Prescribed medicines ({workspaceItems.length})</span>
                                                <span className="text-[11px]">Instructions shown in {clinicSettings.print_language.toUpperCase()} (EN toggle available)</span>
                                            </div>

                                            {workspaceItems.map((item, idx) => {
                                                const isOutOfStock = item.status === 'out_of_stock';
                                                const activeBatch = item.user_allocated_batches?.[0];

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                                            item.is_outside_override
                                                                ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 opacity-70'
                                                                : item.is_verified
                                                                ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                                                                : 'border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60'
                                                        }`}
                                                    >
                                                        {/* Item Title & Dosage Instruction */}
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                                        {idx + 1}. {item.display_name}
                                                                    </span>
                                                                    {item.dosage_form && (
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                                                            {item.dosage_form}
                                                                        </span>
                                                                    )}

                                                                    {/* Verification Checkmark */}
                                                                    {item.is_verified && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            Verified
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Doctor's Instruction with language toggle */}
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs text-primary-700 dark:text-primary-300 font-semibold bg-primary/5 dark:bg-primary/10 px-2.5 py-1 rounded-lg">
                                                                        {item.use_english_instruction
                                                                            ? item.instruction_en
                                                                            : item.instruction_clinic_lang}
                                                                    </p>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleItemLanguage(idx)}
                                                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
                                                                        title="Toggle instruction between clinic language and English"
                                                                    >
                                                                        {item.use_english_instruction ? 'Clinic' : 'EN'}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Item Status Badge */}
                                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                                {item.is_outside_override ? (
                                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                                        Buy outside
                                                                    </span>
                                                                ) : item.status === 'ready' ? (
                                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                        Ready ({item.total_in_stock} in stock)
                                                                    </span>
                                                                ) : item.status === 'partially_available' ? (
                                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                                        Partly available ({item.total_in_stock} in stock)
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                                        Out of stock (0 in stock)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* FEFO Batches & Allocation Controls */}
                                                        {!item.is_outside_override ? (
                                                            <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    {/* FEFO Allocated Batch Chips */}
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[11px] font-bold text-slate-400 mr-1">
                                                                            FEFO Batch:
                                                                        </span>
                                                                        {item.user_allocated_batches && item.user_allocated_batches.length > 0 ? (
                                                                            item.user_allocated_batches.map((alloc) => (
                                                                                <span
                                                                                    key={alloc.batch_id}
                                                                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium flex items-center gap-1 border ${
                                                                                        alloc.is_near_expiry
                                                                                            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                                                    }`}
                                                                                >
                                                                                    <span>{alloc.batch_number}</span>
                                                                                    <span className="opacity-70">({alloc.quantity}u)</span>
                                                                                    <span className="text-[10px] opacity-70">Exp: {alloc.expiry_date}</span>
                                                                                    {alloc.is_near_expiry && (
                                                                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                                    )}
                                                                                </span>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-xs text-rose-500 font-medium">
                                                                                No batch allocated (stock short)
                                                                            </span>
                                                                        )}

                                                                        {item.batches.length > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setBatchModalItem(item)}
                                                                                className="px-2 py-0.5 rounded text-[11px] font-bold text-primary hover:underline ml-1"
                                                                            >
                                                                                Change batch
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Pricing & Line Total */}
                                                                    <div className="text-right">
                                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                                                            {formatLKR(item.line_total_cents / 100)}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400">
                                                                            {formatLKR(item.unit_price_cents / 100)} / unit
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Dispense Quantity & Barcode Verification Actions */}
                                                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                                                                Qty to Dispense
                                                                            </label>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    max={item.total_in_stock}
                                                                                    value={item.dispense_qty}
                                                                                    onChange={(e) =>
                                                                                        updateDispenseQty(idx, parseInt(e.target.value) || 0)
                                                                                    }
                                                                                    className="w-24 text-xs font-black p-1.5 rounded-xl border border-primary/40 text-primary bg-white dark:bg-slate-900 text-center"
                                                                                />
                                                                                <span className="text-[11px] text-slate-400">
                                                                                    / {item.needed_quantity} prescribed
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Scan to Verify Button */}
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                                                                Safety check
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setVerifyingItemId(item.id);
                                                                                    setScannerMode('item_verify');
                                                                                    setIsScannerOpen(true);
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                                                                                    item.is_verified
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                                                                }`}
                                                                            >
                                                                                <Barcode className="w-3.5 h-3.5" />
                                                                                <span>{item.is_verified ? 'Verified' : 'Scan to verify'}</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Buy outside checkbox toggle */}
                                                                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.is_outside_override}
                                                                            onChange={() => toggleOutsideOverride(idx)}
                                                                            className="rounded text-primary focus:ring-primary/20"
                                                                        />
                                                                        <span>Not dispensed — patient to buy outside</span>
                                                                    </label>
                                                                </div>

                                                                {item.verification_error && (
                                                                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                        <span>{item.verification_error}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            /* Outside medicine explanation */
                                                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5">
                                                                <span className="italic">
                                                                    Marked for patient to purchase at outside pharmacy. No clinic stock or bill lines will be modified.
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleOutsideOverride(idx)}
                                                                    className="text-primary font-bold hover:underline"
                                                                >
                                                                    Dispense from clinic stock instead
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Dispense Workspace Summary & Actions */}
                                        <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-200/70 dark:border-white/5">
                                                <div>
                                                    <span className="text-xs text-slate-500 block">
                                                        Total items to dispense: <strong>{summaryCalculations.itemsToDispenseCount}</strong> of {workspaceItems.length}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {workspaceRx.is_paid
                                                            ? 'Visit bill already marked paid.'
                                                            : 'Dispense adds medicine line items to visit bill automatically.'}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                                                        Dispense Total
                                                    </span>
                                                    <span className="text-xl font-black text-slate-900 dark:text-white">
                                                        {formatLKR(summaryCalculations.totalCents / 100)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsHoldModalOpen(true)}
                                                    disabled={isSubmitting || isLockedByOther}
                                                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                                >
                                                    <PauseCircle className="w-4 h-4" />
                                                    <span>Put on hold</span>
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    {!summaryCalculations.isAllFullyDispensed && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDispense(true)}
                                                            disabled={isSubmitting || isLockedByOther || !summaryCalculations.isAnyDispensed}
                                                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                                        >
                                                            Save as partial
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDispense(false)}
                                                        disabled={isSubmitting || isLockedByOther || !summaryCalculations.isAnyDispensed}
                                                        className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/25 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                                                        title="Dispense prescription and prepare thermal sticker labels (Ctrl + Enter)"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                        <span>{isSubmitting ? 'Dispensing...' : 'Dispense & print labels'}</span>
                                                        <kbd className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/20">
                                                            Ctrl+↵
                                                        </kbd>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>
                            ) : (
                                <GlassCard className="py-20 text-center text-xs text-slate-400">
                                    Select a prescription from the queue on the left to begin review & dispensing.
                                </GlassCard>
                            )}
                        </div>
                    </div>
                )}

                {/* MODALS */}
                {/* 1. Barcode Scanner Camera Modal */}
                <BarcodeScanner
                    isOpen={isScannerOpen}
                    onClose={() => {
                        setIsScannerOpen(false);
                        setVerifyingItemId(null);
                    }}
                    onDetected={handleBarcodeDetected}
                    title={
                        scannerMode === 'item_verify'
                            ? 'Scan Medicine Barcode to Verify'
                            : 'Scan Barcode (Medicine, Token, or Rx)'
                    }
                />

                {/* 2. Manual Batch Allocation Adjustment Modal */}
                {batchModalItem && (
                    <BatchChangeModal
                        isOpen={Boolean(batchModalItem)}
                        onClose={() => setBatchModalItem(null)}
                        medicineName={batchModalItem.display_name}
                        prescribedQuantity={batchModalItem.needed_quantity}
                        availableBatches={batchModalItem.batches}
                        currentAllocations={batchModalItem.user_allocated_batches || []}
                        onSave={handleSaveBatchAllocation}
                    />
                )}

                {/* 3. Hold Reason Modal */}
                {isHoldModalOpen && workspaceRx && (
                    <HoldReasonModal
                        isOpen={isHoldModalOpen}
                        onClose={() => setIsHoldModalOpen(false)}
                        prescriptionNumber={workspaceRx.prescription_number}
                        patientName={workspaceRx.patient_name}
                        onSubmit={handleHoldSubmit}
                        isSubmitting={isSubmitting}
                    />
                )}

                {/* 4. Thermal Sticker Label Printer Preview */}
                {labelsData && (
                    <ThermalLabelPrinter
                        isOpen={isLabelsOpen}
                        onClose={() => setIsLabelsOpen(false)}
                        prescriptionNumber={labelsData.prescriptionNumber}
                        patientName={labelsData.patientName}
                        patientPhone={labelsData.patientPhone}
                        doctorName={labelsData.doctorName}
                        clinicName={clinicSettings.clinic_name}
                        clinicPhone={clinicSettings.clinic_phone}
                        dispenseDate={labelsData.dispenseDate}
                        items={labelsData.items}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
