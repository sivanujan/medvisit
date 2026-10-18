import React, { useState } from 'react';
import { escapeHtml } from '../../lib/contentHelpers';
import ItemListEditor from './ItemListEditor';
import { childElements, plainText } from './componentOps';
import type { ContentPanelProps } from './types';

function attrString(attrs: Record<string, unknown>): string {
    return Object.entries(attrs || {})
        .filter(([k]) => k !== 'id')
        .map(([k, v]) => ` ${k}="${escapeHtml(String(v))}"`)
        .join('');
}

export default function IconListContent({ component, setIsDirty }: ContentPanelProps) {
    const rows = childElements(component);
    // Reuse the first row's look (attributes + leading icon) for every row.
    const first = rows[0];
    const liAttrs = first ? attrString(first.getAttributes?.() || {}) : '';
    const iconChild = first ? childElements(first)[0] : null;
    const iconHtml = iconChild ? iconChild.toHTML() : '';
    const iconText = iconChild ? plainText(iconChild) : '';

    const [items, setItems] = useState<string[]>(() =>
        rows.length ? rows.map((li: any) => plainText(li).replace(iconText, '').trim()) : ['List item'],
    );

    const apply = (next: string[]) => {
        setItems(next);
        component.components(next.map((text) => `<li${liAttrs}>${iconHtml} ${escapeHtml(text)}</li>`).join(''));
        setIsDirty(true);
    };

    return (
        <ItemListEditor
            items={items}
            onChange={apply}
            makeItem={() => 'New item'}
            addLabel="Add item"
            renderItem={(text, update) => (
                <input
                    type="text"
                    value={text}
                    onChange={(e) => update(e.target.value)}
                    className="w-full text-xs rounded-lg bg-slate-900 border border-white/10 text-white px-2 py-1"
                />
            )}
        />
    );
}
