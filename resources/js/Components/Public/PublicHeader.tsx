import React, { CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu, MessageCircle, Phone, X } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { defaultPublicConfig } from '@/Config/medvisitPublic';
import { PageProps } from '@/types';

/** Landing page sections the nav can point at; each must exist as an element id on "/". */
const SECTIONS = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How it works' },
] as const;

const RESOURCES = [
    { label: 'Terms and Conditions', path: '/terms' },
    { label: 'Refund Policy', path: '/refund-policy' },
    { label: 'Dispute Policy', path: '/dispute-policy' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
];

type NavKey = 'find' | 'features' | 'how-it-works' | 'pricing' | 'faq' | 'resources';

interface Props {
    /** Optional reading-progress bar under the header (policy pages). */
    progressPercent?: number;
}

function usePathname(): string {
    const { url } = usePage();
    return url.split(/[?#]/)[0] || '/';
}

/** Which nav item belongs to the section crossing the middle of the viewport on "/". */
function useActiveSection(enabled: boolean): NavKey | null {
    const [active, setActive] = useState<NavKey | null>(null);

    useEffect(() => {
        if (!enabled || typeof IntersectionObserver === 'undefined') return;
        const ids: NavKey[] = ['features', 'how-it-works', 'faq'];
        const visible = new Set<string>();
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
                setActive((ids.find((id) => visible.has(id)) as NavKey | undefined) ?? null);
            },
            { rootMargin: '-45% 0px -50% 0px' },
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) io.observe(el);
        });
        return () => io.disconnect();
    }, [enabled]);

    return active;
}

