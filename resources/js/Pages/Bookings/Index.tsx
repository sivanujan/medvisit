import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import GlassSelect from '@/Components/UI/GlassSelect';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    Ticket,
    Search,
    UserPlus,
    UserCheck,
    Printer,
    Share2,
    Calendar,
    Clock,
    DollarSign,
    CheckCircle2,
    XCircle,
    Stethoscope,
    Plus,
    Building2,
    ShieldCheck,
    HelpCircle,
    Tag,
    Percent,
    AlertCircle,
    Info,
    Check,
} from 'lucide-react';

interface SessionOption {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    session_date_formatted: string;
    start_time: string;
    end_time: string;
    room_number: string;
    status: string;
    max_tokens: number;
    booked_tokens_count: number;
    available_tokens_count: number;
    is_full: boolean;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
    total_fee_formatted: string;
    source_label?: string;
    pricing_mode?: string;
}

interface RecentBooking {
    id: number;
    token_number: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    room_number: string;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    patient_nic: string;
    visit_type_name?: string;
    estimated_time: string;
    status: string;
    booked_via: string;
    created_at_time: string;
    total_fee_formatted: string;
    receipt_number: string | null;
    payment_status: string;
    has_discount?: boolean;
    discount_amount_formatted?: string | null;
    source_label?: string;
}

interface VisitType {
    id: number;
    name: string;
    code: string;
    pricing_type: string;
    percentage_value: number;
    fixed_fee_cents: number;
    is_default: boolean;
}

interface FeeComponentItem {
    id: number;
    name: string;
    code: string;
    amount_type: string;
    amount_value: number;
    recipient_type: string;
    applies_to: string[];
    is_mandatory: boolean;
    is_active: boolean;
}

interface DiscountConfig {
    is_admin: boolean;
    can_discount: boolean;
    max_type: 'percent' | 'fixed';
    max_value: number;
    max_display: string;
}

interface ClinicInfo {
    name: string;
    phone: string;
    address: string;
    subdomain: string;
}

interface Props {
    sessions: SessionOption[];
    recentBookings: RecentBooking[];
    clinicInfo: ClinicInfo;
    visitTypes?: VisitType[];
    feeComponents?: FeeComponentItem[];
    discountConfig?: DiscountConfig;
}

function maskPhoneNumber(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 9) {
        const last3 = digits.slice(-3);
        const prefix = digits.startsWith('94') ? '+94 ' + digits.slice(2, 4) : digits.slice(0, 3);
        return `${prefix} ••• •${last3}`;
    }
    return phone;
}

