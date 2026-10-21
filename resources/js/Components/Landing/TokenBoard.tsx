import React from 'react';
import { Volume2 } from 'lucide-react';
import RollingNumber from './RollingNumber';
import { useTicker } from './useLandingMotion';

const FIRST_TOKEN = 14;
const LAST_TOKEN = 22;
const BOOKED = 23;
const YOUR_TOKEN = 22;
const TICK_MS = 3200;

interface Props {
    playing: boolean;
}

/**
 * The hero's waiting-room display: "now serving" rolls 14 → 22, the waiting count
 * drops, and a chime ring pulses on every call. Then the demo session restarts.
 */
export default function TokenBoard({ playing }: Props) {
    const tick = useTicker(TICK_MS, playing);
    const step = tick % (LAST_TOKEN - FIRST_TOKEN + 2);
    const current = FIRST_TOKEN + Math.min(step, LAST_TOKEN - FIRST_TOKEN);
    const waiting = BOOKED - current;
    const ahead = YOUR_TOKEN - current;
    const next = [1, 2, 3].map((n) => current + n).filter((n) => n <= BOOKED);

    return (
        <div
            role="img"
            aria-label={`Example waiting room display. Now serving token ${current}, ${waiting} patients waiting.`}
            className="relative mx-auto w-full max-w-md"
        >
            <div className="lp-board-shadow">
                <div className="lp-board lp-ticket rounded-[28px] [--notch-y:62%]">
                    <div className="flex items-center justify-between px-5 sm:px-7 pt-5 sm:pt-6">
                        <div>
                            <p className="text-sm font-semibold text-white">General OPD</p>
                            <p className="text-xs text-blue-100/80">Evening session, room 2</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                            <span className="lp-live-dot h-2 w-2 rounded-full bg-[#4fd1c3]" />
                            Live
                        </span>
                    </div>

                    <div className="px-5 sm:px-7 pt-6 pb-7">
                        <div className="flex items-center gap-3 text-sm font-medium text-blue-100/90">
                            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7a59]/20 text-[#ffb39f]">
                                <Volume2 className="h-4 w-4" />
                                <span key={`a${current}`} className="lp-chime is-ringing" />
                                <span key={`b${current}`} className="lp-chime is-ringing lp-chime-late" />
                            </span>
                            Now serving
                        </div>
                        <div className="lp-now mt-2 text-[6.5rem] sm:text-[8.5rem] font-bold leading-none tracking-tight">
                            <RollingNumber value={current} />
                        </div>
                    </div>

                    <div className="lp-perf mx-6" />

                    <div className="grid grid-cols-[1fr_auto] items-end gap-4 px-5 sm:px-7 pt-5 pb-6">
                        <div>
                            <p className="text-xs font-medium text-blue-100/80">Up next</p>
                            <div className="mt-2 flex gap-2 min-h-[2.25rem]">
                                {next.map((n) => (
                                    <span
                                        key={n}
                                        className="lp-next-chip lp-tabular inline-flex h-9 min-w-[2.75rem] items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] px-2 text-base font-semibold text-white"
                                    >
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-blue-100/80">Waiting</p>
                            <p className="mt-1 text-3xl font-bold leading-none text-[#7fe3d8]">
                                <RollingNumber value={waiting} minDigits={1} />
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* The patient's side of the same queue */}
            <div className="lp-glass absolute -bottom-[4.5rem] left-4 sm:-left-6 w-56 rounded-2xl p-3.5 shadow-lg shadow-slate-900/10">
                <div className="flex items-center gap-3">
                    <span className="lp-ticket lp-tabular inline-flex h-11 w-14 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white [--notch:5px]">
                        {YOUR_TOKEN}
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Your token</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {ahead === 0 ? 'Your turn now' : `${ahead} ahead of you`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
