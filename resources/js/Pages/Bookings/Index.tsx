import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
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
    CheckCircle2,
    XCircle,
    Plus,
    Building2,
    ShieldCheck,
    Tag,
    AlertCircle,
    Sparkles,
    ArrowRight,
    CreditCard,
    ChevronRight,
    Filter,
    ArrowRightLeft,
} from 'lucide-react';
import AssignDoctorDrawer from '@/Components/Bookings/AssignDoctorDrawer';
import MoveTokenModal from '@/Components/Bookings/MoveTokenModal';

interface DateStripItem {
    date: string;
    label: string;
    day_name: string;
    day_number: string;
    month_name: string;
    formatted: string;
    session_count: number;
    is_today: boolean;
    is_tomorrow: boolean;
}

interface DoctorItem {
    id: number;
    name: string;
    specialty: string;
    avg_consultation_minutes: number;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
}

interface SessionOption {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    doctor_photo_url?: string;
    doctor_initials: string;
    doctor_avg_minutes: number;
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
    is_selectable: boolean;
    unselectable_reason?: string | null;
    next_token_number: number;
    next_approx_time: string;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
    total_fee_formatted: string;
    doctor_payout_lkr?: number;
    clinic_net_lkr?: number;
    source_label?: string;
    pricing_mode?: string;
}

interface RecentBooking {
    id: number;
    token_number: number;
    doctor_id?: number;
    doctor_session_id?: number;
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
    collect_payment_at_issue?: boolean;
}

