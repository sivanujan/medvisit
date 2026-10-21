<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Mail\StaffInviteMail;
use App\Models\StaffInvitation;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaffAndTeamTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $receptionistUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'medisuite',
            'name' => 'MediSuite Medical Center',
            'subdomain' => 'medisuite',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@medisuite.lk',
            'is_active' => true,
        ]);

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'reception@medisuite.lk',
            'is_active' => true,
        ]);
    }

    public function test_clinic_admin_can_invite_staff_member(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post("http://medisuite.{$this->baseDomain}/staff/invite", [
                'name' => 'Dr. K. Perera',
                'email' => 'perera@gmail.com',
                'role' => 'doctor',
            ]);

        $response->assertSessionHas('success');

        $invitation = StaffInvitation::where('email', 'perera@gmail.com')->first();
        $this->assertNotNull($invitation);
        $this->assertEquals('doctor', $invitation->role);

        Mail::assertQueued(StaffInviteMail::class, function ($mail) {
            return $mail->hasTo('perera@gmail.com');
        });
    }

    public function test_invitee_can_accept_invitation_on_subdomain(): void
    {
        $invitation = StaffInvitation::create([
            'tenant_id' => $this->tenant->id,
            'email' => 'newstaff@medisuite.lk',
            'name' => 'Nadeeka Fernando',
            'role' => 'receptionist',
            'token' => 'sample-test-token-123456',
            'expires_at' => now()->addDays(7),
        ]);

        // Visit accept page
        $pageResponse = $this->get("http://medisuite.{$this->baseDomain}/invitation/accept/sample-test-token-123456");
        $pageResponse->assertStatus(200);
        $pageResponse->assertInertia(fn ($page) => $page->component('Auth/AcceptInvitation'));

        // Post password
        $acceptResponse = $this->post("http://medisuite.{$this->baseDomain}/invitation/accept/sample-test-token-123456", [
            'name' => 'Nadeeka Fernando',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
        ]);

        $acceptResponse->assertRedirect(route('tenant.dashboard'));

        // Verify user created and assigned role
        $newUser = User::where('email', 'newstaff@medisuite.lk')->first();
        $this->assertNotNull($newUser);
        $this->assertTrue($newUser->hasRole('receptionist'));

        $invitation->refresh();
        $this->assertNotNull($invitation->accepted_at);
    }

    public function test_protects_last_remaining_clinic_admin(): void
    {
        // Try to deactivate the only admin
        $response = $this->actingAs($this->adminUser)
            ->patch("http://medisuite.{$this->baseDomain}/staff/{$this->adminUser->id}/toggle");

        $response->assertSessionHasErrors('status');
        $this->adminUser->refresh();
        $this->assertTrue($this->adminUser->is_active);

        // Try to demote the only admin to receptionist
        $demoteResponse = $this->actingAs($this->adminUser)
            ->put("http://medisuite.{$this->baseDomain}/staff/{$this->adminUser->id}/role", [
                'role' => 'receptionist',
            ]);

        $demoteResponse->assertSessionHasErrors('role');
        $this->assertTrue($this->adminUser->hasRole('clinic_admin'));
    }

    public function test_invitee_with_email_existing_in_another_tenant_can_accept_invitation(): void
    {
        $otherTenant = Tenant::factory()->active()->create([
            'id' => 'otherclinic',
            'name' => 'Other Clinic',
            'subdomain' => 'otherclinic',
        ]);

        // User already exists in other clinic
        User::factory()->doctor()->create([
            'tenant_id' => $otherTenant->id,
            'email' => 'shared.doc@medvisit.lk',
            'is_active' => true,
        ]);

        // Invite this same doctor to our tenant
        $invitation = StaffInvitation::create([
            'tenant_id' => $this->tenant->id,
            'email' => 'shared.doc@medvisit.lk',
            'name' => 'Dr. Shared Doctor',
            'role' => 'doctor',
            'token' => 'shared-doctor-token-789',
            'expires_at' => now()->addDays(7),
        ]);

        $acceptResponse = $this->post("http://medisuite.{$this->baseDomain}/invitation/accept/shared-doctor-token-789", [
            'name' => 'Dr. Shared Doctor',
            'password' => 'SecurePass123!@#',
            'password_confirmation' => 'SecurePass123!@#',
        ]);

        $acceptResponse->assertRedirect(route('tenant.dashboard'));

        // Both accounts exist in their respective tenants
        $tenantUser = User::where('tenant_id', $this->tenant->id)->where('email', 'shared.doc@medvisit.lk')->first();
        $this->assertNotNull($tenantUser);
        $this->assertTrue($tenantUser->hasRole('doctor'));

        $otherUser = User::withoutGlobalScopes()->where('tenant_id', $otherTenant->id)->where('email', 'shared.doc@medvisit.lk')->first();
        $this->assertNotNull($otherUser);
        $this->assertNotEquals($tenantUser->id, $otherUser->id);
    }
}
