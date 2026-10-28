import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    DollarSign,
    Wallet,
    Calendar,
    Users,
    Printer,
    CheckCircle,
    Clock,
    AlertCircle,
    Search,
    Receipt,
    Plus,
    Building2,
    FileText,
    ArrowUpRight,
    TrendingUp,
    Check,
} from 'lucide-react';

interface SettlementItem {
    id: number;
    settlement_number: string;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    period_start: string;
    period_end: string;
    sessions_count: number;
    patients_seen: number;
    no_shows_count: number;
    gross_collected_lkr: number;
    doctor_payout_amount_lkr: number;
    doctor_payout_formatted: string;
    clinic_amount_lkr: number;
    paid_amount_lkr: number;
    balance_due_lkr: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    payment_method: string | null;
    payment_reference: string | null;
    paid_at: string | null;
    notes: string | null;
    created_at: string;
    created_by_name: string;
}

interface SessionItem {
    id: number;
    doctor_id: number;
    doctor_name: string;
    session_date: string;
    session_date_raw: string;
    start_time: string;
    room_number: string;
    patients_seen: number;
    no_shows: number;
    gross_collected_lkr: number;
    doctor_payout_lkr: number;
    clinic_share_lkr: number;
    is_settled: boolean;
    payout_type: string;
}

interface Props {
    doctors: { id: number; name: string; title: string; specialty: string }[];
    selectedDoctorId: number | null;
    isDoctorRole: boolean;
    filters: {
        start_date: string;
        end_date: string;
        doctor_id: number | null;
    };
    settlements: SettlementItem[];
    sessions: SessionItem[];
    summary: {
        total_sessions: number;
        total_patients: number;
        total_no_shows: number;
        gross_collected_lkr: number;
        gross_collected_formatted: string;
        doctor_payout_due_lkr: number;
        doctor_payout_due_formatted: string;
        clinic_share_lkr: number;
        clinic_share_formatted: string;
        paid_amount_lkr: number;
        paid_amount_formatted: string;
        outstanding_balance_lkr: number;
        outstanding_balance_formatted: string;
    };
    clinicInfo: {
        name: string;
        phone: string;
        address: string;
    };
    hideClinicShare?: boolean;
}

