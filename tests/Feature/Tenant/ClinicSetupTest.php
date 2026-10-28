<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Mail\Clinic\ClinicReadyMail;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ClinicSetupTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
    }

    public function test_admin_redirected_to_setup_when_setup_not_completed_and_no_grace(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'new-clinic',
            'name' => 'New Life Clinic',
            'subdomain' => 'newlife',
            'setup_completed_at' => null,
            'setup_grace_until' => null,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@newlife.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://newlife.{$this->baseDomain}/dashboard");

        $response->assertRedirect("http://newlife.{$this->baseDomain}/setup");
    }

    public function test_staff_sees_waiting_screen_when_setup_not_completed_and_no_grace(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'staff-clinic',
            'name' => 'Staff Clinic',
            'subdomain' => 'staffclinic',
            'setup_completed_at' => null,
            'setup_grace_until' => null,
        ]);

        $reception = User::factory()->receptionist()->create([
            'tenant_id' => $tenant->id,
            'email' => 'reception@staffclinic.lk',
        ]);

        $response = $this->actingAs($reception)->get("http://staffclinic.{$this->baseDomain}/dashboard");

        $response->assertStatus(200);
        $response->assertSee('Setup/Waiting', false);
    }

    public function test_admin_and_staff_allowed_access_during_grace_period(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'grace-clinic',
            'name' => 'Grace Care',
            'subdomain' => 'gracecare',
            'setup_completed_at' => null,
            'setup_grace_until' => now()->addDays(5),
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@gracecare.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://gracecare.{$this->baseDomain}/dashboard");
        $response->assertStatus(200);

        // Staff can also access
        $doctor = User::factory()->doctor()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@gracecare.lk',
        ]);

        $docResponse = $this->actingAs($doctor)->get("http://gracecare.{$this->baseDomain}/dashboard");
        $docResponse->assertStatus(200);
    }

    public function test_admin_can_view_setup_wizard(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'view-clinic',
            'name' => 'View Clinic',
            'subdomain' => 'viewcli',
            'setup_completed_at' => null,
            'setup_grace_until' => null,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@viewcli.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://viewcli.{$this->baseDomain}/setup");
        $response->assertStatus(200);
        $response->assertSee('Setup/Index', false);
    }

    public function test_step_1_welcome_advances_step(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'step1-clinic',
            'subdomain' => 'step1cli',
            'setup_step' => 1,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        $response = $this->actingAs($admin)->postJson("http://step1cli.{$this->baseDomain}/setup/step/1");

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 2]);
        $this->assertSame(2, (int) $tenant->fresh()->setup_step);
    }

    public function test_step_2_logo_and_brand_updates_theme_and_colors(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'brand-clinic',
            'subdomain' => 'brandcli',
            'setup_step' => 2,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        $response = $this->actingAs($admin)->postJson("http://brandcli.{$this->baseDomain}/setup/step/2", [
            'brand_color' => '#0E9E8F',
            'theme' => 'medvisit-teal',
            'use_initials' => true,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 3]);

        $fresh = $tenant->fresh();
        $this->assertSame('#0E9E8F', $fresh->website_look['brand_color']);
        $this->assertSame('medvisit-teal', $fresh->website_theme);
        $this->assertSame(3, (int) $fresh->setup_step);
    }

    public function test_step_2_accepts_all_brand_palettes_including_coral_emerald_and_slate(): void
    {
        $palettes = [
            ['brand_color' => '#FF7A59', 'theme' => 'coral-health', 'expected_theme' => 'coral-health'],
            ['brand_color' => '#059669', 'theme' => 'emerald-health', 'expected_theme' => 'emerald-health'],
            ['brand_color' => '#334155', 'theme' => 'slate-luxury', 'expected_theme' => 'slate-luxury'],
            ['brand_color' => '#059669', 'theme' => 'emerald-care', 'expected_theme' => 'emerald-health'],
            ['brand_color' => '#334155', 'theme' => 'slate-clean', 'expected_theme' => 'slate-luxury'],
        ];

        foreach ($palettes as $index => $case) {
            $subdomain = 'palettecli'.$index;
            $tenant = Tenant::factory()->active()->create([
                'id' => 'palette-clinic-'.$index,
                'subdomain' => $subdomain,
                'setup_step' => 2,
            ]);

            $admin = User::factory()->clinicAdmin()->create([
                'tenant_id' => $tenant->id,
            ]);

            $response = $this->actingAs($admin)->postJson("http://{$subdomain}.{$this->baseDomain}/setup/step/2", [
                'brand_color' => $case['brand_color'],
                'theme' => $case['theme'],
                'use_initials' => true,
            ]);

            $response->assertStatus(200);
            $response->assertJson(['success' => true, 'next_step' => 3]);

            $fresh = $tenant->fresh();
            $this->assertSame(strtoupper($case['brand_color']), $fresh->website_look['brand_color']);
            $this->assertSame($case['expected_theme'], $fresh->website_theme);
        }
    }

    public function test_step_3_cover_photo_updates_hero_section(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'cover-clinic',
            'subdomain' => 'covercli',
            'setup_step' => 3,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        $response = $this->actingAs($admin)->postJson("http://covercli.{$this->baseDomain}/setup/step/3", [
            'cover_photo_url' => 'https://example.com/cover.jpg',
            'skipped' => false,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 4]);

        $fresh = $tenant->fresh();
        $this->assertSame('photo', $fresh->website_look['hero_style']);
        $this->assertSame(4, (int) $fresh->setup_step);
    }

    public function test_step_4_location_saves_address_and_coordinates(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'loc-clinic',
            'subdomain' => 'loccli',
            'setup_step' => 4,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        $response = $this->actingAs($admin)->postJson("http://loccli.{$this->baseDomain}/setup/step/4", [
            'address_line' => '10 Hospital Rd',
            'city' => 'Jaffna',
            'district' => 'Jaffna',
            'postal_code' => '40000',
            'latitude' => 9.6615,
            'longitude' => 80.0255,
            'phone' => '0212223344',
            'whatsapp' => '0771234567',
            'email' => 'contact@loccli.lk',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 5]);

        $fresh = $tenant->fresh();
        $this->assertSame('10 Hospital Rd', $fresh->address_line);
        $this->assertSame('Jaffna', $fresh->city);
        $this->assertStringContainsString('222', (string) $fresh->phone);
        $this->assertSame(9.6615, (float) $fresh->directory_latitude);
        $this->assertSame(80.0255, (float) $fresh->directory_longitude);
        $this->assertSame(5, (int) $fresh->setup_step);
    }

    public function test_step_5_opening_hours_validates_at_least_one_day_open(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'hours-clinic',
            'subdomain' => 'hourscli',
            'setup_step' => 5,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        // All closed fails validation
        $allClosed = [
            'mon' => ['day' => 'mon', 'open' => false],
            'tue' => ['day' => 'tue', 'open' => false],
            'wed' => ['day' => 'wed', 'open' => false],
            'thu' => ['day' => 'thu', 'open' => false],
            'fri' => ['day' => 'fri', 'open' => false],
            'sat' => ['day' => 'sat', 'open' => false],
            'sun' => ['day' => 'sun', 'open' => false],
        ];

        $failResponse = $this->actingAs($admin)->postJson("http://hourscli.{$this->baseDomain}/setup/step/5", [
            'opening_hours' => $allClosed,
        ]);
        $failResponse->assertStatus(422);

        // At least 1 day open succeeds
        $allClosed['mon'] = ['day' => 'mon', 'open' => true, 'start' => '08:30', 'end' => '17:30'];
        $okResponse = $this->actingAs($admin)->postJson("http://hourscli.{$this->baseDomain}/setup/step/5", [
            'opening_hours' => $allClosed,
            'opening_hours_note' => 'Lunch break 1-2pm',
        ]);
        $okResponse->assertStatus(200);
        $okResponse->assertJson(['success' => true, 'next_step' => 6]);
    }

    public function test_step_6_services_saves_clinic_services(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'services-clinic',
            'subdomain' => 'servicescli',
            'setup_step' => 6,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        $response = $this->actingAs($admin)->postJson("http://servicescli.{$this->baseDomain}/setup/step/6", [
            'services' => ['OPD consultation', 'Dental care'],
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 7]);

        $fresh = $tenant->fresh();
        $this->assertEquals(['OPD consultation', 'Dental care'], $fresh->directory_services);
    }

    public function test_step_7_online_booking_toggles_and_configures_limits(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'booking-clinic',
            'subdomain' => 'bookingcli',
            'setup_step' => 7,
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
        ]);

        $response = $this->actingAs($admin)->postJson("http://bookingcli.{$this->baseDomain}/setup/step/7", [
            'online_booking_enabled' => true,
            'max_active_tokens_per_phone' => 4,
            'require_phone_verification' => true,
            'require_staff_approval' => false,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 8]);

        $fresh = $tenant->fresh();
        $this->assertTrue((bool) $fresh->online_booking_enabled);
        $this->assertSame(4, (int) $fresh->max_active_tokens_per_phone);
    }

    public function test_step_8_pharmacy_prevents_enabling_on_basic_plan_and_allows_on_pro(): void
    {
        // 1. Basic plan clinic
        $basicPlan = Plan::firstOrCreate(
            ['slug' => 'basic'],
            ['name' => 'Basic Plan', 'price_cents' => 3500, 'features' => []]
        );

        $basicTenant = Tenant::factory()->active()->create([
            'id' => 'basic-clinic',
            'subdomain' => 'basiccli',
            'setup_step' => 8,
        ]);
        Subscription::create([
            'tenant_id' => $basicTenant->id,
            'plan_id' => $basicPlan->id,
            'status' => 'active',
        ]);

        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $basicTenant->id]);

        $failResponse = $this->actingAs($admin)->postJson("http://basiccli.{$this->baseDomain}/setup/step/8", [
            'pharmacy_enabled' => true,
        ]);
        $failResponse->assertStatus(422);

        // 2. Pro plan clinic
        $proPlan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            ['name' => 'Pro Plan', 'price_cents' => 7500, 'features' => []]
        );

        $proTenant = Tenant::factory()->active()->create([
            'id' => 'pro-clinic',
            'subdomain' => 'procli',
            'setup_step' => 8,
        ]);
        Subscription::create([
            'tenant_id' => $proTenant->id,
            'plan_id' => $proPlan->id,
            'status' => 'active',
        ]);

        $proAdmin = User::factory()->clinicAdmin()->create(['tenant_id' => $proTenant->id]);

        $okResponse = $this->actingAs($proAdmin)->postJson("http://procli.{$this->baseDomain}/setup/step/8", [
            'pharmacy_enabled' => true,
            'stock_reduction_mode' => 'dispense',
        ]);
        $okResponse->assertStatus(200);
        $okResponse->assertJson(['success' => true, 'next_step' => 9]);

        $fresh = $proTenant->fresh();
        $this->assertTrue((bool) $fresh->pharmacy_enabled);
        $this->assertSame('dispense', $fresh->pharmacy_stock_reduction_mode);
    }

    public function test_step_9_printing_saves_unified_print_settings(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'print-clinic',
            'subdomain' => 'printcli',
            'setup_step' => 9,
        ]);

        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $tenant->id]);

        $response = $this->actingAs($admin)->postJson("http://printcli.{$this->baseDomain}/setup/step/9", [
            'print_enabled' => true,
            'receipt_format' => '80mm',
            'receipt_prefix' => 'INV',
            'token_slip_enabled' => true,
            'token_slip_autoprint' => true,
            'prescription_print_enabled' => true,
            'prescription_print_language' => 'en',
            'prescription_paper_size' => 'a5',
            'print_header_show_logo' => true,
            'print_header_show_address' => true,
            'registration_number' => 'PHSRC/100',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'next_step' => 10]);

        $fresh = $tenant->fresh();
        $this->assertTrue((bool) $fresh->print_enabled);
        $this->assertSame('80mm', $fresh->print_receipt_format);
        $this->assertSame('INV', $fresh->receipt_prefix);
        $this->assertTrue((bool) $fresh->print_token_slip_autoprint);
    }

    public function test_step_10_directory_requires_consent_when_enabled(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'dir-clinic',
            'subdomain' => 'dircli',
            'setup_step' => 10,
        ]);

        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $tenant->id]);

        // Enabling without consent fails
        $failResponse = $this->actingAs($admin)->postJson("http://dircli.{$this->baseDomain}/setup/step/10", [
            'directory_enabled' => true,
            'consent' => false,
        ]);
        $failResponse->assertStatus(422);

        // Enabling with consent succeeds
        $okResponse = $this->actingAs($admin)->postJson("http://dircli.{$this->baseDomain}/setup/step/10", [
            'directory_enabled' => true,
            'consent' => true,
        ]);
        $okResponse->assertStatus(200);
        $okResponse->assertJson(['success' => true, 'next_step' => 11]);

        $fresh = $tenant->fresh();
        $this->assertTrue((bool) $fresh->directory_enabled);
        $this->assertNotNull($fresh->directory_consented_at);
    }

    public function test_complete_setup_marks_timestamp_and_sends_ready_mail(): void
    {
        Mail::fake();

        $tenant = Tenant::factory()->active()->create([
            'id' => 'ready-clinic',
            'name' => 'Ready Clinic',
            'subdomain' => 'readycli',
            'setup_completed_at' => null,
            'setup_step' => 10,
            'logo_url' => 'https://example.com/logo.png',
            'address_line' => '123 Main St',
            'city' => 'Colombo',
            'district' => 'Colombo',
            'directory_services' => ['OPD consultation'],
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@readycli.lk',
        ]);

        $response = $this->actingAs($admin)->postJson("http://readycli.{$this->baseDomain}/setup/complete");

        $response->assertStatus(200);
        $response->assertJson(['success' => true, 'celebration' => true]);

        $fresh = $tenant->fresh();
        $this->assertNotNull($fresh->setup_completed_at);

        Mail::assertQueued(ClinicReadyMail::class, function ($mail) {
            return $mail->hasTo('admin@readycli.lk');
        });
    }

    public function test_banner_can_be_dismissed_for_session(): void
    {
        $tenant = Tenant::factory()->active()->create([
            'id' => 'banner-clinic',
            'subdomain' => 'bannercli',
        ]);

        $admin = User::factory()->clinicAdmin()->create(['tenant_id' => $tenant->id]);

        $response = $this->actingAs($admin)->postJson("http://bannercli.{$this->baseDomain}/setup/dismiss-banner");

        $response->assertStatus(200);
        $response->assertSessionHas('setup_banner_dismissed', true);
    }
}