export default function BookingsIndex({
    sessions,
    recentBookings,
    clinicInfo,
    visitTypes = [],
    feeComponents = [],
    discountConfig = { is_admin: true, can_discount: true, max_type: 'percent', max_value: 100, max_display: 'Unlimited' },
}: Props) {
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(sessions[0]?.id || null);

    // Patient lookup
    const [patientQuery, setPatientQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);

    // Slip Modal
    const [slipModalOpen, setSlipModalOpen] = useState(false);
    const [activeSlip, setActiveSlip] = useState<any | null>(null);

    const defaultVisitTypeId = visitTypes?.find((v) => v.is_default)?.id || visitTypes?.[0]?.id || '';

    // Form
    const { data, setData, post, processing, errors, reset } = useForm({
        doctor_session_id: sessions[0]?.id ? String(sessions[0].id) : '',
        patient_id: '' as string | number,
        new_patient_name: '',
        new_patient_phone: '',
        new_patient_nic: '',
        new_patient_gender: 'male',
        visit_type_id: defaultVisitTypeId ? String(defaultVisitTypeId) : '',
        optional_component_ids: [] as number[],
        discount_type: 'none' as 'none' | 'percent' | 'fixed' | 'waiver',
        discount_value: 0,
        discount_reason: '',
        notes: '',
    });

    const activeSession = useMemo(
        () => sessions.find((s) => s.id === selectedSessionId) || null,
        [sessions, selectedSessionId]
    );

    const selectedVisitType = useMemo(
        () => visitTypes.find((v) => String(v.id) === String(data.visit_type_id)) || visitTypes[0] || null,
        [visitTypes, data.visit_type_id]
    );

    useEffect(() => {
        if (activeSession) {
            setData('doctor_session_id', String(activeSession.id));
        } else {
            setData('doctor_session_id', '');
        }
    }, [activeSession]);

    // Live Patient Search
    useEffect(() => {
        if (patientQuery.trim().length < 2) {
            setPatientSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/patients/search?q=${encodeURIComponent(patientQuery)}`);
                if (res.ok) {
                    const results = await res.json();
                    setPatientSearchResults(results);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [patientQuery]);

    const selectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setData('patient_id', patient.id);
        setIsCreatingNewPatient(false);
        setPatientQuery('');
        setPatientSearchResults([]);
    };

    const clearSelectedPatient = () => {
        setSelectedPatient(null);
        setData('patient_id', '');
        setPatientQuery('');
    };

    // Calculate approximate consultation time
    const approximateTime = useMemo(() => {
        if (!activeSession) return 'Check at counter';
        const tokenNumber = activeSession.booked_tokens_count + 1;
        return `${activeSession.start_time} (Token #${tokenNumber})`;
    }, [activeSession]);

    // Live Fee Breakdown Calculation
    const liveFeeCalculation = useMemo(() => {
        if (!activeSession) {
            return {
                patientTotal: 0,
                consultFee: 0,
                optionalTotal: 0,
                grossTotal: 0,
                discountAmount: 0,
                sourceLabel: 'from clinic',
            };
        }

        const baseSessionFee = activeSession.total_fee_lkr || 0;
        let consultFee = baseSessionFee;

        if (selectedVisitType) {
            if (selectedVisitType.pricing_type === 'percentage') {
                consultFee = Math.round((baseSessionFee * (selectedVisitType.percentage_value || 100)) / 100);
            } else if (selectedVisitType.pricing_type === 'fixed') {
                consultFee = Math.round((selectedVisitType.fixed_fee_cents || 0) / 100);
            }
        }

        // Optional components sum
        const selectedComponents = feeComponents.filter((c) => data.optional_component_ids.includes(c.id));
        let optionalTotal = 0;
        selectedComponents.forEach((c) => {
            if (c.amount_type === 'fixed') {
                optionalTotal += (c.amount_value || 0) / 100;
            } else if (c.amount_type === 'percentage') {
                optionalTotal += (consultFee * (c.amount_value || 0)) / 100;
            }
        });

        const grossTotal = consultFee + optionalTotal;
        let discountAmount = 0;

        if (data.discount_type === 'percent') {
            const pct = Math.min(100, Math.max(0, Number(data.discount_value) || 0));
            discountAmount = Math.round((grossTotal * pct) / 100);
        } else if (data.discount_type === 'fixed') {
            discountAmount = Math.min(grossTotal, Math.max(0, Number(data.discount_value) || 0));
        } else if (data.discount_type === 'waiver') {
            discountAmount = grossTotal;
        }

        const netTotal = Math.max(0, grossTotal - discountAmount);

        return {
            baseTotal: baseSessionFee,
            consultFee,
            optionalTotal,
            grossTotal,
            discountAmount,
            patientTotal: netTotal,
            sourceLabel: activeSession.source_label || 'from clinic',
        };
    }, [activeSession, selectedVisitType, feeComponents, data.optional_component_ids, data.discount_type, data.discount_value]);

    // Validation reason for disabled issue button
    const issueDisabledReason = useMemo(() => {
        if (processing) return 'Issuing token...';
        if (!activeSession) return 'Choose a session first';
        if (activeSession.is_full) return 'Session is fully booked';
        if (!selectedPatient) {
            if (!data.new_patient_name.trim()) return 'Enter patient full name';
            if (!data.new_patient_phone.trim()) return 'Enter patient mobile number';
        }
        if (data.discount_type !== 'none') {
            if (!data.discount_reason.trim()) return 'Enter reason for discount / waiver';
            if (!discountConfig.is_admin) {
                if (data.discount_type === 'percent' && discountConfig.max_type === 'percent' && Number(data.discount_value) > discountConfig.max_value) {
                    return `Discount exceeds receptionist limit (${discountConfig.max_display})`;
                }
                if (data.discount_type === 'fixed' && discountConfig.max_type === 'fixed' && Number(data.discount_value) > (discountConfig.max_value / 100)) {
                    return `Discount exceeds receptionist limit (${discountConfig.max_display})`;
                }
                if (data.discount_type === 'waiver' && discountConfig.max_value < 100) {
                    return 'Full waiver requires clinic admin authorization';
                }
            }
        }
        return null;
    }, [processing, activeSession, selectedPatient, data.new_patient_name, data.new_patient_phone, data.discount_type, data.discount_reason, data.discount_value, discountConfig]);

    const handleIssueToken = (e: React.FormEvent) => {
        e.preventDefault();
        if (issueDisabledReason) return;

        post('/bookings', {
            preserveScroll: true,
            onSuccess: () => {
                setActiveSlip({
                    token_number: (activeSession?.booked_tokens_count || 0) + 1,
                    doctor_name: activeSession?.doctor_name,
                    doctor_specialty: activeSession?.doctor_specialty,
                    room_number: activeSession?.room_number,
                    session_date: activeSession?.session_date_formatted,
                    approx_time: approximateTime,
                    patient_name: selectedPatient ? selectedPatient.name : data.new_patient_name,
                    patient_phone: selectedPatient ? selectedPatient.phone : data.new_patient_phone,
                    fee_formatted: `Rs. ${liveFeeCalculation.patientTotal.toLocaleString()}`,
                    visit_type_name: selectedVisitType?.name,
                    discount_amount: liveFeeCalculation.discountAmount,
                    discount_reason: data.discount_reason,
                });
                setSlipModalOpen(true);
                clearSelectedPatient();
                reset('new_patient_name', 'new_patient_nic', 'new_patient_phone', 'notes', 'discount_reason', 'discount_value');
                setData('discount_type', 'none');
                setData('optional_component_ids', []);
                setIsCreatingNewPatient(false);
            },
        });
    };

    const openSlipForRecent = (b: RecentBooking) => {
        setActiveSlip({
            token_number: b.token_number,
            doctor_name: b.doctor_name,
            doctor_specialty: b.doctor_specialty,
            room_number: b.room_number,
            session_date: b.session_date,
            approx_time: b.estimated_time || 'Check at counter',
            patient_name: b.patient_name,
            patient_phone: b.patient_phone,
            fee_formatted: b.total_fee_formatted,
        });
        setSlipModalOpen(true);
    };

    const cancelBooking = (b: RecentBooking) => {
        if (confirm(`Cancel Token #${b.token_number} for ${b.patient_name}?`)) {
            router.post(`/bookings/${b.id}/cancel`, {}, { preserveScroll: true });
        }
    };

    const generateWhatsAppUrl = (slip: any) => {
        const cleanPhone = (slip?.patient_phone || '').replace(/[^0-9]/g, '');
        const text =
            `🏥 *${clinicInfo.name}* - Channeling Token Slip\n\n` +
            `*Token No:* #${slip?.token_number}\n` +
            `*Doctor:* ${slip?.doctor_name} (${slip?.doctor_specialty})\n` +
            `*Date:* ${slip?.session_date}\n` +
            `*Approx Time:* ${slip?.approx_time}\n` +
            `*Room:* ${slip?.room_number}\n` +
            `*Patient:* ${slip?.patient_name}\n` +
            `*Total Fee:* ${slip?.fee_formatted}\n\n` +
            `Please arrive 15 minutes before your estimated time. Live queue status: https://${clinicInfo.subdomain}.medvisit.lk/queue/tv`;
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Issue Token" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Reception Desk', href: '/dashboard' },
                        { label: 'Issue Token' },
                    ]}
                    title="Issue Token"
                    subtitle="Fast 3-step token desk: select doctor session, look up patient, and confirm issuance."
                    actions={
                        <Link
                            href="/calendar"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs"
                        >
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>View Calendar</span>
                        </Link>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: 3-STEP ISSUANCE DESK (7 COLS) */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* STEP 1: CHOOSE SESSION */}
                        <GlassCard className="p-5 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                        1
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Choose session
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Select an active doctor channeling session
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                    {sessions.length} available
                                </span>
                            </div>

                            {sessions.length === 0 ? (
                                <EmptyState
                                    icon={Calendar}
                                    title="No scheduled sessions"
                                    description="There are no active doctor sessions scheduled for today or upcoming dates. Create a session to start issuing tokens."
                                    action={
                                        <Link
                                            href="/calendar"
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Create session</span>
                                        </Link>
                                    }
                                    className="py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]"
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                                    {sessions.map((s) => {
                                        const isSelected = selectedSessionId === s.id;
                                        const progressPercent = Math.min(
                                            100,
                                            Math.round((s.booked_tokens_count / (s.max_tokens || 1)) * 100)
                                        );

                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setSelectedSessionId(s.id)}
                                                className={`text-left p-3.5 rounded-2xl border transition-all text-xs relative flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'border-primary ring-2 ring-primary/20 bg-primary-50/60 dark:bg-primary-950/40 shadow-sm'
                                                        : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white/50 dark:bg-slate-900/40'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                                                {s.doctor_name
                                                                    .replace('Dr.', '')
                                                                    .trim()
                                                                    .charAt(0) || 'D'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-slate-900 dark:text-white truncate block">
                                                                    {s.doctor_name}
                                                                </span>
                                                                <span className="text-[11px] text-primary dark:text-primary-400 font-semibold truncate block">
                                                                    {s.doctor_specialty}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                                s.is_full
                                                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                            }`}
                                                        >
                                                            {s.is_full ? 'Full' : `${s.available_tokens_count} left`}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span>{s.session_date_formatted}</span>
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                {s.start_time} • {s.room_number}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pt-0.5">
                                                            <span>Fee: {s.total_fee_formatted}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">
                                                                {s.booked_tokens_count} / {s.max_tokens} booked
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mini capacity progress bar */}
                                                <div className="mt-2.5 w-full bg-slate-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            s.is_full
                                                                ? 'bg-rose-500'
                                                                : progressPercent > 80
                                                                ? 'bg-amber-500'
                                                                : 'bg-primary'
                                                        }`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassCard>

                        {/* STEP 2: PATIENT */}
                        <GlassCard className="p-5 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                        2
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Patient
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Search registered patient or enter walk-in details
                                        </p>
                                    </div>
                                </div>

                                {selectedPatient && (
                                    <button
                                        type="button"
                                        onClick={clearSelectedPatient}
                                        className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                                    >
                                        Change patient
                                    </button>
                                )}
                            </div>

                            {selectedPatient ? (
                                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                            <UserCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {selectedPatient.name}
                                                </h4>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                                    Existing patient
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {maskPhoneNumber(selectedPatient.phone)}{' '}
                                                {selectedPatient.nic ? `• NIC: ${selectedPatient.nic}` : ''}{' '}
                                                {selectedPatient.city ? `• ${selectedPatient.city}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Search by phone, NIC, or name */}
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={patientQuery}
                                            onChange={(e) => {
                                                setPatientQuery(e.target.value);
                                                if (e.target.value.trim().length > 0) {
                                                    setIsCreatingNewPatient(false);
                                                }
                                            }}
                                            placeholder="Search by patient name, mobile (+94), or NIC..."
                                            className="w-full pl-10 pr-24 py-2.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900"
                                        />
                                        {isSearching ? (
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 animate-pulse font-medium">
                                                Searching...
                                            </span>
                                        ) : (
                                            patientQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPatientQuery('');
                                                        setPatientSearchResults([]);
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600"
                                                >
                                                    Clear
                                                </button>
                                            )
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {patientSearchResults.length > 0 && (
                                        <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900 shadow-xl max-h-56 overflow-y-auto">
                                            {patientSearchResults.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => selectPatient(p)}
                                                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between text-xs transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {p.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {maskPhoneNumber(p.phone)}{' '}
                                                            {p.nic ? `• NIC: ${p.nic}` : ''}{' '}
                                                            {p.city ? `• ${p.city}` : ''}
                                                        </span>
                                                    </div>
                                                    <span className="text-primary font-bold text-xs bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg">
                                                        Select
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {patientQuery.trim().length >= 2 && !isSearching && patientSearchResults.length === 0 && (
                                        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs flex items-center justify-between text-amber-800 dark:text-amber-300">
                                            <span>No matching patient found for "{patientQuery}"</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCreatingNewPatient(true);
                                                    if (/^\+?\d+$/.test(patientQuery.trim())) {
                                                        setData('new_patient_phone', patientQuery.trim());
                                                    } else {
                                                        setData('new_patient_name', patientQuery.trim());
                                                    }
                                                }}
                                                className="font-bold underline text-xs ml-2"
                                            >
                                                Register now
                                            </button>
                                        </div>
                                    )}

                                    {/* Quick Register Toggle */}
                                    <div className="pt-2">
                                        {!isCreatingNewPatient ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingNewPatient(true)}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Register new walk-in patient</span>
                                            </button>
                                        ) : (
                                            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/10 space-y-3">
                                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        <UserPlus className="w-3.5 h-3.5 text-primary" />
                                                        New Patient Information
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCreatingNewPatient(false)}
                                                        className="text-[11px] text-slate-400 hover:text-slate-600"
                                                    >
                                                        Collapse
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                            Full Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={data.new_patient_name}
                                                            onChange={(e) => setData('new_patient_name', e.target.value)}
                                                            placeholder="e.g. Priyantha Dissanayake"
                                                            className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                            Mobile Phone (+94) *
                                                        </label>
                                                        <PhoneInput
                                                            value={data.new_patient_phone}
                                                            onChange={(normalized) => setData('new_patient_phone', normalized)}
                                                            placeholder="7X XXX XXXX"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                            NIC Number (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={data.new_patient_nic}
                                                            onChange={(e) => setData('new_patient_nic', e.target.value)}
                                                            placeholder="e.g. 199012345678 or 901234567V"
                                                            className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                            Gender
                                                        </label>
                                                        <GlassSelect
                                                            value={data.new_patient_gender}
                                                            onValueChange={(val) => setData('new_patient_gender', val)}
                                                            options={[
                                                                { value: 'male', label: 'Male' },
                                                                { value: 'female', label: 'Female' },
                                                                { value: 'other', label: 'Other' },
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* STEP 3: CONFIRM & ISSUE SUMMARY CARD */}
                        <GlassCard className="p-5 space-y-4 border-primary/30 bg-gradient-to-br from-white/90 via-primary-50/20 to-white/90 dark:from-slate-900/90 dark:via-primary-950/10 dark:to-slate-900/90">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                    3
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Confirm & issue
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Review token assignment and fee breakdown
                                    </p>
                                </div>
                            </div>

                            {/* Summary Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Doctor & Session
                                    </span>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                                        {activeSession?.doctor_name || 'No session selected'}
                                    </p>
                                    <p className="text-[11px] text-primary dark:text-primary-400">
                                        {activeSession?.doctor_specialty || '—'}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {activeSession ? `${activeSession.session_date_formatted} • ${activeSession.start_time} (${activeSession.room_number})` : '—'}
                                    </p>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Assigned Token & Time
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-extrabold text-primary">
                                            {activeSession ? `#${activeSession.booked_tokens_count + 1}` : '—'}
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            Approx: {approximateTime}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">
                                        Patient:{' '}
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {selectedPatient
                                                ? selectedPatient.name
                                                : data.new_patient_name.trim() || 'Not specified'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Visit Type & Optional Charges */}
                            <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Visit Type *
                                        </label>
                                        <select
                                            value={data.visit_type_id}
                                            onChange={(e) => setData('visit_type_id', e.target.value)}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                        >
                                            {visitTypes.map((vt) => (
                                                <option key={vt.id} value={vt.id}>
                                                    {vt.name} {vt.pricing_type === 'percentage' ? `(${vt.percentage_value}%)` : vt.pricing_type === 'fixed' ? `(Rs. ${(vt.fixed_fee_cents/100).toLocaleString()})` : '(Standard)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Receptionist Limit & Discount Selector */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                Discount / Waiver
                                            </label>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-primary/10 text-primary">
                                                {discountConfig.is_admin ? 'Admin: Unlimited' : `Limit: ${discountConfig.max_display}`}
                                            </span>
                                        </div>
                                        <select
                                            value={data.discount_type}
                                            onChange={(e) => setData('discount_type', e.target.value as any)}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="none">No Discount (Standard Fee)</option>
                                            <option value="percent">Percentage Discount (%)</option>
                                            <option value="fixed">Fixed Amount Off (Rs.)</option>
                                            <option value="waiver">Full Waiver (100% Free)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Discount Value & Reason Inputs if discount selected */}
                                {data.discount_type !== 'none' && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-in fade-in-0 duration-150">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {data.discount_type !== 'waiver' && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                                                        {data.discount_type === 'percent' ? 'Discount Percentage (%) *' : 'Discount Amount (LKR) *'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={data.discount_type === 'percent' ? 100 : liveFeeCalculation.grossTotal}
                                                        value={data.discount_value || ''}
                                                        onChange={(e) => setData('discount_value', parseFloat(e.target.value) || 0)}
                                                        placeholder={data.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 500'}
                                                        className="w-full text-xs rounded-xl border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-slate-900 py-1.5 px-3"
                                                    />
                                                </div>
                                            )}
                                            <div className={data.discount_type === 'waiver' ? 'sm:col-span-2' : ''}>
                                                <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                                                    Discount / Waiver Reason (Required) *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={data.discount_reason}
                                                    onChange={(e) => setData('discount_reason', e.target.value)}
                                                    placeholder="e.g. Senior citizen / Staff courtesy / Follow-up review"
                                                    className="w-full text-xs rounded-xl border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-slate-900 py-1.5 px-3"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Optional Fee Components */}
                                {feeComponents.filter((c) => !c.is_mandatory && c.is_active && c.applies_to?.includes('walk_in')).length > 0 && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Optional Add-on Charges (Optional)
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {feeComponents.filter((c) => !c.is_mandatory && c.is_active && c.applies_to?.includes('walk_in')).map((c) => {
                                                const checked = data.optional_component_ids.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const exists = data.optional_component_ids.includes(c.id);
                                                            setData('optional_component_ids', exists
                                                                ? data.optional_component_ids.filter((id) => id !== c.id)
                                                                : [...data.optional_component_ids, c.id]);
                                                        }}
                                                        className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                                                            checked
                                                                ? 'border-primary bg-primary text-white font-bold'
                                                                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <span>{c.name} (+Rs. {(c.amount_value / 100).toLocaleString()})</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fee Breakdown & Issue Action */}
                            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                    <div className="flex items-center gap-2 text-[11px]">
                                        <span>Consultation: Rs. {liveFeeCalculation.consultFee.toLocaleString()}</span>
                                        <span className="text-[10px] text-primary font-semibold">({liveFeeCalculation.sourceLabel})</span>
                                        {liveFeeCalculation.optionalTotal > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>Add-ons: +Rs. {liveFeeCalculation.optionalTotal.toLocaleString()}</span>
                                            </>
                                        )}
                                        {liveFeeCalculation.discountAmount > 0 && (
                                            <>
                                                <span>•</span>
                                                <span className="text-emerald-600 font-bold">Discount: -Rs. {liveFeeCalculation.discountAmount.toLocaleString()}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Patient Total:</span>
                                        <span className="text-primary text-lg">Rs. {liveFeeCalculation.patientTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <button
                                        type="button"
                                        onClick={handleIssueToken}
                                        disabled={Boolean(issueDisabledReason)}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Ticket className="w-4 h-4" />
                                        <span>{processing ? 'Issuing...' : 'Issue token'}</span>
                                    </button>
                                    {issueDisabledReason && (
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                            {issueDisabledReason}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* RIGHT COLUMN: LIVE RECENT TOKENS & TODAY'S SESSIONS (5 COLS) */}
                    <div className="lg:col-span-5 space-y-5">
                        <GlassCard className="p-5 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Today's tokens
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Live list of issued appointments
                                    </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 dark:bg-primary-950/60 text-primary border border-primary-200/60 dark:border-primary-800/40">
                                    {recentBookings.length} issued
                                </span>
                            </div>

                            {recentBookings.length === 0 ? (
                                <div className="space-y-4 py-2">
                                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-center">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            No tokens issued yet today
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                            Issued tokens will appear here live with instant print slips and WhatsApp confirmations.
                                        </p>
                                    </div>

                                    {/* Today's Scheduled Sessions Summary */}
                                    <div className="space-y-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            Today's Scheduled Sessions
                                        </span>
                                        {sessions.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No scheduled sessions</p>
                                        ) : (
                                            sessions.slice(0, 3).map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {s.doctor_name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            {s.start_time} • {s.room_number}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                                        {s.booked_tokens_count}/{s.max_tokens} booked
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                                    {recentBookings.map((b) => (
                                        <div
                                            key={b.id}
                                            className={`p-3 rounded-2xl border text-xs transition-colors flex items-center justify-between ${
                                                b.status === 'cancelled'
                                                    ? 'bg-rose-50/30 border-rose-200/50 opacity-60'
                                                    : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0">
                                                    #{b.token_number}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                                                        {b.patient_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                                        {b.doctor_name} • {b.estimated_time || 'Queue'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] text-slate-400">
                                                            {b.created_at_time} • {b.total_fee_formatted}
                                                        </span>
                                                        {b.visit_type_name && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                                                {b.visit_type_name}
                                                            </span>
                                                        )}
                                                        {b.has_discount && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                                                Discounted
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openSlipForRecent(b)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                                                    title="View & Print Slip"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                </button>

                                                <a
                                                    href={generateWhatsAppUrl(b)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                                    title="Share via WhatsApp"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </a>

                                                {b.status !== 'cancelled' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => cancelBooking(b)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Cancel Token"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            </div>

            {/* MODAL: 80MM THERMAL TOKEN SLIP & WHATSAPP SHARE */}
            <GlassModal
                isOpen={slipModalOpen}
                onClose={() => setSlipModalOpen(false)}
                title="Token Booking Slip"
                subtitle="Print 80mm thermal receipt slip or send via WhatsApp"
                maxWidth="max-w-md"
            >
                {activeSlip && (
                    <div className="space-y-4">
                        {/* Printable 80mm Thermal Slip Box */}
                        <div
                            id="printable-token-slip"
                            className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 text-center font-mono space-y-3 shadow-inner"
                        >
                            <div>
                                <h3 className="font-bold text-sm tracking-wider uppercase">
                                    {clinicInfo.name}
                                </h3>
                                <p className="text-[10px] text-slate-500">{clinicInfo.address}</p>
                                <p className="text-[10px] text-slate-500">{clinicInfo.phone}</p>
                            </div>

                            <div className="border-t border-b border-dashed border-slate-300 py-3 my-2">
                                <span className="text-[11px] uppercase tracking-widest text-slate-500 block">
                                    Channeling Token
                                </span>
                                <span className="text-4xl font-extrabold text-slate-900 block my-1">
                                    #{activeSlip.token_number}
                                </span>
                                <span className="text-xs font-semibold text-slate-700 block">
                                    Approx. Time: {activeSlip.approx_time}
                                </span>
                            </div>

                            <div className="text-left text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Doctor:</span>
                                    <span className="font-bold">{activeSlip.doctor_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Specialty:</span>
                                    <span>{activeSlip.doctor_specialty}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Room:</span>
                                    <span className="font-semibold">{activeSlip.room_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Patient:</span>
                                    <span className="font-bold">{activeSlip.patient_name}</span>
                                </div>
                                {activeSlip.visit_type_name && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Visit Type:</span>
                                        <span className="font-semibold">{activeSlip.visit_type_name}</span>
                                    </div>
                                )}
                                {Boolean(activeSlip.discount_amount) && (
                                    <div className="flex justify-between text-emerald-700 font-semibold">
                                        <span>Discount:</span>
                                        <span>-Rs. {Number(activeSlip.discount_amount).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-slate-200">
                                    <span className="font-bold">Total Fee:</span>
                                    <span className="font-bold text-sm">{activeSlip.fee_formatted}</span>
                                </div>
                            </div>

                            <div className="pt-2 text-[9px] text-slate-400">
                                Live Waiting Room Display:<br />
                                https://{clinicInfo.subdomain}.medvisit.lk/queue/tv
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print 80mm Slip</span>
                            </button>

                            <a
                                href={generateWhatsAppUrl(activeSlip)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>WhatsApp Slip</span>
                            </a>
                        </div>
                    </div>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
