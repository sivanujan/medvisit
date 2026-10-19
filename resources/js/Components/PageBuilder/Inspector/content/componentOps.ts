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

// Replace only the element's own text (text nodes); child elements such as an icon stay untouched.
// GrapesJS escapes text-node content when exporting HTML.
export function setOwnText(comp: any, text: string): void {
    if (!comp) return;
    comp.components()
        .filter((c: any) => c.get('type') === 'textnode')
        .forEach((c: any) => c.remove());
    comp.append({ type: 'textnode', content: text });
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

// Swap the element's tag in place: same model, so id, children and its #id style rules are kept.
// (replaceWith would delete the #id rules of the element and all of its descendants.)
export function retag(editor: any, comp: any, tagName: string): any {
    comp.set('tagName', tagName);
    editor.select(comp);
    return comp;
}

export function setLinkAttributes(comp: any, href: string, newTab: boolean): void {
    comp.removeAttributes?.(['target', 'rel']);
    comp.addAttributes(linkAttributes(href, newTab));
}

// Wrap an element (e.g. an image) in a link, or update/remove the link around it. The element
// itself is moved (temporary removal), never rebuilt, so its #id style rules and selection survive.
export function setWrappingLink(editor: any, comp: any, href: string, newTab: boolean): void {
    const parent = comp.parent?.();
    if (!parent) return;
    const parentIsLink = String(parent.get('tagName')).toLowerCase() === 'a';
    if (!href.trim()) {
        if (parentIsLink) {
            const outer = parent.parent?.();
            if (!outer) return;
            comp.move(outer, { at: parent.index() });
            parent.remove();
            editor.select(comp);
        }
        return;
    }
    if (parentIsLink) {
        setLinkAttributes(parent, href, newTab);
        return;
    }
    const added = parent.components().add({ tagName: 'a', attributes: linkAttributes(href, newTab) }, { at: comp.index() });
    const link = Array.isArray(added) ? added[0] : added;
    comp.move(link, {});
    editor.select(comp);
}
