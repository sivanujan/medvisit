import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useInView, usePrefersReducedMotion } from './useLandingMotion';

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
    const inView = useInView(ref, '80px');
    const dots = useMemo(buildDots, []);

    const [p, setP] = useState(reduced ? 1 : 0);
    const currentP = useRef(reduced ? 1 : 0);
    const animFrame = useRef<number | null>(null);
    const hasAutoPlayed = useRef(false);

    const animateTo = (target: number, duration = 1600) => {
        if (reduced) {
            currentP.current = target;
            if (ref.current) ref.current.style.setProperty('--p', target.toString());
            setP(target);
            return;
        }

        if (animFrame.current) {
            cancelAnimationFrame(animFrame.current);
            animFrame.current = null;
        }

        const startP = currentP.current;
        const diff = target - startP;
        if (Math.abs(diff) < 0.005) {
            currentP.current = target;
            if (ref.current) ref.current.style.setProperty('--p', target.toString());
            setP(target);
            return;
        }

        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Smooth easeInOut cubic curve
            const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            const nextVal = startP + diff * eased;

            currentP.current = nextVal;
            if (ref.current) {
                ref.current.style.setProperty('--p', nextVal.toFixed(4));
            }
            setP(nextVal);

            if (progress < 1) {
                animFrame.current = requestAnimationFrame(tick);
            } else {
                currentP.current = target;
                if (ref.current) {
                    ref.current.style.setProperty('--p', target.toString());
                }
                setP(target);
                animFrame.current = null;
            }
        };

        animFrame.current = requestAnimationFrame(tick);
    };

    // Auto-play when scrolled into view (once only, disabled with prefers-reduced-motion)
    useEffect(() => {
        if (reduced) {
            if (animFrame.current) {
                cancelAnimationFrame(animFrame.current);
                animFrame.current = null;
            }
            currentP.current = 1;
            if (ref.current) ref.current.style.setProperty('--p', '1');
            setP(1);
            return;
        }

        if (inView && !hasAutoPlayed.current) {
            hasAutoPlayed.current = true;
            const timer = setTimeout(() => {
                animateTo(1, 1800);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [inView, reduced]);

    useEffect(() => {
        return () => {
            if (animFrame.current) {
                cancelAnimationFrame(animFrame.current);
            }
        };
    }, []);

    const handleReplay = () => {
        if (animFrame.current) cancelAnimationFrame(animFrame.current);
        currentP.current = 0;
        if (ref.current) ref.current.style.setProperty('--p', '0');
        setP(0);
        setTimeout(() => {
            animateTo(1, 1800);
        }, 150);
    };

    return (
        <section
            ref={ref}
            aria-labelledby="lp-story-title"
            data-play={inView && !reduced}
            className="lp-story relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24"
        >
            <div className="grid w-full items-center gap-6 sm:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
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

                    {/* Interactive Before / With MedVisit toggle */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200/80 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => animateTo(0, 1000)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    p < 0.5
                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Before (Crowded)
                            </button>
                            <button
                                type="button"
                                onClick={() => animateTo(1, 1400)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    p >= 0.5
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-teal-200" />
                                With MedVisit (Organized)
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleReplay}
                            title="Replay animation"
                            className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-xs flex items-center gap-1.5 font-medium border border-transparent hover:border-slate-200/80 dark:hover:border-white/10"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Replay</span>
                        </button>
                    </div>

                    <div className={reduced ? 'mt-6 space-y-6' : 'mt-6 grid'}>
                        <div className={reduced ? '' : 'lp-story-before [grid-area:1/1]'}>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Before MedVisit</h3>
                            <p className="mt-2 max-w-md text-base leading-relaxed text-[color:var(--lp-muted)]">
                                Patients arrive early and stand near the consultation room, because the only way to
                                know whose turn it is, is to keep asking.
                            </p>
                        </div>
                        <div className={reduced ? '' : 'lp-story-after [grid-area:1/1]'}>
                            <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-400">With MedVisit</h3>
                            <p className="mt-2 max-w-md text-base leading-relaxed text-[color:var(--lp-muted)]">
                                Each patient holds a token for the doctor's session. The waiting-room screen shows who
                                is being seen, so people take a seat and wait for their number.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