export default function DoctorPayouts({
    doctors,
    selectedDoctorId,
    isDoctorRole,
    filters,
    settlements,
    sessions,
    summary,
    clinicInfo,
    hideClinicShare = false,
}: Props) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [doctorId, setDoctorId] = useState(filters.doctor_id ? String(filters.doctor_id) : '');

    // Modals
    const [isCreateSettlementOpen, setIsCreateSettlementOpen] = useState(false);
    const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
    const [selectedSettlementForPayment, setSelectedSettlementForPayment] = useState<SettlementItem | null>(null);
    const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
    const [slipData, setSlipData] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'sessions' | 'settlements'>('sessions');

    // Create Settlement Form
    const settlementForm = useForm({
        doctor_id: doctorId || (doctors[0]?.id ? String(doctors[0].id) : ''),
        doctor_session_id: '' as string | number,
        period_start: startDate,
        period_end: endDate,
        sessions_count: summary.total_sessions,
        patients_seen: summary.total_patients,
        no_shows_count: summary.total_no_shows,
        gross_collected_lkr: summary.gross_collected_lkr,
        doctor_payout_amount_lkr: summary.doctor_payout_due_lkr,
        paid_amount_lkr: summary.doctor_payout_due_lkr,
        payment_method: 'bank_transfer',
        payment_reference: '',
        notes: '',
    });

    // Payment Form
    const paymentForm = useForm({
        payment_amount_lkr: 0,
        payment_method: 'bank_transfer',
        payment_reference: '',
        notes: '',
    });

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/billing/payouts',
            {
                start_date: startDate,
                end_date: endDate,
                doctor_id: doctorId || undefined,
            },
            { preserveState: true }
        );
    };

    const openSettleSession = (sess: SessionItem) => {
        settlementForm.setData({
            doctor_id: String(sess.doctor_id),
            doctor_session_id: sess.id,
            period_start: sess.session_date_raw,
            period_end: sess.session_date_raw,
            sessions_count: 1,
            patients_seen: sess.patients_seen,
            no_shows_count: sess.no_shows,
            gross_collected_lkr: sess.gross_collected_lkr,
            doctor_payout_amount_lkr: sess.doctor_payout_lkr,
            paid_amount_lkr: sess.doctor_payout_lkr,
            payment_method: 'bank_transfer',
            payment_reference: '',
            notes: `Settlement for session on ${sess.session_date}`,
        });
        setIsCreateSettlementOpen(true);
    };

    const handleCreateSettlement = (e: React.FormEvent) => {
        e.preventDefault();
        settlementForm.post('/billing/payouts', {
            onSuccess: () => setIsCreateSettlementOpen(false),
        });
    };

    const openRecordPayment = (s: SettlementItem) => {
        setSelectedSettlementForPayment(s);
        paymentForm.setData({
            payment_amount_lkr: s.balance_due_lkr,
            payment_method: 'bank_transfer',
            payment_reference: '',
            notes: '',
        });
        setIsRecordPaymentOpen(true);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSettlementForPayment) return;
        paymentForm.post(`/billing/payouts/${selectedSettlementForPayment.id}/pay`, {
            onSuccess: () => setIsRecordPaymentOpen(false),
        });
    };

    const openPrintSlip = async (s: SettlementItem) => {
        try {
            const resp = await fetch(`/billing/payouts/slip/${s.id}`);
            const data = await resp.json();
            setSlipData(data);
            setIsSlipModalOpen(true);
        } catch (e) {
            alert('Failed to load settlement slip details.');
        }
    };

    const handlePrintWindow = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout>
            <Head title="Doctor Payouts & Settlements - MedVisit" />

            <div className="space-y-6">
                <PageHeader
                    title={isDoctorRole ? 'My Channeling Settlements' : 'Doctor Payouts & Settlements'}
                    subtitle="Track doctor revenue shares, calculate per-session or per-patient compensation, and record bank or cash disbursements"
                    actions={
                        !isDoctorRole && (
                            <button
                                type="button"
                                onClick={() => {
                                    settlementForm.setData({
                                        doctor_id: doctorId || (doctors[0]?.id ? String(doctors[0].id) : ''),
                                        doctor_session_id: '',
                                        period_start: startDate,
                                        period_end: endDate,
                                        sessions_count: summary.total_sessions,
                                        patients_seen: summary.total_patients,
                                        no_shows_count: summary.total_no_shows,
                                        gross_collected_lkr: summary.gross_collected_lkr,
                                        doctor_payout_amount_lkr: summary.outstanding_balance_lkr || summary.doctor_payout_due_lkr,
                                        paid_amount_lkr: summary.outstanding_balance_lkr || summary.doctor_payout_due_lkr,
                                        payment_method: 'bank_transfer',
                                        payment_reference: '',
                                        notes: `Settlement for period ${startDate} to ${endDate}`,
                                    });
                                    setIsCreateSettlementOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Record Date Range Payout</span>
                            </button>
                        )
                    }
                />

                {/* Filters Bar */}
                <GlassCard className="p-4">
                    <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3 text-xs">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        {!isDoctorRole && (
                            <div className="min-w-[200px]">
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Doctor
                                </label>
                                <GlassSelect
                                    value={doctorId}
                                    onChange={(e) => setDoctorId(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Doctors' },
                                        ...doctors.map((d) => ({
                                            value: String(d.id),
                                            label: `${d.title} ${d.name} (${d.specialty})`,
                                        })),
                                    ]}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 transition-colors shadow-sm"
                        >
                            Filter
                        </button>
                    </form>
                </GlassCard>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <GlassCard className="p-4">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-primary" />
                            Gross Channeling
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            {summary.gross_collected_formatted}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            {summary.total_sessions} sessions • {summary.total_patients} patients seen
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 border-l-4 border-l-emerald-500">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            Doctor Payout Due
                        </div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {summary.doctor_payout_due_formatted}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Calculated per payout rules
                        </div>
                    </GlassCard>

                    {!hideClinicShare ? (
                        <GlassCard className="p-4 border-l-4 border-l-primary">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-primary" />
                                Clinic Retained Share
                            </div>
                            <div className="text-xl font-black text-primary mt-1">
                                {summary.clinic_share_formatted}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Channeling & facility margins
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard className="p-4 border-l-4 border-l-teal-500">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-teal-600" />
                                Disbursed / Paid
                            </div>
                            <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">
                                {summary.paid_amount_formatted}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Received doctor payouts
                            </div>
                        </GlassCard>
                    )}

                    <GlassCard className="p-4 border-l-4 border-l-amber-500">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Outstanding Balance
                        </div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                            {summary.outstanding_balance_formatted}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Disbursed: {summary.paid_amount_formatted}
                        </div>
                    </GlassCard>
                </div>

                {/* Sub Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('sessions')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'sessions'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        Channeling Sessions Breakdown ({sessions.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('settlements')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'settlements'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        Settlements & Disbursements History ({settlements.length})
                    </button>
                </div>

                {/* TAB 1: SESSIONS BREAKDOWN */}
                {activeTab === 'sessions' && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Date & Time</th>
                                        <th className="py-3 px-4">Doctor</th>
                                        <th className="py-3 px-4">Patients Seen</th>
                                        <th className="py-3 px-4">No-Shows</th>
                                        <th className="py-3 px-4">Gross Collected</th>
                                        <th className="py-3 px-4">Doctor Payout Due</th>
                                        {!hideClinicShare && <th className="py-3 px-4">Clinic Margin</th>}
                                        <th className="py-3 px-4">Status</th>
                                        {!isDoctorRole && <th className="py-3 px-4 text-right">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {sessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={hideClinicShare ? (isDoctorRole ? 7 : 8) : (isDoctorRole ? 8 : 9)} className="py-8 text-center text-slate-400 text-xs">
                                                No channeling sessions found in this date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        sessions.map((sess) => (
                                            <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {sess.session_date}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {sess.start_time} • {sess.room_number}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                                    {sess.doctor_name}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                                                    {sess.patients_seen}
                                                </td>
                                                <td className="py-3 px-4 text-slate-500">
                                                    {sess.no_shows}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                                    Rs. {((sess.gross_collected_lkr ?? (sess as any).consultation_gross_lkr) ?? 0).toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                                                    Rs. {((sess.doctor_payout_lkr ?? (sess as any).doctor_share_lkr) ?? 0).toFixed(2)}
                                                </td>
                                                {!hideClinicShare && (
                                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                        Rs. {(sess.clinic_share_lkr ?? 0).toFixed(2)}
                                                    </td>
                                                )}
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        sess.is_settled
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                    }`}>
                                                        {sess.is_settled ? 'Settled' : 'Unsettled'}
                                                    </span>
                                                </td>
                                                {!isDoctorRole && (
                                                    <td className="py-3 px-4 text-right">
                                                        {!sess.is_settled && ((sess.doctor_payout_lkr ?? (sess as any).doctor_share_lkr) ?? 0) > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openSettleSession(sess)}
                                                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                                            >
                                                                Settle Now
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: SETTLEMENTS HISTORY */}
                {activeTab === 'settlements' && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Settlement #</th>
                                        <th className="py-3 px-4">Doctor</th>
                                        <th className="py-3 px-4">Period</th>
                                        <th className="py-3 px-4">Sessions / Pts</th>
                                        <th className="py-3 px-4">Total Due</th>
                                        <th className="py-3 px-4">Paid</th>
                                        <th className="py-3 px-4">Balance</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Slip & Payment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {settlements.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                                                No settlements recorded in this date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        settlements.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                    {s.settlement_number}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                                    {s.doctor_name}
                                                </td>
                                                <td className="py-3 px-4 text-slate-500">
                                                    {s.period_start} – {s.period_end}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                                                    {s.sessions_count} sess • {s.patients_seen} pts
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                    {s.doctor_payout_formatted}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    Rs. {(s.paid_amount_lkr ?? 0).toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-amber-600">
                                                    Rs. {(s.balance_due_lkr ?? 0).toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        s.payment_status === 'paid'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : s.payment_status === 'partial'
                                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                    }`}>
                                                        {s.payment_status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right space-x-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openPrintSlip(s)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-colors"
                                                    >
                                                        <Printer className="w-3 h-3" />
                                                        <span>Slip</span>
                                                    </button>
                                                    {!isDoctorRole && s.payment_status !== 'paid' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openRecordPayment(s)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                                        >
                                                            <span>Record Pay</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* RECORD SETTLEMENT MODAL */}
            <GlassModal
                isOpen={isCreateSettlementOpen}
                onClose={() => setIsCreateSettlementOpen(false)}
                title="Record Doctor Settlement"
                subtitle="Generate payout record and record disbursement to the specialist"
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleCreateSettlement} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Doctor *
                            </label>
                            <GlassSelect
                                value={settlementForm.data.doctor_id}
                                onChange={(e) => settlementForm.setData('doctor_id', e.target.value)}
                                options={doctors.map((d) => ({
                                    value: String(d.id),
                                    label: `${d.title} ${d.name}`,
                                }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Payment Method *
                            </label>
                            <GlassSelect
                                value={settlementForm.data.payment_method}
                                onChange={(e) => settlementForm.setData('payment_method', e.target.value)}
                                options={[
                                    { value: 'bank_transfer', label: 'Bank Transfer (SLIPS / CEFT)' },
                                    { value: 'cash', label: 'Cash Disbursement' },
                                    { value: 'cheque', label: 'Company Cheque' },
                                    { value: 'card', label: 'Credit / Debit Card' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Channeling</span>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                Rs. {(Number(settlementForm.data.gross_collected_lkr) || 0).toFixed(2)}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Doctor Payout Due</span>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                Rs. {(Number(settlementForm.data.doctor_payout_amount_lkr) || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Amount Paid Now (LKR) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="50"
                                required
                                value={settlementForm.data.paid_amount_lkr}
                                onChange={(e) => settlementForm.setData('paid_amount_lkr', parseFloat(e.target.value) || 0)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Bank Ref / Cheque #
                            </label>
                            <input
                                type="text"
                                value={settlementForm.data.payment_reference}
                                onChange={(e) => settlementForm.setData('payment_reference', e.target.value)}
                                placeholder="e.g. CEFT-984210"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Settlement Notes / Memo
                        </label>
                        <input
                            type="text"
                            value={settlementForm.data.notes}
                            onChange={(e) => settlementForm.setData('notes', e.target.value)}
                            placeholder="Optional memo or description..."
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsCreateSettlementOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={settlementForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                        >
                            Record Settlement
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* RECORD PARTIAL PAYMENT MODAL */}
            <GlassModal
                isOpen={isRecordPaymentOpen}
                onClose={() => setIsRecordPaymentOpen(false)}
                title="Record Settlement Payment"
                subtitle={selectedSettlementForPayment ? `Settlement ${selectedSettlementForPayment.settlement_number} - Balance: Rs. ${(selectedSettlementForPayment.balance_due_lkr ?? 0).toFixed(2)}` : ''}
                maxWidth="max-w-md"
            >
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Disbursement Amount (LKR) *
                        </label>
                        <input
                            type="number"
                            min="1"
                            step="50"
                            required
                            value={paymentForm.data.payment_amount_lkr}
                            onChange={(e) => paymentForm.setData('payment_amount_lkr', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Payment Method *
                        </label>
                        <GlassSelect
                            value={paymentForm.data.payment_method}
                            onChange={(e) => paymentForm.setData('payment_method', e.target.value)}
                            options={[
                                { value: 'bank_transfer', label: 'Bank Transfer (CEFT / SLIPS)' },
                                { value: 'cash', label: 'Cash' },
                                { value: 'cheque', label: 'Cheque' },
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Payment Reference #
                        </label>
                        <input
                            type="text"
                            value={paymentForm.data.payment_reference}
                            onChange={(e) => paymentForm.setData('payment_reference', e.target.value)}
                            placeholder="e.g. CEFT-872910"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsRecordPaymentOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={paymentForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                        >
                            Save Payment
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* PRINTABLE SETTLEMENT SLIP MODAL */}
            <GlassModal
                isOpen={isSlipModalOpen}
                onClose={() => setIsSlipModalOpen(false)}
                title="Doctor Settlement Slip"
                subtitle="Official payout voucher and reconciliation statement"
                maxWidth="max-w-2xl"
            >
                {slipData && (
                    <div className="space-y-6">
                        {/* Printable Voucher Box */}
                        <div id="settlement-print-slip" className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl space-y-5 text-slate-900 dark:text-white print:p-0 print:border-none">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                                <div>
                                    <h2 className="text-base font-black tracking-tight">{slipData.clinic.name}</h2>
                                    <p className="text-xs text-slate-500">{slipData.clinic.address}</p>
                                    <p className="text-xs text-slate-500">Phone: {slipData.clinic.phone}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-primary">{slipData.settlement.settlement_number}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Date: {slipData.settlement.created_at}</div>
                                    <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                        {slipData.settlement.payment_status}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Consultant Specialist:</span>
                                    <div className="font-bold text-sm text-slate-900 mt-0.5">{slipData.settlement.doctor_name}</div>
                                    <div className="text-slate-500 text-[11px]">{slipData.settlement.doctor_specialty} • SLMC #{slipData.settlement.slmc_number}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Reconciliation Period:</span>
                                    <div className="font-bold text-slate-800 mt-0.5">{slipData.settlement.period_start} – {slipData.settlement.period_end}</div>
                                    <div className="text-slate-500 text-[11px]">Sessions: {slipData.settlement.sessions_count} • Consultations: {slipData.settlement.patients_seen}</div>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                                        <tr>
                                            <th className="py-2 px-3">Description</th>
                                            <th className="py-2 px-3 text-right">Amount (LKR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        <tr>
                                            <td className="py-2 px-3 font-sans">Total Gross Channeling Receipts</td>
                                            <td className="py-2 px-3 text-right font-bold">{slipData.settlement.gross_collected_formatted}</td>
                                        </tr>
                                        {!hideClinicShare && (
                                            <tr>
                                                <td className="py-2 px-3 font-sans">Clinic Facility & Service Margin</td>
                                                <td className="py-2 px-3 text-right text-slate-500">(-) {slipData.settlement.clinic_amount_formatted}</td>
                                            </tr>
                                        )}
                                        <tr className="bg-emerald-50/50 font-bold">
                                            <td className="py-2 px-3 font-sans text-emerald-900">Total Doctor Payout Entitlement</td>
                                            <td className="py-2 px-3 text-right text-emerald-900">{slipData.settlement.doctor_payout_formatted}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-sans">Disbursed / Paid Amount</td>
                                            <td className="py-2 px-3 text-right text-emerald-700">{slipData.settlement.paid_amount_formatted}</td>
                                        </tr>
                                        {slipData.settlement.balance_due_formatted !== 'Rs. 0.00' && (
                                            <tr className="text-amber-700 font-bold">
                                                <td className="py-2 px-3 font-sans">Remaining Balance Due</td>
                                                <td className="py-2 px-3 text-right">{slipData.settlement.balance_due_formatted}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-200">
                                <div>
                                    <div className="text-[10px] text-slate-400">Payment Method:</div>
                                    <div className="font-semibold">{slipData.settlement.payment_method?.toUpperCase()} {slipData.settlement.payment_reference ? `(${slipData.settlement.payment_reference})` : ''}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400">Disbursed By:</div>
                                    <div className="font-semibold">{slipData.settlement.created_by}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-8 text-[11px] text-slate-400">
                                <div className="border-t border-slate-300 pt-1 text-center">
                                    Accountant / Administrator
                                </div>
                                <div className="border-t border-slate-300 pt-1 text-center">
                                    Doctor Signature / Acknowledgement
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsSlipModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintWindow}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Settlement Slip</span>
                            </button>
                        </div>
                    </div>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
