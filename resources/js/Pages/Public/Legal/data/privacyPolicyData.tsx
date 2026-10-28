import React from 'react';
import Callout from '@/Components/Public/Callout';
import { PolicyPageData } from './types';

export const privacyPolicyData: PolicyPageData = {
    title: 'Privacy Policy',
    eyebrow: 'Data Protection & Compliance',
    description: "MedVisit Privacy Policy compliant with Sri Lanka's Personal Data Protection Act, No. 9 of 2022.",
    lastUpdated: '27 October 2026',
    readingTime: '4 min read',
    tokenMotif: 'PRV-04',
    keyPoints: [
        'We never sell your personal or healthcare practice data.',
        'Clinics retain 100% ownership and control of patient records.',
        'Payment card details are processed directly by our secure payment gateway (we never store card numbers).',
        'Fully aligned with Sri Lanka’s Personal Data Protection Act, No. 9 of 2022.',
    ],
    sections: [
        {
            id: 'who-we-are',
            title: 'Who we are',
            render: () => (
                <p>
                    MedVisit (https://medvisit.lk) is a software-as-a-service platform for clinic management and patient tokens in Sri Lanka. This policy explains how we handle personal data, in line with Sri Lanka's Personal Data Protection Act, No. 9 of 2022.
                </p>
            ),
        },
        {
            id: 'data-we-collect',
            title: 'Data we collect',
            render: () => (
                <ul className="list-disc pl-5 space-y-2 my-2">
                    <li>
                        <strong>Clinic account data:</strong> clinic name, owner and staff names, email addresses, phone numbers, address, logo and login details.
                    </li>
                    <li>
                        <strong>Patient data entered by clinics:</strong> names, phone numbers, appointment and token details, and medical or prescription records the clinic chooses to store.
                    </li>
                    <li>
                        <strong>Billing data:</strong> plan, payment amounts, dates and payment status. Card details are entered on and processed by our secure payment gateway partner; we do not store full card numbers.
                    </li>
                    <li>
                        <strong>Technical data:</strong> IP address, browser type and activity logs used for security and troubleshooting.
                    </li>
                </ul>
            ),
        },
        {
            id: 'our-role',
            title: 'Our role',
            render: () => (
                <p>
                    For patient data, the clinic decides what is collected and why; MedVisit stores and processes it only on the clinic's behalf to provide the service. Patients who want to access or correct their data should contact their clinic.
                </p>
            ),
        },
        {
            id: 'how-we-use-data',
            title: 'How we use data',
            render: () => (
                <div className="space-y-3">
                    <p>
                        To provide and secure the service, process subscription payments, send service emails (such as receipts, appointment and account notices), provide support, and meet legal obligations. We do not sell personal data, and we do not use patient data for advertising.
                    </p>
                    <Callout variant="info" title="Zero data selling">
                        MedVisit does not sell, broker, or monetize your patient or clinic data under any circumstances.
                    </Callout>
                </div>
            ),
        },
        {
            id: 'sharing',
            title: 'Sharing',
            render: () => (
                <p>
                    We share data only with service providers needed to run MedVisit — such as our hosting provider, email delivery provider, SMS/WhatsApp messaging providers, and payment processing partners for billing — and only as needed for their service. We may disclose data when required by law.
                </p>
            ),
        },
        {
            id: 'support-chat',
            title: 'Support chat and AI assistance',
            render: () => (
                <div className="space-y-3">
                    <p>
                        When you use our in-app support chat widget, inquiries are processed by an AI assistance service via OpenRouter and the underlying model provider (meta-llama/llama-3.3-70b-instruct) to provide immediate answers to general clinic operational and feature questions.
                    </p>
                    <p>
                        Patient clinical records, consultation notes, and health data are never submitted to external AI services. Only the text explicitly typed into the support chat widget is processed.
                    </p>
                </div>
            ),
        },
        {
            id: 'security',
            title: 'Security',
            render: () => (
                <p>
                    Each clinic's data is separated from other clinics. We use encrypted connections (HTTPS), hashed passwords, role-based access for staff, and regular backups. Payments are made on a secure payment checkout page.
                </p>
            ),
        },
        {
            id: 'retention',
            title: 'Retention',
            render: () => (
                <p>
                    We keep clinic data while the subscription is active. After it ends, the clinic may request an export within 30 days, after which the data may be deleted, except billing records we must keep by law.
                </p>
            ),
        },
        {
            id: 'your-rights',
            title: 'Your rights',
            render: ({ business }) => {
                const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
                return (
                    <p>
                        You may request access to, correction of, or deletion of your personal data, or object to its processing, by emailing{' '}
                        <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline">
                            {supportEmail}
                        </a>. We respond within 30 days.
                    </p>
                );
            },
        },
        {
            id: 'cookies',
            title: 'Cookies',
            render: () => (
                <p>
                    We use essential cookies only, to keep you signed in and protect forms. We do not use advertising cookies.
                </p>
            ),
        },
        {
            id: 'changes',
            title: 'Changes',
            render: () => (
                <p>
                    We may update this policy and will show the new date at the top of this page. Significant changes will be notified by email or in the dashboard.
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
