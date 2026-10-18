import React, { useEffect, useState } from 'react';
import type { Component, Editor } from '../types';
import { expandSelectorKeyword } from '../lib/animations';

const ATTR = 'data-mv-custom-css';

// Removes what a previous custom-CSS block contributed to the editor CSS. Re-adding the old CSS
// returns the existing rule instances (GrapesJS merges by selector), whose declared properties are then stripped.
function removeCustomRules(editor: Editor, expandedCss: string) {
    if (!expandedCss.trim()) return;
    const declared = new Set<string>();
    for (const entry of editor.Parser.parseCss(expandedCss) ?? []) {
        Object.keys(entry.style ?? {}).forEach((k) => declared.add(k));
    }
    for (const rule of editor.Css.addRules(expandedCss) ?? []) {
        const rest = { ...(rule.getStyle?.() ?? {}) };
        declared.forEach((k) => delete rest[k]);
        if (Object.keys(rest).length === 0) editor.Css.remove(rule);
        else rule.setStyle(rest);
    }
}

export function applyCustomCss(editor: Editor, component: Component, next: string) {
    const id: string = component.getId();
    const prev: string = component.getAttributes()?.[ATTR] ?? '';
    if (prev === next) return;
    removeCustomRules(editor, expandSelectorKeyword(prev, id));
    if (next.trim() === '') {
        component.removeAttributes(ATTR);
        return;
    }
    // An explicit id attribute guarantees the #id selector is exported to the public page.
    component.addAttributes({ id, [ATTR]: next });
    editor.Css.addRules(expandSelectorKeyword(next, id));
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
