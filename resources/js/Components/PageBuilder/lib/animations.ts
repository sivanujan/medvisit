export const ANIMATIONS = ['fade-in', 'slide-up', 'slide-left', 'slide-right', 'zoom-in'] as const;
export type AnimationName = (typeof ANIMATIONS)[number];

const FROM: Record<AnimationName, string> = {
    'fade-in': 'opacity:0',
    'slide-up': 'opacity:0;transform:translateY(32px)',
    'slide-left': 'opacity:0;transform:translateX(48px)',
    'slide-right': 'opacity:0;transform:translateX(-48px)',
    'zoom-in': 'opacity:0;transform:scale(.9)',
};

// Keyframes + hidden-until-visible rules for the public page.
export function animationCss(): string {
    const keyframes = ANIMATIONS.map(
        (a) => `@keyframes mv-${a}{from{${FROM[a]}}to{opacity:1;transform:none}}`,
    ).join('');
    const rules = ANIMATIONS.map((a) => `.mv-animated[data-mv-animation="${a}"]{animation-name:mv-${a}}`).join('');
    return (
        keyframes +
        '[data-mv-animation]{opacity:0}' +
        '.mv-animated[data-mv-animation]{animation-duration:.6s;animation-timing-function:ease-out;animation-fill-mode:both}' +
        rules +
        '@media (prefers-reduced-motion: reduce){[data-mv-animation],.mv-animated[data-mv-animation]{opacity:1 !important;animation:none !important}}'
    );
}

// Editor canvas only: animated elements must never stay invisible while editing, and elements
// hidden on the active device are faded instead of removed so they can still be selected.
export function canvasEditorCss(device: 'desktop' | 'tablet' | 'mobile'): string {
    return (
        '[data-mv-animation]{opacity:1 !important}' +
        `[data-mv-hidden-${device}]{opacity:.35 !important;display:revert !important}`
    );
}

// Plays each [data-mv-animation] element's entrance once when it scrolls into view.
export function initEntranceAnimations(root: HTMLElement): () => void {
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-mv-animation]'));
    if (els.length === 0) return () => {};

    const play = (el: HTMLElement) => {
        const duration = Number(el.dataset.mvDuration);
        const delay = Number(el.dataset.mvDelay);
        if (el.dataset.mvDuration && Number.isFinite(duration)) el.style.animationDuration = `${duration}ms`;
        if (el.dataset.mvDelay && Number.isFinite(delay)) el.style.animationDelay = `${delay}ms`;
        el.classList.add('mv-animated');
    };

    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
        els.forEach((el) => {
            el.style.opacity = '1';
        });
        return () => {};
    }
    if (typeof IntersectionObserver === 'undefined') {
        els.forEach(play);
        return () => {};
    }

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                play(entry.target as HTMLElement);
                observer.unobserve(entry.target);
            }
        },
        { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
}

// Replaces the whole word `selector` with the component's ID selector.
export function expandSelectorKeyword(css: string, componentId: string): string {
    return css.replace(/(?<![\w-])selector(?![\w-])/g, `#${componentId}`);
}
