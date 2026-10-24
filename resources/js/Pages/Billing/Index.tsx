import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Tabs } from '@/Components/UI/Tabs';
import { EmptyState } from '@/Components/UI/EmptyState';
import { formatLKR, formatDateLK, formatTime, formatDateTimeLK } from '@/Utils/formatters';
import {
    DollarSign,
    CreditCard,
    Receipt,
    Printer,
    FileText,
    RotateCcw,
    TrendingUp,
    Building2,
    Stethoscope,
    Calendar,
    Search,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    MoreVertical,
    Clock,
    X,
    ArrowUpRight,
    ArrowDownRight,
    Banknote,
    User,
    Filter,
} from 'lucide-react';

interface BillItem {
    id: number;
    receipt_number: string | null;
    token_number: number | null;
    token_id: number | null;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    doctor_id?: number | null;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    room_number: string;
    doctor_fee_cents: number;
    doctor_fee_lkr: number;
    doctor_fee_formatted: string;
    clinic_fee_cents: number;
    clinic_fee_lkr: number;
    clinic_fee_formatted: string;
    other_fee_cents: number;
    other_fee_lkr: number;
    discount_cents: number;
    discount_lkr: number;
    discount_formatted: string;
    discount_reason: string | null;
    total_amount_cents: number;
    total_amount_lkr: number;
    total_amount_formatted: string;
    payment_method: string;
    payment_status: string;
    refund_reason: string | null;
    refunded_at: string | null;
    created_at_date: string;
    created_at_time: string;
    created_at_formatted: string;
    receipt_lines?: Array<{
        name: string;
        type?: string;
        quantity?: number | null;
        unit_price_lkr?: number | null;
        unit_price_formatted?: string | null;
        amount_lkr?: number;
        amount_cents?: number;
        amount_formatted?: string;
        recipient?: string;
    }>;
    bill_items?: Array<{
        id: number;
        description: string;
        quantity: number;
        unit_price_lkr: number;
        total_price_lkr: number;
        unit_price_formatted: string;
        total_price_formatted: string;
    }>;
    visit_type_name?: string | null;
}

interface MethodSplit {
    count: number;
    total_cents: number;
    total_lkr: number;
    total_formatted: string;
    percentage: number;
}

interface Kpis {
    collected_cents: number;
    collected_lkr: number;
    collected_formatted: string;
    vs_previous_percentage: number | null;
    doctor_share_cents: number;
    doctor_share_lkr: number;
    doctor_share_formatted: string;
    clinic_share_cents: number;
    clinic_share_lkr: number;
    clinic_share_formatted: string;
    discount_cents: number;
    discount_lkr: number;
    discount_formatted: string;
    refund_cents: number;
    refund_lkr: number;
    refund_formatted: string;
    methods_split: {
        cash: MethodSplit;
        card: MethodSplit;
        bank_transfer: MethodSplit;
    };
}

interface HourlyItem {
    hour: string;
    label: string;
    amount_cents: number;
    amount_lkr: number;
    amount_formatted: string;
    count: number;
}

interface DoctorSummary {
    doctor_id: number;
    doctor_name: string;
    consultations_count: number;
    doctor_fee_total_cents: number;
    doctor_fee_total_lkr: number;
    doctor_fee_formatted: string;
    clinic_fee_total_cents: number;
    clinic_fee_total_lkr: number;
    clinic_fee_formatted: string;
    total_cents: number;
    total_lkr: number;
    total_formatted: string;
}

interface ReportMeta {
    range_preset: string;
    start_date: string;
    end_date: string;
    start_date_formatted: string;
    end_date_formatted: string;
    display_label: string;
    payment_methods: {
        cash: MethodSplit;
        card: MethodSplit;
        bank_transfer: MethodSplit;
    };
    hourly_chart: HourlyItem[];
    doctors_summary: DoctorSummary[];
    cash_drawer: {
        status: string;
        message: string;
    };
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface FilteredTotals {
    count: number;
    total_amount_lkr: number;
    total_amount_formatted: string;
    doctor_share_lkr: number;
    doctor_share_formatted: string;
    clinic_share_lkr: number;
    clinic_share_formatted: string;
    discount_lkr: number;
    discount_formatted: string;
    refund_lkr: number;
    refund_formatted: string;
}

interface Props {
    pendingBills: BillItem[];
    recentReceipts: PaginatedData<BillItem>;
    kpis: Kpis;
    report: ReportMeta;
    filteredTotals: FilteredTotals;
    doctorsList: Array<{ id: number; name: string; specialty: string }>;
    clinicInfo: { name: string; phone: string; address: string; reg_no: string };
    permissions: {
        can_view_financials: boolean;
        can_collect: boolean;
        can_refund: boolean;
        can_export: boolean;
    };
    filters: {
        range: string;
        start_date: string;
        end_date: string;
        search: string;
        doctor_id: string;
        method: string;
        status: string;
        sort: string;
    };
}

// Generate consistent avatar colors for doctors
const DOCTOR_COLORS = [
    '#1E6FD9', // Ocean blue
    '#0E9E8F', // Teal
    '#8B5CF6', // Purple
    '#FF7A59', // Coral
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Emerald
];
function getDoctorColor(id: number | null | undefined): string {
    if (!id) return '#1E6FD9';
    return DOCTOR_COLORS[id % DOCTOR_COLORS.length];
}

// Animated count-up hook (respects prefers-reduced-motion)
function useCountUp(targetAmount: number, durationMs = 600): number {
    const [displayAmount, setDisplayAmount] = useState(targetAmount);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setDisplayAmount(targetAmount);
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setDisplayAmount(targetAmount);
            return;
        }

