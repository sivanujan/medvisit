import { kitToCss, type SiteKit } from './kit';
import { googleFontsUrl, usedFontFamilies } from './fonts';

/** Create or replace `<style id="mv-kit">` and `<link id="mv-fonts">` in a (canvas) document. */
export function applyKitToDocument(doc: Document | null | undefined, kit: SiteKit, pageCss: string): void {
    if (!doc) return;

    let style = doc.getElementById('mv-kit');
    if (!style) {
        style = doc.createElement('style');
        style.id = 'mv-kit';
        doc.head.appendChild(style);
    }
    style.textContent = kitToCss(kit);

    const url = googleFontsUrl(usedFontFamilies(kit, pageCss));
    const existing = doc.getElementById('mv-fonts');
    if (!url) {
        existing?.remove();
        return;
    }
    if (existing) {
        if (existing.getAttribute('href') !== url) existing.setAttribute('href', url);
        return;
    }
    const link = doc.createElement('link');
    link.id = 'mv-fonts';
    link.rel = 'stylesheet';
    link.href = url;
    doc.head.appendChild(link);
}
