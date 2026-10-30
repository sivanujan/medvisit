<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Legal Policy Versions
    |--------------------------------------------------------------------------
    |
    | These versions represent the exact effective / last-updated dates
    | displayed across the 4 legal documents. If any version here is newer
    | than the date a clinic admin accepted, a re-acceptance modal is triggered.
    |
    */
    'versions' => [
        'terms' => '2026-10-28',
        'privacy' => '2026-10-27',
        'refund' => '2026-10-28',
        'dispute' => '2026-10-21',
    ],

    // Top-level aliases for direct access
    'terms_version' => '2026-10-28',
    'privacy_version' => '2026-10-27',
    'refund_version' => '2026-10-28',
    'dispute_version' => '2026-10-21',
];
