import React from 'react';
import { MEDICAL_ICONS, getMedicalSvg } from '@/Utils/medicalIcons';
import { FieldLabel } from './fields';
import type { ContentPanelProps } from './types';

export default function IconContent({ component, setIsDirty }: ContentPanelProps) {
    // An <svg> selected directly is replaced through its wrapper so the wrapper's styling is kept.
    const target = String(component.get('tagName')).toLowerCase() === 'svg' ? component.parent() ?? component : component;
    return (
        <div>
            <FieldLabel>Choose icon</FieldLabel>
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-900 rounded-xl border border-white/10 max-h-56 overflow-y-auto">
                {MEDICAL_ICONS.map((icon) => (
                    <button
                        key={icon.name}
                        type="button"
                        onClick={() => {
                            target.components(getMedicalSvg(icon.name, { size: 32, color: 'currentColor' }));
                            setIsDirty(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-teal-500/20 border border-transparent hover:border-teal-500/50 flex flex-col items-center text-slate-300 hover:text-teal-300"
                        title={icon.label}
                    >
                        <span dangerouslySetInnerHTML={{ __html: getMedicalSvg(icon.name, { size: 18 }) }} />
                        <span className="text-[8px] text-slate-400 mt-1 truncate max-w-[40px]">{icon.label}</span>
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Icon colour follows the text colour (Style › Color).</p>
        </div>
    );
}
