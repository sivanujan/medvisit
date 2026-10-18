export type UnitValue = { number: number | null; unit: string };

export function parseUnitValue(raw: string): UnitValue {
    const v = (raw ?? '').trim();
    const m = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i.exec(v);
    if (!m) return { number: null, unit: v };
    return { number: parseFloat(m[1]), unit: m[2] };
}

export function formatUnitValue(number: number, unit: string): string {
    return `${number}${unit}`;
}

export type Shadow = { x: number; y: number; blur: number; spread?: number; color: string };

export function formatShadow(s: Shadow): string {
    const parts = [`${s.x}px`, `${s.y}px`, `${s.blur}px`];
    if (s.spread !== undefined) parts.push(`${s.spread}px`);
    parts.push(s.color);
    return parts.join(' ');
}

// Split on whitespace that is not inside parentheses (so rgba(0, 0, 0, .2) stays whole).
function splitTopLevel(raw: string, sep: RegExp): string[] {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of raw) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth === 0 && sep.test(ch)) {
            if (cur.trim()) out.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

// Parses a single shadow ("0px 4px 12px 0px #0003"); returns null for none/unparseable values.
export function parseShadow(raw: string): Shadow | null {
    const tokens = splitTopLevel((raw ?? '').trim(), /\s/);
    if (!tokens.length || tokens[0] === 'none' || tokens.includes('inset')) return null;
    const nums: number[] = [];
    let color = '';
    for (const t of tokens) {
        const u = parseUnitValue(t);
        if (u.number !== null && (u.unit === 'px' || u.unit === '')) nums.push(u.number);
        else color = t;
    }
    if (nums.length < 2 || nums.length > 4) return null;
    const shadow: Shadow = { x: nums[0], y: nums[1], blur: nums[2] ?? 0, color };
    if (nums.length === 4) shadow.spread = nums[3];
    return shadow;
}

export type Gradient = { angle: number; from: string; to: string };

export function formatGradient(g: Gradient): string {
    return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
}

export function parseGradient(raw: string): Gradient | null {
    const m = /^linear-gradient\((.*)\)$/i.exec((raw ?? '').trim());
    if (!m) return null;
    const parts = splitTopLevel(m[1], /,/);
    if (parts.length !== 3) return null;
    const angle = /^(-?\d+(?:\.\d+)?)deg$/i.exec(parts[0]);
    if (!angle) return null;
    return { angle: parseFloat(angle[1]), from: parts[1], to: parts[2] };
}

export function extractUrl(raw: string): string {
    const m = /url\(\s*(['"]?)(.*?)\1\s*\)/i.exec(raw ?? '');
    return m ? m[2] : '';
}

// Image background with an optional flat overlay colour (drawn as a same-colour gradient on top).
export function formatImageBackground(url: string, overlay = ''): string {
    const img = `url("${url}")`;
    return overlay ? `linear-gradient(${overlay}, ${overlay}), ${img}` : img;
}

export function parseImageBackground(raw: string): { url: string; overlay: string } {
    const value = raw ?? '';
    const m = /^linear-gradient\((.+),\s*\1\),\s*url\(/i.exec(value.trim());
    return { url: extractUrl(value), overlay: m ? m[1] : '' };
}

// Layout (flex) controls apply to sections and to div wrappers that contain children (columns / rows).
export function isLayoutContainer(tagName: string, childCount: number): boolean {
    const tag = (tagName ?? '').toLowerCase();
    return tag === 'section' || (tag === 'div' && childCount > 0);
}
