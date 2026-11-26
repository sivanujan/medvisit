<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Cloudflare Proxy IP Ranges
    |--------------------------------------------------------------------------
    |
    | Official IP ranges published by Cloudflare (https://www.cloudflare.com/ips/).
    | We trust only these IP ranges for forwarded headers, avoiding the insecure
    | "private_ranges" shortcut (CVE-2026-121619).
    |
    */
    'cloudflare' => [
        // Cloudflare IPv4
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '172.64.0.0/13',
        '131.0.72.0/22',

        // Cloudflare IPv6
        '2400:cb00::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2405:b500::/32',
        '2405:8100::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32',
    ],

    /*
    |--------------------------------------------------------------------------
    | Explicit Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | When TRUSTED_PROXIES is specified in .env, those specific proxies are trusted.
    | Otherwise, we default to only trusting the official Cloudflare IP ranges.
    |
    */
    'proxies' => env('TRUSTED_PROXIES')
        ? array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES')))))
        : null,
];
