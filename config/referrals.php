<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Referral Program Feature Flag
    |--------------------------------------------------------------------------
    |
    | When false, all referral endpoints, UI, and logic are disabled or hidden.
    |
    */
    'enabled' => (bool) env('REFERRALS_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Qualifying Requirements
    |--------------------------------------------------------------------------
    |
    | Number of consecutive paid monthly invoices required from the referred
    | clinic before a reward is eligible.
    |
    */
    'qualifying_paid_invoices' => (int) env('REFERRALS_QUALIFYING_INVOICES', 2),

    /*
    |--------------------------------------------------------------------------
    | Approval Requirement
    |--------------------------------------------------------------------------
    |
    | When true, eligible rewards require explicit Super Admin approval
    | before they are credited to the clinic's ledger.
    |
    */
    'approval_required' => (bool) env('REFERRALS_APPROVAL_REQUIRED', false),

    /*
    |--------------------------------------------------------------------------
    | Annual Reward Cap Multiplier
    |--------------------------------------------------------------------------
    |
    | The maximum total referral credit a referrer clinic can earn in a rolling
    | 12-month window is: current_monthly_plan_price * multiplier.
    |
    */
    'annual_cap_multiplier' => (int) env('REFERRALS_ANNUAL_CAP_MULTIPLIER', 12),

    /*
    |--------------------------------------------------------------------------
    | Credit Expiry
    |--------------------------------------------------------------------------
    |
    | Number of months after being granted that referral credits expire.
    |
    */
    'credit_expiry_months' => (int) env('REFERRALS_CREDIT_EXPIRY_MONTHS', 12),

    /*
    |--------------------------------------------------------------------------
    | Cookie Lifetime
    |--------------------------------------------------------------------------
    |
    | Days to store the referral tracking cookie in the prospective clinic's browser.
    |
    */
    'cookie_lifetime_days' => (int) env('REFERRALS_COOKIE_LIFETIME_DAYS', 30),

    /*
    |--------------------------------------------------------------------------
    | New Clinic Benefit
    |--------------------------------------------------------------------------
    |
    | Optional welcome perk applied via promo engine for newly referred clinics.
    | Types: 'none', 'extra_trial_days', 'discount_percent'.
    |
    */
    'welcome_benefit' => [
        'enabled' => (bool) env('REFERRALS_WELCOME_BENEFIT_ENABLED', false),
        'type' => env('REFERRALS_WELCOME_BENEFIT_TYPE', 'extra_trial_days'),
        'value' => (int) env('REFERRALS_WELCOME_BENEFIT_VALUE', 14),
    ],

    /*
    |--------------------------------------------------------------------------
    | Account Exclusions
    |--------------------------------------------------------------------------
    |
    | Demo and complimentary plan clinics cannot earn referral rewards.
    |
    */
    'allow_comp_and_demo' => false,
];
