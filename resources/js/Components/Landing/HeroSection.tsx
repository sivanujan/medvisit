import React, { useRef } from 'react';
import { Link } from '@inertiajs/react';
import TokenBoard from './TokenBoard';
import { useInView, usePrefersReducedMotion } from './useLandingMotion';

interface Props {
    getStartedHref: string;
}

export default function HeroSection({ getStartedHref }: Props) {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref);
    const reduced = usePrefersReducedMotion();
    const playing = inView && !reduced;

    return (
        <section ref={ref} data-play={playing} aria-labelledby="lp-hero-title" className="relative overflow-hidden pt-[72px]">
            <div aria-hidden="true" className="lp-mesh">
                <span />
                <span />
                <span />
            </div>
            <div aria-hidden="true" className="lp-grain" />

            <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 pt-8 pb-20 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-16 lg:pb-28">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 dark:bg-white/5 px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-teal-400 inline-block shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
                        Clinic software for Sri Lanka
                    </p>
                    <h1
                        id="lp-hero-title"
                        className="mt-6 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-[4.4rem] font-semibold tracking-[-0.035em] text-[color:var(--lp-ink)]"
                    >
                        Calm clinic days, one token at a time.
                    </h1>
                    <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[color:var(--lp-muted)]">
                        MedVisit gives every patient a token number for their doctor's session and puts the queue on a
                        screen the whole waiting room can see. Nobody crowds the door asking if it's their turn.
                    </p>

                    <div className="mt-9 flex flex-wrap items-center gap-3.5">
                        <Link
                            href={getStartedHref}
                            className="inline-flex items-center justify-center rounded-2xl bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-600 active:scale-98"
                        >
                            Get started
                        </Link>
                        <Link
                            href="/demo"
                            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#1E6FD9]/10 via-[#0E9E8F]/15 to-teal-500/10 hover:from-[#1E6FD9]/20 hover:to-[#0E9E8F]/25 border border-[#0E9E8F]/35 dark:border-teal-400/40 px-6 py-3.5 text-base font-bold text-slate-900 dark:text-white shadow-xs transition active:scale-98"
                        >
                            <span>Try the live demo →</span>
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-300 underline underline-offset-4 transition ml-1"
                        >
                            View pricing
                        </Link>
                    </div>
                    <p className="mt-5 text-sm text-[color:var(--lp-muted)]">
                        Monthly plans per clinic, billed in rupees.
                    </p>
                </div>

                <div className="pb-16">
                    <TokenBoard playing={playing} />
                </div>
            </div>
        </section>
    );
}
