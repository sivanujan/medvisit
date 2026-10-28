import React from 'react';
import { Link } from '@inertiajs/react';
import Callout from '@/Components/Public/Callout';
import { PolicyPageData } from './types';

export const disputePolicyData: PolicyPageData = {
    title: 'Dispute Resolution Policy',
    eyebrow: 'Merchant Policy',
    description: 'MedVisit Dispute Resolution Policy, merchant dispute workflows, card chargebacks, and escalation.',
    lastUpdated: '21 October 2026',
    readingTime: '2 min read',
    tokenMotif: 'DSP-03',
    keyPoints: [
        'Contact us first before raising a dispute with your bank or card issuer.',
        'We acknowledge all complaints in writing within 2 working days.',
        'Formal review and written resolution decision delivered within 7 working days.',
        'Governed under Sri Lankan law with escalation review options.',
    ],
    sections: [
        {
            id: 'contact-us-first',
            title: 'Contact us first',
            render: ({ business }) => {
                const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
                const displayPhone = business.phone_display || '070 129 1688';
                const telHref = business.phone_raw ? `tel:${business.phone_raw}` : 'tel:+94701291688';

                return (
                    <div className="space-y-3">
                        <p>
                            If you have a problem with a charge or with the service, please contact us before raising a dispute with your bank. Most issues can be resolved quickly. Email{' '}
                            <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline">
                                {supportEmail}
                            </a>{' '}
                            or call or WhatsApp{' '}
                            <a href={telHref} className="text-slate-800 dark:text-slate-200 font-medium">
                                {displayPhone}
                            </a>{' '}
                            with your clinic name, the payment date and amount, and a description of the issue.
                        </p>
                        <Callout variant="info" title="Fast resolution">
                            Direct communication allows our team to address billing and account queries immediately without bank processing delays.
                        </Callout>
                    </div>
                );
            },
        },
        {
            id: 'our-process',
            title: 'Our process',
            render: () => (
                <ul className="list-disc pl-5 space-y-2 my-2">
                    <li>We acknowledge your complaint within 2 working days.</li>
                    <li>We review payment records and your account, and may ask for more information.</li>
                    <li>We give you a written decision within 7 working days of acknowledgement.</li>
                    <li>
                        If we agree a refund or credit is due, it is handled under our{' '}
                        <Link href="/refund-policy" className="text-primary font-medium underline">
                            Refund Policy
                        </Link>.
                    </li>
                </ul>
            ),
        },
        {
            id: 'card-chargebacks',
            title: 'Card chargebacks',
            render: () => (
                <p>
                    If you raise a chargeback with your bank, it will be handled through our secure card payment partner and the card networks' rules. We will provide our payment records, your subscription history and evidence of your consent to recurring charges. We may suspend the account while a chargeback is open.
                </p>
            ),
        },
        {
            id: 'escalation',
            title: 'Escalation',
            render: () => (
                <p>
                    If you are not satisfied with our decision, you may write to us again to request a review by MedVisit management. If the dispute still cannot be resolved, it will be governed by the laws of Sri Lanka and may be referred to the courts of Sri Lanka.
                </p>
            ),
        },
        {
            id: 'contact',
            title: 'Contact',
            render: ({ business }) => {
                const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
                const generalEmail = business.general_email || 'hello@medvisit.lk';
                const displayPhone = business.phone_display || '070 129 1688';
                const telHref = business.phone_raw ? `tel:${business.phone_raw}` : 'tel:+94701291688';

                return (
                    <p>
                        {business.name}. Support: email{' '}
                        <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline">
                            {supportEmail}
                        </a>. General enquiries: email{' '}
                        <a href={`mailto:${generalEmail}`} className="text-secondary font-medium underline">
                            {generalEmail}
                        </a>. Call or WhatsApp{' '}
                        <a href={telHref} className="text-slate-800 dark:text-slate-200 font-medium">
                            {displayPhone}
                        </a>.
                    </p>
                );
            },
        },
    ],
};
