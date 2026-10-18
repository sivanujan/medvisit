import fonts from './fonts.json' with { type: 'json' };
import type { SiteKit } from './kit.ts';

export type CuratedFont = { family: string; weights: number[] };
export const CURATED_FONTS: CuratedFont[] = fonts;

export function usedFontFamilies(kit: SiteKit, pageCss: string): string[] {
    const curated = new Set(CURATED_FONTS.map((f) => f.family));
    const used = new Set<string>();
    for (const name of [kit.fonts.heading, kit.fonts.body]) {
        if (curated.has(name)) used.add(name);
    }
    for (const decl of pageCss.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
        for (const part of decl[1].split(',')) {
            const name = part.trim().replace(/^['"]|['"]$/g, '').trim();
            if (curated.has(name)) used.add(name);
        }
    }
    return [...used];
}

export function googleFontsUrl(families: string[]): string | null {
    const params = [...new Set(families)]
        .map((name) => CURATED_FONTS.find((f) => f.family === name))
        .filter((f): f is CuratedFont => !!f)
        .sort((a, b) => a.family.localeCompare(b.family))
        .map((f) => `family=${f.family.replace(/ /g, '+')}:wght@${f.weights.join(';')}`);
    if (!params.length) return null;
    return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}
