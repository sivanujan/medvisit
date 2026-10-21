import React, { CSSProperties, ReactNode, useRef } from 'react';
import { Check, Lock } from 'lucide-react';
import { useInView, usePrefersReducedMotion, useTicker } from './useLandingMotion';

interface TileProps {
    area: string;
    title: string;
    body: string;
    children: ReactNode;
    className?: string;
}

function Tile({ area, title, body, children, className = '' }: TileProps) {
    return (
        <article className={`lp-tile lp-area-${area} flex flex-col overflow-hidden rounded-[24px] p-5 sm:p-6 ${className}`}>
            <div aria-hidden="true" className="relative flex-1 min-h-[7.5rem]">
                {children}
            </div>
            <h3 className="mt-5 text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[color:var(--lp-muted)]">{body}</p>
        </article>
    );
}

const STATUS = ['In consultation', 'Next', 'Waiting', 'Waiting'];

function QueuePreview({ playing }: { playing: boolean }) {
    const tick = useTicker(2800, playing);
    const current = 31 + (tick % 12);

    return (
        <div className="flex h-full flex-col justify-center gap-2.5">
            {STATUS.map((status, i) => {
                const token = current + i;
                const isNow = i === 0;
                return (
                    <div
                        key={token}
                        className={`lp-queue-row flex items-center justify-between rounded-2xl border px-4 py-3 ${
                            isNow
                                ? 'border-transparent bg-[color:var(--lp-board)] text-white'
                                : 'border-[color:var(--lp-line)] bg-white/60 dark:bg-white/[0.04]'
                        }`}
                        style={{ animationDelay: `${i * 60}ms` }}
                    >
                        <span className="flex items-center gap-3">
                            <span
                                className={`lp-ticket lp-tabular inline-flex h-10 w-14 items-center justify-center rounded-lg text-lg font-bold [--notch:5px] ${
                                    isNow ? 'bg-[#ff7a59] text-[#3b0d02]' : 'bg-primary/10 text-primary dark:text-primary-300'
                                }`}
                            >
                                {token}
                            </span>
                            <span className={`text-sm font-medium ${isNow ? 'text-white' : ''}`}>{status}</span>
                        </span>
                        {isNow && <span className="lp-live-dot h-2.5 w-2.5 rounded-full bg-[#4fd1c3]" />}
                    </div>
                );
            })}
        </div>
    );
}

