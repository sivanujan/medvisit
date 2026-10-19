import { WIDGET_LABELS, type WidgetKind } from './widgetKinds.ts';

// Pure helpers for the canvas breadcrumbs, add-section picker and context menu.

export type Crumb = { id: string; label: string };
const MAX_CRUMBS = 6;

// Ancestor chain (root first) → clickable crumbs; long chains keep the nearest levels.
export function breadcrumbPath(chain: { id: string; kind: WidgetKind; customName?: string }[]): Crumb[] {
    const crumbs = chain.map((c) => ({ id: c.id, label: c.customName || WIDGET_LABELS[c.kind] }));
    if (crumbs.length <= MAX_CRUMBS) return crumbs;
    return [{ id: '', label: '…' }, ...crumbs.slice(crumbs.length - (MAX_CRUMBS - 1))];
}

export type LayoutPreset = '1' | '2' | '3' | '1-2' | '2-1';
const PRESET_WIDTHS: Record<LayoutPreset, string[]> = {
    '1': ['100%'],
    '2': ['50%', '50%'],
    '3': ['33.33%', '33.33%', '33.33%'],
    '1-2': ['33.33%', '66.67%'],
    '2-1': ['66.67%', '33.33%'],
};
export const LAYOUT_PRESETS = Object.keys(PRESET_WIDTHS) as LayoutPreset[];

// New section: boxed inner row whose columns wrap (stack) when the screen is too narrow.
export function layoutPresetHtml(preset: LayoutPreset): string {
    const gap = 24;
    const columns = PRESET_WIDTHS[preset]
        .map(
            (w) =>
                `<div data-mv-widget="container" style="flex: 1 1 calc(${w} - ${gap}px); min-width: 240px; min-height: 80px;"></div>`,
        )
        .join('');
    return `<section class="medvisit-section" data-mv-widget="container" style="padding: 60px 20px;"><div class="medvisit-container" data-mv-widget="container" style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: ${gap}px;">${columns}</div></section>`;
}

const MENU_MARGIN = 8;

// Context menu position at the cursor, kept fully inside the canvas area.
export function clampMenuPosition(x: number, y: number, w: number, h: number, viewW: number, viewH: number): { x: number; y: number } {
    return {
        x: Math.max(MENU_MARGIN, Math.min(x, viewW - w - MENU_MARGIN)),
        y: Math.max(MENU_MARGIN, Math.min(y, viewH - h - MENU_MARGIN)),
    };
}

export type StyleRule = { media: string; state: string; style: Record<string, string> };

// Copied style keeps every device (media) and state rule that has declarations.
export function pickStyleForClipboard(rules: StyleRule[]): StyleRule[] {
    return rules
        .filter((r) => Object.keys(r.style || {}).length > 0)
        .map((r) => ({ media: r.media || '', state: r.state || '', style: { ...r.style } }));
}

// Editing shortcuts must not fire while the user types in a field or edits text inline.
export function shouldHandleShortcut(target: { tagName: string; isContentEditable: boolean }): boolean {
    if (target.isContentEditable) return false;
    return !['INPUT', 'TEXTAREA', 'SELECT'].includes((target.tagName || '').toUpperCase());
}
