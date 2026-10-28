<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Mail\StaffInviteMail;
use App\Models\Doctor;
use App\Models\StaffInvitation;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaffAndTeamTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $secondAdminUser;

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
            'name' => 'Admin First',
            'email' => 'admin@medisuite.lk',
            'is_active' => true,
        ]);

        $this->secondAdminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin Second',
            'email' => 'admin2@medisuite.lk',
            'is_active' => true,
        ]);

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Reception User',
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
                'personal_message' => 'Welcome to our clinic team!',
            ]);

        $response->assertSessionHas('success');
        $this->assertTrue(session()->has('invite_link'));

        $invitation = StaffInvitation::where('email', 'perera@gmail.com')->first();
        $this->assertNotNull($invitation);
        $this->assertEquals('doctor', $invitation->role);
        $this->assertFalse($invitation->isExpired());

        Mail::assertQueued(StaffInviteMail::class, function ($mail) {
            return $mail->hasTo('perera@gmail.com');
        });
    }

    public function test_cannot_invite_email_already_active_in_same_clinic(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post("http://medisuite.{$this->baseDomain}/staff/invite", [
                'name' => 'Duplicate Person',
                'email' => 'reception@medisuite.lk',
                'role' => 'receptionist',
            ]);

        $response->assertSessionHasErrors('email');
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

        $newUser = User::where('email', 'newstaff@medisuite.lk')->first();
        $this->assertNotNull($newUser);
        $this->assertTrue($newUser->hasRole('receptionist'));

        $invitation->refresh();
        $this->assertNotNull($invitation->accepted_at);
        $this->assertTrue($invitation->isAccepted());
    }

    public function test_invitation_is_single_use_and_cannot_be_reused(): void
    {
        $invitation = StaffInvitation::create([
            'tenant_id' => $this->tenant->id,
            'email' => 'singleuse@medisuite.lk',
            'name' => 'Single Use User',
            'role' => 'receptionist',
            'token' => 'single-use-token-777',
            'expires_at' => now()->addDays(7),
            'accepted_at' => now()->subHour(), // Already accepted
        ]);

        // Attempting to visit or accept again should redirect with error
        $response = $this->get("http://medisuite.{$this->baseDomain}/invitation/accept/single-use-token-777");
        $response->assertRedirect(route('tenant.login'));
        $response->assertSessionHasErrors('email');
    }

    public function test_expired_invitation_cannot_be_accepted(): void
    {
        $invitation = StaffInvitation::create([
            'tenant_id' => $this->tenant->id,
            'email' => 'expired@medisuite.lk',
            'name' => 'Expired User',
            'role' => 'receptionist',
            'token' => 'expired-token-999',
            'expires_at' => now()->subDay(), // Expired
        ]);

        $response = $this->get("http://medisuite.{$this->baseDomain}/invitation/accept/expired-token-999");
        $response->assertRedirect(route('tenant.login'));
        $response->assertSessionHasErrors('email');
    }

    public function test_tenant_isolation_prevents_accepting_invite_on_another_clinic_subdomain(): void
    {
        $otherTenant = Tenant::factory()->active()->create([
            'id' => 'otherclinic',
            'name' => 'Other Clinic',
            'subdomain' => 'otherclinic',
        ]);

        // Invitation created for medisuite
        $invitation = StaffInvitation::create([
            'tenant_id' => $this->tenant->id,
            'email' => 'cross.tenant@medisuite.lk',
            'name' => 'Cross Tenant User',
            'role' => 'receptionist',
            'token' => 'isolation-token-888',
            'expires_at' => now()->addDays(7),
        ]);

        // Try accepting on other clinic's subdomain
        $response = $this->get("http://otherclinic.{$this->baseDomain}/invitation/accept/isolation-token-888");
        $response->assertRedirect(route('tenant.login'));
        $response->assertSessionHasErrors('email');
    }

    public function test_cannot_deactivate_yourself(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->patch("http://medisuite.{$this->baseDomain}/staff/{$this->adminUser->id}/toggle");

        $response->assertSessionHasErrors('status');
        $this->adminUser->refresh();
        $this->assertTrue($this->adminUser->is_active);
    }

    public function test_cannot_deactivate_or_demote_the_last_remaining_clinic_admin(): void
    {
        $superAdminUser = User::factory()->superAdmin()->create();

        // Deactivate the second admin so only adminUser is active
        $this->secondAdminUser->update(['is_active' => false]);

        // Try to deactivate the last remaining admin (super admin is authorized to make request)
        $response = $this->actingAs($superAdminUser)
            ->patch("http://medisuite.{$this->baseDomain}/staff/{$this->adminUser->id}/toggle");

        $response->assertSessionHasErrors('status');
        $this->adminUser->refresh();
        $this->assertTrue($this->adminUser->is_active);

        // Try to demote the last remaining admin to receptionist
        $demoteResponse = $this->actingAs($this->adminUser)
            ->put("http://medisuite.{$this->baseDomain}/staff/{$this->adminUser->id}/role", [
                'role' => 'receptionist',
            ]);

        $demoteResponse->assertSessionHasErrors('role');
        $this->assertTrue($this->adminUser->hasRole('clinic_admin'));
    }

    public function test_deactivation_revokes_database_sessions_immediately(): void
    {
        // Insert a simulated active session for receptionistUser
        DB::table('sessions')->insert([
            'id' => 'simulated-session-receptionist-123',
            'user_id' => $this->receptionistUser->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'dummy',
            'last_activity' => Carbon::now()->timestamp,
        ]);

        $this->assertEquals(1, DB::table('sessions')->where('user_id', $this->receptionistUser->id)->count());

        // Deactivate receptionistUser
        $response = $this->actingAs($this->adminUser)
            ->patch("http://medisuite.{$this->baseDomain}/staff/{$this->receptionistUser->id}/toggle");

        $response->assertSessionHas('success');

        $this->receptionistUser->refresh();
        $this->assertFalse($this->receptionistUser->is_active);

        // Sessions should be immediately revoked
        $this->assertEquals(0, DB::table('sessions')->where('user_id', $this->receptionistUser->id)->count());
    }

    public function test_deactivated_user_cannot_log_in(): void
    {
        $this->receptionistUser->update([
            'password' => Hash::make('Password123!'),
            'is_active' => false,
        ]);

        $response = $this->post("http://medisuite.{$this->baseDomain}/login", [
            'email' => $this->receptionistUser->email,
            'password' => 'Password123!',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_doctor_linking_and_unlinking_uniqueness(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Samantha Perera',
            'specialty' => 'Pediatrics',
            'slmc_number' => 'SLMC-9876',
            'is_active' => true,
        ]);

        // Link doctor to receptionistUser
        $linkResponse = $this->actingAs($this->adminUser)
            ->post("http://medisuite.{$this->baseDomain}/staff/{$this->receptionistUser->id}/link-doctor", [
                'doctor_id' => $doctor->id,
            ]);

        $linkResponse->assertSessionHas('success');
        $doctor->refresh();
        $this->assertEquals($this->receptionistUser->id, $doctor->user_id);

        // Link doctor to secondAdminUser instead (uniqueness: clears previous user)
        $relinkResponse = $this->actingAs($this->adminUser)
            ->post("http://medisuite.{$this->baseDomain}/staff/{$this->secondAdminUser->id}/link-doctor", [
                'doctor_id' => $doctor->id,
            ]);

        $relinkResponse->assertSessionHas('success');
        $doctor->refresh();
        $this->assertEquals($this->secondAdminUser->id, $doctor->user_id);

        // Unlink doctor
        $unlinkResponse = $this->actingAs($this->adminUser)
            ->post("http://medisuite.{$this->baseDomain}/staff/{$this->secondAdminUser->id}/unlink-doctor");

        $unlinkResponse->assertSessionHas('success');
        $doctor->refresh();
        $this->assertNull($doctor->user_id);
    }

    public function test_tenant_logo_fallback_returns_null_when_file_is_missing(): void
    {
        $this->tenant->update([
            'logo_path' => 'tenants/non_existent_folder/missing_logo.webp',
        ]);

        // Both logo_url and logo_png_url should gracefully return null instead of 404 URL
        $this->assertNull($this->tenant->logo_url);
        $this->assertNull($this->tenant->logo_png_url);
    }
}
