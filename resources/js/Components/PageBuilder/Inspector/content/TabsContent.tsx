import React, { useState } from 'react';
import ItemListEditor from './ItemListEditor';
import { SelectField } from './fields';
import { plainText, setOwnText } from './componentOps';
import type { ContentPanelProps } from './types';

type Tab = { title: string; body: string };

export default function TabsContent({ component, setIsDirty }: ContentPanelProps) {
    const buttons = (): any[] => component.find?.('[data-mv-tab-button]') ?? [];
    const panels = (): any[] => component.find?.('[data-mv-tab-panel]') ?? [];
    // Tab text lives in the panel's first paragraph when there is one, otherwise in the panel itself.
    const bodyOf = (panel: any) => panel?.find?.('p')?.[0] ?? panel;
    const read = (): Tab[] => buttons().map((b, i) => ({ title: plainText(b), body: plainText(bodyOf(panels()[i])) }));

    const [items, setItems] = useState<Tab[]>(read);
    const [shown, setShown] = useState(0);

    const showInEditor = (index: number) => {
        setShown(index);
        panels().forEach((p, i) => p.addStyle({ display: i === index ? 'block' : 'none' }, { mediaText: '' }));
    };
    const renumber = () => {
        buttons().forEach((b, i) => b.addAttributes({ 'data-mv-tab-button': String(i) }));
        panels().forEach((p, i) => p.addAttributes({ 'data-mv-tab-panel': String(i) }));
    };

    const inputClass = 'w-full text-xs rounded-lg bg-slate-900 border border-white/10 text-white px-2 py-1';
    return (
        <div className="space-y-3">
            <SelectField
                label="Show in editor"
                value={String(shown)}
                options={items.map((t, i) => ({ value: String(i), label: t.title || `Tab ${i + 1}` }))}
                onChange={(v) => showInEditor(Number(v))}
            />
            <ItemListEditor
                items={items}
                addLabel="Add tab"
                onUpdate={(i, tab) => {
                    setOwnText(buttons()[i], tab.title);
                    setOwnText(bodyOf(panels()[i]), tab.body);
                    setItems((prev) => prev.map((t, j) => (j === i ? tab : t)));
                    setIsDirty(true);
                }}
                onAdd={() => {
                    const lastButton = buttons().at(-1);
                    const lastPanel = panels().at(-1);
                    if (!lastButton || !lastPanel) return;
                    const b = lastButton.parent().append(lastButton.clone(), { at: lastButton.index() + 1 });
                    const p = lastPanel.parent().append(lastPanel.clone(), { at: lastPanel.index() + 1 });
                    setOwnText(Array.isArray(b) ? b[0] : b, 'New tab');
                    setOwnText(bodyOf(Array.isArray(p) ? p[0] : p), 'Tab content');
                    renumber();
                    setItems(read());
                    setIsDirty(true);
                }}
                onRemove={(i) => {
                    buttons()[i]?.remove();
                    panels()[i]?.remove();
                    renumber();
                    setItems(read());
                    if (shown >= i && shown > 0) showInEditor(shown - 1);
                    setIsDirty(true);
                }}
                onMove={(from, to) => {
                    const next = [...items];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    buttons().forEach((b, i) => setOwnText(b, next[i].title));
                    panels().forEach((p, i) => setOwnText(bodyOf(p), next[i].body));
                    setItems(next);
                    setIsDirty(true);
                }}
                renderItem={(tab, update) => (
                    <>
                        <input type="text" value={tab.title} placeholder="Tab title" onChange={(e) => update({ ...tab, title: e.target.value })} className={inputClass} />
                        <textarea rows={2} value={tab.body} placeholder="Tab content" onChange={(e) => update({ ...tab, body: e.target.value })} className={inputClass} />
                    </>
                )}
            />
            <p className="text-[10px] text-slate-500">On your live site, visitors click the tab titles to switch.</p>
        </div>
    );
}
