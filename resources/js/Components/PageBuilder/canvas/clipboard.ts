import { pickStyleForClipboard, type StyleRule } from '../lib/canvasHelpers';
import type { Component, Editor } from '../types';

// Copy / paste for elements (reuses GrapesJS's own clipboard) and for styles (all devices + states).

let styleClipboard: StyleRule[] | null = null;

export function componentFromElement(el: Element | null): Component | null {
    for (let node: any = el; node; node = node.parentNode) {
        const model = node.__gjsv?.model;
        if (model) return model;
    }
    return null;
}

export function hasComponentClip(editor: Editor): boolean {
    return (editor?.getModel?.().get('clipboard') || []).length > 0;
}

export function hasStyleClip(): boolean {
    return !!styleClipboard && styleClipboard.length > 0;
}

export function copyComponent(editor: Editor): void {
    editor.runCommand('core:copy');
}

export function pasteComponent(editor: Editor, mode: 'after' | 'inside'): void {
    if (mode === 'after') {
        editor.runCommand('core:paste');
        return;
    }
    const target = editor.getSelected();
    const clip: Component[] = editor.getModel().get('clipboard') || [];
    if (!target || !clip.length) return;
    const added = clip.map((c) => target.append(c.clone())[0]).filter(Boolean);
    if (added[0]) editor.select(added[0]);
}

function idRules(editor: Editor, component: Component): any[] {
    const name = `#${component.getId()}`;
    return editor.Css.getAll().filter((rule: any) => {
        const selectors = rule.get('selectors');
        return selectors?.length === 1 && selectors.at(0).getFullName?.() === name;
    });
}

export function copyStyle(editor: Editor): void {
    const target = editor.getSelected();
    if (!target) return;
    styleClipboard = pickStyleForClipboard(
        idRules(editor, target).map((rule: any) => ({
            media: rule.get('mediaText') || '',
            state: rule.get('state') || '',
            style: { ...(rule.getStyle?.() || {}) },
        })),
    );
}

export function pasteStyle(editor: Editor): void {
    const target = editor.getSelected();
    if (!target || !styleClipboard) return;
    const id = target.getId();
    for (const rule of styleClipboard) {
        const selector = `#${id}${rule.state ? `:${rule.state}` : ''}`;
        editor.Css.setRule(selector, rule.style, rule.media ? { atRuleType: 'media', atRuleParams: rule.media } : {});
    }
    editor.trigger('component:styleUpdate', target);
}

export function resetStyle(editor: Editor): void {
    const target = editor.getSelected();
    if (!target) return;
    editor.Css.remove(idRules(editor, target));
    editor.trigger('component:styleUpdate', target);
}
