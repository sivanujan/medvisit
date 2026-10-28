import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import RollingNumber from '@/Components/Landing/RollingNumber';
import { useInView, usePrefersReducedMotion } from '@/Components/Landing/useLandingMotion';
import './tv-display.css';

const FIRST_TOKEN = 7;
const LAST_TOKEN = 19;
const TICK_MS = 4000;

interface Props {
    clinicName: string;
    logoUrl?: string | null;
    /** Clinic brand colour; MedVisit blue when the clinic has none. */
    brandColor?: string | null;
    /** Smaller, motionless version (password pages). */
    still?: boolean;
}

function useColomboClock(running: boolean): string {
    const format = () =>
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Colombo',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(new Date());
    const [time, setTime] = useState(format);
    useEffect(() => {
        if (!running) return;
        const id = window.setInterval(() => setTime(format()), 15_000);
        return () => window.clearInterval(id);
    }, [running]);
    return time.toUpperCase();
}

/**
 * Decorative waiting-room TV: a "Now serving" token that rolls forward every few seconds.
 * Every number is made up; it shows no real queue, patient, doctor or session data.
 */
export default function TvDisplay({ clinicName, logoUrl, brandColor, still = false }: Props) {
    const stageRef = useRef<HTMLDivElement>(null);
    const reduced = usePrefersReducedMotion();
    const inView = useInView(stageRef);
    const animate = !still && !reduced;
    const playing = animate && inView;

    const [token, setToken] = useState(FIRST_TOKEN);
    useEffect(() => {
        if (!playing) return;
        const id = window.setInterval(() => setToken((t) => (t >= LAST_TOKEN ? FIRST_TOKEN : t + 1)), TICK_MS);
        return () => window.clearInterval(id);
    }, [playing]);

    const time = useColomboClock(!still && inView);
    const [logoBroken, setLogoBroken] = useState(false);
    const brand = brandColor || '#1E6FD9';
    const upNext = [1, 2, 3].map((n) => token + n);

    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = stageRef.current;
        if (!el || !animate) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    };
    const onLeave = () => {
        stageRef.current?.style.setProperty('--mx', '0');
        stageRef.current?.style.setProperty('--my', '0');
    };

    return (
        <div
            ref={stageRef}
            className={`tv-stage ${still ? 'tv-still' : ''}`}
            data-play={playing}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            aria-hidden="true"
            style={{ '--brand': brand } as CSSProperties}
        >
            <div className="tv-frame">
                <div className="tv-screen">
                    <div className="tv-header">
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span className="tv-logo">
                                {logoUrl && !logoBroken ? (
                                    <img src={logoUrl} alt="" onError={() => setLogoBroken(true)} />
                                ) : (
                                    clinicName.trim().charAt(0).toUpperCase()
                                )}
                            </span>
                            <span className="truncate">{clinicName}</span>
                        </span>
                        <span className="tv-clock tabular-nums">{time}</span>
                    </div>

                    <div className="tv-body">
                        <div className="tv-now">
                            <p className="tv-label">NOW SERVING</p>
                            <div className="relative inline-flex">
                                {playing && <span key={`r1-${token}`} className="tv-ripple" />}
                                {playing && <span key={`r2-${token}`} className="tv-ripple tv-ripple-late" />}
                                <span className="tv-token">
                                    <RollingNumber value={token} />
                                </span>
                            </div>
                            <p className="tv-room">Room 2</p>
                        </div>
                        <div className="tv-next">
                            <p className="tv-label">UP NEXT</p>
                            <div key={token} className={`tv-next-row ${playing ? 'tv-shift' : ''}`}>
                                {upNext.map((n) => (
                                    <span key={n} className="tv-chip tabular-nums">
                                        {String(n).padStart(2, '0')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <span className="tv-progress-track">{playing && <span key={token} className="tv-progress" />}</span>
                    <span className="tv-glare" />
                </div>
            </div>
            <span className="tv-wall-shadow" />
        </div>
    );
}
