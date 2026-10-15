<?php

namespace Tests\Feature\Auth;

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

    public function test_demo_credentials_are_only_displayed_in_local_environment(): void
    {
        // In testing environment, showDemoCredentials must be false
        $response = $this->get('/login');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->where('showDemoCredentials', false)
        );

        // In local environment, showDemoCredentials must be true
        $this->app->detectEnvironment(fn () => 'local');
        $responseLocal = $this->get('/login');
        $responseLocal->assertStatus(200);
        $responseLocal->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->where('showDemoCredentials', true)
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
}
