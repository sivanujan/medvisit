import React, { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: ReactNode;
    description?: ReactNode;
    containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
    {
        label,
        description,
        className = '',
        containerClassName = '',
        id: propId,
        ...props
    },
    ref
) {
    const generatedId = useId();
    const id = propId || generatedId;

    return (
        <div className={`flex items-start gap-3 ${containerClassName}`}>
            <div className="flex items-center h-5">
                <input
                    ref={ref}
                    id={id}
                    type="checkbox"
                    className={`h-4 w-4 rounded-md border-slate-300 dark:border-white/20 text-[#1E6FD9] focus:ring-4 focus:ring-[#1E6FD9]/20 bg-white dark:bg-slate-900 transition-colors cursor-pointer ${className}`}
                    {...props}
                />
            </div>
            {(label || description) && (
                <div className="text-left select-none">
                    {label && (
                        <label htmlFor={id} className="text-[13px] font-medium text-slate-800 dark:text-slate-200 cursor-pointer block">
                            {label}
                        </label>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
});

export default Checkbox;
