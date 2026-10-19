import type { Editor } from '../types';
import { MORE_WIDGETS, moreWidgetHtml } from '../lib/moreWidgets';

// Batch A widgets in their own library category (same card style as the core widgets).
export function registerMoreBlocks(editor: Editor): void {
    const category = { id: 'more-widgets', label: 'More Widgets', open: true };
    for (const widget of MORE_WIDGETS) {
        editor.BlockManager.add(`widget-${widget.kind}`, {
            label: `<div style="font-size: 20px; margin-bottom: 4px;">${widget.emoji}</div><b>${widget.label}</b><div style="font-size: 10px; color: #64748b;">${widget.hint}</div>`,
            category,
            content: moreWidgetHtml(widget.kind),
        });
    }
}
