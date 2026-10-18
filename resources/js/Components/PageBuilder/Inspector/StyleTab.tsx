import React from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { InspectorTabName, InspectorTabProps } from '../types';

interface StyleTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
}

// Color Swatches
const colorSwatches = [
    { label: 'MedVisit Teal', value: '#0E9E8F' },
    { label: 'Ocean Blue', value: '#1E6FD9' },
    { label: 'Emerald Health', value: '#059669' },
    { label: 'Royal Purple', value: '#7C3AED' },
    { label: 'Slate Dark', value: '#0F172A' },
    { label: 'Clean White', value: '#FFFFFF' },
];

export default function StyleTab({ selectedComponent, inspectorTab, setIsDirty }: StyleTabProps) {
    return (
        <div
            style={
                inspectorTab === 'style'
                    ? { display: 'block' }
                    : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
            }
            className="space-y-4"
        >
            {/* Color Swatches */}
            <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Quick Color Swatches
                </label>
                <div className="flex gap-2">
                    {colorSwatches.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                                selectedComponent?.addStyle?.({ color: c.value });
                                setIsDirty(true);
                            }}
                            className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-xs"
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                        />
                    ))}
                </div>
            </div>

            {/* Alignment controls */}
            <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Text Alignment
                </label>
                <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
                    <button
                        type="button"
                        onClick={() => {
                            selectedComponent?.addStyle?.({ 'text-align': 'left' });
                            setIsDirty(true);
                        }}
                        className="flex-1 py-1 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center"
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            selectedComponent?.addStyle?.({ 'text-align': 'center' });
                            setIsDirty(true);
                        }}
                        className="flex-1 py-1 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center"
                    >
                        <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            selectedComponent?.addStyle?.({ 'text-align': 'right' });
                            setIsDirty(true);
                        }}
                        className="flex-1 py-1 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center"
                    >
                        <AlignRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Selector Manager - Always mounted */}
            <div id="builder-selectors-container" className="space-y-1" />

            {/* Standard GrapesJS Styles Container - Always mounted */}
            <div id="builder-styles-container" className="space-y-3" />
        </div>
    );
}
