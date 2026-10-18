import React, { useState } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Tabs } from '@/Components/UI/Tabs';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { EmptyState } from '@/Components/UI/EmptyState';
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
    AlertCircle,
    Check,
} from 'lucide-react';

interface BillItem {
    id: number;
    receipt_number: string;
    token_number: number;
    token_id: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    room_number: string;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    other_fee_lkr: number;
    discount_lkr: number;
    discount_reason: string | null;
    total_amount_lkr: number;
    total_amount_formatted: string;
    payment_method: string;
    payment_status: string;
    refund_reason: string | null;
    refunded_at: string | null;
    created_at_formatted: string;
    receipt_lines?: Array<{
        name: string;
        type?: string;
        quantity?: number | null;
        unit_price_lkr?: number | null;
        unit_price_formatted?: string | null;
        amount?: number;
        amount_lkr?: number;
        amount_cents?: number;
        amount_formatted?: string;
        recipient?: string;
    }>;
    doctor_payout_amount?: number;
    visit_type_name?: string | null;
    source_levels?: Record<string, string>;
}

interface DailyReport {
    date: string;
    date_formatted: string;
    gross_doctor_fee_lkr: number;
    gross_clinic_fee_lkr: number;
    total_discount_lkr: number;
    total_refund_lkr: number;
    net_collected_lkr: number;
    net_collected_formatted: string;
    payment_methods: {
        cash: { count: number; total_lkr: number };
        card: { count: number; total_lkr: number };
        bank_transfer: { count: number; total_lkr: number };
    };
    doctors_summary: Array<{
        doctor_id: number;
        doctor_name: string;
        consultations_count: number;
        doctor_fee_total_lkr: number;
        clinic_fee_total_lkr: number;
        total_lkr: number;
    }>;
}

interface ClinicInfo {
    name: string;
    phone: string;
    address: string;
    reg_no: string;
}

interface Props {
    pendingBills: BillItem[];
    recentReceipts: BillItem[];
    report: DailyReport;
    selectedDate: string;
    clinicInfo: ClinicInfo;
}

