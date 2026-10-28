import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useInView, usePrefersReducedMotion } from '@/Components/Landing/useLandingMotion';
import './central-login.css';

/** Fictional clinics for the demo loop. */
const EXAMPLES = [
    { sub: 'nallurmedical', name: 'Nallur Medical Centre', color: '#1E6FD9' },
    { sub: 'kandyfamilycare', name: 'Kandy Family Care', color: '#0E9E8F' },
    { sub: 'galleopd', name: 'Galle OPD Clinic', color: '#E8603D' },
];

const TYPE_MS = 75;
const ERASE_MS = 28;
const HOLD_MS = 2000;
const OPEN_TYPE_MS = 18;

interface Props {
    /** Base domain shown after the clinic part, e.g. "medvisit.lk". */
    baseHost: string;
    /** What the visitor is typing in the clinic address field; takes over the address bar. */
    live?: string;
    /** Set when a clinic was found: the bar types its real address before the page leaves. */
    opening?: { subdomain: string; name: string } | null;
}

type Phase = 'typing' | 'hold' | 'erasing';

/** Cycles through the example addresses: type, show the clinic, erase, next. */
function useTypingLoop(enabled: boolean) {
    const [index, setIndex] = useState(0);
    const [count, setCount] = useState(enabled ? 0 : EXAMPLES[0].sub.length);
    const [phase, setPhase] = useState<Phase>(enabled ? 'typing' : 'hold');

    useEffect(() => {
        if (!enabled) return;
        const target = EXAMPLES[index].sub;
        let delay = TYPE_MS;
        let step: () => void;

        if (phase === 'typing') {
            step = () => (count < target.length ? setCount(count + 1) : setPhase('hold'));
        } else if (phase === 'hold') {
            delay = HOLD_MS;
            step = () => setPhase('erasing');
        } else {
            delay = ERASE_MS;
            step = () => {
                if (count > 0) return setCount(count - 1);
                setIndex((index + 1) % EXAMPLES.length);
                setPhase('typing');
            };
        }

        const id = window.setTimeout(step, delay);
        return () => window.clearTimeout(id);
    }, [enabled, index, count, phase]);

    return { example: EXAMPLES[index], typed: EXAMPLES[index].sub.slice(0, count), phase };
}

/** Types `target` from scratch, fast; used for the real clinic on success. */
function useQuickType(target: string | null, reduced: boolean) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!target) return setCount(0);
        if (reduced) return setCount(target.length);
        setCount(0);
        let n = 0;
        const id = window.setInterval(() => {
            n += 1;
            setCount(n);
            if (n >= target.length) window.clearInterval(id);
        }, OPEN_TYPE_MS);
        return () => window.clearInterval(id);
    }, [target, reduced]);
    return target ? target.slice(0, count) : '';
}

function SignInPreview({ initial, name, color }: { initial: string; name: string; color: string }) {
    return (
        <div className="cl-preview">
            <div className="flex items-center gap-3">
                <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{ background: color }}
                >
                    {initial}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[color:var(--cl-ink)]">{name}</p>
                    <p className="text-xs text-[color:var(--cl-muted)]">Staff sign in</p>
                </div>
            </div>
            <div className="mt-5 space-y-2.5">
                <span className="cl-field" />
                <span className="cl-field" />
                <span className="cl-button" style={{ background: color }} />
            </div>
        </div>
    );
}

export default function WorkspaceMockup({ baseHost, live, opening }: Props) {
    const stageRef = useRef<HTMLDivElement>(null);
    const reduced = usePrefersReducedMotion();
    const inView = useInView(stageRef);
    const liveText = (live || '').trim();
    const takeover = !!opening || liveText.length > 0;

    const loop = useTypingLoop(inView && !reduced && !takeover);
    const openingTyped = useQuickType(opening ? opening.subdomain : null, reduced);

    let typed: string;
    let card: { key: string; initial: string; name: string; color: string } | null;
    if (opening) {
        typed = openingTyped;
        card = {
            key: `open-${opening.subdomain}`,
            initial: opening.name.charAt(0).toUpperCase(),
            name: opening.name,
            color: '#1E6FD9',
        };
    } else if (liveText) {
        typed = liveText;
        card = { key: 'live', initial: liveText.charAt(0).toUpperCase(), name: liveText, color: '#1E6FD9' };
    } else {
        typed = loop.typed;
        card =
            loop.phase === 'hold'
                ? {
                      key: loop.example.sub,
                      initial: loop.example.name.charAt(0),
                      name: loop.example.name,
                      color: loop.example.color,
                  }
                : null;
    }

    // Slow parallax for the cards behind the window; mouse only, never with reduced motion.
    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = stageRef.current;
        if (!el || reduced) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    const onLeave = () => {
        stageRef.current?.style.setProperty('--mx', '0');
        stageRef.current?.style.setProperty('--my', '0');
    };

    return (
        <figure className="m-0">
            <div
                ref={stageRef}
                className="cl-stage"
                data-play={inView && !reduced}
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                aria-hidden="true"
            >
                <div className="cl-back cl-back-1" style={{ '--depth': 26 } as CSSProperties}>
                    <span className="cl-back-badge" style={{ background: '#0E9E8F' }}>
                        K
                    </span>
                    <span className="cl-back-line w-24" />
                    <span className="cl-back-line w-16" />
                </div>
                <div className="cl-back cl-back-2" style={{ '--depth': 40 } as CSSProperties}>
                    <span className="cl-back-badge" style={{ background: '#E8603D' }}>
                        G
                    </span>
                    <span className="cl-back-line w-20" />
                    <span className="cl-back-line w-12" />
                </div>
                <div className="cl-back cl-back-3" style={{ '--depth': 16 } as CSSProperties}>
                    <span className="cl-back-badge" style={{ background: '#1E6FD9' }}>
                        N
                    </span>
                    <span className="cl-back-line w-16" />
                </div>

                <div className="cl-window">
                    <div className="cl-chrome">
                        <span className="flex gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#FF7A59]/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                            <span className="h-2.5 w-2.5 rounded-full bg-[#0E9E8F]/80" />
                        </span>
                        <div className="cl-address" data-live={takeover ? 'true' : undefined}>
                            <Lock className="h-3.5 w-3.5 shrink-0 text-[color:var(--cl-teal)]" />
                            <span className="min-w-0 truncate">
                                <span className="font-semibold text-[color:var(--cl-ink)]">{typed}</span>
                                <span className="cl-caret" />
                                <span className="text-[color:var(--cl-muted)]">.{baseHost}</span>
                            </span>
                        </div>
                    </div>
                    <div className="cl-viewport">
                        {card ? (
                            <div key={card.key} className="cl-morph">
                                <SignInPreview initial={card.initial} name={card.name} color={card.color} />
                            </div>
                        ) : (
                            <div className="cl-skeleton">
                                <span className="cl-skel-badge" />
                                <span className="cl-skel-line w-2/3" />
                                <span className="cl-skel-line w-1/2" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <figcaption className="mt-6 text-center text-sm text-[color:var(--cl-muted)]">
                Every clinic gets its own address —{' '}
                <span className="font-medium text-[color:var(--cl-ink)]">yourclinic.{baseHost}</span>
            </figcaption>
        </figure>
    );
}
