<?php

declare(strict_types=1);

namespace App\Services\Demo;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class DemoModeService
{
    /**
     * Check if the current tenant is in demo mode.
     */
    public function isDemo(): bool
    {
        $tenant = $this->currentTenant();

        return (bool) ($tenant && $tenant->is_demo);
    }

    /**
     * Get the active tenant if available.
     */
    public function currentTenant(): ?Tenant
    {
        if (function_exists('tenant')) {
            $t = tenant();
            if ($t instanceof Tenant) {
                return $t;
            }
        }

        return null;
    }

    /**
     * Determine if a given request attempts a restricted action in demo mode.
     */
    public function isRestrictedRequest(Request $request): bool
    {
        if (! $this->isDemo()) {
            return false;
        }

        // Only write methods (POST, PUT, PATCH, DELETE) can be restricted
        if ($request->isMethodSafe()) {
            return false;
        }

        $path = trim($request->path(), '/');
        $routeName = $request->route()?->getName() ?? '';

        // 1. Password, Email, and 2FA modifications
        if (
            str_contains($path, 'password') ||
            str_contains($path, 'two-factor') ||
            str_contains($routeName, 'password.update') ||
            str_contains($routeName, 'user-password.update') ||
            str_contains($routeName, 'two-factor')
        ) {
            return true;
        }

        // 2. Staff user creation, invitation, deletion, or role/password tampering
        if (
            $request->is('staff/*') ||
            $request->is('staff') ||
            $request->is('users/*') ||
            str_contains($routeName, 'staff')
        ) {
            return true;
        }

        // 3. Profile account deletion
        if ($request->is('profile') && $request->isMethod('delete')) {
            return true;
        }

        // 3. Subscription & Billing upgrades or cancellations on the demo tenant
        if (
            str_contains($path, 'subscription/checkout') ||
            str_contains($path, 'subscription/cancel') ||
            str_contains($path, 'subscription/upgrade') ||
            str_contains($routeName, 'subscription.checkout') ||
            str_contains($routeName, 'subscription.cancel')
        ) {
            return true;
        }

        // 4. Subdomain rename or clinic deletion
        if (
            ($request->is('settings/clinic') || str_contains($path, 'settings/domain')) &&
            ($request->has('subdomain') && $request->input('subdomain') !== config('demo.subdomain', 'demo'))
        ) {
            return true;
        }

        if ($request->is('settings/clinic/delete') || str_contains($routeName, 'clinic.destroy')) {
            return true;
        }

        return false;
    }

    /**
     * Get the standardized restriction message.
     */
    public function getRestrictionMessage(): string
    {
        return 'This action is disabled in the demo sandbox to keep it accessible for all visitors. The demo resets nightly at 03:00 Colombo time.';
    }

    /**
     * Available demo roles with their persona details.
     *
     * @return array<string, array{name: string, title: string, description: string, email: string, icon: string, badge: string, tourKey: string}>
     */
    public function getDemoRoles(): array
    {
        return [
            'clinic_admin' => [
                'name' => 'Demo Admin (Dr. K. Nimalan)',
                'title' => 'Clinic Owner & Administrator',
                'description' => 'Full control over clinic settings, fee structures, doctor profiles, staff, reports, and revenue analytics.',
                'email' => 'demo.admin@medvisit.lk',
                'icon' => 'ShieldCheck',
                'badge' => 'Full Access',
                'tourKey' => 'admin_overview',
            ],
            'receptionist' => [
                'name' => 'Sanduni Silva',
                'title' => 'Front Desk & Reception',
                'description' => 'Issue tokens in under 15 seconds, check in walk-in and online patients, collect payments, and print thermal slips.',
                'email' => 'demo.reception@medvisit.lk',
                'icon' => 'Ticket',
                'badge' => 'Fast Outpatient Flow',
                'tourKey' => 'reception_queue',
            ],
            'doctor' => [
                'name' => 'Dr. Nimal Senaratne',
                'title' => 'Consultant Physician',
                'description' => '1-click next patient calling, clinical notes, multi-language prescription templates (EN/TA/SI), and patient history.',
                'email' => 'demo.doctor@medvisit.lk',
                'icon' => 'Stethoscope',
                'badge' => 'Doctor Station',
                'tourKey' => 'doctor_console',
            ],
            'pharmacist' => [
                'name' => 'Rohan Perera',
                'title' => 'Chief Pharmacist',
                'description' => 'Real-time dispense queue from doctors, batch-level stock depletion, low-stock warnings, and GRN receipts.',
                'email' => 'demo.pharmacy@medvisit.lk',
                'icon' => 'Pill',
                'badge' => 'Pharmacy Counter',
                'tourKey' => 'pharmacy_dispense',
            ],
        ];
    }

    /**
     * Generate a signed single-use login URL for the given role on the demo tenant.
     */
    public function generateSignedLoginUrl(string $role, ?string $redirect = null): string
    {
        $tenant = Tenant::where('is_demo', true)->where('subdomain', config('demo.subdomain', 'demo'))->first();
        if (! $tenant) {
            $tenant = Tenant::find(config('demo.tenant_id', 'demo'));
        }

        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $scheme = (app()->environment('production') || config('demo.force_https', false)) ? 'https' : 'http';
        $port = request()->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443], true)) ? ":{$port}" : '';

        $host = "demo.{$baseDomain}{$portSuffix}";
        $rootUrl = "{$scheme}://{$host}";

        $expiry = now()->addSeconds(60);

        URL::forceRootUrl($rootUrl);
        try {
            return URL::temporarySignedRoute(
                'demo.signed-login',
                $expiry,
                [
                    'role' => $role,
                    'redirect' => $redirect,
                ]
            );
        } finally {
            URL::forceRootUrl(null);
        }
    }

    /**
     * Authenticate user for the requested role on the demo tenant.
     */
    public function findUserForRole(string $role): ?User
    {
        $tenantId = config('demo.tenant_id', 'demo');

        $emailMap = [
            'clinic_admin' => 'demo.admin@medvisit.lk',
            'receptionist' => 'demo.reception@medvisit.lk',
            'doctor' => 'demo.doctor@medvisit.lk',
            'pharmacist' => 'demo.pharmacy@medvisit.lk',
        ];

        $email = $emailMap[$role] ?? null;
        if (! $email) {
            return null;
        }

        return User::where('tenant_id', $tenantId)
            ->where('email', $email)
            ->first();
    }
}
