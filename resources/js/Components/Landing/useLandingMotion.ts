import { RefObject, useEffect, useState } from 'react';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the user's reduced-motion preference and updates live if it changes.
 */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState<boolean>(() =>
        typeof window !== 'undefined' && !!window.matchMedia
            ? window.matchMedia(REDUCED_QUERY).matches
            : false,
    );

    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia(REDUCED_QUERY);
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return reduced;
}

/**
 * True while the element is (near) the viewport. Used to lazy-start and pause
 * looping animations so off-screen sections cost nothing.
 */
export function useInView<T extends Element>(ref: RefObject<T>, rootMargin = '120px'): boolean {
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, rootMargin]);

    return inView;
}

/**
 * Writes the element's scroll progress (0 → 1) into the `--p` CSS variable.
 * Progress is 0 when the element's top sits at `startAt` (a fraction of the viewport
 * height) and 1 when its bottom sits at `endAt`. Writes go straight to the DOM inside
 * rAF, so scrolling never re-renders React. With reduced motion the value is pinned to 1.
 */
export function useScrollProgress<T extends HTMLElement>(
    ref: RefObject<T>,
    { startAt = 0, endAt = 1, reduced = false }: { startAt?: number; endAt?: number; reduced?: boolean } = {},
): void {
    const inView = useInView(ref, '0px');

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (reduced) {
            el.style.setProperty('--p', '1');
            return;
        }
        if (!inView) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const from = vh * startAt;
            const to = vh * endAt - rect.height;
            const span = from - to;
            const raw = span === 0 ? 1 : (from - rect.top) / span;
            const p = Math.min(1, Math.max(0, raw));
            el.style.setProperty('--p', p.toFixed(4));
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [ref, inView, reduced, startAt, endAt]);
}

/**
 * Counts up once every `ms` while `enabled`. Used for the token boards so they
 * only tick while visible and never tick with reduced motion.
 */
export function useTicker(ms: number, enabled: boolean): number {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!enabled) return;
        const id = window.setInterval(() => setTick((t) => t + 1), ms);
        return () => window.clearInterval(id);
    }, [ms, enabled]);

    return tick;
}
