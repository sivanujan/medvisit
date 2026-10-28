import React, { useState } from 'react';
import { retagPlan } from '../../lib/contentHelpers';
import { SelectField, TextField, ToggleField } from './fields';
import { findChild, getAttr, plainText, retag, setTextWithLink } from './componentOps';
import type { ContentPanelProps } from './types';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'];

export default function HeadingContent({ editor, component, setIsDirty }: ContentPanelProps) {
    const link = findChild(component, 'a');
    const [text, setText] = useState(() => plainText(component));
    const [href, setHref] = useState(() => (link ? getAttr(link, 'href') : ''));
    const [newTab, setNewTab] = useState(() => (link ? getAttr(link, 'target') === '_blank' : false));
    const tag = String(component.get('tagName') || 'h2').toLowerCase();

    const apply = (nextText: string, nextHref: string, nextNewTab: boolean) => {
        setTextWithLink(component, nextText, nextHref, nextNewTab);
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <TextField
                label="Title"
                value={text}
                multiline
                onChange={(v) => {
                    setText(v);
                    apply(v, href, newTab);
                }}
            />
            <SelectField
                label="HTML tag"
                value={tag}
                options={HEADING_TAGS.map((t) => ({ value: t, label: t.toUpperCase() }))}
                onChange={(v) => {
                    const next = retagPlan(v, HEADING_TAGS);
                    if (next && next !== tag) {
                        retag(editor, component, next);
                        setIsDirty(true);
                    }
                }}
            />
            <TextField
                label="Link"
                value={href}
                placeholder="/p/about-us or https://…"
                onChange={(v) => {
                    setHref(v);
                    apply(text, v, newTab);
                }}
            />
            {href.trim() !== '' && (
                <ToggleField
                    label="Open in new tab"
                    checked={newTab}
                    onChange={(v) => {
                        setNewTab(v);
                        apply(text, href, v);
                    }}
                />
            )}
        </div>
    );
}
