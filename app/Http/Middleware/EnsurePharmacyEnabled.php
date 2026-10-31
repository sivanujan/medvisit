<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Plans\PlanGate;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePharmacyEnabled
{
    public function __construct(
        protected PlanGate $planGate
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = function_exists('tenant') ? tenant() : null;

        if (! $tenant) {
            abort(404, 'Clinic not found.');
        }

        // 1. Plan-level entitlement gate (enforced only when plan gating is enabled globally)
        if ($this->planGate->isGatingEnabled() && ! $request->user()?->hasRole('super_admin') && ! (bool) $tenant->is_demo && ! $this->planGate->allows($tenant, 'pharmacy')) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => 'plan_locked',
                    'feature' => 'pharmacy',
                    'required_plan' => 'Pro',
                    'message' => 'The In-House Pharmacy module requires the Pro or Advanced plan.',
                ], 403);
            }

            return redirect()->route('tenant.dashboard')->with('plan_locked', [
                'feature' => 'pharmacy',
                'title' => 'In-House Pharmacy & Dispensing',
                'required_plan' => 'Pro',
                'description' => 'Track in-house medicine inventory, manage GRN batches, and dispense digital prescriptions directly from your clinic counter.',
                'upgrade_url' => route('tenant.settings.billing.change_plan'),
            ]);
        }

        // 2. Feature toggle check
        if (! ($tenant->pharmacy_enabled ?? false)) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => 'pharmacy_disabled',
                    'message' => 'The Pharmacy & Inventory module is currently disabled in your clinic settings.',
                ], 403);
            }

            return redirect()->route('tenant.dashboard')->with('warning', 'The Pharmacy & Inventory module is currently disabled in your clinic settings.');
        }

        return $next($request);
    }
}
