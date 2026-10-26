import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
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
    Plus,
    ChevronRight,
    ChevronLeft,
    Check,
    Lock,
    Sparkles,
    AlertCircle,
    User,
    ArrowRightLeft,
    X,
    RotateCcw,
    Tv,
    HelpCircle,
    DollarSign,
    Shield,
    Phone,
} from 'lucide-react';
import MoveTokenModal, { TokenToMove } from '@/Components/Bookings/MoveTokenModal';

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

function maskNic(nic?: string | null): string {
    if (!nic) return '';
    const clean = nic.trim();
    if (clean.length > 5) {
        return `${clean.slice(0, 4)}••••${clean.slice(-2)}`;
    }
    return clean;
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
    discountConfig = { is_admin: true, can_discount: true, max_type: 'percent', max_value: 100, max_display: 'unlimited' },
}: Props) {
    const { flash } = usePage<any>().props;
    const shouldReduceMotion = useReducedMotion();

    // Progressive Accordion State: 1 | 2 | 3
    const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

    // Date Strip navigation
    const todayStr = useMemo(() => {
        if (dateStrip.length > 0) return dateStrip[0].date;
        const now = new Date();
        return now.toISOString().split('T')[0];
    }, [dateStrip]);

    const [currentDate, setCurrentDate] = useState<string>(initialSelectedDate || todayStr);
    const dateStripRef = useRef<HTMLDivElement>(null);

    // Filters for Step 1
    const [doctorFilter, setDoctorFilter] = useState<string>('all');
    const [sessionSearch, setSessionSearch] = useState<string>('');

    // Sessions for currently selected date
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

    // Selected session
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(() => {
        const firstSelectable = sessionsForDate.find((s) => s.is_selectable);
        return firstSelectable ? firstSelectable.id : null;
    });

    const activeSession = useMemo(
        () => sessions.find((s) => s.id === selectedSessionId) || null,
        [sessions, selectedSessionId]
    );

    // When date changes, select first available session if needed
    useEffect(() => {
        const valid = sessionsForDate.find((s) => s.id === selectedSessionId);
        if (!valid) {
            const firstSelectable = sessionsForDate.find((s) => s.is_selectable);
            setSelectedSessionId(firstSelectable ? firstSelectable.id : null);
        }
    }, [currentDate, sessionsForDate]);

    // Step 2: Patient lookup & mini-form
    const [patientQuery, setPatientQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isInlineNewPatientOpen, setIsInlineNewPatientOpen] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);
    const patientSearchInputRef = useRef<HTMLInputElement>(null);

    // Step 3: Visit type & fee options
    const defaultVisitTypeId = visitTypes?.find((v) => v.is_default)?.id || visitTypes?.[0]?.id || '';

    // Form
    const { data, setData, post, processing, errors, reset } = useForm({
        doctor_session_id: '',
        patient_id: '' as string | number,
        new_patient_name: '',
        new_patient_phone: '',
        new_patient_dob: '',
        new_patient_nic: '',
        new_patient_gender: 'other',
        visit_type_id: defaultVisitTypeId ? String(defaultVisitTypeId) : '',
        optional_component_ids: [] as number[],
        discount_type: 'none' as 'none' | 'percent' | 'amount' | 'waiver',
        discount_value: 0,
        discount_reason: '',
        payment_collected: true,
        payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer',
        notes: '',
    });

    // Sync session ID into form data
    useEffect(() => {
        if (activeSession) {
            setData('doctor_session_id', String(activeSession.id));
        } else {
            setData('doctor_session_id', '');
        }
    }, [activeSession]);

    // Live Patient Search (debounced 250ms)
    useEffect(() => {
        if (patientQuery.trim().length < 2) {
            setPatientSearchResults([]);
            setSelectedResultIndex(-1);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/patients/search?q=${encodeURIComponent(patientQuery)}`);
                if (res.ok) {
                    const results = await res.json();
                    setPatientSearchResults(results);
                    setSelectedResultIndex(-1);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [patientQuery]);

    // Focus patient search input when Step 2 expands
    useEffect(() => {
        if (activeStep === 2) {
            setTimeout(() => {
                patientSearchInputRef.current?.focus();
            }, 100);
        }
    }, [activeStep]);

    const selectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setData('patient_id', patient.id);
        setIsInlineNewPatientOpen(false);
        setPatientQuery('');
        setPatientSearchResults([]);
        setActiveStep(3);
    };

    const clearSelectedPatient = () => {
        setSelectedPatient(null);
        setData('patient_id', '');
        setPatientQuery('');
    };

    // Recent 5 patients used today
    const recentPatients = useMemo(() => {
        const map = new Map<number, { id: number; name: string; phone: string; nic: string }>();
        recentBookings.forEach((b) => {
            if (b.patient_id && !map.has(b.patient_id)) {
                map.set(b.patient_id, {
                    id: b.patient_id,
                    name: b.patient_name,
                    phone: b.patient_phone,
                    nic: b.patient_nic,
                });
            }
        });
        return Array.from(map.values()).slice(0, 5);
    }, [recentBookings]);

    // Selected visit type model
    const selectedVisitType = useMemo(
        () => visitTypes.find((v) => String(v.id) === String(data.visit_type_id)) || visitTypes[0] || null,
        [visitTypes, data.visit_type_id]
    );

    // Approximate time preview
    const approximateTime = useMemo(() => {
        if (!activeSession) return '—';
        return activeSession.next_approx_time || activeSession.start_time;
    }, [activeSession]);

    // Next token preview (preview only; server assigns actual number)
    const previewTokenNumber = useMemo(() => {
        if (!activeSession) return 1;
        return (activeSession.booked_tokens_count || 0) + 1;
    }, [activeSession]);

    // Live Fee Breakdown Calculation
    const liveFeeCalculation = useMemo(() => {
        if (!activeSession) {
            return {
                baseDoctorFee: 0,
                baseClinicFee: 0,
                baseTotal: 0,
                consultFee: 0,
                visitTypeDiff: 0,
                optionalTotal: 0,
                grossTotal: 0,
                discountAmount: 0,
                patientTotal: 0,
            };
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
        };
    }, [activeSession, selectedVisitType, feeComponents, data.optional_component_ids, data.discount_type, data.discount_value]);

    // Validation Check for Step Navigation & Issue Button
    const [stepValidationMessage, setStepValidationMessage] = useState<string | null>(null);

    // Issue Token Submission
    const [justIssuedTicket, setJustIssuedTicket] = useState<any | null>(null);
    const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');
    const [quickSessionModalOpen, setQuickSessionModalOpen] = useState(false);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [tokenToMove, setTokenToMove] = useState<TokenToMove | null>(null);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // Quick create session state
    const [quickDocId, setQuickDocId] = useState<string>(doctors[0]?.id ? String(doctors[0].id) : '');
    const [quickStartTime, setQuickStartTime] = useState('17:30');
    const [quickEndTime, setQuickEndTime] = useState('20:30');
    const [quickMaxTokens, setQuickMaxTokens] = useState(25);
    const [quickRoom, setQuickRoom] = useState('Room 1');

    // Handle Issue Token Click
    const handleIssueToken = () => {
        // Validation check with progressive jump to missing step
        if (!activeSession) {
            setActiveStep(1);
            setStepValidationMessage('Please select a doctor channeling session first.');
            return;
        }
        if (!selectedPatient && (!data.new_patient_name.trim() || !data.new_patient_phone.trim())) {
            setActiveStep(2);
            setStepValidationMessage('Please select an existing patient or enter walk-in patient details.');
            patientSearchInputRef.current?.focus();
            return;
        }
        if (data.discount_type !== 'none' && !data.discount_reason.trim()) {
            setActiveStep(3);
            setStepValidationMessage('Please provide a reason for the discount or waiver.');
            return;
        }

        setStepValidationMessage(null);

        post('/bookings', {
            preserveScroll: true,
            onSuccess: (page: any) => {
                const issued = page.props?.flash?.issuedToken;
                const tokenData = issued || {
                    token_number: previewTokenNumber,
                    doctor_name: activeSession.doctor_name,
                    doctor_specialty: activeSession.doctor_specialty,
                    room_number: activeSession.room_number,
                    session_date: activeSession.session_date_formatted,
                    estimated_time: approximateTime,
                    patient_name: selectedPatient ? selectedPatient.name : data.new_patient_name,
                    patient_phone: selectedPatient ? selectedPatient.phone : data.new_patient_phone,
                    total_fee_formatted: `Rs. ${liveFeeCalculation.patientTotal.toLocaleString()}`,
                    payment_status: data.payment_collected ? 'paid' : 'pending',
                    payment_method: data.payment_method,
                };

                setJustIssuedTicket(tokenData);
                setAriaAnnouncement(`Token ${tokenData.token_number} issued to ${tokenData.patient_name}.`);

                // Reset patient inputs but keep current session selected
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

    // Keyboard navigation: 1-9 for session selection, Esc to go back, Ctrl+Enter to issue
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isTyping =
                activeEl &&
                (activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    activeEl.tagName === 'SELECT' ||
                    (activeEl as HTMLElement).isContentEditable);

            // Ctrl+Enter or Cmd+Enter to issue token from anywhere
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleIssueToken();
                return;
            }

            // Esc to go back a step
            if (e.key === 'Escape') {
                if (justIssuedTicket) {
                    setJustIssuedTicket(null);
                    setActiveStep(2);
                    return;
                }
                if (activeStep > 1 && !isTyping) {
                    e.preventDefault();
                    setActiveStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1));
                    return;
                }
            }

            // Number keys 1-9 on Step 1 (when not typing in an input)
            if (activeStep === 1 && !isTyping) {
                const num = parseInt(e.key, 10);
                if (!isNaN(num) && num >= 1 && num <= filteredSessions.length) {
                    e.preventDefault();
                    const target = filteredSessions[num - 1];
                    if (target.is_selectable) {
                        setSelectedSessionId(target.id);
                        setActiveStep(2);
                    }
                }
            }

            // Arrow down/up for patient search dropdown
            if (activeStep === 2 && patientSearchResults.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedResultIndex((prev) => (prev < patientSearchResults.length - 1 ? prev + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : patientSearchResults.length - 1));
                } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
                    e.preventDefault();
                    selectPatient(patientSearchResults[selectedResultIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeStep, filteredSessions, patientSearchResults, selectedResultIndex, justIssuedTicket, activeSession, selectedPatient, data, liveFeeCalculation]);

    // Scroll Date Strip
    const scrollDateStrip = (direction: 'left' | 'right') => {
        if (dateStripRef.current) {
            const offset = direction === 'left' ? -240 : 240;
            dateStripRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    // Quick create session submit
    const handleQuickSessionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickDocId) return;

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
                    setQuickSessionModalOpen(false);
                },
            }
        );
    };

    // Generate WhatsApp Web URL for issued ticket
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
Doctor: ${slip.doctor_name} (${slip.doctor_specialty || ''})
Date: ${slip.session_date}
Time: ${slip.estimated_time || 'Queue'}
Room: ${slip.room_number || 'Room 1'}
Patient: ${slip.patient_name}
Total: ${slip.total_fee_formatted}
Status: ${slip.payment_status === 'paid' ? 'PAID' : 'PAYMENT DUE'}
Live Queue: https://${clinicInfo.subdomain}.medvisit.lk/queue/tv`;

        return `https://wa.me/${recipient}?text=${encodeURIComponent(msg)}`;
    };

    // Human date format for empty date state
    const formattedHumanDate = useMemo(() => {
        try {
            const d = new Date(currentDate);
            return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch {
            return currentDate;
        }
    }, [currentDate]);

    return (
        <AuthenticatedLayout>
            <Head title="Issue Token | Reception Desk" />

            {/* SCREEN READER ARIA-LIVE ANNOUNCEMENT */}
            <div aria-live="polite" className="sr-only">
                {ariaAnnouncement}
            </div>

            {/* PRINT SLIP STYLING FOR 80MM THERMAL PRINTER */}
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
                        padding: 14px !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        font-family: monospace, sans-serif !important;
                    }
                }
            `}</style>

            <div className="space-y-6 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
                {/* SINGLE HEADER & CLEAN BREADCRUMB */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Reception', href: '/dashboard' },
                        { label: 'Issue token' },
                    ]}
                    title="Issue token"
                    subtitle="Pick a session, find the patient, issue the token."
                    actions={
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickSessionModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5 text-[#1E6FD9]" />
                                <span>Create session</span>
                            </button>

                            <Link
                                href="/calendar"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-colors"
                            >
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>Calendar</span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => setShowShortcutsModal(true)}
                                className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
                                title="Keyboard shortcuts"
                            >
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </div>
                    }
                />

                {/* MAIN TWO-COLUMN LAYOUT (DESKTOP ≥1280px) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* =========================================================================
                        LEFT COLUMN (~62%): PROGRESSIVE ACCORDION (STEPS 1, 2, 3)
                        ========================================================================= */}
                    <div className="xl:col-span-7 space-y-4">
                        {/* INLINE VALIDATION TOAST / MESSAGE */}
                        <AnimatePresence>
                            {stepValidationMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-3.5 rounded-2xl bg-[#FF7A59]/10 border border-[#FF7A59]/30 text-[#FF7A59] text-xs font-semibold flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{stepValidationMessage}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStepValidationMessage(null)}
                                        className="p-1 hover:opacity-75"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* =================================================================
                            ACCORDION STEP 1: SESSION SELECTION
                            ================================================================= */}
                        <GlassCard className="transition-all overflow-hidden p-5 sm:p-6">
                            {/* Header (Always Visible) */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            activeSession
                                                ? 'bg-[#0E9E8F] text-white'
                                                : activeStep === 1
                                                ? 'bg-[#1E6FD9] text-white'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                                        }`}
                                    >
                                        {activeSession ? <Check className="w-4 h-4" /> : '1'}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Step 1 — Channeling session
                                        </h3>
                                        {activeStep !== 1 && activeSession && (
                                            <p className="text-xs text-[#0E9E8F] font-medium mt-0.5">
                                                {activeSession.doctor_name} · {activeSession.session_date_formatted} ({activeSession.start_time}) · {activeSession.room_number}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {activeStep !== 1 && activeSession && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveStep(1)}
                                        className="text-xs font-semibold text-[#1E6FD9] hover:underline px-2.5 py-1 rounded-lg hover:bg-[#1E6FD9]/10 transition-colors"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {/* Expanded Content for Step 1 */}
                            <AnimatePresence>
                                {activeStep === 1 && (
                                    <motion.div
                                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-4"
                                    >
                                        {/* COMPACT DATE STRIP */}
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    Select session date
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => scrollDateStrip('left')}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                                        aria-label="Previous dates"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => scrollDateStrip('right')}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                                        aria-label="Next dates"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div
                                                ref={dateStripRef}
                                                className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth"
                                            >
                                                {dateStrip.map((item) => {
                                                    const isSelected = item.date === currentDate;
                                                    return (
                                                        <button
                                                            key={item.date}
                                                            type="button"
                                                            onClick={() => setCurrentDate(item.date)}
                                                            className={`min-w-[96px] p-2.5 rounded-2xl border text-center transition-all shrink-0 ${
                                                                isSelected
                                                                    ? 'bg-[#1E6FD9] text-white border-[#1E6FD9] shadow-md shadow-[#1E6FD9]/20 scale-[1.02]'
                                                                    : 'bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                                                {item.is_today ? 'Today' : item.is_tomorrow ? 'Tomorrow' : item.day_name}
                                                            </span>
                                                            <span className="text-lg font-black block leading-tight mt-0.5">
                                                                {item.day_number}
                                                            </span>
                                                            <span className={`text-[10px] font-medium block mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                                                {item.session_count > 0 ? `${item.session_count} session${item.session_count > 1 ? 's' : ''}` : '—'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}

                                                {/* Pick a Date Input button at end */}
                                                <div className="relative shrink-0">
                                                    <input
                                                        type="date"
                                                        id="calendar-pick-date"
                                                        value={currentDate}
                                                        onChange={(e) => {
                                                            if (e.target.value) setCurrentDate(e.target.value);
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                    <label
                                                        htmlFor="calendar-pick-date"
                                                        className="min-w-[80px] h-full p-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50/60 dark:bg-white/5 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-[#1E6FD9] hover:text-[#1E6FD9] transition-colors cursor-pointer text-center"
                                                    >
                                                        <Calendar className="w-4 h-4 mb-1" />
                                                        <span className="text-[10px] font-bold">Pick date</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEARCH & DOCTOR FILTER BAR */}
                                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                            <div className="relative flex-1">
                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    value={sessionSearch}
                                                    onChange={(e) => setSessionSearch(e.target.value)}
                                                    placeholder="Search doctor, specialty, room..."
                                                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                                />
                                            </div>

                                            {doctors.length > 0 && (
                                                <select
                                                    value={doctorFilter}
                                                    onChange={(e) => setDoctorFilter(e.target.value)}
                                                    className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                                >
                                                    <option value="all">All doctors</option>
                                                    {doctors.map((d) => (
                                                        <option key={d.id} value={String(d.id)}>
                                                            {d.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* SESSION CARDS LIST */}
                                        <div className="space-y-2.5 pt-1">
                                            {filteredSessions.length === 0 ? (
                                                <div className="py-8 text-center bg-slate-50/60 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-4">
                                                    <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        No sessions scheduled for {formattedHumanDate}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Create a quick session for this date to start issuing tokens.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickSessionModalOpen(true)}
                                                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Create session for {formattedHumanDate}</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                filteredSessions.map((session, sIdx) => {
                                                    const isSelected = selectedSessionId === session.id;
                                                    const bookedCount = session.booked_tokens_count || 0;
                                                    const maxTokens = session.max_tokens || 1;
                                                    const occupancyPct = Math.round((bookedCount / maxTokens) * 100);
                                                    const isFull = session.is_full || occupancyPct >= 100;
                                                    const isAmber = occupancyPct >= 80 && !isFull;

                                                    return (
                                                        <div
                                                            key={session.id}
                                                            onClick={() => {
                                                                if (!session.is_selectable) return;
                                                                setSelectedSessionId(session.id);
                                                                setActiveStep(2);
                                                            }}
                                                            className={`group p-4 rounded-2xl border transition-all cursor-pointer relative ${
                                                                !session.is_selectable
                                                                    ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5'
                                                                    : isSelected
                                                                    ? 'bg-gradient-to-r from-[#1E6FD9]/10 via-[#1E6FD9]/5 to-transparent border-[#1E6FD9] shadow-sm ring-1 ring-[#1E6FD9]'
                                                                    : 'bg-white/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-[#1E6FD9]/40 hover:bg-slate-50/70 dark:hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                {/* Doctor avatar, name & time */}
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                                                        {session.doctor_initials || 'DR'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                                                {session.doctor_name}
                                                                            </h4>
                                                                            {/* Keyboard hint badge (1-9) */}
                                                                            {sIdx < 9 && (
                                                                                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-white/10 text-slate-500">
                                                                                    {sIdx + 1}
                                                                                </kbd>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                            {session.doctor_specialty} · <span className="font-semibold text-slate-700 dark:text-slate-300">{session.start_time} - {session.end_time}</span> · {session.room_number}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Fee & Capacity Pill */}
                                                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                                                    <div className="text-right">
                                                                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                                                                            {session.total_fee_formatted}
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-[#1E6FD9]">
                                                                            Next token: #{session.next_token_number || (bookedCount + 1)}
                                                                        </span>
                                                                    </div>

                                                                    <div className="w-24">
                                                                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                                                                            <span>Booked</span>
                                                                            <span className={`font-bold ${isFull ? 'text-rose-500' : isAmber ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                                {bookedCount}/{maxTokens}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all ${
                                                                                    isFull ? 'bg-rose-500' : isAmber ? 'bg-amber-500' : 'bg-[#0E9E8F]'
                                                                                }`}
                                                                                style={{ width: `${Math.min(100, occupancyPct)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>

                        {/* =================================================================
                            ACCORDION STEP 2: PATIENT SELECTION
                            ================================================================= */}
                        <GlassCard className="transition-all overflow-hidden p-5 sm:p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            selectedPatient || (data.new_patient_name && data.new_patient_phone)
                                                ? 'bg-[#0E9E8F] text-white'
                                                : activeStep === 2
                                                ? 'bg-[#1E6FD9] text-white'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                                        }`}
                                    >
                                        {selectedPatient || (data.new_patient_name && data.new_patient_phone) ? (
                                            <Check className="w-4 h-4" />
                                        ) : activeStep < 2 ? (
                                            <Lock className="w-3.5 h-3.5 opacity-60" />
                                        ) : (
                                            '2'
                                        )}
                                    </div>
                                    <div>
                                        <h3
                                            className={`text-sm font-bold ${
                                                activeStep < 2 && !selectedPatient && !data.new_patient_name
                                                    ? 'text-slate-400 dark:text-slate-500'
                                                    : 'text-slate-900 dark:text-white'
                                            }`}
                                        >
                                            Step 2 — Patient details
                                        </h3>
                                        {activeStep !== 2 && (selectedPatient || data.new_patient_name) && (
                                            <p className="text-xs text-[#0E9E8F] font-medium mt-0.5">
                                                {selectedPatient ? selectedPatient.name : data.new_patient_name} ·{' '}
                                                {selectedPatient ? maskPhoneNumber(selectedPatient.phone) : maskPhoneNumber(data.new_patient_phone)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {activeStep !== 2 && activeStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveStep(2)}
                                        className="text-xs font-semibold text-[#1E6FD9] hover:underline px-2.5 py-1 rounded-lg hover:bg-[#1E6FD9]/10 transition-colors"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {/* Expanded Content for Step 2 */}
                            <AnimatePresence>
                                {activeStep === 2 && (
                                    <motion.div
                                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-4"
                                    >
                                        {/* Selected Patient Banner if already picked */}
                                        {selectedPatient ? (
                                            <div className="p-4 rounded-2xl bg-[#0E9E8F]/10 border border-[#0E9E8F]/30 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-[#0E9E8F] text-white flex items-center justify-center font-bold">
                                                        <UserCheck className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {selectedPatient.name}
                                                        </h4>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                                            {maskPhoneNumber(selectedPatient.phone)} {selectedPatient.nic ? `· NIC: ${maskNic(selectedPatient.nic)}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={clearSelectedPatient}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                                    >
                                                        Change
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveStep(3)}
                                                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-[#0c8a7d] shadow-xs"
                                                    >
                                                        <span>Next: Confirm</span>
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* BIG PATIENT SEARCH INPUT */}
                                                <div className="relative">
                                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        ref={patientSearchInputRef}
                                                        type="text"
                                                        value={patientQuery}
                                                        onChange={(e) => setPatientQuery(e.target.value)}
                                                        placeholder="Search by mobile, NIC or name..."
                                                        className="w-full pl-10 pr-10 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9] transition-all"
                                                    />
                                                    {isSearching && (
                                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                                            <div className="w-4 h-4 border-2 border-[#1E6FD9] border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Live Search Results Dropdown */}
                                                {patientSearchResults.length > 0 && (
                                                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5 max-h-56 overflow-y-auto">
                                                        {patientSearchResults.map((pat, idx) => (
                                                            <div
                                                                key={pat.id}
                                                                onClick={() => selectPatient(pat)}
                                                                className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                                    idx === selectedResultIndex
                                                                        ? 'bg-[#1E6FD9]/10 text-[#1E6FD9]'
                                                                        : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <span className="font-bold block text-slate-900 dark:text-white">
                                                                        {pat.name}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                                        {maskPhoneNumber(pat.phone)} {pat.nic ? `· NIC: ${maskNic(pat.nic)}` : ''}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#1E6FD9] bg-[#1E6FD9]/10 hover:bg-[#1E6FD9]/20"
                                                                >
                                                                    Select
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* RECENT PATIENTS (Last 5 used today) */}
                                                {recentPatients.length > 0 && (
                                                    <div>
                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                                            Recent patients today
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {recentPatients.map((rp) => (
                                                                <button
                                                                    key={rp.id}
                                                                    type="button"
                                                                    onClick={() => selectPatient(rp)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-[#1E6FD9]/10 hover:text-[#1E6FD9] text-slate-700 dark:text-slate-300 transition-colors"
                                                                >
                                                                    <User className="w-3 h-3 text-slate-400" />
                                                                    <span>{rp.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* NEW WALK-IN PATIENT TOGGLE & INLINE FORM */}
                                                <div className="pt-2">
                                                    {!isInlineNewPatientOpen ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsInlineNewPatientOpen(true)}
                                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#0E9E8F] bg-[#0E9E8F]/10 hover:bg-[#0E9E8F]/20 border border-[#0E9E8F]/20 transition-all hover:scale-[1.01]"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            <span>+ New walk-in patient</span>
                                                        </button>
                                                    ) : (
                                                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                    <UserPlus className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                                                    New walk-in patient
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsInlineNewPatientOpen(false)}
                                                                    className="text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                                                        Patient name *
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={data.new_patient_name}
                                                                        onChange={(e) => setData('new_patient_name', e.target.value)}
                                                                        placeholder="e.g. Kasun Fernando"
                                                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                                                        Mobile number *
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={data.new_patient_phone}
                                                                        onChange={(e) => setData('new_patient_phone', e.target.value)}
                                                                        placeholder="e.g. 0771234567"
                                                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                                                        NIC (Optional)
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={data.new_patient_nic}
                                                                        onChange={(e) => setData('new_patient_nic', e.target.value)}
                                                                        placeholder="e.g. 199012345678"
                                                                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                                                        Gender
                                                                    </label>
                                                                    <div className="flex items-center gap-2">
                                                                        {['male', 'female', 'other'].map((g) => (
                                                                            <button
                                                                                key={g}
                                                                                type="button"
                                                                                onClick={() => setData('new_patient_gender', g)}
                                                                                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                                                                                    data.new_patient_gender === g
                                                                                        ? 'bg-[#0E9E8F] text-white border-[#0E9E8F]'
                                                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                                                                                }`}
                                                                            >
                                                                                {g}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end pt-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={!data.new_patient_name.trim() || !data.new_patient_phone.trim()}
                                                                    onClick={() => setActiveStep(3)}
                                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-[#0c8a7d] disabled:opacity-40 shadow-xs"
                                                                >
                                                                    <span>Next: Confirm & issue</span>
                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>

                        {/* =================================================================
                            ACCORDION STEP 3: CONFIRM & ISSUE
                            ================================================================= */}
                        <GlassCard className="transition-all overflow-hidden p-5 sm:p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            activeStep === 3
                                                ? 'bg-[#1E6FD9] text-white'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                                        }`}
                                    >
                                        {activeStep < 3 ? <Lock className="w-3.5 h-3.5 opacity-60" /> : '3'}
                                    </div>
                                    <div>
                                        <h3
                                            className={`text-sm font-bold ${
                                                activeStep < 3 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                                            }`}
                                        >
                                            Step 3 — Confirm & issue
                                        </h3>
                                        {activeStep === 3 && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Review visit type, fees, discount and issue token.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content for Step 3 */}
                            <AnimatePresence>
                                {activeStep === 3 && (
                                    <motion.div
                                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-5"
                                    >
                                        {/* VISIT TYPE: SEGMENTED BUTTONS (Not empty dropdown) */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                                                Visit type
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {visitTypes.map((vt) => {
                                                    const isSelected = String(vt.id) === String(data.visit_type_id);
                                                    return (
                                                        <button
                                                            key={vt.id}
                                                            type="button"
                                                            onClick={() => setData('visit_type_id', String(vt.id))}
                                                            className={`p-3 rounded-2xl border text-left transition-all ${
                                                                isSelected
                                                                    ? 'bg-[#1E6FD9]/10 border-[#1E6FD9] text-[#1E6FD9] shadow-xs'
                                                                    : 'bg-white/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="font-bold text-xs block truncate">
                                                                {vt.name}
                                                            </span>
                                                            <span className="text-[10px] opacity-75 block mt-0.5">
                                                                {vt.pricing_type === 'percentage'
                                                                    ? `${vt.percentage_value}% fee`
                                                                    : vt.fixed_fee_cents > 0
                                                                    ? `Rs. ${(vt.fixed_fee_cents / 100).toLocaleString()}`
                                                                    : 'Standard'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* DISCOUNT SELECT (Shown only to roles with discount permission) */}
                                        {discountConfig.can_discount && (
                                            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                        <Shield className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                                        <span>Discount (your limit: {discountConfig.max_display})</span>
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                    <div>
                                                        <select
                                                            value={data.discount_type}
                                                            onChange={(e) => {
                                                                const dt = e.target.value as any;
                                                                setData('discount_type', dt);
                                                                if (dt === 'waiver') setData('discount_value', 100);
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:ring-2 focus:ring-[#1E6FD9] focus:outline-hidden"
                                                        >
                                                            <option value="none" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">No discount</option>
                                                            <option value="percent" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Percentage (%)</option>
                                                            <option value="amount" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Fixed amount (Rs.)</option>
                                                            <option value="waiver" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">Full fee waiver (100%)</option>
                                                        </select>
                                                    </div>

                                                    {data.discount_type !== 'none' && data.discount_type !== 'waiver' && (
                                                        <div>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={data.discount_value || ''}
                                                                onChange={(e) => setData('discount_value', Number(e.target.value))}
                                                                placeholder={data.discount_type === 'percent' ? 'e.g. 10%' : 'e.g. 500'}
                                                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                                            />
                                                        </div>
                                                    )}

                                                    {data.discount_type !== 'none' && (
                                                        <div className={data.discount_type === 'waiver' ? 'sm:col-span-2' : ''}>
                                                            <input
                                                                type="text"
                                                                value={data.discount_reason}
                                                                onChange={(e) => setData('discount_reason', e.target.value)}
                                                                placeholder="Reason for discount (required) *"
                                                                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* COLLECT PAYMENT NOW TOGGLE & METHOD */}
                                        <div className="flex flex-wrap items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 gap-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="collect_pay_toggle"
                                                    checked={data.payment_collected}
                                                    onChange={(e) => setData('payment_collected', e.target.checked)}
                                                    className="w-4 h-4 rounded text-[#0E9E8F] focus:ring-[#0E9E8F] border-slate-300"
                                                />
                                                <label htmlFor="collect_pay_toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                                                    Collect payment now at desk
                                                </label>
                                            </div>

                                            {data.payment_collected && (
                                                <div className="flex items-center gap-1.5">
                                                    {(['cash', 'card'] as const).map((method) => (
                                                        <button
                                                            key={method}
                                                            type="button"
                                                            onClick={() => setData('payment_method', method)}
                                                            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all border ${
                                                                data.payment_method === method
                                                                    ? 'bg-[#0E9E8F] text-white border-[#0E9E8F]'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                                                            }`}
                                                        >
                                                            {method}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* CLEAN FEE BREAKDOWN SUMMARY */}
                                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-1.5 text-xs">
                                            <div className="flex justify-between text-slate-500">
                                                <span>Doctor consultation fee</span>
                                                <span className="font-mono">Rs. {liveFeeCalculation.baseDoctorFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500">
                                                <span>Clinic fee</span>
                                                <span className="font-mono">Rs. {liveFeeCalculation.baseClinicFee.toLocaleString()}</span>
                                            </div>
                                            {liveFeeCalculation.discountAmount > 0 && (
                                                <div className="flex justify-between text-[#FF7A59] font-medium">
                                                    <span>Discount / waiver</span>
                                                    <span className="font-mono">-Rs. {liveFeeCalculation.discountAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                                                <span>Total payable</span>
                                                <span className="font-mono text-[#1E6FD9]">Rs. {liveFeeCalculation.patientTotal.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* PRIMARY ISSUE TOKEN BUTTON */}
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={handleIssueToken}
                                                disabled={processing}
                                                className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-lg shadow-[#1E6FD9]/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                                            >
                                                <Ticket className="w-4 h-4" />
                                                <span>{processing ? 'Issuing token...' : 'Issue token'}</span>
                                                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/20 text-white ml-1">
                                                    Ctrl + Enter
                                                </kbd>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>
                    </div>

                    {/* =========================================================================
                        RIGHT COLUMN (~38%, STICKY): TICKET PREVIEW + TODAY'S TOKENS
                        ========================================================================= */}
                    <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-24">
                        {/* THE TICKET PREVIEW CARD (Realistic Thermal Notch & Tear Line) */}
                        <div className="relative">
                            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xl relative overflow-hidden">
                                {/* Left & Right Notches for Ticket Silhouette */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 shadow-inner" />
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 shadow-inner" />

                                {/* Ticket Top Section */}
                                <div className="text-center pb-4">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white flex items-center justify-center mx-auto mb-2 font-bold text-xs shadow-xs">
                                        <Ticket className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        {clinicInfo.name || 'MedVisit Clinic'}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Channeling Appointment Slip
                                    </p>
                                </div>

                                {/* Large Token Number Display (with shimmer when empty) */}
                                <div className="text-center py-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E6FD9] block">
                                        Assigned token
                                    </span>
                                    <span className="text-5xl font-black text-slate-900 dark:text-white font-mono tracking-tight block leading-none mt-1">
                                        #{justIssuedTicket?.token_number || (activeSession ? previewTokenNumber : '—')}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium mt-1.5 block">
                                        Est. {justIssuedTicket?.estimated_time || approximateTime}
                                    </span>
                                </div>

                                {/* Patient & Doctor Details */}
                                <div className="space-y-2 py-3 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Doctor:</span>
                                        {activeSession ? (
                                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                                {justIssuedTicket?.doctor_name || activeSession.doctor_name}
                                            </span>
                                        ) : (
                                            <span className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Room:</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {justIssuedTicket?.room_number || (activeSession?.room_number ?? 'Consultation Suite')}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Patient:</span>
                                        {selectedPatient || data.new_patient_name || justIssuedTicket ? (
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {justIssuedTicket?.patient_name || (selectedPatient ? selectedPatient.name : data.new_patient_name)}
                                            </span>
                                        ) : (
                                            <span className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Visit type:</span>
                                        <span className="font-medium text-slate-600 dark:text-slate-400">
                                            {selectedVisitType?.name || 'Standard Consultation'}
                                        </span>
                                    </div>
                                </div>

                                {/* Dashed Tear Line */}
                                <div className="border-b-2 border-dashed border-slate-200 dark:border-white/10 my-4" />

                                {/* Ticket Bottom Tear Section: Fee & Payment Status */}
                                <div className="flex items-center justify-between text-xs pt-1">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                            Total fee
                                        </span>
                                        <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                                            {justIssuedTicket?.total_fee_formatted || `Rs. ${liveFeeCalculation.patientTotal.toLocaleString()}`}
                                        </span>
                                    </div>

                                    <div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                                                data.payment_collected || justIssuedTicket?.payment_status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                            }`}
                                        >
                                            {data.payment_collected || justIssuedTicket?.payment_status === 'paid' ? 'Paid' : 'Payment due'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUCCESS ACTIONS PANEL (Shown on successful issue) */}
                        <AnimatePresence>
                            {justIssuedTicket && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3"
                                >
                                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Token #{justIssuedTicket.token_number} issued successfully!</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {/* Print Slip */}
                                        <button
                                            type="button"
                                            onClick={() => window.print()}
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 shadow-xs transition-colors"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>Print slip</span>
                                        </button>

                                        {/* Send WhatsApp */}
                                        {justIssuedTicket.patient_phone && (
                                            <a
                                                href={generateWhatsAppUrl(justIssuedTicket)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-[#0c8a7d] shadow-xs transition-colors"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                                <span>Send WhatsApp</span>
                                            </a>
                                        )}

                                        {/* Open in Queue */}
                                        <Link
                                            href={`/sessions/today?session_id=${activeSession?.id}`}
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#1E6FD9] bg-[#1E6FD9]/10 hover:bg-[#1E6FD9]/20 transition-colors"
                                        >
                                            <Tv className="w-3.5 h-3.5" />
                                            <span>Open in queue</span>
                                        </Link>

                                        {/* Issue Another Token */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setJustIssuedTicket(null);
                                                setActiveStep(2);
                                            }}
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800 hover:bg-slate-100 shadow-xs transition-colors"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>Issue another</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* TODAY'S TOKENS LIVE LIST */}
                        <GlassCard className="p-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#1E6FD9]" />
                                    <span>Today's tokens</span>
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1E6FD9]/10 text-[#1E6FD9]">
                                    {recentBookings.length}
                                </span>
                            </div>

                            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                                {recentBookings.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-6 text-center italic">
                                        No tokens issued yet today.
                                    </p>
                                ) : (
                                    recentBookings.map((b) => (
                                        <div
                                            key={b.id}
                                            className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs hover:border-[#1E6FD9]/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white font-black font-mono flex items-center justify-center text-xs shrink-0">
                                                    #{b.token_number}
                                                </span>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                                                        {b.patient_name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block truncate">
                                                        {b.doctor_name} · {b.estimated_time}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                        b.payment_status === 'paid'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}
                                                >
                                                    {b.payment_status}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTokenToMove({
                                                            id: b.id,
                                                            token_number: b.token_number,
                                                            patient_id: b.patient_id,
                                                            patient_name: b.patient_name,
                                                            patient_phone: b.patient_phone,
                                                            doctor_name: b.doctor_name,
                                                            doctor_specialty: b.doctor_specialty,
                                                            session_date: b.session_date,
                                                            payment_status: b.payment_status,
                                                        });
                                                        setMoveModalOpen(true);
                                                    }}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                                    title="Move token to another session"
                                                >
                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>
                </div>

                {/* STICKY BOTTOM BAR FOR TABLET/MOBILE (<1280px) */}
                <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 p-3 shadow-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            Token #{previewTokenNumber} · {selectedPatient ? selectedPatient.name : data.new_patient_name || 'Patient'}
                        </span>
                        <span className="text-[11px] font-mono text-[#1E6FD9] block">
                            Rs. {liveFeeCalculation.patientTotal.toLocaleString()}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleIssueToken}
                        disabled={processing}
                        className="min-h-[44px] px-5 rounded-2xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-md shadow-[#1E6FD9]/20 transition-all shrink-0"
                    >
                        {processing ? 'Issuing...' : 'Issue token'}
                    </button>
                </div>
            </div>

            {/* QUICK CREATE ONE-OFF SESSION MODAL */}
            <AnimatePresence>
                {quickSessionModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-[#1E6FD9]" />
                                    <span>Create session for {formattedHumanDate}</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setQuickSessionModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleQuickSessionSubmit} className="space-y-3 pt-1">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                        Doctor *
                                    </label>
                                    <select
                                        value={quickDocId}
                                        onChange={(e) => setQuickDocId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:ring-2 focus:ring-[#1E6FD9] focus:outline-hidden"
                                        required
                                    >
                                        {doctors.map((d) => {
                                            const cleanName = d.name.replace(/^(Dr\.?\s*)+/i, 'Dr. ');
                                            return (
                                                <option
                                                    key={d.id}
                                                    value={String(d.id)}
                                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1"
                                                >
                                                    {cleanName} ({d.specialty})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                            Start time *
                                        </label>
                                        <input
                                            type="time"
                                            value={quickStartTime}
                                            onChange={(e) => setQuickStartTime(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                            End time *
                                        </label>
                                        <input
                                            type="time"
                                            value={quickEndTime}
                                            onChange={(e) => setQuickEndTime(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                            Max token capacity
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quickMaxTokens}
                                            onChange={(e) => setQuickMaxTokens(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                                            Consultation room
                                        </label>
                                        <input
                                            type="text"
                                            value={quickRoom}
                                            onChange={(e) => setQuickRoom(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setQuickSessionModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-xs"
                                    >
                                        Create session
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* KEYBOARD SHORTCUTS MODAL */}
            <AnimatePresence>
                {showShortcutsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-[#1E6FD9]" />
                                    <span>Keyboard shortcuts</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowShortcutsModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                    <span className="text-slate-600 dark:text-slate-300">Select session 1–9</span>
                                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono">1 – 9</kbd>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                    <span className="text-slate-600 dark:text-slate-300">Issue token</span>
                                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono">Ctrl + Enter</kbd>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                                    <span className="text-slate-600 dark:text-slate-300">Previous step</span>
                                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono">Esc</kbd>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-slate-600 dark:text-slate-300">Select patient in search</span>
                                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono">↓ / ↑ + Enter</kbd>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MOVE TOKEN MODAL */}
            {moveModalOpen && tokenToMove && (
                <MoveTokenModal
                    isOpen={moveModalOpen}
                    onClose={() => setMoveModalOpen(false)}
                    token={tokenToMove}
                    doctors={doctors}
                />
            )}

            {/* HIDDEN 80MM THERMAL RECEIPT SLIP FOR BROWSER PRINTING */}
            <div id="printable-token-slip" className="hidden">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 2px 0' }}>
                        {clinicInfo.name}
                    </h2>
                    <p style={{ fontSize: '11px', margin: 0 }}>{clinicInfo.address}</p>
                    <p style={{ fontSize: '11px', margin: 0 }}>Tel: {clinicInfo.phone}</p>
                    <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />
                </div>

                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Token Number</div>
                    <div style={{ fontSize: '38px', fontWeight: 'bold', margin: '2px 0' }}>
                        #{justIssuedTicket?.token_number || '—'}
                    </div>
                    <div style={{ fontSize: '12px' }}>
                        Estimated Time: {justIssuedTicket?.estimated_time || 'Queue'}
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />

                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    <div><strong>Doctor:</strong> {justIssuedTicket?.doctor_name}</div>
                    <div><strong>Room:</strong> {justIssuedTicket?.room_number || 'Room 1'}</div>
                    <div><strong>Date:</strong> {justIssuedTicket?.session_date}</div>
                    <div><strong>Patient:</strong> {justIssuedTicket?.patient_name}</div>
                    <div><strong>Total:</strong> {justIssuedTicket?.total_fee_formatted}</div>
                    <div><strong>Status:</strong> {justIssuedTicket?.payment_status === 'paid' ? 'PAID' : 'PAYMENT DUE'}</div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px' }}>
                    <p style={{ margin: '0 0 2px 0' }}>Thank you for visiting {clinicInfo.name}!</p>
                    <p style={{ margin: 0 }}>Live Queue TV: https://{clinicInfo.subdomain}.medvisit.lk/queue/tv</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
