import React, { CSSProperties, useMemo, useRef } from 'react';
import { useInView, usePrefersReducedMotion, useScrollProgress } from './useLandingMotion';

const PATIENTS = 24;
const COLUMNS = 8;

/** Small deterministic PRNG so the "crowd" looks the same on every render. */
function seeded(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Dot {
    token: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    delay: number;
    dur: number;
}

function buildDots(): Dot[] {
    const rand = seeded(7);
    return Array.from({ length: PATIENTS }, (_, i) => {
        // Crowd leans towards the doctor's door on the right.
        const x0 = 40 + Math.pow(rand(), 0.55) * 285;
        const y0 = 70 + rand() * 175;
        // Ordered queue: three rows that snake back from the door.
        const row = Math.floor(i / COLUMNS);
        const col = i % COLUMNS;
        const x1 = row % 2 === 0 ? 315 - col * 38.5 : 45.5 + col * 38.5;
        const y1 = 95 + row * 60;
        return {
            token: i + 1,
            x0,
            y0,
            x1,
            y1,
            delay: (i / PATIENTS) * 0.38,
            dur: 0.7 + rand() * 0.8,
        };
    });
}

export default function WaitingRoomStory() {
    const ref = useRef<HTMLElement>(null);
    const reduced = usePrefersReducedMotion();
    const inView = useInView(ref);
    useScrollProgress(ref, { startAt: 0, endAt: 1, reduced });
    const dots = useMemo(buildDots, []);

    return (
        <section
            ref={ref}
            aria-labelledby="lp-story-title"
            data-play={inView && !reduced}
            className="lp-story relative"
            style={{ height: reduced ? 'auto' : '240vh' }}
        >
            <div className={reduced ? 'py-20' : 'sticky top-14 sm:top-16 flex h-[calc(100svh-3.5rem)] sm:h-[calc(100svh-4rem)] items-center py-4 lg:py-12'}>
                <div className="mx-auto grid w-full max-w-6xl items-center gap-5 sm:gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
                    <div className="lp-tile rounded-[28px] p-3 sm:p-5">
                        <svg viewBox="0 0 360 290" className="h-auto w-full" aria-hidden="true">
                            {/* Room outline and the doctor's door */}
                            <rect x="12" y="44" width="336" height="234" rx="18" fill="none" stroke="var(--lp-line)" strokeWidth="2" />
                            <rect x="290" y="10" width="58" height="30" rx="8" fill="var(--lp-blue)" opacity="0.14" />
                            <text x="319" y="30" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--lp-ink)">
                                Room 2
                            </text>

                            {/* Before: people asking at the door */}
                            <g className="lp-story-fade-out" fontSize="10.5" fontWeight="500" fill="var(--lp-ink)">
                                <rect x="168" y="12" width="96" height="24" rx="12" fill="var(--lp-surface-solid)" stroke="var(--lp-line)" />
                                <text x="216" y="28" textAnchor="middle">Is it my turn?</text>
                                <rect x="20" y="12" width="118" height="24" rx="12" fill="var(--lp-surface-solid)" stroke="var(--lp-line)" />
                                <text x="79" y="28" textAnchor="middle">Who came after me?</text>
                            </g>

                            {/* After: a screen showing the queue */}
                            <g className="lp-story-fade-in">
                                <rect x="20" y="10" width="150" height="30" rx="8" fill="var(--lp-board)" />
                                <text x="32" y="30" fontSize="11" fontWeight="500" fill="#dbe9fd">
                                    Now serving
                                </text>
                                <text x="158" y="31" textAnchor="end" fontSize="15" fontWeight="700" fill="#ff9c82">
                                    01
                                </text>
                            </g>

                            {/* Queue path, appears once people line up */}
                            <path
                                className="lp-story-fade-in"
                                d="M330 95 H45.5 Q30 95 30 125 Q30 155 45.5 155 H315 Q330 155 330 185 Q330 215 315 215 H45.5"
                                fill="none"
                                stroke="var(--lp-teal)"
                                strokeOpacity="0.35"
                                strokeWidth="2"
                                strokeDasharray="4 6"
                            />

                            {dots.map((d) => (
                                <g
                                    key={d.token}
                                    className="lp-story-dot"
                                    style={
                                        {
                                            '--x0': d.x0,
                                            '--y0': d.y0,
                                            '--x1': d.x1,
                                            '--y1': d.y1,
                                            '--d': d.delay,
                                        } as CSSProperties
                                    }
                                >
                                    <g className="lp-story-jitter" style={{ '--dur': `${d.dur}s` } as CSSProperties}>
                                        <circle r="11" fill="#94a3b8" opacity="0.75" />
                                        <circle
                                            r="11"
                                            className="lp-story-calm"
                                            fill={d.token === 1 ? 'var(--lp-coral)' : 'var(--lp-blue)'}
                                        />
                                        <text
                                            className="lp-story-label"
                                            y="3.8"
                                            textAnchor="middle"
                                            fontSize="10"
                                            fontWeight="700"
                                            fill={d.token === 1 ? '#3b0d02' : '#ffffff'}
                                        >
                                            {String(d.token).padStart(2, '0')}
                                        </text>
                                    </g>
                                </g>
                            ))}
                        </svg>
                        <div className="mx-2 mb-1 mt-3 h-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                            <div className="lp-story-meter h-full rounded-full bg-gradient-to-r from-accent-400 via-primary to-secondary" />
                        </div>
                    </div>

                    <div>
                        <h2
                            id="lp-story-title"
                            className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-[-0.03em]"
                        >
                            From a crowded doorway to a queue anyone can read.
                        </h2>
                        <div className={reduced ? 'mt-8 space-y-8' : 'mt-4 sm:mt-8 grid'}>
                            <div className={reduced ? '' : 'lp-story-before [grid-area:1/1]'}>
                                <h3 className="text-lg font-semibold">Before</h3>
                                <p className="mt-2 max-w-md text-base leading-relaxed text-[color:var(--lp-muted)]">
                                    Patients arrive early and stand near the consultation room, because the only way to
                                    know whose turn it is, is to keep asking.
                                </p>
                            </div>
                            <div className={reduced ? '' : 'lp-story-after [grid-area:1/1]'}>
                                <h3 className="text-lg font-semibold">With MedVisit</h3>
                                <p className="mt-2 max-w-md text-base leading-relaxed text-[color:var(--lp-muted)]">
                                    Each patient holds a token for the doctor's session. The waiting-room screen shows who
                                    is being seen, so people take a seat and wait for their number.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
