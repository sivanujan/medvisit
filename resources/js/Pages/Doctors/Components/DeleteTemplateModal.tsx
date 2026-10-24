import React, { useState } from 'react';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Trash2, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { router } from '@inertiajs/react';

interface TemplateData {
    id: number;
    doctor_name: string;
    title: string;
    day_name: string;
    start_time: string;
    end_time: string;
    room_number: string;
    future_sessions_count?: number;
}

interface DeleteTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: TemplateData | null;
    onSuccess: (message: string) => void;
}

export default function DeleteTemplateModal({
    isOpen,
    onClose,
    template,
    onSuccess,
}: DeleteTemplateModalProps) {
    if (!template) return null;

    const futureCount = template.future_sessions_count ?? 0;
    const [removeFuture, setRemoveFuture] = useState(futureCount > 0);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/doctors/templates/${template.id}?remove_future_sessions=${removeFuture ? 1 : 0}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleting(false);
                onClose();
                onSuccess(
                    removeFuture && futureCount > 0
                        ? `Template deleted and ${futureCount} future sessions removed.`
                        : 'Weekly template deleted successfully.'
                );
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Weekly Template"
            subtitle="Remove this recurring schedule template from the clinic."
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-1 text-xs">
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                        {template.doctor_name}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 font-medium">
                        {template.title} — {template.day_name} ({template.start_time} – {template.end_time})
                    </div>
                </div>

                {futureCount > 0 ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{futureCount} future sessions already exist</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            This template was previously used to generate {futureCount} upcoming sessions on the calendar.
                        </p>
                        <label className="flex items-start gap-2 pt-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={removeFuture}
                                onChange={(e) => setRemoveFuture(e.target.checked)}
                                className="mt-0.5 rounded text-[#FF7A59] focus:ring-[#FF7A59]"
                            />
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                Also cancel and remove {futureCount} future empty sessions
                            </span>
                        </label>
                    </div>
                ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        No future sessions are scheduled from this template. Are you sure you want to delete it?
                    </p>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeleting ? 'Deleting...' : 'Delete template'}</span>
                    </button>
                </div>
            </div>
        </GlassModal>
    );
}
