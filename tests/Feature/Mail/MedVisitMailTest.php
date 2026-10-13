<?php

declare(strict_types=1);

namespace Tests\Feature\Mail;

use App\Mail\Auth\FindClinicAccessMail;
use App\Mail\Auth\ResetPasswordMail;
use App\Mail\Auth\VerifyEmailMail;
use App\Mail\Auth\WelcomeClinicMail;
use App\Mail\Security\NewDeviceLoginMail;
use App\Mail\Tenants\TrialEndedMail;
use App\Mail\Tenants\TrialEndingSoonMail;
use App\Mail\TestMail;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MedVisitMailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app['url']->defaults(['central_domain' => 'medvisit.test']);
    }

    public function test_email_verification_mail_is_queued_with_correct_identities(): void
    {
        Mail::fake();

        $user = User::factory()->unverified()->create([
            'email' => 'doctor@example.com',
            'name' => 'Dr. Perera',
        ]);

        $response = $this->actingAs($user)->post('/email/verification-notification');
        $response->assertSessionHas('status', 'verification-link-sent');

        Mail::assertQueued(VerifyEmailMail::class, function (VerifyEmailMail $mail) use ($user) {
            $this->assertTrue($mail->hasTo($user->email));
            $this->assertSame('verify@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);
            $this->assertSame('Verify your email address - MedVisit', $mail->subjectLine());
            $this->assertStringContainsString('/verify-email/', $mail->verificationUrl);

            // Test HTML content rendering
            $mail->assertSeeInHtml('Verify your email address');
            $mail->assertSeeInHtml('Dr. Perera');
            $mail->assertSeeInText('Dr. Perera');

            return true;
        });
    }

    public function test_password_reset_mail_is_queued_with_tenant_subdomain_link(): void
    {
        Mail::fake();

        $tenant = Tenant::factory()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Care',
            'subdomain' => 'suwasetha',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@suwasetha.lk',
            'name' => 'Dr. Suwasetha',
        ]);

        $response = $this->post('http://suwasetha.medvisit.test/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertSessionHas('status');

        Mail::assertQueued(ResetPasswordMail::class, function (ResetPasswordMail $mail) use ($user) {
            $this->assertTrue($mail->hasTo($user->email));
            $this->assertSame('verify@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);
            $this->assertStringContainsString('Reset your password', $mail->subjectLine());

            // Assert link opens on the correct clinic subdomain
            $this->assertStringStartsWith('http://suwasetha.medvisit.test/reset-password/', $mail->resetUrl);
            $this->assertStringContainsString('email=admin%40suwasetha.lk', $mail->resetUrl);

            // Assert rendered content
            $mail->assertSeeInHtml('Reset your password');
            $mail->assertSeeInHtml('Suwasetha Medical Care');
            $mail->assertSeeInText('Suwasetha Medical Care');

            return true;
        });
    }

    public function test_welcome_clinic_mail_is_queued_after_registration(): void
    {
        Mail::fake();

        $payload = [
            'clinic_name' => 'Apex Family Health',
            'clinic_type' => 'medical centre',
            'district' => 'Colombo',
            'city' => 'Colombo 07',
            'address' => '120 Ward Place',
            'clinic_phone' => '+94 11 234 5678',
            'subdomain' => 'apex-health',
            'name' => 'Dr. Fernando',
            'email' => 'fernando@apexhealth.lk',
            'mobile' => '+94 71 234 5678',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms' => true,
        ];

        $response = $this->post('/register', $payload);
        $response->assertSessionHasNoErrors();

        Mail::assertQueued(WelcomeClinicMail::class, function (WelcomeClinicMail $mail) {
            $this->assertTrue($mail->hasTo('fernando@apexhealth.lk'));
            $this->assertSame('hello@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);
            $this->assertSame('Welcome to MedVisit - Apex Family Health', $mail->subjectLine());

            $this->assertSame('apex-health', $mail->tenant->subdomain);
            $this->assertStringContainsString('apex-health.medvisit.test/login', $mail->clinicUrl);

            // Assert 3 next steps are present in template
            $mail->assertSeeInHtml('Welcome to MedVisit!');
            $mail->assertSeeInHtml('Sign in to your portal');
            $mail->assertSeeInHtml('Invite your team');
            $mail->assertSeeInHtml('Launch queue');
            $mail->assertSeeInText('3 Quick Next Steps');

            return true;
        });
    }

    public function test_find_clinic_mail_is_queued_with_access_links(): void
    {
        Mail::fake();

        $tenantA = Tenant::factory()->create([
            'id' => 'lanka-care',
            'name' => 'Lanka Care Clinic',
            'subdomain' => 'lanka-care',
        ]);

        User::factory()->create([
            'tenant_id' => $tenantA->id,
            'email' => 'staff@example.com',
        ]);

        $response = $this->post('/find-clinic/email', ['email' => 'staff@example.com']);
        $response->assertSessionHas('status');

        Mail::assertQueued(FindClinicAccessMail::class, function (FindClinicAccessMail $mail) {
            $this->assertTrue($mail->hasTo('staff@example.com'));
            $this->assertSame('verify@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);
            $this->assertSame('Your MedVisit Clinic Access Links', $mail->subjectLine());

            $this->assertCount(1, $mail->clinics);
            $mail->assertSeeInHtml('Lanka Care Clinic');
            $mail->assertSeeInText('lanka-care.medvisit.lk');

            return true;
        });
    }

    public function test_trial_ending_reminder_sends_only_once(): void
    {
        Mail::fake();

        $tenant = Tenant::factory()->create([
            'id' => 'asiri-express',
            'name' => 'Asiri Express Care',
            'subdomain' => 'asiri-express',
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(2),
            'trial_ending_reminder_sent_at' => null,
        ]);

        $role = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        $admin = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@asiri.lk',
            'name' => 'Dr. Asiri',
        ]);
        $admin->assignRole($role);

        $this->artisan('medvisit:send-trial-reminders')->assertExitCode(0);

        Mail::assertQueued(TrialEndingSoonMail::class, function (TrialEndingSoonMail $mail) use ($admin, $tenant) {
            $this->assertTrue($mail->hasTo($admin->email));
            $this->assertSame('notifications@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);
            $this->assertSame("Your MedVisit trial ends in 3 days - {$tenant->name}", $mail->subjectLine());

            $mail->assertSeeInHtml('ends in 3 days');
            $mail->assertSeeInText('will conclude on');

            return true;
        });

        $this->assertNotNull($tenant->fresh()->trial_ending_reminder_sent_at);

        // Run second time: must NOT send duplicate email
        Mail::fake();
        $this->artisan('medvisit:send-trial-reminders')->assertExitCode(0);
        Mail::assertNothingQueued();
    }

    public function test_trial_ended_reminder_sends_only_once(): void
    {
        Mail::fake();

        $tenant = Tenant::factory()->create([
            'id' => 'nawaloka-mini',
            'name' => 'Nawaloka Mini Clinic',
            'subdomain' => 'nawaloka-mini',
            'status' => 'trial',
            'trial_ends_at' => now()->subDay(),
            'trial_ended_reminder_sent_at' => null,
        ]);

        $role = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        $admin = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@nawaloka.lk',
            'name' => 'Dr. Nawaloka',
        ]);
        $admin->assignRole($role);

        $this->artisan('medvisit:send-trial-reminders')->assertExitCode(0);

        Mail::assertQueued(TrialEndedMail::class, function (TrialEndedMail $mail) use ($admin, $tenant) {
            $this->assertTrue($mail->hasTo($admin->email));
            $this->assertSame('notifications@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);
            $this->assertSame("Your MedVisit trial has ended - {$tenant->name}", $mail->subjectLine());

            $mail->assertSeeInHtml('free trial has expired');
            $mail->assertSeeInText('has ended');

            return true;
        });

        $this->assertNotNull($tenant->fresh()->trial_ended_reminder_sent_at);

        // Run second time: must NOT send duplicate email
        Mail::fake();
        $this->artisan('medvisit:send-trial-reminders')->assertExitCode(0);
        Mail::assertNothingQueued();
    }

    public function test_on_behalf_of_clinic_sender_uses_clinic_display_name_and_notifications_address(): void
    {
        $user = User::factory()->make([
            'email' => 'nurse@kandycare.lk',
            'name' => 'Nurse Perera',
        ]);

        $mail = new NewDeviceLoginMail($user, '192.168.1.50', 'Mozilla/5.0');
        $mail->onBehalfOfClinic('Kandy City Care');

        $from = $mail->resolveFromAddress();
        $replyTo = $mail->resolveReplyToAddress();

        $this->assertSame('notifications@medvisit.lk', $from->address);
        $this->assertSame('Kandy City Care via MedVisit', $from->name);
        $this->assertSame('support@medvisit.lk', $replyTo->address);
    }

    public function test_password_reset_and_verification_endpoints_are_rate_limited(): void
    {
        $user = User::factory()->create();

        // 5 allowed requests per minute
        for ($i = 0; $i < 5; $i++) {
            $this->post('/forgot-password', ['email' => $user->email]);
        }

        // 6th request must receive HTTP 429 Too Many Requests
        $response = $this->post('/forgot-password', ['email' => $user->email]);
        $response->assertStatus(429);
    }

    public function test_test_mail_artisan_command_sends_email(): void
    {
        Mail::fake();

        $this->artisan('medvisit:test-mail test@medvisit.lk')
            ->expectsOutputToContain('Success! Test email successfully sent to <test@medvisit.lk>')
            ->assertExitCode(0);

        Mail::assertQueued(TestMail::class, function (TestMail $mail) {
            $this->assertTrue($mail->hasTo('test@medvisit.lk'));
            $this->assertSame('notifications@medvisit.lk', $mail->resolveFromAddress()->address);
            $this->assertSame('MedVisit', $mail->resolveFromAddress()->name);
            $this->assertSame('support@medvisit.lk', $mail->resolveReplyToAddress()->address);

            return true;
        });
    }
}
