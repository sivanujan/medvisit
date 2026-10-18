import React, { useState } from 'react';
import { escapeHtml } from '../../lib/contentHelpers';
import { Note, TextField } from './fields';
import { getAttr, plainText, setLinkAttributes } from './componentOps';
import type { ContentPanelProps } from './types';

export default function BookTokenContent({ component, setIsDirty }: ContentPanelProps) {
    const heading = component.find?.('h2')?.[0] ?? null;
    const button = component.find?.('a')?.[0] ?? null;
    const [title, setTitle] = useState(() => (heading ? plainText(heading) : ''));
    const [buttonText, setButtonText] = useState(() => (button ? plainText(button) : ''));
    const [href, setHref] = useState(() => (button ? getAttr(button, 'href') || '/book' : '/book'));

    if (!heading && !button) return <Note>This box has no heading or button to edit.</Note>;

    return (
        <div className="space-y-3">
            {heading && (
                <TextField
                    label="Heading"
                    value={title}
                    onChange={(v) => {
                        setTitle(v);
                        heading.components(escapeHtml(v));
                        setIsDirty(true);
                    }}
                />
            )}
            {button && (
                <>
                    <TextField
                        label="Button text"
                        value={buttonText}
                        onChange={(v) => {
                            setButtonText(v);
                            button.components(escapeHtml(v));
                            setIsDirty(true);
                        }}
                    />
                    <TextField
                        label="Button link"
                        value={href}
                        placeholder="/book"
                        onChange={(v) => {
                            setHref(v);
                            setLinkAttributes(button, v, false);
                            setIsDirty(true);
                        }}
                    />
                </>
            )}
        </div>
    );
}
