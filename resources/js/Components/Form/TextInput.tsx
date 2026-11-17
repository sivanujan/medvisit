import React, { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import FormLabel from './FormLabel';
import FormError from './FormError';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: ReactNode;
    error?: string | null;
    helperText?: ReactNode;
    required?: boolean;
    optional?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    prefixText?: string;
    suffixText?: string;
    containerClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    {
        label,
        error,
        helperText,
        required = false,
        optional = false,
        leftIcon,
        rightIcon,
        prefixText,
        suffixText,
        className = '',
        containerClassName = '',
        id: propId,
        type = 'text',
        disabled = false,
        ...props
    },
    ref
) {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const hasError = Boolean(error);

    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <FormLabel htmlFor={id} required={required} optional={optional}>
                    {label}
                </FormLabel>
            )}

            <div className="relative flex items-center w-full">
                {leftIcon && (
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10 flex items-center justify-center">
                        {leftIcon}
                    </div>
                )}

                {prefixText && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none z-10 select-none">
                        {prefixText}
                    </span>
                )}

                <input
                    ref={ref}
                    id={id}
                    type={type}
                    disabled={disabled}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                    className={`h-11 w-full px-3.5 rounded-xl text-[15px] font-normal transition-all duration-200 outline-none
                        bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                        text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                        backdrop-blur-md shadow-xs
                        border ${
                            hasError
                                ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                                : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-[#1E6FD9] focus:ring-4 focus:ring-[#1E6FD9]/15'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${leftIcon ? 'pl-10' : ''}
                        ${prefixText ? 'pl-12' : ''}
                        ${rightIcon ? 'pr-10' : ''}
                        ${suffixText ? 'pr-14' : ''}
                        ${className}`}
                    {...props}
                />

                {suffixText && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none z-10 select-none">
                        {suffixText}
                    </span>
                )}

                {rightIcon && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10 flex items-center justify-center">
                        {rightIcon}
                    </div>
                )}
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

export default TextInput;
