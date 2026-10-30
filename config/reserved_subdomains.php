<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Subdomain Hold Period
    |--------------------------------------------------------------------------
    |
    | When a clinic is permanently deleted (force-deleted), its subdomain is
    | held for this number of days to prevent immediate impersonation.
    |
    */
    'hold_days' => 90,

    /*
    |--------------------------------------------------------------------------
    | Exact Match Reserved Subdomains
    |--------------------------------------------------------------------------
    |
    | Categorised list of reserved words that cannot be used as clinic subdomains.
    |
    */
    'exact' => [
        // System and Infrastructure
        'www', 'api', 'app', 'admin', 'administrator', 'root', 'system', 'sys',
        'dashboard', 'panel', 'console', 'cp', 'cpanel', 'portal', 'server', 'host',
        'ns1', 'ns2', 'dns', 'mx', 'smtp', 'mail', 'email', 'imap', 'pop',
        'ftp', 'sftp', 'ssh', 'vpn', 'cdn', 'static', 'assets', 'media',
        'files', 'img', 'images', 'uploads', 'storage', 'backup', 'backups',
        'db', 'database', 'redis', 'cache', 'queue', 'ws', 'wss', 'socket',
        'reverb', 'status', 'health', 'up', 'monitor', 'metrics', 'logs',
        'test', 'testing', 'dev', 'development', 'staging', 'stage',
        'prod', 'production', 'demo', 'sandbox', 'beta', 'alpha',
        'preview', 'local', 'localhost',

        // Brand and Company
        'medvisit', 'med-visit', 'medvisitlk', 'official', 'team', 'staff',
        'owner', 'founder', 'ceo', 'company', 'inc', 'hq',

        // Accounts and Billing
        'login', 'logout', 'signin', 'signup', 'register', 'auth', 'oauth', 'sso',
        'account', 'accounts', 'user', 'users', 'profile', 'password', 'reset',
        'verify', 'verification', 'otp', 'billing', 'invoice', 'invoices',
        'payment', 'payments', 'pay', 'checkout', 'subscribe', 'subscription',
        'plans', 'pricing', 'refund', 'refunds', 'wallet',

        // Support and Legal
        'support', 'help', 'helpdesk', 'contact', 'hello', 'info', 'sales',
        'marketing', 'abuse', 'security', 'privacy', 'terms', 'legal',
        'policy', 'policies', 'dispute', 'compliance', 'careers', 'jobs',
        'blog', 'news', 'docs', 'documentation', 'about', 'faq',
        'community', 'forum', 'partners', 'affiliate', 'affiliates',

        // Product Routes and Features
        'find', 'directory', 'search', 'book', 'booking', 'bookings',
        'token', 'tokens', 'queue', 'tv', 'display', 'clinic', 'clinics',
        'doctor', 'doctors', 'patient', 'patients', 'pharmacy',
        'prescription', 'prescriptions', 'setup', 'onboarding',
        'templates', 'coming', 'home', 'index', 'null', 'undefined',

        // Official Health Bodies (Impersonation Risk)
        'moh', 'health', 'healthministry', 'gov', 'govt', 'government',
        'slmc', 'nmra', 'who', 'hospital', 'hospitals', 'nhsl', 'ministry',

        // Mail-related & Cloudflare DNS
        'postmaster', 'hostmaster', 'webmaster', 'noreply', 'no-reply',
        'mailer-daemon', 'send', 'rsend', 'resend',
    ],

    /*
    |--------------------------------------------------------------------------
    | Pattern Blocks
    |--------------------------------------------------------------------------
    |
    | - contains_global: Blocked if substring appears anywhere in the subdomain.
    | - segment_blocks: Blocked ONLY as a distinct hyphen-separated segment
    |   (e.g., 'jaffna-admin' is blocked, but Sri Lankan names like 'padmini'
    |    or 'govinda' are allowed).
    |
    */
    'patterns' => [
        'contains_global' => [
            'medvisit',
            'med-visit',
        ],
        'segment_blocks' => [
            'admin',
            'support',
            'official',
            'billing',
            'payment',
            'login',
            'verify',
            'security',
            'gov',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Offensive / Abusive Words (Multilingual)
    |--------------------------------------------------------------------------
    |
    | English, Romanised Sinhala, and Romanised Tamil abusive or inappropriate
    | words. Words of 5+ letters are matched as substrings; words under 5 letters
    | are matched as hyphen-separated segments only to prevent false positives.
    |
    */
    'offensive' => [
        // English
        'abuse', 'asshole', 'bastard', 'bitch', 'bullshit', 'dick', 'fuck', 'fucker',
        'fucking', 'nigger', 'nigga', 'piss', 'porn', 'pussy', 'scam', 'scammer',
        'sex', 'shit', 'slut', 'whore',

        // Sinhala (Romanised)
        'huththa', 'hukapan', 'kariyo', 'ponnaya', 'pakaya', 'kariya', 'wesige', 'ballo',

        // Tamil (Romanised)
        'thevidiya', 'baadu', 'sunni', 'koothi', 'oombu', 'punda', 'pundai', 'kena',
    ],
];