function SessionsPreview() {
    const lanes = [
        { name: 'Dr. A', blocks: [[4, 34], [62, 26]] },
        { name: 'Dr. B', blocks: [[18, 40]] },
        { name: 'Dr. C', blocks: [[0, 22], [48, 36]] },
    ];
    return (
        <div className="relative flex h-full flex-col justify-center gap-3 overflow-hidden">
            {lanes.map((lane, i) => (
                <div key={lane.name} className="flex items-center gap-3">
                    <span className="w-11 shrink-0 text-xs font-semibold text-[color:var(--lp-muted)]">{lane.name}</span>
                    <div className="relative h-7 flex-1 rounded-lg bg-slate-200/50 dark:bg-white/[0.05]">
                        {lane.blocks.map(([left, width], j) => (
                            <span
                                key={j}
                                className={`absolute inset-y-0 rounded-lg ${
                                    (i + j) % 2 ? 'bg-secondary/80' : 'bg-primary/80'
                                }`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                            />
                        ))}
                    </div>
                </div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 left-14 right-0 overflow-hidden">
                <span
                    className="lp-sweep absolute inset-y-0 left-0 w-0.5 bg-accent"
                    style={{ '--sweep': '520px' } as CSSProperties}
                />
            </div>
        </div>
    );
}

function RecordPreview() {
    return (
        <div className="flex h-full flex-col justify-center gap-2.5">
            <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary/15 text-xs font-bold text-[color:var(--lp-teal-ink)]">
                    NP
                </span>
                <span className="h-2.5 w-24 rounded-full bg-slate-300/80 dark:bg-white/20" />
            </div>
            {[0, 0.6, 1.2].map((delay, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span
                        className="lp-record-line h-2 rounded-full bg-primary/25"
                        style={{ width: `${80 - i * 14}%`, '--delay': `${delay}s` } as CSSProperties}
                    />
                </div>
            ))}
        </div>
    );
}

function ReceiptPreview() {
    return (
        <div className="relative mx-auto flex h-full w-full max-w-[14rem] flex-col justify-center">
            <div className="relative z-10 h-3 rounded-full bg-slate-700 dark:bg-slate-500" />
            <div className="-mt-1.5 mx-2 overflow-hidden">
                <div className="lp-receipt rounded-b-xl border border-t-0 border-[color:var(--lp-line)] bg-white px-4 pb-4 pt-4 text-slate-800 shadow-sm dark:bg-slate-100">
                    <p className="flex justify-between text-xs">
                        <span className="font-semibold">Receipt</span>
                        <span className="lp-tabular text-slate-600">No. 1042</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">Token 15, General OPD</p>
                    <div className="mt-2 space-y-1.5 text-xs lp-tabular">
                        <p className="flex justify-between">
                            <span>Consultation</span>
                            <span>Rs. 2,500</span>
                        </p>
                        <p className="flex justify-between">
                            <span>Medicines</span>
                            <span>Rs. 840</span>
                        </p>
                        <p className="flex justify-between">
                            <span>Clinic fee</span>
                            <span>Rs. 300</span>
                        </p>
                        <p className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 font-bold">
                            <span>Total</span>
                            <span>Rs. 3,640</span>
                        </p>
                    </div>
                    <p className="mt-4 text-center text-xs font-medium text-slate-600">Paid in cash</p>
                    <div className="mt-3 flex h-6 justify-center gap-[3px]">
                        {[2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1].map((w, i) => (
                            <span key={i} className="h-full bg-slate-800" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PharmacyPreview() {
    const lines = ['Amoxicillin 500 mg', 'Paracetamol 500 mg', 'Cetirizine 10 mg'];
    return (
        <div className="grid h-full gap-4 sm:grid-cols-[1.2fr_1fr] sm:items-center">
            <div className="space-y-2">
                {lines.map((line, i) => (
                    <div
                        key={line}
                        className="flex items-center justify-between rounded-xl border border-[color:var(--lp-line)] bg-white/60 px-3 py-2 dark:bg-white/[0.04]"
                    >
                        <span className="text-xs font-medium">{line}</span>
                        <span
                            className="lp-rx-tick inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-white"
                            style={{ '--delay': `${i * 0.9}s` } as CSSProperties}
                        >
                            <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-[color:var(--lp-line)] p-3">
                <p className="text-xs font-semibold">Batch stock</p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="lp-stock-bar h-full w-full rounded-full bg-secondary" />
                </div>
                <p className="mt-2 text-xs text-[color:var(--lp-muted)]">Earliest expiry dispensed first</p>
            </div>
        </div>
    );
}

function DoctorsPreview() {
    const doctors = [
        { initials: 'AP', token: 12 },
        { initials: 'SK', token: 7 },
        { initials: 'RF', token: 21 },
    ];
    return (
        <div className="flex h-full flex-col justify-center gap-2.5">
            {doctors.map((d, i) => (
                <div key={d.initials} className="flex items-center gap-3">
                    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/60 dark:text-primary-200">
                        {d.initials}
                        <span
                            className="lp-pulse-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-secondary"
                            style={{ '--delay': `${i * 0.8}s` } as CSSProperties}
                        />
                    </span>
                    <span className="flex-1 border-b border-dashed border-[color:var(--lp-line)]" />
                    <span className="lp-tabular text-sm font-semibold">No. {d.token}</span>
                </div>
            ))}
        </div>
    );
}

function SubdomainPreview({ host }: { host: string }) {
    return (
        <div className="flex h-full flex-col justify-center">
            <div className="rounded-2xl border border-[color:var(--lp-line)] bg-white/70 p-3 dark:bg-white/[0.04]">
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary/80" />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-900/70">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-secondary-700 dark:text-secondary-300" />
                    <span className="relative truncate font-medium">
                        <span className="lp-type inline-block">yourclinic.{host}</span>
                        <span className="lp-caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-primary" />
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className="h-10 rounded-lg bg-primary/15" />
                    <span className="h-10 rounded-lg bg-secondary/15" />
                    <span className="h-10 rounded-lg bg-accent/15" />
                </div>
            </div>
        </div>
    );
}

function RolesPreview() {
    const roles = ['Clinic admin', 'Doctor', 'Receptionist', 'Pharmacist'];
    return (
        <div className="flex h-full flex-wrap content-center gap-2">
            {roles.map((role, i) => (
                <span
                    key={role}
                    className="lp-role rounded-full border border-[color:var(--lp-line)] px-4 py-2 text-sm font-medium"
                    style={{ '--delay': `${i * 2}s` } as CSSProperties}
                >
                    {role}
                </span>
            ))}
        </div>
    );
}

export default function FeatureBento({ host }: { host: string }) {
    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref);
    const reduced = usePrefersReducedMotion();
    const playing = inView && !reduced;

    return (
        <section
            ref={ref}
            data-play={playing}
            aria-labelledby="lp-features-title"
            className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28"
        >
            <div className="max-w-2xl">
                <h2 id="lp-features-title" className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
                    Everything the front desk and the doctor share
                </h2>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-[color:var(--lp-muted)]">
                    One system from the first booking to the printed receipt.
                </p>
            </div>

            <div className="lp-bento mt-12 grid gap-4 sm:gap-5 md:grid-cols-2">
                <Tile
                    area="q"
                    className="md:col-span-2 lg:col-span-1"
                    title="Live token queue"
                    body="Call the next patient in one click. The TV display, front desk and doctor all see the same queue."
                >
                    <QueuePreview playing={playing} />
                </Tile>
                <Tile
                    area="s"
                    title="Doctor sessions"
                    body="Set session times, rooms and token limits for each doctor, with reusable templates and leave days."
                >
                    <SessionsPreview />
                </Tile>
                <Tile
                    area="r"
                    title="Patient records"
                    body="Visit history, diagnoses and prescriptions for every patient, with an audit trail."
                >
                    <RecordPreview />
                </Tile>
                <Tile
                    area="b"
                    title="LKR billing and receipts"
                    body="Bills with fee items, printed receipts and doctor payouts, all in rupees."
                >
                    <ReceiptPreview />
                </Tile>
                <Tile
                    area="x"
                    title="Prescriptions and pharmacy stock"
                    body="Prescribe from your medicine list, dispense by batch and keep track of stock and expiry dates."
                >
                    <PharmacyPreview />
                </Tile>
                <Tile
                    area="m"
                    title="Multi-doctor clinics"
                    body="Each doctor keeps their own sessions and queue under one clinic."
                >
                    <DoctorsPreview />
                </Tile>
                <Tile
                    area="d"
                    title="Your own clinic address"
                    body="A subdomain with your booking page and a clinic website you can edit."
                >
                    <SubdomainPreview host={host} />
                </Tile>
                <Tile
                    area="l"
                    title="Staff roles"
                    body="Admins, doctors, receptionists and pharmacists each get the screens their work needs."
                >
                    <RolesPreview />
                </Tile>
            </div>
        </section>
    );
}
