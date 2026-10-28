import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import { formatLKR, formatDateLK, formatDateTimeLK, pluralize } from '@/Utils/formatters';
import { usePermission } from '@/Hooks/usePermission';
import {
    Boxes,
    Plus,
    Search,
    Receipt,
    Calendar,
    Building2,
    FileText,
    AlertTriangle,
    CheckCircle2,
    X,
    XCircle,
    Ban,
    Loader2,
    ChevronRight,
    ArrowLeft,
    ShieldAlert,
    Download,
    Eye,
    Printer,
    MoreVertical,
    Phone,
    User,
    Clock,
    RefreshCw,
    Filter,
    Check,
    Barcode,
    Layers,
    DollarSign,
    CornerDownRight,
    TrendingDown,
    ExternalLink,
} from 'lucide-react';

interface StockReceiptItem {
    id: number;
    receipt_number: string;
    status: 'received' | 'voided' | 'partly_consumed';
    raw_status: string;
    received_date: string | null;
    supplier_name: string | null;
    supplier_phone: string | null;
    supplier_id: number | null;
    invoice_number: string | null;
    notes: string | null;
    total_cost_cents: number;
    lines_count: number;
    total_units_received: number;
    preview_medicines: string[];
    created_by_name: string;
    created_by_avatar: string | null;
    created_at: string | null;
    voided_at: string | null;
    voided_by_name: string | null;
    void_reason: string | null;
}

interface Stats {
    grns_count: number;
    total_cost_cents: number;
    units_received: number;
    suppliers_count: number;
    voided_count: number;
}

interface TabCounts {
    all: number;
    received: number;
    voided: number;
}

interface SupplierOption {
    id: number;
    name: string;
    phone?: string | null;
}

interface CreatorOption {
    id: number;
    name: string;
}

interface Props {
    receipts: {
        data: StockReceiptItem[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    stats: Stats;
    tabCounts: TabCounts;
    suppliers: SupplierOption[];
    creators: CreatorOption[];
    filters: {
        search: string;
        status: string;
        date_from: string;
        date_to: string;
        supplier_id: string | number;
        created_by: string | number;
    };
}

interface BatchDetail {
    id: number;
    medicine_name: string;
    batch_number: string;
    expiry_date: string | null;
    quantity_received: number;
    quantity_remaining: number;
    quantity_consumed: number;
    cost_price_cents: number;
    line_total_cents: number;
    selling_price_cents: number;
    is_voided: boolean;
    voided_at: string | null;
    voided_by_name: string | null;
    void_reason: string | null;
    has_dispense: boolean;
}

interface ReceiptDetailPayload {
    receipt: {
        id: number;
        receipt_number: string;
        status: string;
        received_date: string | null;
        supplier_name: string | null;
        supplier_phone: string | null;
        supplier_id: number | null;
        invoice_number: string | null;
        notes: string | null;
        total_cost_cents: number;
        created_by_name: string;
        created_by_avatar: string | null;
        created_at: string | null;
        is_voided: boolean;
        voided_at: string | null;
        voided_by_name: string | null;
        void_reason: string | null;
        can_void: boolean;
        has_dispense: boolean;
        total_consumed_units: number;
        void_block_reason: string | null;
    };
    batches: BatchDetail[];
}

export default function StockReceiptsIndex({
    receipts,
    stats,
    tabCounts,
    suppliers = [],
    creators = [],
    filters,
}: Props) {
    const { can } = usePermission();
    const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [receiptDetails, setReceiptDetails] = useState<ReceiptDetailPayload | null>(null);

    // Active row index for keyboard navigation
    const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

    // Void Modal
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voidSubmitting, setVoidSubmitting] = useState(false);
    const [voidError, setVoidError] = useState<string | null>(null);

    // Print GRN Modal & Print Barcodes Modal
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);

