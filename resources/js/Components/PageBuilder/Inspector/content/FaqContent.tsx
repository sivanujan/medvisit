import React, { useState } from 'react';
import { escapeHtml } from '../../lib/contentHelpers';
import ItemListEditor from './ItemListEditor';
import { childElements, findChild, plainText } from './componentOps';
import type { ContentPanelProps } from './types';

type FaqItem = { question: string; answer: string };

function attrString(comp: any): string {
    const attrs = comp?.getAttributes?.() || {};
    return Object.entries(attrs)
        .filter(([k]) => k !== 'id' && k !== 'open')
        .map(([k, v]) => ` ${k}="${escapeHtml(String(v))}"`)
        .join('');
}

export default function FaqContent({ component, setIsDirty }: ContentPanelProps) {
    // The FAQ list is the element holding the <details> rows (a single <details> edits its parent list).
    const isDetails = String(component.get('tagName')).toLowerCase() === 'details';
    const list = isDetails ? component.parent() : component;
    const rows = childElements(list).filter((c: any) => String(c.get('tagName')).toLowerCase() === 'details');
    const first = rows[0];
    const detailsAttrs = attrString(first);
    const summaryAttrs = attrString(first ? findChild(first, 'summary') : null);
    const answerAttrs = attrString(first ? findChild(first, 'p') : null);

    const [items, setItems] = useState<FaqItem[]>(() =>
        rows.length
            ? rows.map((d: any) => ({
                  question: plainText(findChild(d, 'summary')),
                  answer: plainText(findChild(d, 'p')),
              }))
            : [{ question: 'Question', answer: 'Answer' }],
    );

    const apply = (next: FaqItem[]) => {
        setItems(next);
        list.components(
            next
                .map(
                    (it) =>
                        `<details${detailsAttrs}><summary${summaryAttrs}>${escapeHtml(it.question)}</summary><p${answerAttrs}>${escapeHtml(it.answer)}</p></details>`,
                )
                .join(''),
        );
        setIsDirty(true);
    };

    const inputClass = 'w-full text-xs rounded-lg bg-slate-900 border border-white/10 text-white px-2 py-1';
    return (
        <ItemListEditor
            items={items}
            onChange={apply}
            makeItem={() => ({ question: 'New question', answer: 'Answer' })}
            addLabel="Add question"
            renderItem={(item, update) => (
                <>
                    <input type="text" value={item.question} placeholder="Question" onChange={(e) => update({ ...item, question: e.target.value })} className={inputClass} />
                    <textarea rows={2} value={item.answer} placeholder="Answer" onChange={(e) => update({ ...item, answer: e.target.value })} className={inputClass} />
                </>
            )}
        />
    );
}