/** Same-page anchors stay native (smooth CSS scrolling); cross-page ones are Inertia visits to "/#id". */
function NavAnchor({ href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    if (href.startsWith('#')) return <a href={href} {...rest} />;
    return <Link href={href} {...(rest as Record<string, unknown>)} />;
}

function WhatsAppGlyph({ className = '' }: { className?: string }) {
    return (
        <span className={`relative inline-flex ${className}`} aria-hidden="true">
            <MessageCircle className="h-full w-full" />
            <Phone
                className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2"
                strokeWidth={2.6}
            />
        </span>
    );
}

export default function PublicHeader({ progressPercent }: Props) {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;
    const business = (props.publicConfig || defaultPublicConfig).business;
    const whatsappUrl = business.whatsapp_url || 'https://wa.me/94701291688';
    const phoneDisplay = business.phone_display || '070 129 1688';
    const phoneHref = business.phone_raw ? `tel:${business.phone_raw}` : 'tel:+94701291688';

    const pathname = usePathname();
    const onLanding = pathname === '/';
    const sectionActive = useActiveSection(onLanding);
    const onResourcePage = RESOURCES.some((r) => r.path === pathname);
    const active: NavKey | null = onLanding
        ? sectionActive
        : pathname === '/find' || pathname.startsWith('/clinics') || pathname.startsWith('/doctors')
          ? 'find'
          : pathname === '/pricing'
            ? 'pricing'
            : onResourcePage
              ? 'resources'
              : null;

    const anchor = (id: string) => (onLanding ? `#${id}` : `/#${id}`);

    // ---------- Glass background after 20px ----------
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            setScrolled(window.scrollY > 20);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    // ---------- Sliding active pill ----------
    const navRef = useRef<HTMLUListElement>(null);
    const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
    const measure = useCallback(() => {
        const nav = navRef.current;
        const el = active ? nav?.querySelector<HTMLElement>(`[data-nav="${active}"]`) : null;
        if (!el || !nav) return setPill(null);
        const box = el.getBoundingClientRect();
        setPill({ x: box.left - nav.getBoundingClientRect().left, w: box.width });
    }, [active]);
    useLayoutEffect(measure, [measure]);
    useEffect(() => {
        window.addEventListener('resize', measure);
        document.fonts?.ready.then(measure).catch(() => undefined);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    // ---------- Resources dropdown ----------
    const [menuOpen, setMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLLIElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const hoverTimer = useRef<number>();

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!dropdownRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const openOnHover = () => {
        window.clearTimeout(hoverTimer.current);
        setMenuOpen(true);
    };
    const closeOnLeave = () => {
        hoverTimer.current = window.setTimeout(() => setMenuOpen(false), 160);
    };
    const onMenuKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMenuOpen(true);
            requestAnimationFrame(() => dropdownRef.current?.querySelector<HTMLElement>('[role="menu"] a')?.focus());
        }
    };
    const onPanelKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = Array.from(dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menu"] a') ?? []);
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
    };

    // ---------- Mobile panel ----------
    const [mobileOpen, setMobileOpen] = useState(false);
    const burgerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false);
        };
        document.addEventListener('keydown', onKey);
        requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button, a')?.focus());
        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener('keydown', onKey);
            burgerRef.current?.focus();
        };
    }, [mobileOpen]);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1280px)');
        const onChange = () => mq.matches && setMobileOpen(false);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const closeMobile = () => setMobileOpen(false);

    const itemClass = (key: NavKey) =>
        `relative z-10 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            active === key
                ? 'text-primary-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`;

    const startHref = user ? route('dashboard') : route('register');

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 h-[72px] w-full transition-[background-color,border-color,backdrop-filter] duration-300 motion-reduce:transition-none print:hidden ${
                    scrolled || mobileOpen
                        ? 'border-b border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/70'
                        : 'border-b border-transparent bg-transparent'
                }`}
            >
                <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="MedVisit home"
                    >
                        <ApplicationLogo className="h-8 w-auto transition-transform group-hover:scale-105 sm:h-9" />
                    </Link>

                    {/* Desktop navigation */}
                    <nav aria-label="Main" className="hidden xl:block">
                        <ul ref={navRef} className="relative flex items-center gap-1 xl:gap-2">
                            <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 rounded-full bg-primary/10 ring-1 ring-primary/15 transition-[transform,width,opacity] duration-300 ease-out motion-reduce:transition-none dark:bg-white/10 dark:ring-white/15"
                                style={
                                    {
                                        width: pill?.w ?? 0,
                                        transform: `translateX(${pill?.x ?? 0}px)`,
                                        opacity: pill ? 1 : 0,
                                    } as CSSProperties
                                }
                            />
                            {SECTIONS.map((s) => (
                                <li key={s.id}>
                                    <NavAnchor
                                        href={anchor(s.id)}
                                        data-nav={s.id}
                                        aria-current={active === s.id ? 'location' : undefined}
                                        className={itemClass(s.id)}
                                    >
                                        {s.label}
                                    </NavAnchor>
                                </li>
                            ))}
                            <li>
                                <Link
                                    href="/find"
                                    data-nav="find"
                                    aria-current={active === 'find' ? 'page' : undefined}
                                    className={itemClass('find')}
                                >
                                    Find Care
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/pricing"
                                    data-nav="pricing"
                                    aria-current={active === 'pricing' ? 'page' : undefined}
                                    className={itemClass('pricing')}
                                >
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <NavAnchor
                                    href={anchor('faq')}
                                    data-nav="faq"
                                    aria-current={active === 'faq' ? 'location' : undefined}
                                    className={itemClass('faq')}
                                >
                                    FAQ
                                </NavAnchor>
                            </li>
                            <li
                                ref={dropdownRef}
                                className="relative"
                                onMouseEnter={openOnHover}
                                onMouseLeave={closeOnLeave}
                            >
                                <button
                                    ref={menuButtonRef}
                                    type="button"
                                    data-nav="resources"
                                    aria-haspopup="true"
                                    aria-expanded={menuOpen}
                                    aria-controls="public-resources-menu"
                                    onClick={() => setMenuOpen((o) => !o)}
                                    onKeyDown={onMenuKeyDown}
                                    className={itemClass('resources')}
                                >
                                    Resources
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${menuOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                <div
                                    id="public-resources-menu"
                                    role="menu"
                                    aria-label="Resources"
                                    onKeyDown={onPanelKeyDown}
                                    className={`absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3 transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
                                        menuOpen
                                            ? 'visible translate-y-0 opacity-100'
                                            : 'invisible -translate-y-1 opacity-0'
                                    }`}
                                >
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/40">
                                        {RESOURCES.map((r) => (
                                             <Link
                                                key={r.path}
                                                href={r.path}
                                                role="menuitem"
                                                onClick={() => setMenuOpen(false)}
                                                aria-current={pathname === r.path ? 'page' : undefined}
                                                className={`flex rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                                    pathname === r.path
                                                        ? 'bg-primary/10 font-semibold text-primary-700 dark:bg-white/10 dark:text-white'
                                                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                {r.label}
                                            </Link>
                                        ))}
                                        <div className="my-1.5 border-t border-slate-200/80 dark:border-white/10" />
                                        <a
                                            href="#contact"
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex rounded-xl px-3.5 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-200 dark:hover:bg-white/5"
                                        >
                                            Contact
                                        </a>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </nav>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Chat on WhatsApp"
                            title="Chat on WhatsApp"
                            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/60 text-[#128c4b] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-slate-800/60 dark:text-[#4ade80] dark:hover:bg-slate-800 xl:inline-flex"
                        >
                            <WhatsAppGlyph className="h-[18px] w-[18px]" />
                        </a>

                        <div className="shrink-0 flex items-center">
                            <ThemeToggle size="md" className="h-10 w-10 shrink-0" />
                        </div>

                        {user ? (
                            <Link
                                href={route('dashboard')}
                                className="hidden h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white whitespace-nowrap shadow-sm shadow-primary/30 transition hover:bg-primary-600 sm:inline-flex"
                            >
                                Open dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="hidden h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/60 px-4 text-sm font-semibold text-slate-700 whitespace-nowrap transition hover:bg-white dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex"
                                >
                                    <span className="xl:hidden">Sign in</span>
                                    <span className="hidden xl:inline">Sign in to your clinic</span>
                                </Link>
                                <Link
                                    href={startHref}
                                    className="hidden h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white whitespace-nowrap shadow-sm shadow-primary/30 transition hover:bg-primary-600 sm:inline-flex"
                                >
                                    Get started
                                </Link>
                            </>
                        )}

                        <button
                            ref={burgerRef}
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={mobileOpen}
                            aria-controls="public-mobile-menu"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/60 text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 xl:hidden"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {progressPercent !== undefined && (
                    <div aria-hidden="true" className="h-1 w-full overflow-hidden bg-slate-200/50 dark:bg-slate-800/50">
                        <div
                            className="h-full bg-gradient-to-r from-primary via-secondary to-accent motion-safe:transition-all motion-safe:duration-150"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </header>

            {/* Mobile slide-in panel */}
            <div className="xl:hidden">
                <div
                    aria-hidden="true"
                    onClick={closeMobile}
                    className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${
                        mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                />
                <div
                    id="public-mobile-menu"
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    aria-hidden={!mobileOpen}
                    {...(!mobileOpen ? { inert: '' } : {})}
                    className={`fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-sm flex-col bg-white shadow-2xl duration-300 ease-out motion-reduce:transition-none dark:bg-slate-950 ${
                        mobileOpen
                            ? 'visible translate-x-0 transition-transform'
                            : 'invisible translate-x-full transition-[transform,visibility]'
                    }`}
                >
                    <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/10 sm:px-6">
                        <ApplicationLogo className="h-8 w-auto" />
                        <button
                            type="button"
                            onClick={closeMobile}
                            aria-label="Close menu"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                        <ul className="space-y-1">
                            {[
                                { key: 'find' as NavKey, label: 'Find Care', href: '/find' },
                                { key: 'features' as NavKey, label: 'Features', href: anchor('features') },
                                { key: 'how-it-works' as NavKey, label: 'How it works', href: anchor('how-it-works') },
                                { key: 'pricing' as NavKey, label: 'Pricing', href: '/pricing' },
                                { key: 'faq' as NavKey, label: 'FAQ', href: anchor('faq') },
                            ].map((item) => (
                                <li key={item.key}>
                                    <NavAnchor
                                        href={item.href}
                                        onClick={closeMobile}
                                        aria-current={
                                            active === item.key
                                                ? item.key === 'pricing'
                                                    ? 'page'
                                                    : 'location'
                                                : undefined
                                        }
                                        className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-semibold transition-colors ${
                                            active === item.key
                                                ? 'bg-primary/10 text-primary-700 dark:bg-white/10 dark:text-white'
                                                : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {item.label}
                                        {active === item.key && (
                                            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                                        )}
                                    </NavAnchor>
                                </li>
                            ))}
                        </ul>

                        <h2 className="mt-7 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Legal</h2>
                        <ul className="mt-2 space-y-0.5">
                            {RESOURCES.map((r) => (
                                <li key={r.path}>
                                    <Link
                                        href={r.path}
                                        onClick={closeMobile}
                                        aria-current={pathname === r.path ? 'page' : undefined}
                                        className={`flex rounded-xl px-4 py-2.5 text-base transition-colors ${
                                            pathname === r.path
                                                ? 'font-semibold text-primary-700 dark:text-white'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {r.label}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <a
                                    href="#contact"
                                    onClick={closeMobile}
                                    className="flex rounded-xl px-4 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                                >
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </nav>

                    <div className="space-y-3 border-t border-slate-200/80 px-4 pb-6 pt-4 dark:border-white/10 sm:px-6">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <a
                                href={phoneHref}
                                className="inline-flex items-center gap-2 rounded-lg font-medium text-slate-700 dark:text-slate-200"
                            >
                                <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                                {phoneDisplay}
                            </a>
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg font-semibold text-[#128c4b] dark:text-[#4ade80]"
                            >
                                <WhatsAppGlyph className="h-4 w-4" />
                                Chat on WhatsApp
                            </a>
                        </div>
                        {user ? (
                            <Link
                                href={route('dashboard')}
                                onClick={closeMobile}
                                className="flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-base font-semibold text-white"
                            >
                                Open dashboard
                            </Link>
                        ) : (
                            <div className="grid gap-3">
                                <Link
                                    href={route('login')}
                                    onClick={closeMobile}
                                    className="flex items-center justify-center rounded-2xl border border-slate-300 py-3.5 text-base font-semibold text-slate-800 dark:border-white/15 dark:text-slate-100"
                                >
                                    Sign in to your clinic
                                </Link>
                                <Link
                                    href={startHref}
                                    onClick={closeMobile}
                                    className="flex items-center justify-center rounded-2xl bg-primary py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30"
                                >
                                    Get started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
