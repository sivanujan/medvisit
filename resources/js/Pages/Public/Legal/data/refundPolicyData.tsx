import React from 'react';
import { Link } from '@inertiajs/react';
import Callout from '@/Components/Public/Callout';
import { PolicyPageData } from './types';

export const refundPolicyData: PolicyPageData = {
    title: 'Refund and Cancellation Policy',
    eyebrow: 'Merchant Policy',
    description: 'MedVisit Refund and Cancellation Policy for clinic subscriptions billed in LKR.',
    lastUpdated: '22 October 2026',
    readingTime: '3 min read',
    tokenMotif: 'REF-02',
    keyPoints: [
        'Cancel anytime from Billing with zero penalties or lock-in contracts.',
        'Submit refund requests directly from Settings → Billing or by emailing support.',
        'Instant automated eligibility check against policy terms with admin review in 2 business days.',
        'Approved refunds processed in 3–5 business days with official credit note (CN-YYYY-XXXXXX).',
    ],
    sections: [
        {
            id: 'overview',
            title: 'Overview',
            render: () => (
                <p>
                    This policy explains how cancellations and refunds work for MedVisit subscriptions. All payments are made in Sri Lankan Rupees (LKR) through our secure card payment partner.
                </p>
            ),
        },
        {
            id: 'cancelling-your-subscription',
            title: 'Cancelling your subscription',
            render: () => (
                <>
                    <p>
                        You can cancel at any time from the Billing page in your clinic dashboard. Cancellation stops all future charges. Your clinic keeps access until the end of the billing period you have already paid for.
                    </p>
                    <Callout variant="info" title="Cancel anytime from the Billing page">
                        You can cancel your subscription directly from your clinic Billing settings at any time without calling or waiting for support approval.
                    </Callout>
                </>
            ),
        },
        {
            id: 'when-you-are-entitled-to-a-full-refund',
            title: 'When you are entitled to a full refund',
            render: () => (
                <ul className="list-disc pl-5 space-y-2 my-2">
                    <li>
                        <strong>Duplicate charge:</strong> if you were charged more than once for the same billing period.
                    </li>
                    <li>
                        <strong>Charge after cancellation:</strong> if you were charged after you had successfully cancelled.
                    </li>
                    <li>
                        <strong>First payment, unused:</strong> if you cancel within 7 days of your first-ever subscription payment and your clinic has not used the service (for example, no appointments or tokens created).
                    </li>
                    <li>
                        <strong>Billing error:</strong> if you were charged an amount different from your selected plan's price.
                    </li>
                </ul>
            ),
        },
        {
            id: 'service-downtime',
            title: 'Service downtime',
            render: ({ business }) => {
                const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
                return (
                    <div className="space-y-3">
                        <p>
                            If MedVisit is unavailable for more than 48 continuous hours due to a fault on our side, we will refund the amount for the affected days, calculated pro-rata from your monthly plan price (for example, 3 days of downtime on the Pro plan = Rs. 9,000 ÷ 30 × 3 = Rs. 900). This is a partial refund for the affected days only, not a full refund of the month. Downtime of 48 hours or less, and planned maintenance announced in advance, are not eligible for a refund. To request it, email{' '}
                            <a href={`mailto:${supportEmail}`} className="text-primary font-semibold underline">
                                {supportEmail}
                            </a>{' '}
                            within 14 days of the outage or select the verified outage directly from your Billing center.
                        </p>
                    </div>
                );
            },
        },
        {
            id: 'when-refunds-are-not-given',
            title: 'When refunds are not given',
            render: () => (
                <>
                    <Callout variant="coral" title="Non-eligible scenarios">
                        Refunds are not granted for partial months after voluntary cancellation or accounts suspended for terms violations.
                    </Callout>
                    <ul className="list-disc pl-5 space-y-2 my-2">
                        <li>
                            For unused days in a billing period after you cancel (you keep access until the period ends instead).
                        </li>
                        <li>
                            For partial months, downgrades within a billing period, or if you simply stop using the service without cancelling.
                        </li>
                        <li>
                            If an account is suspended for breaching our{' '}
                            <Link href="/terms" className="text-primary font-medium underline">
                                Terms and Conditions
                            </Link>.
                        </li>
                    </ul>
                </>
            ),
        },
        {
            id: 'how-to-request-a-refund',
            title: 'How to request a refund',
            render: ({ business }) => {
                const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
                return (
                    <div className="space-y-3">
                        <p>
                            You can submit a refund request directly through your clinic dashboard by navigating to <strong>Settings → Billing → Payment History</strong> and clicking <strong>Request Refund</strong> next to any eligible paid charge. You will see an instant automated eligibility check and breakdown according to our policy terms before you submit.
                        </p>
                        <p>
                            Alternatively, you may email{' '}
                            <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline">
                                {supportEmail}
                            </a>{' '}
                            from your registered email address with your clinic name, invoice/receipt number, payment date, amount, and reason.
                        </p>
                        <Callout variant="info" title="Review and processing timelines">
                            All requests undergo administrative review within <strong>2 business days</strong>. Once approved, the refund is executed within <strong>3–5 business days</strong> back to your original payment card or bank account, accompanied by an official Sri Lankan Credit Note (<code>CN-YYYY-XXXXXX</code>) accessible anytime from your Billing Center.
                        </Callout>
                    </div>
                );
            },
        },
        {
            id: 'how-refunds-are-paid',
            title: 'How refunds are paid',
            render: () => (
                <p>
                    Approved refunds — whether a full refund or a service downtime refund — are returned to the original card used for payment. Refunds are processed within 7–14 working days after approval. The time for the amount to appear in your account depends on your bank.
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
