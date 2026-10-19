import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampMenuPosition } from '../lib/canvasHelpers';
import { describeComponent } from '../Inspector/componentHelpers';
import type { Component, Editor } from '../types';
import {
    componentFromElement,
    copyComponent,
    copyStyle,
    hasComponentClip,
    hasStyleClip,
    pasteComponent,
    pasteStyle,
    resetStyle,
} from './clipboard';

type MenuState = { x: number; y: number; component: Component };

interface ContextMenuProps {
    editor: Editor | null;
    onEdit: () => void;
    onNavigator: () => void;
}

// Right-click menu for canvas elements (rendered over the canvas, positioned at the cursor).
export default function ContextMenu({ editor, onEdit, onNavigator }: ContextMenuProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<MenuState | null>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!editor) return;
        let doc: Document | null = null;
        const onContext = (e: MouseEvent) => {
            const component = componentFromElement(e.target as Element);
            if (!component || component.get('type') === 'wrapper') return;
            e.preventDefault();
            editor.select(component);
            const frame: HTMLIFrameElement = editor.Canvas.getFrameEl();
            const root = rootRef.current?.getBoundingClientRect();
            const frameRect = frame.getBoundingClientRect();
            if (!root) return;
            setMenu({ x: frameRect.left - root.left + e.clientX, y: frameRect.top - root.top + e.clientY, component });
        };
        const close = () => setMenu(null);
        const bind = () => {
            doc?.removeEventListener('contextmenu', onContext);
            doc?.removeEventListener('mousedown', close);
            doc = editor.Canvas.getDocument();
            doc?.addEventListener('contextmenu', onContext);
            doc?.addEventListener('mousedown', close);
            editor.Canvas.getWindow()?.addEventListener('scroll', close);
        };
        bind();
        editor.on('canvas:frame:load', bind);
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
        window.addEventListener('keydown', onKey);
        return () => {
            editor.off('canvas:frame:load', bind);
            doc?.removeEventListener('contextmenu', onContext);
            doc?.removeEventListener('mousedown', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [editor]);

    useLayoutEffect(() => {
        if (!menu || !rootRef.current || !menuRef.current) return;
        const r = rootRef.current.getBoundingClientRect();
        const m = menuRef.current.getBoundingClientRect();
        setPos(clampMenuPosition(menu.x, menu.y, m.width, m.height, r.width, r.height));
    }, [menu]);

    const run = (action: () => void) => () => {
        action();
        setMenu(null);
    };

    const isContainer = menu ? describeComponent(menu.component).kind === 'container' : false;
    const canPaste = editor ? hasComponentClip(editor) : false;
    const items: { label: string; hint?: string; action: () => void; disabled?: boolean; danger?: boolean }[] = editor
        ? [
              { label: 'Edit', action: onEdit },
              { label: 'Duplicate', hint: 'Ctrl+D', action: () => editor.runCommand('tlb-clone') },
              { label: 'Copy', hint: 'Ctrl+C', action: () => copyComponent(editor) },
              { label: 'Paste', hint: 'Ctrl+V', action: () => pasteComponent(editor, 'after'), disabled: !canPaste },
              ...(isContainer ? [{ label: 'Paste inside', action: () => pasteComponent(editor, 'inside'), disabled: !canPaste }] : []),
              { label: 'Copy style', hint: 'Ctrl+Shift+C', action: () => copyStyle(editor) },
              { label: 'Paste style', hint: 'Ctrl+Shift+V', action: () => pasteStyle(editor), disabled: !hasStyleClip() },
              { label: 'Reset style', action: () => resetStyle(editor) },
              { label: 'Navigator', action: onNavigator },
              { label: 'Delete', hint: 'Del', action: () => editor.runCommand('core:component-delete'), danger: true },
          ]
        : [];

    return (
        <div ref={rootRef} className="absolute inset-0 pointer-events-none z-30">
            {menu && (
                <div
                    ref={menuRef}
                    role="menu"
                    className="pointer-events-auto absolute min-w-[200px] rounded-xl bg-slate-900 border border-white/10 shadow-2xl py-1 text-[12px]"
                    style={{ left: pos.x, top: pos.y }}
                >
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-400">
                        {describeComponent(menu.component).label}
                    </div>
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={run(item.action)}
                            className={`w-full flex items-center justify-between gap-4 px-3 py-1.5 text-left disabled:opacity-40 ${
                                item.danger ? 'text-rose-300 hover:bg-rose-500/10' : 'text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            <span>{item.label}</span>
                            {item.hint && <span className="text-[10px] text-slate-500">{item.hint}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
