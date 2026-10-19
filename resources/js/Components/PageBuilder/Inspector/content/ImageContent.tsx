import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { FieldLabel, TextField, ToggleField } from './fields';
import { getAttr, setWrappingLink } from './componentOps';
import type { ContentPanelProps } from './types';

export default function ImageContent({ editor, component, setIsDirty, onOpenMedia }: ContentPanelProps) {
    const parent = component.parent?.();
    const parentLink = parent && String(parent.get('tagName')).toLowerCase() === 'a' ? parent : null;
    const [src, setSrc] = useState(() => getAttr(component, 'src'));
    const [alt, setAlt] = useState(() => getAttr(component, 'alt'));
    const [href, setHref] = useState(() => (parentLink ? getAttr(parentLink, 'href') : ''));
    const [newTab, setNewTab] = useState(() => (parentLink ? getAttr(parentLink, 'target') === '_blank' : false));

    const setImage = (url: string) => {
        setSrc(url);
        component.addAttributes({ src: url });
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <div>
                <FieldLabel>Image</FieldLabel>
                {src && <img src={src} alt="" className="w-full h-28 object-cover rounded-xl border border-white/10 mb-2" />}
                <button
                    type="button"
                    onClick={() => onOpenMedia(src, setImage)}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1.5"
                >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Choose image
                </button>
            </div>
            <TextField
                label="Alt text"
                value={alt}
                placeholder="Describe the image for screen readers"
                onChange={(v) => {
                    setAlt(v);
                    component.addAttributes({ alt: v });
                    setIsDirty(true);
                }}
            />
            <TextField
                label="Link"
                value={href}
                placeholder="Optional: /p/services or https://…"
                onChange={(v) => {
                    setHref(v);
                    setWrappingLink(editor, component, v, newTab);
                    setIsDirty(true);
                }}
            />
            {href.trim() !== '' && (
                <ToggleField
                    label="Open in new tab"
                    checked={newTab}
                    onChange={(v) => {
                        setNewTab(v);
                        setWrappingLink(editor, component, href, v);
                        setIsDirty(true);
                    }}
                />
            )}
        </div>
    );
}
