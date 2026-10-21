import React, { useRef } from 'react';
import { Link } from '@inertiajs/react';
import { useInView, usePrefersReducedMotion } from './useLandingMotion';

interface Props {
    getStartedHref: string;
}

export default function FinalCta({ getStartedHref }: Props) {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref);
    const reduced = usePrefersReducedMotion();

    return (
        <section
            ref={ref}
            data-play={inView && !reduced}
            aria-labelledby="lp-cta-title"
            className="mx-auto max-w-6xl px-4 sm:px-6 pb-8"
        >
            <div className="lp-board relative overflow-hidden rounded-[32px] px-6 py-12 sm:px-12 sm:py-16">
                <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
                    <div>
                        <h2 id="lp-cta-title" className="text-3xl sm:text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-white">
                            Give your waiting room a queue it can see.
                        </h2>
                        <p className="mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-blue-100/90">
                            Register your clinic, add your doctors and their sessions, and start issuing tokens.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                            <Link
                                href={getStartedHref}
                                className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:!outline-white"
                            >
                                Get started
                            </Link>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 focus-visible:!outline-white"
                            >
                                View pricing
                            </Link>
                        </div>
                    </div>

                    {/* Token dispenser printing ticket 01 */}
                    <div aria-hidden="true" className="mx-auto w-full max-w-[15rem]">
                        <div className="relative z-10 h-4 rounded-full bg-[#06132a] ring-1 ring-white/15" />
                        <div className="-mt-2 mx-3 h-64 overflow-hidden">
                            <div className="lp-cta-ticket pt-2">
                                <div className="lp-ticket rounded-b-2xl bg-white px-6 pb-6 pt-6 text-center text-slate-900 [--notch-y:70%]">
                                    <p className="text-sm font-medium text-slate-600">Token</p>
                                    <p className="lp-tabular mt-1 text-7xl font-bold leading-none tracking-tight text-[#c12b08]">01</p>
                                    <p className="mt-3 text-sm font-medium text-slate-700">Your clinic, first patient</p>
                                    <div className="mt-6 border-t-2 border-dashed border-slate-200" />
                                    <p className="mt-4 text-xs text-slate-600">Please take a seat</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
