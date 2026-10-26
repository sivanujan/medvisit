import React from 'react';
import {
    Clock,
    Info,
    ArrowRight,
    ArrowLeft,
    Copy,
    Check,
    AlertCircle,
} from 'lucide-react';
import { SetupDaySchedule, SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
    onContinue: () => void;
    onBack: () => void;
    saving: boolean;
    errors?: Record<string, string>;
}

const DAYS: { key: string; label: string }[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

export default function StepOpeningHours({
    tenant,
    form,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    const handleDayToggle = (dayKey: string, open: boolean) => {
        const updated = { ...form.opening_hours };
        const current = updated[dayKey] || { day: dayKey, open: false, start: '08:30', end: '17:30' };
        updated[dayKey] = { ...current, open };
        onChange('opening_hours', updated);
    };

    const handleTimeChange = (dayKey: string, field: 'start' | 'end', val: string) => {
        const updated = { ...form.opening_hours };
        const current = updated[dayKey] || { day: dayKey, open: true, start: '08:30', end: '17:30' };
        updated[dayKey] = { ...current, [field]: val };
        onChange('opening_hours', updated);
    };

    const handleCopyWeekdays = () => {
        const mon = form.opening_hours.mon || { day: 'mon', open: true, start: '08:30', end: '17:30' };
        const updated = { ...form.opening_hours };
        ['tue', 'wed', 'thu', 'fri'].forEach((d) => {
            updated[d] = {
                day: d,
                open: mon.open,
                start: mon.start,
                end: mon.end,
            };
        });
        onChange('opening_hours', updated);
    };

    const hasAtLeastOneOpen = Object.values(form.opening_hours).some((d) => d.open);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 4 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Opening hours
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Set your regular weekly consultation hours so patients know when walk-ins and appointments are held.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How opening hours operate:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Displays live &quot;Open now&quot; or &quot;Closed&quot; pill on your website based on Sri Lanka time.</li>
                    <li>Informs patients on the directory about your typical weekday and weekend hours.</li>
                    <li>Individual doctor session timings can also be scheduled inside the Sessions calendar.</li>
                </ul>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Weekly Schedule
                </span>

                <button
                    type="button"
                    onClick={handleCopyWeekdays}
                    className="text-xs font-semibold text-[#1E6FD9] dark:text-[#5c9df4] hover:underline flex items-center gap-1 cursor-pointer"
                >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Monday to all weekdays</span>
                </button>
            </div>

            {/* Days List */}
            <div className="space-y-2.5">
                {DAYS.map(({ key, label }) => {
                    const dayData = form.opening_hours[key] || {
                        day: key,
                        open: key !== 'sun',
                        start: '08:30',
                        end: '17:30',
                    };

                    return (
                        <div
                            key={key}
                            className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                dayData.open
                                    ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/10'
                                    : 'bg-slate-100/40 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-70'
                            }`}
                        >
                            <div className="flex items-center gap-3 w-36 shrink-0">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dayData.open}
                                        onChange={(e) => handleDayToggle(key, e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0E9E8F]" />
                                </label>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {label}
                                </span>
                            </div>

                            {dayData.open ? (
                                <div className="flex items-center gap-2 text-xs">
                                    <input
                                        type="time"
                                        value={dayData.start || '08:30'}
                                        onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                                    />
                                    <span className="text-slate-400">to</span>
                                    <input
                                        type="time"
                                        value={dayData.end || '17:30'}
                                        onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                                    />
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 font-medium italic">
                                    Closed all day
                                </span>
                            )}
                        </div>
                    );
                })}

                {!hasAtLeastOneOpen && (
                    <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Please mark at least one day as open.</span>
                    </p>
                )}
            </div>

            {/* Optional Hours Note */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Break or holiday note (optional)
                </label>
                <input
                    type="text"
                    value={form.opening_hours_note}
                    onChange={(e) => onChange('opening_hours_note', e.target.value)}
                    placeholder="e.g. Lunch break 13:00 - 14:00 · Closed on Poya days"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                />
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <button
                    type="button"
                    disabled={saving || !hasAtLeastOneOpen}
                    onClick={onContinue}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{
                        background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                    }}
                >
                    <span>{saving ? 'Saving...' : 'Save & continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
