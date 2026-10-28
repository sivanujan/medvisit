import React, { useState, useEffect, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { GlassModal } from '@/Components/UI/GlassModal';
import { GlassCard } from '@/Components/UI/GlassCard';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    Ticket,
    Calendar,
    Clock,
    User,
    UserPlus,
    CheckCircle2,
    Search,
    AlertCircle,
    Building2,
    DollarSign,
    Sparkles,
    Printer,
    Share2,
    X,
    Filter,
} from 'lucide-react';

export interface PatientInfo {
    id: number;
    formatted_id?: string;
    name: string;
    phone: string;
    nic?: string | null;
    gender?: string;
    date_of_birth?: string | null;
    age?: number | null;
    city?: string;
    allergies?: string | null;
}

export interface DoctorItem {
    id: number;
    name: string;
    specialty: string;
    doctor_fee_lkr?: number;
    clinic_fee_lkr?: number;
    total_fee_lkr?: number;
    avg_consultation_minutes?: number;
}

export interface VisitTypeItem {
    id: number;
    name: string;
    code: string;
    pricing_type: string;
    is_default?: boolean;
}

interface AssignDoctorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    patient?: PatientInfo | null;
    doctors: DoctorItem[];
    visitTypes?: VisitTypeItem[];
    onTokenIssued?: (token: any) => void;
}

