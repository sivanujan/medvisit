// Pure helpers used by the widget Content panels.
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const BUTTON_SIZES: Record<ButtonSize, { padding: string; 'font-size': string }> = {
    sm: { padding: '8px 16px', 'font-size': '13px' },
    md: { padding: '12px 24px', 'font-size': '15px' },
    lg: { padding: '16px 32px', 'font-size': '17px' },
    xl: { padding: '20px 40px', 'font-size': '19px' },
};

export function buttonSizePreset(size: ButtonSize): { padding: string; 'font-size': string } {
    return { ...BUTTON_SIZES[size] };
}

// Normalised tag to switch an element to, or null when the tag isn't allowed.
export function retagPlan(tag: string, allowed: string[]): string | null {
    const next = (tag || '').trim().toLowerCase();
    return next && allowed.includes(next) ? next : null;
}

// Text typed into a panel is inserted as markup by GrapesJS, so escape it first.
export function escapeHtml(text: string): string {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function linkAttributes(href: string, newTab: boolean): Record<string, string> {
    const safeHref = /^\s*javascript:/i.test(href || '') ? '#' : (href || '').trim();
    return newTab ? { href: safeHref, target: '_blank', rel: 'noopener' } : { href: safeHref };
}

export type VideoOptions = { autoplay: boolean; mute: boolean; loop: boolean; controls: boolean };

function youtubeId(url: string): string | null {
    const m =
        url.match(/youtu\.be\/([\w-]+)/) ||
        url.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)([\w-]+)/);
    return m ? m[1] : null;
}

// YouTube or Vimeo page link → embeddable player URL; null for anything else.
export function toVideoEmbedUrl(url: string, o: VideoOptions): string | null {
    const flag = (on: boolean) => (on ? '1' : '0');
    const yt = youtubeId(url || '');
    if (yt) {
        const params = [`autoplay=${flag(o.autoplay)}`, `mute=${flag(o.mute)}`, `loop=${flag(o.loop)}`, `controls=${flag(o.controls)}`];
        if (o.loop) params.push(`playlist=${yt}`);
        return `https://www.youtube.com/embed/${yt}?${params.join('&')}`;
    }
    const vimeo = (url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) {
        const params = [`autoplay=${flag(o.autoplay)}`, `muted=${flag(o.mute)}`, `loop=${flag(o.loop)}`, `controls=${flag(o.controls)}`];
        return `https://player.vimeo.com/video/${vimeo[1]}?${params.join('&')}`;
    }
    return null;
}

export function toMapEmbedUrl(query: string, zoom: number): string {
    const z = Math.min(20, Math.max(1, Math.round(zoom || 1)));
    return `https://www.google.com/maps?q=${encodeURIComponent((query || '').trim())}&z=${z}&output=embed`;
}
