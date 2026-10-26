<?php

namespace Tests\Feature\QA;

use App\Mail\Clinic\ClinicReadyMail;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ClinicSetupWizardQaTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected Tenant $tenantC;

    protected Tenant $tenantD;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(QaScenarioSeeder::class);

        $this->tenantA = Tenant::where('id', 'cityhealth')->firstOrFail();
        $this->tenantB = Tenant::where('id', 'apexcare')->firstOrFail();
        $this->tenantC = Tenant::where('id', 'novaclinic')->firstOrFail();
        $this->tenantD = Tenant::where('id', 'lankamed')->firstOrFail();
        $this->baseDomain = config('tenancy.central_domains.0', 'medvisit.localhost');
    }

    public function test_tenant_d_brand_new_paid_clinic_is_gated_immediately_to_setup(): void
    {
        $adminD = User::where('email', 'admin@lankamed.test')->firstOrFail();

        $response = $this->actingAs($adminD)
            ->get("http://lankamed.{$this->baseDomain}/dashboard");

        // Admin of new paid clinic must be redirected to setup
        $response->assertRedirect("http://lankamed.{$this->baseDomain}/setup");
    }

    public function test_tenant_c_trial_in_grace_period_is_allowed_and_receives_grace_banner(): void
    {
        $adminC = User::where('email', 'admin@novaclinic.test')->firstOrFail();

        // Ensure grace is currently active
        $this->tenantC->update([
            'setup_grace_until' => Carbon::now()->addDays(5),
            'setup_completed_at' => null,
        ]);

        $response = $this->actingAs($adminC)
            ->get("http://novaclinic.{$this->baseDomain}/dashboard");

        // Allowed to dashboard because inSetupGrace is true
        $response->assertStatus(200);

        tenancy()->end();

        // Time travel past grace period
        $this->tenantC->update([
            'setup_grace_until' => Carbon::now()->subHour(),
        ]);

        $responseLocked = $this->actingAs($adminC)
            ->get("http://novaclinic.{$this->baseDomain}/dashboard");

        // Locked after grace expires!
        $responseLocked->assertRedirect("http://novaclinic.{$this->baseDomain}/setup");
    }

    public function test_staff_in_existing_clinic_never_blocked_but_staff_in_new_clinic_shown_waiting_screen(): void
    {
        // 1. Existing clinic with setup_grace_until set (novaclinic): receptionist is NEVER blocked
        $this->tenantC->update([
            'setup_grace_until' => Carbon::now()->subDays(2), // expired grace
            'setup_completed_at' => null,
        ]);
        $receptionistC = User::where('email', 'receptionist@novaclinic.test')->firstOrFail();

        $responseC = $this->actingAs($receptionistC)
            ->get("http://novaclinic.{$this->baseDomain}/sessions/today");

        $responseC->assertStatus(200);

        tenancy()->end();

        // 2. Brand new clinic without grace (lankamed): receptionist gets Setup/Waiting screen
        $receptionistD = User::where('email', 'receptionist@lankamed.test')->firstOrFail();

        $responseD = $this->actingAs($receptionistD)
            ->get("http://lankamed.{$this->baseDomain}/sessions/today");

        // Must render Setup/Waiting
        $responseD->assertStatus(200);
        $responseD->assertInertia(fn ($page) => $page->component('Setup/Waiting'));
    }

    public function test_setup_step_validation_rules(): void
    {
        $adminD = User::where('email', 'admin@lankamed.test')->firstOrFail();

        // Step 5: Opening hours - must have at least one open day
        $responseHoursFail = $this->actingAs($adminD)
            ->postJson("http://lankamed.{$this->baseDomain}/setup/step/5", [
                'days' => [
                    ['day' => 'mon', 'open' => false, 'ranges' => []],
                    ['day' => 'tue', 'open' => false, 'ranges' => []],
                    ['day' => 'wed', 'open' => false, 'ranges' => []],
                    ['day' => 'thu', 'open' => false, 'ranges' => []],
                    ['day' => 'fri', 'open' => false, 'ranges' => []],
                    ['day' => 'sat', 'open' => false, 'ranges' => []],
                    ['day' => 'sun', 'open' => false, 'ranges' => []],
                ],
            ]);
        $responseHoursFail->assertStatus(422);
        $responseHoursFail->assertJsonValidationErrors(['days']);

        // Step 6: Services - must have at least 1 service
        $responseServicesFail = $this->actingAs($adminD)
            ->postJson("http://lankamed.{$this->baseDomain}/setup/step/6", [
                'services' => [],
            ]);
        $responseServicesFail->assertStatus(422);
        $responseServicesFail->assertJsonValidationErrors(['services']);

        tenancy()->end();

        // Step 8: Pharmacy on Basic Plan (tenant B: apexcare) is blocked with upgrade message
        $adminB = User::withoutGlobalScopes()->where('email', 'admin@apexcare.test')->firstOrFail();
        $responsePharmacyBasic = $this->actingAs($adminB)
            ->postJson("http://apexcare.{$this->baseDomain}/setup/step/8", [
                'pharmacy_enabled' => true,
            ]);
        $responsePharmacyBasic->assertStatus(422);
        $responsePharmacyBasic->assertJsonValidationErrors(['pharmacy_enabled']);

        tenancy()->end();

        // Step 10: Directory enabled requires explicit consent
        $responseDirectoryConsentFail = $this->actingAs($adminD)
            ->postJson("http://lankamed.{$this->baseDomain}/setup/step/10", [
                'directory_enabled' => true,
                'consent' => false,
            ]);
        $responseDirectoryConsentFail->assertStatus(422);
        $responseDirectoryConsentFail->assertJsonValidationErrors(['consent']);
    }

    public function test_setup_persistence_and_completion_dispatches_email(): void
    {
        Mail::fake();

        $adminD = User::where('email', 'admin@lankamed.test')->firstOrFail();
        $base = "http://lankamed.{$this->baseDomain}";

        // Save Step 2: Brand & Logo (Initials)
        $resStep2 = $this->actingAs($adminD)
            ->postJson($base.'/setup/step/2', [
                'brand_color' => '#0E9E8F',
                'theme' => 'medvisit-teal',
                'use_initials' => true,
            ]);
        $resStep2->assertJson(['success' => true]);

        // Save Step 4: Address
        $resStep4 = $this->actingAs($adminD)
            ->postJson($base.'/setup/step/4', [
                'address_line' => '123 Galle Road',
                'city' => 'Colombo 03',
                'district' => 'Colombo',
                'postal_code' => '00300',
                'phone' => '+94112345678',
                'latitude' => 6.9271,
                'longitude' => 79.8612,
            ]);
        $resStep4->assertJson(['success' => true]);

        // Save Step 5: Hours
        $resStep5 = $this->actingAs($adminD)
            ->postJson($base.'/setup/step/5', [
                'days' => [
                    ['day' => 'mon', 'open' => true, 'ranges' => [['from' => '08:00', 'to' => '17:00']]],
                    ['day' => 'tue', 'open' => false, 'ranges' => []],
                    ['day' => 'wed', 'open' => false, 'ranges' => []],
                    ['day' => 'thu', 'open' => false, 'ranges' => []],
                    ['day' => 'fri', 'open' => false, 'ranges' => []],
                    ['day' => 'sat', 'open' => false, 'ranges' => []],
                    ['day' => 'sun', 'open' => false, 'ranges' => []],
                ],
            ]);
        $resStep5->assertJson(['success' => true]);

        // Save Step 6: Services
        $resStep6 = $this->actingAs($adminD)
            ->postJson($base.'/setup/step/6', [
                'services' => ['General OPD', 'Vaccination'],
            ]);
        $resStep6->assertJson(['success' => true]);

        $resComplete = $this->actingAs($adminD)
            ->postJson($base.'/setup/complete');

        $resComplete->assertStatus(200);
        $resComplete->assertJson(['success' => true, 'celebration' => true]);

        // Verify tenant is marked setup_completed
        $this->assertNotNull($this->tenantD->fresh()->setup_completed_at);

        // Verify ClinicReadyMail was queued
        Mail::assertQueued(ClinicReadyMail::class, function ($mail) use ($adminD) {
            return $mail->hasTo($adminD->email);
        });
    }
}
