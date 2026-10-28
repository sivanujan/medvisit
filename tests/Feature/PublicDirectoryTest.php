<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SyncClinicDirectoryListing;
use App\Models\BookingToken;
use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Plan;
use App\Models\SessionTemplate;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VerifiedPhone;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PublicDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $clinicAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Care',
            'subdomain' => 'suwasetha',
            'phone' => '+94771234567',
            'address' => '123 High Level Rd, Maharagama, Colombo',
        ]);
        $this->tenant->district = 'Colombo';
        $this->tenant->city = 'Maharagama';
        $this->tenant->directory_enabled = true;
        $this->tenant->directory_district = 'Colombo';
        $this->tenant->directory_city = 'Maharagama';
        $this->tenant->directory_latitude = 6.8485;
        $this->tenant->directory_longitude = 79.9267;
        $this->tenant->directory_consented_at = now()->toIso8601String();
        $this->tenant->directory_services = ['OPD Consultation', 'Specialist Channeling'];
        $this->tenant->save();

        $this->clinicAdmin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Suwasetha Admin',
            'email' => 'admin@suwasetha.lk',
        ]);

        $plan = Plan::firstOrCreate(
            ['slug' => 'medvisit-standard'],
            ['name' => 'MedVisit Standard', 'price_cents' => 500000, 'billing_interval' => 'month', 'is_active' => true]
        );

        Subscription::create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);
    }

    /**
     * Test sync job creates directory listing and active doctors.
     */
    public function test_sync_clinic_directory_listing_job_creates_listing_and_doctors(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'title' => 'Dr.',
            'specialty' => 'Cardiologist',
            'slug' => 'dr-k-sivalingam',
            'doctor_fee' => 250000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        SessionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'title' => 'Evening Session',
            'day_of_week' => 1,
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'room_number' => 'Suite 3',
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);

        $listing = DirectoryListing::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($listing);
        $this->assertEquals('Suwasetha Medical Care', $listing->clinic_name);
        $this->assertEquals('Colombo', $listing->district);
        $this->assertEquals('Maharagama', $listing->city);
        $this->assertEquals(1, $listing->doctor_count);

        $dirDoctor = DirectoryDoctor::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($dirDoctor);
        $this->assertEquals('K. Sivalingam', $dirDoctor->name);
        $this->assertEquals('Cardiologist', $dirDoctor->specialty);
        $this->assertEquals(300000, $dirDoctor->min_fee_cents);
        $this->assertEquals('Rs. 3,000', $dirDoctor->formatted_fee);
        $this->assertNotEmpty($dirDoctor->session_schedules);

        // Adjustment 1: slmc_number and bio do not exist on directory_doctors table
        $this->assertFalse(Schema::hasColumn('directory_doctors', 'slmc_number'));
        $this->assertFalse(Schema::hasColumn('directory_doctors', 'bio'));
    }

    /**
     * Test doctor soft delete or is_active=false removes doctor on next sync (Adjustment 5).
     */
    public function test_doctor_soft_delete_or_inactive_removes_from_directory_on_sync(): void
    {
        $doctor1 = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Doctor One',
            'slug' => 'doctor-one',
            'is_active' => true,
        ]);

        $doctor2 = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Doctor Two',
            'slug' => 'doctor-two',
            'is_active' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);
        $this->assertEquals(2, DirectoryDoctor::where('tenant_id', $this->tenant->id)->count());

        // Make Doctor 1 inactive
        $doctor1->is_active = false;
        $doctor1->save();

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);
        $this->assertEquals(1, DirectoryDoctor::where('tenant_id', $this->tenant->id)->count());
        $this->assertEquals($doctor2->id, DirectoryDoctor::where('tenant_id', $this->tenant->id)->first()->doctor_id);

        // Soft delete Doctor 2
        $doctor2->delete();

        // When all doctors are removed, the listing is also removed
        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);
        $this->assertNull(DirectoryListing::where('tenant_id', $this->tenant->id)->first());
        $this->assertEquals(0, DirectoryDoctor::where('tenant_id', $this->tenant->id)->count());
    }

    /**
     * Test public directory find page (/find) loads for guest.
     */
    public function test_public_directory_find_page_loads_and_filters(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'title' => 'Dr.',
            'specialty' => 'Cardiologist',
            'slug' => 'dr-k-sivalingam',
            'is_active' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);

        $response = $this->get("http://{$this->baseDomain}/find");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Directory/Find')
            ->has('doctors', 1)
            ->has('listings', 1)
        );

        // Filter by district
        $filteredResponse = $this->get("http://{$this->baseDomain}/find?district=Colombo");
        $filteredResponse->assertStatus(200);
        $filteredResponse->assertInertia(fn ($page) => $page
            ->component('Directory/Find')
            ->has('doctors', 1)
        );

        // Filter with non-matching district
        $emptyResponse = $this->get("http://{$this->baseDomain}/find?district=Kandy");
        $emptyResponse->assertStatus(200);
        $emptyResponse->assertInertia(fn ($page) => $page
            ->component('Directory/Find')
            ->has('doctors', 0)
            ->has('listings', 0)
        );
    }

    /**
     * Test clinic profile page (/clinics/{slug}) loads.
     */
    public function test_public_directory_clinic_profile_page_loads(): void
    {
        Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'is_active' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);
        $this->assertNotNull(DirectoryListing::where('slug', 'suwasetha')->first(), 'Listing was not created by sync job');

        $response = $this->get("http://{$this->baseDomain}/clinics/suwasetha");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Directory/ClinicProfile')
            ->where('listing.name', 'Suwasetha Medical Care')
            ->has('doctors', 1)
        );
    }

    /**
     * Test doctor profile page (/doctors/{clinicSlug}/{doctorSlug}) loads.
     */
    public function test_public_directory_doctor_profile_page_loads(): void
    {
        Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'is_active' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);

        $response = $this->get("http://{$this->baseDomain}/doctors/suwasetha/dr-k-sivalingam");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Directory/DoctorProfile')
            ->where('doctor.name', 'K. Sivalingam')
            ->where('listing.name', 'Suwasetha Medical Care')
        );
    }

    /**
     * Test booking redirect links directly to /book/{doctor-slug}?source=directory (Adjustment 2).
     */
    public function test_doctor_booking_url_links_directly_to_doctor_slug_with_source_directory(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'is_active' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);

        $dirDoctor = DirectoryDoctor::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($dirDoctor);

        $this->assertStringContainsString("suwasetha.{$this->baseDomain}", $dirDoctor->booking_url);
        $this->assertStringEndsWith('/book/dr-k-sivalingam?source=directory', $dirDoctor->booking_url);
    }

    /**
     * Test source=directory is persisted in session across flow and saved on BookingToken (Adjustment 3).
     */
    public function test_source_directory_persisted_in_session_and_saved_on_booking_token(): void
    {
        VerifiedPhone::create([
            'phone' => '+94771234567',
            'channel' => 'whatsapp',
            'verified_at' => now(),
            'expires_at' => now()->addDays(180),
        ]);

        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivalingam',
            'slug' => 'dr-k-sivalingam',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'is_active' => true,
        ]);

        $tomorrow = Carbon::tomorrow('Asia/Colombo')->toDateString();
        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $tomorrow,
            'start_time' => '16:00:00',
            'end_time' => '19:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        // 1. Visit doctor booking page with ?source=directory
        $response = $this->get("http://suwasetha.{$this->baseDomain}/book/dr-k-sivalingam?source=directory");
        $response->assertStatus(200);
        $response->assertSessionHas('booking_source', 'directory');

        // 2. An invalid source is ignored (clear previous session first)
        $this->flushSession();
        $responseInvalid = $this->get("http://suwasetha.{$this->baseDomain}/book/dr-k-sivalingam?source=unauthorized_source");
        $responseInvalid->assertStatus(200);
        $responseInvalid->assertSessionMissing('booking_source');

        // 3. Complete booking with session containing booking_source='directory'
        $postData = [
            'doctor_session_id' => $session->id,
            'phone' => '+94771234567',
            'name' => 'Kamal Perera',
            'age' => 35,
            'gender' => 'male',
            'notes' => 'Routine checkup',
        ];

        $bookResponse = $this->withSession(['booking_source' => 'directory'])
            ->post("http://suwasetha.{$this->baseDomain}/book", $postData);

        $bookResponse->assertStatus(302);

        // Assert booking token was created with source = 'directory'
        $token = BookingToken::where('doctor_session_id', $session->id)->first();
        $this->assertNotNull($token);
        $this->assertEquals('directory', $token->source);

        // Assert session booking_source was cleared
        $bookResponse->assertSessionMissing('booking_source');
    }

    /**
     * Test district and city prefilled in settings from tenants.data registered values (Adjustment 6).
     */
    public function test_directory_settings_prefills_district_and_city_from_tenant_data(): void
    {
        // Set registered values without explicit directory_district
        $this->tenant->directory_district = null;
        $this->tenant->directory_city = null;
        $this->tenant->district = 'Jaffna';
        $this->tenant->city = 'Chavakachcheri';
        $this->tenant->save();

        $response = $this->actingAs($this->clinicAdmin)
            ->get("http://suwasetha.{$this->baseDomain}/settings");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/Index')
            ->where('directorySettings.district', 'Jaffna')
            ->where('directorySettings.city', 'Chavakachcheri')
        );
    }

    /**
     * Test directory doctor booking URL resolves cleanly and public booking handles flexible slugs.
     */
    public function test_directory_doctor_booking_url_resolves_correctly_with_flexible_slugs(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Rohantha Senanayake',
            'title' => 'Dr.',
            'specialty' => 'Cardiology',
            'is_active' => true,
        ]);

        SyncClinicDirectoryListing::dispatchSync((string) $this->tenant->id);

        $dirDoctor = DirectoryDoctor::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($dirDoctor);
        $this->assertEquals('Dr. Rohantha Senanayake', $dirDoctor->full_title);

        // Directory booking URL should contain doctor's slug and source parameter
        $this->assertStringContainsString("/book/{$doctor->slug}?source=directory", $dirDoctor->booking_url);

        // Booking URL resolves with 200 OK
        $response = $this->get($dirDoctor->booking_url);
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Public/Booking/CalendarSessionPicker')
            ->where('doctor.id', $doctor->id)
            ->where('doctor.full_title', 'Dr. Rohantha Senanayake')
        );

        // Both normalized and prefixed doctor slugs resolve with 200 OK
        $res1 = $this->get("http://suwasetha.{$this->baseDomain}/book/dr-rohantha-senanayake");
        $res1->assertStatus(200);

        $res2 = $this->get("http://suwasetha.{$this->baseDomain}/book/rohantha-senanayake");
        $res2->assertStatus(200);
    }
}
