<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Demo Clinic Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for the public sandbox demo clinic (demo.medvisit.lk).
    |
    */

    'subdomain' => env('DEMO_SUBDOMAIN', 'demo'),

    'tenant_id' => env('DEMO_TENANT_ID', 'demo'),

    'lead_form_enabled' => env('DEMO_LEAD_FORM', true),

    'notify_owner_email' => env('DEMO_NOTIFY_EMAIL', 'hello@medvisit.lk'),

    'notify_telegram' => env('DEMO_NOTIFY_TELEGRAM', true),

    'signed_login_lifetime_seconds' => 60,

    'demo_session_lifetime_hours' => 2,

    'pdf_rate_limit_per_10_minutes' => 10,

    'write_rate_limit_per_10_minutes' => 60,
];
