import React, { ChangeEvent, forwardRef, useEffect, useState, useId, ReactNode } from 'react';
import { Phone } from 'lucide-react';
import FormLabel from './FormLabel';
import FormError from './FormError';

export interface PhoneInputProps {
    label?: ReactNode;
    value?: string;
    onChange?: (normalized: string) => void;
    error?: string | null;
    helperText?: ReactNode;
    required?: boolean;
    optional?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    containerClassName?: string;
    id?: string;
    name?: string;
}

/**
 * Normalise Sri Lankan number input:
 * Accepts e.g. "0771234567", "771234567", "+94771234567"
 * Returns "+94771234567" or normalized string.
 */
function normalizeSriLankaPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    // If starts with 94 followed by 9 digits
    if (digits.startsWith('94') && digits.length >= 11) {
        return `+94${digits.slice(2, 11)}`;
    }

    // If starts with 0 (e.g. 0771234567)
    if (digits.startsWith('0')) {
        return `+94${digits.slice(1, 10)}`;
    }

    // If starts directly with 7 (e.g. 771234567)
    return `+94${digits.slice(0, 9)}`;
}

/**
 * Format digits for clean Sri Lankan display (e.g. "77 123 4567")
 */
function formatDisplayDigits(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('94')) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }
    digits = digits.slice(0, 9);

    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
    {
        label,
        value = '',
        onChange,
        error,
        helperText,
        required = false,
        optional = false,
        disabled = false,
        placeholder = '7X XXX XXXX',
        className = '',
        containerClassName = '',
        id: propId,
        name,
    },
    ref
) {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const [display, setDisplay] = useState(() => formatDisplayDigits(value));

    useEffect(() => {
        setDisplay(formatDisplayDigits(value));
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const inputVal = e.target.value;
        const formatted = formatDisplayDigits(inputVal);
        setDisplay(formatted);

        if (onChange) {
            const normalized = normalizeSriLankaPhone(formatted);
            onChange(normalized);
        }
    };

    const hasError = Boolean(error);

    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <FormLabel htmlFor={id} required={required} optional={optional}>
                    {label}
                </FormLabel>
            )}

            <div
                className={`h-11 flex items-center rounded-xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden transition-all duration-200 shadow-xs border ${
                    hasError
                        ? 'border-rose-400 dark:border-rose-500 ring-4 ring-rose-500/15'
                        : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-[#1E6FD9] focus-within:ring-4 focus-within:ring-[#1E6FD9]/15'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {/* Fixed Sri Lanka Dial Code Badge */}
                <div className="h-full flex items-center gap-1.5 px-3 bg-slate-100/70 dark:bg-slate-800/70 border-r border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 select-none text-[13px] font-semibold tracking-wide shrink-0">
                    <Phone className="w-3.5 h-3.5 text-[#1E6FD9]" />
                    <span>+94</span>
                </div>

                {/* Local Number Input */}
                <input
                    ref={ref}
                    type="tel"
                    id={id}
                    name={name}
                    value={display}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                    className={`h-full w-full px-3.5 bg-transparent text-[15px] font-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors ${className}`}
                />
            </div>

            {hasError && <FormError message={error} id={errorId} />}

            {!hasError && helperText && (
                <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {helperText}
                </p>
            )}
        </div>
    );
});

export default PhoneInput;
