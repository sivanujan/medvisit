<?php

declare(strict_types=1);

namespace Tests\Feature\Demo;

use App\Models\BookingToken;
use App\Models\DoctorSession;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoPublicBookingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    /**
     * Test: After demo:reset, /book works end-to-end on the demo tenant:
     * - Doctor list (200, not 503 unavailable)
     * - Calendar / date select
     * - Details step with on-screen OTP 123456 verification
     * - Booking submission creates token and redirects to confirmation
     * - Token appears in the demo clinic's today's queue
     */
    public function test_demo_booking_flow_works_end_to_end_after_demo_reset(): void
    {
        // 1. Run demo:reset --force
        $exitCode = Artisan::call('demo:reset', ['--force' => true]);
        $this->assertSame(0, $exitCode);

        $demoTenant = Tenant::find('demo');
        $this->assertNotNull($demoTenant);
        $this->assertTrue((bool) $demoTenant->is_demo);
        $this->assertTrue((bool) $demoTenant->online_booking_enabled);
        $this->assertTrue($demoTenant->hasActiveSubscription());

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $demoUrl = "http://demo.{$baseDomain}";

        // 2. Step 1: Doctor list (GET /book)
        $bookIndex = $this->get("{$demoUrl}/book");

        $bookIndex->assertStatus(200);
        $bookIndex->assertInertia(fn (Assert $page) => $page
            ->component('Public/Booking/DoctorSelect')
            ->has('doctors', 4)
            ->where('clinic.name', 'MedVisit Demo Medical Centre')
        );

        // 3. Step 2: Show doctor calendar
        $now = Carbon::now('Asia/Colombo');
        $today = $now->toDateString();
        $session = DoctorSession::where('tenant_id', 'demo')
            ->where('session_date', $today)
            ->where('doctor_token_code', 'NS')
            ->firstOrFail();

        $doctor = $session->doctor;
        $doctorResp = $this->get("{$demoUrl}/book/{$doctor->slug}");

        $doctorResp->assertStatus(200);

        // 4. Step 3: Show patient details form
        $sessionResp = $this->get("{$demoUrl}/book/{$doctor->slug}/{$session->id}");

        $sessionResp->assertStatus(200);
        $sessionResp->assertInertia(fn (Assert $page) => $page
            ->component('Public/Booking/PatientDetails')
            ->has('feeBreakdown')
            ->where('doctor.id', $doctor->id)
        );

        // 6. Request OTP Verification (phone 0700000099)
        $verifyStart = $this->postJson("{$demoUrl}/book/verify/start", [
            'phone' => '0700000099',
            'channel' => 'textlk',
            'session_id' => 'test-session-123',
        ]);

        $verifyStart->assertStatus(200);
        $verifyStart->assertJson([
            'success' => true,
            'data' => [
                'demo_code' => '123456',
            ],
        ]);

        $verificationId = $verifyStart->json('verification_id');
        $this->assertNotNull($verificationId);

        // 7. Submit 6-digit SMS OTP code "123456"
        $verifyCheck = $this->postJson("{$demoUrl}/book/verify/check-code", [
            'verification_id' => $verificationId,
            'code' => '123456',
        ]);

        $verifyCheck->assertStatus(200);
        $verifyCheck->assertJson([
            'success' => true,
        ]);

        // 8. Submit booking (POST /book)
        $bookingSubmit = $this->post("{$demoUrl}/book", [
            'doctor_session_id' => $session->id,
            'name' => 'Demo Patient Visitor',
            'phone' => '+94 70 000 0099',
            'nic' => 'DEMO-000099',
            'verification_session_id' => 'test-session-123',
            'consent' => '1',
        ]);

        $bookingSubmit->assertStatus(302);

        // Assert new token was created
        $newToken = BookingToken::where('doctor_session_id', $session->id)
            ->where('tenant_id', 'demo')
            ->latest('id')
            ->first();

        $this->assertNotNull($newToken);
        $this->assertSame('Demo Patient Visitor', $newToken->patient->name);
        $bookingSubmit->assertRedirect(route('tenant.book.confirmed', $newToken->signed_cancel_token));

        // 9. Verify token appears in Today's queue
        $queueTokens = BookingToken::where('tenant_id', 'demo')
            ->where('doctor_session_id', $session->id)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $this->assertTrue($queueTokens->contains('id', $newToken->id));
    }

    /**
     * Test: When a normal clinic deliberately disables online booking,
     * /book renders "Book by phone" with contact buttons, opening hours and address.
     */
    public function test_booking_disabled_clinic_renders_book_by_phone(): void
    {
        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $tenant = Tenant::create([
            'id' => 'phoneclinic',
            'name' => 'Kandy Family Practice',
            'subdomain' => 'kandyfamily',
            'phone' => '+94 81 222 3344',
            'address' => '45 Peradeniya Road, Kandy',
            'status' => 'active',
            'online_booking_enabled' => false,
            'is_demo' => false,
        ]);
        $tenant->domains()->create(['domain' => 'kandyfamily']);
        $tenant->domains()->create(['domain' => "kandyfamily.{$baseDomain}"]);

        // Active subscription so it's not an outage
        Subscription::create([
            'tenant_id' => 'phoneclinic',
            'plan_id' => 1,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now()->subDays(5),
            'current_period_end' => now()->addDays(25),
        ]);

        $response = $this->get("http://kandyfamily.{$baseDomain}/book");

        // Should return 200 with BookingUnavailable component in booking_off mode
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Public/BookingUnavailable')
            ->where('mode', 'booking_off')
            ->where('clinicName', 'Kandy Family Practice')
            ->where('phone', '+94 81 222 3344')
            ->where('address', '45 Peradeniya Road, Kandy')
            ->has('openingHours')
            ->has('isOpenNow')
        );
    }
}
