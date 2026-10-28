import React from 'react';
import type { Editor } from '../types';
import { useStyleState } from './useStyleProp';

export default function StateToggle({ editor }: { editor: Editor | null }) {
    const state = useStyleState(editor);
    const options = [
        { id: '', label: 'Normal' },
        { id: 'hover', label: 'Hover' },
    ];
    return (
        <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5 mb-2" role="group" aria-label="State">
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    aria-pressed={state === o.id}
                    onClick={() => editor?.Selectors.setState(o.id)}
                    className={`flex-1 py-1 rounded-md text-[11px] font-bold ${
                        state === o.id ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
