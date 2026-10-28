import React from 'react';
import type { TabBaseProps } from '../types';

interface LayersTabProps extends TabBaseProps {
    isActive: boolean;
}

export default function LayersTab({ isActive }: LayersTabProps) {
    return (
        <div
            className="flex-1 overflow-y-auto p-3"
            style={
                isActive
                    ? { display: 'block' }
                    : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
            }
        >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                DOM Hierarchy
            </span>
            {/* GrapesJS Layers Container - Always mounted */}
            <div id="builder-layers-container" className="text-xs" />
        </div>

    );
}
