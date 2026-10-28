import React, { useState } from 'react';
import { escapeHtml } from '../../lib/contentHelpers';
import { SelectField, TextField } from './fields';
import { getAttr, plainText, setLinkAttributes } from './componentOps';
import type { ContentPanelProps } from './types';

type Tone = 'info' | 'warning' | 'success';
const TONES: Record<Tone, { background: string; border: string; text: string }> = {
    info: { background: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    warning: { background: '#fffbeb', border: '#fde68a', text: '#92400e' },
    success: { background: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
};

export default function AnnouncementContent({ component, setIsDirty }: ContentPanelProps) {
    const title = component.find?.('strong')?.[0] ?? null;
    const message = title?.parent?.()?.find?.('span')?.[0] ?? component.find?.('span')?.[1] ?? null;
    const link = component.find?.('a')?.[0] ?? null;
    const [titleText, setTitleText] = useState(() => (title ? plainText(title) : ''));
    const [messageText, setMessageText] = useState(() => (message ? plainText(message) : ''));
    const [href, setHref] = useState(() => (link ? getAttr(link, 'href') : ''));
    const [tone, setTone] = useState<Tone>(() => {
        const bg = String(component.getStyle?.()?.background || component.getStyle?.()?.['background-color'] || '').toLowerCase();
        return (Object.keys(TONES) as Tone[]).find((t) => TONES[t].background === bg) ?? 'warning';
    });

    const applyTone = (next: Tone) => {
        setTone(next);
        const c = TONES[next];
        component.addStyle({ background: c.background, border: `1px solid ${c.border}` });
        title?.addStyle({ color: c.text });
        message?.addStyle({ color: c.text });
        link?.addStyle({ background: c.text });
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            {title && (
                <TextField
                    label="Title"
                    value={titleText}
                    onChange={(v) => {
                        setTitleText(v);
                        title.components(escapeHtml(v));
                        setIsDirty(true);
                    }}
                />
            )}
            {message && (
                <TextField
                    label="Message"
                    value={messageText}
                    multiline
                    onChange={(v) => {
                        setMessageText(v);
                        message.components(escapeHtml(v));
                        setIsDirty(true);
                    }}
                />
            )}
            {link && (
                <TextField
                    label="Button link"
                    value={href}
                    placeholder="/book"
                    onChange={(v) => {
                        setHref(v);
                        setLinkAttributes(link, v, false);
                        setIsDirty(true);
                    }}
                />
            )}
            <SelectField
                label="Tone"
                value={tone}
                options={[
                    { value: 'info', label: 'Info (blue)' },
                    { value: 'warning', label: 'Warning (amber)' },
                    { value: 'success', label: 'Success (green)' },
                ]}
                onChange={(v) => applyTone(v as Tone)}
            />
        </div>
    );
}
