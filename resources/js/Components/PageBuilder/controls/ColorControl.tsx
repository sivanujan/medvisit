import React from 'react';

export type ColorSwatch = { id: string; name: string; value: string };

interface ColorControlProps {
    value: string;
    onChange: (v: string) => void;
    inherited?: boolean;
    ariaLabel?: string;
    // Global-kit colors (Task 12). Nothing extra is rendered when absent or empty.
    swatches?: ColorSwatch[];
}

const HEX6 = /^#[0-9a-f]{6}$/i;

export default function ColorControl({ value, onChange, inherited = false, ariaLabel, swatches }: ColorControlProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex gap-1">
                <input
                    type="color"
                    aria-label={ariaLabel ? `${ariaLabel} picker` : 'Color picker'}
                    value={HEX6.test(value) ? value : '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-7 h-7 p-0 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                />
                <input
                    type="text"
                    aria-label={ariaLabel}
                    key={value}
                    defaultValue={value}
                    placeholder="inherit"
                    onBlur={(e) => {
                        if (e.target.value.trim() !== value) onChange(e.target.value.trim());
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className={`w-full min-w-0 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] focus:outline-none focus:border-teal-500 ${
                        inherited ? 'text-slate-500 italic' : 'text-white font-bold'
                    }`}
                />
            </div>
            {swatches && swatches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {swatches.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            title={s.name}
                            onClick={() => onChange(s.value)}
                            className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                            style={{ backgroundColor: s.value }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
