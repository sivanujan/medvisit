<?php

declare(strict_types=1);

namespace Tests\Feature\Plans;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Plans\PlanGate;
use App\Services\PlatformSettingsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaunchOfferAndDowngradeTest extends TestCase
{
    use RefreshDatabase;

    private Plan $basicPlan;

    private Plan $advancedPlan;

    protected function setUp(): void
    {
        parent::setUp();

        config(['plans.gating_enabled' => true]);
        PlanGate::clearCache();

        $this->basicPlan = Plan::firstOrCreate(
            ['slug' => 'basic'],
            [
                'name' => 'Basic',
                'price_cents' => 700000,
                'billing_interval' => 'month',
                'is_active' => true,
                'features' => config('plans.tiers.basic.features'),
                'limits' => config('plans.tiers.basic.limits'),
            ]
        );

        $this->advancedPlan = Plan::firstOrCreate(
            ['slug' => 'advanced'],
            [
                'name' => 'Advanced',
                'price_cents' => 1500000,
                'billing_interval' => 'month',
                'is_active' => true,
                'features' => config('plans.tiers.advanced.features'),
                'limits' => config('plans.tiers.advanced.limits'),
            ]
        );
    }

    public function test_launch_offer_caps_sms_at_500(): void
    {
        app(PlatformSettingsService::class)->set('launch_offer.enabled', true);
        app(PlatformSettingsService::class)->set('launch_offer.free_months', 3);
        app(PlatformSettingsService::class)->set('launch_offer.sms_cap', 500);

        $tenant = Tenant::factory()->active()->create([
            'id' => 'offer-clinic',
            'subdomain' => 'offer-clinic',
            'name' => 'Offer Clinic Care',
            'plan' => 'advanced',
            'is_launch_offer' => true,
        ]);

        $tenant->subscription()->update([
            'plan_id' => $this->advancedPlan->id,
            'status' => 'active',
            'current_period_end' => now()->addMonths(3),
        ]);
        $tenant->refresh();
        $tenant->load('subscription.plan');

        $planGate = app(PlanGate::class);

        $this->assertTrue($planGate->isLaunchOfferActive($tenant));
        $this->assertSame(500, $planGate->limit($tenant, 'sms_monthly'));
        $this->assertSame(-1, $planGate->limit($tenant, 'doctors'));
    }

    public function test_downgrade_preserves_selected_doctors_and_deactivates_excess_without_deletion(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'down-clinic',
            'subdomain' => 'down-clinic',
            'name' => 'Down Clinic Care',
            'plan' => 'advanced',
        ]);

        $tenant->subscription()->update([
            'plan_id' => $this->advancedPlan->id,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@downclinic.lk',
        ]);

        // Create 4 doctors
        $doc1 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. One']);
        $doc2 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Two']);
        $doc3 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Three']);
        $doc4 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Four']);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        // Downgrade to Basic (limit 3 doctors), keeping 1, 2, and 3
        $response = $this->actingAs($admin)
            ->post("http://down-clinic.{$baseDomain}/settings/billing/downgrade", [
                'plan_id' => $this->basicPlan->id,
                'keep_active_doctor_ids' => [$doc1->id, $doc2->id, $doc3->id],
            ]);

        $response->assertSessionHas('success');

        // Doctor 4 is deactivated, NOT deleted!
        $this->assertDatabaseHas('doctors', ['id' => $doc1->id, 'is_active' => true]);
        $this->assertDatabaseHas('doctors', ['id' => $doc2->id, 'is_active' => true]);
        $this->assertDatabaseHas('doctors', ['id' => $doc3->id, 'is_active' => true]);
        $this->assertDatabaseHas('doctors', ['id' => $doc4->id, 'is_active' => false]);
    }

    public function test_downgrade_blocks_deactivation_of_doctor_with_booked_tokens(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'blocked-down-clinic',
            'subdomain' => 'blocked-down-clinic',
            'name' => 'Blocked Down Clinic',
            'plan' => 'advanced',
        ]);

        $tenant->subscription()->update([
            'plan_id' => $this->advancedPlan->id,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@blockeddown.lk',
        ]);

        $doc1 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Alpha']);
        $doc2 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Beta']);
        $doc3 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Gamma']);
        $doc4 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Delta']);

        // Doctor Delta has an upcoming session with booked patient tokens
        $session = DoctorSession::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => $doc4->id,
            'session_date' => Carbon::now('Asia/Colombo')->addDays(3)->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $tenant->id]);

        BookingToken::create([
            'tenant_id' => $tenant->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_BOOKED,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        // Attempting to downgrade leaving Dr. Delta deactivated must fail with validation error
        $response = $this->actingAs($admin)
            ->post("http://blocked-down-clinic.{$baseDomain}/settings/billing/downgrade", [
                'plan_id' => $this->basicPlan->id,
                'keep_active_doctor_ids' => [$doc1->id, $doc2->id, $doc3->id],
            ]);

        $response->assertSessionHasErrors('keep_active_doctor_ids');
        $this->assertStringContainsString('upcoming booked patient token', session('errors')->first('keep_active_doctor_ids'));

        // Dr. Delta is still active and bookings are untouched
        $this->assertDatabaseHas('doctors', ['id' => $doc4->id, 'is_active' => true]);
        $this->assertDatabaseHas('doctor_sessions', ['id' => $session->id, 'status' => 'scheduled']);
    }

    public function test_downgrade_cancels_empty_future_sessions_when_doctor_deactivated(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'empty-session-clinic',
            'subdomain' => 'empty-session-clinic',
            'name' => 'Empty Session Clinic',
            'plan' => 'advanced',
        ]);

        $tenant->subscription()->update([
            'plan_id' => $this->advancedPlan->id,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@emptysession.lk',
        ]);

        $doc1 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true]);
        $doc2 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true]);
        $doc3 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true]);
        $doc4 = Doctor::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true, 'name' => 'Dr. Empty']);

        // Doctor Empty has a future session but with 0 booked tokens
        $emptySession = DoctorSession::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => $doc4->id,
            'session_date' => Carbon::now('Asia/Colombo')->addDays(4)->toDateString(),
            'start_time' => '14:00:00',
            'end_time' => '17:00:00',
            'max_tokens' => 15,
            'status' => 'scheduled',
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $response = $this->actingAs($admin)
            ->post("http://empty-session-clinic.{$baseDomain}/settings/billing/downgrade", [
                'plan_id' => $this->basicPlan->id,
                'keep_active_doctor_ids' => [$doc1->id, $doc2->id, $doc3->id],
            ]);

        $response->assertSessionHas('success');

        // Dr. Empty is deactivated and the empty session is cleanly marked cancelled
        $this->assertDatabaseHas('doctors', ['id' => $doc4->id, 'is_active' => false]);
        $this->assertDatabaseHas('doctor_sessions', [
            'id' => $emptySession->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_launch_offer_with_gating_unlocked_and_suspends_after_offer_ends_without_payment(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-01 10:00:00', 'Asia/Colombo'));

        config(['plans.gating_enabled' => true]);
        app(PlatformSettingsService::class)->set('launch_offer.enabled', true);
        app(PlatformSettingsService::class)->set('launch_offer.free_months', 2);
        app(PlatformSettingsService::class)->set('launch_offer.sms_cap', 500);

        // 1. Newly registered clinic on Launch Offer
        $tenant = Tenant::factory()->active()->create([
            'id' => 'launch-gated-clinic',
            'subdomain' => 'launch-gated-clinic',
            'name' => 'Launch Gated Clinic',
            'plan' => 'advanced',
            'is_launch_offer' => true,
            'data' => [
                'is_launch_offer' => true,
                'launch_offer_expires_at' => Carbon::now('Asia/Colombo')->addMonths(2)->toIso8601String(),
            ],
        ]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $this->advancedPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => Carbon::now('Asia/Colombo'),
            'current_period_end' => Carbon::now('Asia/Colombo')->addMonths(2),
            'notes' => 'Registered under MedVisit Launch Offer (2 months free on Advanced plan)',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@launchgated.lk',
        ]);

        $planGate = app(PlanGate::class);

        // 2. Everything is unlocked (Advanced features & unlimited limits)
        $this->assertTrue($planGate->isLaunchOfferActive($tenant));
        $this->assertTrue($planGate->allows($tenant, 'pharmacy'));
        $this->assertTrue($planGate->allows($tenant, 'page_builder'));
        $this->assertTrue($planGate->allows($tenant, 'audit_log_export'));
        $this->assertSame(-1, $planGate->limit($tenant, 'doctors'));
        $this->assertSame(500, $planGate->limit($tenant, 'sms_monthly'));
        $this->assertTrue($subscription->isActive());

        // 3. Fast-forward past offer end date but within grace period (1 day past offer end)
        Carbon::setTestNow(Carbon::parse('2026-11-01 10:00:00', 'Asia/Colombo')->addMonths(2)->addDay());
        $this->artisan('subscriptions:check-expirations')->assertSuccessful();

        $subscription->refresh();
        // Marked past_due but still within 3-day grace
        $this->assertSame(Subscription::STATUS_PAST_DUE, $subscription->status);
        $this->assertTrue($subscription->isInGracePeriod());
        $this->assertTrue($subscription->isActive());

        // 4. Fast-forward past grace period (4 days past offer end)
        Carbon::setTestNow(Carbon::parse('2026-11-01 10:00:00', 'Asia/Colombo')->addMonths(2)->addDays(4));
        $this->artisan('subscriptions:check-expirations')->assertSuccessful();

        $subscription->refresh();
        $this->assertSame(Subscription::STATUS_EXPIRED, $subscription->status);
        $this->assertFalse($subscription->isInGracePeriod());
        $this->assertFalse($subscription->isActive());

        // 5. Normal access is blocked by EnsureSubscriptionActive middleware
        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $response = $this->actingAs($admin)
            ->get("http://launch-gated-clinic.{$baseDomain}/dashboard");

        // Clinic admin is redirected to billing/subscription to pay
        $response->assertRedirect("http://launch-gated-clinic.{$baseDomain}/subscription/subscribe");

        Carbon::setTestNow();
    }

    public function test_reset_monthly_sms_command_initializes_usage_for_active_tenants(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'sms-active-clinic',
            'subdomain' => 'sms-active-clinic',
            'plan' => 'pro',
        ]);

        $this->artisan('medvisit:reset-monthly-sms')
            ->expectsOutputToContain('SMS usage renewal check completed.')
            ->assertSuccessful();

        $this->assertDatabaseHas('tenant_sms_usages', [
            'tenant_id' => $tenant->id,
            'clinic_triggered_count' => 0,
        ]);
    }
}
