<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TokenHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorTokenPrefixTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected User $adminUserA;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenantA = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
            'token_number_format' => 'with_doctor_code',
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'arogya',
            'name' => 'Arogya Care Hospital',
            'subdomain' => 'arogya',
        ]);

        $this->adminUserA = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenantA->id,
            'email' => 'admin@suwasetha.lk',
        ]);
    }

    public function test_doctor_profile_gets_auto_generated_unique_code_and_enforces_uppercase(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Sivanujan Thanarasan',
            'title' => 'Dr.',
            'specialty' => 'Cardiology',
            'token_code' => '',
            'is_active' => true,
        ]);

        $this->assertNotEmpty($doctor->token_code);
        $this->assertSame(strtoupper($doctor->token_code), $doctor->token_code);
        $this->assertMatchesRegularExpression('/^[A-Z0-9]{2,5}$/', $doctor->token_code);
    }

    public function test_doctor_code_must_be_unique_within_tenant_but_allowed_across_different_tenants(): void
    {
        $docA = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Sivanujan',
            'specialty' => 'Cardiology',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        // Same code 'SV' in Tenant B is allowed (Tenant isolation)
        $docB = Doctor::factory()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Sunil Varma',
            'specialty' => 'Pediatrics',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $this->assertSame('SV', $docA->token_code);
        $this->assertSame('SV', $docB->token_code);

        // Attempting duplicate in same Tenant A triggers automatic collision suffixing or validation
        $docA2 = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Suresh Vidyarthi',
            'specialty' => 'Neurology',
            'token_code' => '', // auto-generate
            'is_active' => true,
        ]);

        $this->assertNotSame('SV', $docA2->token_code);
    }

    public function test_doctor_code_collision_appends_suffix(): void
    {
        $code1 = TokenHelper::generateUniqueCode($this->tenantA->id, 'Sivanujan', null, 'SV');
        $this->assertSame('SV', $code1);

        Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Doctor One',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        // Requesting SV again in same tenant falls back to next candidate or appends suffix SV2
        $code2 = TokenHelper::generateUniqueCode($this->tenantA->id, 'Doctor Two', null, 'SV');
        $this->assertNotSame('SV', $code2);
    }

    public function test_doctor_session_snapshots_doctor_token_code_at_creation(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $this->assertSame('SV', $session->doctor_token_code);
    }

    public function test_updating_doctor_code_later_does_not_mutate_existing_session_snapshot(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->addDays(2)->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenantA->id]);
        $token = BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_BOOKED,
        ]);

        $this->assertSame('SV-01', $token->display_token);

        // Admin updates doctor profile code from SV to SN
        $doctor->update(['token_code' => 'SN']);

        // Session snapshot remains SV!
        $session->refresh();
        $this->assertSame('SV', $session->doctor_token_code);

        // Pre-booked token display remains SV-01!
        $token->refresh();
        $this->assertSame('SV-01', $token->display_token);
    }

    public function test_doctor_with_future_bookings_returns_warning_count(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->addDays(3)->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenantA->id]);
        BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_BOOKED,
        ]);

        $this->assertSame(1, $doctor->future_bookings_count);
    }

    public function test_clinic_settings_token_number_format_affects_display(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        // Default: with_doctor_code
        $this->assertSame('SV-01', $session->formatToken(1));

        // Switch setting to number_only
        $this->tenantA->update(['token_number_format' => 'number_only']);
        $session->unsetRelation('tenant');
        $this->assertSame('01', $session->formatToken(1));

        // Format override in call
        $this->assertSame('SV-01', $session->formatToken(1, 'with_doctor_code'));
    }

    public function test_two_concurrent_sessions_both_at_token_1_produce_distinct_display_tokens(): void
    {
        $doc1 = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'Cardiology',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $doc2 = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Thanarasan',
            'specialty' => 'Pediatrics',
            'token_code' => 'TH',
            'is_active' => true,
        ]);

        $session1 = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doc1->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $session2 = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doc2->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:30:00',
            'end_time' => '12:30:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $patient1 = Patient::factory()->create(['tenant_id' => $this->tenantA->id]);
        $patient2 = Patient::factory()->create(['tenant_id' => $this->tenantA->id]);

        $token1 = BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session1->id,
            'patient_id' => $patient1->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_CALLED,
        ]);

        $token2 = BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session2->id,
            'patient_id' => $patient2->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_CALLED,
        ]);

        // Both hold token_number integer 1
        $this->assertSame(1, $token1->token_number);
        $this->assertSame(1, $token2->token_number);

        // But their display labels are distinct and completely unambiguous
        $this->assertSame('SV-01', $token1->display_token);
        $this->assertSame('TH-01', $token2->display_token);
    }

    public function test_tenant_overlap_detector_identifies_concurrent_doctor_sessions(): void
    {
        $doc1 = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'Cardiology',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $doc2 = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Thanarasan',
            'specialty' => 'Pediatrics',
            'token_code' => 'TH',
            'is_active' => true,
        ]);

        // Single doctor session -> no overlap
        DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doc1->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $this->assertFalse($this->tenantA->hasOverlappingDoctorSessions(now()->toDateString()));

        // Second doctor session overlapping in time (10:00 - 13:00)
        DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doc2->id,
            'session_date' => now()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '13:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $this->assertTrue($this->tenantA->hasOverlappingDoctorSessions(now()->toDateString()));
    }

    public function test_workspace_search_by_code_and_number_returns_matched_tokens(): void
    {
        $doc = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doc->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenantA->id, 'name' => 'Nimal Silva']);

        BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_BOOKED,
        ]);

        // Search with full code prefix "SV-01"
        $resp1 = $this->actingAs($this->adminUserA)
            ->getJson("http://suwasetha.{$this->baseDomain}/api/search?q=SV-01");

        $resp1->assertOk();
        $this->assertNotEmpty($resp1->json('tokens'));
        $this->assertStringContainsString('Token #SV-01', $resp1->json('tokens.0.title') ?? '');

        // Search with compact "sv01"
        $resp2 = $this->actingAs($this->adminUserA)
            ->getJson("http://suwasetha.{$this->baseDomain}/api/search?q=sv01");

        $resp2->assertOk();
        $this->assertNotEmpty($resp2->json('tokens'));
        $this->assertStringContainsString('Token #SV-01', $resp2->json('tokens.0.title') ?? '');

        // Search with pure number "01"
        $resp3 = $this->actingAs($this->adminUserA)
            ->getJson("http://suwasetha.{$this->baseDomain}/api/search?q=01");

        $resp3->assertOk();
        $this->assertNotEmpty($resp3->json('tokens'));
        $this->assertStringContainsString('Token #SV-01', $resp3->json('tokens.0.title') ?? '');
    }

    public function test_tv_queue_endpoint_contains_token_display_and_doctor_token_code(): void
    {
        $doc = Doctor::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Sivanujan',
            'specialty' => 'General Practice',
            'token_code' => 'SV',
            'is_active' => true,
        ]);

        $session = DoctorSession::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_id' => $doc->id,
            'session_date' => now()->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 30,
            'status' => 'scheduled',
        ]);

        $patient = Patient::factory()->create(['tenant_id' => $this->tenantA->id]);

        BookingToken::create([
            'tenant_id' => $this->tenantA->id,
            'doctor_session_id' => $session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_CALLED,
        ]);

        $response = $this->actingAs($this->adminUserA)
            ->get("http://suwasetha.{$this->baseDomain}/queue/tv");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Queue/Tv')
            ->has('tvData.allSessions.0.doctor_token_code')
            ->where('tvData.allSessions.0.doctor_token_code', 'SV')
            ->where('tvData.nowServing.token_display', 'SV-01')
        );
    }
}
