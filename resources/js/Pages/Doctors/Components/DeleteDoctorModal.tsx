import React, { useState } from 'react';
import { GlassModal } from '@/Components/UI/GlassModal';
import { ShieldAlert, Trash2, Power, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface DoctorData {
    id: number;
    name: string;
    full_title: string;
    specialty: string;
    has_history?: boolean;
    is_active: boolean;
}

interface DeleteDoctorModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctor: DoctorData | null;
    onSuccess: (message: string) => void;
}

export default function DeleteDoctorModal({
    isOpen,
    onClose,
    doctor,
    onSuccess,
}: DeleteDoctorModalProps) {
    if (!doctor) return null;

    const [isProcessing, setIsProcessing] = useState(false);
    const hasHistory = Boolean(doctor.has_history);

    const handleDeactivate = () => {
        setIsProcessing(true);
        router.patch(
            `/doctors/${doctor.id}/toggle`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsProcessing(false);
                    onClose();
                    onSuccess(
                        `Dr. ${doctor.name} has been deactivated. They are hidden from booking while all records remain intact.`
                    );
                },
                onError: () => setIsProcessing(false),
            }
        );
    };

    const handleHardDelete = () => {
        setIsProcessing(true);
        router.delete(`/doctors/${doctor.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsProcessing(false);
                onClose();
                onSuccess(`Dr. ${doctor.name} was permanently removed.`);
            },
            onError: () => setIsProcessing(false),
        });
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title={hasHistory ? 'Doctor Cannot Be Deleted' : 'Delete Doctor'}
            subtitle={
                hasHistory
                    ? 'Clinical and financial history protection policy'
                    : 'Permanent removal for unused practitioner profile'
            }
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                {hasHistory ? (
                    // Doctor has history -> Hard delete is blocked, allow Deactivate
                    <div className="space-y-3.5">
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Record history exists</span>
                            </div>
                            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                                <strong>{doctor.full_title}</strong> has appointment sessions, patient bookings, bills, or payout settlements on file. Deleting this profile would break historical medical and auditing records.
                            </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                                Recommended Action: Deactivate Doctor
                            </span>
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                Deactivation hides the doctor from the public channeling portal and the active directory, prevents future booking, and cancels upcoming unbooked sessions, while safely preserving all clinical records and past invoices.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
                            >
                                Close
                            </button>
                            {doctor.is_active && (
                                <button
                                    type="button"
                                    onClick={handleDeactivate}
                                    disabled={isProcessing}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    <Power className="w-3.5 h-3.5" />
                                    <span>{isProcessing ? 'Deactivating...' : 'Deactivate Doctor'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    // Doctor has ZERO history -> allow hard delete behind confirmation
                    <div className="space-y-3.5">
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>Confirm permanent deletion</span>
                            </div>
                            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                                <strong>{doctor.full_title}</strong> has zero sessions, bookings, or bills. This action will permanently remove their profile and templates. This cannot be undone.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleHardDelete}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isProcessing ? 'Deleting...' : 'Permanently Delete'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GlassModal>
    );
}