export const AssignDoctorDrawer: React.FC<AssignDoctorDrawerProps> = ({
    isOpen,
    onClose,
    patient: initialPatient = null,
    doctors = [],
    visitTypes = [],
    onTokenIssued,
}) => {
    // Patient selection state
    const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(initialPatient);
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<PatientInfo[]>([]);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [isCreatingWalkIn, setIsCreatingWalkIn] = useState(false);

    // Walk-in form fields
    const [walkInName, setWalkInName] = useState('');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [walkInNic, setWalkInNic] = useState('');
    const [walkInGender, setWalkInGender] = useState('male');
    const [walkInDob, setWalkInDob] = useState('');
    const [existingPhoneMatch, setExistingPhoneMatch] = useState<PatientInfo | null>(null);

    // Doctor & Session state
    const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(doctors[0]?.id || null);
    const [availableSessions, setAvailableSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [filterChip, setFilterChip] = useState<'all' | 'today' | 'tomorrow' | 'morning' | 'evening'>('all');

    // Visit type & billing state
    const defaultVisitId = visitTypes.find((v) => v.is_default)?.id || visitTypes[0]?.id || '';
    const [visitTypeId, setVisitTypeId] = useState<string | number>(defaultVisitId);
    const [paymentCollected, setPaymentCollected] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
    const [notes, setNotes] = useState('');

    // Submission & results state
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Update patient when prop changes
    useEffect(() => {
        if (initialPatient) {
            setSelectedPatient(initialPatient);
            setIsCreatingWalkIn(false);
        } else {
            setSelectedPatient(null);
        }
    }, [initialPatient, isOpen]);

    // Live Patient Search (supporting 14, #14, PAT-00014, name, phone, nic)
    useEffect(() => {
        if (selectedPatient || patientSearchQuery.trim().length < 1) {
            setPatientSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingPatient(true);
            try {
                const res = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setPatientSearchResults(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearchingPatient(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [patientSearchQuery, selectedPatient]);

    // Duplicate Phone check when typing in walk-in form
    useEffect(() => {
        const clean = walkInPhone.replace(/\D/g, '');
        if (clean.length < 9) {
            setExistingPhoneMatch(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/patients/by-phone?phone=${encodeURIComponent(walkInPhone)}`);
                if (res.ok) {
                    const data = await res.json();
                    setExistingPhoneMatch(data);
                }
            } catch (e) {
                console.error(e);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [walkInPhone]);

    // Fetch 14-day sessions when selected doctor changes
    useEffect(() => {
        if (!selectedDoctorId || !isOpen) {
            setAvailableSessions([]);
            return;
        }

        let cancelled = false;
        setLoadingSessions(true);
        setSelectedSessionId(null);

        fetch(`/doctors/${selectedDoctorId}/available-sessions?days=14`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) {
                    setAvailableSessions(data.sessions || []);
                    // Auto-select first selectable
                    const first = (data.sessions || []).find((s: any) => s.is_selectable);
                    if (first) setSelectedSessionId(first.id);
                }
            })
            .catch((err) => {
                console.error(err);
                if (!cancelled) setErrorMsg('Failed to fetch doctor sessions.');
            })
            .finally(() => {
                if (!cancelled) setLoadingSessions(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedDoctorId, isOpen]);

    // Filter sessions
    const filteredSessions = useMemo(() => {
        return availableSessions.filter((s) => {
            if (!s.is_selectable) return false;
            if (filterChip === 'today') return s.is_today;
            if (filterChip === 'tomorrow') return s.is_tomorrow;
            if (filterChip === 'morning') return s.time_of_day === 'morning';
            if (filterChip === 'evening') return s.time_of_day === 'evening' || s.time_of_day === 'afternoon';
            return true;
        });
    }, [availableSessions, filterChip]);

    const activeSession = useMemo(() => {
        return availableSessions.find((s) => s.id === selectedSessionId) || null;
    }, [availableSessions, selectedSessionId]);

    const selectedDoctor = useMemo(() => {
        return doctors.find((d) => d.id === selectedDoctorId) || doctors[0] || null;
    }, [doctors, selectedDoctorId]);

    // Computed age from DOB
    const computedAge = useMemo(() => {
        if (!walkInDob) return null;
        const birthDate = new Date(walkInDob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    }, [walkInDob]);

    const handleIssueToken = () => {
        if (!selectedSessionId) {
            setErrorMsg('Please select a doctor session.');
            return;
        }

        if (!selectedPatient && (!walkInName.trim() || !walkInPhone.trim())) {
            setErrorMsg('Please select an existing patient or provide walk-in name & phone.');
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        const payload: any = {
            doctor_session_id: selectedSessionId,
            visit_type_id: visitTypeId || undefined,
            payment_collected: paymentCollected,
            payment_method: paymentMethod,
            notes,
        };

        if (selectedPatient) {
            payload.patient_id = selectedPatient.id;
        } else {
            payload.new_patient_name = walkInName;
            payload.new_patient_phone = walkInPhone;
            payload.new_patient_nic = walkInNic || undefined;
            payload.new_patient_gender = walkInGender;
            payload.new_patient_dob = walkInDob || undefined;
        }

        router.post('/bookings', payload, {
            preserveScroll: true,
            onSuccess: (page) => {
                setSubmitting(false);
                onClose();
                if (onTokenIssued) {
                    onTokenIssued(page.props.flash);
                }
            },
            onError: (errs) => {
                setSubmitting(false);
                const firstErr = Object.values(errs)[0];
                setErrorMsg(typeof firstErr === 'string' ? firstErr : 'Failed to issue token.');
            },
        });
    };

    if (!isOpen) return null;

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Doctor & Issue Token"
            subtitle="Pick doctor, select from 14-day schedule, and assign patient token"
            maxWidth="max-w-3xl"
        >
            <div className="space-y-4 text-xs">
                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* PATIENT SECTION */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Patient Information
                    </span>

                    {selectedPatient ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 font-bold flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                        {selectedPatient.name}{' '}
                                        <span className="text-slate-400 font-normal">
                                            ({selectedPatient.formatted_id || `#${selectedPatient.id}`})
                                        </span>
                                    </span>
                                    <span className="text-slate-500 text-[11px] flex items-center gap-2">
                                        <span>📞 {selectedPatient.phone}</span>
                                        {selectedPatient.nic && <span>• NIC: {selectedPatient.nic}</span>}
                                        {selectedPatient.age && <span>• {selectedPatient.age} yrs</span>}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedPatient(null)}
                                className="text-xs text-primary font-bold hover:underline"
                            >
                                Change
                            </button>
                        </div>
                    ) : isCreatingWalkIn ? (
                        /* WALK-IN QUICK CREATE FORM WITH PHONE INPUT & DUPLICATE CHECK */
                        <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-white/10">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                                    <span>New Walk-in Patient</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingWalkIn(false)}
                                    className="text-[11px] text-slate-400 hover:text-slate-600"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={walkInName}
                                        onChange={(e) => setWalkInName(e.target.value)}
                                        placeholder="e.g. Sunil Perera"
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Mobile Phone (+94) *
                                    </label>
                                    <PhoneInput
                                        value={walkInPhone}
                                        onChange={(val) => setWalkInPhone(val)}
                                        placeholder="77 123 4567"
                                    />
                                </div>

                                {/* Duplicate phone prompt */}
                                {existingPhoneMatch && (
                                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-amber-800 dark:text-amber-200 text-xs">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>
                                                Existing patient found:{' '}
                                                <strong>{existingPhoneMatch.name}</strong> ({existingPhoneMatch.phone})
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedPatient(existingPhoneMatch);
                                                setIsCreatingWalkIn(false);
                                                setExistingPhoneMatch(null);
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs"
                                        >
                                            Select This Patient
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Date of Birth {computedAge !== null ? `(${computedAge} yrs)` : ''}
                                    </label>
                                    <input
                                        type="date"
                                        value={walkInDob}
                                        onChange={(e) => setWalkInDob(e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Gender
                                    </label>
                                    <GlassSelect
                                        value={walkInGender}
                                        onValueChange={(val) => setWalkInGender(val)}
                                        options={[
                                            { value: 'male', label: 'Male' },
                                            { value: 'female', label: 'Female' },
                                            { value: 'other', label: 'Other' },
                                        ]}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        National ID / NIC (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={walkInNic}
                                        onChange={(e) => setWalkInNic(e.target.value)}
                                        placeholder="e.g. 198512345678"
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* PATIENT SEARCH INPUT (accepts "14", "#14", "PAT-00014", name, phone) */
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={patientSearchQuery}
                                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                                    placeholder="Search patient by ID (#14, PAT-00014), mobile phone (+94), or name..."
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            {/* Search Results Dropdown */}
                            {patientSearchResults.length > 0 && (
                                <div className="border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 shadow-md">
                                    {patientSearchResults.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPatient(p);
                                                setPatientSearchQuery('');
                                                setPatientSearchResults([]);
                                            }}
                                            className="w-full p-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between text-xs transition-colors"
                                        >
                                            <div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                                    {p.name}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {p.formatted_id || `#${p.id}`} • {p.phone} {p.nic ? `• NIC: ${p.nic}` : ''}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-primary font-bold">Select</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-400">
                                    Tip: You can search directly by entering ID like "14" or "#14".
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingWalkIn(true)}
                                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                                >
                                    <UserPlus className="w-3 h-3" />
                                    <span>+ Register new walk-in patient</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* DOCTOR SELECTOR */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Select Doctor
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {doctors.map((d) => (
                            <button
                                key={d.id}
                                type="button"
                                onClick={() => setSelectedDoctorId(d.id)}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                    selectedDoctorId === d.id
                                        ? 'border-primary bg-primary-50/50 dark:bg-primary-950/30 text-primary font-bold shadow-xs'
                                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <span className="block truncate text-xs font-bold">{d.name}</span>
                                <span className="block text-[10px] text-slate-500 truncate">{d.specialty}</span>
                                {d.total_fee_lkr && (
                                    <span className="block text-[10px] text-primary mt-1 font-semibold">
                                        Rs. {d.total_fee_lkr.toLocaleString()}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 14-DAY AVAILABLE SESSIONS PICKER */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Available Sessions (Next 14 Days)
                        </label>
                        <div className="flex items-center gap-1">
                            {(['all', 'today', 'tomorrow', 'morning', 'evening'] as const).map((chip) => (
                                <button
                                    key={chip}
                                    type="button"
                                    onClick={() => setFilterChip(chip)}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize transition-colors ${
                                        filterChip === chip
                                            ? 'bg-primary text-white'
                                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingSessions ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            <span className="inline-block animate-spin mr-2">⏳</span> Generating & loading next 14-day schedule...
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                            No available sessions found for {selectedDoctor?.name || 'doctor'} in the next 14 days under filter "{filterChip}".
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {filteredSessions.map((s) => {
                                const isSelected = selectedSessionId === s.id;
                                const capacityPercent = Math.min(100, Math.round((s.booked_tokens_count / s.max_tokens) * 100));

                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSelectedSessionId(s.id)}
                                        className={`p-2.5 rounded-xl border text-left transition-all relative ${
                                            isSelected
                                                ? 'border-primary ring-2 ring-primary/20 bg-primary-50/40 dark:bg-primary-950/40'
                                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                {s.session_date_formatted}
                                            </span>
                                            <span className="text-[10px] text-primary font-bold">
                                                {s.total_fee_formatted}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {s.start_time}
                                            </span>
                                            <span>•</span>
                                            <span>{s.room_number}</span>
                                        </div>

                                        {/* Capacity Progress Bar */}
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                                <span>
                                                    Tokens: {s.booked_tokens_count}/{s.max_tokens} booked
                                                </span>
                                                <span className="font-bold text-teal-600 dark:text-teal-400">
                                                    Next: #{s.next_token_number}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        capacityPercent > 80
                                                            ? 'bg-rose-500'
                                                            : capacityPercent > 50
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${capacityPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {s.next_approx_time && (
                                            <span className="block text-[10px] text-slate-400 mt-1 italic">
                                                Est. time: ~{s.next_approx_time}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* VISIT TYPE & PAYMENT OPTIONS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                    {visitTypes.length > 0 && (
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Visit Type
                            </label>
                            <GlassSelect
                                value={String(visitTypeId)}
                                onValueChange={(val) => setVisitTypeId(val)}
                                options={visitTypes.map((v) => ({
                                    value: String(v.id),
                                    label: v.name,
                                }))}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Payment Collection
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={paymentCollected}
                                    onChange={(e) => setPaymentCollected(e.target.checked)}
                                    className="rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    Collect Payment Now
                                </span>
                            </label>

                            {paymentCollected && (
                                <select
                                    value={paymentMethod}
                                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                                    className="text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1 px-2"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* FEE SUMMARY BANNER */}
                {activeSession && (
                    <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-800/30 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] text-teal-800 dark:text-teal-200 block">
                                Total Consultation Fee
                            </span>
                            <span className="text-sm font-black text-teal-900 dark:text-teal-100">
                                {activeSession.total_fee_formatted}
                            </span>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                            <span>Next Token: <strong>#{activeSession.next_token_number}</strong></span>
                            {activeSession.next_approx_time && (
                                <span className="block">Approx: {activeSession.next_approx_time}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleIssueToken}
                        disabled={submitting || !selectedSessionId}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50 transition-all"
                    >
                        {submitting ? (
                            <span>Issuing Token...</span>
                        ) : (
                            <>
                                <Ticket className="w-3.5 h-3.5" />
                                <span>Issue Channeling Token</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </GlassModal>
    );
};

export default AssignDoctorDrawer;
