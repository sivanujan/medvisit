<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Mail\Auth\RegistrationVerificationCodeMail;
use App\Models\PendingRegistration;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ClinicRegistrationOtpTest extends TestCase
{
    use RefreshDatabase;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);
    }

    /**
     * Test 1: Code sent and hashed in pending_registrations.
     */
    public function test_verification_code_is_sent_and_hashed_in_pending_registrations(): void
    {
        Mail::fake();

        $payload = [
            'clinic_name' => 'Kandy Care Hospital',
            'clinic_type' => 'specialist clinic',
            'district' => 'Kandy',
            'city' => 'Kandy',
            'address' => '25 Peradeniya Road',
            'clinic_phone' => '+94 81 223 4455',
            'subdomain' => 'kandy-care',
            'name' => 'Dr. Senanayake',
            'email' => 'senanayake@kandycare.lk',
            'mobile' => '+94 77 555 6677',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->postJson(route('register.send_code'), $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'email' => 'senanayake@kandycare.lk',
            'expires_in_seconds' => 600,
            'resend_cooldown_seconds' => 60,
        ]);

        $token = $response->json('token');
        $this->assertNotEmpty($token);

        // Verify PendingRegistration record
        $pending = PendingRegistration::where('token', $token)->first();
        $this->assertNotNull($pending);
        $this->assertSame('senanayake@kandycare.lk', $pending->email);
        $this->assertSame(0, $pending->attempts);
        $this->assertNull($pending->verified_at);
        $this->assertTrue($pending->expires_at->isFuture());

        // Verify code is stored as a HASH, not plaintext
        $this->assertNotSame(6, strlen($pending->code_hash));
        $this->assertStringStartsWith('$2y$', $pending->code_hash);

        // Verify email was queued with correct subject & mailable
        Mail::assertQueued(RegistrationVerificationCodeMail::class, function (RegistrationVerificationCodeMail $mail) use ($pending) {
            $this->assertTrue($mail->hasTo('senanayake@kandycare.lk'));
            $this->assertSame("Your MedVisit verification code: {$mail->code}", $mail->subjectLine());
            $this->assertTrue(Hash::check($mail->code, $pending->code_hash));

            return true;
        });

        // Nothing written to tenants or users yet
        $this->assertDatabaseMissing('tenants', ['id' => 'kandy-care']);
        $this->assertDatabaseMissing('users', ['email' => 'senanayake@kandycare.lk']);
    }

    /**
     * Test 2: Wrong code is rejected and attempts are incremented.
     */
    public function test_wrong_code_is_rejected_and_attempts_incremented(): void
    {
        $token = 'test-token-wrong-code';
        $pending = PendingRegistration::create([
            'email' => 'test@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('654321'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $response = $this->postJson(route('register.verify_code'), [
            'token' => $token,
            'code' => '111111',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'attempts_remaining' => 4,
        ]);

        $pending->refresh();
        $this->assertSame(1, $pending->attempts);
        $this->assertNull($pending->verified_at);
    }

    /**
     * Test 3: Expired code is rejected.
     */
    public function test_expired_code_is_rejected(): void
    {
        $token = 'test-token-expired';
        $pending = PendingRegistration::create([
            'email' => 'expired@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('654321'),
            'attempts' => 0,
            'expires_at' => now()->subMinute(), // already expired
            'resend_available_at' => now()->subMinutes(2),
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $response = $this->postJson(route('register.verify_code'), [
            'token' => $token,
            'code' => '654321',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'expired' => true,
        ]);

        $pending->refresh();
        $this->assertNull($pending->verified_at);
    }

    /**
     * Test 4: Attempt limit (max 5 wrong attempts locks code).
     */
    public function test_max_five_attempts_locks_verification(): void
    {
        $token = 'test-token-lockout';
        $pending = PendingRegistration::create([
            'email' => 'lockout@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('999999'),
            'attempts' => 4, // already 4 attempts
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        // 5th attempt (fails)
        $response = $this->postJson(route('register.verify_code'), [
            'token' => $token,
            'code' => '000000',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'locked' => true,
            'attempts_remaining' => 0,
        ]);

        $pending->refresh();
        $this->assertSame(5, $pending->attempts);

        // Subsequent attempt is immediately locked
        $nextResponse = $this->postJson(route('register.verify_code'), [
            'token' => $token,
            'code' => '999999', // even correct code is blocked once locked
        ]);

        $nextResponse->assertStatus(422);
        $nextResponse->assertJson([
            'locked' => true,
        ]);
    }

    /**
     * Test 5: Resend cooldown (60 seconds) is enforced.
     */
    public function test_resend_cooldown_is_enforced(): void
    {
        Mail::fake();

        $token = 'test-token-cooldown';
        $pending = PendingRegistration::create([
            'email' => 'cooldown@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(45), // 45 seconds remaining
            'payload' => Crypt::encryptString(json_encode(['name' => 'Doctor', 'clinic_name' => 'Clinic'])),
        ]);

        // Try to resend during active cooldown
        $response = $this->postJson(route('register.resend_code'), [
            'token' => $token,
        ]);

        $response->assertStatus(429);
        $this->assertArrayHasKey('retry_after', $response->json());

        // Fast forward cooldown: set available in past
        $pending->update(['resend_available_at' => now()->subSecond()]);

        // Resend succeeds after cooldown
        $successResponse = $this->postJson(route('register.resend_code'), [
            'token' => $token,
        ]);

        $successResponse->assertStatus(200);
        $successResponse->assertJson(['success' => true]);

        Mail::assertQueued(RegistrationVerificationCodeMail::class);
    }

    /**
     * Test 6: Clinic cannot be created without verified code.
     */
    public function test_clinic_cannot_be_created_without_verified_code(): void
    {
        $token = 'test-unverified-token';
        PendingRegistration::create([
            'email' => 'unverified@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => null, // NOT verified
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $payload = [
            'clinic_name' => 'Unverified Clinic',
            'clinic_type' => 'medical centre',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '10 Flower Road',
            'clinic_phone' => '+94 11 999 8877',
            'subdomain' => 'unverified-clinic',
            'name' => 'Dr. Unverified',
            'email' => 'unverified@medvisit.lk',
            'mobile' => '+94 77 999 8877',
            'password' => 'Secret123Pass!',
            'password_confirmation' => 'Secret123Pass!',
            'terms' => true,
            'registration_token' => $token,
        ];

        // Server must refuse to create clinic
        $response = $this->post('/register', $payload);

        $response->assertSessionHasErrors(['email']);
        $this->assertDatabaseMissing('tenants', ['id' => 'unverified-clinic']);
        $this->assertDatabaseMissing('users', ['email' => 'unverified@medvisit.lk']);
    }

    /**
     * Test 7: Subdomain resolves on medvisit.localhost and clinic is created when verified.
     */
    public function test_subdomain_resolves_on_medvisit_localhost_and_creates_clinic(): void
    {
        Mail::fake();

        $token = 'test-verified-token';
        $pending = PendingRegistration::create([
            'email' => 'siva@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(), // VERIFIED
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $payload = [
            'clinic_name' => 'Sivamed Clinic',
            'clinic_type' => 'medical centre',
            'district' => 'Jaffna',
            'city' => 'Jaffna',
            'address' => '10 Hospital Road',
            'clinic_phone' => '+94 21 222 3344',
            'subdomain' => 'siva',
            'name' => 'Sivanujan',
            'email' => 'siva@medvisit.lk',
            'mobile' => '+94 77 123 4567',
            'password' => 'SecretPass123!',
            'password_confirmation' => 'SecretPass123!',
            'terms' => true,
            'registration_token' => $token,
        ];

        $response = $this->post('/register', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('register.success'));

        // Assert tenant and domain created on baseDomain (medvisit.localhost)
        $tenant = Tenant::find('siva');
        $this->assertNotNull($tenant);
        $this->assertSame('Sivamed Clinic', $tenant->name);
        $this->assertTrue($tenant->domains()->where('domain', "siva.{$this->baseDomain}")->exists());

        // Assert user created with email_verified_at set
        $user = User::where('email', 'siva@medvisit.lk')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);

        // Pending record deleted after clinic creation
        $this->assertDatabaseMissing('pending_registrations', ['token' => $token]);

        // Auto login URL generated on tenant host
        $autoLoginUrl = session('registration_success.auto_login_url');
        $this->assertStringContainsString("siva.{$this->baseDomain}", $autoLoginUrl);
    }

    /**
     * Test 8: Auto-login works once on the tenant subdomain.
     */
    public function test_auto_login_link_works_once_on_tenant_subdomain(): void
    {
        Mail::fake();

        $token = 'test-token-autologin';
        PendingRegistration::create([
            'email' => 'autologin@medvisit.lk',
            'token' => $token,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $payload = [
            'clinic_name' => 'Auto Login Practice',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '10 Galle Road',
            'clinic_phone' => '+94 11 555 6677',
            'subdomain' => 'autologin-clinic',
            'name' => 'Auto Admin',
            'email' => 'autologin@medvisit.lk',
            'mobile' => '+94 77 555 6677',
            'password' => 'Passw0rdSecure!',
            'password_confirmation' => 'Passw0rdSecure!',
            'terms' => true,
            'registration_token' => $token,
        ];

        $this->post('/register', $payload);

        $autoLoginUrl = session('registration_success.auto_login_url');
        $this->assertNotEmpty($autoLoginUrl);

        $parsed = parse_url($autoLoginUrl);
        $host = $parsed['host'];
        $port = isset($parsed['port']) ? ":{$parsed['port']}" : '';
        $pathAndQuery = $parsed['path'].'?'.$parsed['query'];

        // First attempt logs in admin on that subdomain
        $firstResponse = $this->get("http://{$host}{$port}{$pathAndQuery}");
        $this->assertAuthenticated();
        $this->assertSame('autologin-clinic', auth()->user()->tenant_id);

        auth()->logout();
        $this->assertGuest();

        // Second attempt fails
        $secondResponse = $this->get("http://{$host}{$port}{$pathAndQuery}");
        $this->assertGuest();
        $secondResponse->assertRedirect("http://{$host}{$port}/login");
    }
}
