import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, CreditCard, Languages, LucideIcon, Receipt } from 'lucide-react';
import { useInView, usePrefersReducedMotion } from './useLandingMotion';

type Accent = 'teal' | 'blue' | 'coral' | 'brand';

/**
 * Printed-prescription strings, copied from lang/{en,ta,si}/prescriptions.php
 * (thrice_daily + after_meals) so the sample matches what clinics actually print.
 */
const LANGUAGES = [
    { code: 'en', label: 'EN', name: 'English', frequency: '3 times daily', timing: 'After meals' },
    { code: 'ta', label: 'தமிழ்', name: 'Tamil', frequency: 'நாளுக்கு 3 முறை', timing: 'உணவுக்குப் பின்' },
    { code: 'si', label: 'සිංහල', name: 'Sinhala', frequency: 'දිනකට තුන් වරක්', timing: 'කෑමට පසු' },
] as const;

const CYCLE_MS = 2500;
const FONT_LINK_ID = 'lp-noto-lk';

/** Loads Noto Sans Tamil/Sinhala subset to just the characters this section shows. */
function useSectionFonts(enabled: boolean) {
    useEffect(() => {
        if (!enabled || document.getElementById(FONT_LINK_ID)) return;
        const chars = Array.from(
            new Set(
                LANGUAGES.filter((l) => l.code !== 'en')
                    .flatMap((l) => [l.label, l.frequency, l.timing])
                    .join(''),
            ),
        ).join('');
        const link = document.createElement('link');
        link.id = FONT_LINK_ID;
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@500;600&family=Noto+Sans+Tamil:wght@500;600&display=swap&text=' +
            encodeURIComponent(chars);
        document.head.appendChild(link);
    }, [enabled]);
}

interface TileProps {
    accent: Accent;
    icon: LucideIcon;
    title: string;
    body: string;
    index: number;
    className?: string;
    centerPreview?: boolean;
    children: ReactNode;
}

function Tile({ accent, icon: Icon, title, body, index, className = '', centerPreview = false, children }: TileProps) {
    return (
        <div className={`lp-reveal ${className}`} style={{ '--i': index } as CSSProperties}>
            <article className={`lp-lk-tile lp-accent-${accent} flex h-full flex-col rounded-2xl p-6 sm:p-7`}>
                <span className="lp-lk-icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[color:var(--lp-muted)]">{body}</p>
                <div className={`mt-6 flex flex-1 flex-col ${centerPreview ? 'justify-center' : 'justify-end'}`}>{children}</div>
            </article>
        </div>
    );
}

function ReceiptPreview() {
    const rows = [
        ['Consultation', 'Rs. 2,500'],
        ['Medicines', 'Rs. 700'],
        ['Clinic fee', 'Rs. 300'],
    ];
    return (
        <div aria-hidden="true" className="lp-lk-card rounded-xl p-4 text-sm">
            <div className="space-y-1.5">
                {rows.map(([label, amount], i) => (
                    <p key={label} className="lp-lk-line flex justify-between" style={{ '--i': i } as CSSProperties}>
                        <span className="text-[color:var(--lp-muted)]">{label}</span>
                        <span className="lp-tabular">{amount}</span>
                    </p>
                ))}
            </div>
            <p
                className="lp-lk-line mt-2.5 flex justify-between border-t border-dashed border-[color:var(--lp-line)] pt-2.5 font-semibold"
                style={{ '--i': 3 } as CSSProperties}
            >
                <span>Total</span>
                <span className="lp-tabular">Rs. 3,500</span>
            </p>
        </div>
    );
}

function SessionPreview() {
    return (
        <div aria-hidden="true" className="lp-lk-card rounded-xl p-4">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                <span>Dr. Perera</span>
                <span className="text-[color:var(--lp-muted)]">·</span>
                <span className="lp-tabular">6:00 PM</span>
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--lp-muted)]">
                <span>Tokens</span>
                <span className="lp-tabular font-semibold text-[color:var(--lp-ink)]">12/30</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                <div className="lp-lk-fill h-full w-full rounded-full bg-primary dark:bg-primary-400" />
            </div>
        </div>
    );
}

function PaymentPreview() {
    return (
        <div aria-hidden="true" className="lp-lk-card flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <span className="lp-lk-check inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary-600 text-white">
                    <Check className="h-5 w-5" strokeWidth={3} />
                </span>
                <div>
                    <p className="lp-tabular text-lg font-semibold leading-tight">Rs. 9,000</p>
                    <p className="text-sm font-medium text-[color:var(--lp-teal-ink)]">Paid</p>
                </div>
            </div>
            <div className="text-right">
                <div className="flex justify-end gap-1.5">
                    {['Visa', 'Mastercard'].map((card) => (
                        <span
                            key={card}
                            className="rounded-md border border-[color:var(--lp-line)] px-2 py-0.5 text-xs font-semibold"
                        >
                            {card}
                        </span>
                    ))}
                </div>
                <p className="mt-1.5 text-xs text-[color:var(--lp-muted)]">via Payments.lk</p>
            </div>
        </div>
    );
}

