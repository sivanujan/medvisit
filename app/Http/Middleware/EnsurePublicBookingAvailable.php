<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsurePublicBookingAvailable
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = tenant();

        if ($tenant && ! $tenant->hasActiveSubscription()) {
            if ($request->expectsJson() || $request->is('book/api/*')) {
                return response()->json([
                    'message' => "This clinic's online booking is not available right now.",
                ], 503);
            }

            return Inertia::render('Public/BookingUnavailable', [
                'clinicName' => $tenant->name ?? 'Clinic',
                'phone' => $tenant->phone ?? '',
                'address' => $tenant->address ?? '',
            ])->toResponse($request)->setStatusCode(503);
        }

        return $next($request);
    }
}
