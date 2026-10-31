<?php

declare(strict_types=1);

namespace Tests\Feature\Plans;

use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Plans\PlanGate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PlanGatingMasterSwitchTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $basicTenant;

    private User $admin;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $basicPlan = Plan::firstOrCreate(
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

        $this->basicTenant = Tenant::factory()->active()->create([
            'id' => 'basic-clinic',
            'subdomain' => 'basic-clinic',
            'name' => 'Basic Clinic Care',
            'plan' => 'basic',
            'pharmacy_enabled' => true,
        ]);

        $this->basicTenant->subscription()->update([
            'plan_id' => $basicPlan->id,
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->basicTenant->id,
            'email' => 'admin@basicclinic.lk',
        ]);
        Permission::firstOrCreate(['name' => 'pharmacy.view', 'guard_name' => 'web']);
        $this->admin->givePermissionTo('pharmacy.view');
    }

    public function test_when_plan_gating_is_off_every_clinic_behaves_with_no_locks_no_limits_and_no_quota(): void
    {
        config(['plans.gating_enabled' => false]);
        PlanGate::clearCache();

        $planGate = app(PlanGate::class);

        // 1. Master switch is reported as false
        $this->assertFalse($planGate->isGatingEnabled());

        // 2. All features are completely allowed on Basic tier
        $this->assertTrue($planGate->allows($this->basicTenant, 'pharmacy'));
        $this->assertTrue($planGate->allows($this->basicTenant, 'website_builder'));
        $this->assertTrue($planGate->allows($this->basicTenant, 'tv_multi_room'));
        $this->assertTrue($planGate->allows($this->basicTenant, 'audit_export'));

        // 3. All resource limits are unlimited (-1)
        $this->assertSame(-1, $planGate->limit($this->basicTenant, 'doctors'));
        $this->assertSame(-1, $planGate->limit($this->basicTenant, 'staff'));
        $this->assertSame(-1, $planGate->limit($this->basicTenant, 'tv_screens'));
        $this->assertSame(-1, $planGate->limit($this->basicTenant, 'sms_monthly'));
        $this->assertFalse($planGate->isOverLimit($this->basicTenant, 'doctors'));

        // 4. SMS quota never blocks
        $allowance = $planGate->checkSmsAllowance($this->basicTenant, 'queue_alert');
        $this->assertTrue($allowance['allowed']);
        $this->assertSame('base', $allowance['deduct_type']);

        // 5. Middleware allows access without redirecting to lock panel
        $response = $this->actingAs($this->admin)
            ->get("http://basic-clinic.{$this->baseDomain}/pharmacy/medicines");

        $response->assertOk();
    }

    public function test_when_plan_gating_is_enabled_basic_plan_is_gated(): void
    {
        config(['plans.gating_enabled' => true]);
        PlanGate::clearCache();

        $planGate = app(PlanGate::class);

        $this->assertTrue($planGate->isGatingEnabled());
        $this->assertFalse($planGate->allows($this->basicTenant, 'pharmacy'));
        $this->assertSame(3, $planGate->limit($this->basicTenant, 'doctors'));
        $this->assertSame(5, $planGate->limit($this->basicTenant, 'staff'));
    }
}
