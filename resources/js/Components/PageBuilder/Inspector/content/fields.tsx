import React from 'react';

// Small form controls shared by the widget Content panels (dark inspector styling).
const inputClass =
    'w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 py-1.5 focus:border-teal-500 focus:outline-none';

export function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[11px] font-bold text-slate-300 mb-1">{children}</label>;
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    multiline = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {multiline ? (
                <textarea
                    rows={3}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                />
            )}
        </div>
    );
}

export function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function ToggleField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-300 cursor-pointer">
            <span>{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-teal-500 focus:ring-teal-500"
            />
        </label>
    );
}

export function Note({ children }: { children: React.ReactNode }) {
    return <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-xl px-2.5 py-2">{children}</p>;
}
