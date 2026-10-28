import React, { useState } from 'react';
import type { Editor } from '../../types';
import ColorControl, { type ColorSwatch } from '../../controls/ColorControl';
import ResponsiveField from '../../controls/ResponsiveField';
import UnitInput from '../../controls/UnitInput';
import { useStyleProp } from '../../controls/useStyleProp';
import { formatGradient, formatImageBackground, parseGradient, parseImageBackground } from '../../lib/cssValues';
import Group from './Group';
import { ColorField, SelectField, opts } from './fields';

type Mode = 'none' | 'color' | 'gradient' | 'image';
const MODES: { id: Mode; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'color', label: 'Color' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'image', label: 'Image' },
];
const DEFAULT_GRADIENT = { angle: 90, from: '#0E9E8F', to: '#1E6FD9' };

interface BackgroundGroupProps {
    editor: Editor;
    swatches?: ColorSwatch[];
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
}

function deriveMode(image: string, color: string): Mode {
    if (/url\(/i.test(image)) return 'image';
    if (parseGradient(image)) return 'gradient';
    return color ? 'color' : 'none';
}

export default function BackgroundGroup({ editor, swatches, onOpenMedia }: BackgroundGroupProps) {
    const image = useStyleProp(editor, 'background-image');
    const color = useStyleProp(editor, 'background-color');
    // Explicit choice made in this group (e.g. "Image" before a file is picked); cleared on selection change via key.
    const [picked, setPicked] = useState<Mode | null>(null);
    const mode = picked ?? deriveMode(image.value, color.value);

    const choose = (next: Mode) => {
        setPicked(next);
        if (next === 'none') {
            image.reset();
            color.reset();
        } else if (next === 'color') {
            image.reset();
        } else if (next === 'gradient') {
            color.reset();
            if (!parseGradient(image.value)) image.set(formatGradient(DEFAULT_GRADIENT));
        } else if (!/url\(/i.test(image.value)) {
            color.reset();
        }
    };

    const gradient = parseGradient(image.value) ?? DEFAULT_GRADIENT;
    const bg = parseImageBackground(image.value);

    return (
        <Group title="Background" editor={editor} stateAware>
            <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5" role="group" aria-label="Background type">
                {MODES.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        aria-pressed={mode === m.id}
                        onClick={() => choose(m.id)}
                        className={`flex-1 py-1 rounded-md text-[11px] font-bold ${
                            mode === m.id ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {mode === 'color' && <ColorField editor={editor} prop="background-color" label="Background color" swatches={swatches} />}

            {mode === 'gradient' && (
                <div className="space-y-2">
                    <ResponsiveField editor={editor} prop="background-image" label="Gradient start">
                        {(p) => (
                            <ColorControl
                                ariaLabel="Gradient start"
                                value={gradient.from}
                                inherited={p.inherited}
                                swatches={swatches}
                                onChange={(from) => image.set(formatGradient({ ...gradient, from }))}
                            />
                        )}
                    </ResponsiveField>
                    <div>
                        <p className="text-[11px] font-bold text-slate-300 mb-1">Gradient end</p>
                        <ColorControl
                            ariaLabel="Gradient end"
                            value={gradient.to}
                            swatches={swatches}
                            onChange={(to) => image.set(formatGradient({ ...gradient, to }))}
                        />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-300 mb-1">Angle</p>
                        <UnitInput
                            ariaLabel="Gradient angle"
                            value={`${gradient.angle}deg`}
                            units={['deg']}
                            allowKeywords={false}
                            onChange={(v) => image.set(formatGradient({ ...gradient, angle: parseFloat(v) || 0 }))}
                        />
                    </div>
                </div>
            )}

            {mode === 'image' && (
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => onOpenMedia(bg.url, (url) => image.set(formatImageBackground(url, bg.overlay)))}
                        className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-teal-300 hover:bg-white/10"
                    >
                        {bg.url ? 'Change image' : 'Choose image'}
                    </button>
                    {bg.url && <p className="text-[10px] text-slate-400 truncate">{bg.url}</p>}
                    <SelectField editor={editor} prop="background-position" label="Position" options={opts('center', 'top', 'bottom', 'left', 'right')} />
                    <SelectField editor={editor} prop="background-size" label="Size" options={opts('cover', 'contain', 'auto')} />
                    <SelectField editor={editor} prop="background-repeat" label="Repeat" options={opts('no-repeat', 'repeat', 'repeat-x', 'repeat-y')} />
                    {bg.url && (
                        <div>
                            <p className="text-[11px] font-bold text-slate-300 mb-1">Overlay color (optional)</p>
                            <ColorControl
                                ariaLabel="Overlay color"
                                value={bg.overlay}
                                onChange={(overlay) => image.set(formatImageBackground(bg.url, overlay))}
                            />
                        </div>
                    )}
                </div>
            )}
        </Group>
    );
}
