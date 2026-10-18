import type { Device } from './responsive.ts';

export type KitColor = { id: string; name: string; value: string };
export type TypographyKey = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'button';
export type TypographyPreset = { size: Partial<Record<Device, string>>; weight: number; lineHeight: number };
export type SiteKit = {
    colors: KitColor[];
    retired: KitColor[];
    fonts: { heading: string; body: string };
    typography: Record<TypographyKey, TypographyPreset>;
};

const KEYS: TypographyKey[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'button'];
const SELECTOR: Record<TypographyKey, string> = {
    h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
    body: 'body',
    button: '.mv-button, button',
};

function mediaBlock(kit: SiteKit, device: 'tablet' | 'mobile', maxWidth: number): string {
    const rules = KEYS.filter((k) => kit.typography[k]?.size[device])
        .map((k) => `  ${SELECTOR[k]} { font-size: ${kit.typography[k].size[device]}; }`);
    return rules.length ? `@media (max-width: ${maxWidth}px) {\n${rules.join('\n')}\n}\n` : '';
}

export function kitToCss(kit: SiteKit): string {
    const vars = [...kit.colors, ...kit.retired].map((c) => `  --mv-color-${c.id}: ${c.value};`);
    vars.push(`  --mv-font-heading: '${kit.fonts.heading}', sans-serif;`);
    vars.push(`  --mv-font-body: '${kit.fonts.body}', sans-serif;`);
    let css = `:root {\n${vars.join('\n')}\n}\n`;
    for (const k of KEYS) {
        const t = kit.typography[k];
        if (!t) continue;
        const font = k.startsWith('h') && k !== 'body' ? 'var(--mv-font-heading)' : 'var(--mv-font-body)';
        const size = t.size.desktop ? ` font-size: ${t.size.desktop};` : '';
        css += `${SELECTOR[k]} { font-family: ${font};${size} font-weight: ${t.weight}; line-height: ${t.lineHeight}; }\n`;
    }
    css += mediaBlock(kit, 'tablet', 992);
    css += mediaBlock(kit, 'mobile', 480);
    return css;
}
