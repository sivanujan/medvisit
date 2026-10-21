import React from 'react';
import { Plus } from 'lucide-react';

const FAQS = [
    {
        q: 'Do patients need to install an app?',
        a: "No. Patients book on your clinic's booking page in any browser, and get a link to check their token. The waiting-room display runs in a browser on any TV or screen.",
    },
    {
        q: 'Can we still take walk-in patients?',
        a: "Yes. Receptionists add walk-ins at the desk and they get the next token in the doctor's session, in the same queue as online bookings.",
    },
    {
        q: 'Can one clinic have several doctors?',
        a: 'Yes. Each doctor has their own sessions, rooms and queue. Pricing is per clinic, not per doctor.',
    },
    {
        q: 'How do we pay for MedVisit?',
        a: 'Monthly in Sri Lankan rupees, by Visa or Mastercard through Payments.lk. You can cancel from the billing page in your dashboard at any time.',
    },
    {
        q: 'Can prescriptions be printed in Tamil or Sinhala?',
        a: 'Yes. Choose a default print language in your clinic settings, and timing and frequency labels are printed in Tamil or Sinhala. The rest of the app is in English.',
    },
];

export default function LandingFaq() {
    return (
        <section id="faq" aria-labelledby="lp-faq-title" className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-24">
            <h2 id="lp-faq-title" className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
                Questions clinics ask
            </h2>
            <div className="mt-10 divide-y divide-[color:var(--lp-line)] border-y border-[color:var(--lp-line)]">
                {FAQS.map((item) => (
                    <details key={item.q} className="lp-faq group">
                        <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-left text-base sm:text-lg font-semibold">
                            {item.q}
                            <span className="lp-faq-chevron inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--lp-line)] text-primary dark:text-primary-300">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                            </span>
                        </summary>
                        <p className="max-w-2xl pb-6 text-[0.95rem] sm:text-base leading-relaxed text-[color:var(--lp-muted)]">
                            {item.a}
                        </p>
                    </details>
                ))}
            </div>
        </section>
    );
}
