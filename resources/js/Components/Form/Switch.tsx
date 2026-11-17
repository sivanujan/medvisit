import React, { useId, ReactNode } from 'react';

export interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    id?: string;
    name?: string;
    className?: string;
}

export function Switch({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    id: propId,
    name,
    className = '',
}: SwitchProps) {
    const generatedId = useId();
    const id = propId || generatedId;

    return (
        <div className={`flex items-start justify-between gap-3 ${className}`}>
            {(label || description) && (
                <label htmlFor={id} className="select-none cursor-pointer flex-1">
                    {label && (
                        <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-200">
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {description}
                        </span>
                    )}
                </label>
            )}

            <button
                type="button"
                role="switch"
                id={id}
                name={name}
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-[#1E6FD9]/20 ${
                    checked ? 'bg-[#1E6FD9]' : 'bg-slate-300 dark:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}

export default Switch;
