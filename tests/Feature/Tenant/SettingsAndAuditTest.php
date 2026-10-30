<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\AuditEvent;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsAndAuditTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $receptionistUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin User',
            'email' => 'admin@suwasetha.lk',
        ]);

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Receptionist User',
            'email' => 'receptionist@suwasetha.lk',
        ]);
    }

    public function test_admin_can_view_settings_and_audit_page(): void
    {
        AuditEvent::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->adminUser->id,
            'action' => 'user.login',
            'resource_type' => 'user',
            'resource_id' => (string) $this->adminUser->id,
            'metadata' => ['device' => 'desktop'],
            'ip_address' => '127.0.0.1',
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        $url = "http://suwasetha.{$this->baseDomain}/settings";

        $response = $this->actingAs($this->adminUser)->get($url);

        $response->assertOk();
    }

    public function test_admin_can_update_clinic_profile_with_exact_display_name_and_structured_address(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/profile";

        $response = $this->actingAs($this->adminUser)->put($url, [
            'name' => 'Suwasetha Specialty Hospital & Heart Center',
            'phone' => '+94 11 987 6543',
            'address_line' => 'No. 45, Hospital Road',
            'city' => 'Colombo 05',
            'district' => 'Colombo',
            'postal_code' => '00500',
            'registration_number' => 'PHSRC/COL/2026/112',
            'logo_url' => 'https://suwasetha.lk/logo.png',
        ]);

        $response->assertRedirect();

        $this->tenant->refresh();
        $this->assertEquals('Suwasetha Specialty Hospital & Heart Center', $this->tenant->name);
        $this->assertEquals('+94 11 987 6543', $this->tenant->phone);
        $this->assertEquals('No. 45, Hospital Road', $this->tenant->address_line);
        $this->assertEquals('Colombo 05', $this->tenant->city);
        $this->assertEquals('Colombo', $this->tenant->district);
        $this->assertEquals('00500', $this->tenant->postal_code);
        $this->assertEquals('PHSRC/COL/2026/112', $this->tenant->registration_number);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'settings.profile_updated',
        ]);
    }

    public function test_admin_can_update_session_defaults(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/session-defaults";

        $response = $this->actingAs($this->adminUser)->put($url, [
            'default_avg_consultation_minutes' => 12,
            'default_max_tokens' => 25,
            'cancellation_window_hours' => 3,
            'auto_generate_days' => 45,
            'token_number_format' => 'with_doctor_code',
        ]);

        $response->assertRedirect();

        $this->tenant->refresh();
        $this->assertEquals(12, $this->tenant->default_avg_consultation_minutes);
        $this->assertEquals(25, $this->tenant->default_max_tokens);
        $this->assertEquals(3, $this->tenant->cancellation_window_hours);
        $this->assertEquals(45, $this->tenant->auto_generate_days);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'settings.session_defaults_updated',
        ]);
    }

    public function test_admin_can_update_billing_settings(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/billing";

        $response = $this->actingAs($this->adminUser)->put($url, [
            'billing_timing' => 'pay_after_consult',
            'receipt_prefix' => 'SUW',
            'tax_percentage' => 0,
            'accepted_methods' => ['cash', 'card'],
        ]);

        $response->assertRedirect();

        $this->tenant->refresh();
        $this->assertEquals('pay_after_consult', $this->tenant->billing_timing);
        $this->assertEquals('SUW', $this->tenant->receipt_prefix);
        $this->assertEquals(['cash', 'card'], $this->tenant->accepted_methods);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'settings.billing_updated',
        ]);
    }

    public function test_admin_can_update_online_booking_settings(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/online-booking";

        $response = $this->actingAs($this->adminUser)->put($url, [
            'online_booking_enabled' => true,
            'max_active_tokens_per_phone' => 2,
            'require_staff_approval' => true,
        ]);

        $response->assertRedirect();

        $this->tenant->refresh();
        $this->assertTrue($this->tenant->online_booking_enabled);
        $this->assertEquals(2, $this->tenant->max_active_tokens_per_phone);
        $this->assertTrue($this->tenant->require_staff_approval);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'settings.online_booking_updated',
        ]);
    }

    public function test_receptionist_cannot_update_settings(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/profile";

        $response = $this->actingAs($this->receptionistUser)->put($url, [
            'name' => 'Attempted Change',
        ]);

        $response->assertForbidden();
    }

    public function test_section_urls_render_successfully(): void
    {
        $sections = ['profile', 'branding', 'hours', 'sessions', 'booking', 'prescriptions', 'billing', 'receipts', 'pharmacy', 'directory', 'audit'];

        foreach ($sections as $section) {
            $url = "http://suwasetha.{$this->baseDomain}/settings/{$section}";
            $response = $this->actingAs($this->adminUser)->get($url);
            $response->assertOk();
        }
    }

    public function test_admin_can_update_billing_settings_including_clinic_share_visibility(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/billing";

        $response = $this->actingAs($this->adminUser)->put($url, [
            'billing_timing' => 'pay_at_issue',
            'receipt_prefix' => 'BIL',
            'tax_percentage' => 2.5,
            'accepted_methods' => ['cash', 'card', 'bank_transfer'],
            'show_clinic_share_to_doctors' => true,
        ]);

        $response->assertRedirect();

        $this->tenant->refresh();
        $this->assertEquals('BIL', $this->tenant->receipt_prefix);
        $this->assertEquals(2.5, $this->tenant->tax_percentage);
        $this->assertTrue((bool) ($this->tenant->fee_settings['show_clinic_share_to_doctors'] ?? false));
    }

    public function test_admin_can_export_audit_trail_csv_and_action_is_logged(): void
    {
        AuditEvent::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->adminUser->id,
            'action' => 'token.issued',
            'resource_type' => 'booking_token',
            'resource_id' => '15',
            'metadata' => ['token_number' => 15, 'doctor_name' => 'Dr. K. Sivalingam'],
            'ip_address' => '127.0.0.1',
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        $url = "http://suwasetha.{$this->baseDomain}/settings/audit/export";

        $response = $this->actingAs($this->adminUser)->get($url);

        $response->assertOk();
        $this->assertEquals('text/csv; charset=UTF-8', $response->headers->get('content-type'));

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'audit.exported',
        ]);
    }

    public function test_receptionist_cannot_export_audit_trail(): void
    {
        $url = "http://suwasetha.{$this->baseDomain}/settings/audit/export";

        $response = $this->actingAs($this->receptionistUser)->get($url);

        $response->assertForbidden();
    }
}
