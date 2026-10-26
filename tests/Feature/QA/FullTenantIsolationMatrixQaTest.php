<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FullTenantIsolationMatrixQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenantCity;

    private Tenant $tenantLanka;

    private User $adminCity;

    private User $adminLanka;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenantCity = Tenant::find('cityhealth');
        $this->tenantLanka = Tenant::find('apexcare');

        $this->adminCity = User::where('email', 'admin@cityhealth.test')->firstOrFail();
        $this->adminLanka = User::where('email', 'admin@apexcare.test')->firstOrFail();
    }

    /**
     * Cross-Tenant IDOR Attack Matrix:
     * Attempts 8 distinct cross-tenant resource injections from Tenant ApexCare attempting to access Tenant City records.
     * All 8 attacks MUST be stopped with 404 Not Found or 403 Forbidden.
     */
    public function test_cross_tenant_idor_attack_matrix(): void
    {
        $cityId = $this->tenantCity->id;
        $lankaDomain = "http://apexcare.{$this->baseDomain}";

        // Pre-fetch target City entities without tenant scope interference
        $cityPatient = Patient::withoutGlobalScopes()->where('tenant_id', $cityId)->firstOrFail();
        $cityDoctor = Doctor::withoutGlobalScopes()->where('tenant_id', $cityId)->firstOrFail();
        $citySession = DoctorSession::withoutGlobalScopes()->where('tenant_id', $cityId)->firstOrFail();
        $cityBill = Bill::withoutGlobalScopes()->where('tenant_id', $cityId)->firstOrFail();
        $cityToken = BookingToken::withoutGlobalScopes()->where('tenant_id', $cityId)->firstOrFail();
        $cityRx = Prescription::withoutGlobalScopes()->where('tenant_id', $cityId)->first();
        $cityMed = ClinicMedicine::withoutGlobalScopes()->where('tenant_id', $cityId)->first();

        // 1. Patient IDOR: Lanka admin requests City patient
        $resPatient = $this->actingAs($this->adminLanka)
            ->get("{$lankaDomain}/patients/{$cityPatient->id}/history");
        $this->assertContains($resPatient->getStatusCode(), [404, 403], 'Cross-tenant patient access must return 404/403');

        // 2. Doctor Session IDOR: Lanka admin queries City doctor session
        $resSession = $this->actingAs($this->adminLanka)
            ->get("{$lankaDomain}/calendar?doctor_id={$cityDoctor->id}");
        $resSession->assertOk();
        $sessions = $resSession->viewData('page')['props']['sessions'] ?? [];
        $this->assertNotContains($citySession->id, array_column($sessions, 'id'), 'Foreign tenant session must not appear');

        // 3. Bill IDOR: Lanka admin attempts to view/pay City bill
        $resBill = $this->actingAs($this->adminLanka)
            ->post("{$lankaDomain}/billing/{$cityBill->id}/pay", [
                'payment_method' => 'cash',
            ]);
        $this->assertContains($resBill->getStatusCode(), [404, 403], 'Cross-tenant bill mutation must return 404/403');

        // 4. Booking Token IDOR: Lanka admin attempts to cancel/move City token
        $resToken = $this->actingAs($this->adminLanka)
            ->post("{$lankaDomain}/bookings/{$cityToken->id}/move", [
                'destination_session_id' => 99999,
            ]);
        $this->assertContains($resToken->getStatusCode(), [404, 403], 'Cross-tenant token manipulation must return 404/403');

        // 5. Prescription IDOR: Lanka admin attempts to view City prescription
        if ($cityRx) {
            $resRx = $this->actingAs($this->adminLanka)
                ->get("{$lankaDomain}/doctor/prescriptions/{$cityRx->id}");
            $this->assertContains($resRx->getStatusCode(), [404, 403], 'Cross-tenant prescription access must return 404/403');
        }

        // 6. Pharmacy Stock IDOR: Lanka admin queries City medicine
        if ($cityMed) {
            $resMed = $this->actingAs($this->adminLanka)
                ->get("{$lankaDomain}/pharmacy/medicines/{$cityMed->id}");
            $this->assertContains($resMed->getStatusCode(), [404, 403], 'Cross-tenant medicine access must return 404/403');
        }

        // 7. Staff IDOR: Lanka admin attempts to toggle City staff member
        $resStaff = $this->actingAs($this->adminLanka)
            ->patch("{$lankaDomain}/staff/{$this->adminCity->id}/toggle-status");
        $this->assertContains($resStaff->getStatusCode(), [404, 403], 'Cross-tenant staff manipulation must return 404/403');

        // 8. Website Builder IDOR: Lanka admin attempts to mutate City website page
        $resPage = $this->actingAs($this->adminLanka)
            ->patch("{$lankaDomain}/website/pages/1", [
                'title' => 'Hacked Title',
                'slug' => 'hacked',
            ]);
        $this->assertContains($resPage->getStatusCode(), [404, 403], 'Cross-tenant page mutation must return 404/403');
    }
}