    // Row Actions Dropdown state
    const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null);

    // Date Presets state
    const [datePreset, setDatePreset] = useState<string>('all');

    // Search input state
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const { flash, auth } = usePage<any>().props;

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

    // Close action dropdown on outside click
    useEffect(() => {
        const handleClickOutside = () => setActionMenuOpenId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Synchronize search term if props change
    useEffect(() => {
        setSearchTerm(filters.search || '');
    }, [filters.search]);

    // Handle instant filter change
    const updateFilters = (newParams: Partial<typeof filters>) => {
        const query: Record<string, any> = {
            ...filters,
            ...newParams,
            page: 1, // Reset page on filter change
        };

        // Prune empty keys
        Object.keys(query).forEach((key) => {
            if (query[key] === '' || query[key] === null || query[key] === undefined) {
                delete query[key];
            }
        });

        router.get(route('tenant.pharmacy.receipts'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Date preset handler
    const handleDatePresetChange = (preset: string) => {
        setDatePreset(preset);
        const today = new Date();
        const formatDateStr = (d: Date) => d.toISOString().slice(0, 10);

        if (preset === 'all') {
            updateFilters({ date_from: '', date_to: '' });
        } else if (preset === 'today') {
            const str = formatDateStr(today);
            updateFilters({ date_from: str, date_to: str });
        } else if (preset === '7days') {
            const past = new Date();
            past.setDate(past.getDate() - 7);
            updateFilters({ date_from: formatDateStr(past), date_to: formatDateStr(today) });
        } else if (preset === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            updateFilters({ date_from: formatDateStr(firstDay), date_to: formatDateStr(today) });
        } else if (preset === '30days') {
            const past = new Date();
            past.setDate(past.getDate() - 30);
            updateFilters({ date_from: formatDateStr(past), date_to: formatDateStr(today) });
        }
    };

    // Open receipt details drawer
    const openReceiptDrawer = async (id: number) => {
        setSelectedReceiptId(id);
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
            const res = await fetch(route('tenant.pharmacy.receipts.show', { receipt: id }));
            if (!res.ok) throw new Error('Failed to load stock receipt');
            const data: ReceiptDetailPayload = await res.json();
            setReceiptDetails(data);
        } catch (err: any) {
            setToast({ type: 'error', message: err.message || 'Could not load details' });
        } finally {
            setDrawerLoading(false);
        }
    };

    // Keyboard navigation (Arrow keys, Enter, Escape)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (drawerOpen) {
                if (e.key === 'Escape') {
                    if (voidModalOpen) {
                        setVoidModalOpen(false);
                    } else if (printModalOpen) {
                        setPrintModalOpen(false);
                    } else if (barcodeModalOpen) {
                        setBarcodeModalOpen(false);
                    } else {
                        setDrawerOpen(false);
                    }
                }
                return;
            }

            if (voidModalOpen || printModalOpen || barcodeModalOpen) {
                if (e.key === 'Escape') {
                    setVoidModalOpen(false);
                    setPrintModalOpen(false);
                    setBarcodeModalOpen(false);
                }
                return;
            }

            // List table keyboard navigation
            if (receipts.data.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedRowIndex((prev) => Math.min(prev + 1, receipts.data.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < receipts.data.length) {
                e.preventDefault();
                openReceiptDrawer(receipts.data[focusedRowIndex].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen, voidModalOpen, printModalOpen, barcodeModalOpen, focusedRowIndex, receipts.data]);

    // Handle receipt void submit
    const handleVoidSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReceiptId || !voidReason.trim()) {
            setVoidError('A reason for voiding this GRN is strictly required.');
            return;
        }

        setVoidSubmitting(true);
        setVoidError(null);

        router.post(
            route('tenant.pharmacy.receipts.void', { receipt: selectedReceiptId }),
            { reason: voidReason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVoidModalOpen(false);
                    setDrawerOpen(false);
                    setVoidReason('');
                    setReceiptDetails(null);
                    setVoidSubmitting(false);
                },
                onError: (errors) => {
                    setVoidError(errors.reason || 'Could not void receipt.');
                    setVoidSubmitting(false);
                },
            }
        );
    };

    // Group receipts by Month for display
    const monthGroups = useMemo(() => {
        const groups: Record<string, StockReceiptItem[]> = {};
        receipts.data.forEach((r) => {
            let key = 'Earlier';
            if (r.received_date) {
                try {
                    const [y, m] = r.received_date.split('-');
                    const date = new Date(Number(y), Number(m) - 1, 1);
                    key = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
                } catch {
                    key = 'Other';
                }
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return groups;
    }, [receipts.data]);

    // Page totals for bottom footer
    const pageTotalCost = useMemo(() => {
        return receipts.data.reduce((acc, r) => acc + r.total_cost_cents, 0);
    }, [receipts.data]);

    const pageTotalUnits = useMemo(() => {
        return receipts.data.reduce((acc, r) => acc + r.total_units_received, 0);
    }, [receipts.data]);

    // Check if any filter is active
    const hasActiveFilters = Boolean(
        filters.search ||
        (filters.status && filters.status !== 'all') ||
        filters.date_from ||
        filters.date_to ||
        filters.supplier_id ||
        filters.created_by
    );

    // Export CSV URL
    const exportCsvUrl = route('tenant.pharmacy.receipts.export', {
        search: filters.search || undefined,
        status: filters.status || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        supplier_id: filters.supplier_id || undefined,
        created_by: filters.created_by || undefined,
    });

    return (
        <AuthenticatedLayout>
            <Head title="Stock receipts (GRNs) · MedVisit Pharmacy" />

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold transition-all animate-in slide-in-from-bottom-3 ${
                        toast.type === 'success'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                            : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                    )}
                    <span>{toast.message}</span>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors ml-2"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="space-y-6 pb-12 w-full min-w-0">
                {/* Header: Title, Subtitle, Navigation, Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                Pharmacy inventory
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Goods received notes</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Stock receipts
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Every delivery recorded into your pharmacy stock.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Back to stock */}
                        <Link
                            href={route('tenant.pharmacy.medicines')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-400" />
                            <span>Back to stock</span>
                        </Link>

                        {/* Export CSV (with permission check) */}
                        <a
                            href={exportCsvUrl}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs transition-colors"
                            title="Export filtered stock receipts as CSV"
                        >
                            <Download className="w-4 h-4 text-slate-400" />
                            <span>Export CSV</span>
                        </a>

                        {/* Primary Receive Stock Button */}
                        {can('pharmacy.receive_stock') && (
                            <Link
                                href={route('tenant.pharmacy.receipts.create')}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 transition-all transform active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Receive stock</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Stats Strip (filtered range) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {/* GRNs count */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-xs font-medium">Receipts</span>
                            <Receipt className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {stats.grns_count.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Recorded GRNs</div>
                    </div>

                    {/* Units received */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-xs font-medium">Units received</span>
                            <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {stats.units_received.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Total pack units</div>
                    </div>

                    {/* Total cost */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-xs font-medium">Total cost</span>
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums truncate">
                            {formatLKR(stats.total_cost_cents)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Purchased inventory value</div>
                    </div>

                    {/* Suppliers count */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-xs font-medium">Suppliers</span>
                            <Building2 className="w-4 h-4 text-accent" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {stats.suppliers_count}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Delivering vendors</div>
                    </div>

                    {/* Voided count */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                            <span className="text-xs font-medium">Voided</span>
                            <Ban className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {stats.voided_count}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Reversed deliveries</div>
                    </div>
                </div>

                {/* Status Tabs and Filter Controls Card */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3.5">
                    {/* Top Row: Status Tabs + Instant Search */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Status Tabs with live counts */}
                        <div className="inline-flex p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 shrink-0 self-start">
                            {[
                                { id: 'all', label: 'All receipts', count: tabCounts.all },
                                { id: 'received', label: 'Received', count: tabCounts.received },
                                { id: 'voided', label: 'Voided', count: tabCounts.voided },
                            ].map((tab) => {
                                const active = (filters.status || 'all') === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => updateFilters({ status: tab.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            active
                                                ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                active
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input with Instant or Enter submission */}
                        <div className="relative w-full lg:w-96">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateFilters({ search: searchTerm });
                                    }
                                }}
                                placeholder="Search GRN #, invoice, supplier, medicine, batch #…"
                                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        updateFilters({ search: '' });
                                    }}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row Filters: Date range presets, Supplier select, Created by, Reset */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Filters:</span>
                        </div>

                        {/* Date Presets Select */}
                        <select
                            value={datePreset}
                            onChange={(e) => handleDatePresetChange(e.target.value)}
                            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                            <option value="all">Date: All time</option>
                            <option value="today">Today</option>
                            <option value="7days">Last 7 days</option>
                            <option value="this_month">This month</option>
                            <option value="30days">Last 30 days</option>
                        </select>

                        {/* Supplier Filter */}
                        <select
                            value={filters.supplier_id || ''}
                            onChange={(e) => updateFilters({ supplier_id: e.target.value })}
                            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[180px] truncate"
                        >
                            <option value="">Supplier: All</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>

                        {/* Created By Filter */}
                        <select
                            value={filters.created_by || ''}
                            onChange={(e) => updateFilters({ created_by: e.target.value })}
                            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[160px] truncate"
                        >
                            <option value="">Created by: All</option>
                            {creators.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        {/* Reset Filters button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setDatePreset('all');
                                    updateFilters({
                                        search: '',
                                        status: 'all',
                                        date_from: '',
                                        date_to: '',
                                        supplier_id: '',
                                        created_by: '',
                                    });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Reset filters</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Container: wrapped in overflow-x-auto min-w-0 to prevent horizontal document scroll */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden w-full min-w-0">
                    {/* Empty State */}
                    {receipts.data.length === 0 ? (
                        <div className="py-16 px-4 text-center max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <Boxes className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {hasActiveFilters ? 'No stock receipts found' : 'No stock received yet'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {hasActiveFilters
                                    ? 'Try adjusting your search keywords, clearing date filters, or switching tabs.'
                                    : 'Record deliveries of medicines from suppliers to track batches, costs, expiry dates, and unit stock.'}
                            </p>
                            <div className="mt-5 flex justify-center gap-3">
                                {hasActiveFilters ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setDatePreset('all');
                                            updateFilters({
                                                search: '',
                                                status: 'all',
                                                date_from: '',
                                                date_to: '',
                                                supplier_id: '',
                                                created_by: '',
                                            });
                                        }}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                    >
                                        Clear search filters
                                    </button>
                                ) : (
                                    can('pharmacy.receive_stock') && (
                                        <Link
                                            href={route('tenant.pharmacy.receipts.create')}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/25 transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Receive stock</span>
                                        </Link>
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto min-w-0">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                                        <th className="py-3 px-4 whitespace-nowrap">GRN no.</th>
                                        <th className="py-3 px-4 whitespace-nowrap">Received date</th>
                                        <th className="py-3 px-4 whitespace-nowrap">Supplier</th>
                                        <th className="py-3 px-4 whitespace-nowrap">Invoice no.</th>
                                        <th className="py-3 px-4 whitespace-nowrap">Items & medicines</th>
                                        <th className="py-3 px-4 whitespace-nowrap text-right">Total cost</th>
                                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                                        <th className="py-3 px-4 whitespace-nowrap">Created by</th>
                                        <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(monthGroups).map(([month, groupReceipts]) => (
                                        <React.Fragment key={month}>
                                            {/* Sticky Month Divider Header */}
                                            <tr className="bg-slate-100/60 dark:bg-slate-800/40 border-y border-slate-200/60 dark:border-white/5">
                                                <td colSpan={9} className="py-1.5 px-4">
                                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                                        <span className="flex items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5 text-primary" />
                                                            <span>{month}</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                            {pluralize(groupReceipts.length, 'delivery', 'deliveries')}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Receipts rows for this month */}
                                            {groupReceipts.map((r, idx) => {
                                                const isFocused = focusedRowIndex === receipts.data.findIndex((item) => item.id === r.id);
                                                const isVoided = r.status === 'voided';
                                                const isPartlyConsumed = r.status === 'partly_consumed';

                                                return (
                                                    <tr
                                                        key={r.id}
                                                        onClick={() => openReceiptDrawer(r.id)}
                                                        className={`border-b border-slate-100 dark:border-white/5 transition-colors cursor-pointer group ${
                                                            isFocused
                                                                ? 'bg-primary/5 dark:bg-primary/10 ring-1 ring-inset ring-primary'
                                                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                                                        }`}
                                                    >
                                                        {/* GRN No (nowrap, Poppins tabular numbers, bold) */}
                                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                                            <div className="font-bold text-primary tabular-nums tracking-tight flex items-center gap-1.5 group-hover:underline">
                                                                <span>{r.receipt_number}</span>
                                                                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                                            </div>
                                                        </td>

                                                        {/* Received Date (Sri Lanka date helper) */}
                                                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                                                            {formatDateLK(r.received_date)}
                                                        </td>

                                                        {/* Supplier with phone tooltip or "No supplier" in muted italic */}
                                                        <td className="py-3.5 px-4 max-w-[180px]">
                                                            {r.supplier_name ? (
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                                                                        {r.supplier_name}
                                                                    </span>
                                                                    {r.supplier_phone && (
                                                                        <span
                                                                            title={`Phone: ${r.supplier_phone}`}
                                                                            className="text-slate-400 hover:text-primary transition-colors shrink-0"
                                                                        >
                                                                            <Phone className="w-3 h-3" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="italic text-slate-400 dark:text-slate-500">
                                                                    No supplier
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Supplier invoice no */}
                                                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                            {r.invoice_number || '—'}
                                                        </td>

                                                        {/* Items: "2 lines · 160 units", with first 2 medicine chips */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="space-y-1">
                                                                <div className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                                                                    <span>{pluralize(r.lines_count, 'line')}</span>
                                                                    <span className="text-slate-400 mx-1">·</span>
                                                                    <span className="text-slate-500 dark:text-slate-400">
                                                                        {pluralize(r.total_units_received, 'unit')}
                                                                    </span>
                                                                </div>
                                                                {r.preview_medicines && r.preview_medicines.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {r.preview_medicines.map((med, mIdx) => (
                                                                            <span
                                                                                key={mIdx}
                                                                                className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/5 truncate max-w-[130px]"
                                                                                title={med}
                                                                            >
                                                                                {med}
                                                                            </span>
                                                                        ))}
                                                                        {r.lines_count > 2 && (
                                                                            <span className="text-[10px] text-slate-400 self-center">
                                                                                +{r.lines_count - 2} more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Total cost (right aligned, nowrap, Poppins tabular numbers) */}
                                                        <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums font-bold text-slate-900 dark:text-white">
                                                            {formatLKR(r.total_cost_cents)}
                                                        </td>

                                                        {/* Status pill: Received (green), Voided (red, struck), Partly consumed (blue) */}
                                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                                            {isVoided ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/40 line-through">
                                                                    <Ban className="w-3 h-3 text-rose-500" />
                                                                    <span>Voided</span>
                                                                </span>
                                                            ) : isPartlyConsumed ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/40">
                                                                    <TrendingDown className="w-3 h-3 text-sky-500" />
                                                                    <span>Partly consumed</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                    <span>Received</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Created by with avatar */}
                                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0 overflow-hidden">
                                                                    {r.created_by_avatar ? (
                                                                        <img
                                                                            src={r.created_by_avatar}
                                                                            alt={r.created_by_name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        r.created_by_name.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[120px]">
                                                                    {r.created_by_name}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Row actions: View, Print GRN, "…" menu */}
                                                        <td
                                                            className="py-3.5 px-4 text-right whitespace-nowrap"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* View action button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openReceiptDrawer(r.id)}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                                    title="View delivery details"
                                                                >
                                                                    View
                                                                </button>

                                                                {/* Print GRN button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        openReceiptDrawer(r.id);
                                                                        setPrintModalOpen(true);
                                                                    }}
                                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                    title="Print GRN document (A4)"
                                                                >
                                                                    <Printer className="w-4 h-4" />
                                                                </button>

                                                                {/* Dropdown Menu Toggle */}
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setActionMenuOpenId((prev) =>
                                                                                prev === r.id ? null : r.id
                                                                            )
                                                                        }
                                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                        aria-label="More actions"
                                                                    >
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </button>

                                                                    {/* Action Dropdown Menu */}
                                                                    {actionMenuOpenId === r.id && (
                                                                        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xl z-20 py-1 text-left text-xs">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActionMenuOpenId(null);
                                                                                    openReceiptDrawer(r.id);
                                                                                }}
                                                                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>View details</span>
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActionMenuOpenId(null);
                                                                                    openReceiptDrawer(r.id);
                                                                                    setPrintModalOpen(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                                                                            >
                                                                                <Printer className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>Print GRN A4</span>
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActionMenuOpenId(null);
                                                                                    openReceiptDrawer(r.id);
                                                                                    setBarcodeModalOpen(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                                                                            >
                                                                                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>Print barcodes</span>
                                                                            </button>

                                                                            {can('pharmacy.adjust_stock') && !isVoided && (
                                                                                <>
                                                                                    <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActionMenuOpenId(null);
                                                                                            setSelectedReceiptId(r.id);
                                                                                            openReceiptDrawer(r.id);
                                                                                            setVoidModalOpen(true);
                                                                                        }}
                                                                                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold"
                                                                                    >
                                                                                        <Ban className="w-3.5 h-3.5" />
                                                                                        <span>Void receipt</span>
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {/* Totals Row */}
                                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white">
                                        <td colSpan={4} className="py-3 px-4">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                Page totals ({receipts.data.length} receipts on this page)
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 tabular-nums text-slate-800 dark:text-slate-200">
                                            {pluralize(pageTotalUnits, 'unit')}
                                        </td>
                                        <td className="py-3 px-4 text-right tabular-nums text-slate-900 dark:text-white">
                                            {formatLKR(pageTotalCost)}
                                        </td>
                                        <td colSpan={3} className="py-3 px-4" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {receipts.last_page > 1 && (
                        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="text-slate-500 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{receipts.from || 0}</span> to{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{receipts.to || 0}</span> of{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{receipts.total}</span> receipts
                            </div>

                            <div className="flex items-center gap-1">
                                {receipts.links.map((link, idx) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className="px-3 py-1.5 rounded-lg text-slate-400 dark:text-slate-600 cursor-not-allowed text-xs"
                                            />
                                        );
                                    }
                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveScroll
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-primary text-white shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over Details Drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                        onClick={() => setDrawerOpen(false)}
                    />

                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                                            {receiptDetails?.receipt.receipt_number || 'Loading GRN…'}
                                        </span>
                                        {receiptDetails && (
                                            receiptDetails.receipt.is_voided ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 line-through">
                                                    Voided
                                                </span>
                                            ) : receiptDetails.batches.some((b) => b.quantity_consumed > 0) ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                                    Partly consumed
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    Received
                                                </span>
                                            )
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Goods received note details and batch audit
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPrintModalOpen(true)}
                                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        title="Print GRN document"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDrawerOpen(false)}
                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Close drawer (Esc)"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {drawerLoading ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                                        <p className="text-xs text-slate-400">Loading receipt details…</p>
                                    </div>
                                ) : receiptDetails ? (
                                    <>
                                        {/* Header Metadata Grid */}
                                        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-xs">
                                            <div>
                                                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                                                    Received date
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {formatDateLK(receiptDetails.receipt.received_date)}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                                                    Supplier invoice no.
                                                </span>
                                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                    {receiptDetails.receipt.invoice_number || '—'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                                                    Supplier
                                                </span>
                                                {receiptDetails.receipt.supplier_name ? (
                                                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                                        <span>{receiptDetails.receipt.supplier_name}</span>
                                                        {receiptDetails.receipt.supplier_phone && (
                                                            <a
                                                                href={`tel:${receiptDetails.receipt.supplier_phone}`}
                                                                className="text-primary hover:underline text-[11px] inline-flex items-center gap-0.5"
                                                                title="Call supplier"
                                                            >
                                                                <Phone className="w-3 h-3 ml-1" />
                                                                <span>{receiptDetails.receipt.supplier_phone}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="italic text-slate-400">No supplier</span>
                                                )}
                                            </div>

                                            <div>
                                                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                                                    Created by
                                                </span>
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{receiptDetails.receipt.created_by_name}</span>
                                                </div>
                                            </div>

                                            {receiptDetails.receipt.notes && (
                                                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                                                        Delivery notes
                                                    </span>
                                                    <p className="text-slate-700 dark:text-slate-300 italic">
                                                        "{receiptDetails.receipt.notes}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Void Warning Banner if Voided */}
                                        {receiptDetails.receipt.is_voided && (
                                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
                                                <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <div className="font-bold">This GRN has been voided</div>
                                                    <div>
                                                        Voided by <strong>{receiptDetails.receipt.voided_by_name || 'System'}</strong> on{' '}
                                                        {formatDateTimeLK(receiptDetails.receipt.voided_at)}.
                                                    </div>
                                                    <div className="italic">
                                                        Reason: "{receiptDetails.receipt.void_reason || 'No reason specified'}"
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Batches Items Table */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                    Batch items ({receiptDetails.batches.length})
                                                </h4>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                                    Total: {formatLKR(receiptDetails.receipt.total_cost_cents)}
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold text-[11px]">
                                                        <tr>
                                                            <th className="py-2.5 px-3">Medicine</th>
                                                            <th className="py-2.5 px-3">Batch #</th>
                                                            <th className="py-2.5 px-3">Expiry</th>
                                                            <th className="py-2.5 px-3 text-right">Received</th>
                                                            <th className="py-2.5 px-3 text-right">Remaining</th>
                                                            <th className="py-2.5 px-3 text-right">Cost/unit</th>
                                                            <th className="py-2.5 px-3 text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                        {receiptDetails.batches.map((b) => {
                                                            const isExpired = b.expiry_date && new Date(b.expiry_date) < new Date();
                                                            return (
                                                                <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-[160px] truncate">
                                                                        {b.medicine_name}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                                                                        {b.batch_number}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                                        <span
                                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                                isExpired
                                                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                            }`}
                                                                        >
                                                                            {formatDateLK(b.expiry_date)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-medium tabular-nums text-slate-800 dark:text-slate-200">
                                                                        {b.quantity_received}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                                                                        <span
                                                                            className={
                                                                                b.quantity_remaining === 0
                                                                                    ? 'text-slate-400'
                                                                                    : b.quantity_remaining < b.quantity_received
                                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                                            }
                                                                        >
                                                                            {b.quantity_remaining}
                                                                        </span>
                                                                        {b.quantity_consumed > 0 && (
                                                                            <span
                                                                                className="text-[10px] text-slate-400 block font-normal"
                                                                                title={`${b.quantity_consumed} units consumed or dispensed`}
                                                                            >
                                                                                (-{b.quantity_consumed})
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                                                                        {formatLKR(b.cost_price_cents)}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                                                                        {formatLKR(b.line_total_cents)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Reconciliation Summary Card */}
                                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 space-y-2 text-xs">
                                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                                <span>Total line items</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {receiptDetails.batches.length} lines
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                                <span>Total received units</span>
                                                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                                    {receiptDetails.batches.reduce((acc, b) => acc + b.quantity_received, 0)} units
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                                <span>Current remaining in stock</span>
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    {receiptDetails.batches.reduce((acc, b) => acc + b.quantity_remaining, 0)} units
                                                </span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between font-bold text-sm">
                                                <span className="text-slate-900 dark:text-white">GRN total cost</span>
                                                <span className="text-primary tabular-nums">
                                                    {formatLKR(receiptDetails.receipt.total_cost_cents)}
                                                </span>
                                            </div>
                                            {receiptDetails.receipt.invoice_number && (
                                                <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Invoice reconciliation: Line items match total GRN value.</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Timeline */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Audit timeline
                                            </h4>
                                            <div className="space-y-3 pl-3 border-l-2 border-slate-200 dark:border-slate-800 text-xs">
                                                <div className="relative">
                                                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                        Stock received by {receiptDetails.receipt.created_by_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {formatDateTimeLK(receiptDetails.receipt.created_at)}
                                                    </div>
                                                </div>

                                                {receiptDetails.receipt.is_voided && (
                                                    <div className="relative">
                                                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-white dark:ring-slate-900" />
                                                        <div className="font-semibold text-rose-600 dark:text-rose-400">
                                                            GRN voided by {receiptDetails.receipt.voided_by_name || 'System'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {formatDateTimeLK(receiptDetails.receipt.voided_at)}
                                                        </div>
                                                        <div className="italic text-slate-500 mt-0.5">
                                                            Reason: {receiptDetails.receipt.void_reason}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPrintModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Print GRN</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setBarcodeModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        <Barcode className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Print barcodes</span>
                                    </button>
                                </div>

                                {can('pharmacy.adjust_stock') && receiptDetails && !receiptDetails.receipt.is_voided && (
                                    receiptDetails.receipt.can_void ? (
                                        <button
                                            type="button"
                                            onClick={() => setVoidModalOpen(true)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer"
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            <span>Void GRN</span>
                                        </button>
                                    ) : (
                                        <div
                                            title={receiptDetails.receipt.void_block_reason || 'Units have already been dispensed'}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                        >
                                            <Ban className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Void blocked (units consumed)</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            <GlassModal
                isOpen={voidModalOpen}
                onClose={() => setVoidModalOpen(false)}
                title="Void stock receipt"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleVoidSubmit} className="space-y-4">
                    {receiptDetails?.receipt.void_block_reason ? (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Full receipt void is blocked</span>
                            </div>
                            <p>{receiptDetails.receipt.void_block_reason}</p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                Stock from this GRN has already left the pharmacy (dispensed or adjusted). To adjust remaining quantities, please use <strong>Stock Adjustment</strong> in the Stock Management module.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                                <div className="font-bold flex items-center gap-2 text-rose-900 dark:text-rose-100">
                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>Impact on inventory batches:</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-1">
                                    {receiptDetails?.batches.map((b) => (
                                        <li key={b.id}>
                                            Will remove <strong>{b.quantity_remaining} units</strong> from batch{' '}
                                            <span className="font-mono">{b.batch_number}</span> ({b.medicine_name}).
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-2">
                                    This action will atomically reverse stock movements and log to the clinic audit trail. It cannot be undone.
                                </p>
                            </div>

                            {voidError && (
                                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                                    {voidError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Reason for voiding <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    placeholder="e.g. Delivered wrong medicine variant, supplier invoice cancelled, or duplicate entry…"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setVoidModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        {!receiptDetails?.receipt.void_block_reason && (
                            <button
                                type="submit"
                                disabled={voidSubmitting || !voidReason.trim()}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5"
                            >
                                {voidSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Confirm and void GRN</span>
                            </button>
                        )}
                    </div>
                </form>
            </GlassModal>

            {/* Print GRN Modal (A4 Printable Format) */}
            <GlassModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title="Print Goods Received Note (A4)"
                maxWidth="max-w-3xl"
            >
                {receiptDetails && (
                    <div className="space-y-6">
                        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-900 dark:text-white print:border-none print:p-0">
                            {/* Document Header */}
                            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-wider text-primary">
                                        Goods Received Note
                                    </h2>
                                    <div className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300 mt-1">
                                        GRN #: {receiptDetails.receipt.receipt_number}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Received date: {formatDateLK(receiptDetails.receipt.received_date)}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                        MedVisit Pharmacy Workspace
                                    </div>
                                    <div>Supplier: {receiptDetails.receipt.supplier_name || 'No supplier'}</div>
                                    <div>Invoice #: {receiptDetails.receipt.invoice_number || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Line items table */}
                            <table className="w-full text-xs text-left border-collapse mb-6">
                                <thead>
                                    <tr className="border-b border-slate-300 text-slate-600 font-bold">
                                        <th className="py-2">Medicine description</th>
                                        <th className="py-2">Batch #</th>
                                        <th className="py-2">Expiry</th>
                                        <th className="py-2 text-right">Qty</th>
                                        <th className="py-2 text-right">Cost (LKR)</th>
                                        <th className="py-2 text-right">Total (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receiptDetails.batches.map((b) => (
                                        <tr key={b.id}>
                                            <td className="py-2 font-medium">{b.medicine_name}</td>
                                            <td className="py-2 font-mono">{b.batch_number}</td>
                                            <td className="py-2">{formatDateLK(b.expiry_date)}</td>
                                            <td className="py-2 text-right tabular-nums">{b.quantity_received}</td>
                                            <td className="py-2 text-right tabular-nums">{formatLKR(b.cost_price_cents)}</td>
                                            <td className="py-2 text-right tabular-nums font-bold">
                                                {formatLKR(b.line_total_cents)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 font-bold">
                                        <td colSpan={3} className="py-2.5">
                                            Total
                                        </td>
                                        <td className="py-2.5 text-right tabular-nums">
                                            {receiptDetails.batches.reduce((acc, b) => acc + b.quantity_received, 0)}
                                        </td>
                                        <td className="py-2.5 text-right" />
                                        <td className="py-2.5 text-right tabular-nums text-primary text-sm">
                                            {formatLKR(receiptDetails.receipt.total_cost_cents)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Signatures block */}
                            <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200 text-xs">
                                <div>
                                    <div className="border-b border-slate-300 pb-1 mb-1 font-semibold">
                                        Received & Verified by
                                    </div>
                                    <div className="text-slate-500">
                                        Name: {receiptDetails.receipt.created_by_name}
                                    </div>
                                    <div className="text-slate-500">
                                        Date: {formatDateLK(receiptDetails.receipt.created_at)}
                                    </div>
                                </div>
                                <div>
                                    <div className="border-b border-slate-300 pb-1 mb-1 font-semibold">
                                        Authorized Clinic Pharmacist / Admin
                                    </div>
                                    <div className="text-slate-500">Signature: _______________________</div>
                                    <div className="text-slate-500">Date: _______________________</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setPrintModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 flex items-center gap-1.5"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print document</span>
                            </button>
                        </div>
                    </div>
                )}
            </GlassModal>

            {/* Print Barcodes Modal */}
            <GlassModal
                isOpen={barcodeModalOpen}
                onClose={() => setBarcodeModalOpen(false)}
                title="Batch Barcode Labels"
                maxWidth="max-w-xl"
            >
                {receiptDetails && (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Printable batch barcode labels for GRN {receiptDetails.receipt.receipt_number}. Stick on incoming shelf packages.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                            {receiptDetails.batches.map((b) => (
                                <div
                                    key={b.id}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center space-y-1 shadow-xs"
                                >
                                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                        {b.medicine_name}
                                    </div>
                                    <div className="text-[11px] font-mono text-primary font-semibold">
                                        Batch: {b.batch_number}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        Exp: {formatDateLK(b.expiry_date)} · Qty: {b.quantity_received}
                                    </div>
                                    <div className="py-2 flex justify-center">
                                        <div className="font-mono text-xs tracking-widest bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded">
                                            ||| | |||| | ||||| |
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={() => setBarcodeModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 flex items-center gap-1.5"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print all labels</span>
                            </button>
                        </div>
                    </div>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
