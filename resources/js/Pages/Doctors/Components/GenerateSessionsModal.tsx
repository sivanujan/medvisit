import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Sparkles, Calendar, CheckCircle2, AlertCircle, RefreshCw, Users, ShieldAlert, ArrowRight } from 'lucide-react';
import { router } from '@inertiajs/react';

interface DoctorOption {
    id: number;
    name: string;
    full_title: string;
    specialty: string;
    color?: {
        hex: string;
        badge: string;
        bg: string;
        text: string;
    };
}

interface GenerateSessionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctors: DoctorOption[];
    onSuccess: (message: string) => void;
}

interface PreviewStats {
    will_create: number;
    already_exists: number;
    on_leave: number;
    doctor_overlap: number;
    total_scanned: number;
    start_date: string;
    end_date: string;
}

export default function GenerateSessionsModal({
    isOpen,
    onClose,
    doctors,
    onSuccess,
}: GenerateSessionsModalProps) {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const formatDateInput = (d: Date) => d.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(formatDateInput(today));
    const [endDate, setEndDate] = useState(formatDateInput(in30Days));
    const [selectedDoctorMode, setSelectedDoctorMode] = useState<'all' | 'custom'>('all');
    const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);
    const [preview, setPreview] = useState<PreviewStats | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch live preview
    const fetchPreview = useCallback(async () => {
        if (!isOpen || !startDate || !endDate) return;
        setLoadingPreview(true);
        setPreviewError(null);

        try {
            const payload: Record<string, any> = {
                start_date: startDate,
                end_date: endDate,
            };
            if (selectedDoctorMode === 'custom' && selectedDoctorIds.length > 0) {
                payload.doctor_ids = selectedDoctorIds;
            }

            const response = await axios.post('/doctors/generate-sessions/preview', payload);
            setPreview(response.data);
        } catch (err: any) {
            console.error('Failed to load session generation preview:', err);
            setPreviewError(err?.response?.data?.message || 'Could not calculate generation preview.');
        } finally {
            setLoadingPreview(false);
        }
    }, [isOpen, startDate, endDate, selectedDoctorMode, selectedDoctorIds]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                fetchPreview();
            }, 250);
            return () => clearTimeout(timer);
        } else {
            setPreview(null);
            setPreviewError(null);
        }
    }, [isOpen, startDate, endDate, selectedDoctorMode, selectedDoctorIds, fetchPreview]);

    const handleDoctorToggle = (id: number) => {
        setSelectedDoctorIds((prev) =>
            prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        setIsSubmitting(true);
        const payload: Record<string, any> = {
            start_date: startDate,
            end_date: endDate,
        };
        if (selectedDoctorMode === 'custom' && selectedDoctorIds.length > 0) {
            payload.doctor_ids = selectedDoctorIds;
        }

        router.post('/doctors/generate-sessions', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onClose();
                const count = preview?.will_create ?? 0;
                onSuccess(
                    count > 0
                        ? `Generated ${count} sessions successfully until ${endDate}.`
                        : 'Session generation finished. All matching dates were already generated or skipped.'
                );
            },
            onError: (errors) => {
                setIsSubmitting(false);
                setPreviewError(Object.values(errors)[0] as string || 'Failed to generate sessions.');
            },
        });
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate Channeling Sessions"
            subtitle="Populate calendar sessions from active weekly templates with duplicate prevention and leave checks."
            maxWidth="max-w-xl"
        >
            <div className="space-y-5">
                {/* Date range selection */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-[#1E6FD9]" />
                        <span>Date range</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                                From date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                min={formatDateInput(today)}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Until date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Presets:</span>
                        <button
                            type="button"
                            onClick={() => {
                                const end = new Date();
                                end.setDate(today.getDate() + 14);
                                setEndDate(formatDateInput(end));
                            }}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            Next 14 days
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const end = new Date();
                                end.setDate(today.getDate() + 30);
                                setEndDate(formatDateInput(end));
                            }}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#1E6FD9]/10 text-[#1E6FD9] hover:bg-[#1E6FD9]/20 font-semibold transition-colors"
                        >
                            Next 30 days
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const end = new Date();
                                end.setDate(today.getDate() + 60);
                                setEndDate(formatDateInput(end));
                            }}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            Next 60 days
                        </button>
                    </div>
                </div>

                {/* Doctor Selection */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Users className="w-4 h-4 text-[#0E9E8F]" />
                            <span>Doctors to include</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDoctorMode('all');
                                    setSelectedDoctorIds([]);
                                }}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    selectedDoctorMode === 'all'
                                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                All doctors
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDoctorMode('custom')}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    selectedDoctorMode === 'custom'
                                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                Specific doctors
                            </button>
                        </div>
                    </div>

                    {selectedDoctorMode === 'custom' && (
                        <div className="pt-2 max-h-44 overflow-y-auto space-y-1.5 pr-1">
                            {doctors.map((doc) => {
                                const isChecked = selectedDoctorIds.includes(doc.id);
                                return (
                                    <label
                                        key={doc.id}
                                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                            isChecked
                                                ? 'bg-[#1E6FD9]/10 border-[#1E6FD9]/40 text-slate-900 dark:text-white'
                                                : 'bg-white/40 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleDoctorToggle(doc.id)}
                                                className="w-4 h-4 rounded text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                            />
                                            <div className="truncate">
                                                <span className="font-semibold">{doc.full_title}</span>
                                                <span className="text-[11px] text-slate-400 ml-2">({doc.specialty})</span>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Live Preview Stats */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50/80 to-slate-100/40 dark:from-white/[0.03] dark:to-white/[0.01] border border-slate-200/80 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Generation preview
                            </span>
                        </div>
                        {loadingPreview && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <RefreshCw className="w-3 h-3 animate-spin text-[#1E6FD9]" />
                                <span>Calculating...</span>
                            </div>
                        )}
                    </div>

                    {previewError ? (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>{previewError}</span>
                        </div>
                    ) : preview ? (
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="p-3 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/30 text-center">
                                <div className="text-xl font-bold text-[#0E9E8F] dark:text-teal-300">
                                    {preview.will_create}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5">
                                    Will create
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 text-center">
                                <div className="text-xl font-bold text-[#1E6FD9] dark:text-blue-300">
                                    {preview.already_exists}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5">
                                    Skips existing
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 text-center">
                                <div className="text-xl font-bold text-[#FF7A59] dark:text-orange-300">
                                    {preview.on_leave}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5">
                                    Skips on leave
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-slate-400">
                            Select date range to view impact.
                        </div>
                    )}

                    <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                            <strong>Strictly idempotent:</strong> Existing sessions generated from the same template are never duplicated. Doctor leaves are automatically honored.
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
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
                        onClick={handleConfirm}
                        disabled={isSubmitting || loadingPreview || Boolean(preview && preview.will_create === 0)}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating sessions...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>
                                    {preview && preview.will_create > 0
                                        ? `Generate ${preview.will_create} sessions`
                                        : 'Generate sessions'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </GlassModal>
    );
}
