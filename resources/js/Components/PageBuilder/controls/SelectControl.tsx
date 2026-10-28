import React from 'react';

interface SelectControlProps {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    inherited?: boolean;
    ariaLabel?: string;
    placeholder?: string;
}

export default function SelectControl({
    value,
    options,
    onChange,
    inherited = false,
    ariaLabel,
    placeholder = 'Default',
}: SelectControlProps) {
    return (
        <select
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] focus:outline-none focus:border-teal-500 ${
                inherited || value === '' ? 'text-slate-500 italic' : 'text-white font-bold'
            }`}
        >
            <option value="" className="bg-slate-900">
                {placeholder}
            </option>
            {options.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900">
                    {o.label}
                </option>
            ))}
            {value !== '' && !options.some((o) => o.value === value) && (
                <option value={value} className="bg-slate-900">
                    {value}
                </option>
            )}
        </select>
    );
}
