<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicSetupComplete
{
    /**
     * Route patterns explicitly permitted during clinic setup gating.
     */
    protected array $allowedRouteNames = [
        'tenant.logout',
        'tenant.setup',
        'tenant.setup.step',
        'tenant.setup.save',
        'tenant.setup.complete',
        'tenant.setup.test_print',
        'tenant.setup.dismiss_banner',
        'tenant.subscription.subscribe',
        'tenant.subscription.checkout',
        'tenant.subscription.return',
        'tenant.subscription.check_status',
        'tenant.subscription.inactive',
        'tenant.subscription.index',
        'tenant.subscription.receipt',
        'tenant.billing.subscribe',
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
        'tenant.settings.billing.refund.preview',
        'tenant.settings.billing.refund.store',
        'tenant.settings.billing.refund.cancel',
        'tenant.settings.billing.refund.credit_note',
        'tenant.support.widget.init',
        'tenant.support.widget.messages',
        'tenant.support.widget.message',
        'tenant.impersonate',
        'tenant.impersonate.exit',
        'tenant.home',
        'tenant.page',
        'tenant.book',
        'tenant.book.availability',
        'tenant.book.confirmed',
        'tenant.book.ics',
        'tenant.book.cancel',
        'tenant.book.doctor',
        'tenant.book.session',
        'tenant.book.store',
        'tenant.queue.public',
        'tenant.token.status',
        'tenant.token.cancel',
        'tenant.share_image',
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
        $tenant = function_exists('tenant') ? tenant() : null;
        $user = $request->user();

        // 1. Outside tenant context or super admin bypass
        if (! $tenant || ($user && $user->hasRole('super_admin'))) {
            return $next($request);
        }

        // 2. Setup already completed: allow all requests
        if (! $tenant->needsSetup()) {
            return $next($request);
        }

        // 3. Excluded routes (setup itself, billing, logout, support, public site)
        $routeName = $request->route()?->getName();
        if ($routeName && in_array($routeName, $this->allowedRouteNames, true)) {
            return $next($request);
        }

        // 4. Role-based gating
        $isAdmin = $user && ($user->hasRole('clinic_admin') || $user->hasRole('owner'));

        if ($isAdmin) {
            // Existing clinic with active 7-day grace period: allowed with banner
            if ($tenant->inSetupGrace()) {
                return $next($request);
            }

            // After grace or new clinic without grace: redirected to setup wizard
            return redirect()->route('tenant.setup');
        }

        // Non-admin staff (doctors, receptionists, pharmacists)
        // Existing clinics (which have setup_grace_until timestamp set): staff are NEVER blocked
        if ($tenant->setup_grace_until !== null) {
            return $next($request);
        }

        // Brand-new clinics (no setup_grace_until set): show friendly waiting screen
        return Inertia::render('Setup/Waiting', [
            'clinicName' => (string) $tenant->name,
        ])->toResponse($request);
    }
}
