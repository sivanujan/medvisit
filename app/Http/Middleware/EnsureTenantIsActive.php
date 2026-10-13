<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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

        if ($tenant && (! $tenant->isUsable())) {
            // Allow viewing the suspension page and logging out
            if ($request->routeIs('tenant.suspended', 'tenant.logout')) {
                return $next($request);
            }

            return redirect()->route('tenant.suspended');
        }

        return $next($request);
    }
}
