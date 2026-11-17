import React, { LabelHTMLAttributes, ReactNode } from 'react';

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    children: ReactNode;
    required?: boolean;
    optional?: boolean;
    badge?: ReactNode;
    className?: string;
    htmlFor?: string;
}

export function FormLabel({
    children,
    required = false,
    optional = false,
    badge,
    className = '',
    htmlFor,
    ...props
}: FormLabelProps) {
    return (
        <label
            htmlFor={htmlFor}
            className={`flex items-center text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 select-none ${className}`}
            {...props}
        >
            <span>{children}</span>
            {required && (
                <span className="text-[#FF7A59] font-bold ml-1" title="Required field" aria-hidden="true">
                    *
                </span>
            )}
            {!required && optional && (
                <span className="text-slate-400 dark:text-slate-500 font-normal text-xs ml-1.5">
                    (optional)
                </span>
            )}
            {badge && <span className="ml-2 inline-flex items-center">{badge}</span>}
        </label>
    );
}

export default FormLabel;
