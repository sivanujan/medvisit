<?php

use App\Http\Middleware\EnsureClinicSetupComplete;
use App\Http\Middleware\EnsurePharmacyEnabled;
use App\Http\Middleware\EnsurePlanAllows;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $cloudflareIps = [
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
            '2400:cb00::/32',
            '2606:4700::/32',
            '2803:f800::/32',
            '2405:b500::/32',
            '2405:8100::/32',
            '2a06:98c0::/29',
            '2c0f:f248::/32',
        ];

        $trustedProxiesEnv = env('TRUSTED_PROXIES');
        $customProxies = $trustedProxiesEnv
            ? array_values(array_filter(array_map('trim', explode(',', (string) $trustedProxiesEnv))))
            : [];

        $trustedProxies = ! empty($customProxies) ? $customProxies : $cloudflareIps;

        $middleware->trustProxies(
            at: $trustedProxies,
            headers: Request::HEADER_X_FORWARDED_FOR |
                Request::HEADER_X_FORWARDED_HOST |
                Request::HEADER_X_FORWARDED_PORT |
                Request::HEADER_X_FORWARDED_PROTO |
                Request::HEADER_X_FORWARDED_PREFIX
        );

        $middleware->trustHosts(
            at: fn () => array_values(array_filter([
                '^(.+\.)?medvisit\.lk$',
                config('medvisit.base_domain') ? '^(.+\.)?'.preg_quote((string) config('medvisit.base_domain')).'$' : null,
                '^(.+\.)?medvisit\.localhost$',
                '^localhost$',
                '^127\.0\.0\.1$',
            ]))
        );

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->encryptCookies(except: [
            'support_visitor_token',
            'tv_device_token',
        ]);

        $middleware->validateCsrfTokens(except: [
            'check-subdomain',
            'register/send-code',
            'register/verify-code',
            'register/resend-code',
            'register/send-phone-otp',
            'register/verify-phone-otp',
            'register/resend-phone-otp',
            'subscription/validate-promo',
            'dev/preview/validate-promo',
            'webhooks/*',
            'support/broadcasting/auth',
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'pharmacy.enabled' => EnsurePharmacyEnabled::class,
            'plan.allows' => EnsurePlanAllows::class,
            'clinic.setup' => EnsureClinicSetupComplete::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
