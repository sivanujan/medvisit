import React, { useState, useEffect, useRef, useId, ReactNode } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { calculateAge } from '@/Utils/sriLankanNIC';
import FormLabel from './FormLabel';
import FormError from './FormError';

export interface DateInputProps {
    label?: ReactNode;
    value?: string; // Standard ISO YYYY-MM-DD
    onChange?: (isoDate: string) => void;
    error?: string | null;
    helperText?: ReactNode;
    placeholder?: string;
    required?: boolean;
    optional?: boolean;
    disabled?: boolean;
    maxDate?: string; // YYYY-MM-DD (defaults to today if allowFutureDates=false)
    minDate?: string; // YYYY-MM-DD
    allowFutureDates?: boolean;
    showAgeBadge?: boolean;
    className?: string;
    containerClassName?: string;
    id?: string;
    name?: string;
}

/**
 * Format ISO (YYYY-MM-DD) to Sri Lankan display (DD/MM/YYYY)
 */
function isoToLK(iso: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

/**
 * Parse Sri Lankan display (DD/MM/YYYY) to ISO (YYYY-MM-DD)
 */
function lkToISO(lk: string): string | null {
    if (!lk) return null;
    const parts = lk.split('/');
    if (parts.length !== 3) return null;
    const [dStr, mStr, yStr] = parts;
    const d = parseInt(dStr, 10);
    const m = parseInt(mStr, 10);
    const y = parseInt(yStr, 10);

    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;

    const daysInMonth = new Date(y, m, 0).getDate();
    if (d > daysInMonth) return null;

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function DateInput({
    label,
    value = '',
    onChange,
    error,
    helperText,
    placeholder = 'dd/mm/yyyy',
    required = false,
    optional = false,
    disabled = false,
    maxDate,
    minDate,
    allowFutureDates = false,
    showAgeBadge = true,
    className = '',
    containerClassName = '',
    id: propId,
    name,
}: DateInputProps) {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const [rawText, setRawText] = useState(() => isoToLK(value));
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const effectiveMaxDate = allowFutureDates ? maxDate : (maxDate || todayISO);

    // Sync external ISO value changes to text
    useEffect(() => {
        setRawText(isoToLK(value));
    }, [value]);

    // Calendar state
    const [viewYear, setViewYear] = useState(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return parseInt(value.split('-')[0], 10);
        }
        return today.getFullYear();
    });

    const [viewMonth, setViewMonth] = useState(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return parseInt(value.split('-')[1], 10) - 1;
        }
        return today.getMonth();
    });

    // Close calendar on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsCalendarOpen(false);
            }
        };

        if (isCalendarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCalendarOpen]);

    // Format typing input into DD/MM/YYYY
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value.replace(/[^\d/]/g, '');

        // Auto insert slashes
        const digits = input.replace(/\D/g, '').slice(0, 8);
        let formatted = '';
        if (digits.length <= 2) {
            formatted = digits;
        } else if (digits.length <= 4) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        } else {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        }

        setRawText(formatted);

        if (formatted.length === 10) {
            const iso = lkToISO(formatted);
            if (iso && onChange) {
                onChange(iso);
            }
        } else if (formatted.length === 0 && onChange) {
            onChange('');
        }
    };

    const handleSelectDate = (year: number, month: number, day: number) => {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (effectiveMaxDate && iso > effectiveMaxDate) return;
        if (minDate && iso < minDate) return;

        setRawText(isoToLK(iso));
        if (onChange) {
            onChange(iso);
        }
        setIsCalendarOpen(false);
    };

    // Calculate age if valid birthdate
    const currentISO = lkToISO(rawText) || (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
    const ageInfo = currentISO ? calculateAge(currentISO) : null;

    const hasError = Boolean(error);

    // Calendar month days calculation
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    return (
        <div ref={containerRef} className={`relative w-full ${containerClassName}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <FormLabel htmlFor={id} required={required} optional={optional}>
                        {label}
                    </FormLabel>
                    {showAgeBadge && ageInfo && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/25 dark:text-blue-300 select-none">
                            {ageInfo.ageText}
                        </span>
                    )}
                </div>
            )}

            <div className="relative flex items-center w-full">
                <input
                    id={id}
                    name={name}
                    type="text"
                    value={rawText}
                    onChange={handleTextChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                    className={`h-11 w-full pl-3.5 pr-20 rounded-xl text-[15px] font-normal transition-all duration-200 outline-none
                        bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                        text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                        backdrop-blur-md shadow-xs
                        border ${
                            hasError
                                ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                                : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-[#1E6FD9] focus:ring-4 focus:ring-[#1E6FD9]/15'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {rawText && (
                        <button
                            type="button"
                            onClick={() => {
                                setRawText('');
                                if (onChange) onChange('');
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            aria-label="Clear date"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            if (disabled) return;
                            setIsCalendarOpen(!isCalendarOpen);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E6FD9] dark:hover:text-[#1E6FD9] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Open calendar"
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {hasError && <FormError message={error} id={errorId} />}

            {!hasError && helperText && (
                <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {helperText}
                </p>
            )}

            {/* Calendar Popover */}
            {isCalendarOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header: Month / Year nav */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <span>{monthNames[viewMonth]}</span>
                            <select
                                value={viewYear}
                                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                {Array.from({ length: 110 }, (_, i) => today.getFullYear() - i).map((y) => (
                                    <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <span key={d} className="text-[11px] font-semibold text-slate-400">
                                {d}
                            </span>
                        ))}
                    </div>

                    {/* Day Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <span key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dISO = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = value === dISO;
                            const isFuture = effectiveMaxDate && dISO > effectiveMaxDate;
                            const isTooPast = minDate && dISO < minDate;
                            const isCurrentDay = todayISO === dISO;

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={Boolean(isFuture || isTooPast)}
                                    onClick={() => handleSelectDate(viewYear, viewMonth, day)}
                                    className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                                        isSelected
                                            ? 'bg-[#1E6FD9] text-white font-bold shadow-xs'
                                            : isFuture || isTooPast
                                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                            : isCurrentDay
                                            ? 'border border-[#1E6FD9] text-[#1E6FD9] font-bold'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DateInput;
