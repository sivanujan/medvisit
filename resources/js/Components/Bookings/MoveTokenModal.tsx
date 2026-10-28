import React, { useState, useEffect, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { GlassModal } from '@/Components/UI/GlassModal';
import {
    ArrowRightLeft,
    Calendar,
    Clock,
    User,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Sparkles,
    Send,
    Tag,
    Building2,
    Filter,
} from 'lucide-react';

export interface TokenToMove {
    id: number;
    token_number: number;
    patient_id: number;
    patient_name: string;
    patient_phone?: string;
    doctor_name: string;
    doctor_specialty?: string;
    session_id?: number;
    session_date: string;
    start_time?: string;
    room_number?: string;
    total_fee_formatted?: string;
    total_fee_cents?: number;
    payment_status: string;
}

export interface DoctorOption {
    id: number;
    name: string;
    specialty: string;
    doctor_fee_lkr?: number;
    clinic_fee_lkr?: number;
    total_fee_lkr?: number;
}

interface MoveTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: TokenToMove | null;
    doctors: DoctorOption[];
    onSuccess?: (result: any) => void;
}

export const MoveTokenModal: React.FC<MoveTokenModalProps> = ({
    isOpen,
    onClose,
    token,
    doctors = [],
    onSuccess,
}) => {
    const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
    const [availableSessions, setAvailableSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [filterChip, setFilterChip] = useState<'all' | 'today' | 'tomorrow' | 'morning' | 'evening'>('all');
    const [reason, setReason] = useState('Patient requested reschedule');
    const [notifyPatient, setNotifyPatient] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen && token) {
            setErrorMsg(null);
            setSelectedSessionId(null);
            // Default to first doctor or existing doctor if found
            const matchDoc = doctors.find((d) => token.doctor_name.includes(d.name)) || doctors[0];
            setSelectedDoctorId(matchDoc ? matchDoc.id : null);
        }
    }, [isOpen, token, doctors]);

    // Fetch sessions when selected doctor changes
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
                }
            })
            .catch((err) => {
                console.error(err);
                if (!cancelled) setErrorMsg('Failed to load doctor sessions.');
            })
            .finally(() => {
                if (!cancelled) setLoadingSessions(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedDoctorId, isOpen]);

    // Filter sessions by quick chip
    const filteredSessions = useMemo(() => {
        return availableSessions.filter((s) => {
            // Cannot move to the exact same session
            if (token?.session_id && s.id === token.session_id) return false;
            if (!s.is_selectable) return false;

            if (filterChip === 'today') return s.is_today;
            if (filterChip === 'tomorrow') return s.is_tomorrow;
            if (filterChip === 'morning') return s.time_of_day === 'morning';
            if (filterChip === 'evening') return s.time_of_day === 'evening' || s.time_of_day === 'afternoon';
            return true;
        });
    }, [availableSessions, filterChip, token?.session_id]);

    const activeDestSession = useMemo(() => {
        return availableSessions.find((s) => s.id === selectedSessionId) || null;
    }, [availableSessions, selectedSessionId]);

    // Fee differential calculation
    const feeComparison = useMemo(() => {
        if (!activeDestSession || !token) return null;

        // Parse old fee from formatted string or use default
        let oldFeeLkr = 0;
        if (token.total_fee_cents) {
            oldFeeLkr = token.total_fee_cents / 100;
        } else if (token.total_fee_formatted) {
            const digits = token.total_fee_formatted.replace(/[^\d.]/g, '');
            oldFeeLkr = parseFloat(digits) || 0;
        }

        const newFeeLkr = activeDestSession.total_fee_lkr || 0;
        const diffLkr = Math.round((newFeeLkr - oldFeeLkr) * 100) / 100;
        const isPaid = token.payment_status === 'paid';

        return {
            oldFeeLkr,
            newFeeLkr,
            diffLkr,
            isPaid,
            diffFormatted: `Rs. ${Math.abs(diffLkr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        };
    }, [token, activeDestSession]);

    const handleConfirmMove = () => {
        if (!token || !selectedSessionId) return;

        setSubmitting(true);
        setErrorMsg(null);

        router.post(
            `/bookings/${token.id}/move`,
            {
                destination_session_id: selectedSessionId,
                reason,
                notify_patient: notifyPatient,
            },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    setSubmitting(false);
                    onClose();
                    if (onSuccess) {
                        onSuccess(page.props.flash);
                    }
                },
                onError: (errs) => {
                    setSubmitting(false);
                    setErrorMsg(errs.move_error || errs.destination_session_id || 'Failed to move token.');
                },
            }
        );
    };

    if (!token) return null;

    const quickReasons = [
        'Patient requested earlier session',
        'Patient requested different doctor',
        'Patient reschedule request',
        'Doctor requested reschedule',
        'Emergency slot shift',
    ];

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Move Token #${token.token_number} — ${token.patient_name}`}
            subtitle="Reassign booking to a new doctor & session with immutable billing rules"
            maxWidth="max-w-2xl"
        >
            <div className="space-y-4 text-xs">
                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* CURRENT TOKEN SNAPSHOT */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Current Booking
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0">
                                #{token.token_number}
                            </div>
                            <div>
                                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                    {token.doctor_name}
                                </span>
                                <span className="text-slate-500 flex items-center gap-2 text-[11px]">
                                    <span>📅 {token.session_date}</span>
                                    {token.start_time && <span>⏰ {token.start_time}</span>}
                                    {token.room_number && <span>🚪 {token.room_number}</span>}
                                </span>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                {token.total_fee_formatted || '—'}
                            </span>
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-block ${
                                    token.payment_status === 'paid'
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                            >
                                {token.payment_status === 'paid' ? 'Paid Bill (Immutable)' : 'Unpaid Bill'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* STEP 1: SELECT DESTINATION DOCTOR */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Step 1: Select Destination Doctor
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

                {/* STEP 2: AVAILABLE SESSIONS (NEXT 14 DAYS) */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Step 2: Choose Next 14-Day Session
                        </label>
                        {/* Quick filter chips */}
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
                            <span className="inline-block animate-spin mr-2">⏳</span> Loading upcoming 14-day schedule...
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                            No active channeling sessions available for this doctor in the next 14 days under filter "{filterChip}".
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

                {/* STEP 3: FINANCIAL DIFFERENTIAL COMPARISON */}
                {activeDestSession && feeComparison && (
                    <div className="p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-50/30 via-white to-primary-50/20 dark:from-slate-900 dark:via-primary-950/20 dark:to-slate-900 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Billing Differential & Immutable Snapshot
                        </span>

                        <div className="grid grid-cols-3 gap-2 text-center py-1 bg-white/70 dark:bg-white/[0.02] rounded-xl border border-slate-200/50 dark:border-white/5">
                            <div>
                                <span className="text-[10px] text-slate-400 block">Original Fee</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                                    Rs. {feeComparison.oldFeeLkr.toLocaleString()}
                                </span>
                            </div>
                            <div className="border-x border-slate-100 dark:border-white/5">
                                <span className="text-[10px] text-slate-400 block">New Doctor Fee</span>
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                    Rs. {feeComparison.newFeeLkr.toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block">
                                    {feeComparison.isPaid ? 'Adjustment Entry' : 'New Amount'}
                                </span>
                                <span
                                    className={`font-black text-xs ${
                                        feeComparison.diffLkr > 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : feeComparison.diffLkr < 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-700'
                                    }`}
                                >
                                    {feeComparison.diffLkr > 0 && `+${feeComparison.diffFormatted} (Due)`}
                                    {feeComparison.diffLkr < 0 && `-${feeComparison.diffFormatted} (Refund)`}
                                    {feeComparison.diffLkr === 0 && 'No difference'}
                                </span>
                            </div>
                        </div>

                        {/* Explain rule clearly to receptionist */}
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {feeComparison.isPaid ? (
                                <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Paid Bill Immutable Rule:</strong> Original receipt & payment remain intact.
                                        {feeComparison.diffLkr > 0 && (
                                            <span className="text-amber-700 dark:text-amber-300 font-bold ml-1">
                                                Collect Balance Due {feeComparison.diffFormatted} from patient.
                                            </span>
                                        )}
                                        {feeComparison.diffLkr < 0 && (
                                            <span className="text-emerald-700 dark:text-emerald-300 font-bold ml-1">
                                                Issue Refund / Credit {feeComparison.diffFormatted} to patient.
                                            </span>
                                        )}
                                        {feeComparison.diffLkr === 0 && (
                                            <span className="text-slate-600 ml-1">Fees match exactly; no differential.</span>
                                        )}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-slate-500">
                                    Unpaid bill will be recalculated automatically to Rs.{' '}
                                    {feeComparison.newFeeLkr.toLocaleString()} with the new doctor fee snapshot.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 4: MOVE REASON & NOTIFICATION */}
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Move Reason
                    </label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for reassigning token..."
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200"
                    />
                    <div className="flex flex-wrap gap-1">
                        {quickReasons.map((qr) => (
                            <button
                                key={qr}
                                type="button"
                                onClick={() => setReason(qr)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary transition-colors"
                            >
                                {qr}
                            </button>
                        ))}
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifyPatient}
                            onChange={(e) => setNotifyPatient(e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                            Notify patient via SMS / WhatsApp with new token number and approximate time (queued)
                        </span>
                    </label>
                </div>

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
                        onClick={handleConfirmMove}
                        disabled={submitting || !selectedSessionId}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm disabled:opacity-50 transition-all"
                    >
                        {submitting ? (
                            <span>Reassigning...</span>
                        ) : (
                            <>
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Confirm Token Move</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </GlassModal>
    );
};

export default MoveTokenModal;
