<?php

declare(strict_types=1);

return [
    'groups' => [
        'public' => [
            'home',
            'pricing',
            'directory.*',
            'find.*',
            'templates.*',
            'legal.*',
            'demo.*',
            'login',
            'logout',
            'register',
            'find.clinic.*',
            'password.*',
            'verification.*',
            'tenant.home',
            'tenant.page',
            'tenant.book*',
            'tenant.live-queue*',
            'tenant.impersonate.exit',
            'tenant.logout',
            'tenant.legal.*',
            'media.serve',
            'boost.browser-logs',
        ],
        'tenant' => [
            'tenant.*',
            'profile.*',
            'logout',
            'home',
            'media.serve',
            'boost.browser-logs',
            '!super_admin.*',
            '!admin.*',
        ],
        'super_admin' => [
            'super_admin.*',
            'admin.*',
            'logout',
            'home',
            'media.serve',
            'boost.browser-logs',
        ],
    ],
];
