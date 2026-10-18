import type { WidgetKind } from './widgetKinds.ts';

// Element handles shown above the selected canvas element, plus editor-only canvas styling.
export type ToolbarSpec = { command: string; title: string; icon: string; draggable?: boolean };

const MOVE: ToolbarSpec = { command: 'tlb-move', title: 'Drag to move', icon: '✥', draggable: true };
const DUPLICATE: ToolbarSpec = { command: 'tlb-clone', title: 'Duplicate', icon: '⧉' };
const DELETE: ToolbarSpec = { command: 'tlb-delete', title: 'Delete', icon: '🗑' };

export function toolbarFor(kind: WidgetKind): ToolbarSpec[] {
    if (kind === 'container') {
        return [
            { command: 'core:component-exit', title: 'Select parent', icon: '⬆' },
            MOVE,
            DUPLICATE,
            { command: 'mv:add-inside', title: 'Add widget inside', icon: '＋' },
            DELETE,
        ];
    }
    return [{ command: 'mv:edit', title: 'Edit content', icon: '✎' }, MOVE, DUPLICATE, DELETE];
}

const TEAL = '#14b8a6';

// Injected into the canvas iframe only (never exported with the page).
export function editorCanvasCss(): string {
    const emptyAreas = [
        '[data-mv-widget="container"]:empty',
        'section:empty',
        '.medvisit-container > div:empty',
        '[class*="medvisit-grid"] > div:empty',
    ].join(',');
    return [
        `.gjs-selected{outline:2px solid ${TEAL} !important;outline-offset:-2px !important;}`,
        `.gjs-selected-parent{outline:1px dashed rgba(20,184,166,0.6) !important;outline-offset:-1px !important;}`,
        `${emptyAreas}{min-height:80px;outline:1px dashed #94a3b8;outline-offset:-4px;}`,
        `${emptyAreas.split(',').map((s) => `${s}::before`).join(',')}{content:'Drag widget here';display:flex;align-items:center;justify-content:center;min-height:80px;color:#94a3b8;font:600 12px/1 ui-sans-serif,system-ui,sans-serif;}`,
    ].join('\n');
}

// Injected into the builder page for GrapesJS's own overlay (hover outline, name badge, handles).
export function editorChromeCss(): string {
    return [
        `.gjs-highlighter{outline:1px dashed ${TEAL} !important;outline-offset:-1px;}`,
        `.gjs-badge{background:${TEAL} !important;color:#ffffff !important;border-radius:4px !important;padding:2px 6px !important;font:600 10px/1.4 ui-sans-serif,system-ui,sans-serif !important;}`,
        `.gjs-toolbar{background:#0f766e !important;border-radius:6px !important;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.25);}`,
        `.gjs-toolbar-item{width:26px !important;height:24px !important;display:inline-flex !important;align-items:center;justify-content:center;font-size:13px !important;color:#ffffff !important;cursor:pointer;}`,
        `.gjs-toolbar-item:hover{background:${TEAL};}`,
        `.gjs-placeholder{border-color:${TEAL} !important;}`,
        `.gjs-placeholder-int{background-color:${TEAL} !important;}`,
    ].join('\n');
}
