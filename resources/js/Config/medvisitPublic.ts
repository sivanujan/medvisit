export interface PublicPlan {
    id: string;
    name: string;
    price: number;
    price_formatted: string;
    price_cents: number;
    interval: string;
    target: string;
    badge?: string | null;
    description?: string;
    features: string[];
}

export interface BusinessDetails {
    name: string;
    owner: string;
    address: string;
    email: string;
    support_email?: string;
    general_email?: string;
    phone: string;
    phone_display?: string;
    phone_raw?: string;
    whatsapp_url?: string;
    website: string;
    currency: string;
    currency_code: string;
    currency_symbol: string;
}

export interface PublicConfig {
    business: BusinessDetails;
    shared_features: string[];
    plans: {
        basic: PublicPlan;
        pro: PublicPlan;
        advanced: PublicPlan;
        [key: string]: PublicPlan;
    };
    policies: {
        last_updated: string;
        terms_version: string;
    };
}

export const defaultPublicConfig: PublicConfig = {
    business: {
        name: 'MedVisit',
        owner: 'Thanarasan Sivanujan (sole proprietor)',
        address: 'Puliyankoodal South, Kayts, Jaffna 40000, Sri Lanka',
        email: 'support@medvisit.lk',
        support_email: 'support@medvisit.lk',
        general_email: 'hello@medvisit.lk',
        phone: '+94 70 129 1688',
        phone_display: '070 129 1688',
        phone_raw: '+94701291688',
        whatsapp_url: 'https://wa.me/94701291688',
        website: 'https://medvisit.lk',
        currency: 'LKR (Sri Lankan Rupees)',
        currency_code: 'LKR',
        currency_symbol: 'Rs.',
    },
    shared_features: [
        'Online appointment and channeling session management',
        'Token numbers and live queue',
        'Patient records',
        'Secure cloud hosting and regular backups',
        'Email support',
    ],
    plans: {
        basic: {
            id: 'basic',
            name: 'Basic',
            price: 7000,
            price_formatted: 'Rs. 7,000',
            price_cents: 700000,
            interval: 'per month',
            target: 'per clinic',
            badge: null,
            description: 'Essential clinic workflow, appointments, and live token management for single practices.',
            features: [],
        },
        pro: {
            id: 'pro',
            name: 'Pro',
            price: 9000,
            price_formatted: 'Rs. 9,000',
            price_cents: 900000,
            interval: 'per month',
            target: 'per clinic',
            badge: 'Most popular',
            description: 'Comprehensive OPD channeling, SMS queue notifications, and automated prescription workflow.',
            features: [],
        },
        advanced: {
            id: 'advanced',
            name: 'Advanced',
            price: 15000,
            price_formatted: 'Rs. 15,000',
            price_cents: 1500000,
            interval: 'per month',
            target: 'per clinic',
            badge: null,
            description: 'High-capacity medical centers with multi-doctor rosters, in-house dispensing, and custom integrations.',
            features: [],
        },
    },
    policies: {
        last_updated: '21 October 2026',
        terms_version: '2026-10-21',
    },
};
