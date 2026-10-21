<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlatformPhaseATest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_non_super_admin_cannot_access_platform_console(): void
    {
        $clinicUser = User::factory()->create();

        $response = $this->actingAs($clinicUser)->get('/super-admin');
        $response->assertStatus(403);

        $responseClinics = $this->actingAs($clinicUser)->get('/super-admin/clinics');
        $responseClinics->assertStatus(403);

        $responsePlans = $this->actingAs($clinicUser)->get('/super-admin/plans');
        $responsePlans->assertStatus(403);
    }

    public function test_super_admin_can_access_dashboard_and_see_kpis(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($superAdmin)->get('/super-admin');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/Dashboard')
            ->has('kpis')
            ->has('charts')
            ->has('needsAttention')
        );
    }

    public function test_super_admin_can_view_clinics_directory_and_detail(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $tenant = Tenant::first();

        $response = $this->actingAs($superAdmin)->get('/super-admin/clinics');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/Clinics/Index')
            ->has('clinics.data')
        );

        $showResponse = $this->actingAs($superAdmin)->get("/super-admin/clinics/{$tenant->id}");
        $showResponse->assertStatus(200);
        $showResponse->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/Clinics/Show')
            ->where('clinic.id', $tenant->id)
        );
    }

    public function test_super_admin_can_suspend_and_reactivate_clinic(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $tenant = Tenant::first();

        // 1. Suspend
        $suspendResponse = $this->actingAs($superAdmin)->post("/super-admin/clinics/{$tenant->id}/suspend", [
            'reason' => 'Violation of terms and unpaid dues.',
        ]);
        $suspendResponse->assertSessionHas('success');

        $tenant->refresh();
        $this->assertSame('suspended', $tenant->status);

        // 2. Reactivate
        $reactivateResponse = $this->actingAs($superAdmin)->post("/super-admin/clinics/{$tenant->id}/reactivate");
        $reactivateResponse->assertSessionHas('success');

        $tenant->refresh();
        $this->assertSame('active', $tenant->status);
    }

    public function test_super_admin_can_generate_single_use_impersonation_token(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $tenant = Tenant::first();

        $response = $this->actingAs($superAdmin)->post("/super-admin/clinics/{$tenant->id}/impersonate", [
            'reason' => 'Investigating prescription sync error reported by clinic doctor.',
        ]);

        // Inertia::location returns 409 with X-Inertia-Location header
        $redirectUrl = $response->headers->get('X-Inertia-Location') ?: $response->headers->get('Location');
        $this->assertNotEmpty($redirectUrl);
        $this->assertStringContainsString('/impersonate/', $redirectUrl);

        // Check single-use token in DB
        $tokenRecord = DB::table('tenant_user_impersonation_tokens')->first();
        $this->assertNotNull($tokenRecord);
        $this->assertSame($tenant->id, $tokenRecord->tenant_id);
    }

    public function test_super_admin_can_manage_plans(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        // 1. View plans
        $viewResponse = $this->actingAs($superAdmin)->get('/super-admin/plans');
        $viewResponse->assertStatus(200);
        $viewResponse->assertInertia(fn ($page) => $page->component('SuperAdmin/Plans/Index'));

        // 2. Create new plan
        $createResponse = $this->actingAs($superAdmin)->post('/super-admin/plans', [
            'name' => 'Enterprise Hospital Tier',
            'slug' => 'enterprise-hospital',
            'price_lkr' => 45000,
            'billing_interval' => 'month',
            'features' => ['Unlimited Doctors', 'Custom Integrations', 'Dedicated Support'],
        ]);
        $createResponse->assertSessionHas('success');

        $plan = Plan::where('slug', 'enterprise-hospital')->first();
        $this->assertNotNull($plan);
        $this->assertSame(4500000, $plan->price_cents);

        // 3. Update plan with renewal price notice
        $updateResponse = $this->actingAs($superAdmin)->put("/super-admin/plans/{$plan->id}", [
            'name' => 'Enterprise Hospital Tier v2',
            'price_lkr' => 50000,
            'features' => ['Unlimited Doctors', 'Custom Integrations', 'Dedicated Support', '24/7 SLA'],
        ]);
        $updateResponse->assertSessionHas('success');

        $plan->refresh();
        $this->assertSame(5000000, $plan->price_cents);
        $this->assertSame('Enterprise Hospital Tier v2', $plan->name);

        // 4. Toggle active
        $toggleResponse = $this->actingAs($superAdmin)->post("/super-admin/plans/{$plan->id}/toggle-active");
        $toggleResponse->assertSessionHas('success');
        $plan->refresh();
        $this->assertFalse($plan->is_active);

        // 5. Delete empty plan
        $deleteResponse = $this->actingAs($superAdmin)->delete("/super-admin/plans/{$plan->id}");
        $deleteResponse->assertSessionHas('success');
        $this->assertDatabaseMissing('plans', ['id' => $plan->id]);
    }

    public function test_super_admin_can_soft_delete_and_restore_clinic(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $tenant = Tenant::factory()->create([
            'id' => 'to-delete-clinic',
            'name' => 'To Delete Clinic',
            'subdomain' => 'to-delete',
            'status' => 'active',
        ]);

        // Soft delete
        $deleteResponse = $this->actingAs($superAdmin)->delete("/super-admin/clinics/{$tenant->id}");
        $deleteResponse->assertSessionHas('success');

        $this->assertSoftDeleted('tenants', ['id' => 'to-delete-clinic']);

        // Restore
        $restoreResponse = $this->actingAs($superAdmin)->post("/super-admin/clinics/{$tenant->id}/restore");
        $restoreResponse->assertSessionHas('success');

        $tenant->refresh();
        $this->assertNull($tenant->deleted_at);
    }
}
