<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Carbon\Carbon;
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
            if ($tenant->isSuspended() || $tenant->status === 'suspended' || $tenant->status === 'inactive') {
                abort(404);
            }

            // Demo tenant: online booking is always enabled for visitor showcases
            if ((bool) $tenant->is_demo) {
                if ($request->hasSession() && $request->query('source') === 'directory') {
                    $request->session()->put('booking_source', 'directory');
                }

                return $next($request);
            }

            $isBookingDisabled = ! (bool) ($tenant->online_booking_enabled ?? true);
            $isSubInactive = ! $tenant->hasActiveSubscription();

            if ($isBookingDisabled || $isSubInactive) {
                $mode = $isBookingDisabled ? 'booking_off' : 'technical_outage';
                $message = $isBookingDisabled
                    ? "{$tenant->name} takes appointments by phone or at the reception."
                    : 'Online booking is temporarily unavailable for this clinic. Please contact the clinic directly.';

                $statusCode = $isBookingDisabled ? 200 : 503;

                if ($request->expectsJson() || $request->is('book/api/*')) {
                    return response()->json([
                        'message' => $message,
                        'mode' => $mode,
                    ], $statusCode);
                }

                $now = Carbon::now('Asia/Colombo');
                $currentDay = strtolower($now->format('D'));
                $currentMinutes = $now->hour * 60 + $now->minute;
                $isOpenNow = ($currentDay === 'sun')
                    ? ($currentMinutes >= 480 && $currentMinutes < 840)
                    : ($currentMinutes >= 480 && $currentMinutes < 1200);

                return Inertia::render('Public/BookingUnavailable', [
                    'mode' => $mode,
                    'clinicName' => $tenant->name ?? 'Clinic',
                    'phone' => $tenant->phone ?? config('medvisit_public.business.phone_display', '070 129 1688'),
                    'whatsapp' => $tenant->whatsapp_number ?: ($tenant->phone ?? config('medvisit_public.business.phone_display', '070 129 1688')),
                    'address' => $tenant->formatted_address ?: ($tenant->address ?? 'Sri Lanka'),
                    'openingHours' => $tenant->opening_hours ?? 'Mon – Sat: 08:00 AM – 08:00 PM | Sun: 08:00 AM – 02:00 PM',
                    'isOpenNow' => $isOpenNow,
                    'isDemo' => (bool) $tenant->is_demo,
                ])->toResponse($request)->setStatusCode($statusCode);
            }
        }

        if ($request->hasSession() && $request->query('source') === 'directory') {
            $request->session()->put('booking_source', 'directory');
        }

        return $next($request);
    }
}
