<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | MedVisit Public Business Details
    |--------------------------------------------------------------------------
    |
    | Single source of truth for business contact information, legal entity,
    | currency, and plan definitions.
    |
    */
    'business' => [
        'name' => 'MedVisit',
        'email' => 'support@medvisit.lk',
        'support_email' => 'support@medvisit.lk',
        'general_email' => 'hello@medvisit.lk',
        'phone' => '+94 70 129 1688',
        'phone_display' => '070 129 1688',
        'phone_raw' => '+94701291688',
        'whatsapp_url' => 'https://wa.me/94701291688',
        'website' => 'https://medvisit.lk',
        'currency' => 'LKR (Sri Lankan Rupees)',
        'currency_code' => 'LKR',
        'currency_symbol' => 'Rs.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Shared Features Across All Plans
    |--------------------------------------------------------------------------
    */
    'shared_features' => [
        'Online appointment and channeling session management',
        'Token numbers and live queue',
        'Patient records',
        'Secure cloud hosting and regular backups',
        'Email support',
    ],

    /*
    |--------------------------------------------------------------------------
    | Subscription Plans
    |--------------------------------------------------------------------------
    |
    | Single source of truth for all public-facing pricing, plan terms,
    | and billing disclosures.
    |
    */
    'plans' => [
        'basic' => [
            'id' => 'basic',
            'name' => 'Basic',
            'price' => 7000,
            'price_formatted' => 'Rs. 7,000',
            'price_cents' => 700000,
            'interval' => 'per month',
            'target' => 'per clinic',
            'badge' => null,
            'description' => 'Essential clinic workflow, appointments, and live token management for single practices.',
            'features' => [],
        ],
        'pro' => [
            'id' => 'pro',
            'name' => 'Pro',
            'price' => 9000,
            'price_formatted' => 'Rs. 9,000',
            'price_cents' => 900000,
            'interval' => 'per month',
            'target' => 'per clinic',
            'badge' => 'Most popular',
            'description' => 'Comprehensive OPD channeling, SMS queue notifications, and automated prescription workflow.',
            'features' => [],
        ],
        'advanced' => [
            'id' => 'advanced',
            'name' => 'Advanced',
            'price' => 15000,
            'price_formatted' => 'Rs. 15,000',
            'price_cents' => 1500000,
            'interval' => 'per month',
            'target' => 'per clinic',
            'badge' => null,
            'description' => 'High-capacity medical centers with multi-doctor rosters, in-house dispensing, and custom integrations.',
            'features' => [],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Policy Versions & Dates
    |--------------------------------------------------------------------------
    */
    'policies' => [
        'last_updated' => '22 October 2026',
        'terms_version' => '2026-10-22',
        'retention_days' => 30,
        'downtime_refund_clause' => 'If MedVisit is unavailable for more than 48 continuous hours due to a fault on our side, we will refund the amount for the affected days, calculated pro-rata from your monthly plan price (for example, 3 days of downtime on the Pro plan = Rs. 9,000 ÷ 30 × 3 = Rs. 900). This is a partial refund for the affected days only, not a full refund of the month. Downtime of 48 hours or less, and planned maintenance announced in advance, are not eligible for a refund. To request it, email support@medvisit.lk within 14 days of the outage.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Public Clinic & Doctor Directory
    |--------------------------------------------------------------------------
    */
    'directory' => [
        // Allowed plans for directory listing ('*' or array of plan slugs)
        'allowed_plans' => ['starter', 'growth', 'scale', 'medvisit-standard', 'basic', 'pro', 'advanced', '*'],
        'fixed_services' => [
            'OPD Consultation',
            'Specialist Channeling',
            'Pharmacy & Dispensing',
            'Medical Laboratory',
            'Dental Care',
            'Minor Surgery',
            'ECG & Diagnostics',
            'Physiotherapy',
            'Vaccination Center',
            'Eye Care / Optometry',
        ],
        'districts' => [
            'Ampara',
            'Anuradhapura',
            'Badulla',
            'Batticaloa',
            'Colombo',
            'Galle',
            'Gampaha',
            'Hambantota',
            'Jaffna',
            'Kalutara',
            'Kandy',
            'Kegalle',
            'Kilinochchi',
            'Kurunegala',
            'Mannar',
            'Matale',
            'Matara',
            'Monaragala',
            'Mullaitivu',
            'Nuwara Eliya',
            'Polonnaruwa',
            'Puttalam',
            'Ratnapura',
            'Trincomalee',
            'Vavuniya',
        ],
    ],
];
