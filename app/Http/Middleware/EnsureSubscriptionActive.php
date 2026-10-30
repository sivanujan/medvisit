<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionActive
{
    /**
     * Routes explicitly permitted when subscription is inactive or pending payment.
     */
    protected array $allowedRouteNames = [
        'agreements.accept',
        'tenant.suspended',
        'tenant.subscription.subscribe',
        'tenant.subscription.validate_promo',
        'tenant.subscription.checkout',
        'tenant.subscription.return',
        'tenant.subscription.check_status',
        'tenant.subscription.inactive',
        'tenant.billing.subscribe',
        'tenant.billing.validate_promo',
        'tenant.billing.checkout',
        'tenant.billing.return',
        'tenant.billing.check_status',
        'tenant.billing.inactive',
        'tenant.logout',
        'tenant.profile.edit',
        'tenant.profile.update',
        'tenant.profile.destroy',
        'tenant.password.request',
        'tenant.password.email',
        'tenant.password.reset',
        'tenant.password.store',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = tenant();
        $user = $request->user();

        // 1. If not in a tenant context, or user is a super admin, or demo sandbox tenant, allow through
        if (! $tenant || ($user && $user->hasRole('super_admin')) || (bool) $tenant->is_demo) {
            return $next($request);
        }

        // 2. If subscription is active, allow all routes
        $subscription = $tenant->subscription;
        if ($subscription && $subscription->isActive()) {
            return $next($request);
        }

        // 3. When subscription is NOT active:
        $routeName = $request->route()?->getName();

        // Common routes allowed for everyone even when inactive (logout, profile, password reset)
        $commonAllowed = [
            'tenant.logout',
            'tenant.profile.edit',
            'tenant.profile.update',
            'tenant.profile.destroy',
            'tenant.password.request',
            'tenant.password.email',
            'tenant.password.reset',
            'tenant.password.store',
        ];

        if ($routeName && in_array($routeName, $commonAllowed, true)) {
            return $next($request);
        }

        // Non-admin staff (doctor, receptionist, pharmacist) must ONLY see the friendly inactive notice
        if ($user && ! $user->hasRole('clinic_admin')) {
            if ($routeName === 'tenant.subscription.inactive' || $routeName === 'tenant.billing.inactive') {
                return $next($request);
            }

            return redirect()->route('tenant.subscription.inactive');
        }

        $adminBillingRoutes = [
            'tenant.suspended',
            'tenant.subscription.subscribe',
            'tenant.subscription.validate_promo',
            'tenant.subscription.checkout',
            'tenant.subscription.return',
            'tenant.subscription.check_status',
            'tenant.subscription.index',
            'tenant.subscription.receipt',
            'tenant.subscription.inactive',
            'tenant.billing.subscribe',
            'tenant.billing.checkout',
            'tenant.billing.return',
            'tenant.billing.check_status',
            'tenant.billing.inactive',
            'tenant.settings.billing',
            'tenant.settings.billing.details',
            'tenant.settings.billing.cancel',
            'tenant.settings.billing.resume',
            'tenant.settings.billing.change_plan',
            'tenant.settings.billing.upgrade',
            'tenant.settings.billing.downgrade',
            'tenant.settings.billing.cancel_downgrade',
            'tenant.settings.billing.invoice.download',
            'tenant.settings.billing.invoice.view',
        ];

        if ($routeName && in_array($routeName, $adminBillingRoutes, true)) {
            return $next($request);
        }

        // Otherwise redirect clinic admin to subscribe page
        return redirect()->route('tenant.subscription.subscribe');
    }
}
