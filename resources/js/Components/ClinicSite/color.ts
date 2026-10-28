/** Colour helpers for clinic sites: accessible text on brand colours (WCAG 2.1). */

export const THEME_PRIMARY: Record<string, string> = {
    'medvisit-teal': '#0E9E8F',
    'ocean-blue': '#1E6FD9',
    'coral-health': '#FF7A59',
    'emerald-health': '#059669',
    'royal-purple': '#7C3AED',
    'slate-luxury': '#334155',
};

function channels(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: number[]): string {
    return '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex: string): number {
    const [r, g, b] = channels(hex).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

function mix(hex: string, target: string, amount: number): string {
    const a = channels(hex);
    const b = channels(target);
    return toHex(a.map((c, i) => c + (b[i] - c) * amount));
}

/** Darken (or lighten) until the colour reaches `ratio` against `bg`. */
export function ensureContrast(hex: string, bg: string, ratio = 4.5): string {
    const towards = luminance(bg) > 0.5 ? '#000000' : '#ffffff';
    let out = hex;
    for (let step = 0; step <= 20 && contrast(out, bg) < ratio; step++) {
        out = mix(hex, towards, step * 0.05);
    }
    return out;
}

export interface BrandTokens {
    primary: string;
    /** Text/icon colour placed on the primary colour. */
    onPrimary: string;
    /** Primary adjusted to read as text on the page background. */
    primaryText: string;
    /** Contrast of onPrimary on primary. */
    buttonContrast: number;
    meetsAA: boolean;
}

export function brandTokens(primary: string, mode: 'light' | 'dark' = 'light'): BrandTokens {
    const onPrimary = contrast('#ffffff', primary) >= contrast('#0f172a', primary) ? '#ffffff' : '#0f172a';
    const buttonContrast = contrast(onPrimary, primary);
    const pageBg = mode === 'dark' ? '#0b1220' : '#ffffff';
    return {
        primary,
        onPrimary,
        primaryText: ensureContrast(primary, pageBg),
        buttonContrast,
        meetsAA: buttonContrast >= 4.5,
    };
}

export function resolvePrimary(look: { theme: string; brand_color?: string | null }): string {
    return look.brand_color || THEME_PRIMARY[look.theme] || THEME_PRIMARY['medvisit-teal'];
}
