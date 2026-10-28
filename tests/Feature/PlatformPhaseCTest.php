<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SendAnnouncementChunkJob;
use App\Mail\AnnouncementMail;
use App\Models\Announcement;
use App\Models\AnnouncementRecipient;
use App\Models\OtpLog;
use App\Models\SchedulerHeartbeat;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PlatformSettingsService;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PlatformPhaseCTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $clinicAdmin;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'clinic_admin']);

        $this->superAdmin = User::factory()->create([
            'email' => 'super@medvisit.lk',
            'tenant_id' => null,
            'is_active' => true,
        ]);
        $this->superAdmin->assignRole('super_admin');

        $this->tenant = Tenant::create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Clinic',
            'subdomain' => 'suwasetha',
            'status' => 'active',
            'plan' => 'growth',
        ]);
        $this->tenant->domains()->create(['domain' => 'suwasetha.localhost']);

        $this->clinicAdmin = User::factory()->create([
            'email' => 'admin@suwasetha.lk',
            'tenant_id' => $this->tenant->id,
            'is_active' => true,
        ]);
        $this->clinicAdmin->assignRole('clinic_admin');
    }

    public function test_all_phase_c_pages_load_200_for_super_admin(): void
    {
        $this->withoutExceptionHandling();
        $this->actingAs($this->superAdmin);

        $urls = [
            'http://medvisit.localhost/super-admin/announcements',
            'http://medvisit.localhost/super-admin/messaging',
            'http://medvisit.localhost/super-admin/system-health',
            'http://medvisit.localhost/super-admin/audit-logs',
            'http://medvisit.localhost/super-admin/settings',
            'http://medvisit.localhost/super-admin/admins',
        ];

        foreach ($urls as $url) {
            $response = $this->get($url);
            $response->assertStatus(200);
        }
    }

    public function test_phase_c_pages_forbidden_for_regular_clinic_admin(): void
    {
        $this->actingAs($this->clinicAdmin);

        $response = $this->get('http://medvisit.localhost/super-admin/announcements');
        $response->assertStatus(403);
    }

    public function test_announcements_audience_count_and_recipient_resolution(): void
    {
        $this->actingAs($this->superAdmin);

        $response = $this->postJson('http://medvisit.localhost/super-admin/announcements/audience-count', [
            'audience_type' => 'all',
            'target_recipient_roles' => ['clinic_admin'],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('clinics_count', 1)
            ->assertJsonPath('people_count', 1);
    }

    public function test_announcements_test_send_to_logged_in_admin(): void
    {
        Mail::fake();
        $this->actingAs($this->superAdmin);

        $response = $this->postJson('http://medvisit.localhost/super-admin/announcements/test-send', [
            'title' => 'Test Subject',
            'message' => '<p>Hello Admin</p>',
            'type' => 'info',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        Mail::assertQueued(AnnouncementMail::class, function ($mail) {
            return $mail->hasTo('super@medvisit.lk') && str_contains($mail->subjectLine(), 'Test Subject');
        });
    }

    public function test_announcements_immediate_send_creates_recipients_and_dispatches_jobs(): void
    {
        Queue::fake();
        $this->actingAs($this->superAdmin);

        $response = $this->post('http://medvisit.localhost/super-admin/announcements', [
            'title' => 'Scheduled Upgrade',
            'message' => '<p>System upgrade notice</p><script>alert("xss")</script>',
            'type' => 'update',
            'channels' => ['in_app', 'banner', 'email'],
            'audience_type' => 'all',
            'action' => 'send',
        ]);

        $response->assertRedirect();

        $announcement = Announcement::latest()->first();
        $this->assertNotNull($announcement);
        $this->assertEquals('Scheduled Upgrade', $announcement->title);
        $this->assertStringNotContainsString('<script>', $announcement->message);

        // Check recipients generated
        $this->assertDatabaseHas('announcement_recipients', [
            'announcement_id' => $announcement->id,
            'tenant_id' => $this->tenant->id,
            'channel' => 'banner',
        ]);

        $this->assertDatabaseHas('announcement_recipients', [
            'announcement_id' => $announcement->id,
            'tenant_id' => $this->tenant->id,
            'channel' => 'email',
            'email' => $this->clinicAdmin->email,
        ]);

        Queue::assertPushed(SendAnnouncementChunkJob::class);
    }

    public function test_announcement_chunk_job_idempotency_never_double_sends(): void
    {
        Mail::fake();

        $announcement = Announcement::create([
            'title' => 'Billing Notice',
            'message' => '<p>Invoice ready</p>',
            'type' => 'billing',
            'channels' => ['email'],
            'audience_type' => 'all',
            'status' => 'sending',
        ]);

        $recipient = AnnouncementRecipient::create([
            'announcement_id' => $announcement->id,
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->clinicAdmin->id,
            'email' => $this->clinicAdmin->email,
            'channel' => 'email',
            'status' => 'pending',
        ]);

        // First run
        (new SendAnnouncementChunkJob([$recipient->id]))->handle();
        Mail::assertQueued(AnnouncementMail::class, 1);

        $recipient->refresh();
        $this->assertEquals('sent', $recipient->status);

        // Second run on already sent recipient
        (new SendAnnouncementChunkJob([$recipient->id]))->handle();
        // Still only 1 sent, never duplicate
        Mail::assertQueued(AnnouncementMail::class, 1);
    }

    public function test_messaging_unconfigured_provider_not_counted_as_delivery_failure(): void
    {
        $this->actingAs($this->superAdmin);

        // Create an unconfigured log entry
        OtpLog::create([
            'tenant_id' => $this->tenant->id,
            'channel' => 'sms',
            'phone_masked' => '077****123',
            'status' => 'failed',
            'error' => 'Provider not configured in environment',
        ]);

        // Create a real delivery failure
        OtpLog::create([
            'tenant_id' => $this->tenant->id,
            'channel' => 'sms',
            'phone_masked' => '077****456',
            'status' => 'failed',
            'error' => 'Network timeout reaching handset',
        ]);

        $response = $this->get('http://medvisit.localhost/super-admin/messaging');
        $response->assertStatus(200);

        $totals = $response->viewData('page')['props']['platformTotals'];
        $this->assertEquals(1, $totals['sms_unconfigured_skipped']);
        $this->assertEquals(1, $totals['sms_failed']);
    }

    public function test_system_health_heartbeat_and_safe_command_execution(): void
    {
        $this->actingAs($this->superAdmin);

        SchedulerHeartbeat::ping();

        $response = $this->get('http://medvisit.localhost/super-admin/system-health');
        $response->assertStatus(200);
        $this->assertTrue($response->viewData('page')['props']['scheduler']['is_running']);

        // Safe command run
        $runResponse = $this->postJson('http://medvisit.localhost/super-admin/system-health/run-command', [
            'command' => 'subscriptions:check-expirations',
        ]);

        $runResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('audit_events', [
            'action' => 'system_health.command_run',
        ]);
    }

    public function test_platform_settings_persistence_and_cache_busting(): void
    {
        $this->actingAs($this->superAdmin);

        $settingsService = app(PlatformSettingsService::class);
        $this->assertEquals(30, $settingsService->get('signups.trial_days'));

        $response = $this->put('http://medvisit.localhost/super-admin/settings', [
            'general.platform_name' => 'MedVisit Cloud',
            'general.support_email' => 'help@medvisit.lk',
            'general.support_phone' => '+94 11 999 8888',
            'general.support_whatsapp' => '+94 77 999 8888',
            'signups.open' => true,
            'signups.trial_days' => 45,
            'signups.default_plan_slug' => 'growth',
            'signups.require_email_verification' => true,
            'billing.grace_days' => 5,
            'billing.reminder_days' => '14,7,1',
            'messaging.sms_cost_per_message' => 2.10,
            'messaging.otp_channel_order' => ['whatsapp', 'sms'],
            'messaging.sender_name' => 'MedVisitLK',
            'security.enforce_2fa_super_admin' => false,
            'security.session_lifetime_minutes' => 60,
            'maintenance.enabled' => false,
            'maintenance.banner_text' => 'Routine maintenance planned',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertEquals(45, $settingsService->get('signups.trial_days'));
        $this->assertEquals('MedVisit Cloud', $settingsService->get('general.platform_name'));

        $this->assertDatabaseHas('audit_events', [
            'action' => 'platform_settings.updated',
        ]);
    }

    public function test_two_factor_authentication_lifecycle_and_recovery_codes(): void
    {
        $this->actingAs($this->superAdmin);
        $tfaService = app(TwoFactorService::class);

        // 1. Setup
        $setupRes = $this->getJson('http://medvisit.localhost/super-admin/admins/2fa/setup');
        $setupRes->assertStatus(200);
        $secret = $setupRes->json('secret');
        $this->assertNotEmpty($secret);

        // 2. Confirm with valid calculated code
        $code = $tfaService->calculateCode($secret, (int) floor(time() / 30));
        $confirmRes = $this->postJson('http://medvisit.localhost/super-admin/admins/2fa/confirm', [
            'code' => $code,
        ]);

        $confirmRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $recoveryCodes = $confirmRes->json('recovery_codes');
        $this->assertCount(10, $recoveryCodes);

        $this->superAdmin->refresh();
        $this->assertNotNull($this->superAdmin->two_factor_confirmed_at);

        // 3. Challenge during login
        Auth::logout();
        $this->post('http://medvisit.localhost/login', [
            'email' => 'super@medvisit.lk',
            'password' => 'password',
        ])->assertRedirect('http://medvisit.localhost/two-factor-challenge');

        // 4. Use recovery code once
        $firstRecoveryCode = $recoveryCodes[0];
        $challengeRes = $this->post('http://medvisit.localhost/two-factor-challenge', [
            'recovery_code' => $firstRecoveryCode,
        ]);
        $challengeRes->assertRedirect('http://medvisit.localhost/super-admin');
        $this->assertAuthenticatedAs($this->superAdmin);

        // 5. Verify used recovery code is consumed
        $this->superAdmin->refresh();
        $this->assertCount(9, $this->superAdmin->two_factor_recovery_codes);

        // 6. Reset 2FA via Artisan CLI command in emergency
        $exitCode = Artisan::call('medvisit:reset-2fa', ['email' => 'super@medvisit.lk']);
        $this->assertEquals(0, $exitCode);

        $this->superAdmin->refresh();
        $this->assertNull($this->superAdmin->two_factor_confirmed_at);
        $this->assertNull($this->superAdmin->two_factor_secret);
    }

    public function test_cannot_deactivate_last_active_super_admin(): void
    {
        $this->actingAs($this->superAdmin);

        $response = $this->post("http://medvisit.localhost/super-admin/admins/{$this->superAdmin->id}/deactivate");
        $response->assertSessionHas('error');
    }
}
