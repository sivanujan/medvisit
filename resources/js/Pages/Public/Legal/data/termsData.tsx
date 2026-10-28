import React from 'react';
import { Link } from '@inertiajs/react';
import Callout from '@/Components/Public/Callout';
import { PolicyPageData } from './types';

export const termsData: PolicyPageData = {
    title: 'Terms and Conditions',
    eyebrow: 'Legal Agreement',
    description: 'Terms and Conditions governing the use of MedVisit healthcare operating software and patient token services in Sri Lanka.',
    lastUpdated: '28 October 2026',
    readingTime: '6 min read',
    tokenMotif: 'TRM-01',
    keyPoints: [
        'Monthly plans in LKR billed in advance per clinic.',
        'Subscriptions auto-renew every month until cancelled.',
        'Cancel anytime online from your clinic Billing settings.',
        'You own all your clinic and patient data under Sri Lankan law.',
    ],
    sections: [
        {
            id: 'about-these-terms',
            title: 'About these terms',
            render: () => (
                <p>
                    These Terms and Conditions ("Terms") govern your use of MedVisit (https://medvisit.lk), a software-as-a-service platform for clinic management, appointments and patient token numbers, operated in Sri Lanka ("MedVisit", "we", "us"). By creating an account or paying for a subscription, you ("the Clinic", "you") agree to these Terms.
                </p>
            ),
        },
        {
            id: 'the-service',
            title: 'The service',
            render: () => (
                <p>
                    MedVisit provides an online system that lets clinics manage doctors, channeling sessions, appointments, token numbers, patient records, prescriptions and related features. Each clinic receives its own workspace. Features available to you depend on your subscription plan.
                </p>
            ),
        },
        {
            id: 'accounts',
            title: 'Accounts',
            render: ({ business }) => {
                const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
                return (
                    <p>
                        You must provide accurate information when registering. You are responsible for keeping your login details secure and for all activity under your clinic's account, including actions by staff you add. Tell us immediately at email{' '}
                        <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline">
                            {supportEmail}
                        </a>{' '}
                        if you suspect unauthorised access.
                    </p>
                );
            },
        },
        {
            id: 'subscription-plans-and-prices',
            title: 'Subscription plans and prices',
            render: ({ plans }) => (
                <div className="space-y-3">
                    <p>
                        MedVisit is offered on the following monthly plans, priced per clinic in Sri Lankan Rupees (LKR):
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 my-3">
                        <li><strong>{plans.basic.name}</strong> — {plans.basic.price_formatted} per month</li>
                        <li><strong>{plans.pro.name}</strong> — {plans.pro.price_formatted} per month</li>
                        <li><strong>{plans.advanced.name}</strong> — {plans.advanced.price_formatted} per month</li>
                    </ul>
                    <p>
                        Current prices are always shown on our{' '}
                        <Link href="/pricing" className="text-primary font-medium underline">
                            Pricing page
                        </Link>.
                    </p>
                </div>
            ),
        },
        {
            id: 'website-templates',
            title: 'Website templates (one-time purchases)',
            render: () => (
                <div className="space-y-3">
                    <p>
                        Clinics may purchase optional premium website templates for a one-time fee in LKR. A purchased template grants a non-exclusive, non-transferable license to apply and publish the design on the clinic's MedVisit website subdomain for as long as the clinic's MedVisit subscription remains active.
                    </p>
                    <p>
                        Templates included with a plan are available only while the clinic is on that plan.
                    </p>
                    <p>
                        Template refunds are governed by our{' '}
                        <Link href="/refund-policy" className="text-primary font-medium underline">
                            Refund Policy
                        </Link>.
                    </p>
                </div>
            ),
        },
        {
            id: 'payment-and-renewals',
            title: 'Payment and renewals',
            render: () => (
                <p>
                    Subscriptions are paid monthly in advance online in LKR through our secure payment gateway partner. Your subscription renews monthly; you pay each month online. You will receive reminder notices by email 7 days and 1 day before each due date. We do not store your full card details; payments are processed securely by our partner. If payment is not completed within 3 days after the due date, access to the clinic dashboard is paused until payment is made.
                </p>
            ),
        },
        {
            id: 'cancellation',
            title: 'Cancellation',
            render: () => (
                <div className="space-y-3">
                    <p>
                        You may cancel your subscription at any time from the Billing page in your clinic dashboard, without contacting us. After cancellation, no further charges are made, and you keep access until the end of the billing period you have already paid for. Refunds are handled according to our{' '}
                        <Link href="/refund-policy" className="text-primary font-medium underline">
                            Refund Policy
                        </Link>.
                    </p>
                    <Callout variant="info" title="Cancel anytime from the Billing page">
                        Manage or cancel your subscription online at any time directly through your dashboard with zero cancellation fees.
                    </Callout>
                </div>
            ),
        },
        {
            id: 'price-changes',
            title: 'Price changes',
            render: () => (
                <p>
                    We may change our prices. We will notify you by email at least 30 days before a new price applies to your subscription. If you do not agree, you may cancel before the change takes effect.
                </p>
            ),
        },
        {
            id: 'your-data-and-patient-information',
            title: 'Your data and patient information',
            render: () => (
                <p>
                    You own the data your clinic enters into MedVisit, including patient information. You are responsible for having a lawful basis to collect and store patient data and for complying with applicable laws, including Sri Lanka's Personal Data Protection Act, No. 9 of 2022. We process this data only to provide the service to you, as described in our{' '}
                    <Link href="/privacy-policy" className="text-primary font-medium underline">
                        Privacy Policy
                    </Link>. After your subscription ends, you may request an export of your data within 30 days, after which we may delete it.
                </p>
            ),
        },
        {
            id: 'acceptable-use',
            title: 'Acceptable use',
            render: () => (
                <p>
                    You must not use MedVisit to break any law, upload harmful code, attempt to access other clinics' data, overload or disrupt the service, or resell the service without our written permission.
                </p>
            ),
        },
        {
            id: 'medical-responsibility',
            title: 'Medical responsibility',
            render: () => (
                <p>
                    MedVisit is an administrative tool. It does not provide medical advice, diagnosis or treatment. All clinical decisions, including prescriptions, remain the responsibility of the clinic and its qualified medical staff.
                </p>
            ),
        },
        {
            id: 'availability',
            title: 'Availability',
            render: () => (
                <p>
                    We aim to keep MedVisit available at all times but cannot guarantee uninterrupted service. Planned maintenance will be announced in advance where possible.
                </p>
            ),
        },
        {
            id: 'limitation-of-liability',
            title: 'Limitation of liability',
            render: () => (
                <p>
                    To the extent permitted by law, MedVisit is not liable for indirect or consequential losses, or for loss of profits or data caused by events outside our reasonable control. Our total liability for any claim is limited to the amount you paid us in the three months before the claim.
                </p>
            ),
        },
        {
            id: 'suspension-and-termination',
            title: 'Suspension and termination',
            render: () => (
                <p>
                    We may suspend or close an account that breaches these Terms or has unpaid fees, after giving notice where reasonable. You may stop using the service at any time by cancelling your subscription.
                </p>
            ),
        },
        {
            id: 'changes-to-these-terms',
            title: 'Changes to these Terms',
            render: () => (
                <p>
                    We may update these Terms. Material changes will be notified by email or in the dashboard. Continued use after the effective date means you accept the updated Terms.
                </p>
            ),
        },
        {
            id: 'governing-law',
            title: 'Governing law',
            render: () => (
                <p>
                    These Terms are governed by the laws of Sri Lanka. Disputes are handled as set out in our{' '}
                    <Link href="/dispute-policy" className="text-primary font-medium underline">
                        Dispute Resolution Policy
                    </Link>, and finally by the courts of Sri Lanka.
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
