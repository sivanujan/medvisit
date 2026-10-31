<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Plans\PlanGate;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlanAllows
{
    public function __construct(
        protected PlanGate $planGate
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $tenant = tenant();

        // Platform super admins or demo sandbox bypass plan gating
        if (! $tenant || $request->user()?->hasRole('super_admin') || (bool) $tenant->is_demo) {
            return $next($request);
        }

        if ($this->planGate->allows($tenant, $feature)) {
            return $next($request);
        }

        $featureLabels = [
            'pharmacy' => [
                'name' => 'In-House Pharmacy & Dispensing',
                'plan' => 'Pro',
                'description' => 'Track internal medicine stock, register batches with GRN, and dispense electronic prescriptions directly at your counter.',
            ],
            'website_builder' => [
                'name' => 'MedVisit Visual Page Builder',
                'plan' => 'Pro',
                'description' => 'Customize your clinic website with live drag-and-drop sections, custom galleries, doctor bios, and visual themes.',
            ],
            'audit_export' => [
                'name' => 'Audit Log CSV Export',
                'plan' => 'Pro',
                'description' => 'Export compliance logs, staff session histories, and clinical audit events for accreditation and reporting.',
            ],
            'tv_multi_room' => [
                'name' => 'Multi-Room TV Queue Filter',
                'plan' => 'Pro',
                'description' => 'Dedicate individual Smart TV displays to specific consultation rooms or individual doctor queues.',
            ],
        ];

        $info = $featureLabels[$feature] ?? [
            'name' => ucfirst(str_replace('_', ' ', $feature)),
            'plan' => 'Pro',
            'description' => 'Upgrade your subscription plan to unlock this capability for your clinic team.',
        ];

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'error' => 'plan_locked',
                'feature' => $feature,
                'required_plan' => $info['plan'],
                'message' => "The {$info['name']} feature is available on the {$info['plan']} plan. Please upgrade your subscription to access.",
            ], 403);
        }

        // Redirect back with friendly flash data for the modal (never raw 403 page)
        return redirect()->back()->with('plan_locked', [
            'feature' => $feature,
            'title' => $info['name'],
            'required_plan' => $info['plan'],
            'description' => $info['description'],
            'upgrade_url' => route('tenant.settings.billing.change_plan'),
        ]);
    }
}
