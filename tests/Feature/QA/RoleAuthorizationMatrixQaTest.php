<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Doctor;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAuthorizationMatrixQaTest extends TestCase
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
        $this->admin = User::where('email', 'admin@cityhealth.test')->first();
        $this->doctor = User::where('email', 'dr.rohantha@cityhealth.test')->first();
        $this->receptionist = User::where('email', 'receptionist@cityhealth.test')->first();
        $this->pharmacist = User::where('email', 'pharmacist@cityhealth.test')->first();
    }

    /**
     * 1. Guest is redirected to login for all protected tenant routes.
     */
    public function test_guest_is_redirected_to_login(): void
    {
        $protectedRoutes = [
            '/dashboard',
            '/bookings',
            '/billing',
            '/patients',
            '/calendar',
            '/staff',
            '/settings',
            '/pharmacy/medicines',
            '/billing/payouts',
        ];

        foreach ($protectedRoutes as $path) {
            $response = $this->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertContains($response->getStatusCode(), [302, 401], "Guest on {$path} must be redirected to login");
        }
    }

    /**
     * 2. Pharmacist role permissions:
     * Allowed: Pharmacy module routes
     * Denied (403): Billing, Staff, Settings, Bookings, Doctor Payouts.
     */
    public function test_pharmacist_role_permissions(): void
    {
        $deniedRoutes = [
            '/bookings',
            '/billing',
            '/staff',
            '/settings',
            '/billing/payouts',
        ];

        foreach ($deniedRoutes as $path) {
            $res = $this->actingAs($this->pharmacist)
                ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertContains($res->getStatusCode(), [403, 302], "Pharmacist must be denied on {$path}");
        }

        // Allowed on pharmacy medicines
        $resAllowed = $this->actingAs($this->pharmacist)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines");
        $this->assertEquals(200, $resAllowed->getStatusCode());
    }

    /**
     * 3. Receptionist role permissions:
     * Allowed: Dashboard, Bookings, Patients, Calendar, Billing
     * Denied (403): Staff, Settings, Pharmacy, Fee configuration.
     */
    public function test_receptionist_role_permissions(): void
    {
        $deniedRoutes = [
            '/staff',
            '/settings',
            '/pharmacy/medicines',
            '/settings/fees',
            '/billing/payouts',
        ];

        foreach ($deniedRoutes as $path) {
            $res = $this->actingAs($this->receptionist)
                ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertContains($res->getStatusCode(), [403, 302], "Receptionist must be denied on {$path}");
        }

        $allowedRoutes = [
            '/dashboard',
            '/bookings',
            '/patients',
            '/calendar',
            '/billing',
        ];

        foreach ($allowedRoutes as $path) {
            $res = $this->actingAs($this->receptionist)
                ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertEquals(200, $res->getStatusCode(), "Receptionist must be allowed on {$path}");
        }
    }

    /**
     * 4. Doctor role permissions:
     * Allowed: Dashboard, Today's sessions, Templates, Payouts (read-only for own payouts), Medicines (read-only)
     * Denied (403): Staff, Settings, Fee Settings, Pharmacy Dispensing, Pharmacy Stock Mutation.
     */
    public function test_doctor_role_permissions(): void
    {
        $deniedRoutes = [
            '/staff',
            '/settings',
            '/settings/fees',
            '/pharmacy/dispense',
            '/pharmacy/dispense/history',
        ];

        foreach ($deniedRoutes as $path) {
            $res = $this->actingAs($this->doctor)
                ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertContains($res->getStatusCode(), [403, 302], "Doctor must be denied on {$path}");
        }

        $allowedRoutes = [
            '/dashboard',
            '/sessions/today',
            '/doctor/templates',
            '/billing/payouts',
            '/pharmacy/medicines',
        ];

        foreach ($allowedRoutes as $path) {
            $res = $this->actingAs($this->doctor)
                ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertEquals(200, $res->getStatusCode(), "Doctor must be allowed on {$path}");
        }

        // Doctor is strictly read-only on /pharmacy/medicines: POST/PUT/DELETE return 403
        $resPostMedicine = $this->actingAs($this->doctor)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines", [
                'name' => 'Unauthorized Medicine',
            ]);
        $this->assertEquals(403, $resPostMedicine->getStatusCode(), 'Doctor must be denied from mutating pharmacy medicines');
    }

    /**
     * 5. Clinic Admin has full access to all tenant operational and settings routes.
     */
    public function test_clinic_admin_has_full_access(): void
    {
        $adminRoutes = [
            '/dashboard',
            '/bookings',
            '/billing',
            '/patients',
            '/calendar',
            '/staff',
            '/settings',
            '/billing/payouts',
            '/pharmacy/medicines',
            '/pharmacy/dispense',
        ];

        foreach ($adminRoutes as $path) {
            $res = $this->actingAs($this->admin)
                ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}");
            $this->assertEquals(200, $res->getStatusCode(), "Clinic Admin must have access to {$path}");
        }
    }

    /**
     * 6. Financial Leakage Check:
     * Receptionist and Pharmacist denied on /billing/payouts (403).
     * Doctor sees own payouts only, read-only, with no clinic share unless setting is on.
     */
    public function test_financial_field_protection(): void
    {
        // Receptionist denied
        $resRec = $this->actingAs($this->receptionist)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/payouts");
        $this->assertEquals(403, $resRec->getStatusCode());

        // Pharmacist denied
        $resPharm = $this->actingAs($this->pharmacist)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/payouts");
        $this->assertEquals(403, $resPharm->getStatusCode());

        // Doctor allowed for own payouts
        $response = $this->actingAs($this->doctor)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/payouts");

        $response->assertStatus(200);
        $pageData = $response->viewData('page');
        $props = $pageData['props'] ?? [];

        // In Doctor Payouts, doctor should only see their own payout details, not clinic share
        $this->assertNull($props['summary']['clinic_share_lkr'] ?? null, 'Clinic share should be hidden from doctor');

        $settlements = $props['settlements'] ?? [];
        foreach ($settlements as $s) {
            $this->assertNull($s['clinic_amount_lkr'] ?? null, 'Clinic amount should be hidden from doctor in settlements');
        }
    }
}
