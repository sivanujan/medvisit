import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { formatDateLK } from '@/Utils/formatters';

interface DatePickerLKProps {
    id?: string;
    value: string; // ISO date string: YYYY-MM-DD
    onChange: (date: string) => void;
    maxDate?: string; // defaults to today (no future dates)
    minDate?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    className?: string;
    allowFutureDates?: boolean;
    align?: 'left' | 'right';
}

export default function DatePickerLK({
    id,
    value,
    onChange,
    maxDate,
    minDate,
    placeholder = 'Select date',
    disabled = false,
    error = false,
    className = '',
    allowFutureDates = false,
    align = 'right',
}: DatePickerLKProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Default today string in YYYY-MM-DD
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const effectiveMaxDate = allowFutureDates ? maxDate : (maxDate || todayISO);

    // Initial calendar viewing month & year based on value or today
    const [viewYear, setViewYear] = useState(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return parseInt(value.split('-')[0], 10);
        }
        return today.getFullYear();
    });

    const [viewMonth, setViewMonth] = useState(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return parseInt(value.split('-')[1], 10) - 1; // 0-indexed
        }
        return today.getMonth();
    });

    // Close on outside click or escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    // Format current display
    const displayLabel = value ? formatDateLK(value) : placeholder;

    // Days in current view month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Day of week of 1st day of month (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleSelectDay = (day: number) => {
        const selectedISO = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (effectiveMaxDate && selectedISO > effectiveMaxDate) {
            return;
        }
        if (minDate && selectedISO < minDate) {
            return;
        }

        onChange(selectedISO);
        setOpen(false);
    };

    // Quick presets
    const handlePreset = (presetISO: string) => {
        if (effectiveMaxDate && presetISO > effectiveMaxDate) return;
        if (minDate && presetISO < minDate) return;

        const [y, m] = presetISO.split('-').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
        onChange(presetISO);
        setOpen(false);
    };

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoISO = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setOpen(!open)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none flex items-center justify-between text-left
                    bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                    text-slate-900 dark:text-white backdrop-blur-md
                    border ${
                        error
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : open
                            ? 'border-primary ring-4 ring-primary/15'
                            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }
                    shadow-xs ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                    <span className={`truncate font-medium ${!value ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {displayLabel}
                    </span>
                </div>
                <span className="text-[11px] font-semibold text-primary/80 shrink-0 uppercase tracking-wider ml-2">
                    {value === todayISO ? 'Today' : ''}
                </span>
            </button>

            {/* Datepicker Popover */}
            {open && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choose received date"
                    className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 z-[100] w-72 sm:w-80 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 max-w-[calc(100vw-2rem)]`}
                >
                    {/* Header: Presets */}
                    <div className="flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => handlePreset(todayISO)}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                                value === todayISO
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePreset(yesterdayISO)}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                                value === yesterdayISO
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Yesterday
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePreset(twoDaysAgoISO)}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                                value === twoDaysAgoISO
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            2d ago
                        </button>
                    </div>

                    {/* Month / Year Navigator */}
                    <div className="flex items-center justify-between py-2 px-1">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {monthNames[viewMonth]} {viewYear}
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Empty padding cells for first day */}
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-8" />
                        ))}

                        {/* Month day buttons */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayISO = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = value === dayISO;
                            const isToday = dayISO === todayISO;
                            const isFuture = effectiveMaxDate ? dayISO > effectiveMaxDate : false;
                            const isPastMin = minDate ? dayISO < minDate : false;
                            const isDisabled = isFuture || isPastMin;

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleSelectDay(day)}
                                    title={isFuture ? 'Future dates are not allowed for stock receipt' : undefined}
                                    className={`h-8 w-8 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                                        isSelected
                                            ? 'bg-primary text-white font-bold shadow-md shadow-primary/30'
                                            : isDisabled
                                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                                            : isToday
                                            ? 'border border-primary text-primary hover:bg-primary/10'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer note: no future dates */}
                    {!allowFutureDates && (
                        <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                            <span>Sri Lanka Standard Time</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                No future dates
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
