import React, { ChangeEvent, forwardRef, useEffect, useState } from 'react';
import { Phone } from 'lucide-react';

export interface PhoneInputProps {
    value?: string;
    onChange?: (normalized: string) => void;
    error?: boolean | string;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    id?: string;
    name?: string;
    required?: boolean;
}

/**
 * Normalise Sri Lankan number input:
 * Accepts e.g. "0771234567", "771234567", "+94771234567"
 * Returns "+94771234567" or formatted string.
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
 * Format digits for display (e.g. "77 123 4567")
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
        value = '',
        onChange,
        error,
        disabled = false,
        placeholder = '7X XXX XXXX',
        className = '',
        id,
        name,
        required,
    },
    ref
) {
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

    return (
        <div className="relative w-full">
            <div className="flex items-center rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 shadow-xs">
                {/* Fixed Sri Lanka Dial Code Badge */}
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-r border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 select-none text-xs font-bold tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span>+94</span>
                </div>

                {/* Local Number Input */}
                <input
                    ref={ref}
                    type="tel"
                    id={id}
                    name={name}
                    required={required}
                    disabled={disabled}
                    value={display}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={`flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border-none focus:ring-0 ${
                        error ? 'text-rose-600' : ''
                    } ${className}`}
                />
            </div>
            {typeof error === 'string' && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            )}
        </div>
    );
});

export default PhoneInput;
