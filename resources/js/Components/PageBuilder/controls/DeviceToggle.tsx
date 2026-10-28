import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import type { Editor } from '../types';
import { toDeviceName, useDevice } from './useStyleProp';
import type { Device } from '../lib/responsive';

const ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone } as const;
const ORDER: Device[] = ['desktop', 'tablet', 'mobile'];

interface DeviceToggleProps {
    editor: Editor | null;
    // 'icon': one small button showing the active device, click cycles to the next.
    // 'group': all three devices side by side.
    variant?: 'icon' | 'group';
}

export default function DeviceToggle({ editor, variant = 'icon' }: DeviceToggleProps) {
    const device = useDevice(editor);
    const select = (d: Device) => editor?.setDevice(toDeviceName(d));

    if (variant === 'group') {
        return (
            <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5" role="group" aria-label="Device">
                {ORDER.map((d) => {
                    const Icon = ICONS[d];
                    return (
                        <button
                            key={d}
                            type="button"
                            onClick={() => select(d)}
                            aria-pressed={device === d}
                            title={toDeviceName(d)}
                            className={`flex-1 py-1 rounded-md flex items-center justify-center ${
                                device === d ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                        </button>
                    );
                })}
            </div>
        );
    }

    const Icon = ICONS[device];
    const next = ORDER[(ORDER.indexOf(device) + 1) % ORDER.length];
    return (
        <button
            type="button"
            onClick={() => select(next)}
            title={`Editing ${toDeviceName(device)} (click for ${toDeviceName(next)})`}
            className="text-slate-400 hover:text-teal-300"
        >
            <Icon className="w-3 h-3" />
        </button>
    );
}
