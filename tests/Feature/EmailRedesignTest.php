<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mail\AnnouncementMail;
use App\Mail\Auth\RegistrationVerificationCodeMail;
use App\Mail\BookingConfirmationMail;
use App\Mail\MedVisitMailable;
use App\Models\User;
use App\Services\SampleMailFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmailRedesignTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'super_admin']);

        $this->superAdmin = User::factory()->create([
            'email' => 'superadmin@medvisit.test',
            'is_active' => true,
        ]);
        $this->superAdmin->assignRole('super_admin');
    }

    /**
     * Test that all 25 registered mailables render without throwing exceptions.
     */
    public function test_all_mailables_render_without_errors(): void
    {
        $templates = SampleMailFactory::allTemplates();
        $this->assertGreaterThanOrEqual(20, count($templates));

        foreach ($templates as $key => $meta) {
            $mailable = SampleMailFactory::create($key);

            $this->assertNotNull($mailable, "Failed to instantiate mailable for key {$key}");
            $html = $mailable->render();
            $this->assertNotEmpty($html, "Rendered HTML is empty for key {$key}");

            // Verify no localhost or relative image src
            $this->assertStringNotContainsString('src="/images/medvisit-logo.png"', $html, "Found relative logo url in {$key}");
            $this->assertStringNotContainsString('http://localhost', $html, "Found http://localhost in {$key}");
            $this->assertStringNotContainsString('127.0.0.1:8000/images', $html, "Found 127.0.0.1 image in {$key}");

            // Verify text part exists
            if ($mailable instanceof MedVisitMailable) {
                $textView = $mailable->textView();
                $this->assertNotEmpty($textView, "Mailable {$key} is missing textView()");
                $textHtml = view($textView, $mailable->content()->with)->render();
                $this->assertNotEmpty($textHtml, "Rendered text is empty for {$key}");
            }
        }
    }

    /**
     * Test preheader spacer hack is present on base emails.
     */
    public function test_base_layout_contains_preheader_and_brand_line(): void
    {
        $mailable = SampleMailFactory::create('auth_registration_otp');
        $html = $mailable->render();

        $this->assertStringContainsString('Your 6-digit verification code is 849201', $html);
        $this->assertStringContainsString('#1E6FD9', $html); // Brand primary color
        $this->assertStringContainsString('#0E9E8F', $html); // Brand teal color
        $this->assertStringContainsString('color-scheme', $html); // Dark mode support
    }

    /**
     * Test patient-facing emails use clinic brand mode.
     */
    public function test_patient_emails_use_clinic_brand_mode(): void
    {
        $bookingMailable = SampleMailFactory::create('patient_booking_confirmation');
        $this->assertInstanceOf(BookingConfirmationMail::class, $bookingMailable);
        $this->assertEquals('clinic', $bookingMailable->brandMode);

        $html = $bookingMailable->render();
        $this->assertStringContainsString('Suwa Shanthi Family Clinic', $html);
        $this->assertStringContainsString('Powered by', $html);
        $this->assertStringContainsString('Google Maps', $html);
        $this->assertStringContainsString('#12', $html); // Large token number
    }

    /**
     * Test unsubscribe link only present on non-transactional announcements.
     */
    public function test_unsubscribe_link_presence_policy(): void
    {
        // 1. Transactional Registration OTP should NOT have unsubscribe link
        $otpMail = SampleMailFactory::create('auth_registration_otp');
        $otpHtml = $otpMail->render();
        $this->assertStringNotContainsString('Unsubscribe', $otpHtml);

        // 2. Non-transactional Announcement SHOULD have unsubscribe link
        $announcementMail = SampleMailFactory::create('platform_announcement');
        $this->assertInstanceOf(AnnouncementMail::class, $announcementMail);
        $announcementHtml = $announcementMail->render();
        $this->assertStringContainsString('Unsubscribe', $announcementHtml);
    }

    /**
     * Test super admin email preview index page loads.
     */
    public function test_super_admin_can_view_email_previews_page(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get('http://medvisit.localhost:8000/super-admin/email-previews');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/EmailPreviews/Index')
            ->has('templates')
            ->has('categories')
            ->has('selectedKey')
        );
    }

    /**
     * Test super admin render endpoint returns raw HTML and text for iframes.
     */
    public function test_super_admin_can_render_html_and_text_previews(): void
    {
        // HTML render
        $responseHtml = $this->actingAs($this->superAdmin)
            ->get('http://medvisit.localhost:8000/super-admin/email-previews/render?template=auth_welcome_clinic&mode=html');

        $responseHtml->assertStatus(200);
        $responseHtml->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $this->assertStringContainsString('Nawaloka Family Health', $responseHtml->getContent());

        // Dark simulation HTML render
        $responseDark = $this->actingAs($this->superAdmin)
            ->get('http://medvisit.localhost:8000/super-admin/email-previews/render?template=auth_welcome_clinic&mode=html&dark=1');

        $responseDark->assertStatus(200);
        $this->assertStringContainsString('#0F172A', $responseDark->getContent());

        // Text render
        $responseText = $this->actingAs($this->superAdmin)
            ->get('http://medvisit.localhost:8000/super-admin/email-previews/render?template=auth_welcome_clinic&mode=text');

        $responseText->assertStatus(200);
        $responseText->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
        $this->assertStringContainsString('3 Quick Next Steps to Get Started', $responseText->getContent());
    }

    /**
     * Test send test email endpoint dispatches mailable.
     */
    public function test_super_admin_can_send_test_email(): void
    {
        Mail::fake();

        $response = $this->actingAs($this->superAdmin)
            ->post('http://medvisit.localhost:8000/super-admin/email-previews/send-test', [
                'template' => 'auth_registration_otp',
                'recipient_email' => 'tester@medvisit.lk',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Mail::assertQueued(RegistrationVerificationCodeMail::class, function ($mail) {
            return $mail->hasTo('tester@medvisit.lk');
        });
    }
}
