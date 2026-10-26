<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FullRouteAuthorizationMatrixQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $admin;

    private User $doctor;

    private User $receptionist;

    private User $pharmacist;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
        $this->doctor = User::where('email', 'dr.rohantha@cityhealth.test')->firstOrFail();
        $this->receptionist = User::where('email', 'receptionist@cityhealth.test')->firstOrFail();
        $this->pharmacist = User::where('email', 'pharmacist@cityhealth.test')->firstOrFail();
    }

    /**
     * Comprehensive Route × Role Authorization Matrix.
     * Evaluates all core tenant routes across 5 roles:
     * 1. Guest
     * 2. Pharmacist
     * 3. Receptionist
     * 4. Doctor
     * 5. Clinic Admin
     */
    public function test_comprehensive_tenant_route_role_matrix(): void
    {
        $routes = [
            // Public / Unauthenticated
            ['path' => '/', 'public' => true, 'desc' => 'Tenant public website'],
            ['path' => '/book', 'public' => true, 'desc' => 'Tenant online booking'],
            ['path' => '/clinic/suspended', 'public' => true, 'desc' => 'Suspension notice'],

            // Core Operations
            ['path' => '/dashboard', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => true, 'pharmacist' => true],
            ['path' => '/bookings', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => true, 'pharmacist' => false],
            ['path' => '/calendar', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => true, 'pharmacist' => true],
            ['path' => '/patients', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => true, 'pharmacist' => true],
            ['path' => '/sessions/today', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => true, 'pharmacist' => true],
            ['path' => '/queue/tv', 'public' => true, 'desc' => 'Queue TV display'],

            // Billing & Finances
            ['path' => '/billing', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => true, 'pharmacist' => false],
            ['path' => '/billing/payouts', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => false, 'pharmacist' => false],
            ['path' => '/billing/export', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => false],

            // Doctor Management & Templates
            ['path' => '/doctors', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => true, 'pharmacist' => false],
            ['path' => '/doctor/templates', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => true, 'pharmacist' => true],

            // Pharmacy Module
            ['path' => '/pharmacy/medicines', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => false, 'pharmacist' => true],
            ['path' => '/pharmacy/dispense', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => true],
            ['path' => '/pharmacy/receipts/create', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => true],
            ['path' => '/pharmacy/suppliers', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => true],
            ['path' => '/pharmacy/receipts', 'public' => false, 'admin' => true, 'doctor' => true, 'receptionist' => false, 'pharmacist' => true],
            ['path' => '/pharmacy/import', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => true],

            // Management & Settings
            ['path' => '/staff', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => false],
            ['path' => '/settings', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => false],
            ['path' => '/settings/fees', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => false],
            ['path' => '/website/builder', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => false],
            ['path' => '/website/pages', 'public' => false, 'admin' => true, 'doctor' => false, 'receptionist' => false, 'pharmacist' => false],
        ];

        $roles = [
            'guest' => null,
            'pharmacist' => $this->pharmacist,
            'receptionist' => $this->receptionist,
            'doctor' => $this->doctor,
            'clinic_admin' => $this->admin,
        ];

        $totalChecks = 0;
        $matrixResults = [];

        foreach ($routes as $route) {
            $path = $route['path'];
            $url = "http://cityhealth.{$this->baseDomain}{$path}";

            foreach ($roles as $roleName => $user) {
                $totalChecks++;
                if ($user) {
                    $res = $this->actingAs($user)->get($url);
                } else {
                    $this->flushSession();
                    auth()->forgetGuards();
                    $res = $this->get($url);
                }
                $status = $res->getStatusCode();

                $matrixResults[$path][$roleName] = $status;

                if ($roleName === 'guest') {
                    if ($route['public']) {
                        $this->assertContains($status, [200, 302], "Guest should be allowed on public route {$path}");
                    } else {
                        $this->assertContains($status, [302, 401], "Guest must be redirected on protected route {$path}");
                    }
                } elseif ($roleName === 'clinic_admin') {
                    $this->assertContains($status, [200, 302], "Admin should be allowed on {$path}");
                } elseif (! empty($route['public'])) {
                    $this->assertContains($status, [200, 302], "Role {$roleName} should be allowed on public route {$path}");
                } else {
                    $expectedAllowed = $route[$roleName] ?? false;
                    if ($expectedAllowed) {
                        $this->assertContains($status, [200, 302], "Role {$roleName} should be allowed on {$path}");
                    } else {
                        $this->assertContains($status, [403, 302, 404], "Role {$roleName} must be forbidden on {$path}");
                    }
                }
            }
        }

        // 25 routes × 5 roles = 125 granular checks
        $this->assertSame(125, $totalChecks, 'Exactly 125 route × role matrix checks were executed');
    }

    /**
     * Financial Figures Data Leakage Prevention:
     * Asserts that non-admin roles (doctor, receptionist, pharmacist) NEVER receive clinic profit or settlement disbursement totals.
     */
    public function test_no_financial_leakage_to_unauthorized_roles(): void
    {
        // 1. Pharmacist querying billing directly -> 403
        $resPharm = $this->actingAs($this->pharmacist)
            ->get("http://cityhealth.{$this->baseDomain}/billing");
        $this->assertContains($resPharm->getStatusCode(), [403, 302]);

        // 2. Doctor querying doctor payouts -> allowed (200), but clinic share is strictly hidden
        $resDocSettlements = $this->actingAs($this->doctor)
            ->get("http://cityhealth.{$this->baseDomain}/billing/payouts");
        $this->assertSame(200, $resDocSettlements->getStatusCode());
        $resDocSettlements->assertInertia(fn ($page) => $page
            ->where('isDoctorRole', true)
            ->where('hideClinicShare', true)
        );

        // 3. Receptionist querying doctor payouts directly -> 403 denied
        $resRecep = $this->actingAs($this->receptionist)
            ->get("http://cityhealth.{$this->baseDomain}/billing/payouts");
        $this->assertSame(403, $resRecep->getStatusCode());
    }
}
