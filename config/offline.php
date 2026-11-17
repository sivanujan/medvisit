<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Master Offline Resilience Flag
    |--------------------------------------------------------------------------
    | When false, the application behaves exactly as before.
    */
    'enabled' => (bool) env('OFFLINE_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Phased Rollout Flags
    |--------------------------------------------------------------------------
    | Master OFFLINE_ENABLED must be true for any phase to take effect.
    */
    'phases' => [
        'phase_0' => (bool) env('OFFLINE_PHASE_0_ENABLED', false),
        'phase_1' => (bool) env('OFFLINE_PHASE_1_ENABLED', false),
        'phase_2' => (bool) env('OFFLINE_PHASE_2_ENABLED', false),
        'phase_3' => (bool) env('OFFLINE_PHASE_3_ENABLED', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Heartbeat Ping & Offline Settings
    |--------------------------------------------------------------------------
    */
    'ping_interval_seconds' => (int) env('OFFLINE_PING_INTERVAL', 15),
    'snapshot_interval_seconds' => (int) env('OFFLINE_SNAPSHOT_INTERVAL', 120),
    'trusted_device_ttl_hours' => 36,
    'offline_pin_max_attempts' => 5,
];
