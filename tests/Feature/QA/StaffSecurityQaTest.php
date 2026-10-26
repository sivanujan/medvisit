<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StaffSecurityQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $admin;

    private User $receptionist;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
        $this->receptionist = User::where('email', 'receptionist@cityhealth.test')->firstOrFail();
    }

    /**
     * 1. Cannot deactivate oneself.
     */
    public function test_admin_cannot_deactivate_self(): void
    {
        $res = $this->actingAs($this->admin)
            ->patch("http://cityhealth.{$this->baseDomain}/staff/{$this->admin->id}/toggle");

        $res->assertSessionHasErrors(['status']);
        $this->assertTrue($this->admin->fresh()->is_active, 'Admin account must remain active');
    }

    /**
     * 2. Cannot deactivate the last active clinic administrator.
     */
    public function test_cannot_deactivate_the_last_active_admin(): void
    {
        // Create second admin then deactivate them, leaving 1 active admin
        $secondAdmin = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Second Admin',
            'email' => 'admin2@cityhealth.test',
            'is_active' => true,
        ]);
        $secondAdmin->assignRole('clinic_admin');

        // Admin 1 deactivates Admin 2 (allowed because 2 admins exist)
        $res1 = $this->actingAs($this->admin)
            ->patch("http://cityhealth.{$this->baseDomain}/staff/{$secondAdmin->id}/toggle");
        $res1->assertSessionHasNoErrors();
        $this->assertFalse($secondAdmin->fresh()->is_active);

        // Now Admin 1 is the ONLY active admin. Attempting to deactivate Admin 1 must fail
        $res2 = $this->actingAs($this->admin)
            ->patch("http://cityhealth.{$this->baseDomain}/staff/{$this->admin->id}/toggle");
        $res2->assertSessionHasErrors(['status']);
        $this->assertTrue($this->admin->fresh()->is_active);
    }

    /**
     * 3. Deactivation revokes sessions and tokens immediately.
     */
    public function test_deactivation_revokes_sessions_immediately(): void
    {
        // Seed an active session in sessions table for receptionist
        DB::table('sessions')->insert([
            'id' => 'test_receptionist_session_123',
            'user_id' => $this->receptionist->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'dummy',
            'last_activity' => time(),
        ]);

        $this->assertDatabaseHas('sessions', ['user_id' => $this->receptionist->id]);

        // Admin deactivates receptionist
        $res = $this->actingAs($this->admin)
            ->patch("http://cityhealth.{$this->baseDomain}/staff/{$this->receptionist->id}/toggle");

        $res->assertSessionHasNoErrors();
        $this->assertFalse($this->receptionist->fresh()->is_active);

        // Assert session records have been deleted/revoked
        $this->assertDatabaseMissing('sessions', ['user_id' => $this->receptionist->id]);
    }
}
