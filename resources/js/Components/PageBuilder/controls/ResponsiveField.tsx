import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { Editor } from '../types';
import DeviceToggle from './DeviceToggle';
import { useStyleProp, type StyleProp } from './useStyleProp';

interface ResponsiveFieldProps {
    editor: Editor;
    prop: string;
    label: string;
    children: (p: StyleProp & { inherited: boolean; overridden: boolean }) => React.ReactNode;
}

// Label row (device icon + overridden reset) around one style property control.
export default function ResponsiveField({ editor, prop, label, children }: ResponsiveFieldProps) {
    const p = useStyleProp(editor, prop);
    const overridden = p.value !== '' && p.inheritedFrom === null;
    const inherited = p.value !== '' && p.inheritedFrom !== null;
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                    <DeviceToggle editor={editor} />
                    {label}
                </label>
                {overridden && (
                    <button
                        type="button"
                        onClick={p.reset}
                        title="Reset to inherited value"
                        aria-label={`Reset ${label}`}
                        className="text-teal-300 hover:text-white"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
            </div>
            {children({ ...p, inherited, overridden })}
        </div>
    );
}
