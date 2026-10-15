import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { StatusBadge } from '@/Components/UI/StatusBadge';
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
    AlertCircle,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Stethoscope,
    Phone,
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
    estimated_time: string;
    status: string;
    booked_via: string;
    created_at_time: string;
    total_fee_formatted: string;
    receipt_number: string | null;
    payment_status: string;
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
}

export default function BookingsIndex({ sessions, recentBookings, clinicInfo }: Props) {
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

    // Form
    const { data, setData, post, processing, errors, reset } = useForm({
        doctor_session_id: sessions[0]?.id ? String(sessions[0].id) : '',
        patient_id: '' as string | number,
        new_patient_name: '',
        new_patient_phone: '+94 ',
        new_patient_nic: '',
        new_patient_gender: 'male',
        notes: '',
    });

    const activeSession = sessions.find((s) => s.id === selectedSessionId) || null;

    useEffect(() => {
        if (activeSession) {
            setData('doctor_session_id', String(activeSession.id));
        }
    }, [selectedSessionId]);

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
    };

    const clearSelectedPatient = () => {
        setSelectedPatient(null);
        setData('patient_id', '');
        setPatientQuery('');
    };

    const handleIssueToken = (e: React.FormEvent) => {
        e.preventDefault();
        post('/bookings', {
            onSuccess: () => {
                // Prepare slip preview from latest selection
                const estMinutes = (activeSession?.booked_tokens_count || 0) * 10;
                setActiveSlip({
                    token_number: (activeSession?.booked_tokens_count || 0) + 1,
                    doctor_name: activeSession?.doctor_name,
                    doctor_specialty: activeSession?.doctor_specialty,
                    room_number: activeSession?.room_number,
                    session_date: activeSession?.session_date_formatted,
                    approx_time: activeSession?.start_time,
                    patient_name: selectedPatient ? selectedPatient.name : data.new_patient_name,
                    patient_phone: selectedPatient ? selectedPatient.phone : data.new_patient_phone,
                    fee_formatted: activeSession?.total_fee_formatted,
                });
                setSlipModalOpen(true);
                clearSelectedPatient();
                reset('new_patient_name', 'new_patient_nic');
                setData('new_patient_phone', '+94 ');
            },
        });
    };

    const cancelBooking = (b: RecentBooking) => {
        if (confirm(`Cancel Token #${b.token_number} for ${b.patient_name}?`)) {
            router.post(`/bookings/${b.id}/cancel`, {}, { preserveScroll: true });
        }
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

    const generateWhatsAppUrl = (slip: any) => {
        const cleanPhone = (slip?.patient_phone || '').replace(/[^0-9]/g, '');
        const text = `🏥 *${clinicInfo.name}* - Channeling Token Slip\n\n` +
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
            <Head title="Issue Token & Bookings" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40">
                                Reception Desk
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                            Issue Channeling Token
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Fast 3-step token desk: pick doctor session, look up or enter patient, and issue print slip / WhatsApp confirmation.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: ISSUANCE FORM (7 COLS) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* STEP 1: SELECT CHANNELING SESSION */}
                        <GlassCard className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                                        1
                                    </span>
                                    Select Channeling Session
                                </h3>
                                <span className="text-[11px] text-slate-400">
                                    {sessions.length} upcoming session(s)
                                </span>
                            </div>

                            {sessions.length === 0 ? (
                                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
                                    No scheduled sessions found for today or upcoming dates. Please add a doctor and session first.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                                    {sessions.map((s) => {
                                        const isSelected = selectedSessionId === s.id;
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setSelectedSessionId(s.id)}
                                                className={`text-left p-3 rounded-2xl border transition-all text-xs ${
                                                    isSelected
                                                        ? 'border-primary bg-primary-50/50 dark:bg-primary-950/40 shadow-xs'
                                                        : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                                        {s.doctor_name}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                            s.is_full
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                        }`}
                                                    >
                                                        {s.is_full ? 'FULL' : `${s.available_tokens_count} left`}
                                                    </span>
                                                </div>

                                                <p className="text-[11px] text-primary dark:text-primary-400 font-semibold mt-0.5">
                                                    {s.doctor_specialty}
                                                </p>

                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                                                    <span>{s.session_date_formatted}</span>
                                                    <span>{s.start_time}</span>
                                                </div>
                                                <div className="mt-1 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                                    {s.total_fee_formatted}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassCard>

                        {/* STEP 2: PATIENT SEARCH / ENTRY */}
                        <GlassCard className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                                        2
                                    </span>
                                    Patient Information
                                </h3>

                                {selectedPatient && (
                                    <button
                                        type="button"
                                        onClick={clearSelectedPatient}
                                        className="text-[11px] font-semibold text-rose-500 hover:underline"
                                    >
                                        Change Patient
                                    </button>
                                )}
                            </div>

                            {selectedPatient ? (
                                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                                            {selectedPatient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                {selectedPatient.name}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {selectedPatient.phone} {selectedPatient.nic ? `• NIC: ${selectedPatient.nic}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                        Existing Patient
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Search by phone or NIC */}
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={patientQuery}
                                            onChange={(e) => setPatientQuery(e.target.value)}
                                            placeholder="Search existing patient by +94 mobile, NIC, or name..."
                                            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                                        />
                                        {isSearching && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 animate-pulse">
                                                Searching...
                                            </span>
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {patientSearchResults.length > 0 && (
                                        <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900 shadow-lg max-h-48 overflow-y-auto">
                                            {patientSearchResults.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => selectPatient(p)}
                                                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {p.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            {p.phone} {p.nic ? `• ${p.nic}` : ''} {p.city ? `• ${p.city}` : ''}
                                                        </span>
                                                    </div>
                                                    <span className="text-primary font-bold text-[11px]">Select</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* New Patient Form Accordion */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-3">
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase">
                                            Or Quick Register New Patient
                                        </p>

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
                                                    className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                    Phone (+94 Mobile) *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.new_patient_phone}
                                                    onChange={(e) => setData('new_patient_phone', e.target.value)}
                                                    placeholder="+94 77 123 4567"
                                                    className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
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
                                                    className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                    Gender
                                                </label>
                                                <select
                                                    value={data.new_patient_gender}
                                                    onChange={(e) => setData('new_patient_gender', e.target.value)}
                                                    className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* STEP 3: SUBMIT ACTION */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm">
                            <div>
                                <span className="text-[11px] text-slate-400 block font-semibold">Total Fee Payable</span>
                                <span className="text-lg font-extrabold text-primary">
                                    {activeSession?.total_fee_formatted || 'Rs. 0.00'}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleIssueToken}
                                disabled={processing || !activeSession || activeSession.is_full}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 disabled:opacity-50 transition-all hover:-translate-y-0.5"
                            >
                                <Ticket className="w-4 h-4" />
                                <span>{processing ? 'Issuing...' : 'Issue Atomic Token'}</span>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: RECENT BOOKINGS & SLIP PREVIEW (5 COLS) */}
                    <div className="lg:col-span-5 space-y-4">
                        <GlassCard className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Today's Issued Tokens ({recentBookings.length})
                                </h3>
                            </div>

                            {recentBookings.length === 0 ? (
                                <p className="text-xs text-slate-400 py-8 text-center italic">
                                    No tokens issued yet today.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                    {recentBookings.map((b) => (
                                        <div
                                            key={b.id}
                                            className={`p-3 rounded-2xl border text-xs transition-colors flex items-center justify-between ${
                                                b.status === 'cancelled'
                                                    ? 'bg-rose-50/30 border-rose-200/50 opacity-60'
                                                    : 'bg-slate-50/70 dark:bg-white/5 border-slate-100 dark:border-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0">
                                                    #{b.token_number}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                                                        {b.patient_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 block truncate">
                                                        {b.doctor_name} • {b.estimated_time || 'Queue'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openSlipForRecent(b)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40"
                                                    title="View & Print Slip"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                </button>

                                                <a
                                                    href={generateWhatsAppUrl(b)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                                    title="Share via WhatsApp"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </a>

                                                {b.status !== 'cancelled' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => cancelBooking(b)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
