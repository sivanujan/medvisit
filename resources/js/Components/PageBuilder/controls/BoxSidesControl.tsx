import React from 'react';
import type { Editor } from '../types';
import UnitInput, { DEFAULT_UNITS } from './UnitInput';
import { useStyleProp } from './useStyleProp';

export type BoxSide = { prop: string; label: string };

interface BoxSidesControlProps {
    editor: Editor;
    sides: BoxSide[];
    units?: string[];
    // When linked, editing or resetting one side applies to every side.
    linked?: boolean;
}

function SideInput({ editor, side, units, sides, linked }: { editor: Editor; side: BoxSide; units: string[]; sides: BoxSide[]; linked: boolean }) {
    const p = useStyleProp(editor, side.prop);
    const setAll = (v: string) => editor.StyleManager.addStyleTargets(Object.fromEntries(sides.map((s) => [s.prop, v])));
    const set = linked ? setAll : p.set;
    const reset = linked ? () => setAll('') : p.reset;
    const overridden = p.value !== '' && p.inheritedFrom === null;
    return (
        <div>
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{side.label}</span>
                {overridden && (
                    <button
                        type="button"
                        onClick={reset}
                        aria-label={`Reset ${side.label}`}
                        title="Reset to inherited value"
                        className="text-[10px] text-teal-300 hover:text-white"
                    >
                        ↺
                    </button>
                )}
            </div>
            <UnitInput
                value={p.value}
                onChange={set}
                units={units}
                ariaLabel={side.label}
                inherited={p.value !== '' && p.inheritedFrom !== null}
                placeholder="0"
            />
        </div>
    );
}

// Grid of per-side (or per-corner) unit inputs; each side is its own responsive property.
export default function BoxSidesControl({ editor, sides, units = DEFAULT_UNITS, linked = false }: BoxSidesControlProps) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {sides.map((s) => (
                <SideInput key={s.prop} editor={editor} side={s} units={units} sides={sides} linked={linked} />
            ))}
        </div>
    );
}
