<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\AgreementAcceptance;
use App\Models\OtpLog;
use App\Models\PendingRegistration;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TelegramNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClinicPhoneOtpAndAgreementsTest extends TestCase
{
    use RefreshDatabase;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);

        Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);
    }

    private function createPendingRegistration(array $overrides = []): PendingRegistration
    {
        return PendingRegistration::create(array_merge([
            'email' => 'doctor@testclinic.lk',
            'phone' => '+94771234567',
            'token' => 'test-reg-token-'.bin2hex(random_bytes(6)),
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'payload' => Crypt::encryptString(json_encode([])),
        ], $overrides));
    }

    public function test_send_phone_otp_normalises_sri_lankan_mobile_and_stores_hash(): void
    {
        $pending = $this->createPendingRegistration();

        $response = $this->postJson(route('register.send_phone_otp'), [
            'token' => $pending->token,
            'mobile' => '077 123 4567',
            'cf_turnstile_response' => 'test-token',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'expires_in_seconds' => 300,
            'resend_cooldown_seconds' => 60,
        ]);

        $pending->refresh();
        $this->assertSame('+94771234567', $pending->phone);
        $this->assertNotNull($pending->phone_code_hash);
        // Hashed, never plaintext
        $this->assertNotSame(6, strlen($pending->phone_code_hash));
        $this->assertStringStartsWith('$2y$', $pending->phone_code_hash);
        $this->assertTrue($pending->phone_expires_at->isFuture());

        // OtpLog entry created
        $this->assertDatabaseHas('otp_logs', [
            'channel' => 'textlk',
            'status' => 'sent',
        ]);
    }

    public function test_send_phone_otp_rejects_non_sri_lankan_mobile(): void
    {
        $pending = $this->createPendingRegistration();

        $response = $this->postJson(route('register.send_phone_otp'), [
            'token' => $pending->token,
            'mobile' => '+14155552671', // US number
            'cf_turnstile_response' => 'test-token',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['mobile']);
    }

    public function test_send_phone_otp_enforces_cooldown_and_rate_limits(): void
    {
        $pending = $this->createPendingRegistration([
            'phone' => '+94771234567',
            'phone_resend_available_at' => now()->addSeconds(45),
        ]);

        // Attempting before cooldown expires
        $cooldownResponse = $this->postJson(route('register.send_phone_otp'), [
            'token' => $pending->token,
            'mobile' => '0771234567',
            'cf_turnstile_response' => 'test-token',
        ]);

        $cooldownResponse->assertStatus(429);

        // Rate limit: max 3 sends per phone per hour
        $pending->update(['phone_resend_available_at' => null]);
        for ($i = 0; $i < 3; $i++) {
            PendingRegistration::create([
                'email' => "rate-limit-{$i}@test.lk",
                'phone' => '+94779991122',
                'token' => "tok-{$i}-".bin2hex(random_bytes(4)),
                'code_hash' => Hash::make('123456'),
                'phone_code_hash' => Hash::make('654321'),
                'expires_at' => now()->addMinutes(10),
                'payload' => Crypt::encryptString(json_encode([])),
            ]);
        }

        $throttledResponse = $this->postJson(route('register.send_phone_otp'), [
            'token' => $pending->token,
            'mobile' => '0779991122',
            'cf_turnstile_response' => 'test-token',
        ]);

        $throttledResponse->assertStatus(429);
        $this->assertStringContainsString('Too many SMS requests', $throttledResponse->json('message'));
    }

    public function test_phone_otp_global_daily_cap_triggers_telegram_alert(): void
    {
        config(['medvisit.registration_otp_daily_limit' => 2]);
        $dailyKey = 'registration_otp_daily_count:'.now()->toDateString();
        Cache::put($dailyKey, 2);

        $pending = $this->createPendingRegistration();

        $telegramMock = $this->mock(TelegramNotificationService::class);
        $telegramMock->shouldReceive('sendRegistrationOtpCapAlert')->once()->with(2, 2);

        $response = $this->postJson(route('register.send_phone_otp'), [
            'token' => $pending->token,
            'mobile' => '0771234567',
            'cf_turnstile_response' => 'test-token',
        ]);

        $response->assertStatus(429);
        $this->assertStringContainsString('Daily SMS verification limit reached', $response->json('message'));
    }

    public function test_verify_phone_otp_issues_signed_token_on_correct_code(): void
    {
        $pending = $this->createPendingRegistration([
            'phone' => '+94771234567',
            'phone_code_hash' => Hash::make('654321'),
            'phone_expires_at' => now()->addMinutes(5),
            'phone_attempts' => 0,
        ]);

        $response = $this->postJson(route('register.verify_phone_otp'), [
            'token' => $pending->token,
            'code' => '654321',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $signedToken = $response->json('phone_token');
        $this->assertNotEmpty($signedToken);

        $pending->refresh();
        $this->assertNotNull($pending->phone_verified_at);
        $this->assertSame($signedToken, $pending->phone_signed_token);
    }

    public function test_verify_phone_otp_locks_after_five_attempts(): void
    {
        $pending = $this->createPendingRegistration([
            'phone' => '+94771234567',
            'phone_code_hash' => Hash::make('654321'),
            'phone_expires_at' => now()->addMinutes(5),
            'phone_attempts' => 4,
        ]);

        $response = $this->postJson(route('register.verify_phone_otp'), [
            'token' => $pending->token,
            'code' => '000000',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'locked' => true,
            'attempts_remaining' => 0,
        ]);

        $pending->refresh();
        $this->assertSame(5, $pending->phone_attempts);
        $this->assertNull($pending->phone_verified_at);
    }

    public function test_verify_phone_otp_rejects_expired_code(): void
    {
        $pending = $this->createPendingRegistration([
            'phone' => '+94771234567',
            'phone_code_hash' => Hash::make('654321'),
            'phone_expires_at' => now()->subMinute(),
            'phone_attempts' => 0,
        ]);

        $response = $this->postJson(route('register.verify_phone_otp'), [
            'token' => $pending->token,
            'code' => '654321',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['expired' => true]);
    }

    public function test_registration_requires_both_terms_and_agreement_authority(): void
    {
        $signedToken = 'signed-phone-token-test-1234567890';
        $pending = $this->createPendingRegistration([
            'phone' => '+94771234567',
            'phone_verified_at' => now(),
            'phone_signed_token' => $signedToken,
        ]);

        $basePayload = [
            'clinic_name' => 'Colombo Care Center',
            'clinic_type' => 'medical centre',
            'district' => 'Colombo',
            'city' => 'Colombo 05',
            'address' => '50 Havelock Road',
            'clinic_phone' => '+94 11 255 6677',
            'subdomain' => 'colombo-care',
            'name' => 'Dr. Perera',
            'email' => 'doctor@testclinic.lk',
            'mobile' => '+94 77 123 4567',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'registration_token' => $pending->token,
            'phone_token' => $signedToken,
        ];

        // Missing agreement_authority
        $response1 = $this->post('/register', array_merge($basePayload, [
            'terms' => true,
            'agreement_authority' => false,
        ]));
        $response1->assertSessionHasErrors(['agreement_authority']);

        // Missing terms
        $response2 = $this->post('/register', array_merge($basePayload, [
            'terms' => false,
            'agreement_authority' => true,
        ]));
        $response2->assertSessionHasErrors(['terms']);
    }

    public function test_successful_registration_stores_phone_and_creates_agreement_acceptance(): void
    {
        $signedToken = 'signed-phone-token-full-success-123';
        $pending = $this->createPendingRegistration([
            'email' => 'admin@carelanka.lk',
            'phone' => '+94771234567',
            'phone_verified_at' => now(),
            'phone_signed_token' => $signedToken,
        ]);

        $payload = [
            'clinic_name' => 'Care Lanka Clinic',
            'clinic_type' => 'medical centre',
            'district' => 'Colombo',
            'city' => 'Nugegoda',
            'address' => '12 High Level Road',
            'clinic_phone' => '+94 11 282 3344',
            'subdomain' => 'care-lanka',
            'name' => 'Dr. Saman',
            'email' => 'admin@carelanka.lk',
            'mobile' => '+94 77 123 4567',
            'password' => 'CarePass1234!',
            'password_confirmation' => 'CarePass1234!',
            'terms' => true,
            'agreement_authority' => true,
            'registration_token' => $pending->token,
            'phone_token' => $signedToken,
        ];

        $response = $this->post('/register', $payload, [
            'User-Agent' => 'MedVisitTestAgent/1.0',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('register.success'));

        $user = User::where('email', 'admin@carelanka.lk')->first();
        $this->assertNotNull($user);
        $this->assertSame('+94771234567', $user->phone);
        $this->assertNotNull($user->phone_verified_at);

        // AgreementAcceptance created with version snapshot
        $acceptance = AgreementAcceptance::where('user_id', $user->id)->first();
        $this->assertNotNull($acceptance);
        $this->assertSame('care-lanka', $acceptance->tenant_id);
        $this->assertSame(config('legal.terms_version'), $acceptance->terms_version);
        $this->assertSame(config('legal.privacy_version'), $acceptance->privacy_version);
        $this->assertSame(config('legal.refund_version'), $acceptance->refund_version);
        $this->assertSame(config('legal.dispute_version'), $acceptance->dispute_version);
        $this->assertSame('MedVisitTestAgent/1.0', $acceptance->user_agent);

        $this->assertTrue($user->hasAcceptedLatestAgreements());
    }

    public function test_clinic_admin_reacceptance_flow_and_post_route(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'kandy-med',
            'name' => 'Kandy Med',
            'subdomain' => 'kandy-med',
        ]);

        $admin = User::factory()->create([
            'email' => 'admin@kandymed.lk',
            'tenant_id' => $tenant->id,
        ]);
        $admin->assignRole('clinic_admin');

        // Initially no acceptance record -> false
        $this->assertFalse($admin->hasAcceptedLatestAgreements());

        // Doctor is not blocked by middleware check
        $doctor = User::factory()->create([
            'email' => 'doctor@kandymed.lk',
            'tenant_id' => $tenant->id,
        ]);
        $doctor->assignRole('doctor');

        // Submit acceptance via POST http://kandy-med.{baseDomain}/agreements/accept
        $this->actingAs($admin);
        $response = $this->post("http://kandy-med.{$this->baseDomain}/agreements/accept", [
            'terms' => true,
            'agreement_authority' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $admin->refresh();
        $this->assertTrue($admin->hasAcceptedLatestAgreements());

        // Bump terms version in config -> requires re-acceptance
        config(['legal.versions.terms' => '2027-01-01', 'legal.terms_version' => '2027-01-01']);
        $this->assertFalse($admin->hasAcceptedLatestAgreements());
    }

    public function test_shared_legal_urls_point_to_central_domain_when_accessed_on_tenant_subdomain(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'siva-legal-check',
            'subdomain' => 'siva-legal-check',
            'setup_completed_at' => now(),
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => 'siva-legal-check',
            'email' => 'admin@sivalegal.lk',
        ]);

        $response = $this->actingAs($admin)
            ->get("http://siva-legal-check.{$this->baseDomain}/dashboard");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('legalUrls')
            ->where('legalUrls.terms', "http://{$this->baseDomain}/terms")
            ->where('legalUrls.privacy', "http://{$this->baseDomain}/privacy-policy")
            ->where('legalUrls.refund', "http://{$this->baseDomain}/refund-policy")
            ->where('legalUrls.dispute', "http://{$this->baseDomain}/dispute-policy")
        );
    }

    public function test_owner_registering_second_clinic_with_same_phone_is_allowed_but_duplicate_email_is_blocked(): void
    {
        // 1. Existing clinic owner with email 'owner@firstclinic.lk' and phone '+94771234567'
        $firstTenant = Tenant::factory()->create([
            'id' => 'first-clinic',
            'subdomain' => 'first-clinic',
        ]);
        User::factory()->create([
            'email' => 'owner@firstclinic.lk',
            'phone' => '+94771234567',
            'tenant_id' => $firstTenant->id,
        ]);

        // 2. Owner attempts to register a SECOND clinic with the SAME email -> Blocked by unique:users,email
        $dupEmailToken = 'token-dup-email-123456';
        $dupPhoneToken = 'phone-dup-email-123456';
        PendingRegistration::create([
            'email' => 'owner@firstclinic.lk',
            'phone' => '+94771234567',
            'token' => $dupEmailToken,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'phone_verified_at' => now(),
            'phone_signed_token' => $dupPhoneToken,
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $dupEmailResponse = $this->post('/register', [
            'clinic_name' => 'Second Clinic Attempt',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '50 Galle Road',
            'clinic_phone' => '+94 11 234 5678',
            'subdomain' => 'second-clinic-attempt',
            'name' => 'Dr. Owner',
            'email' => 'owner@firstclinic.lk', // SAME EMAIL
            'mobile' => '+94 77 123 4567',
            'password' => 'Pass1234!Secure',
            'password_confirmation' => 'Pass1234!Secure',
            'terms' => true,
            'agreement_authority' => true,
            'registration_token' => $dupEmailToken,
            'phone_token' => $dupPhoneToken,
        ]);
        $dupEmailResponse->assertSessionHasErrors(['email']);
        $this->assertDatabaseMissing('tenants', ['id' => 'second-clinic-attempt']);

        // 3. Owner registers a SECOND clinic with a DIFFERENT email and the SAME phone -> Allowed and succeeds!
        $secondEmailToken = 'token-second-clinic-123456';
        $secondPhoneToken = 'phone-second-clinic-123456';
        PendingRegistration::create([
            'email' => 'owner.branch2@firstclinic.lk', // NEW EMAIL
            'phone' => '+94771234567', // SAME PHONE NUMBER
            'token' => $secondEmailToken,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'phone_verified_at' => now(),
            'phone_signed_token' => $secondPhoneToken,
            'payload' => Crypt::encryptString(json_encode([])),
        ]);

        $secondClinicResponse = $this->post('/register', [
            'clinic_name' => 'Second Clinic Success',
            'clinic_type' => 'dispensary',
            'district' => 'Colombo',
            'city' => 'Colombo',
            'address' => '50 Galle Road',
            'clinic_phone' => '+94 11 234 5678',
            'subdomain' => 'second-clinic-success',
            'name' => 'Dr. Owner',
            'email' => 'owner.branch2@firstclinic.lk', // NEW EMAIL
            'mobile' => '+94 77 123 4567', // REUSED MOBILE PHONE
            'password' => 'Pass1234!Secure',
            'password_confirmation' => 'Pass1234!Secure',
            'terms' => true,
            'agreement_authority' => true,
            'registration_token' => $secondEmailToken,
            'phone_token' => $secondPhoneToken,
        ]);
        $secondClinicResponse->assertSessionHasNoErrors();
        $secondClinicResponse->assertRedirect(route('register.success'));

        $secondTenant = Tenant::find('second-clinic-success');
        $this->assertNotNull($secondTenant);

        $secondUser = User::where('email', 'owner.branch2@firstclinic.lk')->first();
        $this->assertNotNull($secondUser);
        $this->assertSame('+94771234567', $secondUser->phone);
    }
}
