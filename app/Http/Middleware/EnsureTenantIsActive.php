<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = tenant();

        if ($tenant && (!$tenant->isUsable())) {
            // Allow viewing the suspension page, subscribe/checkout, payment return/status, and logging out
            if ($request->routeIs(
                'tenant.suspended',
                'tenant.logout',
                'tenant.subscription.subscribe',
                'tenant.subscription.validate_promo',
                'tenant.subscription.checkout',
                'tenant.subscription.return',
                'tenant.subscription.check_status'
            )) {
                return $next($request);
            }

            return redirect()->route('tenant.suspended');
        }

        if ($request->user() && $tenant && $request->user()->tenant_id !== $tenant->id && !$request->user()->hasRole('super_admin')) {
            abort(403, 'Unauthorized tenant access.');
        }

        if ($request->user() && !(bool) ($request->user()->is_active ?? true)) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('tenant.login')->withErrors([
                'email' => 'Your account has been deactivated. Please contact your clinic administrator.',
            ]);
        }

        return $next($request);
    }
}
