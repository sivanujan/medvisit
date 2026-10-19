import React from 'react';
import { X } from 'lucide-react';
import { LAYOUT_PRESETS, type LayoutPreset } from '../lib/canvasHelpers';

const PRESET_BARS: Record<LayoutPreset, number[]> = {
    '1': [1],
    '2': [1, 1],
    '3': [1, 1, 1],
    '1-2': [1, 2],
    '2-1': [2, 1],
};

// "Select your structure" picker for a new section.
export default function LayoutPicker({ onPick, onClose }: { onPick: (preset: LayoutPreset) => void; onClose: () => void }) {
    return (
        <div className="pointer-events-auto rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-3 w-[300px]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300">Select your structure</span>
                <button type="button" onClick={onClose} className="text-slate-500 hover:text-white" aria-label="Close">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {LAYOUT_PRESETS.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => onPick(preset)}
                        className="h-12 rounded-lg border border-white/10 hover:border-teal-500 bg-slate-800 p-1.5 flex gap-1"
                        title={`${PRESET_BARS[preset].length} column${PRESET_BARS[preset].length > 1 ? 's' : ''}`}
                    >
                        {PRESET_BARS[preset].map((grow, i) => (
                            <span key={i} className="h-full rounded bg-slate-600" style={{ flexGrow: grow, flexBasis: 0 }} />
                        ))}
                    </button>
                ))}
            </div>
        </div>
    );
}
