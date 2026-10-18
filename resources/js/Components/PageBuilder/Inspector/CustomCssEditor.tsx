import React, { useEffect, useState } from 'react';
import type { Component, Editor } from '../types';
import { CUSTOM_CSS_ATTR as ATTR, syncCustomCssStyle } from '../lib/customCss';

// Raw text lives on the component; the canvas style and the saved CSS are rebuilt from it,
// so Style-tab rules for the same #id are never touched.
export function applyCustomCss(editor: Editor, component: Component, next: string) {
    const prev: string = component.getAttributes()?.[ATTR] ?? '';
    if (prev === next) return;
    if (next.trim() === '') {
        component.removeAttributes(ATTR);
    } else {
        // An explicit id attribute guarantees the #id selector matches on the public page.
        component.addAttributes({ id: component.getId(), [ATTR]: next });
    }
    syncCustomCssStyle(editor);
}

interface CustomCssEditorProps {
    editor: Editor;
    component: Component;
    onChange: () => void;
}

export default function CustomCssEditor({ editor, component, onChange }: CustomCssEditorProps) {
    const stored: string = component.getAttributes()?.[ATTR] ?? '';
    const [text, setText] = useState(stored);

    useEffect(() => {
        setText(component.getAttributes()?.[ATTR] ?? '');
    }, [component]);

    const commit = () => {
        applyCustomCss(editor, component, text);
        onChange();
    };

    return (
        <div>
            <textarea
                aria-label="Custom CSS"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                spellCheck={false}
                rows={6}
                placeholder={'selector {\n  border: 2px solid red;\n}'}
                className="w-full font-mono text-[11px] rounded-lg bg-slate-900 border border-white/10 text-white px-2 py-1.5 focus:outline-none focus:border-teal-500"
            />
            <p className="mt-1 text-[10px] text-slate-400">
                Use <code className="text-teal-300">selector</code> to target this element.
            </p>
        </div>
    );
}
