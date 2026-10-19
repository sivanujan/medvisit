// Small public-page behaviour for Batch A widgets: Tabs switching and Counter count-up.

export function formatCount(value: number): string {
    return String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function initTabs(root: HTMLElement): () => void {
    const cleanups: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>('[data-mv-widget="tabs"]').forEach((widget) => {
        const buttons = Array.from(widget.querySelectorAll<HTMLElement>('[data-mv-tab-button]'));
        const panels = Array.from(widget.querySelectorAll<HTMLElement>('[data-mv-tab-panel]'));
        if (!buttons.length || !panels.length) return;
        // The first button is styled as active in the editor; reuse its colours for the active tab.
        const activeColor = getComputedStyle(buttons[0]).color;
        const idleColor = buttons[1] ? getComputedStyle(buttons[1]).color : '#475569';
        const select = (index: number) => {
            panels.forEach((p, i) => (p.style.display = i === index ? 'block' : 'none'));
            buttons.forEach((b, i) => {
                const on = i === index;
                b.style.color = on ? activeColor : idleColor;
                b.style.borderBottomColor = on ? activeColor : 'transparent';
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
        };
        buttons.forEach((b, i) => {
            b.setAttribute('role', 'tab');
            const onClick = () => select(i);
            b.addEventListener('click', onClick);
            cleanups.push(() => b.removeEventListener('click', onClick));
        });
        select(0);
    });
    return () => cleanups.forEach((c) => c());
}

function initCounters(root: HTMLElement): () => void {
    const counters = Array.from(root.querySelectorAll<HTMLElement>('[data-mv-count]'));
    if (!counters.length) return () => {};
    const target = (el: HTMLElement) => Number(el.getAttribute('data-mv-count')) || 0;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
        counters.forEach((el) => (el.textContent = formatCount(target(el))));
        return () => {};
    }
    counters.forEach((el) => (el.textContent = '0'));
    const timers: number[] = [];
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target as HTMLElement;
                observer.unobserve(el);
                const end = target(el);
                const started = performance.now();
                const duration = 1500;
                const step = () => {
                    const progress = Math.min(1, (performance.now() - started) / duration);
                    el.textContent = formatCount(end * (1 - Math.pow(1 - progress, 3)));
                    if (progress < 1) timers.push(window.setTimeout(step, 16));
                };
                step();
            });
        },
        { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    counters.forEach((el) => observer.observe(el));
    return () => {
        observer.disconnect();
        timers.forEach((t) => clearTimeout(t));
    };
}

export function initWidgets(root: HTMLElement): () => void {
    const stopTabs = initTabs(root);
    const stopCounters = initCounters(root);
    return () => {
        stopTabs();
        stopCounters();
    };
}
