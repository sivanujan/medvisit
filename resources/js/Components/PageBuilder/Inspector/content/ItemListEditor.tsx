import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

// Add / remove / reorder rows; each row renders its own fields. Every action is reported
// separately so panels can edit the existing elements in place (keeping their styles).
export default function ItemListEditor<T>({
    items,
    renderItem,
    onUpdate,
    onAdd,
    onRemove,
    onMove,
    addLabel,
}: {
    items: T[];
    renderItem: (item: T, update: (item: T) => void) => React.ReactNode;
    onUpdate: (index: number, item: T) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onMove: (from: number, to: number) => void;
    addLabel: string;
}) {
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-2 space-y-2">
                    {renderItem(item, (updated) => onUpdate(i, updated))}
                    <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => onMove(i, i - 1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move up">
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => onMove(i, i + 1)} disabled={i === items.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move down">
                            <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => onRemove(i)} disabled={items.length === 1} className="p-1 text-rose-300 hover:text-rose-200 disabled:opacity-30" aria-label="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={onAdd}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl border border-dashed border-teal-500/40 text-teal-300 hover:bg-teal-500/10 px-2.5 py-1.5"
            >
                <Plus className="w-3.5 h-3.5" />
                {addLabel}
            </button>
        </div>
    );
}
