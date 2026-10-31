<?php

namespace Tests\Feature\Auth;

use App\Http\Controllers\Auth\FindClinicController;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_demo_credentials_are_only_displayed_in_local_environment_with_dev_quick_login(): void
    {
        // 1. By default, even in local environment, showDemoCredentials is false when DEV_QUICK_LOGIN is false
        $this->app->detectEnvironment(fn () => 'local');
        config(['auth.dev_quick_login' => false]);

        $response = $this->get('/admin/login');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Auth/AdminLogin')
            ->where('showDemoCredentials', false)
        );

        // 2. Only when both local environment AND auth.dev_quick_login is true, showDemoCredentials is true
        config(['auth.dev_quick_login' => true]);
        $responseLocal = $this->get('/admin/login');
        $responseLocal->assertStatus(200);
        $responseLocal->assertInertia(fn ($page) => $page
            ->component('Auth/AdminLogin')
            ->where('showDemoCredentials', true)
        );

        // 3. In production, never shown even if dev_quick_login was set
        $this->app->detectEnvironment(fn () => 'production');
        $responseProd = $this->get('/admin/login');
        $responseProd->assertStatus(200);
        $responseProd->assertInertia(fn ($page) => $page
            ->component('Auth/AdminLogin')
            ->where('showDemoCredentials', false)
        );

        // Reset environment back to testing
        $this->app->detectEnvironment(fn () => 'testing');
    }

    public function test_superadmin_cannot_authenticate_with_password123_when_password_is_password123_exclamation(): void
    {
        $superadmin = User::factory()->create([
            'email' => 'superadmin@medvisit.test',
            'password' => bcrypt('Password123!'),
            'tenant_id' => null,
        ]);

        // Attempting with 'Password123' (missing exclamation mark) MUST strictly fail
        $response = $this->from('/login')->post('/login', [
            'email' => 'superadmin@medvisit.test',
            'password' => 'Password123',
        ]);

        $this->assertGuest();
        $response->assertSessionHasErrors('email');

        // Attempting with correct 'Password123!' succeeds
        $responseSuccess = $this->post('/login', [
            'email' => 'superadmin@medvisit.test',
            'password' => 'Password123!',
        ]);

        $this->assertAuthenticatedAs($superadmin);
    }

    public function test_central_login_is_the_clinic_finder_without_admin_props(): void
    {
        $this->get('/login')->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->missing('showDemoCredentials')
            ->missing('initialMode')
        );
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_find_your_clinic_by_subdomain_redirects_to_clinic_login(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'ruhunu',
            'subdomain' => 'ruhunu',
        ]);

        $response = $this->post('/find-clinic/subdomain', [
            'subdomain' => 'ruhunu',
        ]);

        $response->assertRedirect($tenant->url('/login'));
    }

    public function test_find_your_clinic_by_email_redirects_to_clinic_login(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'ruhunu',
            'subdomain' => 'ruhunu',
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'registered@clinic.lk',
        ]);

        $response = $this->post('/find-clinic/email', [
            'email' => 'registered@clinic.lk',
        ]);

        $response->assertRedirect($tenant->url('/login?email='.urlencode('registered@clinic.lk')));
    }

    public function test_find_your_clinic_by_email_with_unknown_email_returns_error(): void
    {
        $response = $this->post('/find-clinic/email', [
            'email' => 'unknown@random.lk',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_email_lookup_does_not_reveal_platform_admin_accounts(): void
    {
        User::factory()->create([
            'tenant_id' => null,
            'email' => 'root@medvisit.lk',
        ]);

        $admin = $this->post('/find-clinic/email', ['email' => 'root@medvisit.lk']);
        $unknown = $this->post('/find-clinic/email', ['email' => 'nobody@medvisit.lk']);

        $expected = ['email' => FindClinicController::NOT_FOUND_EMAIL, 'lookup' => 'not_found'];
        $admin->assertSessionHasErrors($expected);
        $unknown->assertSessionHasErrors($expected);
    }

    public function test_email_lookup_with_several_clinics_returns_a_chooser(): void
    {
        foreach (['ruhunu', 'kandy-care'] as $id) {
            $tenant = Tenant::factory()->create(['id' => $id, 'subdomain' => $id, 'name' => ucfirst($id)]);
            User::factory()->create(['tenant_id' => $tenant->id, 'email' => 'locum@clinic.lk']);
        }

        $response = $this->post('/find-clinic/email', ['email' => 'locum@clinic.lk']);

        $response->assertSessionHas('matchedClinics', fn (array $clinics) => count($clinics) === 2
            && collect($clinics)->every(fn ($c) => array_key_exists('logo_url', $c) && str_contains($c['login_url'], '/login?email=')));
    }

    public function test_inertia_lookup_returns_the_clinic_so_the_page_can_remember_it(): void
    {
        $tenant = Tenant::factory()->create(['id' => 'ruhunu', 'subdomain' => 'ruhunu', 'name' => 'Ruhunu']);

        $response = $this->withHeaders(['X-Inertia' => 'true'])
            ->from('/login')
            ->post('/find-clinic/subdomain', ['subdomain' => 'Ruhunu']);

        $response->assertRedirect('/login');
        $response->assertSessionHas('clinicRedirect', fn (array $c) => $c['name'] === 'Ruhunu'
            && $c['login_url'] === $tenant->url('/login')
            && $c['home_login_url'] === $tenant->url('/login'));
    }

    public function test_clinic_address_must_be_a_valid_label(): void
    {
        $this->post('/find-clinic/subdomain', ['subdomain' => 'bad_name!'])
            ->assertSessionHasErrors(['subdomain' => 'Use lowercase letters, numbers and hyphens only.']);

        $this->post('/find-clinic/subdomain', ['subdomain' => 'no-such-clinic'])
            ->assertSessionHasErrors(['subdomain' => FindClinicController::NOT_FOUND_ADDRESS, 'lookup' => 'not_found']);
    }

    public function test_clinic_lookups_are_rate_limited(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->post('/find-clinic/subdomain', ['subdomain' => "missing-{$i}"]);
        }

        $this->post('/find-clinic/subdomain', ['subdomain' => 'missing-x'])->assertStatus(429);
    }
}
