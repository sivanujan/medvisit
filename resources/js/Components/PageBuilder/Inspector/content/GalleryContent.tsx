import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { galleryImageHtml } from '../../lib/moreWidgets';
import { SelectField } from './fields';
import { getAttr } from './componentOps';
import type { ContentPanelProps } from './types';

export default function GalleryContent({ component, setIsDirty, onOpenMedia }: ContentPanelProps) {
    const images = (): any[] => component.find?.('[data-mv-gallery-item]') ?? [];
    const read = () => images().map((img) => getAttr(img, 'src'));
    const [srcs, setSrcs] = useState<string[]>(read);
    const columnsNow = String(component.getStyle?.()?.['grid-template-columns'] || '').match(/repeat\((\d)/)?.[1] ?? '3';
    const [columns, setColumns] = useState(columnsNow);

    const swap = (a: number, b: number) => {
        const list = images();
        if (!list[a] || !list[b]) return;
        const srcA = getAttr(list[a], 'src');
        list[a].addAttributes({ src: getAttr(list[b], 'src') });
        list[b].addAttributes({ src: srcA });
        setSrcs(read());
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <SelectField
                label="Columns"
                value={columns}
                options={['2', '3', '4'].map((c) => ({ value: c, label: `${c} columns` }))}
                onChange={(v) => {
                    setColumns(v);
                    component.addStyle({ 'grid-template-columns': `repeat(${v}, 1fr)` }, { mediaText: '' });
                    setIsDirty(true);
                }}
            />
            <div className="grid grid-cols-3 gap-1.5">
                {srcs.map((src, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
                        <img src={src} alt="" className="w-full h-16 object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-slate-950/80 opacity-0 group-hover:opacity-100">
                            <button type="button" onClick={() => swap(i, i - 1)} disabled={i === 0} className="p-0.5 text-slate-200 disabled:opacity-30" aria-label="Move left"><ArrowLeft className="w-3 h-3" /></button>
                            <button type="button" onClick={() => { images()[i]?.remove(); setSrcs(read()); setIsDirty(true); }} disabled={srcs.length === 1} className="p-0.5 text-rose-300 disabled:opacity-30" aria-label="Remove"><Trash2 className="w-3 h-3" /></button>
                            <button type="button" onClick={() => swap(i, i + 1)} disabled={i === srcs.length - 1} className="p-0.5 text-slate-200 disabled:opacity-30" aria-label="Move right"><ArrowRight className="w-3 h-3" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={() =>
                    onOpenMedia('', (url) => {
                        // A clone keeps the existing images' look (radius, ratio); fall back to fresh markup.
                        const last = images().at(-1);
                        if (last) {
                            const added = component.append(last.clone());
                            (Array.isArray(added) ? added[0] : added).addAttributes({ src: url });
                        } else {
                            component.append(galleryImageHtml(url));
                        }
                        setSrcs(read());
                        setIsDirty(true);
                    })
                }
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl border border-dashed border-teal-500/40 text-teal-300 hover:bg-teal-500/10 px-2.5 py-1.5"
            >
                <Plus className="w-3.5 h-3.5" />
                Add image
            </button>
        </div>
    );
}
