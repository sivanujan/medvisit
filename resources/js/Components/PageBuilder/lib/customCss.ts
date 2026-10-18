import { expandSelectorKeyword } from './animations.ts';

export const CUSTOM_CSS_ATTR = 'data-mv-custom-css';
const START = '/* mv-custom-css:start */';
const END = '/* mv-custom-css:end */';
const BLOCK_RE = /\n?\/\* mv-custom-css:start \*\/[\s\S]*?\/\* mv-custom-css:end \*\/\n?/g;

export type CustomCssItem = { id: string; css: string };

// Expanded custom CSS of every element, wrapped in markers so it can be stripped on load.
export function buildCustomCssBlock(items: CustomCssItem[]): string {
    const parts = items.filter((i) => i.css.trim() !== '').map((i) => expandSelectorKeyword(i.css, i.id));
    return parts.length === 0 ? '' : `${START}\n${parts.join('\n')}\n${END}`;
}

export function stripCustomCssBlock(css: string): string {
    return (css ?? '').replace(BLOCK_RE, '\n').trim();
}

// Components in document order that carry custom CSS.
export function collectCustomCss(editor: any): CustomCssItem[] {
    const items: CustomCssItem[] = [];
    const walk = (comp: any) => {
        const css = comp.getAttributes?.()?.[CUSTOM_CSS_ATTR];
        if (css) items.push({ id: comp.getId(), css: String(css) });
        comp.components?.().forEach(walk);
    };
    const wrapper = editor?.getWrapper?.();
    if (wrapper) walk(wrapper);
    return items;
}

// Canvas-only <style>; never written into the CssComposer, so Style-tab rules are untouched.
export function syncCustomCssStyle(editor: any): void {
    const doc: Document | undefined = editor?.Canvas?.getDocument?.();
    if (!doc) return;
    let el = doc.getElementById('mv-custom-css') as HTMLStyleElement | null;
    if (!el) {
        el = doc.createElement('style');
        el.id = 'mv-custom-css';
        doc.head.appendChild(el);
    }
    el.textContent = buildCustomCssBlock(collectCustomCss(editor));
}

// Editor CSS plus the marked custom-CSS block, for save/publish.
export function cssWithCustomBlock(editor: any): string {
    const block = buildCustomCssBlock(collectCustomCss(editor));
    const css: string = editor.getCss();
    return block ? `${css}\n${block}` : css;
}
