import React, { useEffect, useState } from 'react';
import { formatUnitValue, parseUnitValue } from '../lib/cssValues';

export const DEFAULT_UNITS = ['px', 'rem', 'em', '%', 'vw'];

interface UnitInputProps {
    value: string;
    onChange: (v: string) => void;
    units?: string[];
    placeholder?: string;
    // Grey rendering for values inherited from another device.
    inherited?: boolean;
    ariaLabel?: string;
    // Allow keyword values such as `auto` / `normal` typed as text.
    allowKeywords?: boolean;
    step?: number;
}

export default function UnitInput({
    value,
    onChange,
    units = DEFAULT_UNITS,
    placeholder,
    inherited = false,
    ariaLabel,
    allowKeywords = true,
    step = 1,
}: UnitInputProps) {
    const parsed = parseUnitValue(value);
    const [text, setText] = useState(parsed.number !== null ? String(parsed.number) : parsed.unit);
    const unit = parsed.number !== null && units.includes(parsed.unit) ? parsed.unit : units[0];

    useEffect(() => {
        setText(parsed.number !== null ? String(parsed.number) : parsed.unit);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const commit = (raw: string, u: string) => {
        const t = raw.trim();
        if (t === '') return onChange('');
        const n = Number(t);
        if (!Number.isNaN(n)) return onChange(formatUnitValue(n, u));
        if (allowKeywords) onChange(t);
    };

    return (
        <div className="flex gap-1">
            <input
                type="text"
                inputMode="decimal"
                aria-label={ariaLabel}
                value={text}
                placeholder={placeholder}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => {
                    if (text.trim() !== (parsed.number !== null ? String(parsed.number) : parsed.unit)) commit(text, unit);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit(text, unit);
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        const n = Number(text);
                        if (!Number.isNaN(n) && text.trim() !== '') {
                            e.preventDefault();
                            commit(String(Number((n + (e.key === 'ArrowUp' ? step : -step)).toFixed(3))), unit);
                        }
                    }
                }}
                className={`w-full min-w-0 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] focus:outline-none focus:border-teal-500 ${
                    inherited ? 'text-slate-500 italic' : 'text-white font-bold'
                }`}
            />
            <select
                aria-label={ariaLabel ? `${ariaLabel} unit` : 'Unit'}
                value={unit}
                onChange={(e) => commit(text, e.target.value)}
                disabled={parsed.number === null && text !== ''}
                className="px-1 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 focus:outline-none"
            >
                {units.map((u) => (
                    <option key={u} value={u} className="bg-slate-900">
                        {u || '—'}
                    </option>
                ))}
            </select>
        </div>
    );
}
