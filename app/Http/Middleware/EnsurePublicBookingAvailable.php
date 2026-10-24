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

        if ($tenant) {
            $isSubInactive = ! $tenant->hasActiveSubscription();
            $isBookingDisabled = ! (bool) ($tenant->online_booking_enabled ?? true);

            if ($isSubInactive || $isBookingDisabled) {
                $message = $isSubInactive
                    ? "This clinic's online booking is not available right now."
                    : 'Online booking is currently disabled for this clinic. Please contact the clinic directly.';

                if ($request->expectsJson() || $request->is('book/api/*')) {
                    return response()->json([
                        'message' => $message,
                    ], 503);
                }

                return Inertia::render('Public/BookingUnavailable', [
                    'clinicName' => $tenant->name ?? 'Clinic',
                    'phone' => $tenant->phone ?? '',
                    'address' => $tenant->address ?? '',
                ])->toResponse($request)->setStatusCode(503);
            }
        }

        if ($request->hasSession() && $request->query('source') === 'directory') {
            $request->session()->put('booking_source', 'directory');
        }

        return $next($request);
    }
}
