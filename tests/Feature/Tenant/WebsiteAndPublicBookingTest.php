<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebsiteAndPublicBookingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
            'website_published' => true,
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin User',
            'email' => 'admin@suwasetha.lk',
        ]);
    }

    public function test_public_can_view_clinic_landing_page(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Nihal Perera',
            'specialty' => 'Cardiology',
            'is_active' => true,
        ]);

        DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '09:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $url = "http://suwasetha.{$this->baseDomain}/";

        $response = $this->get($url);

        $response->assertOk();
    }

    public function test_public_can_view_book_token_page(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/book";

        $response = $this->get($url);

        $response->assertOk();
    }

    public function test_admin_can_access_website_builder_and_update_sections(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/website";

        $response = $this->actingAs($this->adminUser)->get($url);
        $response->assertOk();

        // Update sections
        $sectionsUrl = "http://suwasetha.{$this->baseDomain}/website/sections";
        $response = $this->actingAs($this->adminUser)->put($sectionsUrl, [
            'sections' => [
                [
                    'id' => 'hero',
                    'name' => 'Hero Banner',
                    'enabled' => true,
                    'title' => 'Updated Custom Hero Title',
                ],
                [
                    'id' => 'about',
                    'name' => 'About Clinic',
                    'enabled' => false,
                ],
            ],
        ]);

        $response->assertRedirect();
        $this->tenant->refresh();
        $this->assertEquals('Updated Custom Hero Title', $this->tenant->website_sections[0]['title']);
    }

    public function test_admin_can_publish_and_unpublish_website(): void
    {
        $publishUrl = "http://suwasetha.{$this->baseDomain}/website/publish";

        $response = $this->actingAs($this->adminUser)->post($publishUrl, [
            'published' => false,
        ]);

        $response->assertRedirect();
        $this->tenant->refresh();
        $this->assertFalse($this->tenant->website_published);
    }

    public function test_admin_can_update_website_theme_and_seo(): void
    {
        $themeUrl = "http://suwasetha.{$this->baseDomain}/website/theme";

        $response = $this->actingAs($this->adminUser)->put($themeUrl, [
            'theme' => 'ocean-blue',
            'seo_title' => 'Suwasetha Healthcare - Top Doctors',
            'seo_description' => 'Book premier doctor channeling appointments online.',
        ]);

        $response->assertRedirect();
        $this->tenant->refresh();
        $this->assertEquals('ocean-blue', $this->tenant->website_theme);
        $this->assertEquals('Suwasetha Healthcare - Top Doctors', $this->tenant->seo_title);
    }

    public function test_public_can_book_channeling_token_with_anti_abuse(): void
    {
        $doctor = Doctor::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Sunil Jayawardena',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
        ]);

        $session = DoctorSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => Carbon::tomorrow('Asia/Colombo')->toDateString(),
            'start_time' => '17:00:00',
            'max_tokens' => 15,
            'status' => 'scheduled',
        ]);

        $bookUrl = "http://suwasetha.{$this->baseDomain}/book";

        // 1. Successful booking
        $response = $this->post($bookUrl, [
            'doctor_session_id' => $session->id,
            'name' => 'Kamal Silva',
            'phone' => '+94 77 123 4567',
            'nic' => '198512345678',
            'city' => 'Colombo',
            'notes' => 'Routine cardiology consultation',
            'website_hp' => '', // Clean honeypot
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('booking_tokens', [
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $session->id,
            'token_number' => 1,
            'booked_via' => 'online',
        ]);

        // 2. Reject duplicate token for same phone in same session
        $response = $this->post($bookUrl, [
            'doctor_session_id' => $session->id,
            'name' => 'Kamal Silva',
            'phone' => '+94 77 123 4567',
            'website_hp' => '',
        ]);

        $response->assertSessionHasErrors(['phone']);

        // 3. Reject bot submission with filled honeypot
        $response = $this->post($bookUrl, [
            'doctor_session_id' => $session->id,
            'name' => 'Spam Bot',
            'phone' => '+94 77 999 9999',
            'website_hp' => 'I am a bot',
        ]);

        $response->assertSessionHasErrors(['phone']);
    }
}