function PrescriptionPreview({ cycling }: { cycling: boolean }) {
    const [index, setIndex] = useState(0);
    const [manual, setManual] = useState(false);

    useEffect(() => {
        if (!cycling || manual) return;
        const id = window.setInterval(() => setIndex((i) => (i + 1) % LANGUAGES.length), CYCLE_MS);
        return () => window.clearInterval(id);
    }, [cycling, manual]);

    const choose = (i: number) => {
        setManual(true);
        setIndex(i);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="lp-lk-card rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-[color:var(--lp-line)] pb-3">
                    <span className="text-2xl font-bold italic text-primary dark:text-primary-300" aria-hidden="true">
                        Rx
                    </span>
                    <span className="text-xs text-[color:var(--lp-muted)]">Printed prescription</span>
                </div>
                <p className="mt-4 text-lg font-semibold">Paracetamol 500 mg</p>
                <p className="text-sm text-[color:var(--lp-muted)]">1 tablet</p>

                <div className="mt-4 grid rounded-xl bg-primary/[0.07] px-4 py-3.5 dark:bg-white/[0.06]" aria-live={manual ? 'polite' : 'off'}>
                    {LANGUAGES.map((lang, i) => (
                        <p
                            key={lang.code}
                            lang={lang.code}
                            aria-hidden={i !== index}
                            className={`lp-lk-script [grid-area:1/1] text-lg font-semibold leading-relaxed sm:text-xl transition-opacity duration-500 motion-reduce:transition-none ${
                                i === index ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                            {lang.frequency}
                            <span className="block text-base font-medium text-[color:var(--lp-muted)] sm:text-lg">{lang.timing}</span>
                        </p>
                    ))}
                </div>
            </div>

            <div
                role="group"
                aria-label="Prescription print language"
                className="inline-flex w-fit rounded-xl border border-[color:var(--lp-line)] bg-white/60 p-1 dark:bg-white/[0.04]"
            >
                {LANGUAGES.map((lang, i) => (
                    <button
                        key={lang.code}
                        type="button"
                        lang={lang.code}
                        aria-pressed={i === index}
                        aria-label={lang.name}
                        onClick={() => choose(i)}
                        className={`lp-lk-script min-w-[3.5rem] rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                            i === index
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-[color:var(--lp-muted)] hover:text-[color:var(--lp-ink)]'
                        }`}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function SriLankaStrip() {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref);
    const nearView = useInView(ref, '600px');
    const reduced = usePrefersReducedMotion();
    const [revealed, setRevealed] = useState(false);
    useSectionFonts(nearView);

    useEffect(() => {
        if (inView) setRevealed(true);
    }, [inView]);

    return (
        <section
            ref={ref}
            aria-labelledby="lp-lk-title"
            data-play={inView && !reduced}
            data-revealed={revealed || reduced}
            className="relative overflow-hidden border-y border-[color:var(--lp-line)] bg-primary-50/60 dark:bg-primary-950/30"
        >
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold tracking-[0.14em] text-secondary-700 dark:text-secondary-300">
                        MADE FOR SRI LANKA
                    </p>
                    <h2 id="lp-lk-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                        Built for clinics in Sri Lanka
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-[color:var(--lp-muted)] sm:text-lg">
                        Designed around how channeling, billing and prescriptions already work here.
                    </p>
                </div>

                <div className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto]">
                    <Tile
                        accent="brand"
                        icon={Languages}
                        index={0}
                        centerPreview
                        className="md:col-span-2 lg:row-span-2"
                        title="Prescriptions in three languages"
                        body="The app is in English. Printed prescriptions can show timing and frequency in Tamil or Sinhala."
                    >
                        <PrescriptionPreview cycling={inView && !reduced} />
                    </Tile>
                    <Tile
                        accent="teal"
                        icon={Receipt}
                        index={1}
                        title="Billing in rupees"
                        body="Bills, receipts and doctor payouts, all in LKR."
                    >
                        <ReceiptPreview />
                    </Tile>
                    <Tile
                        accent="blue"
                        icon={CalendarClock}
                        index={2}
                        title="Channeling sessions"
                        body="Timed doctor sessions with a token limit, the way channeling already works."
                    >
                        <SessionPreview />
                    </Tile>
                    <Tile
                        accent="coral"
                        icon={CreditCard}
                        index={3}
                        className="md:col-span-2"
                        title="Local payment gateway"
                        body="Your subscription is charged in rupees through Payments.lk, by Visa or Mastercard."
                    >
                        <PaymentPreview />
                    </Tile>
                </div>
            </div>
        </section>
    );
}
