<?php

declare(strict_types=1);

namespace Tests\Feature\Plans;

use App\Models\Doctor;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Plans\PlanGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanEntitlementsAndLimitsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private Plan $basicPlan;

    private Plan $proPlan;

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

        $this->proPlan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Pro',
                'price_cents' => 900000,
                'billing_interval' => 'month',
                'is_active' => true,
                'features' => config('plans.tiers.pro.features'),
                'limits' => config('plans.tiers.pro.limits'),
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

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'gate-clinic',
            'subdomain' => 'gate-clinic',
            'name' => 'Gate Clinic Care',
            'plan' => 'basic',
            'pharmacy_enabled' => true,
        ]);

        $this->tenant->subscription()->update([
            'plan_id' => $this->basicPlan->id,
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@gateclinic.lk',
        ]);
    }

    public function test_basic_plan_has_expected_limits_and_locked_modules(): void
    {
        $planGate = app(PlanGate::class);

        $this->assertSame(3, $planGate->limit($this->tenant, 'doctors'));
        $this->assertSame(5, $planGate->limit($this->tenant, 'staff'));
        $this->assertSame(1, $planGate->limit($this->tenant, 'tv_screens'));
        $this->assertSame(300, $planGate->limit($this->tenant, 'sms_monthly'));

        $this->assertFalse($planGate->allows($this->tenant, 'pharmacy'));
        $this->assertFalse($planGate->allows($this->tenant, 'website_builder'));
        $this->assertFalse($planGate->allows($this->tenant, 'tv_multi_room'));
        $this->assertFalse($planGate->allows($this->tenant, 'audit_export'));
        $this->assertTrue($planGate->allows($this->tenant, 'queue'));
        $this->assertTrue($planGate->allows($this->tenant, 'booking'));
    }

    public function test_pro_plan_unlocks_pharmacy_and_page_builder(): void
    {
        $this->tenant->subscription()->update([
            'plan_id' => $this->proPlan->id,
        ]);
        $this->tenant->update(['plan' => 'pro']);
        PlanGate::clearCache();

        $planGate = app(PlanGate::class);

        $this->assertSame(8, $planGate->limit($this->tenant, 'doctors'));
        $this->assertSame(15, $planGate->limit($this->tenant, 'staff'));
        $this->assertSame(3, $planGate->limit($this->tenant, 'tv_screens'));
        $this->assertSame(1000, $planGate->limit($this->tenant, 'sms_monthly'));

        $this->assertTrue($planGate->allows($this->tenant, 'pharmacy'));
        $this->assertTrue($planGate->allows($this->tenant, 'website_builder'));
        $this->assertTrue($planGate->allows($this->tenant, 'tv_multi_room'));
        $this->assertTrue($planGate->allows($this->tenant, 'audit_export'));
    }

    public function test_advanced_plan_has_unlimited_scale(): void
    {
        $this->tenant->subscription()->update([
            'plan_id' => $this->advancedPlan->id,
        ]);
        $this->tenant->update(['plan' => 'advanced']);
        PlanGate::clearCache();

        $planGate = app(PlanGate::class);

        $this->assertSame(-1, $planGate->limit($this->tenant, 'doctors'));
        $this->assertSame(-1, $planGate->limit($this->tenant, 'staff'));
        $this->assertSame(-1, $planGate->limit($this->tenant, 'tv_screens'));
        $this->assertSame(3000, $planGate->limit($this->tenant, 'sms_monthly'));
        $this->assertSame(1, $planGate->limit($this->tenant, 'free_premium_templates'));

        $this->assertFalse($planGate->isOverLimit($this->tenant, 'doctors'));
    }

    public function test_doctor_creation_blocks_when_limit_reached_on_basic(): void
    {
        Doctor::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'is_active' => true,
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $response = $this->actingAs($this->admin)
            ->post("http://gate-clinic.{$baseDomain}/doctors", [
                'name' => 'Dr. Fourth Doctor',
                'specialization' => 'General Physician',
                'phone' => '0711112233',
            ]);

        $response->assertSessionHas('plan_limit_reached');
        $this->assertDatabaseMissing('doctors', [
            'name' => 'Dr. Fourth Doctor',
        ]);
    }
}
