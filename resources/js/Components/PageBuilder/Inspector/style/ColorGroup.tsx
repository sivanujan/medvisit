import React from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { Editor } from '../../types';
import type { ColorSwatch } from '../../controls/ColorControl';
import ResponsiveField from '../../controls/ResponsiveField';
import Group from './Group';
import { ColorField } from './fields';

const ALIGNMENTS = [
    { value: 'left', Icon: AlignLeft },
    { value: 'center', Icon: AlignCenter },
    { value: 'right', Icon: AlignRight },
] as const;

export default function ColorGroup({ editor, swatches }: { editor: Editor; swatches?: ColorSwatch[] }) {
    return (
        <Group title="Color & alignment" editor={editor} defaultOpen stateAware>
            <ColorField editor={editor} prop="color" label="Text color" swatches={swatches} />
            <ResponsiveField editor={editor} prop="text-align" label="Text align">
                {(p) => (
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
                        {ALIGNMENTS.map(({ value, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                aria-label={`Align ${value}`}
                                aria-pressed={p.value === value}
                                onClick={() => p.set(value)}
                                className={`flex-1 py-1 rounded-lg flex items-center justify-center ${
                                    p.value === value
                                        ? p.inherited
                                            ? 'bg-white/10 text-slate-400'
                                            : 'bg-teal-600 text-white'
                                        : 'text-slate-300 hover:bg-white/10'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        ))}
                    </div>
                )}
            </ResponsiveField>
        </Group>
    );
}
