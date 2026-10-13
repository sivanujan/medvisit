<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantSuspendedController extends Controller
{
    /**
     * Display the friendly suspension / trial expired notice.
     */
    public function show(Request $request): Response
    {
        $tenant = tenant();

        $isExpired = $tenant->isTrialExpired();
        $isSuspended = $tenant->isSuspended();

        return Inertia::render('Clinic/SuspendedOrExpired', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'status' => $tenant->status,
                'plan' => $tenant->plan,
                'trial_ends_at' => $tenant->trial_ends_at?->toFormattedDateString(),
                'is_expired' => $isExpired,
                'is_suspended' => $isSuspended,
            ],
            'support' => [
                'email' => 'support@medvisit.lk',
                'phone' => '+94 11 234 5678',
                'whatsapp' => '+94 77 123 4567',
                'billingUrl' => 'https://medvisit.lk/pricing',
            ],
        ]);
    }
}
