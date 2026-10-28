import type { KitColor, SiteKit } from './kit.ts';

export const SYSTEM_COLOR_IDS = ['primary', 'secondary', 'accent', 'text'] as const;
export const MAX_CUSTOM_COLORS = 10;

type SystemId = (typeof SYSTEM_COLOR_IDS)[number];

// Mirrors App\Support\SiteKit::THEME_COLORS.
export const THEME_COLORS: Record<string, Record<SystemId, string>> = {
    'medvisit-teal': { primary: '#0E9E8F', secondary: '#0F172A', accent: '#F59E0B', text: '#334155' },
    'ocean-blue': { primary: '#1E6FD9', secondary: '#0F172A', accent: '#F59E0B', text: '#334155' },
    'coral-health': { primary: '#FF7A59', secondary: '#0F172A', accent: '#0E9E8F', text: '#334155' },
    'emerald-health': { primary: '#059669', secondary: '#0F172A', accent: '#F59E0B', text: '#334155' },
    'royal-purple': { primary: '#7C3AED', secondary: '#0F172A', accent: '#F59E0B', text: '#334155' },
    'slate-luxury': { primary: '#334155', secondary: '#0F172A', accent: '#F59E0B', text: '#334155' },
};

export const THEME_PRESET_LABELS: Record<string, string> = {
    'medvisit-teal': 'MedVisit Teal',
    'ocean-blue': 'Ocean Blue',
    'coral-health': 'Coral Health',
    'emerald-health': 'Emerald Health',
    'royal-purple': 'Royal Specialist',
    'slate-luxury': 'Slate Executive',
};

/** The four system colors for a preset, or null for an unknown preset. */
export function presetColors(themeKey: string): Record<SystemId, string> | null {
    return THEME_COLORS[themeKey] ?? null;
}

/** Applies a preset to the system colors only; custom colors are kept. */
export function applyPreset(colors: KitColor[], themeKey: string): KitColor[] {
    const palette = presetColors(themeKey);
    if (!palette) return colors;
    return colors.map((c) => (c.id in palette ? { ...c, value: palette[c.id as SystemId] } : c));
}

const COLOR_VAR = /^var\(\s*--mv-color-([a-z0-9-]+)\s*\)$/;

/** `var(--mv-color-primary)` -> `primary`; anything else -> null. */
export function parseColorVar(value: string): string | null {
    const m = COLOR_VAR.exec((value ?? '').trim());
    return m ? m[1] : null;
}

export const colorVar = (id: string): string => `var(--mv-color-${id})`;

/** Smallest unused `custom-N` id (N from 1); retired ids are skipped so they never collide. */
export function nextCustomColorId(colors: KitColor[], retired: KitColor[] = []): string {
    const taken = new Set([...colors, ...retired].map((c) => c.id));
    let n = 1;
    while (taken.has(`custom-${n}`)) n++;
    return `custom-${n}`;
}

export const customColorCount = (colors: KitColor[]): number => colors.filter((c) => c.id.startsWith('custom-')).length;

export type LinkedColor =
    | { id: string; status: 'active' | 'retired'; name: string; hex: string }
    | { id: string; status: 'unknown' };

/** Resolve a `var(--mv-color-X)` value against the kit; null when the value is not a kit link. */
export function resolveLinkedColor(value: string, kit: Pick<SiteKit, 'colors' | 'retired'>): LinkedColor | null {
    const id = parseColorVar(value);
    if (id === null) return null;
    const active = kit.colors.find((c) => c.id === id);
    if (active) return { id, status: 'active', name: active.name, hex: active.value };
    const retired = kit.retired.find((c) => c.id === id);
    if (retired) return { id, status: 'retired', name: retired.name, hex: retired.value };
    return { id, status: 'unknown' };
}
