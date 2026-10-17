<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Phone Verification Channels
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of enabled verification channels (e.g. 'whatsapp,textlk').
    | In local development, 'log' channel can be added or substituted automatically.
    |
    */
    'channels' => array_values(array_filter(array_map('trim', explode(',', env('OTP_CHANNELS', 'whatsapp,textlk'))))),

    /*
    |--------------------------------------------------------------------------
    | Lifespan & Rate Limits
    |--------------------------------------------------------------------------
    */
    'expiry_minutes' => 10,
    'resend_cooldown_seconds' => 60,
    'max_attempts_per_hour' => 5,
    'max_code_attempts' => 5,
    'verified_retention_days' => 180,
];