export default function BillingIndex({
    pendingBills,
    recentReceipts,
    report,
    selectedDate,
    clinicInfo,
}: Props) {
    const [activeTab, setActiveTab] = useState<'pending' | 'receipts' | 'report'>('pending');
    const [dateFilter, setDateFilter] = useState(selectedDate);

    // Modals
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBillForPay, setSelectedBillForPay] = useState<BillItem | null>(null);

    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [selectedBillForRefund, setSelectedBillForRefund] = useState<BillItem | null>(null);
    const [refundReason, setRefundReason] = useState('Patient cancelled before consultation');

    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [activeReceipt, setActiveReceipt] = useState<BillItem | null>(null);
    const [receiptFormat, setReceiptFormat] = useState<'80mm' | 'a4'>('80mm');

    // Payment Form
    const payForm = useForm({
        payment_method: 'cash',
        discount_lkr: 0,
        discount_reason: '',
        notes: '',
    });

    const handleDateChange = (newDate: string) => {
        setDateFilter(newDate);
        router.get('/billing', { date: newDate }, { preserveState: true });
    };

    const openPayModal = (b: BillItem) => {
        setSelectedBillForPay(b);
        payForm.setData({
            payment_method: 'cash',
            discount_lkr: 0,
            discount_reason: '',
            notes: '',
        });
        setPaymentModalOpen(true);
    };

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBillForPay) return;

        payForm.post(`/billing/${selectedBillForPay.id}/pay`, {
            onSuccess: () => {
                setPaymentModalOpen(false);
                // Open receipt modal automatically
                setActiveReceipt({
                    ...selectedBillForPay,
                    payment_status: 'paid',
                    payment_method: payForm.data.payment_method,
                    discount_lkr: Number(payForm.data.discount_lkr) || 0,
                    total_amount_formatted: `Rs. ${(
                        selectedBillForPay.doctor_fee_lkr +
                        selectedBillForPay.clinic_fee_lkr -
                        (Number(payForm.data.discount_lkr) || 0)
                    ).toFixed(2)}`,
                });
                setReceiptModalOpen(true);
            },
        });
    };

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

    const openReceiptViewer = (b: BillItem, format: '80mm' | 'a4' = '80mm') => {
        setActiveReceipt(b);
        setReceiptFormat(format);
        setReceiptModalOpen(true);
    };

    // Subtotal calculations for pay modal
    const subtotal = selectedBillForPay
        ? selectedBillForPay.doctor_fee_lkr + selectedBillForPay.clinic_fee_lkr
        : 0;
    const finalAmount = Math.max(0, subtotal - (Number(payForm.data.discount_lkr) || 0));

    return (
        <AuthenticatedLayout>
            <Head title="Billing & Collections" />

            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Clinic Workspace', href: '/dashboard' },
                        { label: 'Billing & Collections' },
                    ]}
                    title="Billing & Collections"
                    subtitle="Process patient payments, print 80mm thermal receipts or A4 tax invoices, and manage doctor disbursements."
                    actions={
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 px-3 py-1.5 rounded-xl text-xs shadow-xs">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="bg-transparent border-0 text-slate-800 dark:text-slate-200 text-xs p-0 focus:ring-0 cursor-pointer"
                                />
                            </div>

                            <Link
                                href="/billing/payouts"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                            >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Doctor Payouts</span>
                            </Link>

                            <Link
                                href="/bookings"
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-600 shadow-xs"
                            >
                                <span>Issue Token</span>
                            </Link>
                        </div>
                    }
                />

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Net Collections ({report.date_formatted})
                            </span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
                                {report.net_collected_formatted}
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Doctor Fees (Disbursement)
                            </span>
                            <span className="text-2xl font-black text-primary mt-0.5 block">
                                Rs. {report.gross_doctor_fee_lkr.toFixed(2)}
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Clinic Share (Retained)
                            </span>
                            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                                Rs. {report.gross_clinic_fee_lkr.toFixed(2)}
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                            <Building2 className="w-6 h-6" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Discounts / Refunds
                            </span>
                            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                                Rs. {(report.total_discount_lkr + report.total_refund_lkr).toFixed(2)}
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                            <RotateCcw className="w-6 h-6" />
                        </div>
                    </GlassCard>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200/80 dark:border-white/10 pb-4">
                    <Tabs
                        tabs={[
                            { id: 'pending', label: 'Pending Collections', count: pendingBills.length, icon: DollarSign },
                            { id: 'receipts', label: 'Processed Receipts', count: recentReceipts.length, icon: Receipt },
                            { id: 'report', label: 'Daily Collections Report', icon: TrendingUp },
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                    />
                </div>

                {/* TAB 1: PENDING COLLECTIONS */}
                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        {pendingBills.length === 0 ? (
                            <GlassCard className="py-8">
                                <EmptyState
                                    icon={CheckCircle2}
                                    title="All patient payments cleared"
                                    description="No pending bills are waiting for payment collection right now. New tokens issued at the desk will appear here automatically."
                                    action={
                                        <Link
                                            href="/bookings"
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                        >
                                            <Receipt className="w-3.5 h-3.5" />
                                            <span>Issue New Token</span>
                                        </Link>
                                    }
                                />
                            </GlassCard>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Receipt #</th>
                                            <th className="py-3 px-4">Token</th>
                                            <th className="py-3 px-4">Patient</th>
                                            <th className="py-3 px-4">Doctor & Room</th>
                                            <th className="py-3 px-4">Doctor Fee</th>
                                            <th className="py-3 px-4">Clinic Fee</th>
                                            <th className="py-3 px-4">Total Amount</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {pendingBills.map((b) => (
                                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                    {b.receipt_number}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                                        #{b.token_number}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {b.patient_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">{b.patient_phone}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                                        {b.doctor_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">{b.room_number}</span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    Rs. {b.doctor_fee_lkr.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    Rs. {b.clinic_fee_lkr.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 font-extrabold text-primary">
                                                    {b.total_amount_formatted}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openPayModal(b)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm transition-all"
                                                    >
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        <span>Collect Payment</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: PROCESSED RECEIPTS */}
                {activeTab === 'receipts' && (
                    <div className="space-y-4">
                        {recentReceipts.length === 0 ? (
                            <GlassCard className="py-8">
                                <EmptyState
                                    icon={Receipt}
                                    title={`No receipts processed on ${report.date_formatted}`}
                                    description="No patient payments have been collected for this date. Check pending tokens or select a different calendar date."
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 shadow-xs"
                                        >
                                            <span>Go to today</span>
                                        </button>
                                    }
                                />
                            </GlassCard>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Receipt #</th>
                                            <th className="py-3 px-4">Token</th>
                                            <th className="py-3 px-4">Patient</th>
                                            <th className="py-3 px-4">Doctor</th>
                                            <th className="py-3 px-4">Method</th>
                                            <th className="py-3 px-4">Discount</th>
                                            <th className="py-3 px-4">Paid Total</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Print & Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {recentReceipts.map((b) => (
                                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                    {b.receipt_number}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-primary">
                                                    #{b.token_number}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {b.patient_name}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    {b.doctor_name}
                                                </td>
                                                <td className="py-3 px-4 capitalize font-medium text-slate-700 dark:text-slate-300">
                                                    {b.payment_method.replace('_', ' ')}
                                                </td>
                                                <td className="py-3 px-4 text-amber-600 dark:text-amber-400">
                                                    {b.discount_lkr > 0 ? `Rs. ${b.discount_lkr.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                    {b.total_amount_formatted}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                            b.payment_status === 'paid'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        {b.payment_status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openReceiptViewer(b, '80mm')}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40"
                                                            title="Print 80mm Thermal Slip"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => openReceiptViewer(b, 'a4')}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                                                            title="Print A4 Tax Invoice"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>

                                                        {b.payment_status === 'paid' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openRefundModal(b)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                                title="Process Refund"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: DAILY COLLECTIONS REPORT */}
                {activeTab === 'report' && (
                    <div className="space-y-6">
                        {/* Summary by payment method */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <GlassCard className="p-4 border-l-4 border-emerald-500">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Cash Collections
                                </span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                                    Rs. {report.payment_methods.cash.total_lkr.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500 mt-1 block">
                                    {report.payment_methods.cash.count} transaction(s)
                                </span>
                            </GlassCard>

                            <GlassCard className="p-4 border-l-4 border-blue-500">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Card Collections
                                </span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                                    Rs. {report.payment_methods.card.total_lkr.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500 mt-1 block">
                                    {report.payment_methods.card.count} transaction(s)
                                </span>
                            </GlassCard>

                            <GlassCard className="p-4 border-l-4 border-purple-500">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Bank Transfer / Online
                                </span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                                    Rs. {report.payment_methods.bank_transfer.total_lkr.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500 mt-1 block">
                                    {report.payment_methods.bank_transfer.count} transaction(s)
                                </span>
                            </GlassCard>
                        </div>

                        {/* Breakdown by Doctor */}
                        <GlassCard className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Revenue & Channeling Split by Doctor
                            </h3>

                            {report.doctors_summary.length === 0 ? (
                                <p className="text-xs text-slate-400 py-6 text-center italic">
                                    No completed doctor consultations on this date.
                                </p>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="py-3 px-4">Doctor</th>
                                                <th className="py-3 px-4">Channeling Consultations</th>
                                                <th className="py-3 px-4">Doctor Disbursement (Fee)</th>
                                                <th className="py-3 px-4">Clinic Share</th>
                                                <th className="py-3 px-4 text-right">Total Net Collected</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                            {report.doctors_summary.map((d) => (
                                                <tr key={d.doctor_id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                        {d.doctor_name}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                        {d.consultations_count} patients
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-primary">
                                                        Rs. {d.doctor_fee_total_lkr.toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-4 text-cyan-600 dark:text-cyan-400 font-bold">
                                                        Rs. {d.clinic_fee_total_lkr.toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                                                        Rs. {d.total_lkr.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                )}
            </div>

            {/* MODAL 1: PAYMENT COLLECTION MODAL */}
            <GlassModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                title={selectedBillForPay ? `Collect Payment: ${selectedBillForPay.receipt_number}` : 'Collect Payment'}
                subtitle="Select payment method, apply clinical discount if authorized, and issue receipt"
                maxWidth="max-w-md"
            >
                {selectedBillForPay && (
                    <form onSubmit={submitPayment} className="space-y-4">
                        {/* Summary breakdown */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Patient:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {selectedBillForPay.patient_name} (Token #{selectedBillForPay.token_number})
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Doctor:</span>
                                <span>{selectedBillForPay.doctor_name}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                                <span className="text-slate-500">Doctor Channeling Fee:</span>
                                <span>Rs. {selectedBillForPay.doctor_fee_lkr.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Clinic Consultation Fee:</span>
                                <span>Rs. {selectedBillForPay.clinic_fee_lkr.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                                <span>Subtotal:</span>
                                <span>Rs. {subtotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Payment Method *
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'cash', label: 'Cash', icon: DollarSign },
                                    { id: 'card', label: 'Card / POS', icon: CreditCard },
                                    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                                ].map((m) => {
                                    const isSelected = payForm.data.payment_method === m.id;
                                    const Icon = m.icon;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => payForm.setData('payment_method', m.id)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                                                isSelected
                                                    ? 'border-primary bg-primary-50 text-primary dark:bg-primary-950/60 shadow-xs'
                                                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span>{m.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Discount */}
                        <div className="space-y-2 pt-1">
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
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Discount Justification
                                    </label>
                                    <input
                                        type="text"
                                        value={payForm.data.discount_reason}
                                        onChange={(e) => payForm.setData('discount_reason', e.target.value)}
                                        placeholder="e.g. Senior Citizen / Staff"
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Final Net Amount */}
                        <div className="p-3 rounded-2xl bg-primary-50/70 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/40 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Total Payable:</span>
                            <span className="text-xl font-black text-primary">Rs. {finalAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setPaymentModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={payForm.processing}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                            >
                                {payForm.processing ? 'Processing...' : 'Collect & Issue Receipt'}
                            </button>
                        </div>
                    </form>
                )}
            </GlassModal>

            {/* MODAL 2: REFUND MODAL */}
            <GlassModal
                isOpen={refundModalOpen}
                onClose={() => setRefundModalOpen(false)}
                title="Process Receipt Refund"
                subtitle="Refund payment to patient for cancelled channeling or emergency"
                maxWidth="max-w-md"
            >
                {selectedBillForRefund && (
                    <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-200">
                            Refund amount: <strong>{selectedBillForRefund.total_amount_formatted}</strong> for{' '}
                            {selectedBillForRefund.patient_name} ({selectedBillForRefund.receipt_number}).
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Refund Justification Reason *
                            </label>
                            <input
                                type="text"
                                required
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="e.g. Doctor cancelled / Patient unable to attend"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
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
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md"
                            >
                                Confirm Refund
                            </button>
                        </div>
                    </div>
                )}
            </GlassModal>

            {/* MODAL 3: PRINTABLE RECEIPT VIEWER (80MM / A4) */}
            <GlassModal
                isOpen={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                title="Receipt & Tax Invoice"
                subtitle="Print official patient receipt in 80mm thermal or standard A4 format"
                maxWidth={receiptFormat === 'a4' ? 'max-w-2xl' : 'max-w-md'}
            >
                {activeReceipt && (
                    <div className="space-y-4">
                        {/* Format Switcher */}
                        <div className="flex justify-center gap-2 pb-2">
                            <button
                                type="button"
                                onClick={() => setReceiptFormat('80mm')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    receiptFormat === '80mm'
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                80mm Thermal Receipt
                            </button>
                            <button
                                type="button"
                                onClick={() => setReceiptFormat('a4')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    receiptFormat === 'a4'
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                A4 Official Invoice
                            </button>
                        </div>

                        {/* RECEIPT CONTENT */}
                        {receiptFormat === '80mm' ? (
                            <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 text-center font-mono space-y-3 text-xs shadow-inner">
                                <div>
                                    <h3 className="font-bold text-sm tracking-wider uppercase">
                                        {clinicInfo.name}
                                    </h3>
                                    <p className="text-[10px] text-slate-500">{clinicInfo.address}</p>
                                    <p className="text-[10px] text-slate-500">Reg: {clinicInfo.reg_no} • {clinicInfo.phone}</p>
                                </div>

                                <div className="border-t border-b border-dashed border-slate-300 py-2 my-2">
                                    <span className="font-bold text-xs block">
                                        OFFICIAL PAYMENT RECEIPT
                                    </span>
                                    <span className="text-[11px] text-slate-600 block">
                                        Receipt #{activeReceipt.receipt_number}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block">
                                        Date: {activeReceipt.created_at_formatted}
                                    </span>
                                </div>

                                <div className="text-left space-y-1">
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
                                    {activeReceipt.visit_type_name && (
                                        <div className="flex justify-between">
                                            <span>Visit Type:</span>
                                            <span className="font-semibold">{activeReceipt.visit_type_name}</span>
                                        </div>
                                    )}

                                    {activeReceipt.receipt_lines && activeReceipt.receipt_lines.length > 0 ? (
                                        activeReceipt.receipt_lines.map((line: any, idx: number) => (
                                            <div key={idx} className="flex justify-between pt-1 border-t border-slate-100 first:border-t first:border-slate-200">
                                                <span>{line.name} <span className="text-[10px] text-slate-400 font-normal">({line.recipient || 'clinic'})</span>:</span>
                                                <span>{line.amount_formatted || `Rs. ${(line.amount_lkr ?? ((line.amount ?? 0) / 100)).toFixed(2)}`}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <div className="flex justify-between pt-1 border-t border-slate-200">
                                                <span>Doctor Fee:</span>
                                                <span>Rs. {activeReceipt.doctor_fee_lkr.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Clinic Fee:</span>
                                                <span>Rs. {activeReceipt.clinic_fee_lkr.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}

                                    {activeReceipt.discount_lkr > 0 && (
                                        <div className="flex justify-between text-rose-600">
                                            <span>Discount ({activeReceipt.discount_reason || 'Manual'}):</span>
                                            <span>- Rs. {activeReceipt.discount_lkr.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-1 border-t-2 border-slate-900 font-extrabold text-sm">
                                        <span>TOTAL PAID:</span>
                                        <span>{activeReceipt.total_amount_formatted}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                                        <span>Payment Mode:</span>
                                        <span className="uppercase">{activeReceipt.payment_method}</span>
                                    </div>
                                </div>

                                <div className="pt-2 text-[9px] text-slate-400">
                                    Thank you for channeling with MedVisit.
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 space-y-4 text-xs">
                                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase">
                                            {clinicInfo.name}
                                        </h2>
                                        <p className="text-slate-500">{clinicInfo.address}</p>
                                        <p className="text-slate-500">Tel: {clinicInfo.phone} | Registration: {clinicInfo.reg_no}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                                            INVOICE / RECEIPT
                                        </span>
                                        <span className="text-sm font-bold font-mono">
                                            {activeReceipt.receipt_number}
                                        </span>
                                        <p className="text-slate-400 text-[11px] mt-0.5">{activeReceipt.created_at_formatted}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                            Billed To Patient:
                                        </span>
                                        <span className="font-bold text-sm">{activeReceipt.patient_name}</span>
                                        <p className="text-slate-500">{activeReceipt.patient_phone}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                            Channeling Doctor:
                                        </span>
                                        <span className="font-bold text-sm">{activeReceipt.doctor_name}</span>
                                        <p className="text-slate-500">{activeReceipt.doctor_specialty} • Room {activeReceipt.room_number}</p>
                                    </div>
                                </div>

                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                                        <tr>
                                            <th className="py-2">Item Description</th>
                                            <th className="py-2 text-right">Amount (LKR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activeReceipt.receipt_lines && activeReceipt.receipt_lines.length > 0 ? (
                                            activeReceipt.receipt_lines.map((line: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="py-2.5">
                                                        {line.name} <span className="text-[10px] text-slate-400 uppercase font-semibold">({line.recipient || 'clinic'})</span>
                                                    </td>
                                                    <td className="py-2.5 text-right font-medium">
                                                        {line.amount_formatted || `Rs. ${(line.amount_lkr ?? ((line.amount ?? 0) / 100)).toFixed(2)}`}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <>
                                                <tr>
                                                    <td className="py-2.5">
                                                        Specialist Consultation Fee (Doctor Share)
                                                    </td>
                                                    <td className="py-2.5 text-right font-medium">
                                                        Rs. {activeReceipt.doctor_fee_lkr.toFixed(2)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2.5">
                                                        Clinic Channeling & Suite Facility Charge
                                                    </td>
                                                    <td className="py-2.5 text-right font-medium">
                                                        Rs. {activeReceipt.clinic_fee_lkr.toFixed(2)}
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                        {activeReceipt.discount_lkr > 0 && (
                                            <tr className="text-rose-600">
                                                <td className="py-2.5">
                                                    Special Discount ({activeReceipt.discount_reason || 'Authorized'})
                                                </td>
                                                <td className="py-2.5 text-right font-medium">
                                                    - Rs. {activeReceipt.discount_lkr.toFixed(2)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="border-t-2 border-slate-900 font-bold">
                                        <tr>
                                            <td className="py-3 text-sm">TOTAL AMOUNT PAID:</td>
                                            <td className="py-3 text-right text-base text-primary font-black">
                                                {activeReceipt.total_amount_formatted}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <div className="pt-8 flex justify-between items-end text-[11px] text-slate-400">
                                    <div>
                                        Payment Method: <span className="font-bold uppercase text-slate-700">{activeReceipt.payment_method}</span>
                                    </div>
                                    <div className="border-t border-slate-300 pt-1 px-8 text-center text-slate-500">
                                        Authorized Cashier Signature
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Print Button */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print Receipt</span>
                            </button>
                        </div>
                    </div>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
