import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { layoutPresetHtml, type LayoutPreset } from '../lib/canvasHelpers';
import LayoutPicker from './LayoutPicker';
import type { Editor } from '../types';

type Slot = { index: number; top: number };

// "+" between top-level sections and an "Add new section" zone after the last one.
export default function AddSectionOverlay({ editor }: { editor: Editor | null }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [endTop, setEndTop] = useState<number | null>(null);
    const [picker, setPicker] = useState<{ index: number; top: number } | null>(null);

    const recompute = useCallback(() => {
        const root = rootRef.current;
        const frame: HTMLIFrameElement | undefined = editor?.Canvas?.getFrameEl?.();
        const wrapper = editor?.getWrapper?.();
        if (!root || !frame || !wrapper) return;
        const offset = frame.getBoundingClientRect().top - root.getBoundingClientRect().top;
        const sections = wrapper.components().filter((c: any) => c.get('type') !== 'textnode' && c.getEl?.());
        const next: Slot[] = [];
        let lastBottom = 8;
        sections.forEach((c: any, i: number) => {
            const rect = c.getEl().getBoundingClientRect();
            if (i > 0) next.push({ index: i, top: offset + rect.top });
            lastBottom = offset + rect.bottom;
        });
        setSlots(next);
        setEndTop(sections.length ? lastBottom + 12 : offset + 24);
    }, [editor]);

    useEffect(() => {
        if (!editor) return;
        let frameId = 0;
        const schedule = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(recompute);
        };
        const events = 'component:add component:remove component:update canvas:frame:load device:select load';
        editor.on(events, schedule);
        window.addEventListener('resize', schedule);
        const win: Window | undefined = editor.Canvas?.getWindow?.();
        win?.addEventListener('scroll', schedule);
        win?.addEventListener('resize', schedule);
        schedule();
        return () => {
            cancelAnimationFrame(frameId);
            editor.off(events, schedule);
            window.removeEventListener('resize', schedule);
            win?.removeEventListener('scroll', schedule);
            win?.removeEventListener('resize', schedule);
        };
    }, [editor, recompute]);

    const insert = (preset: LayoutPreset, index: number) => {
        const added = editor.getWrapper().components().add(layoutPresetHtml(preset), { at: index });
        const first = Array.isArray(added) ? added[0] : added;
        if (first) editor.select(first);
        setPicker(null);
    };

    const rootHeight = rootRef.current?.clientHeight ?? 0;
    const visible = (top: number) => top > 0 && top < rootHeight - 10;

    return (
        <div ref={rootRef} className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {slots.filter((s) => visible(s.top)).map((slot) => (
                <button
                    key={slot.index}
                    type="button"
                    onClick={() => setPicker({ index: slot.index, top: slot.top })}
                    className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg opacity-30 hover:opacity-100 transition-opacity"
                    style={{ top: slot.top }}
                    title="Add section here"
                    aria-label="Add section here"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            ))}
            {endTop !== null && visible(endTop) && (
                <button
                    type="button"
                    onClick={() => setPicker({ index: editor.getWrapper().components().length, top: endTop })}
                    className="pointer-events-auto absolute left-6 right-6 h-20 rounded-2xl border-2 border-dashed border-slate-400/60 text-slate-500 hover:border-teal-500 hover:text-teal-600 bg-white/60 flex items-center justify-center gap-2 text-xs font-bold"
                    style={{ top: endTop }}
                >
                    <Plus className="w-4 h-4" />
                    Add new section
                </button>
            )}
            {picker && (
                <div className="absolute left-1/2 -translate-x-1/2" style={{ top: Math.max(8, Math.min(picker.top + 16, rootHeight - 140)) }}>
                    <LayoutPicker onPick={(p) => insert(p, picker.index)} onClose={() => setPicker(null)} />
                </div>
            )}
        </div>
    );
}
