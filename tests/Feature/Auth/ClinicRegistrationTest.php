<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\PendingRegistration;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ClinicRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);
    }

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Auth/RegisterClinic')
            ->has('districts')
            ->has('clinicTypes')
        );
    }

    public function test_subdomain_availability_check_identifies_available_and_taken(): void
    {
        Tenant::factory()->create([
            'id' => 'ruhunu',
            'subdomain' => 'ruhunu',
        ]);

        // Taken subdomain
        $responseTaken = $this->postJson('/check-subdomain', ['subdomain' => 'ruhunu']);
        $responseTaken->assertStatus(200);
        $responseTaken->assertJson([
            'available' => false,
        ]);
        $this->assertNotEmpty($responseTaken->json('suggestions'));

        // Reserved subdomain
        $responseReserved = $this->postJson('/check-subdomain', ['subdomain' => 'admin']);
        $responseReserved->assertStatus(200);
        $responseReserved->assertJson([
            'available' => false,
        ]);
        $this->assertStringContainsString('reserved', $responseReserved->json('reason'));

        // Invalid format
        $responseInvalid = $this->postJson('/check-subdomain', ['subdomain' => '-bad-']);
        $responseInvalid->assertStatus(200);
        $responseInvalid->assertJson([
            'available' => false,
        ]);

        // Available subdomain
        $responseAvailable = $this->postJson('/check-subdomain', ['subdomain' => 'kandy-med']);
        $responseAvailable->assertStatus(200);
        $responseAvailable->assertJson([
            'available' => true,
            'subdomain' => 'kandy-med',
        ]);
    }

    public function test_full_registration_happy_path(): void
    {
        Notification::fake();

        $token = 'test-token-happy-path';
        PendingRegistration::create([
            'email' => 'bandara@ruhunuclinic.lk',
            'token' => $token,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $payload = [
            'clinic_name' => 'Ruhunu Medical Centre',
            'clinic_type' => 'medical centre',
            'district' => 'Matara',
            'city' => 'Matara',
            'address' => '45 Beach Road',
            'clinic_phone' => '+94 41 222 3344',
            'subdomain' => 'ruhunu',
            'name' => 'Dr. Bandara',
            'email' => 'bandara@ruhunuclinic.lk',
            'mobile' => '+94 77 123 4567',
            'password' => 'Passw0rd123!',
            'password_confirmation' => 'Passw0rd123!',
            'terms' => true,
            'registration_token' => $token,
        ];

        $response = $this->post('/register', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('register.success'));

        // Assert tenant created
        $tenant = Tenant::find('ruhunu');
        $this->assertNotNull($tenant);
        $this->assertSame('Ruhunu Medical Centre', $tenant->name);
        $this->assertSame('trial', $tenant->status);
        $this->assertSame('trial', $tenant->plan);
        $this->assertNotNull($tenant->trial_ends_at);
        $this->assertTrue($tenant->trial_ends_at->isFuture());

        // Assert domain created
        $this->assertTrue($tenant->domains()->where('domain', 'ruhunu')->exists());

        // Assert user created with clinic_admin role
        $user = User::where('email', 'bandara@ruhunuclinic.lk')->first();
        $this->assertNotNull($user);
        $this->assertSame('ruhunu', $user->tenant_id);
        $this->assertTrue($user->hasRole('clinic_admin'));

        // Assert audit events logged
        $this->assertDatabaseHas('audit_events', [
            'action' => 'tenant.created',
        ]);
        $this->assertDatabaseHas('audit_events', [
            'action' => 'user.created',
        ]);

        // Assert registration success page renders with auto-login url
        $successResponse = $this->get('/register/success');
        $successResponse->assertStatus(200);
        $successResponse->assertInertia(fn ($page) => $page
            ->component('Auth/RegisterClinicSuccess')
            ->where('registration.subdomain', 'ruhunu')
            ->has('registration.auto_login_url')
        );
    }

    public function test_duplicate_subdomain_is_rejected(): void
    {
        Tenant::factory()->create([
            'id' => 'ruhunu',
            'subdomain' => 'ruhunu',
        ]);

        $payload = [
            'clinic_name' => 'Another Ruhunu',
            'clinic_type' => 'dispensary',
            'district' => 'Galle',
            'city' => 'Galle',
            'address' => '10 Main St',
            'clinic_phone' => '+94 91 123 4567',
            'subdomain' => 'ruhunu',
            'name' => 'Admin User',
            'email' => 'admin@another.lk',
            'mobile' => '+94 77 999 8888',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->post('/register', $payload);
        $response->assertSessionHasErrors(['subdomain']);
    }

    public function test_reserved_subdomain_is_rejected(): void
    {
        $payload = [
            'clinic_name' => 'Support Clinic',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '10 High St',
            'clinic_phone' => '+94 11 123 4567',
            'subdomain' => 'support',
            'name' => 'Admin User',
            'email' => 'admin@support.lk',
            'mobile' => '+94 77 999 8888',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->post('/register', $payload);
        $response->assertSessionHasErrors(['subdomain']);
    }

    public function test_invalid_subdomain_format_is_rejected(): void
    {
        $payload = [
            'clinic_name' => 'Bad Clinic',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '10 High St',
            'clinic_phone' => '+94 11 123 4567',
            'subdomain' => '-hyphen-start',
            'name' => 'Admin User',
            'email' => 'admin@bad.lk',
            'mobile' => '+94 77 999 8888',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->post('/register', $payload);
        $response->assertSessionHasErrors(['subdomain']);
    }

    public function test_disposable_email_is_rejected(): void
    {
        $payload = [
            'clinic_name' => 'Disposable Test Clinic',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '10 High St',
            'clinic_phone' => '+94 11 123 4567',
            'subdomain' => 'valid-subdomain',
            'name' => 'Admin User',
            'email' => 'test@mailinator.com',
            'mobile' => '+94 77 999 8888',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->post('/register', $payload);
        $response->assertSessionHasErrors(['email']);
    }

    public function test_honeypot_field_rejects_bots(): void
    {
        $payload = [
            'honeypot' => 'I am a spambot',
            'clinic_name' => 'Bot Clinic',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '10 High St',
            'clinic_phone' => '+94 11 123 4567',
            'subdomain' => 'bot-clinic',
            'name' => 'Bot User',
            'email' => 'bot@clinic.lk',
            'mobile' => '+94 77 999 8888',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->post('/register', $payload);
        $response->assertSessionHasErrors(['honeypot']);
    }

    public function test_auto_login_link_works_once_and_expires(): void
    {
        Notification::fake();

        $token = 'test-token-sigiriya';
        PendingRegistration::create([
            'email' => 'perera@sigiriya.lk',
            'token' => $token,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        // 1. Register a clinic
        $payload = [
            'clinic_name' => 'Sigiriya Care',
            'clinic_type' => 'medical centre',
            'district' => 'Matale',
            'city' => 'Dambulla',
            'address' => '12 Rock View',
            'clinic_phone' => '+94 66 222 1122',
            'subdomain' => 'sigiriya',
            'name' => 'Dr. Perera',
            'email' => 'perera@sigiriya.lk',
            'mobile' => '+94 77 333 4455',
            'password' => 'Secret123Pass!',
            'password_confirmation' => 'Secret123Pass!',
            'terms' => true,
            'registration_token' => $token,
        ];

        $this->post('/register', $payload);

        $autoLoginUrl = session('registration_success.auto_login_url');
        $this->assertNotEmpty($autoLoginUrl);

        // Parse path & query from the signed url
        $parsed = parse_url($autoLoginUrl);
        $host = $parsed['host'];
        $port = isset($parsed['port']) ? ":{$parsed['port']}" : '';
        $pathAndQuery = $parsed['path'].'?'.$parsed['query'];

        // 2. Use the signed link the FIRST time on tenant domain
        $firstResponse = $this->get("http://{$host}{$port}{$pathAndQuery}");
        $this->assertAuthenticated();
        $this->assertSame('sigiriya', auth()->user()->tenant_id);

        // Logout
        auth()->logout();
        $this->assertGuest();

        // 3. Try to use the same link a SECOND time (single-use check)
        $secondResponse = $this->get("http://{$host}{$port}{$pathAndQuery}");
        $this->assertGuest();
        $secondResponse->assertRedirect("http://{$host}{$port}/login");
        $secondResponse->assertSessionHas('error');

        // 4. Test expired link fails
        $expiredUrl = "http://{$host}{$port}/login/one-time?token=dummy&expires=1000000000&signature=invalid";
        $expiredResponse = $this->get($expiredUrl);
        $this->assertGuest();
        $expiredResponse->assertRedirect("http://{$host}{$port}/login");
    }
}
