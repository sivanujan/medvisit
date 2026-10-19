import React, { useState } from 'react';
import ItemListEditor from './ItemListEditor';
import { childElements, findChild, plainText, setOwnText } from './componentOps';
import type { ContentPanelProps } from './types';

type FaqItem = { question: string; answer: string };

export default function FaqContent({ component, setIsDirty }: ContentPanelProps) {
    // The FAQ list is the element holding the <details> rows (a selected row edits its parent list).
    const isDetails = String(component.get('tagName')).toLowerCase() === 'details';
    const list = isDetails ? component.parent() : component;
    const rows = () => childElements(list).filter((c: any) => String(c.get('tagName')).toLowerCase() === 'details');
    const read = (): FaqItem[] =>
        rows().map((d: any) => ({ question: plainText(findChild(d, 'summary')), answer: plainText(findChild(d, 'p')) }));

    const [items, setItems] = useState<FaqItem[]>(read);
    const refresh = () => {
        setItems(read());
        setIsDirty(true);
    };

    const inputClass = 'w-full text-xs rounded-lg bg-slate-900 border border-white/10 text-white px-2 py-1';
    return (
        <ItemListEditor
            items={items}
            addLabel="Add question"
            onUpdate={(i, item) => {
                const row = rows()[i];
                if (!row) return;
                // Edit in place: the selected row is never removed, and its styles stay.
                setOwnText(findChild(row, 'summary'), item.question);
                setOwnText(findChild(row, 'p'), item.answer);
                setItems((prev) => prev.map((it, j) => (j === i ? item : it)));
                setIsDirty(true);
            }}
            onAdd={() => {
                const all = rows();
                const template = all[all.length - 1];
                if (!template) return;
                const added = list.append(template.clone());
                const row = Array.isArray(added) ? added[0] : added;
                setOwnText(findChild(row, 'summary'), 'New question');
                setOwnText(findChild(row, 'p'), 'Answer');
                refresh();
            }}
            onRemove={(i) => {
                rows()[i]?.remove();
                refresh();
            }}
            onMove={(from, to) => {
                // Reorder by swapping question/answer text: rows share the same look, and no element is removed.
                const next = [...items];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                rows().forEach((row: any, i: number) => {
                    setOwnText(findChild(row, 'summary'), next[i].question);
                    setOwnText(findChild(row, 'p'), next[i].answer);
                });
                setItems(next);
                setIsDirty(true);
            }}
            renderItem={(item, update) => (
                <>
                    <input type="text" value={item.question} placeholder="Question" onChange={(e) => update({ ...item, question: e.target.value })} className={inputClass} />
                    <textarea rows={2} value={item.answer} placeholder="Answer" onChange={(e) => update({ ...item, answer: e.target.value })} className={inputClass} />
                </>
            )}
        />
    );
}
