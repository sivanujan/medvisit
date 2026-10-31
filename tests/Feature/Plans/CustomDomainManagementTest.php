<?php

declare(strict_types=1);

namespace Tests\Feature\Plans;

use App\Models\Domain;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CustomDomainManagementTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'domain-clinic',
            'subdomain' => 'domain-clinic',
            'name' => 'Domain Clinic Care',
        ]);

        $this->superAdmin = User::factory()->create([
            'email' => 'superadmin@medvisit.lk',
        ]);
        $this->superAdmin->assignRole('super_admin');
    }

    public function test_super_admin_can_add_custom_domain(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->post("/super-admin/clinics/{$this->tenant->id}/domains", [
                'domain' => 'channeling.drperera.lk',
            ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('domains', [
            'tenant_id' => $this->tenant->id,
            'domain' => 'channeling.drperera.lk',
            'status' => 'pending',
        ]);
    }

    public function test_cannot_add_duplicate_or_invalid_domain(): void
    {
        Domain::create([
            'tenant_id' => $this->tenant->id,
            'domain' => 'channeling.drperera.lk',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->post("/super-admin/clinics/{$this->tenant->id}/domains", [
                'domain' => 'channeling.drperera.lk',
            ]);

        $response->assertSessionHasErrors(['domain']);
    }

    public function test_super_admin_can_force_verify_custom_domain(): void
    {
        $domain = Domain::create([
            'tenant_id' => $this->tenant->id,
            'domain' => 'channeling.drperera.lk',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->post("/super-admin/clinics/{$this->tenant->id}/domains/{$domain->id}/verify?force_verify=1");

        $response->assertSessionHas('success');
        $domain->refresh();

        $this->assertSame('active', $domain->status);
        $this->assertNotNull($domain->verified_at);
    }

    public function test_super_admin_can_remove_custom_domain(): void
    {
        $domain = Domain::create([
            'tenant_id' => $this->tenant->id,
            'domain' => 'channeling.drperera.lk',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->delete("/super-admin/clinics/{$this->tenant->id}/domains/{$domain->id}");

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('domains', [
            'id' => $domain->id,
        ]);
    }
}
