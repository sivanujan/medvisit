import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GlassCard from '@/Components/UI/GlassCard';
import { GlassInput, GlassLabel, GlassError, GlassTextarea, GlassCheckbox } from '@/Components/UI/FormControls';
import { useDebounce } from '@/Hooks/useDebounce';
import {
    formatLKR,
    formatDateLK,
    formatDateTimeLK,
    pluralize,
    normalizePhone,
    formatPhoneLK,
    getWhatsAppUrl,
} from '@/Utils/formatters';
import {
    Truck,
    Search,
    Plus,
    Edit2,
    Phone,
    Mail,
    MapPin,
    Package,
    Receipt,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Power,
    Trash2,
    Building2,
    User,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    MessageCircle,
    X,
    LayoutGrid,
    Table as TableIcon,
    AlertTriangle,
    Clock,
    FileText,
    CreditCard,
    DollarSign,
    MoreVertical,
    Activity,
    Layers,
    ShieldAlert,
} from 'lucide-react';

export interface SupplierItem {
    id: number;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    payment_terms?: string | null;
    notes?: string | null;
    is_active: boolean;
    receipts_count: number;
    batches_count: number;
    total_purchased_cents: number;
    last_delivery_date?: string | null;
    monthly_spend: number[];
    created_at?: string | null;
}

interface StatsStrip {
    active_suppliers: number;
    grns_this_month: number;
    purchases_this_month_cents: number;
    top_supplier_this_month?: string | null;
}

interface TabCounts {
    active: number;
    inactive: number;
    all: number;
}

