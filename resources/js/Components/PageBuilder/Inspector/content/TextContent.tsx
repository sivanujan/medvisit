import React, { useState } from 'react';
import { escapeHtml } from '../../lib/contentHelpers';
import { Note, TextField } from './fields';
import { childElements, plainText } from './componentOps';
import type { ContentPanelProps } from './types';

export default function TextContent({ component, setIsDirty }: ContentPanelProps) {
    const [text, setText] = useState(() => plainText(component));
    const [hasMarkup, setHasMarkup] = useState(() => childElements(component).length > 0);

    if (hasMarkup) {
        return (
            <div className="space-y-2">
                <Note>This text has formatting (links, bold, line breaks). Double-click the text on the canvas to edit it in place.</Note>
                <button
                    type="button"
                    onClick={() => {
                        if (!window.confirm('Replace this text with plain text? Links and formatting inside it will be removed.')) return;
                        component.components(escapeHtml(text));
                        setHasMarkup(false);
                        setIsDirty(true);
                    }}
                    className="w-full text-[11px] font-bold rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5"
                >
                    Edit as plain text
                </button>
            </div>
        );
    }

    return (
        <TextField
            label="Text"
            value={text}
            multiline
            onChange={(v) => {
                setText(v);
                component.components(escapeHtml(v));
                setIsDirty(true);
            }}
        />
    );
}
