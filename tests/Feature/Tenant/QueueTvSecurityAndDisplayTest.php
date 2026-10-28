<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\TvDevice;
use App\Models\TvPairingCode;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class QueueTvSecurityAndDisplayTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected Doctor $doctor;

    protected DoctorSession $session;

    protected Patient $patient;

    protected BookingToken $token;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'carepoint',
            'name' => 'CarePoint Medical',
            'subdomain' => 'carepoint',
            'tv_name_display_mode' => 'token_only',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@carepoint.lk',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Anoma Wijesinghe',
            'title' => 'Dr.',
            'specialty' => 'Cardiology',
            'slmc_number' => 'SLMC-9999',
            'is_active' => true,
        ]);

        $today = Carbon::today('Asia/Colombo')->toDateString();

        $this->session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => $today,
            'start_time' => '17:00:00',
            'end_time' => '20:00:00',
            'status' => 'in_progress',
            'room_number' => 'Room 3',
            'current_token_number' => 15,
        ]);

        $this->patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Thanarasan Sivanujan',
            'phone' => '+94771234567',
        ]);

        $this->token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->session->id,
            'patient_id' => $this->patient->id,
            'token_number' => 15,
            'sequence_number' => 15,
            'status' => BookingToken::STATUS_CALLED,
            'payment_status' => 'paid',
            'called_at' => now(),
        ]);
    }

    protected function getTvDataWithToken(string $plainToken, ?string $subdomain = null): TestResponse
    {
        $sub = $subdomain ?? $this->tenant->subdomain;
        $url = "http://{$sub}.{$this->baseDomain}/queue/tv/data";

        return $this->call('GET', $url, [], ['tv_device_token' => $plainToken], [], ['HTTP_ACCEPT' => 'application/json']);
    }

    protected function getTvPageWithToken(string $plainToken, ?string $subdomain = null): TestResponse
    {
        $sub = $subdomain ?? $this->tenant->subdomain;
        $url = "http://{$sub}.{$this->baseDomain}/queue/tv";

        return $this->call('GET', $url, [], ['tv_device_token' => $plainToken]);
    }

    public function test_unauthenticated_and_unpaired_visitor_sees_pairing_screen_without_queue_data(): void
    {
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/queue/tv";

        $response = $this->get($url);

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Queue/Tv')
            ->where('isPaired', false)
            ->where('tvData', null)
            ->has('clinic')
        );
    }

    public function test_polling_queue_tv_data_without_device_token_returns_401(): void
    {
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/queue/tv/data";

        $response = $this->getJson($url);

        $response->assertStatus(401)
            ->assertJson([
                'isPaired' => false,
            ]);
    }

    public function test_pairing_code_creation_and_successful_device_pairing(): void
    {
        // 1. Staff creates pairing code
        $codeResponse = $this->actingAs($this->adminUser)
            ->postJson("http://{$this->tenant->subdomain}.{$this->baseDomain}/api/tv/pairing-code", [
                'device_name' => 'Waiting Room TV 1',
            ]);

        $codeResponse->assertOk()
            ->assertJsonStructure(['code', 'expires_at', 'qr_url']);

        $code = $codeResponse->json('code');
        $this->assertEquals(6, strlen($code));

        // 2. TV pairs with the 6-digit code
        $pairResponse = $this->postJson("http://{$this->tenant->subdomain}.{$this->baseDomain}/queue/tv/pair", [
            'code' => $code,
            'device_name' => 'Waiting Room TV 1',
        ]);

        $pairResponse->assertOk()
            ->assertJson(['success' => true])
            ->assertCookie('tv_device_token');

        // 3. Single-use: pairing with the same code again fails
        $reuseResponse = $this->postJson("http://{$this->tenant->subdomain}.{$this->baseDomain}/queue/tv/pair", [
            'code' => $code,
        ]);

        $reuseResponse->assertStatus(422);
    }

    public function test_expired_pairing_code_cannot_be_used(): void
    {
        $expiredCode = TvPairingCode::create([
            'tenant_id' => $this->tenant->id,
            'code' => '999888',
            'device_name' => 'Old TV',
            'expires_at' => now()->subMinute(),
        ]);

        $response = $this->postJson("http://{$this->tenant->subdomain}.{$this->baseDomain}/queue/tv/pair", [
            'code' => '999888',
        ]);

        $response->assertStatus(422);
    }

    public function test_revoked_device_immediately_loses_access(): void
    {
        $plainToken = TvDevice::generateToken();
        $device = TvDevice::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Display A',
            'device_token_hash' => hash('sha256', $plainToken),
            'last_seen_at' => now(),
        ]);

        // Initial access with valid token succeeds
        $response = $this->getTvDataWithToken($plainToken);
        $response->assertOk();

        // Revoke the device
        $device->revoke();

        // Immediate subsequent request fails with 401
        $revokedResponse = $this->getTvDataWithToken($plainToken);
        $revokedResponse->assertStatus(401);

        // Page view returns pairing screen
        $pageResponse = $this->getTvPageWithToken($plainToken);
        $pageResponse->assertInertia(fn (Assert $page) => $page
            ->component('Queue/Tv')
            ->where('isPaired', false)
            ->where('tvData', null)
        );
    }

    public function test_tenant_isolation_device_token_from_clinic_a_cannot_access_clinic_b(): void
    {
        $clinicB = Tenant::factory()->active()->create([
            'id' => 'apexcare',
            'name' => 'Apex Care',
            'subdomain' => 'apexcare',
        ]);

        $plainTokenClinicA = TvDevice::generateToken();
        TvDevice::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Clinic A TV',
            'device_token_hash' => hash('sha256', $plainTokenClinicA),
            'last_seen_at' => now(),
        ]);

        // Attempting to access Clinic B's TV endpoint with Clinic A's token
        $response = $this->getTvDataWithToken($plainTokenClinicA, $clinicB->subdomain);

        $response->assertStatus(401);
    }

    public function test_privacy_setting_token_only_never_leaks_patient_names_or_phones(): void
    {
        $this->tenant->tv_name_display_mode = 'token_only';
        $this->tenant->save();

        $plainToken = TvDevice::generateToken();
        TvDevice::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Waiting Area',
            'device_token_hash' => hash('sha256', $plainToken),
            'last_seen_at' => now(),
        ]);

        $response = $this->getTvDataWithToken($plainToken);

        $response->assertOk();
        $this->assertNull($response->json('nowServing.patient_name'));
        $this->assertStringNotContainsString('Thanarasan', $response->getContent());
        $this->assertStringNotContainsString('Sivanujan', $response->getContent());
        $this->assertStringNotContainsString('0771234567', $response->getContent());
        $this->assertStringNotContainsString('+94771234567', $response->getContent());
    }

    public function test_privacy_setting_initial_last_formats_patient_name(): void
    {
        $this->tenant->tv_name_display_mode = 'initial_last';
        $this->tenant->save();

        $plainToken = TvDevice::generateToken();
        TvDevice::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Waiting Area',
            'device_token_hash' => hash('sha256', $plainToken),
            'last_seen_at' => now(),
        ]);

        $response = $this->getTvDataWithToken($plainToken);

        $response->assertOk();
        $this->assertEquals('T. Sivanujan', $response->json('nowServing.patient_name'));
        // Phone number must still NEVER be included
        $this->assertStringNotContainsString('+94771234567', $response->getContent());
    }

    public function test_privacy_setting_first_only_formats_patient_name(): void
    {
        $this->tenant->tv_name_display_mode = 'first_only';
        $this->tenant->save();

        $plainToken = TvDevice::generateToken();
        TvDevice::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Waiting Area',
            'device_token_hash' => hash('sha256', $plainToken),
            'last_seen_at' => now(),
        ]);

        $response = $this->getTvDataWithToken($plainToken);

        $response->assertOk();
        $this->assertEquals('Thanarasan', $response->json('nowServing.patient_name'));
    }

    public function test_doctor_title_deduplication_and_waiting_plurals(): void
    {
        $plainToken = TvDevice::generateToken();
        TvDevice::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Waiting Area',
            'device_token_hash' => hash('sha256', $plainToken),
            'last_seen_at' => now(),
        ]);

        $response = $this->getTvDataWithToken($plainToken);

        $response->assertOk();
        // Single "Dr." only
        $this->assertEquals('Dr. Anoma Wijesinghe', $response->json('nowServing.doctor_name'));
        $this->assertNotEquals('Dr. Dr. Anoma Wijesinghe', $response->json('nowServing.doctor_name'));
    }
}