interface Props {
    suppliers: {
        data: SupplierItem[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    stats: StatsStrip;
    tabCounts: TabCounts;
    filters: {
        search?: string;
        status?: string;
        sort?: string;
    };
}

interface DetailedSupplierProfile {
    supplier: SupplierItem & { updated_at?: string | null };
    recent_receipts: Array<{
        id: number;
        receipt_number: string;
        received_date: string;
        invoice_number?: string | null;
        total_cost_cents: number;
        status: string;
        items_count: number;
        created_by_name?: string | null;
    }>;
    medicines_supplied: Array<{
        clinic_medicine_id: number;
        medicine_name: string;
        base_unit: string;
        last_unit_cost_cents: number;
        previous_unit_cost_cents?: number | null;
        cost_trend: 'up' | 'down' | 'same';
        last_batch_number: string;
        last_expiry_date?: string | null;
        last_received_date?: string | null;
        total_batches_supplied: number;
        total_units_supplied: number;
    }>;
    activity_log: Array<{
        id: number;
        action: string;
        user_name: string;
        created_at: string;
        metadata?: any;
    }>;
}

// Inline SVG 6-Month Spend Sparkline
function SpendSparkline({ data, height = 32, width = 90 }: { data: number[]; height?: number; width?: number }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data, 1);
    const min = 0;
    const range = max - min;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * (width - 4) + 2;
        const y = height - 4 - ((val - min) / range) * (height - 8);
        return `${x},${y}`;
    });
    const polylineStr = points.join(' ');
    const hasSpend = data.some((v) => v > 0);

    return (
        <div className="flex items-center gap-1.5" title="Procurement spend trend (last 6 months)">
            <svg width={width} height={height} className="overflow-visible shrink-0">
                <polyline
                    fill="none"
                    stroke={hasSpend ? '#1E6FD9' : '#94A3B8'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                    className="transition-all"
                />
                {points.map((pt, idx) => {
                    const [px, py] = pt.split(',');
                    const isLast = idx === points.length - 1;
                    return (
                        <circle
                            key={idx}
                            cx={px}
                            cy={py}
                            r={isLast ? 2.5 : 1.5}
                            fill={isLast && hasSpend ? '#0E9E8F' : hasSpend ? '#1E6FD9' : '#94A3B8'}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

export default function SuppliersIndex({ suppliers, stats, tabCounts, filters }: Props) {
    // Search, Filter and Sort State
    const [search, setSearch] = useState(filters.search || '');
    const [statusTab, setStatusTab] = useState<'active' | 'inactive' | 'all'>(
        (filters.status as any) || 'active'
    );
    const [sort, setSort] = useState(filters.sort || 'name_asc');
    const debouncedSearch = useDebounce(search, 300);

    // View toggle: cards vs table (persisted in localStorage)
    const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('medvisit_suppliers_view') as any) || 'cards';
        }
        return 'cards';
    });

    const handleViewModeChange = (mode: 'cards' | 'table') => {
        setViewMode(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('medvisit_suppliers_view', mode);
        }
    };

    // Filter Navigation Effect
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        router.get(
            route('tenant.pharmacy.suppliers'),
            {
                search: debouncedSearch || undefined,
                status: statusTab !== 'active' ? statusTab : undefined,
                sort: sort !== 'name_asc' ? sort : undefined,
            },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    }, [debouncedSearch, statusTab, sort]);

    // Drawer State (Details)
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState<DetailedSupplierProfile | null>(null);
    const [drawerTab, setDrawerTab] = useState<'grns' | 'medicines' | 'activity'>('grns');

    const openSupplierDrawer = async (id: number) => {
        setSelectedSupplierId(id);
        setDrawerOpen(true);
        setDrawerLoading(true);
        setDrawerTab('grns');

        try {
            const res = await fetch(route('tenant.pharmacy.suppliers.show', id), {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setSupplierDetails(data);
            }
        } catch (e) {
            console.error('Failed to load supplier details', e);
        } finally {
            setDrawerLoading(false);
        }
    };

    const closeSupplierDrawer = () => {
        setDrawerOpen(false);
        setSelectedSupplierId(null);
        setSupplierDetails(null);
    };

    // Add / Edit Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [notes, setNotes] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Duplicate Check Warning State
    const [duplicateWarning, setDuplicateWarning] = useState<{
        id: number;
        name: string;
        phone?: string | null;
        city?: string | null;
    } | null>(null);
    const [ignoreDuplicateWarning, setIgnoreDuplicateWarning] = useState(false);

    const handleOpenCreate = () => {
        setEditingSupplier(null);
        setName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCity('');
        setPaymentTerms('');
        setNotes('');
        setIsActive(true);
        setErrors({});
        setDuplicateWarning(null);
        setIgnoreDuplicateWarning(false);
        setIsFormDirty(false);
        setModalOpen(true);
    };

    const handleOpenEdit = (sup: SupplierItem) => {
        setEditingSupplier(sup);
        setName(sup.name);
        setContactPerson(sup.contact_person || '');
        setPhone(sup.phone || '');
        setEmail(sup.email || '');
        setAddress(sup.address || '');
        setCity(sup.city || '');
        setPaymentTerms(sup.payment_terms || '');
        setNotes(sup.notes || '');
        setIsActive(sup.is_active);
        setErrors({});
        setDuplicateWarning(null);
        setIgnoreDuplicateWarning(false);
        setIsFormDirty(false);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        if (isFormDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                return;
            }
        }
        setModalOpen(false);
        setEditingSupplier(null);
        setDuplicateWarning(null);
        setIgnoreDuplicateWarning(false);
        setIsFormDirty(false);
    };

    // Check duplicate supplier
    const checkDuplicateSupplier = async (supplierName: string, supplierPhone: string): Promise<boolean> => {
        if (!supplierName.trim()) return false;
        try {
            const res = await fetch(route('tenant.pharmacy.suppliers.check-duplicate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    name: supplierName.trim(),
                    phone: supplierPhone.trim() || undefined,
                    exclude_id: editingSupplier?.id,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.is_duplicate && data.existing_supplier) {
                    setDuplicateWarning(data.existing_supplier);
                    return true;
                }
            }
        } catch (err) {
            console.error('Duplicate check error', err);
        }
        setDuplicateWarning(null);
        return false;
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        if (!ignoreDuplicateWarning) {
            const isDup = await checkDuplicateSupplier(name, phone);
            if (isDup) {
                setSubmitting(false);
                return; // Display banner and ask user
            }
        }

        const payload = {
            name: name.trim(),
            contact_person: contactPerson.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            city: city.trim() || null,
            payment_terms: paymentTerms.trim() || null,
            notes: notes.trim() || null,
            is_active: isActive,
        };

        if (editingSupplier) {
            router.put(route('tenant.pharmacy.suppliers.update', editingSupplier.id), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setModalOpen(false);
                    setIsFormDirty(false);
                },
                onError: (errs) => setErrors(errs),
                onFinish: () => setSubmitting(false),
            });
        } else {
            router.post(route('tenant.pharmacy.suppliers.store'), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    setModalOpen(false);
                    setIsFormDirty(false);
                },
                onError: (errs) => setErrors(errs),
                onFinish: () => setSubmitting(false),
            });
        }
    };

    // Toggle Active / Deactivate
    const [confirmToggleSupplier, setConfirmToggleSupplier] = useState<SupplierItem | null>(null);

    const handleConfirmToggle = () => {
        if (!confirmToggleSupplier) return;
        router.patch(
            route('tenant.pharmacy.suppliers.toggle', confirmToggleSupplier.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmToggleSupplier(null);
                    if (selectedSupplierId === confirmToggleSupplier.id) {
                        openSupplierDrawer(confirmToggleSupplier.id);
                    }
                },
            }
        );
    };

    // Safe Delete
    const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState<SupplierItem | null>(null);

    const handleConfirmDelete = () => {
        if (!confirmDeleteSupplier) return;
        router.delete(route('tenant.pharmacy.suppliers.destroy', confirmDeleteSupplier.id), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmDeleteSupplier(null);
                if (selectedSupplierId === confirmDeleteSupplier.id) {
                    closeSupplierDrawer();
                }
            },
        });
    };

    // Keyboard support: Esc closes drawer/modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (confirmDeleteSupplier) setConfirmDeleteSupplier(null);
                else if (confirmToggleSupplier) setConfirmToggleSupplier(null);
                else if (modalOpen) handleCloseModal();
                else if (drawerOpen) closeSupplierDrawer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmDeleteSupplier, confirmToggleSupplier, modalOpen, drawerOpen, isFormDirty]);

    // Active row actions menu dropdown
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <AuthenticatedLayout>
            <Head title="Suppliers — Pharmacy" />

            <div className="space-y-6 pb-24 font-poppins">
                {/* 1. Page Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('tenant.pharmacy.medicines')}
                            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 transition-colors shadow-xs"
                            title="Back to medicines"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Suppliers
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {tabCounts.all} total
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                The distributors you buy medicines from.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add supplier</span>
                        </button>
                    </div>
                </div>

                {/* 2. Stats Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <GlassCard className="p-4 sm:p-5 flex items-center justify-between border-slate-200/70 dark:border-white/10">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                Active suppliers
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                                {stats.active_suppliers}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {tabCounts.inactive} deactivated
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 sm:p-5 flex items-center justify-between border-slate-200/70 dark:border-white/10">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                GRNs this month
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                                {stats.grns_this_month}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Deliveries recorded
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 sm:p-5 flex items-center justify-between border-slate-200/70 dark:border-white/10">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                Purchases this month
                            </p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1 whitespace-nowrap">
                                {formatLKR(stats.purchases_this_month_cents)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Non-voided total
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 sm:p-5 flex items-center justify-between border-slate-200/70 dark:border-white/10">
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                Top supplier this month
                            </p>
                            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-1">
                                {stats.top_supplier_this_month || '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                By purchase volume
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                    </GlassCard>
                </div>

                {/* 3. Toolbar: Status Tabs, Search, Sort & View Mode Toggle */}
                <GlassCard className="p-3 sm:p-4 border-slate-200/70 dark:border-white/10">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Status Tabs */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 overflow-x-auto shrink-0">
                            {(['active', 'inactive', 'all'] as const).map((tab) => {
                                const isActiveTab = statusTab === tab;
                                const count =
                                    tab === 'active'
                                        ? tabCounts.active
                                        : tab === 'inactive'
                                        ? tabCounts.inactive
                                        : tabCounts.all;
                                const label =
                                    tab === 'active'
                                        ? 'Active'
                                        : tab === 'inactive'
                                        ? 'Inactive'
                                        : 'All';

                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setStatusTab(tab)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                                            isActiveTab
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{label}</span>
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                isActiveTab
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search, Sort and Layout View Switcher */}
                        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end min-w-0">
                            {/* Search with fully visible placeholder */}
                            <div className="relative flex-1 min-w-[240px] sm:max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search by name, contact person, phone, email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary cursor-pointer shrink-0"
                            >
                                <option value="name_asc">Name (A–Z)</option>
                                <option value="last_delivery_desc">Last delivery (newest)</option>
                                <option value="purchases_desc">Purchases (highest)</option>
                            </select>

                            {/* View Switcher: Cards vs Table */}
                            <div className="flex items-center p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleViewModeChange('cards')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        viewMode === 'cards'
                                            ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                    }`}
                                    title="Cards view"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleViewModeChange('table')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        viewMode === 'table'
                                            ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                    }`}
                                    title="Table view"
                                >
                                    <TableIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* 4. Main Content: Cards or Table */}
                {suppliers.data.length === 0 ? (
                    /* Friendly Empty State */
                    <GlassCard className="p-12 text-center border-slate-200/70 dark:border-white/10">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Truck className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {search ? 'No matching suppliers found' : 'Add your first supplier'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                            {search
                                ? `No distributors match "${search}". Try clearing search or switching status tabs.`
                                : 'Suppliers help you track where each batch came from.'}
                        </p>
                        {search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setStatusTab('all');
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                                Clear filters
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-lg shadow-primary/25 transition-all cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add supplier</span>
                            </button>
                        )}
                    </GlassCard>
                ) : viewMode === 'cards' ? (
                    /* Cards Grid: 2-3 per row on desktop, 1 on mobile */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {suppliers.data.map((sup) => {
                            const waUrl = getWhatsAppUrl(sup.phone);

                            return (
                                <GlassCard
                                    key={sup.id}
                                    className={`p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-primary/40 relative group ${
                                        !sup.is_active ? 'opacity-85 bg-slate-50/50 dark:bg-white/[0.01]' : ''
                                    }`}
                                >
                                    {/* Top Row: Name, Status & Menu */}
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => openSupplierDrawer(sup.id)}
                                                        className="font-bold text-base text-slate-900 dark:text-white hover:text-primary transition-colors text-left truncate cursor-pointer"
                                                    >
                                                        {sup.name}
                                                    </button>
                                                    {sup.city && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 shrink-0">
                                                            {sup.city}
                                                        </span>
                                                    )}
                                                </div>

                                                {sup.contact_person ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{sup.contact_person}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">
                                                        No contact person
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Pill & Row Menu */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        sup.is_active
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-slate-200/70 dark:bg-white/10 text-slate-500'
                                                    }`}
                                                >
                                                    {sup.is_active ? 'Active' : 'Inactive'}
                                                </span>

                                                {/* Dropdown Menu */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenuId(activeMenuId === sup.id ? null : sup.id);
                                                        }}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {activeMenuId === sup.id && (
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="absolute right-0 mt-1 w-52 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 text-xs font-medium"
                                                        >
                                                            {sup.is_active && (
                                                                <Link
                                                                    href={route('tenant.pharmacy.receipts.create', {
                                                                        supplier_id: sup.id,
                                                                    })}
                                                                    className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2"
                                                                >
                                                                    <Receipt className="w-4 h-4 text-primary" />
                                                                    <span>New GRN from supplier</span>
                                                                </Link>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    handleOpenEdit(sup);
                                                                }}
                                                                className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Edit2 className="w-4 h-4 text-slate-400" />
                                                                <span>Edit details</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    setConfirmToggleSupplier(sup);
                                                                }}
                                                                className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Power
                                                                    className={`w-4 h-4 ${
                                                                        sup.is_active
                                                                            ? 'text-amber-500'
                                                                            : 'text-emerald-500'
                                                                    }`}
                                                                />
                                                                <span>
                                                                    {sup.is_active ? 'Deactivate supplier' : 'Activate supplier'}
                                                                </span>
                                                            </button>
                                                            <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                                                            <button
                                                                type="button"
                                                                disabled={sup.receipts_count > 0 || sup.batches_count > 0}
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    setConfirmDeleteSupplier(sup);
                                                                }}
                                                                className="w-full px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                                                title={
                                                                    sup.receipts_count > 0
                                                                        ? 'Cannot delete supplier with recorded deliveries'
                                                                        : 'Permanently delete supplier'
                                                                }
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                <span>Delete (0 GRNs only)</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Row: Phone, WhatsApp, Email */}
                                        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs pt-2 pb-3 border-b border-slate-100 dark:border-white/5">
                                            {sup.phone ? (
                                                <div className="flex items-center gap-1.5">
                                                    <a
                                                        href={`tel:${sup.phone}`}
                                                        className="font-medium text-slate-700 dark:text-slate-200 hover:text-primary flex items-center gap-1 transition-colors"
                                                        title="Tap to call"
                                                    >
                                                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        <span className="tabular-nums">{formatPhoneLK(sup.phone)}</span>
                                                    </a>
                                                    {waUrl && (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                                            title="Chat on WhatsApp"
                                                        >
                                                            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(sup)}
                                                    className="text-xs text-slate-400 hover:text-primary transition-colors italic cursor-pointer"
                                                >
                                                    + Add phone
                                                </button>
                                            )}

                                            {sup.email ? (
                                                <a
                                                    href={`mailto:${sup.email}`}
                                                    className="text-slate-500 dark:text-slate-400 hover:text-primary flex items-center gap-1 transition-colors truncate max-w-[170px]"
                                                    title={`Email ${sup.email}`}
                                                >
                                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{sup.email}</span>
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(sup)}
                                                    className="text-xs text-slate-400 hover:text-primary transition-colors italic cursor-pointer"
                                                >
                                                    + Add email
                                                </button>
                                            )}
                                        </div>

                                        {/* Procurement Stats & Sparkline */}
                                        <div className="py-3 flex items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Receipt className="w-3.5 h-3.5 text-primary" />
                                                        {pluralize(sup.receipts_count, 'GRN', 'GRNs')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Package className="w-3.5 h-3.5 text-emerald-500" />
                                                        {pluralize(sup.batches_count, 'batch', 'batches')}
                                                    </span>
                                                </div>
                                                <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums mt-1 whitespace-nowrap">
                                                    {formatLKR(sup.total_purchased_cents)}
                                                </div>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {sup.last_delivery_date
                                                        ? `Last delivery ${formatDateLK(sup.last_delivery_date)}`
                                                        : 'No deliveries recorded'}
                                                </p>
                                            </div>

                                            {/* 6-Month Spend Sparkline */}
                                            <div className="text-right shrink-0">
                                                <SpendSparkline data={sup.monthly_spend} />
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-1">
                                                    6-mo trend
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openSupplierDrawer(sup.id)}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <span>View details</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(sup)}
                                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                title="Edit supplier"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                ) : (
                    /* Table View (when toggled) */
                    <GlassCard className="p-0 overflow-hidden border-slate-200/70 dark:border-white/10">
                        <div className="w-full overflow-x-auto min-w-0">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200/70 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="px-5 py-3.5">Supplier & Contact</th>
                                        <th className="px-5 py-3.5">Contact Details</th>
                                        <th className="px-5 py-3.5 text-center">Deliveries</th>
                                        <th className="px-5 py-3.5 text-right">Total Purchases</th>
                                        <th className="px-5 py-3.5">Last Delivery</th>
                                        <th className="px-5 py-3.5 text-center">Trend</th>
                                        <th className="px-5 py-3.5 text-center">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                                    {suppliers.data.map((sup) => {
                                        const waUrl = getWhatsAppUrl(sup.phone);

                                        return (
                                            <tr
                                                key={sup.id}
                                                onClick={() => openSupplierDrawer(sup.id)}
                                                className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                                        <span>{sup.name}</span>
                                                        {sup.city && (
                                                            <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                {sup.city}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {sup.contact_person && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <User className="w-3 h-3 text-slate-400" />
                                                            <span>{sup.contact_person}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="space-y-1 text-xs">
                                                        {sup.phone ? (
                                                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                                                                <a
                                                                    href={`tel:${sup.phone}`}
                                                                    className="hover:text-primary tabular-nums"
                                                                >
                                                                    {formatPhoneLK(sup.phone)}
                                                                </a>
                                                                {waUrl && (
                                                                    <a
                                                                        href={waUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-emerald-500 hover:text-emerald-600"
                                                                    >
                                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic">No phone</span>
                                                        )}
                                                        {sup.email && (
                                                            <div className="text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                                <a href={`mailto:${sup.email}`} className="hover:text-primary">
                                                                    {sup.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                                                        {sup.receipts_count}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {pluralize(sup.batches_count, 'batch', 'batches')}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                                    {formatLKR(sup.total_purchased_cents)}
                                                </td>

                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs tabular-nums">
                                                    {sup.last_delivery_date
                                                        ? formatDateLK(sup.last_delivery_date)
                                                        : '—'}
                                                </td>

                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex justify-center">
                                                        <SpendSparkline data={sup.monthly_spend} height={24} width={70} />
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            sup.is_active
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                : 'bg-slate-200/70 dark:bg-white/10 text-slate-500'
                                                        }`}
                                                    >
                                                        {sup.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openSupplierDrawer(sup.id)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                            title="View details"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEdit(sup)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                            title="Edit supplier"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}

                {/* 5. Pagination Bar */}
                {suppliers.last_page > 1 && (
                    <GlassCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-slate-200/70 dark:border-white/10">
                        <div>
                            Showing {suppliers.from || 0} to {suppliers.to || 0} of {suppliers.total} supplier{suppliers.total === 1 ? '' : 's'}
                        </div>
                        <div className="flex items-center gap-1">
                            {suppliers.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                                        link.active
                                            ? 'bg-primary text-white font-bold shadow-xs'
                                            : link.url
                                            ? 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                            : 'text-slate-300 dark:text-slate-600 pointer-events-none'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>

            {/* 6. Supplier Detail Drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden font-poppins animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                        onClick={closeSupplierDrawer}
                    />

                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border-l border-slate-200/80 dark:border-white/10 flex flex-col">
                            {/* Drawer Header */}
                            <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-4 shrink-0">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                                            {supplierDetails?.supplier.name || 'Loading supplier...'}
                                        </h2>
                                        {supplierDetails && (
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    supplierDetails.supplier.is_active
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-slate-200 text-slate-600'
                                                }`}
                                            >
                                                {supplierDetails.supplier.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        )}
                                        {supplierDetails?.supplier.city && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {supplierDetails.supplier.city}
                                            </span>
                                        )}
                                    </div>

                                    {/* Quick Contact Actions: Call, WhatsApp, Email, New GRN */}
                                    {supplierDetails && (
                                        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                                            {supplierDetails.supplier.phone && (
                                                <a
                                                    href={`tel:${supplierDetails.supplier.phone}`}
                                                    className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Phone className="w-3.5 h-3.5" />
                                                    <span>Call {formatPhoneLK(supplierDetails.supplier.phone)}</span>
                                                </a>
                                            )}

                                            {getWhatsAppUrl(supplierDetails.supplier.phone) && (
                                                <a
                                                    href={getWhatsAppUrl(supplierDetails.supplier.phone)!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 transition-colors"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    <span>WhatsApp</span>
                                                </a>
                                            )}

                                            {supplierDetails.supplier.email && (
                                                <a
                                                    href={`mailto:${supplierDetails.supplier.email}`}
                                                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Mail className="w-3.5 h-3.5" />
                                                    <span>Email</span>
                                                </a>
                                            )}

                                            {supplierDetails.supplier.is_active && (
                                                <Link
                                                    href={route('tenant.pharmacy.receipts.create', {
                                                        supplier_id: supplierDetails.supplier.id,
                                                    })}
                                                    className="px-3 py-1 rounded-lg bg-primary text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                                                >
                                                    <Receipt className="w-3.5 h-3.5" />
                                                    <span>Receive stock (GRN)</span>
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={closeSupplierDrawer}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            {drawerLoading || !supplierDetails ? (
                                <div className="p-12 text-center text-slate-400 animate-pulse">
                                    Loading supplier profile...
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Overview Card */}
                                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-3 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block">
                                                    Contact Person
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {supplierDetails.supplier.contact_person || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block">
                                                    Payment Terms
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {supplierDetails.supplier.payment_terms || 'Standard (None specified)'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block">
                                                    Address
                                                </span>
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {supplierDetails.supplier.address || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block">
                                                    Total Purchased
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                                                    {formatLKR(supplierDetails.supplier.total_purchased_cents)}
                                                </span>
                                            </div>
                                        </div>

                                        {supplierDetails.supplier.notes && (
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                <span className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold block mb-0.5">
                                                    Notes
                                                </span>
                                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                                    {supplierDetails.supplier.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tabs: GRNs, Medicines supplied, Activity */}
                                    <div>
                                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2">
                                            <button
                                                type="button"
                                                onClick={() => setDrawerTab('grns')}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                    drawerTab === 'grns'
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Receipt className="w-3.5 h-3.5" />
                                                <span>GRNs ({supplierDetails.recent_receipts.length})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDrawerTab('medicines')}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                    drawerTab === 'medicines'
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Package className="w-3.5 h-3.5" />
                                                <span>Medicines supplied ({supplierDetails.medicines_supplied.length})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDrawerTab('activity')}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                    drawerTab === 'activity'
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <Activity className="w-3.5 h-3.5" />
                                                <span>Activity log</span>
                                            </button>
                                        </div>

                                        {/* Tab Content */}
                                        <div className="pt-4">
                                            {drawerTab === 'grns' && (
                                                <div className="space-y-2.5">
                                                    {supplierDetails.recent_receipts.length === 0 ? (
                                                        <div className="p-8 text-center text-slate-400 text-xs">
                                                            No goods received notes recorded for this distributor yet.
                                                        </div>
                                                    ) : (
                                                        supplierDetails.recent_receipts.map((grn) => (
                                                            <div
                                                                key={grn.id}
                                                                className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.01] border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                                            {grn.receipt_number}
                                                                        </span>
                                                                        {grn.invoice_number && (
                                                                            <span className="text-[11px] text-slate-400">
                                                                                Inv #{grn.invoice_number}
                                                                            </span>
                                                                        )}
                                                                        <span
                                                                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                                                                grn.status === 'received'
                                                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                                                    : 'bg-rose-500/10 text-rose-600 line-through'
                                                                            }`}
                                                                        >
                                                                            {grn.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                                        {formatDateLK(grn.received_date)} · {grn.items_count} batch lines · Created by {grn.created_by_name || 'Staff'}
                                                                    </div>
                                                                </div>

                                                                <div className="text-right">
                                                                    <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                                                                        {formatLKR(grn.total_cost_cents)}
                                                                    </div>
                                                                    <Link
                                                                        href={route('tenant.pharmacy.receipts')}
                                                                        className="text-[11px] text-primary hover:underline"
                                                                    >
                                                                        View in receipts
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}

                                            {drawerTab === 'medicines' && (
                                                <div className="space-y-2.5">
                                                    {supplierDetails.medicines_supplied.length === 0 ? (
                                                        <div className="p-8 text-center text-slate-400 text-xs">
                                                            No batches delivered by this supplier yet.
                                                        </div>
                                                    ) : (
                                                        supplierDetails.medicines_supplied.map((med) => (
                                                            <div
                                                                key={med.clinic_medicine_id}
                                                                className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-white/[0.01] border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                                                            >
                                                                <div>
                                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                                        {med.medicine_name}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                                        Last batch: {med.last_batch_number} · Exp: {formatDateLK(med.last_expiry_date)} · {med.total_units_supplied} units supplied
                                                                    </div>
                                                                </div>

                                                                <div className="text-right">
                                                                    <div className="flex items-center justify-end gap-1 font-bold text-slate-900 dark:text-white tabular-nums">
                                                                        <span>{formatLKR(med.last_unit_cost_cents)}</span>
                                                                        {med.cost_trend === 'up' && (
                                                                            <span title="Cost increased from previous batch">
                                                                                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                                                                            </span>
                                                                        )}
                                                                        {med.cost_trend === 'down' && (
                                                                            <span title="Cost decreased from previous batch">
                                                                                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                                                                            </span>
                                                                        )}
                                                                        {med.cost_trend === 'same' && (
                                                                            <span title="Cost unchanged">
                                                                                <Minus className="w-3.5 h-3.5 text-slate-400" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400">
                                                                        per {med.base_unit}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}

                                            {drawerTab === 'activity' && (
                                                <div className="space-y-3">
                                                    {supplierDetails.activity_log.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-400 text-xs">
                                                            No audit events recorded yet.
                                                        </div>
                                                    ) : (
                                                        supplierDetails.activity_log.map((evt) => (
                                                            <div
                                                                key={evt.id}
                                                                className="flex items-start gap-3 text-xs p-2.5 rounded-xl bg-slate-50/50 dark:bg-white/[0.01]"
                                                            >
                                                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                                                    <Activity className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                        {evt.action}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400">
                                                                        By {evt.user_name} · {formatDateTimeLK(evt.created_at)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Drawer Footer Actions */}
                            {supplierDetails && (
                                <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeSupplierDrawer();
                                            handleOpenEdit(supplierDetails.supplier);
                                        }}
                                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Edit details</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setConfirmToggleSupplier(supplierDetails.supplier)}
                                        className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                                            supplierDetails.supplier.is_active
                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        }`}
                                    >
                                        <Power className="w-3.5 h-3.5" />
                                        <span>
                                            {supplierDetails.supplier.is_active ? 'Deactivate supplier' : 'Activate supplier'}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 7. Add / Edit Supplier Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto font-poppins">
                    <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4 text-center">
                        <div
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                            onClick={handleCloseModal}
                        />

                        <div className="relative w-full sm:max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden text-left flex flex-col max-h-[90vh]">
                            {/* Sticky Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-primary" />
                                    <span>{editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSaveSupplier} className="overflow-y-auto p-6 space-y-4 flex-1">
                                {/* Duplicate Warning Banner */}
                                {duplicateWarning && !ignoreDuplicateWarning && (
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-bold">A similar supplier already exists:</p>
                                            <p className="mt-0.5 font-medium">
                                                {duplicateWarning.name} {duplicateWarning.city ? `(${duplicateWarning.city})` : ''} · {formatPhoneLK(duplicateWarning.phone)}
                                            </p>
                                            <p className="mt-1 text-slate-600 dark:text-slate-400">
                                                Would you like to continue and create a duplicate supplier anyway?
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIgnoreDuplicateWarning(true);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                                                >
                                                    Yes, create anyway
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleCloseModal();
                                                        openSupplierDrawer(duplicateWarning.id);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-medium text-xs hover:bg-slate-50"
                                                >
                                                    Use existing supplier
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <GlassLabel htmlFor="supName" required>
                                        Supplier / Company Name
                                    </GlassLabel>
                                    <GlassInput
                                        id="supName"
                                        placeholder="e.g. Astron Limited, Hemas Pharmaceuticals, GlaxoSmithKline"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setIsFormDirty(true);
                                        }}
                                        required
                                    />
                                    {errors.name && <GlassError message={errors.name} />}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <GlassLabel htmlFor="supContact">Contact Person</GlassLabel>
                                        <GlassInput
                                            id="supContact"
                                            placeholder="e.g. Rohan Perera, Mr. Fernando"
                                            value={contactPerson}
                                            onChange={(e) => {
                                                setContactPerson(e.target.value);
                                                setIsFormDirty(true);
                                            }}
                                        />
                                        {errors.contact_person && <GlassError message={errors.contact_person} />}
                                    </div>

                                    <div>
                                        <GlassLabel htmlFor="supPhone">Phone Number</GlassLabel>
                                        <GlassInput
                                            id="supPhone"
                                            placeholder="077 123 4567 or +94 11 234 5678"
                                            value={phone}
                                            onChange={(e) => {
                                                setPhone(e.target.value);
                                                setIsFormDirty(true);
                                            }}
                                        />
                                        <span className="text-[10px] text-slate-400 mt-1 block">
                                            Accepts local (077...) or international (+94...) format
                                        </span>
                                        {errors.phone && <GlassError message={errors.phone} />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <GlassLabel htmlFor="supEmail">Email Address</GlassLabel>
                                        <GlassInput
                                            id="supEmail"
                                            type="email"
                                            placeholder="orders@distributor.lk"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setIsFormDirty(true);
                                            }}
                                        />
                                        {errors.email && <GlassError message={errors.email} />}
                                    </div>

                                    <div>
                                        <GlassLabel htmlFor="supCity">City / District</GlassLabel>
                                        <GlassInput
                                            id="supCity"
                                            placeholder="e.g. Colombo 03, Ratmalana, Kandy"
                                            value={city}
                                            onChange={(e) => {
                                                setCity(e.target.value);
                                                setIsFormDirty(true);
                                            }}
                                        />
                                        {errors.city && <GlassError message={errors.city} />}
                                    </div>
                                </div>

                                <div>
                                    <GlassLabel htmlFor="supAddress">Office / Warehouse Address</GlassLabel>
                                    <GlassInput
                                        id="supAddress"
                                        placeholder="e.g. 123 Galle Road, Colombo 03"
                                        value={address}
                                        onChange={(e) => {
                                            setAddress(e.target.value);
                                            setIsFormDirty(true);
                                        }}
                                    />
                                    {errors.address && <GlassError message={errors.address} />}
                                </div>

                                <div>
                                    <GlassLabel htmlFor="supPaymentTerms">Payment Terms</GlassLabel>
                                    <GlassInput
                                        id="supPaymentTerms"
                                        placeholder="e.g. Net 30 days, Cash on Delivery, 14 days cheque"
                                        value={paymentTerms}
                                        onChange={(e) => {
                                            setPaymentTerms(e.target.value);
                                            setIsFormDirty(true);
                                        }}
                                    />
                                    {errors.payment_terms && <GlassError message={errors.payment_terms} />}
                                </div>

                                <div>
                                    <GlassLabel htmlFor="supNotes">Internal Procurement Notes</GlassLabel>
                                    <GlassTextarea
                                        id="supNotes"
                                        placeholder="Special discounts, delivery days, minimum order quantity..."
                                        value={notes}
                                        onChange={(e) => {
                                            setNotes(e.target.value);
                                            setIsFormDirty(true);
                                        }}
                                        rows={3}
                                    />
                                    {errors.notes && <GlassError message={errors.notes} />}
                                </div>

                                {editingSupplier && (
                                    <div className="pt-2">
                                        <GlassCheckbox
                                            id="supIsActive"
                                            label="Active supplier (can receive new stock deliveries)"
                                            checked={isActive}
                                            onChange={(e) => {
                                                setIsActive(e.target.checked);
                                                setIsFormDirty(true);
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Sticky Footer */}
                                <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !name.trim()}
                                        className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-primary/25 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        {submitting
                                            ? 'Saving...'
                                            : editingSupplier
                                            ? 'Update supplier'
                                            : 'Create supplier'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* 8. Deactivate / Activate Confirmation Dialog */}
            {confirmToggleSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-poppins animate-in fade-in duration-150">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-6 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                            <Power className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                            {confirmToggleSupplier.is_active ? 'Deactivate supplier?' : 'Activate supplier?'}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {confirmToggleSupplier.is_active
                                ? `Deactivating "${confirmToggleSupplier.name}" will hide it from the GRN supplier dropdown when recording new deliveries. All past receipts and batch history will be preserved.`
                                : `Activating "${confirmToggleSupplier.name}" will make it available in the GRN supplier dropdown for receiving stock.`}
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmToggleSupplier(null)}
                                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmToggle}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                                    confirmToggleSupplier.is_active
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {confirmToggleSupplier.is_active ? 'Yes, deactivate' : 'Yes, activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 9. Delete Confirmation Dialog (Guarded: 0 GRNs only) */}
            {confirmDeleteSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-poppins animate-in fade-in duration-150">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-6 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                            Permanently delete supplier?
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Are you sure you want to permanently delete "{confirmDeleteSupplier.name}"? This action cannot be undone.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteSupplier(null)}
                                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                            >
                                Delete supplier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
