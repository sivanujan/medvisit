import React, { useState } from 'react';
import ItemListEditor from './ItemListEditor';
import { plainText, setOwnText } from './componentOps';
import type { ContentPanelProps } from './types';

// Panel for widgets made of repeated rows (Price List, Opening Hours): each row holds
// [data-mv-field] parts. Rows are edited in place, added by cloning, and reordered by text swap.
type RowField = { key: string; label: string; multiline?: boolean };

export function makeRowListPanel(rowSelector: string, fields: RowField[], addLabel: string, newRow: Record<string, string>) {
    return function RowListPanel({ component, setIsDirty }: ContentPanelProps) {
        const rows = (): any[] => component.find?.(rowSelector) ?? [];
        const partOf = (row: any, key: string) => row?.find?.(`[data-mv-field="${key}"]`)?.[0] ?? null;
        const read = () => rows().map((row) => Object.fromEntries(fields.map((f) => [f.key, plainText(partOf(row, f.key))])));
        const write = (row: any, item: Record<string, string>) => fields.forEach((f) => setOwnText(partOf(row, f.key), item[f.key] ?? ''));

        const [items, setItems] = useState<Record<string, string>[]>(read);
        const inputClass = 'w-full text-xs rounded-lg bg-slate-900 border border-white/10 text-white px-2 py-1';

        return (
            <ItemListEditor
                items={items}
                addLabel={addLabel}
                onUpdate={(i, item) => {
                    write(rows()[i], item);
                    setItems((prev) => prev.map((it, j) => (j === i ? item : it)));
                    setIsDirty(true);
                }}
                onAdd={() => {
                    const all = rows();
                    const template = all[all.length - 1];
                    if (!template) return;
                    const added = template.parent().append(template.clone(), { at: template.index() + 1 });
                    write(Array.isArray(added) ? added[0] : added, newRow);
                    setItems(read());
                    setIsDirty(true);
                }}
                onRemove={(i) => {
                    rows()[i]?.remove();
                    setItems(read());
                    setIsDirty(true);
                }}
                onMove={(from, to) => {
                    const next = [...items];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    rows().forEach((row, i) => write(row, next[i]));
                    setItems(next);
                    setIsDirty(true);
                }}
                renderItem={(item, update) => (
                    <>
                        {fields.map((f) =>
                            f.multiline ? (
                                <textarea key={f.key} rows={2} value={item[f.key] ?? ''} placeholder={f.label} onChange={(e) => update({ ...item, [f.key]: e.target.value })} className={inputClass} />
                            ) : (
                                <input key={f.key} type="text" value={item[f.key] ?? ''} placeholder={f.label} onChange={(e) => update({ ...item, [f.key]: e.target.value })} className={inputClass} />
                            ),
                        )}
                    </>
                )}
            />
        );
    };
}

export const PriceListContent = makeRowListPanel(
    '[data-mv-price-item]',
    [
        { key: 'name', label: 'Service' },
        { key: 'price', label: 'Price (e.g. Rs. 1,500)' },
        { key: 'description', label: 'Description', multiline: true },
    ],
    'Add service',
    { name: 'New service', price: 'Rs. 0', description: '' },
);

export const OpeningHoursContent = makeRowListPanel(
    '[data-mv-hours-item]',
    [
        { key: 'day', label: 'Day(s)' },
        { key: 'time', label: 'Hours (e.g. 8:00 AM – 5:00 PM or Closed)' },
    ],
    'Add row',
    { day: 'Day', time: 'Closed' },
);
