<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Demo\DemoModeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TenantDemoLoginController extends Controller
{
    /**
     * Consume a signed login link to instantly enter the demo clinic under a specific role.
     */
    public function login(Request $request, string $role, DemoModeService $demoService): RedirectResponse
    {
        $tenant = $demoService->currentTenant();

        if (! $tenant || ! $tenant->is_demo) {
            abort(403, 'Demo login is only permitted on the public demo sandbox.');
        }

        // Validate signature
        if (! $request->hasValidSignature()) {
            abort(403, 'The demo access link has expired or is invalid. Please launch the demo again from medvisit.lk/demo.');
        }

        $user = $demoService->findUserForRole($role);
        if (! $user) {
            abort(404, "Demo user for role '{$role}' not found.");
        }

        // Authenticate as the demo user
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        // Record demo session state
        session([
            'is_demo_session' => true,
            'demo_role' => $role,
            'demo_login_at' => now()->toIso8601String(),
        ]);

        // Track role tried on lead record if cookie exists
        $this->recordRoleTriedOnLead($request, $role);

        $defaultPath = match ($role) {
            'receptionist' => '/queue',
            'doctor' => '/doctor',
            'pharmacist' => '/pharmacy/dispense',
            default => '/dashboard',
        };

        $redirect = $request->query('redirect');
        $destination = ($redirect && str_starts_with($redirect, '/')) ? $redirect : $defaultPath;

        return redirect($destination)->with('success', "Welcome to the MedVisit Demo Sandbox! You are exploring as {$user->name}.");
    }

    /**
     * Switch role directly from the inside the demo clinic banner without re-entering email or forms.
     */
    public function switchRole(Request $request, DemoModeService $demoService): RedirectResponse
    {
        $tenant = $demoService->currentTenant();

        if (! $tenant || ! $tenant->is_demo) {
            abort(403, 'Role switching is only permitted on the public demo sandbox.');
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:clinic_admin,receptionist,doctor,pharmacist'],
        ]);

        $role = $validated['role'];
        $user = $demoService->findUserForRole($role);

        if (! $user) {
            return redirect()->back()->with('error', "Role '{$role}' is currently unavailable.");
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        session([
            'is_demo_session' => true,
            'demo_role' => $role,
            'demo_login_at' => now()->toIso8601String(),
        ]);

        $this->recordRoleTriedOnLead($request, $role);

        $defaultPath = match ($role) {
            'receptionist' => '/queue',
            'doctor' => '/doctor',
            'pharmacist' => '/pharmacy/dispense',
            default => '/dashboard',
        };

        return redirect($defaultPath)->with('success', "Switched role to {$user->name}.");
    }

    /**
     * Record role activity on lead if tracked.
     */
    protected function recordRoleTriedOnLead(Request $request, string $role): void
    {
        $leadId = $request->cookie('medvisit_demo_lead_id') ?? $request->query('lead_id');

        if (! $leadId) {
            return;
        }

        $lead = Lead::find($leadId);
        if ($lead) {
            $existingRoles = is_array($lead->roles_tried) ? $lead->roles_tried : [];
            if (! in_array($role, $existingRoles, true)) {
                $existingRoles[] = $role;
            }

            $lead->update([
                'last_seen_at' => now(),
                'sessions_count' => ($lead->sessions_count ?? 0) + 1,
                'roles_tried' => $existingRoles,
            ]);
        }
    }
}
