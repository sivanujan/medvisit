import React, { useState } from 'react';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Copy, Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface TemplateData {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    title: string;
    day_of_week: number;
    day_name: string;
    start_time: string;
    end_time: string;
    room_number: string;
    max_patients: number;
}

interface DuplicateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: TemplateData | null;
    onSuccess: (message: string) => void;
}

const DAYS = [
    { id: 0, label: 'Sunday', short: 'Sun' },
    { id: 1, label: 'Monday', short: 'Mon' },
    { id: 2, label: 'Tuesday', short: 'Tue' },
    { id: 3, label: 'Wednesday', short: 'Wed' },
    { id: 4, label: 'Thursday', short: 'Thu' },
    { id: 5, label: 'Friday', short: 'Fri' },
    { id: 6, label: 'Saturday', short: 'Sat' },
];

export default function DuplicateTemplateModal({
    isOpen,
    onClose,
    template,
    onSuccess,
}: DuplicateTemplateModalProps) {
    if (!template) return null;

    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleDay = (dayId: number) => {
        if (dayId === template.day_of_week) return; // cannot duplicate onto itself
        setSelectedDays((prev) =>
            prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
        );
    };

    const handleDuplicate = () => {
        if (selectedDays.length === 0) return;
        setIsSubmitting(true);
        setError(null);

        router.post(
            `/doctors/templates/${template.id}/duplicate`,
            { target_days: selectedDays },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                    onSuccess(
                        `Template duplicated successfully to ${selectedDays.length} day(s).`
                    );
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    setError(Object.values(errors)[0] as string || 'Failed to duplicate template.');
                },
            }
        );
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Duplicate Weekly Template"
            subtitle={`Copy "${template.title}" to other days of the week for ${template.doctor_name}.`}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                {/* Source template details */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-1.5 text-xs">
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        <span>{template.doctor_name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#1E6FD9]/10 text-[#1E6FD9] font-medium">
                            Source: {template.day_name}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {template.start_time} – {template.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {template.room_number}
                        </span>
                    </div>
                </div>

                {/* Day selector checkboxes */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Select target days to replicate:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {DAYS.map((day) => {
                            const isCurrent = day.id === template.day_of_week;
                            const isChecked = selectedDays.includes(day.id);

                            return (
                                <button
                                    key={day.id}
                                    type="button"
                                    disabled={isCurrent}
                                    onClick={() => toggleDay(day.id)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                        isCurrent
                                            ? 'bg-slate-100 dark:bg-white/5 border-slate-200/40 text-slate-400 cursor-not-allowed'
                                            : isChecked
                                            ? 'bg-[#1E6FD9]/15 border-[#1E6FD9]/50 text-[#1E6FD9] font-bold shadow-xs'
                                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                    }`}
                                >
                                    <span>{day.label}</span>
                                    {isCurrent ? (
                                        <span className="text-[10px] text-slate-400 font-normal">Current</span>
                                    ) : isChecked ? (
                                        <CheckCircle2 className="w-4 h-4 text-[#1E6FD9]" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {error && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                        {error}
                    </div>
                )}

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
                        type="button"
                        onClick={handleDuplicate}
                        disabled={isSubmitting || selectedDays.length === 0}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span>
                            {isSubmitting
                                ? 'Duplicating...'
                                : `Duplicate to ${selectedDays.length} day(s)`}
                        </span>
                    </button>
                </div>
            </div>
        </GlassModal>
    );
}
