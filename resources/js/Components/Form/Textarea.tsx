import React, { TextareaHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import FormLabel from './FormLabel';
import FormError from './FormError';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: ReactNode;
    error?: string | null;
    helperText?: ReactNode;
    required?: boolean;
    optional?: boolean;
    showCharCount?: boolean;
    containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    {
        label,
        error,
        helperText,
        required = false,
        optional = false,
        showCharCount = false,
        className = '',
        containerClassName = '',
        id: propId,
        rows = 3,
        maxLength,
        value,
        disabled = false,
        ...props
    },
    ref
) {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const charCount = typeof value === 'string' ? value.length : 0;
    const hasError = Boolean(error);

    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <FormLabel htmlFor={id} required={required} optional={optional}>
                        {label}
                    </FormLabel>
                    {showCharCount && maxLength && (
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5 select-none">
                            {charCount} / {maxLength}
                        </span>
                    )}
                </div>
            )}

            <textarea
                ref={ref}
                id={id}
                rows={rows}
                maxLength={maxLength}
                value={value}
                disabled={disabled}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                className={`w-full px-3.5 py-2.5 rounded-xl text-[15px] font-normal transition-all duration-200 outline-none
                    bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                    text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                    backdrop-blur-md shadow-xs
                    border ${
                        hasError
                            ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-[#1E6FD9] focus:ring-4 focus:ring-[#1E6FD9]/15'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                {...props}
            />

            {hasError && <FormError message={error} id={errorId} />}

            {!hasError && helperText && (
                <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {helperText}
                </p>
            )}
        </div>
    );
});

export default Textarea;
