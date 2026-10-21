import React from 'react';

const ITEMS = [
    {
        mark: 'Rs.',
        title: 'Billing in rupees',
        body: 'Bills, receipts and doctor payouts are all in LKR.',
    },
    {
        mark: 'OPD',
        title: 'Channeling sessions',
        body: 'Doctors run timed sessions with a token limit, the way channeling already works here.',
    },
    {
        mark: 'LKR',
        title: 'Local payment gateway',
        body: 'Your subscription is charged in rupees through Payments.lk, by Visa or Mastercard.',
    },
];

export default function SriLankaStrip() {
    return (
        <section aria-labelledby="lp-lk-title" className="relative overflow-hidden border-y border-[color:var(--lp-line)] bg-primary-50/70 dark:bg-primary-950/40">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
                <h2 id="lp-lk-title" className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
                    Built for clinics in Sri Lanka
                </h2>

                <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {ITEMS.map((item) => (
                        <div key={item.title}>
                            <span
                                aria-hidden="true"
                                className="lp-ticket inline-flex h-10 min-w-[3.5rem] items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-primary shadow-sm dark:bg-slate-900 dark:text-primary-300 [--notch:5px]"
                            >
                                {item.mark}
                            </span>
                            <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[color:var(--lp-muted)]">{item.body}</p>
                        </div>
                    ))}

                    <div>
                        <span
                            aria-hidden="true"
                            className="lp-ticket inline-flex h-10 min-w-[3.5rem] items-center justify-center rounded-lg bg-white px-3 text-sm font-bold text-primary shadow-sm dark:bg-slate-900 dark:text-primary-300 [--notch:5px]"
                        >
                            Rx
                        </span>
                        <h3 className="mt-4 text-base font-semibold">Prescriptions in three languages</h3>
                        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[color:var(--lp-muted)]">
                            The app is in English. Printed prescriptions can show timings and frequency in Tamil or
                            Sinhala.
                        </p>
                        <ul className="mt-3 space-y-1 text-sm">
                            <li lang="en">After meals</li>
                            <li lang="ta">சாப்பாட்டிற்குப் பின்</li>
                            <li lang="si">ආහාර ගැනීමෙන් පසු</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
