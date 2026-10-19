import React, { useState } from 'react';
import ItemListEditor from './ItemListEditor';
import { childElements, plainText, setOwnText } from './componentOps';
import type { ContentPanelProps } from './types';

// Row text without the leading icon element's text.
function rowText(li: any): string {
    const icon = childElements(li)[0];
    return plainText(li).replace(icon ? plainText(icon) : '', '').trim();
}

export default function IconListContent({ component, setIsDirty }: ContentPanelProps) {
    const rows = () => childElements(component);
    const [items, setItems] = useState<string[]>(() => rows().map(rowText));
    const refresh = () => {
        setItems(rows().map(rowText));
        setIsDirty(true);
    };

    return (
        <ItemListEditor
            items={items}
            addLabel="Add item"
            onUpdate={(i, text) => {
                setOwnText(rows()[i], ` ${text}`);
                setItems((prev) => prev.map((t, j) => (j === i ? text : t)));
                setIsDirty(true);
            }}
            onAdd={() => {
                const list = rows();
                const template = list[list.length - 1];
                if (!template) return;
                // Clone keeps the row's styles (GrapesJS copies the #id rules to the clone).
                const added = component.append(template.clone());
                setOwnText(Array.isArray(added) ? added[0] : added, ' New item');
                refresh();
            }}
            onRemove={(i) => {
                rows()[i]?.remove();
                refresh();
            }}
            onMove={(from, to) => {
                // Reorder by swapping row text: rows share the same look, and no element is removed.
                const next = [...items];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                rows().forEach((li: any, i: number) => setOwnText(li, ` ${next[i]}`));
                setItems(next);
                setIsDirty(true);
            }}
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
