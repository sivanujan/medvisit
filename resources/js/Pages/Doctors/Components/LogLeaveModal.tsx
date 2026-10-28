import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GlassModal } from '@/Components/UI/GlassModal';
import GlassSelect from '@/Components/UI/GlassSelect';
import { CalendarX2, Users, AlertTriangle, Info, CheckCircle2, RefreshCw, Calendar, Radio } from 'lucide-react';
import { router } from '@inertiajs/react';

interface DoctorOption {
    id: number;
    name: string;
    full_title: string;
    specialty: string;
}

interface LogLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctors: DoctorOption[];
    onSuccess: (message: string) => void;
}

interface ImpactPreview {
    sessions_count: number;
    tokens_count: number;
    start_date: string;
    end_date: string;
    sessions: Array<{
        id: number;
        date: string;
        time: string;
        booked_tokens: number;
        status: string;
    }>;
}

export default function LogLeaveModal({
    isOpen,
    onClose,
    doctors,
    onSuccess,
}: LogLeaveModalProps) {
    const today = new Date().toISOString().split('T')[0];

    const [doctorId, setDoctorId] = useState<string>(doctors[0]?.id ? String(doctors[0].id) : '');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [reason, setReason] = useState('Annual Leave / CME Conference');
    const [actionOnSessions, setActionOnSessions] = useState<'cancel_unbooked' | 'cancel_all' | 'keep'>('cancel_unbooked');

    const [impact, setImpact] = useState<ImpactPreview | null>(null);
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [impactError, setImpactError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Common quick reasons
    const reasonPresets = [
        'Annual Leave / Holiday',
        'CME Conference / Workshop',
        'Medical / Sick Leave',
        'Personal / Family Emergency',
        'Hospital Duty / On Call',
    ];

    const fetchImpact = useCallback(async () => {
        if (!isOpen || !doctorId || !startDate || !endDate) return;
        setLoadingImpact(true);
        setImpactError(null);

        try {
            const response = await axios.post('/doctors/leaves/preview', {
                doctor_id: doctorId,
                start_date: startDate,
                end_date: endDate,
            });
            setImpact(response.data);
        } catch (err: any) {
            console.error('Failed to preview leave impact:', err);
            setImpactError(err?.response?.data?.message || 'Failed to calculate schedule impact.');
        } finally {
            setLoadingImpact(false);
        }
    }, [isOpen, doctorId, startDate, endDate]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                fetchImpact();
            }, 250);
            return () => clearTimeout(timer);
        } else {
            setImpact(null);
            setImpactError(null);
        }
    }, [isOpen, doctorId, startDate, endDate, fetchImpact]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(
            '/doctors/leaves',
            {
                doctor_id: doctorId,
                start_date: startDate,
                end_date: endDate,
                reason,
                action_on_sessions: actionOnSessions,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                    onSuccess('Doctor leave logged successfully.');
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    setImpactError(Object.values(errors)[0] as string || 'Failed to record leave.');
                },
            }
        );
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Log Doctor Leave"
            subtitle="Block channeling appointments and manage affected sessions during the doctor's absence."
            maxWidth="max-w-xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Doctor selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Doctor *
                    </label>
                    <GlassSelect
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        placeholder="Select Doctor"
                        options={doctors.map((d) => ({
                            value: d.id,
                            label: `${d.full_title} (${d.specialty})`,
                        }))}
                    />
                </div>

                {/* Date range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Start Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={startDate}
                            min={today}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                if (e.target.value > endDate) {
                                    setEndDate(e.target.value);
                                }
                            }}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            End Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                        />
                    </div>
                </div>

                {/* Reason with preset chips */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Reason for Leave
                    </label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Annual Leave, CME Conference"
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {reasonPresets.map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setReason(r)}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                                    reason === r
                                        ? 'bg-[#1E6FD9]/15 text-[#1E6FD9] font-semibold border border-[#1E6FD9]/30'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Impact Preview Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-white/[0.03] dark:to-white/[0.01] border border-amber-500/20 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarX2 className="w-4 h-4 text-[#FF7A59]" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Impact preview on calendar
                            </span>
                        </div>
                        {loadingImpact && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <RefreshCw className="w-3 h-3 animate-spin text-[#FF7A59]" />
                                <span>Scanning calendar...</span>
                            </div>
                        )}
                    </div>

                    {impactError ? (
                        <div className="text-xs text-rose-600 dark:text-rose-400">{impactError}</div>
                    ) : impact ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-center">
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                    {impact.sessions_count}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                    Sessions affected
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-center">
                                <div className="text-xl font-bold text-[#FF7A59]">
                                    {impact.tokens_count}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                    Booked patients
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Action on affected sessions */}
                    {impact && impact.sessions_count > 0 && (
                        <div className="pt-2 space-y-2 border-t border-slate-200/60 dark:border-white/10">
                            <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                What should happen to existing sessions?
                            </span>
                            <div className="space-y-1.5 text-xs">
                                <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 cursor-pointer hover:border-[#1E6FD9]/40">
                                    <input
                                        type="radio"
                                        name="action_on_sessions"
                                        value="cancel_unbooked"
                                        checked={actionOnSessions === 'cancel_unbooked'}
                                        onChange={() => setActionOnSessions('cancel_unbooked')}
                                        className="mt-0.5 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                    />
                                    <div>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            Cancel empty sessions (Recommended)
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Cancels sessions with 0 bookings immediately. Sessions with booked patients remain open for front desk review.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 cursor-pointer hover:border-[#1E6FD9]/40">
                                    <input
                                        type="radio"
                                        name="action_on_sessions"
                                        value="cancel_all"
                                        checked={actionOnSessions === 'cancel_all'}
                                        onChange={() => setActionOnSessions('cancel_all')}
                                        className="mt-0.5 text-[#FF7A59] focus:ring-[#FF7A59]"
                                    />
                                    <div>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            Cancel all affected sessions & tokens
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Cancels all {impact.sessions_count} sessions and marks all {impact.tokens_count} patient tokens cancelled in roster.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-2 p-2 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 cursor-pointer hover:border-[#1E6FD9]/40">
                                    <input
                                        type="radio"
                                        name="action_on_sessions"
                                        value="keep"
                                        checked={actionOnSessions === 'keep'}
                                        onChange={() => setActionOnSessions('keep')}
                                        className="mt-0.5 text-slate-600 focus:ring-slate-600"
                                    />
                                    <div>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            Keep sessions active for manual handling
                                        </span>
                                        <p className="text-[11px] text-slate-500">
                                            Does not alter existing sessions. Reception can reschedule or cancel each session individually.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Patient notification notice */}
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 text-[11px] text-slate-600 dark:text-slate-400">
                        <Info className="w-4 h-4 text-[#1E6FD9] shrink-0 mt-0.5" />
                        <span>
                            <strong>Patient notification status:</strong> MedVisit cancels tokens in the database roster. Outbound mass SMS broadcast queue is not currently enabled for this tenant; front desk reception should contact booked patients manually.
                        </span>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !doctorId}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#FF7A59] hover:bg-[#e06848] shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {isSubmitting ? 'Saving leave...' : 'Log Doctor Leave'}
                    </button>
                </div>
            </form>
        </GlassModal>
    );
}
