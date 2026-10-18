<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePharmacyEnabled
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = function_exists('tenant') ? tenant() : null;

        if (! $tenant || ! ($tenant->pharmacy_enabled ?? false)) {
            abort(403, 'The Pharmacy & Inventory module is not enabled for this clinic.');
        }

        return $next($request);
    }
}