        let startTimestamp: number | null = null;
        const initialValue = 0;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayAmount(Math.round(initialValue + (targetAmount - initialValue) * easeOut));

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayAmount(targetAmount);
            }
        };

        const frame = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(frame);
    }, [targetAmount, durationMs]);

    return displayAmount;
}

export default function BillingIndex({
    pendingBills,
    recentReceipts,
    kpis,
    report,
    filteredTotals,
    doctorsList,
    clinicInfo,
    permissions,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState<'pending' | 'receipts' | 'report'>('receipts');

    // Modals and side-panels
    const [collectPanelOpen, setCollectPanelOpen] = useState(false);
    const [selectedBillForPay, setSelectedBillForPay] = useState<BillItem | null>(null);
    const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
    const [activeReceipt, setActiveReceipt] = useState<BillItem | null>(null);
    const [receiptFormat, setReceiptFormat] = useState<'80mm' | 'a4'>('80mm');

    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [selectedBillForRefund, setSelectedBillForRefund] = useState<BillItem | null>(null);
    const [refundReason, setRefundReason] = useState('');

    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    // Filter toolbar state
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedDoctorId, setSelectedDoctorId] = useState(filters.doctor_id || '');
    const [selectedMethod, setSelectedMethod] = useState(filters.method || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [selectedSort, setSelectedSort] = useState(filters.sort || 'newest');

    // Debounce search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Animated KPI values
    const animatedCollected = useCountUp(kpis.collected_cents);
    const animatedDoctorShare = useCountUp(kpis.doctor_share_cents);
    const animatedClinicShare = useCountUp(kpis.clinic_share_cents);
    const animatedDiscount = useCountUp(kpis.discount_cents);

    // Payment Form
    const payForm = useForm({
        payment_method: 'cash',
        discount_lkr: 0,
        discount_reason: '',
        notes: '',
    });

    // Handle Date Range Preset Click
    const handleRangeChange = (preset: string) => {
        router.get(
            '/billing',
            {
                ...filters,
                range: preset,
                date: undefined,
                start_date: undefined,
                end_date: undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
        setDatePickerOpen(false);
    };

    // Step Date by 1 Day
    const handleStepDate = (direction: 'prev' | 'next') => {
        const baseDate = new Date(filters.start_date);
        baseDate.setDate(baseDate.getDate() + (direction === 'next' ? 1 : -1));
        const yyyy = baseDate.getFullYear();
        const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
        const dd = String(baseDate.getDate()).padStart(2, '0');
        const nextDateStr = `${yyyy}-${mm}-${dd}`;

        router.get(
            '/billing',
            {
                ...filters,
                range: 'custom',
                start_date: nextDateStr,
                end_date: nextDateStr,
                date: undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Apply Filters & Search
    const applyFilters = (newParams: Partial<typeof filters>) => {
        router.get(
            '/billing',
            {
                ...filters,
                ...newParams,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            applyFilters({ search: val });
        }, 300);
    };

    // Open Payment Side Panel
    const openCollectPanel = (bill: BillItem) => {
        setSelectedBillForPay(bill);
        payForm.setData({
            payment_method: bill.payment_method || 'cash',
            discount_lkr: bill.discount_lkr || 0,
            discount_reason: bill.discount_reason || '',
            notes: '',
        });
        setCashReceivedInput(String(bill.total_amount_lkr || ''));
        setCollectPanelOpen(true);
    };

    // Submit Payment
    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBillForPay) return;

        payForm.post(`/billing/${selectedBillForPay.id}/pay`, {
            onSuccess: (page) => {
                setCollectPanelOpen(false);
                // Open receipt viewer
                const updatedBill = {
                    ...selectedBillForPay,
                    payment_status: 'paid',
                    payment_method: payForm.data.payment_method,
                    discount_lkr: Number(payForm.data.discount_lkr) || 0,
                    total_amount_formatted: formatLKR(
                        (selectedBillForPay.doctor_fee_lkr +
                            selectedBillForPay.clinic_fee_lkr -
                            (Number(payForm.data.discount_lkr) || 0)) *
                            100
                    ),
                };
                setActiveReceipt(updatedBill);
                setReceiptPreviewOpen(true);
            },
        });
    };

    // Refund Modal
    const openRefundModal = (b: BillItem) => {
        setSelectedBillForRefund(b);
        setRefundReason('Session cancelled by doctor / emergency');
        setRefundModalOpen(true);
    };

    const submitRefund = () => {
        if (!selectedBillForRefund) return;
        router.post(
            `/billing/${selectedBillForRefund.id}/refund`,
            { refund_reason: refundReason },
            {
                onSuccess: () => setRefundModalOpen(false),
            }
        );
    };

    // Open Receipt Preview
    const openReceiptViewer = (b: BillItem, format: '80mm' | 'a4' = '80mm') => {
        setActiveReceipt(b);
        setReceiptFormat(format);
        setReceiptPreviewOpen(true);
    };

    // Dynamic Calculations in Collect Panel
    const panelSubtotalLkr = selectedBillForPay
        ? selectedBillForPay.doctor_fee_lkr + selectedBillForPay.clinic_fee_lkr + (selectedBillForPay.other_fee_lkr || 0)
        : 0;
    const panelFinalAmountLkr = Math.max(0, panelSubtotalLkr - (Number(payForm.data.discount_lkr) || 0));
    const cashReceivedNum = parseFloat(cashReceivedInput) || 0;
    const changeDueLkr = Math.max(0, cashReceivedNum - panelFinalAmountLkr);

    return (
        <AuthenticatedLayout>
            <Head title="Billing & Collections - MedVisit" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <Link href="/dashboard" className="hover:text-primary transition-colors">
                                Clinic workspace
                            </Link>
                            <span>/</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">Billing & collections</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Billing & collections
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Today's payments, receipts and doctor shares.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Date Range Picker with Stepping */}
                        <div className="relative">
                            <div className="flex items-center rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs p-1">
                                <button
                                    type="button"
                                    onClick={() => handleStepDate('prev')}
                                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Previous day"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDatePickerOpen(!datePickerOpen)}
                                    className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 hover:text-primary transition-colors"
                                >
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    <span>{report.display_label}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleStepDate('next')}
                                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Next day"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Date Presets Popover */}
                            {datePickerOpen && (
                                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">
                                        Date presets
                                    </div>
                                    <div className="space-y-0.5">
                                        {[
                                            { id: 'today', label: 'Today' },
                                            { id: 'yesterday', label: 'Yesterday' },
                                            { id: 'this_week', label: 'This week' },
                                            { id: 'this_month', label: 'This month' },
                                        ].map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleRangeChange(p.id)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                                    filters.range === p.id
                                                        ? 'bg-primary text-white font-bold'
                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Single / Range Date Input */}
                                    <div className="border-t border-slate-100 dark:border-white/10 mt-2 pt-2 px-2">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                            Custom date
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.start_date}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    router.get(
                                                        '/billing',
                                                        {
                                                            ...filters,
                                                            range: 'custom',
                                                            start_date: e.target.value,
                                                            end_date: e.target.value,
                                                            date: undefined,
                                                        },
                                                        { preserveState: true }
                                                    );
                                                    setDatePickerOpen(false);
                                                }
                                            }}
                                            className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Primary "Collect payment" button */}
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('pending');
                                if (pendingBills.length > 0) {
                                    openCollectPanel(pendingBills[0]);
                                }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
                        >
                            <DollarSign className="w-4 h-4" />
                            <span>Collect payment</span>
                            {pendingBills.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20">
                                    {pendingBills.length}
                                </span>
                            )}
                        </button>

                        {/* "…" More actions menu */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                                className="p-2.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors shadow-xs"
                                title="More options"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {headerMenuOpen && (
                                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                                    {permissions.can_export && (
                                        <a
                                            href={`/billing/export?start_date=${filters.start_date}&end_date=${filters.end_date}`}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            onClick={() => setHeaderMenuOpen(false)}
                                        >
                                            <Download className="w-3.5 h-3.5 text-primary" />
                                            <span>Export CSV</span>
                                        </a>
                                    )}

                                    <Link
                                        href="/billing/payouts"
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        onClick={() => setHeaderMenuOpen(false)}
                                    >
                                        <Banknote className="w-3.5 h-3.5 text-teal-600" />
                                        <span>Doctor payouts</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Ribbon (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Collected */}
                    <GlassCard className="p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    Collected
                                </span>
                                {kpis.vs_previous_percentage !== null && (
                                    <span
                                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                            kpis.vs_previous_percentage >= 0
                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                        }`}
                                    >
                                        {kpis.vs_previous_percentage >= 0 ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                        )}
                                        {Math.abs(kpis.vs_previous_percentage)}%
                                    </span>
                                )}
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                                {permissions.can_view_financials ? formatLKR(animatedCollected, true) : '—'}
                            </div>
                        </div>

                        {/* Mini split bar: Cash / Card / Bank transfer */}
                        {permissions.can_view_financials && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                    <div
                                        style={{ width: `${kpis.methods_split.cash.percentage}%` }}
                                        className="bg-emerald-500 h-full transition-all"
                                        title={`Cash: ${kpis.methods_split.cash.percentage}%`}
                                    />
                                    <div
                                        style={{ width: `${kpis.methods_split.card.percentage}%` }}
                                        className="bg-[#1E6FD9] h-full transition-all"
                                        title={`Card: ${kpis.methods_split.card.percentage}%`}
                                    />
                                    <div
                                        style={{ width: `${kpis.methods_split.bank_transfer.percentage}%` }}
                                        className="bg-purple-500 h-full transition-all"
                                        title={`Online: ${kpis.methods_split.bank_transfer.percentage}%`}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Cash ({kpis.methods_split.cash.percentage}%)
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#1E6FD9]" />
                                        Card ({kpis.methods_split.card.percentage}%)
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        Bank ({kpis.methods_split.bank_transfer.percentage}%)
                                    </span>
                                </div>
                            </div>
                        )}
                    </GlassCard>

                    {/* 2. Doctor share */}
                    <GlassCard className="p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    Doctor share
                                </span>
                                <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-primary mt-1 tabular-nums">
                                {permissions.can_view_financials ? formatLKR(animatedDoctorShare, true) : '—'}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                            Channeling disbursements due
                        </p>
                    </GlassCard>

                    {/* 3. Clinic share */}
                    <GlassCard className="p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    Clinic share
                                </span>
                                <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                    <Building2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
                                {permissions.can_view_financials ? formatLKR(animatedClinicShare, true) : '—'}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                            Facility & suite charges retained
                        </p>
                    </GlassCard>

                    {/* 4. Discounts (with refunds as separate small line) */}
                    <GlassCard className="p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    Discounts
                                </span>
                                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <RotateCcw className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                                {permissions.can_view_financials ? formatLKR(animatedDiscount, true) : '—'}
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Refunds:</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {permissions.can_view_financials ? kpis.refund_formatted : '—'}
                            </span>
                        </div>
                    </GlassCard>
                </div>

                {/* Tabs Bar */}
                <div className="border-b border-slate-200/80 dark:border-white/10 pb-2">
                    <Tabs
                        tabs={[
                            { id: 'pending', label: 'Pending', count: pendingBills.length, icon: DollarSign },
                            { id: 'receipts', label: 'Receipts', count: recentReceipts.total, icon: Receipt },
                            { id: 'report', label: 'Daily report', icon: TrendingUp },
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                    />
                </div>

                {/* ======================================================== */}
                {/* TAB 1: PENDING COLLECTIONS */}
                {/* ======================================================== */}
                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        {pendingBills.length === 0 ? (
                            <GlassCard className="py-12">
                                <EmptyState
                                    icon={CheckCircle2}
                                    title="All payments collected"
                                    description="No pending bills waiting for payment right now. New tokens issued at the desk will appear here automatically."
                                    action={
                                        <Link
                                            href="/bookings"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                        >
                                            <Receipt className="w-3.5 h-3.5" />
                                            <span>Issue token</span>
                                        </Link>
                                    }
                                />
                            </GlassCard>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="py-3 px-4 font-bold">Token</th>
                                                <th className="py-3 px-4 font-bold">Patient</th>
                                                <th className="py-3 px-4 font-bold">Doctor & room</th>
                                                <th className="py-3 px-4 font-bold">Doctor fee</th>
                                                <th className="py-3 px-4 font-bold">Clinic fee</th>
                                                <th className="py-3 px-4 font-bold">Amount</th>
                                                <th className="py-3 px-4 font-bold">Time issued</th>
                                                <th className="py-3 px-4 text-right font-bold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {pendingBills.map((b) => (
                                                <tr
                                                    key={b.id}
                                                    className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                                                            #{b.token_number ?? '—'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {b.patient_name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">{b.patient_phone}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {b.doctor_name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {b.room_number} • {b.doctor_specialty}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                                                        {b.doctor_fee_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                                                        {b.clinic_fee_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4 tabular-nums font-black text-primary text-sm">
                                                        {b.total_amount_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                                        {b.created_at_time}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => openCollectPanel(b)}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm transition-all"
                                                        >
                                                            <DollarSign className="w-3.5 h-3.5" />
                                                            <span>Collect</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: PROCESSED RECEIPTS */}
                {/* ======================================================== */}
                {activeTab === 'receipts' && (
                    <div className="space-y-4">
                        {/* Toolbar: Search, Filters, Sort */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                            <div className="flex flex-1 flex-wrap items-center gap-2.5">
                                {/* Search */}
                                <div className="relative min-w-[240px] flex-1">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        placeholder="Search receipt no., patient, token..."
                                        className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => handleSearchChange('')}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Filter: Doctor */}
                                <select
                                    value={selectedDoctorId}
                                    onChange={(e) => {
                                        setSelectedDoctorId(e.target.value);
                                        applyFilters({ doctor_id: e.target.value });
                                    }}
                                    className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="">All doctors</option>
                                    {doctorsList.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} ({d.specialty})
                                        </option>
                                    ))}
                                </select>

                                {/* Filter: Method */}
                                <select
                                    value={selectedMethod}
                                    onChange={(e) => {
                                        setSelectedMethod(e.target.value);
                                        applyFilters({ method: e.target.value });
                                    }}
                                    className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="">All methods</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card / POS</option>
                                    <option value="bank_transfer">Bank transfer</option>
                                </select>

                                {/* Filter: Status */}
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => {
                                        setSelectedStatus(e.target.value);
                                        applyFilters({ status: e.target.value });
                                    }}
                                    className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="">All statuses</option>
                                    <option value="paid">Paid</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Sort:</span>
                                <select
                                    value={selectedSort}
                                    onChange={(e) => {
                                        setSelectedSort(e.target.value);
                                        applyFilters({ sort: e.target.value });
                                    }}
                                    className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                    <option value="amount_high">Highest amount</option>
                                    <option value="amount_low">Lowest amount</option>
                                </select>
                            </div>
                        </div>

                        {/* Receipts Table */}
                        {recentReceipts.data.length === 0 ? (
                            <GlassCard className="py-12">
                                <EmptyState
                                    icon={Receipt}
                                    title="No receipts match your search"
                                    description="No payments match the selected criteria for this date range. Try clearing your filters or selecting a different date."
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setSelectedDoctorId('');
                                                setSelectedMethod('');
                                                setSelectedStatus('');
                                                applyFilters({
                                                    search: '',
                                                    doctor_id: '',
                                                    method: '',
                                                    status: '',
                                                    sort: 'newest',
                                                });
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50"
                                        >
                                            Reset filters
                                        </button>
                                    }
                                />
                            </GlassCard>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="py-3 px-4 font-bold">Receipt no.</th>
                                                <th className="py-3 px-4 font-bold">Date & time</th>
                                                <th className="py-3 px-4 font-bold">Token</th>
                                                <th className="py-3 px-4 font-bold">Patient</th>
                                                <th className="py-3 px-4 font-bold">Doctor</th>
                                                <th className="py-3 px-4 font-bold">Method</th>
                                                <th className="py-3 px-4 font-bold">Discount</th>
                                                <th className="py-3 px-4 font-bold text-right">Total</th>
                                                <th className="py-3 px-4 font-bold">Status</th>
                                                <th className="py-3 px-4 text-right font-bold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {recentReceipts.data.map((b) => (
                                                <tr
                                                    key={b.id}
                                                    onClick={() => openReceiptViewer(b, '80mm')}
                                                    className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                                >
                                                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                        {b.receipt_number || '—'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                                        {b.created_at_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                                            #{b.token_number ?? '—'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                                        {b.patient_name}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {b.doctor_name}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 capitalize font-medium">
                                                            {b.payment_method === 'cash' && (
                                                                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                                            )}
                                                            {b.payment_method === 'card' && (
                                                                <CreditCard className="w-3.5 h-3.5 text-primary" />
                                                            )}
                                                            {b.payment_method === 'bank_transfer' && (
                                                                <Building2 className="w-3.5 h-3.5 text-purple-500" />
                                                            )}
                                                            {b.payment_method.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 tabular-nums">
                                                        {b.discount_lkr > 0 ? (
                                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                                - {b.discount_formatted}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-slate-600">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white tabular-nums text-sm">
                                                        {b.total_amount_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                                b.payment_status === 'paid'
                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                                            }`}
                                                        >
                                                            {b.payment_status}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className="py-3.5 px-4 text-right"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openReceiptViewer(b, '80mm')}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                                                                title="Print 80mm thermal slip"
                                                            >
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openReceiptViewer(b, 'a4')}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                                                                title="Print A4 invoice"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </button>
                                                            {permissions.can_refund && b.payment_status === 'paid' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openRefundModal(b)}
                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                                    title="Process refund"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* Totals row for filtered set */}
                                        <tfoot className="bg-slate-50/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white">
                                            <tr>
                                                <td colSpan={6} className="py-3 px-4 text-xs">
                                                    Filtered totals ({filteredTotals.count} receipts)
                                                </td>
                                                <td className="py-3 px-4 text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                                    {filteredTotals.discount_lkr > 0
                                                        ? `- ${filteredTotals.discount_formatted}`
                                                        : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right text-sm font-black tabular-nums text-primary">
                                                    {filteredTotals.total_amount_formatted}
                                                </td>
                                                <td colSpan={2} />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Pagination Footer */}
                                <div className="p-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                                    <div>
                                        Showing {recentReceipts.from ?? 0}–{recentReceipts.to ?? 0} of{' '}
                                        {recentReceipts.total} receipts
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {recentReceipts.links.map((link, idx) => {
                                            if (!link.url) {
                                                return (
                                                    <span
                                                        key={idx}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                        className="px-2.5 py-1 rounded-lg text-slate-300 dark:text-slate-600 text-xs"
                                                    />
                                                );
                                            }
                                            return (
                                                <Link
                                                    key={idx}
                                                    href={link.url}
                                                    preserveScroll
                                                    preserveState
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                                        link.active
                                                            ? 'bg-primary text-white font-bold'
                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3: DAILY REPORT */}
                {/* ======================================================== */}
                {activeTab === 'report' && (
                    <div className="space-y-6">
                        {/* Method Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <GlassCard className="p-4 border-l-4 border-emerald-500 flex justify-between items-center">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Cash collections
                                    </span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums">
                                        {report.payment_methods.cash.total_formatted}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1 block">
                                        {report.payment_methods.cash.count} transaction(s)
                                    </span>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4 border-l-4 border-primary flex justify-between items-center">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Card / POS collections
                                    </span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums">
                                        {report.payment_methods.card.total_formatted}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1 block">
                                        {report.payment_methods.card.count} transaction(s)
                                    </span>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4 border-l-4 border-purple-500 flex justify-between items-center">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Bank transfer & online
                                    </span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block tabular-nums">
                                        {report.payment_methods.bank_transfer.total_formatted}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1 block">
                                        {report.payment_methods.bank_transfer.count} transaction(s)
                                    </span>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                                    <Building2 className="w-5 h-5" />
                                </div>
                            </GlassCard>
                        </div>

                        {/* Inline SVG Micro-Chart: Hourly Collections */}
                        <GlassCard className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Collections by hour
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Hourly payment activity for {report.display_label}
                                    </p>
                                </div>
                                <div className="text-xs font-bold text-primary tabular-nums">
                                    Peak hour activity
                                </div>
                            </div>

                            {/* SVG Bar Chart */}
                            <div className="pt-2">
                                <div className="w-full h-32 flex items-end gap-2 px-1">
                                    {(() => {
                                        const maxAmount = Math.max(
                                            1,
                                            ...report.hourly_chart.map((h) => h.amount_cents)
                                        );
                                        return report.hourly_chart.map((item, idx) => {
                                            const heightPct = Math.max(
                                                item.amount_cents > 0 ? 10 : 4,
                                                (item.amount_cents / maxAmount) * 100
                                            );
                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex-1 flex flex-col items-center gap-1.5 group relative"
                                                >
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-xl z-20 pointer-events-none">
                                                        {item.label}: {item.amount_formatted} ({item.count} bills)
                                                    </div>

                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-24 flex items-end overflow-hidden p-0.5">
                                                        <div
                                                            style={{ height: `${heightPct}%` }}
                                                            className={`w-full rounded-md transition-all duration-300 ${
                                                                item.amount_cents > 0
                                                                    ? 'bg-gradient-to-t from-primary to-teal-400 group-hover:from-primary-600 group-hover:to-teal-300'
                                                                    : 'bg-transparent'
                                                            }`}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-semibold text-slate-400">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </GlassCard>

                        {/* Split by Doctor Table */}
                        <GlassCard className="space-y-4 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Split by doctor
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Channeling consultations, doctor share, clinic share and totals
                                    </p>
                                </div>
                            </div>

                            {report.doctors_summary.length === 0 ? (
                                <p className="text-xs text-slate-400 py-6 text-center italic">
                                    No completed doctor consultations on this date.
                                </p>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="py-3 px-4 font-bold">Doctor</th>
                                                <th className="py-3 px-4 font-bold">Consultations</th>
                                                <th className="py-3 px-4 font-bold">Doctor share</th>
                                                <th className="py-3 px-4 font-bold">Clinic share</th>
                                                <th className="py-3 px-4 text-right font-bold">Total collected</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {report.doctors_summary.map((d) => (
                                                <tr
                                                    key={d.doctor_id}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span
                                                            style={{ backgroundColor: getDoctorColor(d.doctor_id) }}
                                                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                                        />
                                                        <span>{d.doctor_name}</span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                        {d.consultations_count} consultations
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-primary tabular-nums">
                                                        {d.doctor_fee_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-teal-600 dark:text-teal-400 font-bold tabular-nums">
                                                        {d.clinic_fee_formatted}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white tabular-nums text-sm">
                                                        {d.total_formatted}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* Totals row */}
                                        <tfoot className="bg-slate-50/90 dark:bg-slate-800/90 border-t-2 border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white">
                                            <tr>
                                                <td className="py-3 px-4">All doctors total</td>
                                                <td className="py-3 px-4">
                                                    {report.doctors_summary.reduce((s, d) => s + d.consultations_count, 0)} consultations
                                                </td>
                                                <td className="py-3 px-4 text-primary tabular-nums">
                                                    {formatLKR(
                                                        report.doctors_summary.reduce((s, d) => s + d.doctor_fee_total_cents, 0),
                                                        true
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-teal-600 dark:text-teal-400 tabular-nums">
                                                    {formatLKR(
                                                        report.doctors_summary.reduce((s, d) => s + d.clinic_fee_total_cents, 0),
                                                        true
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right text-sm font-black tabular-nums">
                                                    {formatLKR(
                                                        report.doctors_summary.reduce((s, d) => s + d.total_cents, 0),
                                                        true
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </GlassCard>

                        {/* Bottom Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <p className="text-xs text-slate-400 italic">
                                {report.cash_drawer.message}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-colors shadow-xs"
                                >
                                    <Printer className="w-3.5 h-3.5 text-primary" />
                                    <span>Print daily report (A4)</span>
                                </button>

                                {permissions.can_export && (
                                    <a
                                        href={`/billing/export?start_date=${filters.start_date}&end_date=${filters.end_date}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 transition-colors shadow-xs"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Export CSV</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* SLIDE-OVER SIDE PANEL: COLLECT PAYMENT */}
            {/* ======================================================== */}
            {collectPanelOpen && selectedBillForPay && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setCollectPanelOpen(false)}
                    />

                    {/* Side Panel Content */}
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/90 dark:border-white/10 z-10 flex flex-col h-full animate-in slide-in-from-right duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
                                    Token #{selectedBillForPay.token_number}
                                </span>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                    Collect payment
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {selectedBillForPay.patient_name} • {selectedBillForPay.patient_phone}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCollectPanelOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={submitPayment} className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Bill Breakdown */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                                    Bill breakdown
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Doctor channeling fee:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                                        {selectedBillForPay.doctor_fee_formatted}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Clinic facility fee:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                                        {selectedBillForPay.clinic_fee_formatted}
                                    </span>
                                </div>

                                {selectedBillForPay.bill_items && selectedBillForPay.bill_items.length > 0 && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            Dispensed medicines
                                        </span>
                                        {selectedBillForPay.bill_items.map((med) => (
                                            <div key={med.id} className="flex justify-between text-[11px]">
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    {med.description} (x{med.quantity})
                                                </span>
                                                <span className="tabular-nums font-medium">
                                                    {med.total_price_formatted}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white">
                                    <span>Subtotal:</span>
                                    <span className="tabular-nums">{formatLKR(panelSubtotalLkr * 100)}</span>
                                </div>
                            </div>

                            {/* Payment Method Segmented */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Payment method *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'cash', label: 'Cash', icon: DollarSign },
                                        { id: 'card', label: 'Card / POS', icon: CreditCard },
                                        { id: 'bank_transfer', label: 'Bank transfer', icon: Building2 },
                                    ].map((m) => {
                                        const isSelected = payForm.data.payment_method === m.id;
                                        const Icon = m.icon;
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => payForm.setData('payment_method', m.id)}
                                                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                                                    isSelected
                                                        ? 'border-primary bg-primary-50 dark:bg-primary-950/60 text-primary shadow-xs ring-2 ring-primary/20'
                                                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span>{m.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Discount Input */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Discount (LKR)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={payForm.data.discount_lkr}
                                            onChange={(e) => payForm.setData('discount_lkr', parseFloat(e.target.value) || 0)}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Discount reason
                                        </label>
                                        <input
                                            type="text"
                                            value={payForm.data.discount_reason}
                                            onChange={(e) => payForm.setData('discount_reason', e.target.value)}
                                            placeholder="Senior citizen / staff"
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cash Tender Details (when method is cash) */}
                            {payForm.data.payment_method === 'cash' && (
                                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                            Cash received (LKR)
                                        </label>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                            Quick tender
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={cashReceivedInput}
                                            onChange={(e) => setCashReceivedInput(e.target.value)}
                                            className="w-full text-sm rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 py-2 px-3 text-slate-900 dark:text-white font-black tabular-nums focus:ring-2 focus:ring-emerald-500"
                                        />
                                        {[1000, 2000, 5000].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setCashReceivedInput(String(amt))}
                                                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-200 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                                            >
                                                {amt}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                        <span>Change due:</span>
                                        <span className="text-base font-black tabular-nums">
                                            {formatLKR(changeDueLkr * 100)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Final Amount Payable */}
                            <div className="p-4 rounded-2xl bg-primary-50/80 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800/50 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                        Total payable
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        Auto-assigned gapless receipt sequence
                                    </span>
                                </div>
                                <span className="text-2xl font-black text-primary tabular-nums">
                                    {formatLKR(panelFinalAmountLkr * 100)}
                                </span>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={payForm.processing}
                                    className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>{payForm.processing ? 'Generating receipt...' : 'Mark paid & print'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* SLIDE-OVER SIDE PANEL: RECEIPT PREVIEW (80MM / A4) */}
            {/* ======================================================== */}
            {receiptPreviewOpen && activeReceipt && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setReceiptPreviewOpen(false)}
                    />

                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/90 dark:border-white/10 z-10 flex flex-col h-full animate-in slide-in-from-right duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
                                    Receipt details
                                </span>
                                <h2 className="text-base font-black text-slate-900 dark:text-white">
                                    {activeReceipt.receipt_number || 'Receipt'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReceiptPreviewOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Format Switcher */}
                        <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40 flex justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setReceiptFormat('80mm')}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    receiptFormat === '80mm'
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                                }`}
                            >
                                80mm thermal slip
                            </button>
                            <button
                                type="button"
                                onClick={() => setReceiptFormat('a4')}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    receiptFormat === 'a4'
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                                }`}
                            >
                                A4 tax invoice
                            </button>
                        </div>

                        {/* Printable Area */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {receiptFormat === '80mm' ? (
                                <div className="bg-white text-slate-900 p-6 rounded-2xl border-2 border-dashed border-slate-300 text-center font-mono space-y-3 text-xs shadow-sm">
                                    <div>
                                        <h3 className="font-black text-sm tracking-wider uppercase">
                                            {clinicInfo.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500">{clinicInfo.address}</p>
                                        <p className="text-[10px] text-slate-500">
                                            Reg: {clinicInfo.reg_no} • {clinicInfo.phone}
                                        </p>
                                    </div>

                                    <div className="border-t border-b border-dashed border-slate-300 py-2">
                                        <span className="font-bold text-xs block">
                                            OFFICIAL PAYMENT RECEIPT
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-700 block">
                                            {activeReceipt.receipt_number}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">
                                            Date: {activeReceipt.created_at_formatted}
                                        </span>
                                    </div>

                                    <div className="text-left space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span>Patient:</span>
                                            <span className="font-bold">{activeReceipt.patient_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Token:</span>
                                            <span className="font-bold">#{activeReceipt.token_number}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Doctor:</span>
                                            <span>{activeReceipt.doctor_name}</span>
                                        </div>

                                        {activeReceipt.receipt_lines && activeReceipt.receipt_lines.length > 0 ? (
                                            activeReceipt.receipt_lines.map((line, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between pt-1 border-t border-slate-100"
                                                >
                                                    <span>{line.name}:</span>
                                                    <span className="tabular-nums">
                                                        {line.amount_formatted || formatLKR((line.amount_lkr || 0) * 100)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                <div className="flex justify-between pt-1 border-t border-slate-100">
                                                    <span>Doctor fee:</span>
                                                    <span className="tabular-nums">
                                                        {activeReceipt.doctor_fee_formatted}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Clinic fee:</span>
                                                    <span className="tabular-nums">
                                                        {activeReceipt.clinic_fee_formatted}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {activeReceipt.discount_lkr > 0 && (
                                            <div className="flex justify-between text-rose-600 pt-1">
                                                <span>Discount:</span>
                                                <span className="tabular-nums">
                                                    - {activeReceipt.discount_formatted}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between pt-2 border-t-2 border-slate-900 font-black text-sm">
                                            <span>TOTAL PAID:</span>
                                            <span className="tabular-nums">{activeReceipt.total_amount_formatted}</span>
                                        </div>

                                        <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                                            <span>Method:</span>
                                            <span className="uppercase font-semibold">
                                                {activeReceipt.payment_method}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-3 text-[9px] text-slate-400">
                                        Thank you for visiting MedVisit Clinic.
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 space-y-4 text-xs">
                                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                                        <div>
                                            <h2 className="text-base font-black uppercase tracking-tight">
                                                {clinicInfo.name}
                                            </h2>
                                            <p className="text-[11px] text-slate-500">{clinicInfo.address}</p>
                                            <p className="text-[11px] text-slate-500">
                                                Tel: {clinicInfo.phone} | Reg: {clinicInfo.reg_no}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                                                OFFICIAL TAX INVOICE
                                            </span>
                                            <span className="text-xs font-bold font-mono">
                                                {activeReceipt.receipt_number}
                                            </span>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {activeReceipt.created_at_formatted}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-100 text-xs">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                Patient
                                            </span>
                                            <span className="font-bold">{activeReceipt.patient_name}</span>
                                            <p className="text-slate-500 text-[11px]">{activeReceipt.patient_phone}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                Channeling specialist
                                            </span>
                                            <span className="font-bold">{activeReceipt.doctor_name}</span>
                                            <p className="text-slate-500 text-[11px]">
                                                {activeReceipt.doctor_specialty} • {activeReceipt.room_number}
                                            </p>
                                        </div>
                                    </div>

                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                                            <tr>
                                                <th className="py-2">Item description</th>
                                                <th className="py-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="py-2">Doctor consultation fee</td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {activeReceipt.doctor_fee_formatted}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-2">Clinic facility charge</td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {activeReceipt.clinic_fee_formatted}
                                                </td>
                                            </tr>
                                            {activeReceipt.discount_lkr > 0 && (
                                                <tr className="text-rose-600">
                                                    <td className="py-2">Discount ({activeReceipt.discount_reason || 'Authorized'})</td>
                                                    <td className="py-2 text-right tabular-nums">
                                                        - {activeReceipt.discount_formatted}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot className="border-t-2 border-slate-900 font-bold">
                                            <tr>
                                                <td className="py-2.5 text-xs">Total paid:</td>
                                                <td className="py-2.5 text-right text-sm text-primary font-black tabular-nums">
                                                    {activeReceipt.total_amount_formatted}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="pt-6 flex justify-between items-end text-[10px] text-slate-400">
                                        <div>
                                            Method: <span className="font-bold uppercase text-slate-700">{activeReceipt.payment_method}</span>
                                        </div>
                                        <div className="border-t border-slate-300 pt-1 px-6 text-center text-slate-500">
                                            Cashier signature
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Print Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print receipt</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL: REFUND CONFIRMATION */}
            {/* ======================================================== */}
            <GlassModal
                isOpen={refundModalOpen}
                onClose={() => setRefundModalOpen(false)}
                title="Process receipt refund"
                subtitle="Refund patient payment for cancelled consultation or emergency"
                maxWidth="max-w-md"
            >
                {selectedBillForRefund && (
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-800 dark:text-rose-200">
                            Refund amount: <strong>{selectedBillForRefund.total_amount_formatted}</strong> for{' '}
                            <strong>{selectedBillForRefund.patient_name}</strong> ({selectedBillForRefund.receipt_number}).
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Refund justification reason *
                            </label>
                            <input
                                type="text"
                                required
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="Doctor session cancelled / Emergency refund"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 py-2.5 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setRefundModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitRefund}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md"
                            >
                                Confirm refund
                            </button>
                        </div>
                    </div>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
