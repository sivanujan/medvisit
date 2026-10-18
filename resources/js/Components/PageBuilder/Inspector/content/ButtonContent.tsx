import React, { useState } from 'react';
import { buttonSizePreset, escapeHtml, type ButtonSize } from '../../lib/contentHelpers';
import { SelectField, TextField, ToggleField } from './fields';
import { getAttr, plainText, setLinkAttributes } from './componentOps';
import type { ContentPanelProps } from './types';

const SIZES: { value: ButtonSize; label: string }[] = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'Extra large' },
];

export default function ButtonContent({ editor, component, setIsDirty }: ContentPanelProps) {
    const isLink = String(component.get('tagName')).toLowerCase() === 'a';
    const [text, setText] = useState(() => plainText(component));
    const [href, setHref] = useState(() => getAttr(component, 'href'));
    const [newTab, setNewTab] = useState(() => getAttr(component, 'target') === '_blank');
    const [size, setSize] = useState<ButtonSize | ''>('');
    const [fullWidth, setFullWidth] = useState(false);

    // Size and width are styles: write them on the selected target so the active device applies.
    const writeStyle = (style: Record<string, string>) => {
        editor.StyleManager?.addStyleTargets?.(style);
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <TextField
                label="Text"
                value={text}
                onChange={(v) => {
                    setText(v);
                    component.components(escapeHtml(v));
                    setIsDirty(true);
                }}
            />
            {isLink && (
                <>
                    <TextField
                        label="Link"
                        value={href}
                        placeholder="/book or https://…"
                        onChange={(v) => {
                            setHref(v);
                            setLinkAttributes(component, v, newTab);
                            setIsDirty(true);
                        }}
                    />
                    <ToggleField
                        label="Open in new tab"
                        checked={newTab}
                        onChange={(v) => {
                            setNewTab(v);
                            setLinkAttributes(component, href, v);
                            setIsDirty(true);
                        }}
                    />
                </>
            )}
            <SelectField
                label="Size"
                value={size}
                options={[{ value: '', label: 'Keep current' }, ...SIZES]}
                onChange={(v) => {
                    setSize(v as ButtonSize | '');
                    if (v) writeStyle(buttonSizePreset(v as ButtonSize));
                }}
            />
            <ToggleField
                label="Full width"
                checked={fullWidth}
                onChange={(v) => {
                    setFullWidth(v);
                    writeStyle(
                        v
                            ? { display: 'block', width: '100%', 'text-align': 'center' }
                            : { display: '', width: '', 'text-align': '' },
                    );
                }}
            />
        </div>
    );
}
