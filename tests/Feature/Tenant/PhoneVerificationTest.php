<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\OtpLog;
use App\Models\Patient;
use App\Models\PhoneVerification;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VerifiedPhone;
use App\Models\WhatsAppWebhookEvent;
use App\Services\PhoneVerification\PhoneVerificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PhoneVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected string $baseDomain;

    protected PhoneVerificationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'sivacli',
            'name' => 'Siva Clinic Care',
            'subdomain' => 'sivacli',
            'website_published' => true,
            'require_phone_verification' => true,
            'phone_verification_methods' => ['whatsapp', 'textlk'],
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin Siva',
            'email' => 'admin@sivacli.lk',
        ]);

        $this->service = app(PhoneVerificationService::class);

        Config::set('services.whatsapp.app_secret', 'test_app_secret_key_12345');
        Config::set('services.whatsapp.verify_token', 'test_verify_token_54321');
        Config::set('services.whatsapp.business_number', '+94770000000');
        Config::set('services.textlk.api_token', '');
        Config::set('phone_verification.channels', ['whatsapp', 'textlk']);
    }

    public function test_whatsapp_webhook_handshake_with_valid_token(): void
    {
        $response = $this->get('/webhooks/whatsapp?'.http_build_query([
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'test_verify_token_54321',
            'hub_challenge' => 'challenge_code_98765',
        ]));

        $response->assertStatus(200);
        $this->assertSame('challenge_code_98765', $response->getContent());
    }

    public function test_whatsapp_webhook_handshake_with_literal_dots_in_query_keys(): void
    {
        Config::set('services.whatsapp.verify_token', 'medvisit-verify-2026');

        $response = $this->get('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=medvisit-verify-2026&hub.challenge=12345');

        $response->assertStatus(200);
        $this->assertSame('12345', $response->getContent());
        $this->assertStringContainsString('text/plain', (string) $response->headers->get('Content-Type'));
    }

    public function test_whatsapp_webhook_handshake_rejected_with_invalid_token(): void
    {
        $response = $this->get('/webhooks/whatsapp?'.http_build_query([
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'wrong_token',
            'hub_challenge' => 'challenge_code_98765',
        ]));

        $response->assertStatus(403);
    }

    public function test_whatsapp_webhook_signature_validation(): void
    {
        $payload = json_encode(['entry' => []]);
        $validSignature = 'sha256='.hash_hmac('sha256', (string) $payload, 'test_app_secret_key_12345');

        // Valid signature
        $validResponse = $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => $validSignature, 'CONTENT_TYPE' => 'application/json'],
            $payload
        );
        $validResponse->assertStatus(200);

        // Invalid signature
        $invalidResponse = $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => 'sha256=invalid_signature_hash', 'CONTENT_TYPE' => 'application/json'],
            $payload
        );
        $invalidResponse->assertStatus(401);
    }

    public function test_whatsapp_reverse_verification_matching_code_and_sender_verifies(): void
    {
        $phone = '+94771234567';
        $plainCode = '482913';

        $verification = PhoneVerification::create([
            'tenant_id' => $this->tenant->id,
            'session_id' => 'draft_test_session_1',
            'phone' => $phone,
            'channel' => 'whatsapp',
            'code_hash' => hash('sha256', $plainCode),
            'status' => PhoneVerification::STATUS_PENDING,
            'attempts' => 0,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        $payload = json_encode([
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'messages' => [
                                    [
                                        'id' => 'wamid.HBgMOTE2M...',
                                        'from' => '94771234567',
                                        'type' => 'text',
                                        'text' => [
                                            'body' => "VERIFY {$plainCode}",
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $signature = 'sha256='.hash_hmac('sha256', (string) $payload, 'test_app_secret_key_12345');

        $response = $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $response->assertStatus(200);

        $verification->refresh();
        $this->assertSame(PhoneVerification::STATUS_VERIFIED, $verification->status);
        $this->assertNotNull($verification->verified_at);

        $this->assertTrue(VerifiedPhone::where('phone', $phone)->exists());
    }

    public function test_whatsapp_reverse_verification_sender_mismatch_rejected(): void
    {
        $phone = '+94771234567';
        $plainCode = '482913';

        $verification = PhoneVerification::create([
            'tenant_id' => $this->tenant->id,
            'session_id' => 'draft_test_session_2',
            'phone' => $phone,
            'channel' => 'whatsapp',
            'code_hash' => hash('sha256', $plainCode),
            'status' => PhoneVerification::STATUS_PENDING,
            'attempts' => 0,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        // Message received from different number 94779999999
        $payload = json_encode([
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'messages' => [
                                    [
                                        'id' => 'wamid.HBgMOTE2M_MISMATCH',
                                        'from' => '94779999999',
                                        'type' => 'text',
                                        'text' => [
                                            'body' => "VERIFY {$plainCode}",
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $signature = 'sha256='.hash_hmac('sha256', (string) $payload, 'test_app_secret_key_12345');

        $response = $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $response->assertStatus(200);

        $verification->refresh();
        $this->assertSame(PhoneVerification::STATUS_PENDING, $verification->status);
        $this->assertSame('+94779999999', $verification->mismatch_phone);
    }

    public function test_duplicate_webhook_message_is_idempotent(): void
    {
        $phone = '+94771234567';
        $plainCode = '482913';

        $verification = PhoneVerification::create([
            'tenant_id' => $this->tenant->id,
            'session_id' => 'draft_test_session_3',
            'phone' => $phone,
            'channel' => 'whatsapp',
            'code_hash' => hash('sha256', $plainCode),
            'status' => PhoneVerification::STATUS_PENDING,
            'attempts' => 0,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        $payload = json_encode([
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'messages' => [
                                    [
                                        'id' => 'wamid.DUPLICATE_TEST_ID',
                                        'from' => '94771234567',
                                        'type' => 'text',
                                        'text' => [
                                            'body' => "VERIFY {$plainCode}",
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $signature = 'sha256='.hash_hmac('sha256', (string) $payload, 'test_app_secret_key_12345');

        // First execution
        $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload
        )->assertStatus(200);

        // Second duplicate execution
        $secondResponse = $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $secondResponse->assertStatus(200);
        $this->assertSame(1, WhatsAppWebhookEvent::where('message_id', 'wamid.DUPLICATE_TEST_ID')->count());
    }

    public function test_whatsapp_webhook_logs_delivery_trace_without_secrets(): void
    {
        Log::spy();

        $phone = '+94771234567';
        $plainCode = '482913';

        PhoneVerification::create([
            'tenant_id' => $this->tenant->id,
            'session_id' => 'draft_test_session_log',
            'phone' => $phone,
            'channel' => 'whatsapp',
            'code_hash' => hash('sha256', $plainCode),
            'status' => PhoneVerification::STATUS_PENDING,
            'attempts' => 0,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        $payload = json_encode([
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'messages' => [
                                    [
                                        'id' => 'wamid.TEST_TRACE_LOG',
                                        'from' => '94771234567',
                                        'type' => 'text',
                                        'text' => [
                                            'body' => "VERIFY {$plainCode}",
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $signature = 'sha256='.hash_hmac('sha256', (string) $payload, 'test_app_secret_key_12345');

        $this->call(
            'POST',
            '/webhooks/whatsapp',
            [],
            [],
            [],
            ['HTTP_X-Hub-Signature-256' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        Log::shouldHaveReceived('info')
            ->with('[WhatsApp Webhook] Delivery: field=messages, type=text, sender=+9477****567, result=verified')
            ->once();
    }

    public function test_sms_code_verification_wrong_and_expired_code(): void
    {
        $phone = '+94771234567';
        $plainCode = '482913';

        $verification = PhoneVerification::create([
            'tenant_id' => $this->tenant->id,
            'session_id' => 'draft_test_session_4',
            'phone' => $phone,
            'channel' => 'textlk',
            'code_hash' => hash('sha256', $plainCode),
            'status' => PhoneVerification::STATUS_PENDING,
            'attempts' => 0,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        // Wrong code
        $wrongResult = $this->service->verifyCode($verification->id, '111111', $this->tenant);
        $this->assertFalse($wrongResult['success']);
        $this->assertSame(4, $wrongResult['attempts_remaining']);

        // Expired code
        $verification->update(['expires_at' => Carbon::now()->subMinute()]);
        $expiredResult = $this->service->verifyCode($verification->id, $plainCode, $this->tenant);
        $this->assertFalse($expiredResult['success']);
        $this->assertStringContainsString('expired', strtolower($expiredResult['error']));
    }

    public function test_hourly_rate_limit_per_phone(): void
    {
        $phone = '+94771234567';

        for ($i = 0; $i < 5; $i++) {
            PhoneVerification::create([
                'tenant_id' => $this->tenant->id,
                'session_id' => "session_{$i}",
                'phone' => $phone,
                'channel' => 'textlk',
                'code_hash' => hash('sha256', '123456'),
                'status' => PhoneVerification::STATUS_PENDING,
                'attempts' => 0,
                'expires_at' => Carbon::now()->addMinutes(10),
                'created_at' => Carbon::now(),
            ]);
        }

        $result = $this->service->startVerification(
            rawPhone: $phone,
            channel: 'textlk',
            sessionId: 'new_session_attempt',
            tenant: $this->tenant
        );

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Too many verification attempts', $result['error']);
    }

    public function test_fallback_whatsapp_to_sms_keeps_same_draft_session(): void
    {
        $phone = '0771234567';
        $sessionId = 'draft_shared_session_123';

        // Start WhatsApp
        $waResult = $this->service->startVerification($phone, 'whatsapp', $sessionId, $this->tenant);
        $this->assertTrue($waResult['success']);
        $this->assertSame('whatsapp', $waResult['channel']);

        // Switch to SMS for same session and phone
        $smsResult = $this->service->startVerification($phone, 'textlk', $sessionId, $this->tenant);
        $this->assertTrue($smsResult['success']);
        $this->assertSame('textlk', $smsResult['channel']);

        // Previous WhatsApp attempt should be expired
        $this->assertSame(
            PhoneVerification::STATUS_EXPIRED,
            PhoneVerification::find($waResult['verification_id'])->status
        );
    }

    public function test_remembered_number_skips_verification_step(): void
    {
        $phone = '+94771234567';

        VerifiedPhone::create([
            'phone' => $phone,
            'channel' => 'whatsapp',
            'verified_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addDays(180),
        ]);

        $this->assertTrue($this->service->isPhoneVerified($phone, $this->tenant));

        // Start verification endpoint reports already verified
        $startResult = $this->postJson("http://sivacli.{$this->baseDomain}/book/verify/start", [
            'phone' => $phone,
            'channel' => 'whatsapp',
            'session_id' => 'draft_test_remembered',
        ]);

        $startResult->assertStatus(200);
        $this->assertTrue($startResult->json('already_verified'));
    }

    public function test_textlk_driver_with_fake_http(): void
    {
        Http::fake([
            'https://app.text.lk/api/v3/sms/send' => Http::response([
                'status' => 'success',
                'data' => [
                    'message_id' => 'textlk_msg_998877',
                ],
            ], 200),
        ]);

        Config::set('services.textlk.api_token', 'mock_textlk_token');
        Config::set('services.textlk.sender_id', 'MedVisit');

        $result = $this->service->startVerification('0771234567', 'textlk', 'sess_textlk_test', $this->tenant);

        $this->assertTrue($result['success']);

        $log = OtpLog::where('channel', 'textlk')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertSame('sent', $log->status);
        $this->assertSame('textlk_msg_998877', $log->provider_message_id);
    }

    public function test_reception_issued_tokens_do_not_require_phone_verification(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'max_tokens' => 30,
        ]);

        $patient = Patient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'phone' => '+94770001122',
        ]);

        $this->actingAs($this->adminUser);

        $response = $this->post("http://sivacli.{$this->baseDomain}/bookings", [
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'payment_status' => 'pending',
            'payment_method' => 'cash',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertTrue(BookingToken::where('doctor_session_id', $session->id)->where('patient_id', $patient->id)->exists());
    }

    public function test_online_booking_store_rejects_unverified_phone_when_enabled(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'max_tokens' => 30,
        ]);

        $response = $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Kumara Silva',
            'phone' => '0775551234',
            'consent' => true,
            'verification_session_id' => 'unverified_session_xyz',
        ]);

        $response->assertSessionHasErrors(['phone']);
    }

    public function test_online_booking_store_allows_when_phone_verification_is_disabled(): void
    {
        $this->tenant->update(['require_phone_verification' => false]);

        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'max_tokens' => 30,
        ]);

        $response = $this->post("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Kumara Silva',
            'phone' => '0775551234',
            'consent' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('booking_tokens', [
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
        ]);
    }

    public function test_booking_without_verification_returns_422_via_json(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'max_tokens' => 30,
        ]);

        $response = $this->postJson("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Kumara Silva',
            'phone' => '0775551234',
            'consent' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['phone']);
    }

    public function test_booking_with_verified_attempt_returns_201_via_json(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'max_tokens' => 30,
        ]);

        $sessionId = 'valid_session_attempt_123';
        $normalizedPhone = '+94775551234';

        PhoneVerification::create([
            'tenant_id' => $this->tenant->id,
            'session_id' => $sessionId,
            'phone' => $normalizedPhone,
            'channel' => 'whatsapp',
            'code_hash' => hash('sha256', '123456'),
            'status' => PhoneVerification::STATUS_VERIFIED,
            'verified_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addMinutes(10),
            'attempts' => 1,
        ]);

        $response = $this->postJson("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Kumara Silva',
            'phone' => '0775551234',
            'consent' => true,
            'verification_session_id' => $sessionId,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('booking_tokens', [
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
        ]);
    }

    public function test_booking_with_remembered_verified_phones_returns_201_via_json(): void
    {
        $doctor = Doctor::factory()->create(['tenant_id' => $this->tenant->id]);
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'status' => 'scheduled',
            'max_tokens' => 30,
        ]);

        $normalizedPhone = '+94775551234';

        VerifiedPhone::create([
            'tenant_id' => $this->tenant->id,
            'phone' => $normalizedPhone,
            'verified_at' => Carbon::now(),
            'channel' => 'whatsapp',
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        $response = $this->postJson("http://sivacli.{$this->baseDomain}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Kumara Silva',
            'phone' => '0775551234',
            'consent' => true,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('booking_tokens', [
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
        ]);
    }

    public function test_tenants_have_require_phone_verification_false_by_default(): void
    {
        $tenant = Tenant::create(['id' => 'autotest', 'name' => 'Auto Test', 'subdomain' => 'autotest']);
        $this->assertFalse($tenant->require_phone_verification);
    }
}
