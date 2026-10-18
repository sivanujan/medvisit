import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Editor } from '../../types';
import StateToggle from '../../controls/StateToggle';
import { useStyleState } from '../../controls/useStyleProp';

interface GroupProps {
    title: string;
    editor: Editor;
    defaultOpen?: boolean;
    // State-aware groups (color, background, border, shadow) get a Normal/Hover toggle.
    // Other groups are disabled while Hover is active so they never write to the :hover rule.
    stateAware?: boolean;
    children: React.ReactNode;
}

export default function Group({ title, editor, defaultOpen = false, stateAware = false, children }: GroupProps) {
    const [open, setOpen] = useState(defaultOpen);
    const state = useStyleState(editor);
    const locked = !stateAware && state !== '';
    return (
        <section className="rounded-xl border border-white/10 bg-white/[0.03]">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-200 uppercase tracking-wide"
            >
                {title}
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-3">
                    {stateAware && <StateToggle editor={editor} />}
                    {locked && (
                        <p className="text-[10px] text-amber-300">Switch to Normal state to edit these properties.</p>
                    )}
                    <div className={locked ? 'space-y-3 opacity-40 pointer-events-none' : 'space-y-3'}>{children}</div>
                </div>
            )}
        </section>
    );
}
