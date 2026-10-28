<?php

return [
    'currency' => env('MEDVISIT_CURRENCY', 'LKR'),
    'currency_symbol' => 'Rs.',
    'country' => 'LK',
    'timezone' => env('APP_TIMEZONE', 'Asia/Colombo'),
    'base_domain' => env('MEDVISIT_BASE_DOMAIN', 'medvisit.localhost'),

    // Domain shown to people (e.g. "yourclinic.medvisit.lk"), independent of the request host.
    'public_domain' => env('APP_PUBLIC_DOMAIN', 'medvisit.lk'),

    // Templates under development mode: allows clinics to preview, test, and apply premium templates freely
    'templates_under_development' => env('TEMPLATES_UNDER_DEVELOPMENT', true),

    'mail' => [
        'logo_url' => env('MAIL_LOGO_URL'),
        'icon_url' => env('MAIL_ICON_URL'),
        'reply_to' => [
            'address' => env('MAIL_REPLY_TO_ADDRESS', 'support@medvisit.lk'),
            'name' => env('MAIL_REPLY_TO_NAME', 'MedVisit Support'),
        ],
        'from' => [
            'verify' => [
                'address' => env('MAIL_VERIFY_ADDRESS', 'verify@medvisit.lk'),
                'name' => env('MAIL_VERIFY_NAME', 'MedVisit'),
            ],
            'notifications' => [
                'address' => env('MAIL_NOTIFICATIONS_ADDRESS', 'notifications@medvisit.lk'),
                'name' => env('MAIL_NOTIFICATIONS_NAME', 'MedVisit'),
            ],
            'hello' => [
                'address' => env('MAIL_HELLO_ADDRESS', 'hello@medvisit.lk'),
                'name' => env('MAIL_HELLO_NAME', 'MedVisit'),
            ],
        ],
    ],

    'subscription' => [
        'trial_days' => (int) env('MEDVISIT_TRIAL_DAYS', 0),
        'grace_days' => (int) env('MEDVISIT_GRACE_DAYS', 3),
    ],
];
