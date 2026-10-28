import React from 'react';
import type { Editor } from '../types';
import { formatShadow, parseShadow, type Shadow } from '../lib/cssValues';
import ColorControl, { type ColorSwatch } from './ColorControl';
import ResponsiveField from './ResponsiveField';

interface ShadowControlProps {
    editor: Editor;
    prop: 'box-shadow' | 'text-shadow';
    label: string;
    swatches?: ColorSwatch[];
}

const DEFAULT_SHADOW: Omit<Shadow, 'spread'> = { x: 0, y: 4, blur: 12, color: 'rgba(0,0,0,0.2)' };

function NumberBox({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    return (
        <label className="block text-[10px] text-slate-400">
            {label}
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                className="w-full px-1.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-teal-500"
            />
        </label>
    );
}

// Single-layer shadow editor: x / y / blur (/ spread for box-shadow) + colour.
export default function ShadowControl({ editor, prop, label, swatches }: ShadowControlProps) {
    const withSpread = prop === 'box-shadow';
    return (
        <ResponsiveField editor={editor} prop={prop} label={label}>
            {(p) => {
                const parsed = parseShadow(p.value);
                const shadow: Shadow = parsed ?? { ...DEFAULT_SHADOW, ...(withSpread ? { spread: 0 } : {}) };
                const update = (patch: Partial<Shadow>) => {
                    const next = { ...shadow, ...patch };
                    if (!withSpread) delete next.spread;
                    p.set(formatShadow(next));
                };
                return (
                    <div className="space-y-1.5">
                        <div className={`grid ${withSpread ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 ${p.inherited || !parsed ? 'opacity-60' : ''}`}>
                            <NumberBox label="X" value={shadow.x} onChange={(x) => update({ x })} />
                            <NumberBox label="Y" value={shadow.y} onChange={(y) => update({ y })} />
                            <NumberBox label="Blur" value={shadow.blur} onChange={(blur) => update({ blur })} />
                            {withSpread && (
                                <NumberBox label="Spread" value={shadow.spread ?? 0} onChange={(spread) => update({ spread })} />
                            )}
                        </div>
                        <ColorControl
                            ariaLabel={`${label} color`}
                            value={shadow.color}
                            inherited={p.inherited}
                            swatches={swatches}
                            onChange={(color) => update({ color })}
                        />
                    </div>
                );
            }}
        </ResponsiveField>
    );
}