interface Props {
    sessions: SessionOption[];
    dateStrip?: DateStripItem[];
    selectedDate?: string;
    doctors?: DoctorItem[];
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
    sessions = [],
    dateStrip = [],
    selectedDate: initialSelectedDate,
    doctors = [],
    recentBookings = [],
    clinicInfo,
    visitTypes = [],
    feeComponents = [],
    discountConfig = { is_admin: true, can_discount: true, max_type: 'percent', max_value: 100, max_display: 'Unlimited' },
}: Props) {
    const { flash } = usePage<any>().props;

    // Date navigation state
    const todayStr = useMemo(() => {
        if (dateStrip.length > 0) return dateStrip[0].date;
        const now = new Date();
        return now.toISOString().split('T')[0];
    }, [dateStrip]);

    const [currentDate, setCurrentDate] = useState<string>(initialSelectedDate || todayStr);

    // Filter & search state for Step 1
    const [doctorFilter, setDoctorFilter] = useState<string>('all');
    const [sessionSearch, setSessionSearch] = useState<string>('');

    // Session selection
    const sessionsForDate = useMemo(() => {
        return sessions.filter((s) => s.session_date === currentDate);
    }, [sessions, currentDate]);

    const filteredSessions = useMemo(() => {
        return sessionsForDate.filter((s) => {
            const matchesDoc = doctorFilter === 'all' || String(s.doctor_id) === doctorFilter;
            const q = sessionSearch.toLowerCase().trim();
            const matchesSearch =
                !q ||
                s.doctor_name.toLowerCase().includes(q) ||
                s.doctor_specialty.toLowerCase().includes(q) ||
                s.room_number.toLowerCase().includes(q);
            return matchesDoc && matchesSearch;
        });
    }, [sessionsForDate, doctorFilter, sessionSearch]);

    // Initial session selection
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(() => {
        const firstSelectable = sessionsForDate.find((s) => s.is_selectable);
        return firstSelectable ? firstSelectable.id : null;
    });

    // When date changes, auto-select first selectable session of that date if current is not in that date
    useEffect(() => {
        const currentSessionStillValid = sessionsForDate.find((s) => s.id === selectedSessionId);
        if (!currentSessionStillValid) {
            const firstSelectable = sessionsForDate.find((s) => s.is_selectable);
            setSelectedSessionId(firstSelectable ? firstSelectable.id : null);
        }
    }, [currentDate, sessionsForDate]);

    // Auto-select session created via inline modal
    useEffect(() => {
        if (flash?.createdSessionId) {
            const newId = Number(flash.createdSessionId);
            const found = sessions.find((s) => s.id === newId);
            if (found) {
                setCurrentDate(found.session_date);
                setSelectedSessionId(newId);
            }
        }
    }, [flash?.createdSessionId, sessions]);

    // Patient lookup
    const [patientQuery, setPatientQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);

    // Success Panel & Slip Modal
    const [slipModalOpen, setSlipModalOpen] = useState(false);
    const [activeSlip, setActiveSlip] = useState<any | null>(null);

    // Check if a newly issued token was flashed by backend
    useEffect(() => {
        if (flash?.issuedToken) {
            setActiveSlip(flash.issuedToken);
            setSlipModalOpen(true);
        }
    }, [flash?.issuedToken]);

    // Quick create session modal
    const [quickSessionModalOpen, setQuickSessionModalOpen] = useState(false);
    const [quickDocId, setQuickDocId] = useState<string>(doctors[0]?.id ? String(doctors[0].id) : '');
    const [quickStartTime, setQuickStartTime] = useState('17:00');
    const [quickEndTime, setQuickEndTime] = useState('20:00');
    const [quickMaxTokens, setQuickMaxTokens] = useState(25);
    const [quickRoom, setQuickRoom] = useState('Consulting Room 1');
    const [isSubmittingQuickSession, setIsSubmittingQuickSession] = useState(false);

    // Move Token Modal & Doctor Drawer states
    const [doctorDrawerOpen, setDoctorDrawerOpen] = useState(false);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [tokenToMove, setTokenToMove] = useState<any | null>(null);
    const [duplicatePatient, setDuplicatePatient] = useState<any | null>(null);
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

    const defaultVisitTypeId = visitTypes?.find((v) => v.is_default)?.id || visitTypes?.[0]?.id || '';

    // Form
    const { data, setData, post, processing, errors, reset } = useForm({
        doctor_session_id: '',
        patient_id: '' as string | number,
        new_patient_name: '',
        new_patient_phone: '',
        new_patient_dob: '',
        new_patient_nic: '',
        new_patient_gender: 'male',
        visit_type_id: defaultVisitTypeId ? String(defaultVisitTypeId) : '',
        optional_component_ids: [] as number[],
        discount_type: 'none' as 'none' | 'percent' | 'amount' | 'waiver',
        discount_value: 0,
        discount_reason: '',
        payment_collected: Boolean(clinicInfo.collect_payment_at_issue),
        payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer',
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
        setDuplicatePatient(null);
    };

    const quickAge = useMemo(() => {
        if (!data.new_patient_dob) return null;
        const dob = new Date(data.new_patient_dob);
        if (isNaN(dob.getTime())) return null;
        const diffMs = Date.now() - dob.getTime();
        const ageDt = new Date(diffMs);
        return Math.abs(ageDt.getUTCFullYear() - 1970);
    }, [data.new_patient_dob]);

    const checkDuplicatePhone = (rawPhone: string) => {
        const clean = rawPhone.replace(/\D/g, '');
        if (clean.length < 9) {
            setDuplicatePatient(null);
            return;
        }
        setIsCheckingDuplicate(true);
        fetch(`/api/patients/by-phone?phone=${encodeURIComponent(rawPhone)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (json?.patient) {
                    setDuplicatePatient(json.patient);
                } else {
                    setDuplicatePatient(null);
                }
            })
            .catch(() => setDuplicatePatient(null))
            .finally(() => setIsCheckingDuplicate(false));
    };

    const openMoveModal = (booking: RecentBooking) => {
        setTokenToMove({
            id: booking.id,
            token_number: booking.token_number,
            patient_id: booking.patient_id,
            patient_name: booking.patient_name,
            patient_phone: booking.patient_phone,
            doctor_name: booking.doctor_name,
            doctor_specialty: booking.doctor_specialty,
            session_id: booking.doctor_session_id,
            session_date: booking.session_date,
            total_fee_formatted: booking.total_fee_formatted,
            payment_status: booking.payment_status,
            status: booking.status,
        });
        setMoveModalOpen(true);
    };

    // Calculate approximate consultation time
    const approximateTime = useMemo(() => {
        if (!activeSession) return null;
        return activeSession.next_approx_time || `approx. ${activeSession.start_time}`;
    }, [activeSession]);

    // Next token number
    const assignedTokenNumber = useMemo(() => {
        if (!activeSession) return null;
        return (activeSession.booked_tokens_count || 0) + 1;
    }, [activeSession]);

    // Live Fee Breakdown Calculation
    const liveFeeCalculation = useMemo(() => {
        if (!activeSession) {
            return null;
        }

        const baseDoctorFee = activeSession.doctor_fee_lkr || 0;
        const baseClinicFee = activeSession.clinic_fee_lkr || 0;
        const baseSessionFee = activeSession.total_fee_lkr || (baseDoctorFee + baseClinicFee);
        let consultFee = baseSessionFee;

        let visitTypeDiff = 0;
        if (selectedVisitType) {
            if (selectedVisitType.pricing_type === 'percentage') {
                const pct = selectedVisitType.percentage_value || 100;
                consultFee = Math.round((baseSessionFee * pct) / 100);
                visitTypeDiff = consultFee - baseSessionFee;
            } else if (selectedVisitType.pricing_type === 'fixed') {
                consultFee = Math.round((selectedVisitType.fixed_fee_cents || 0) / 100);
                visitTypeDiff = consultFee - baseSessionFee;
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
        } else if (data.discount_type === 'amount') {
            discountAmount = Math.min(grossTotal, Math.max(0, Number(data.discount_value) || 0));
        } else if (data.discount_type === 'waiver') {
            discountAmount = grossTotal;
        }

        const patientTotal = Math.max(0, grossTotal - discountAmount);

        // Doctor share vs clinic share approximation
        const doctorShare = activeSession.doctor_payout_lkr ?? baseDoctorFee;
        const clinicShare = Math.max(0, patientTotal - doctorShare);

        return {
            baseDoctorFee,
            baseClinicFee,
            baseTotal: baseSessionFee,
            consultFee,
            visitTypeDiff,
            optionalTotal,
            grossTotal,
            discountAmount,
            patientTotal,
            doctorShare,
            clinicShare,
            sourceLabel: activeSession.source_label || 'from clinic',
        };
    }, [activeSession, selectedVisitType, feeComponents, data.optional_component_ids, data.discount_type, data.discount_value]);

    // Validation reason for disabled issue button
    const issueDisabledReason = useMemo(() => {
        if (processing) return 'Issuing token...';
        if (!activeSession) return 'Select a session first';
        if (!activeSession.is_selectable) return activeSession.unselectable_reason || 'Selected session is unavailable';
        if (!selectedPatient) {
            if (!data.new_patient_name.trim()) return 'Enter patient full name';
            if (!data.new_patient_phone.trim()) return 'Enter patient mobile number';
        }
        if (data.discount_type !== 'none') {
            if (!data.discount_reason.trim()) return 'Enter reason for discount / waiver';
            if (!discountConfig.is_admin) {
                if (data.discount_type === 'percent' && discountConfig.max_type === 'percent' && Number(data.discount_value) > discountConfig.max_value) {
                    return `Discount exceeds limit (${discountConfig.max_display})`;
                }
                if (data.discount_type === 'amount' && discountConfig.max_type === 'fixed' && Number(data.discount_value) > (discountConfig.max_value / 100)) {
                    return `Discount exceeds limit (${discountConfig.max_display})`;
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
            onSuccess: (page: any) => {
                const issued = page.props?.flash?.issuedToken;
                if (issued) {
                    setActiveSlip(issued);
                    setSlipModalOpen(true);
                } else {
                    setActiveSlip({
                        token_number: assignedTokenNumber,
                        doctor_name: activeSession?.doctor_name,
                        doctor_specialty: activeSession?.doctor_specialty,
                        room_number: activeSession?.room_number,
                        session_date: activeSession?.session_date_formatted,
                        estimated_time: approximateTime,
                        patient_name: selectedPatient ? selectedPatient.name : data.new_patient_name,
                        patient_phone: selectedPatient ? selectedPatient.phone : data.new_patient_phone,
                        patient_nic: selectedPatient ? selectedPatient.nic : data.new_patient_nic,
                        total_fee_formatted: `Rs. ${liveFeeCalculation?.patientTotal.toLocaleString()}`,
                        payment_status: data.payment_collected ? 'paid' : 'pending',
                        payment_method: data.payment_method,
                    });
                    setSlipModalOpen(true);
                }
                // Clear patient inputs
                clearSelectedPatient();
                setData((prev) => ({
                    ...prev,
                    new_patient_name: '',
                    new_patient_phone: '',
                    new_patient_nic: '',
                    discount_type: 'none',
                    discount_value: 0,
                    discount_reason: '',
                    notes: '',
                }));
            },
        });
    };

    const handleCreateOneOffSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickDocId) return;

        setIsSubmittingQuickSession(true);
        router.post(
            '/doctors/sessions/one-off',
            {
                doctor_id: Number(quickDocId),
                session_date: currentDate,
                start_time: quickStartTime,
                end_time: quickEndTime,
                max_tokens: quickMaxTokens,
                room_number: quickRoom,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmittingQuickSession(false);
                    setQuickSessionModalOpen(false);
                },
                onError: () => {
                    setIsSubmittingQuickSession(false);
                },
            }
        );
    };

    const handleRecordPayment = (paymentMethod: 'cash' | 'card' | 'bank_transfer') => {
        if (!activeSlip?.bill_id) return;
        router.post(
            `/billing/${activeSlip.bill_id}/pay`,
            { payment_method: paymentMethod },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveSlip((prev: any) => ({
                        ...prev,
                        payment_status: 'paid',
                        payment_method: paymentMethod,
                    }));
                },
            }
        );
    };

    const generateWhatsAppUrl = (slip: any) => {
        if (!slip?.patient_phone) return '#';
        const cleanPhone = slip.patient_phone.replace(/\D/g, '');
        const recipient = cleanPhone.startsWith('94')
            ? cleanPhone
            : cleanPhone.startsWith('0')
            ? `94${cleanPhone.slice(1)}`
            : `94${cleanPhone}`;

        const msg = `*${clinicInfo.name}* - Appointment Confirmation
Token: *#${slip.token_number}*
Doctor: ${slip.doctor_name} (${slip.doctor_specialty})
Date: ${slip.session_date}
Time: ${slip.estimated_time || slip.approx_time || 'Queue'}
Room: ${slip.room_number || 'Consulting Room'}
Patient: ${slip.patient_name}
Total: ${slip.total_fee_formatted || slip.fee_formatted}
Status: ${slip.payment_status === 'paid' ? 'PAID' : 'PAYMENT DUE'}
Live Queue: https://${clinicInfo.subdomain}.medvisit.lk/queue/tv`;

        return `https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`;
    };

    const openSlipForRecent = (b: RecentBooking) => {
        setActiveSlip({
            id: b.id,
            token_number: b.token_number,
            doctor_name: b.doctor_name,
            doctor_specialty: b.doctor_specialty,
            room_number: b.room_number,
            session_date: b.session_date,
            estimated_time: b.estimated_time,
            patient_name: b.patient_name,
            patient_phone: b.patient_phone,
            patient_nic: b.patient_nic,
            total_fee_formatted: b.total_fee_formatted,
            receipt_number: b.receipt_number,
            payment_status: b.payment_status,
        });
        setSlipModalOpen(true);
    };

    const cancelBooking = (booking: RecentBooking) => {
        if (confirm(`Cancel Token #${booking.token_number} for ${booking.patient_name}?`)) {
            router.post(`/bookings/${booking.id}/cancel`, {}, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Issue Token | Reception Desk" />

            {/* Print Slip Styling */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-token-slip, #printable-token-slip * {
                        visibility: visible !important;
                    }
                    #printable-token-slip {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        margin: 0 !important;
                        padding: 12px !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                    }
                }
            `}</style>

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Reception Desk', href: '/dashboard' },
                        { label: 'Issue Token' },
                    ]}
                    title="Issue Token"
                    subtitle="Fast 3-step token desk: select doctor session, look up patient, and confirm issuance."
                    actions={
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickSessionModalOpen(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-600 transition-all shadow-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Create Session</span>
                            </button>
                            <Link
                                href="/calendar"
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs"
                            >
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span>Calendar</span>
                            </Link>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: 3-STEP ISSUANCE DESK (7 COLS) */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* STEP 1: CHOOSE SESSION */}
                        <GlassCard className="p-5 space-y-4">
                            {/* Step Header */}
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
                                            Select a date and doctor channeling session
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDoctorDrawerOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors shadow-xs"
                                        title="Doctor-first channeling flow: pick a doctor to view their 14-day schedule and issue a token"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                        <span>Pick by Doctor</span>
                                    </button>
                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                        {sessionsForDate.length} {sessionsForDate.length === 1 ? 'session' : 'sessions'} on selected date
                                    </span>
                                </div>
                            </div>

                            {/* 14-DAY DATE STRIP + CALENDAR PICKER */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    <span>Select Date</span>
                                    <label className="relative inline-flex items-center gap-1.5 text-primary cursor-pointer hover:underline text-[11px] font-bold">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Pick any date</span>
                                        <input
                                            type="date"
                                            value={currentDate}
                                            onChange={(e) => {
                                                if (e.target.value) setCurrentDate(e.target.value);
                                            }}
                                            className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
                                        />
                                    </label>
                                </div>

                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
                                    {dateStrip.map((item) => {
                                        const isSelected = item.date === currentDate;
                                        const hasSessions = item.session_count > 0;

                                        return (
                                            <button
                                                key={item.date}
                                                type="button"
                                                onClick={() => setCurrentDate(item.date)}
                                                className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-2.5 rounded-2xl border text-center transition-all shrink-0 ${
                                                    isSelected
                                                        ? 'border-primary bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-primary/20 scale-[1.02]'
                                                        : hasSessions
                                                        ? 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-primary/50'
                                                        : 'border-slate-200/40 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20 text-slate-400 opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider block ${
                                                        isSelected ? 'text-white/90' : 'text-slate-400'
                                                    }`}
                                                >
                                                    {item.label}
                                                </span>
                                                <span className="text-base font-extrabold my-0.5 block leading-none">
                                                    {item.day_number}
                                                </span>
                                                <span
                                                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full inline-block ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : hasSessions
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                    }`}
                                                >
                                                    {item.session_count > 0 ? `${item.session_count} sess` : 'No sess'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* FILTERS & SEARCH FOR CHOSEN DATE */}
                            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                                <div className="relative flex-1 w-full">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={sessionSearch}
                                        onChange={(e) => setSessionSearch(e.target.value)}
                                        placeholder="Search doctor, specialty, room..."
                                        className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 pl-8 pr-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    />
                                </div>
                                <select
                                    value={doctorFilter}
                                    onChange={(e) => setDoctorFilter(e.target.value)}
                                    className="w-full sm:w-44 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">All Doctors</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} ({d.specialty})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* SESSIONS LIST FOR CHOSEN DATE */}
                            {filteredSessions.length === 0 ? (
                                <EmptyState
                                    icon={Calendar}
                                    title={`No sessions on ${currentDate}`}
                                    description="There are no doctor channeling sessions scheduled for this date. You can create a one-off session right now."
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => setQuickSessionModalOpen(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Create session for this date</span>
                                        </button>
                                    }
                                    className="py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]"
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                                    {filteredSessions.map((s) => {
                                        const isSelected = selectedSessionId === s.id;
                                        const progressPercent = Math.min(
                                            100,
                                            Math.round((s.booked_tokens_count / (s.max_tokens || 1)) * 100)
                                        );
                                        const isSelectable = s.is_selectable;

                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                disabled={!isSelectable}
                                                onClick={() => setSelectedSessionId(s.id)}
                                                className={`text-left p-3.5 rounded-2xl border transition-all text-xs relative flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'border-primary ring-2 ring-primary/20 bg-primary-50/70 dark:bg-primary-950/40 shadow-sm'
                                                        : isSelectable
                                                        ? 'border-slate-200/80 dark:border-white/10 hover:border-primary/40 bg-white/60 dark:bg-slate-900/40'
                                                        : 'border-slate-200/40 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/20 opacity-60 cursor-not-allowed'
                                                }`}
                                            >
                                                <div className="w-full">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-primary/20">
                                                                {s.doctor_photo_url ? (
                                                                    <img
                                                                        src={s.doctor_photo_url}
                                                                        alt={s.doctor_name}
                                                                        className="w-full h-full object-cover rounded-xl"
                                                                    />
                                                                ) : (
                                                                    <span>{s.doctor_initials}</span>
                                                                )}
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

                                                        {isSelectable ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                                                Open
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                                                {s.unselectable_reason || 'Unavailable'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-slate-400" />
                                                                <span>{s.start_time} – {s.end_time}</span>
                                                            </div>
                                                            <span className="font-medium text-slate-500">{s.room_number}</span>
                                                        </div>

                                                        {/* Token Progress Bar */}
                                                        <div>
                                                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                    {s.booked_tokens_count} / {s.max_tokens} booked
                                                                </span>
                                                                <span className="font-bold text-primary">
                                                                    Next: #{s.next_token_number}
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all ${
                                                                        progressPercent >= 100
                                                                            ? 'bg-rose-500'
                                                                            : progressPercent >= 80
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-primary'
                                                                    }`}
                                                                    style={{ width: `${progressPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-400 font-medium">Patient Total</span>
                                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                                        Rs. {s.total_fee_lkr.toLocaleString()}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassCard>

                        {/* STEP 2: PATIENT LOOKUP */}
                        <GlassCard className="p-5 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                        2
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Patient details
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Search registered patient by mobile/NIC or enter a new walk-in
                                        </p>
                                    </div>
                                </div>
                                {selectedPatient && (
                                    <button
                                        type="button"
                                        onClick={clearSelectedPatient}
                                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Change</span>
                                    </button>
                                )}
                            </div>

                            {selectedPatient ? (
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center">
                                            <UserCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-900 dark:text-white text-sm block">
                                                {selectedPatient.name}
                                            </span>
                                            <span className="text-xs text-slate-600 dark:text-slate-300 block">
                                                {selectedPatient.phone} {selectedPatient.nic ? `• NIC: ${selectedPatient.nic}` : ''}
                                            </span>
                                            {selectedPatient.city && (
                                                <span className="text-[11px] text-slate-400">
                                                    {selectedPatient.city}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                                        Existing Patient
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={patientQuery}
                                            onChange={(e) => setPatientQuery(e.target.value)}
                                            placeholder="Search by Sri Lankan mobile (+94), NIC, or Name..."
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 pl-9 pr-4 py-2.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-xs"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                                Searching...
                                            </div>
                                        )}
                                    </div>

                                    {/* Patient search suggestions dropdown */}
                                    {patientSearchResults.length > 0 && (
                                        <div className="p-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg space-y-1 max-h-48 overflow-y-auto">
                                            {patientSearchResults.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => selectPatient(p)}
                                                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {p.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {p.phone} {p.nic ? `• ${p.nic}` : ''} {p.city ? `• ${p.city}` : ''}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                        Select
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Toggle or Show New Patient Form */}
                                    <div className="pt-2">
                                        {!isCreatingNewPatient ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingNewPatient(true)}
                                                className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                                <span>+ Register new walk-in patient</span>
                                            </button>
                                        ) : (
                                            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-3">
                                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        <UserPlus className="w-3.5 h-3.5 text-primary" />
                                                        <span>New Walk-in Patient</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCreatingNewPatient(false)}
                                                        className="text-[11px] text-slate-500 hover:text-slate-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                            Full Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={data.new_patient_name}
                                                            onChange={(e) => setData('new_patient_name', e.target.value)}
                                                            placeholder="e.g. Sunil Perera"
                                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                            Mobile Number (+94) *
                                                        </label>
                                                        <PhoneInput
                                                            value={data.new_patient_phone}
                                                            onChange={(val) => {
                                                                setData('new_patient_phone', val);
                                                                checkDuplicatePhone(val);
                                                            }}
                                                            error={errors.new_patient_phone}
                                                            placeholder="77 123 4567"
                                                            required
                                                        />
                                                    </div>

                                                    {duplicatePatient && (
                                                        <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs animate-in fade-in">
                                                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                                <div>
                                                                    <span className="font-semibold">Matching patient exists: </span>
                                                                    <span className="font-bold">{duplicatePatient.name}</span>
                                                                    <span className="text-[11px] opacity-80"> (#{duplicatePatient.id}) • {duplicatePatient.phone}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => selectPatient(duplicatePatient)}
                                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs shrink-0"
                                                            >
                                                                Select This Patient
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                            Date of Birth {quickAge !== null && <span className="text-primary font-bold">({quickAge} yrs)</span>}
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={data.new_patient_dob}
                                                            onChange={(e) => setData('new_patient_dob', e.target.value)}
                                                            max={new Date().toISOString().split('T')[0]}
                                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                            National ID / NIC (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={data.new_patient_nic}
                                                            onChange={(e) => setData('new_patient_nic', e.target.value)}
                                                            placeholder="e.g. 198512345678"
                                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                                                        />
                                                    </div>

                                                    <div className="col-span-1 sm:col-span-2">
                                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                        <GlassCard className="p-5 space-y-4 border-primary/30 bg-gradient-to-br from-white/95 via-primary-50/20 to-white/95 dark:from-slate-900/95 dark:via-primary-950/20 dark:to-slate-900/95">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                    3
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Confirm & issue
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Review assigned token and fee breakdown
                                    </p>
                                </div>
                            </div>

                            {/* Summary Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Doctor & Session
                                    </span>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                                        {activeSession?.doctor_name || 'No session selected'}
                                    </p>
                                    <p className="text-[11px] text-primary dark:text-primary-400 font-semibold">
                                        {activeSession?.doctor_specialty || '—'}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {activeSession
                                            ? `${activeSession.session_date_formatted} • ${activeSession.start_time} (${activeSession.room_number})`
                                            : 'Choose a session in Step 1'}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Assigned Token & Time
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-extrabold text-primary">
                                            {assignedTokenNumber ? `#${assignedTokenNumber}` : '—'}
                                        </span>
                                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                            {approximateTime || '—'}
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

                            {/* Visit Type & Discount Controls */}
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
                                                    {vt.name}{' '}
                                                    {vt.pricing_type === 'percentage'
                                                        ? `(${vt.percentage_value}%)`
                                                        : vt.pricing_type === 'fixed'
                                                        ? `(Rs. ${(vt.fixed_fee_cents / 100).toLocaleString()})`
                                                        : '(Standard)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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
                                            <option value="none">No discount</option>
                                            <option value="percent">Percentage discount (%)</option>
                                            <option value="amount">Fixed amount (Rs.)</option>
                                            <option value="waiver">Full waiver (100% Free)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Discount Value & Reason Inputs (only shown when discount != 'none') */}
                                {data.discount_type !== 'none' && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-in fade-in-0 duration-150">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {data.discount_type !== 'waiver' && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                                                        {data.discount_type === 'percent'
                                                            ? 'Discount percentage (%) *'
                                                            : 'Discount amount (LKR) *'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={data.discount_type === 'percent' ? 100 : liveFeeCalculation?.grossTotal || 50000}
                                                        value={data.discount_value || ''}
                                                        onChange={(e) => setData('discount_value', parseFloat(e.target.value) || 0)}
                                                        placeholder={data.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 500'}
                                                        className="w-full text-xs rounded-xl border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-slate-900 py-1.5 px-3"
                                                    />
                                                </div>
                                            )}
                                            <div className={data.discount_type === 'waiver' ? 'sm:col-span-2' : ''}>
                                                <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                                                    Discount reason (Required) *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={data.discount_reason}
                                                    onChange={(e) => setData('discount_reason', e.target.value)}
                                                    placeholder="e.g. Senior citizen courtesy, staff review, waiver"
                                                    className="w-full text-xs rounded-xl border border-amber-300 dark:border-amber-500/30 bg-white dark:bg-slate-900 py-1.5 px-3"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment at Issue Toggle & Method */}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={data.payment_collected}
                                            onChange={(e) => setData('payment_collected', e.target.checked)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
                                        />
                                        <span>Collect payment now at token issue</span>
                                    </label>

                                    {data.payment_collected && (
                                        <div className="flex items-center gap-1.5">
                                            {(['cash', 'card', 'bank_transfer'] as const).map((method) => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setData('payment_method', method)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border transition-all ${
                                                        data.payment_method === method
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                                                    }`}
                                                >
                                                    {method.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* LIVE FEE BREAKDOWN & ISSUE ACTION */}
                            <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {liveFeeCalculation ? (
                                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                        <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                            <span>
                                                Consultation: Rs. {liveFeeCalculation.consultFee.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-primary font-semibold">
                                                ({liveFeeCalculation.sourceLabel})
                                            </span>
                                            {liveFeeCalculation.visitTypeDiff !== 0 && (
                                                <span className="text-[10px] text-slate-500">
                                                    (Visit Type: {liveFeeCalculation.visitTypeDiff > 0 ? '+' : ''}Rs. {liveFeeCalculation.visitTypeDiff.toLocaleString()})
                                                </span>
                                            )}
                                            {liveFeeCalculation.discountAmount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 font-bold">
                                                        Discount: -Rs. {liveFeeCalculation.discountAmount.toLocaleString()}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>Patient Total:</span>
                                            <span className="text-primary text-xl">
                                                Rs. {liveFeeCalculation.patientTotal.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Admin Share Breakdown */}
                                        {discountConfig.is_admin && (
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                                                Admin View: Doctor share: Rs. {liveFeeCalculation.doctorShare.toLocaleString()} • Clinic share: Rs. {liveFeeCalculation.clinicShare.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 italic py-1">
                                        Select a session to see fees
                                    </div>
                                )}

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

                    {/* RIGHT COLUMN: LIVE RECENT TOKENS (5 COLS) */}
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
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
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
                                                        {b.status === 'moved' ? (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                                Moved
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                                                    b.payment_status === 'paid'
                                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                                }`}
                                                            >
                                                                {b.payment_status}
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

                                                {b.status !== 'cancelled' && b.status !== 'completed' && b.status !== 'moved' && b.status !== 'in_consultation' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openMoveModal(b)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                                        title="Move Token to Another Doctor/Session"
                                                    >
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                )}

                                                {b.status !== 'cancelled' && b.status !== 'moved' && (
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

            {/* MODAL: SUCCESS PANEL & 80MM THERMAL TOKEN SLIP */}
            <GlassModal
                isOpen={slipModalOpen}
                onClose={() => setSlipModalOpen(false)}
                title="Token Issued Successfully"
                subtitle="Fast token slip, thermal printing, and WhatsApp share"
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
                                <span className="text-5xl font-black text-slate-900 block my-1">
                                    #{activeSlip.token_number}
                                </span>
                                <span className="text-xs font-bold text-primary block">
                                    {activeSlip.estimated_time || activeSlip.approx_time || 'Queue'}
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
                                    <span className="font-semibold">{activeSlip.room_number || 'Room 1'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Date:</span>
                                    <span className="font-semibold">{activeSlip.session_date}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Patient:</span>
                                    <span className="font-bold">{activeSlip.patient_name}</span>
                                </div>
                                {activeSlip.patient_phone && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Phone:</span>
                                        <span>{activeSlip.patient_phone}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                                    <span>Total Amount:</span>
                                    <span className="text-sm">
                                        {activeSlip.total_fee_formatted || activeSlip.fee_formatted}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Payment Status:</span>
                                    <span className={`font-bold uppercase ${activeSlip.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {activeSlip.payment_status === 'paid' ? 'PAID' : 'PAYMENT DUE'}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 text-[9px] text-slate-400">
                                Live Waiting Room Display:<br />
                                https://{clinicInfo.subdomain}.medvisit.lk/queue/tv
                            </div>
                        </div>

                        {/* Payment step if pending */}
                        {activeSlip.payment_status !== 'paid' && activeSlip.bill_id && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                                    Payment Pending: {activeSlip.total_fee_formatted}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleRecordPayment('cash')}
                                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                    >
                                        Collect Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRecordPayment('card')}
                                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                                    >
                                        Card
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRecordPayment('bank_transfer')}
                                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                                    >
                                        Bank
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print slip (80mm)</span>
                            </button>

                            <a
                                href={generateWhatsAppUrl(activeSlip)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Share WhatsApp</span>
                            </a>

                            <button
                                type="button"
                                onClick={() => setSlipModalOpen(false)}
                                className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Issue another</span>
                            </button>

                            <Link
                                href="/sessions/today"
                                className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all"
                            >
                                <span>Go to queue</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                )}
            </GlassModal>

            {/* MODAL: INLINE CREATE SESSION FOR THIS DATE */}
            <GlassModal
                isOpen={quickSessionModalOpen}
                onClose={() => setQuickSessionModalOpen(false)}
                title={`Create Session for ${currentDate}`}
                subtitle="Add a doctor channeling session on this date and auto-select it."
                maxWidth="max-w-md"
            >
                <form onSubmit={handleCreateOneOffSession} className="space-y-3.5 text-xs">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Doctor *
                        </label>
                        <select
                            required
                            value={quickDocId}
                            onChange={(e) => setQuickDocId(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        >
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.specialty}) • Fee: Rs. {d.total_fee_lkr.toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Start Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={quickStartTime}
                                onChange={(e) => setQuickStartTime(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                End Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={quickEndTime}
                                onChange={(e) => setQuickEndTime(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Maximum Tokens *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="200"
                                value={quickMaxTokens}
                                onChange={(e) => setQuickMaxTokens(parseInt(e.target.value) || 25)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Room / Suite
                            </label>
                            <input
                                type="text"
                                value={quickRoom}
                                onChange={(e) => setQuickRoom(e.target.value)}
                                placeholder="Consulting Room 1"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => setQuickSessionModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingQuickSession}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 disabled:opacity-50"
                        >
                            {isSubmittingQuickSession ? 'Creating...' : 'Save & Select Session'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* ASSIGN DOCTOR & SESSION DRAWER (DOCTOR-FIRST CHANNELING PICKER) */}
            <AssignDoctorDrawer
                isOpen={doctorDrawerOpen}
                onClose={() => setDoctorDrawerOpen(false)}
                patient={selectedPatient}
                doctors={doctors}
                visitTypes={visitTypes}
                onTokenIssued={(token) => {
                    setDoctorDrawerOpen(false);
                    if (token) {
                        setActiveSlip(token);
                        setSlipModalOpen(true);
                    }
                }}
            />

            {/* MOVE TOKEN MODAL */}
            <MoveTokenModal
                isOpen={moveModalOpen}
                onClose={() => {
                    setMoveModalOpen(false);
                    setTokenToMove(null);
                }}
                token={tokenToMove}
                doctors={doctors}
                onSuccess={() => {
                    setMoveModalOpen(false);
                    setTokenToMove(null);
                }}
            />
        </AuthenticatedLayout>
    );
}
