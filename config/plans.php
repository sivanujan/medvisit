<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Plan Gating Master Switch
    |--------------------------------------------------------------------------
    |
    | When disabled (default false), all clinics have full access to all features,
    | unlimited resource limits (doctors, staff, screens, SMS), and no lock panels.
    |
    */
    'gating_enabled' => (bool) env('PLAN_GATING_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Central Plan Matrix (Single Source of Truth)
    |--------------------------------------------------------------------------
    |
    | Defines the tier specifications, feature entitlements, resource limits,
    | pricing, and display text for MedVisit subscription tiers.
    |
    */

    'tiers' => [
        'basic' => [
            'id' => 'basic',
            'name' => 'Basic',
            'slug' => 'basic',
            'price' => 7000,
            'price_cents' => 700000,
            'price_formatted' => 'Rs. 7,000',
            'billing_interval' => 'month',
            'badge' => null,
            'is_public' => true,
            'description' => 'Everything a small clinic needs to run its queue, bookings, prescriptions and billing.',
            'limits' => [
                'doctors' => 3,
                'staff' => 5, // active staff users excluding clinic owner
                'tv_screens' => 1,
                'sms_monthly' => 300,
                'free_premium_templates' => 0,
            ],
            'features' => [
                'queue' => true, // queue, calling desk, patient tracker, wait time
                'sessions' => true, // sessions, calendar, templates, leave
                'booking' => true, // reception + online booking
                'prescriptions' => true, // patients, prescriptions, Rx templates, PDF
                'billing' => true, // counter billing, receipts, doctor payouts
                'reports' => true, // dashboard + reports
                'tv_multi_room' => false, // multi-room / per-doctor TV filter
                'pharmacy' => false, // stock, GRN, suppliers, import, dispense
                'website_basic' => true, // free themes + section editor
                'website_builder' => false, // page builder
                'audit_export' => false, // audit log export
                'support' => 'email', // email support
            ],
            'highlighted_bullets' => [
                'Up to 3 active doctors & 5 staff users',
                'Live queue calling desk & patient tracker',
                'Appointment booking & channeling calendar',
                'Digital prescriptions & printable PDFs',
                '1 waiting room TV display screen',
                '300 SMS alerts per month included',
                'Email support',
            ],
        ],

        'pro' => [
            'id' => 'pro',
            'name' => 'Pro',
            'slug' => 'pro',
            'price' => 9000,
            'price_cents' => 900000,
            'price_formatted' => 'Rs. 9,000',
            'billing_interval' => 'month',
            'badge' => 'Most popular',
            'is_public' => true,
            'description' => 'For growing clinics with a pharmacy, more doctors and multiple waiting rooms.',
            'limits' => [
                'doctors' => 8,
                'staff' => 15,
                'tv_screens' => 3,
                'sms_monthly' => 1000,
                'free_premium_templates' => 0,
            ],
            'features' => [
                'queue' => true,
                'sessions' => true,
                'booking' => true,
                'prescriptions' => true,
                'billing' => true,
                'reports' => true,
                'tv_multi_room' => true,
                'pharmacy' => true,
                'website_basic' => true,
                'website_builder' => true,
                'audit_export' => true,
                'support' => 'email_chat',
            ],
            'highlighted_bullets' => [
                'Up to 8 active doctors & 15 staff users',
                'Full in-house pharmacy & stock dispensing',
                'Up to 3 waiting room TV screens with multi-room filter',
                'MedVisit visual page builder for clinic site',
                '1,000 SMS alerts per month included',
                'Audit log export for compliance',
                'Email & in-app chat support',
            ],
        ],

        'advanced' => [
            'id' => 'advanced',
            'name' => 'Advanced',
            'slug' => 'advanced',
            'price' => 15000,
            'price_cents' => 1500000,
            'price_formatted' => 'Rs. 15,000',
            'billing_interval' => 'month',
            'badge' => null,
            'is_public' => true,
            'description' => 'For busy medical centres: unlimited doctors, staff and screens, priority support.',
            'limits' => [
                'doctors' => -1, // unlimited
                'staff' => -1,   // unlimited
                'tv_screens' => -1, // unlimited
                'sms_monthly' => 3000,
                'free_premium_templates' => 1,
            ],
            'features' => [
                'queue' => true,
                'sessions' => true,
                'booking' => true,
                'prescriptions' => true,
                'billing' => true,
                'reports' => true,
                'tv_multi_room' => true,
                'pharmacy' => true,
                'website_basic' => true,
                'website_builder' => true,
                'audit_export' => true,
                'support' => 'priority',
            ],
            'highlighted_bullets' => [
                'Unlimited active doctors & staff users',
                'Unlimited waiting room TV displays',
                'Full in-house pharmacy dispensing & batch tracking',
                'MedVisit visual page builder + 1 free premium template',
                '3,000 SMS alerts per month included',
                'Compliance audit exports',
                'Priority email & in-app chat support',
            ],
        ],

        'comp' => [
            'id' => 'comp',
            'name' => 'Complimentary',
            'slug' => 'comp',
            'price' => 0,
            'price_cents' => 0,
            'price_formatted' => 'Rs. 0.00',
            'billing_interval' => 'month',
            'badge' => 'Lifetime',
            'is_public' => false,
            'description' => 'Platform complimentary access with all Advanced features unlocked.',
            'limits' => [
                'doctors' => -1,
                'staff' => -1,
                'tv_screens' => -1,
                'sms_monthly' => 5000,
                'free_premium_templates' => 5,
            ],
            'features' => [
                'queue' => true,
                'sessions' => true,
                'booking' => true,
                'prescriptions' => true,
                'billing' => true,
                'reports' => true,
                'tv_multi_room' => true,
                'pharmacy' => true,
                'website_basic' => true,
                'website_builder' => true,
                'audit_export' => true,
                'support' => 'priority',
            ],
            'highlighted_bullets' => [
                'All MedVisit Features Included',
                'Unlimited Doctor Roster & Staff Accounts',
                'Complimentary Active Status (No Monthly Billing)',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | SMS Top-Up Packs
    |--------------------------------------------------------------------------
    */
    'sms_topup_packs' => [
        [
            'id' => 'sms_500',
            'credits' => 500,
            'price_cents' => 150000,
            'price_formatted' => 'Rs. 1,500',
            'rate_per_sms' => 'Rs. 3.00',
            'validity_days' => 90,
        ],
        [
            'id' => 'sms_1000',
            'credits' => 1000,
            'price_cents' => 280000,
            'price_formatted' => 'Rs. 2,800',
            'rate_per_sms' => 'Rs. 2.80',
            'validity_days' => 90,
            'popular' => true,
        ],
        [
            'id' => 'sms_3000',
            'credits' => 3000,
            'price_cents' => 750000,
            'price_formatted' => 'Rs. 7,500',
            'rate_per_sms' => 'Rs. 2.50',
            'validity_days' => 90,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Domain Service Contact
    |--------------------------------------------------------------------------
    */
    'custom_domain_service' => [
        'enabled' => true,
        'contact_whatsapp' => '070 129 1688',
        'contact_whatsapp_link' => 'https://wa.me/94701291688',
        'contact_email' => 'hello@medvisit.lk',
        'cname_target' => 'medvisit.lk',
    ],
];
