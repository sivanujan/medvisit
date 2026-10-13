<?php

return [
    'currency' => env('MEDVISIT_CURRENCY', 'LKR'),
    'currency_symbol' => 'Rs.',
    'country' => 'LK',
    'timezone' => env('APP_TIMEZONE', 'Asia/Colombo'),

    'mail' => [
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
];
