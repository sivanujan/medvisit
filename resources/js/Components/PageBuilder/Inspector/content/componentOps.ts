import { escapeHtml, linkAttributes } from '../../lib/contentHelpers';

// GrapesJS edits shared by the Content panels. All changes go through the component API so
// undo/redo and dirty tracking keep working.

export function childElements(comp: any): any[] {
    if (!comp || typeof comp.components !== 'function') return [];
    return comp.components().filter((c: any) => c.get('type') !== 'textnode');
}

export function plainText(comp: any): string {
    return String(comp?.view?.el?.textContent ?? '').trim();
}

export function findChild(comp: any, tagName: string): any | null {
    return childElements(comp).find((c: any) => String(c.get('tagName')).toLowerCase() === tagName) ?? null;
}

export function getAttr(comp: any, name: string): string {
    const attrs = typeof comp?.getAttributes === 'function' ? comp.getAttributes() : {};
    return attrs?.[name] != null ? String(attrs[name]) : '';
}

// Replace the component's content with plain text, optionally wrapped in a link.
export function setTextWithLink(comp: any, text: string, href: string, newTab: boolean): void {
    const safeText = escapeHtml(text);
    if (!href.trim()) {
        comp.components(safeText);
        return;
    }
    const attrs = linkAttributes(href, newTab);
    const attrString = Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
        .join('');
    comp.components(`<a${attrString}>${safeText}</a>`);
}

// Swap the element's tag while keeping id, attributes, classes, children and its ID-rule styles.
export function retag(editor: any, comp: any, tagName: string): any {
    const id = comp.getId?.();
    const json = comp.toJSON();
    json.tagName = tagName;
    json.attributes = { ...(json.attributes || {}), ...(id ? { id } : {}) };
    const replaced = comp.replaceWith(json);
    const next = Array.isArray(replaced) ? replaced[0] : replaced;
    if (next) editor.select(next);
    return next;
}

export function setLinkAttributes(comp: any, href: string, newTab: boolean): void {
    comp.removeAttributes?.(['target', 'rel']);
    comp.addAttributes(linkAttributes(href, newTab));
}

// Wrap an element (e.g. an image) in a link, or update/remove the link around it.
export function setWrappingLink(editor: any, comp: any, href: string, newTab: boolean): void {
    const parent = comp.parent?.();
    const parentIsLink = parent && String(parent.get('tagName')).toLowerCase() === 'a';
    if (!href.trim()) {
        if (parentIsLink) {
            const [restored] = parent.replaceWith(comp.toJSON());
            if (restored) editor.select(restored);
        }
        return;
    }
    if (parentIsLink) {
        setLinkAttributes(parent, href, newTab);
        return;
    }
    const replaced = comp.replaceWith({ tagName: 'a', attributes: linkAttributes(href, newTab), components: [comp.toJSON()] });
    const link = Array.isArray(replaced) ? replaced[0] : replaced;
    const inner = link?.components?.().at?.(0);
    if (inner) editor.select(inner);
}
