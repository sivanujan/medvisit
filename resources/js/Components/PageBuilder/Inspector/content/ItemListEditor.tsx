import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

// Add / remove / reorder rows; each row renders its own fields.
export default function ItemListEditor<T>({
    items,
    onChange,
    renderItem,
    makeItem,
    addLabel,
}: {
    items: T[];
    onChange: (items: T[]) => void;
    renderItem: (item: T, update: (item: T) => void) => React.ReactNode;
    makeItem: () => T;
    addLabel: string;
}) {
    const move = (from: number, to: number) => {
        if (to < 0 || to >= items.length) return;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChange(next);
    };
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-2 space-y-2">
                    {renderItem(item, (updated) => onChange(items.map((it, j) => (j === i ? updated : it))))}
                    <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move up">
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move down">
                            <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} disabled={items.length === 1} className="p-1 text-rose-300 hover:text-rose-200 disabled:opacity-30" aria-label="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange([...items, makeItem()])}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl border border-dashed border-teal-500/40 text-teal-300 hover:bg-teal-500/10 px-2.5 py-1.5"
            >
                <Plus className="w-3.5 h-3.5" />
                {addLabel}
            </button>
        </div>
    );
}
