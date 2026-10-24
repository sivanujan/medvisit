<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TenantLoginTest extends TestCase
{
    use RefreshDatabase;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);
    }

    public function test_tenant_login_screen_renders_with_clinic_identity(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'ruhunu',
            'name' => 'Ruhunu Medical Centre',
            'subdomain' => 'ruhunu',
        ]);

        $response = $this->get("http://ruhunu.{$this->baseDomain}/login");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Auth/TenantLogin')
            ->where('tenant.name', 'Ruhunu Medical Centre')
            ->where('tenant.subdomain', 'ruhunu')
        );
    }

    public function test_user_can_login_on_correct_tenant(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'ruhunu',
            'name' => 'Ruhunu Medical Centre',
            'subdomain' => 'ruhunu',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@ruhunu.lk',
            'password' => Hash::make('Secret123!'),
        ]);

        $response = $this->post("http://ruhunu.{$this->baseDomain}/login", [
            'email' => 'doctor@ruhunu.lk',
            'password' => 'Secret123!',
        ]);

        $this->assertAuthenticated();
        $this->assertSame('ruhunu', auth()->user()->tenant_id);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'user.login',
        ]);
    }

    public function test_user_from_clinic_a_cannot_login_on_clinic_b_subdomain(): void
    {
        $tenantA = Tenant::factory()->active()->create([
            'id' => 'clinic-a',
            'name' => 'Clinic Alpha',
            'subdomain' => 'clinic-a',
        ]);

        $tenantB = Tenant::factory()->active()->create([
            'id' => 'clinic-b',
            'name' => 'Clinic Beta',
            'subdomain' => 'clinic-b',
        ]);

        $userA = User::factory()->create([
            'tenant_id' => $tenantA->id,
            'email' => 'nurse@clinica.lk',
            'password' => Hash::make('AlphaPass123!'),
        ]);

        // Attempt login on Clinic B's subdomain using Clinic A user's email and password
        $response = $this->post("http://clinic-b.{$this->baseDomain}/login", [
            'email' => 'nurse@clinica.lk',
            'password' => 'AlphaPass123!',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors(['email']);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'user.login_failed',
        ]);
    }

    public function test_failed_login_message_is_generic_whether_or_not_email_exists(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'ruhunu',
            'subdomain' => 'ruhunu',
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@ruhunu.lk',
            'password' => Hash::make('Secret123!'),
        ]);

        $wrongPassword = $this->post("http://ruhunu.{$this->baseDomain}/login", [
            'email' => 'doctor@ruhunu.lk',
            'password' => 'not-it',
        ]);
        $wrongPassword->assertSessionHasErrors([
            'email' => 'Email or password is incorrect.',
            'auth' => 'failed',
        ]);

        $this->flushSession();

        $unknownEmail = $this->post("http://ruhunu.{$this->baseDomain}/login", [
            'email' => 'nobody@ruhunu.lk',
            'password' => 'not-it',
        ]);
        $unknownEmail->assertSessionHasErrors([
            'email' => 'Email or password is incorrect.',
            'auth' => 'failed',
        ]);
    }

    public function test_login_page_exposes_branding_but_no_clinic_activity(): void
    {
        Tenant::factory()->create([
            'id' => 'ruhunu',
            'name' => 'Ruhunu Medical Centre',
            'subdomain' => 'ruhunu',
            'address' => '12 Main Street, Matara 81000',
        ]);

        $this->get("http://ruhunu.{$this->baseDomain}/login")
            ->assertInertia(fn ($page) => $page
                ->component('Auth/TenantLogin')
                ->where('tenant.city', 'Matara')
                ->has('tenant.logo_url')
                ->has('findClinicUrl')
                ->missing('tenant.queue')
                ->missing('sessions')
            );
    }

    public function test_login_branding_is_display_ready(): void
    {
        Tenant::factory()->create([
            'id' => 'nallur',
            'name' => 'Nallur Medical',
            'subdomain' => 'nallur',
            'address' => 'puliyankoodal south, KAYTS, jaffna',
            'website_theme' => 'emerald-health',
        ]);
        config(['medvisit.public_domain' => 'medvisit.lk']);

        $this->get("http://nallur.{$this->baseDomain}/login")
            ->assertInertia(fn ($page) => $page
                ->where('tenant.address', 'Puliyankoodal South, Kayts, Jaffna')
                ->where('tenant.city', 'Jaffna')
                ->where('tenant.brand_color', '#059669')
                ->where('tenant.public_domain', 'medvisit.lk')
            );

        // Stored data is untouched; only the display copy is title-cased.
        $this->assertSame('puliyankoodal south, KAYTS, jaffna', Tenant::find('nallur')->address);
    }

    public function test_rate_limiting_on_failed_logins(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'ruhunu',
            'subdomain' => 'ruhunu',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->post("http://ruhunu.{$this->baseDomain}/login", [
                'email' => 'staff@ruhunu.lk',
                'password' => 'wrong-pass',
            ]);
        }

        // 6th attempt should be throttled
        $response = $this->post("http://ruhunu.{$this->baseDomain}/login", [
            'email' => 'staff@ruhunu.lk',
            'password' => 'wrong-pass',
        ]);

        $response->assertSessionHasErrors(['email']);
        $errors = session('errors')->get('email');
        $this->assertStringContainsString('Too many login attempts', $errors[0]);
        $response->assertSessionHasErrors(['auth' => 'throttled', 'retry_after']);
    }

    public function test_suspended_tenant_redirects_to_notice_page(): void
    {
        $tenant = Tenant::factory()->suspended()->create([
            'id' => 'paused-clinic',
            'name' => 'Paused Clinic',
            'subdomain' => 'paused-clinic',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@paused.lk',
            'password' => Hash::make('Secret123!'),
        ]);

        // Logging in on suspended tenant redirects to suspension page
        $response = $this->post("http://paused-clinic.{$this->baseDomain}/login", [
            'email' => 'admin@paused.lk',
            'password' => 'Secret123!',
        ]);

        $response->assertRedirect("http://paused-clinic.{$this->baseDomain}/clinic/suspended");

        // Accessing dashboard on suspended tenant is intercepted by EnsureTenantIsActive
        $dashResponse = $this->actingAs($user)->get("http://paused-clinic.{$this->baseDomain}/dashboard");
        $dashResponse->assertRedirect("http://paused-clinic.{$this->baseDomain}/clinic/suspended");
    }

    public function test_trial_expired_tenant_redirects_to_notice_page(): void
    {
        $tenant = Tenant::factory()->expired()->create([
            'id' => 'expired-clinic',
            'name' => 'Expired Clinic',
            'subdomain' => 'expired-clinic',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@expired.lk',
            'password' => Hash::make('Secret123!'),
        ]);

        // Logging in on expired tenant redirects to suspension page
        $response = $this->post("http://expired-clinic.{$this->baseDomain}/login", [
            'email' => 'admin@expired.lk',
            'password' => 'Secret123!',
        ]);

        $response->assertRedirect("http://expired-clinic.{$this->baseDomain}/clinic/suspended");

        // Accessing dashboard on expired tenant is intercepted
        $dashResponse = $this->actingAs($user)->get("http://expired-clinic.{$this->baseDomain}/dashboard");
        $dashResponse->assertRedirect("http://expired-clinic.{$this->baseDomain}/clinic/suspended");
    }
}
