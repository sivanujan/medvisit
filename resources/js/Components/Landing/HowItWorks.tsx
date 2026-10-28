import React, { CSSProperties, useRef } from 'react';
import { CalendarCheck, MonitorSmartphone, Megaphone, Ticket } from 'lucide-react';
import { usePrefersReducedMotion, useScrollProgress } from './useLandingMotion';

const STEPS = [
    {
        title: 'Patient books',
        body: "Online from your clinic's booking page, or at the front desk for walk-ins.",
        icon: CalendarCheck,
    },
    {
        title: 'Gets a token',
        body: "MedVisit gives the next token number in that doctor's session, with a link to check its status.",
        icon: Ticket,
    },
    {
        title: 'Watches the queue',
        body: 'The waiting-room TV updates live. Patients can open their link any time to see the current token.',
        icon: MonitorSmartphone,
    },
    {
        title: 'Doctor calls',
        body: 'The doctor or receptionist calls the next token. The TV chimes and shows the number.',
        icon: Megaphone,
    },
];

export default function HowItWorks() {
    const ref = useRef<HTMLDivElement>(null);
    const reduced = usePrefersReducedMotion();
    useScrollProgress(ref, { startAt: 0.85, endAt: 0.95, reduced });

    return (
        <section id="how-it-works" aria-labelledby="lp-how-title" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-2xl">
                <h2 id="lp-how-title" className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
                    How a visit works
                </h2>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-[color:var(--lp-muted)]">
                    Four steps from booking to consultation, the same for online bookings and walk-ins.
                </p>
            </div>

            <div ref={ref} className="lp-steps relative mt-14">
                {/* Track and the progress line drawn by scroll */}
                <div
                    aria-hidden="true"
                    className="absolute left-[27px] top-2 bottom-2 w-[3px] rounded-full bg-slate-200 dark:bg-white/10 lg:left-8 lg:right-8 lg:top-[27px] lg:bottom-auto lg:h-[3px] lg:w-auto"
                >
                    <div className="lp-steps-line h-full w-full rounded-full bg-gradient-to-b from-primary to-secondary lg:bg-gradient-to-r" />
                </div>

                <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-8">
                    {STEPS.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <li
                                key={step.title}
                                className="lp-step grid grid-cols-[56px_1fr] gap-5 lg:grid-cols-1"
                                style={{ '--at': i * 0.28 } as CSSProperties}
                            >
                                <span
                                    aria-hidden="true"
                                    className="lp-step-badge lp-ticket lp-tabular flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 text-lg font-bold [--notch:6px]"
                                >
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <div className="lp-step-body">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                                        <span className="sr-only">Step {i + 1}: </span>
                                        <Icon className="h-5 w-5 text-primary dark:text-primary-300" aria-hidden="true" />
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-[0.95rem] leading-relaxed text-[color:var(--lp-muted)]">
                                        {step.body}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
