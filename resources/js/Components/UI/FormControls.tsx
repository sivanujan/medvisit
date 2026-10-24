import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes, forwardRef, ReactNode } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export function GlassLabel({
    children,
    required = false,
    className = '',
    htmlFor,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ${className}`}
            {...props}
        >
            {children}
            {required && <span className="text-accent ml-1 font-black">*</span>}
        </label>
    );
}

export function GlassError({
    message,
    className = '',
}: {
    message?: string | null;
    className?: string;
}) {
    if (!message) return null;
    return (
        <p className={`mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 ${className}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    );
}

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean | string;
    icon?: ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(function GlassInput(
    { className = '', error, icon, type = 'text', ...props },
    ref
) {
    return (
        <div className="relative w-full">
            {icon && (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {icon}
                </div>
            )}
            <input
                ref={ref}
                type={type}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                    bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                    text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                    backdrop-blur-md
                    border ${
                        error
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15'
                    }
                    shadow-xs ${icon ? 'pl-10' : ''} ${className}`}
                {...props}
            />
        </div>
    );
});

export { default as GlassSelect } from './GlassSelect';
export type { GlassSelectProps, GlassSelectOption } from './GlassSelect';

export interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean | string;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(function GlassTextarea(
    { className = '', error, rows = 3, ...props },
    ref
) {
    return (
        <textarea
            ref={ref}
            rows={rows}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                backdrop-blur-md
                border ${
                    error
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                        : 'border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15'
                }
                shadow-xs ${className}`}
            {...props}
        />
    );
});

export interface GlassCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: ReactNode;
}

export const GlassCheckbox = forwardRef<HTMLInputElement, GlassCheckboxProps>(function GlassCheckbox(
    { className = '', label, id, ...props },
    ref
) {
    return (
        <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
                ref={ref}
                type="checkbox"
                id={id}
                className={`w-4 h-4 rounded-md border-slate-300 dark:border-white/20 text-primary focus:ring-primary/20 bg-white/80 dark:bg-white/10 transition-colors cursor-pointer ${className}`}
                {...props}
            />
            {label && (
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </span>
            )}
        </label>
    );
});
