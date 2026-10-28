<?php

declare(strict_types=1);

namespace App\Services;

use App\Mail\AdminInvitationMail;
use App\Mail\AnnouncementMail;
use App\Mail\Auth\FindClinicAccessMail;
use App\Mail\Auth\RegistrationVerificationCodeMail;
use App\Mail\Auth\ResetPasswordMail;
use App\Mail\Auth\VerifyEmailMail;
use App\Mail\Auth\WelcomeClinicMail;
use App\Mail\BookingCancelledMail;
use App\Mail\BookingConfirmationMail;
use App\Mail\BookingReminderMail;
use App\Mail\BookingTokenMovedMail;
use App\Mail\LeadDemoRequestNotificationMail;
use App\Mail\MedVisitMailable;
use App\Mail\Security\NewDeviceLoginMail;
use App\Mail\Security\TwoFactorEnabledMail;
use App\Mail\StaffInviteMail;
use App\Mail\Subscription\SubscriptionCancelledMail;
use App\Mail\Subscription\SubscriptionPastDueMail;
use App\Mail\Subscription\SubscriptionPaymentFailedMail;
use App\Mail\Subscription\SubscriptionPaymentSuccessMail;
use App\Mail\Subscription\SubscriptionPlanChangedMail;
use App\Mail\Subscription\SubscriptionRenewalReminderMail;
use App\Mail\Subscription\SubscriptionResumedMail;
use App\Mail\Subscription\TemplateDowngradeNoticeMail;
use App\Mail\Tenants\TrialEndedMail;
use App\Mail\Tenants\TrialEndingSoonMail;
use App\Mail\TestMail;
use App\Models\AdminInvitation;
use App\Models\Announcement;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Lead;
use App\Models\Patient;
use App\Models\Plan;
use App\Models\StaffInvitation;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WebsiteTemplate;
use Carbon\Carbon;
use Illuminate\Mail\Mailable;

class SampleMailFactory
{
    /**
     * Get metadata definition for all email templates.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function allTemplates(): array
    {
        return [
            'auth_registration_otp' => [
                'name' => 'Registration Email Verification OTP',
                'category' => 'Authentication',
                'description' => 'Sent to clinic owner during signup with 6-digit confirmation code.',
                'brand_mode' => 'platform',
            ],
            'auth_find_clinic' => [
                'name' => 'Clinic Access Links ("Find My Clinic")',
                'category' => 'Authentication',
                'description' => 'Sent when a user requests magic login links to all their clinic workspaces.',
                'brand_mode' => 'platform',
            ],
            'auth_welcome_clinic' => [
                'name' => 'Welcome / Getting Started (3 Steps)',
                'category' => 'Authentication',
                'description' => 'Sent after clinic setup with 3 actionable onboarding steps.',
                'brand_mode' => 'platform',
            ],
            'auth_reset_password' => [
                'name' => 'Password Reset',
                'category' => 'Authentication',
                'description' => 'Secure password reset link with expiration notice.',
                'brand_mode' => 'platform',
            ],
            'auth_verify_email' => [
                'name' => 'Verify Email Address',
                'category' => 'Authentication',
                'description' => 'Account activation link for newly invited or registered users.',
                'brand_mode' => 'platform',
            ],
            'auth_staff_invite' => [
                'name' => 'Clinic Staff Invitation',
                'category' => 'Authentication',
                'description' => 'Sent to doctors, receptionists, or nurses to join a clinic workspace.',
                'brand_mode' => 'platform',
            ],
            'admin_invitation' => [
                'name' => 'Super Administrator Invitation',
                'category' => 'Authentication',
                'description' => 'Invitation sent to engineers and operations staff for central platform control.',
                'brand_mode' => 'platform',
            ],
            'security_new_device_login' => [
                'name' => 'New Device / Location Login Alert',
                'category' => 'Security',
                'description' => 'Triggered when a sign-in occurs from an unrecognized device or IP.',
                'brand_mode' => 'platform',
            ],
            'security_two_factor_enabled' => [
                'name' => 'Two-Factor Authentication Enabled',
                'category' => 'Security',
                'description' => 'Confirmation email sent when 2FA authenticator is confirmed.',
                'brand_mode' => 'platform',
            ],
            'subscription_payment_success' => [
                'name' => 'Payment Received (Receipt PDF Attached)',
                'category' => 'Subscription & Billing',
                'description' => 'Payment confirmation with official accounting receipt PDF attached.',
                'brand_mode' => 'platform',
            ],
            'subscription_payment_failed' => [
                'name' => 'Subscription Payment Failed',
                'category' => 'Subscription & Billing',
                'description' => 'Payment failure notification with direct retry button.',
                'brand_mode' => 'platform',
            ],
            'subscription_renewal_reminder' => [
                'name' => 'Renewal Reminder (7d / 1d)',
                'category' => 'Subscription & Billing',
                'description' => 'Upcoming billing reminder to prevent any queue interruption.',
                'brand_mode' => 'platform',
            ],
            'subscription_template_downgrade_notice' => [
                'name' => 'Template Downgrade Notice (7 Days Before)',
                'category' => 'Subscription & Billing',
                'description' => 'Notice sent 7 days before downgrade takes effect warning free template ends.',
                'brand_mode' => 'platform',
            ],
            'subscription_past_due' => [
                'name' => 'Past Due / Grace Period Active',
                'category' => 'Subscription & Billing',
                'description' => 'Notice that grace period is active and payment is overdue.',
                'brand_mode' => 'platform',
            ],
            'subscription_trial_ending_soon' => [
                'name' => '14-Day Trial Ending Soon (3 Days Left)',
                'category' => 'Subscription & Billing',
                'description' => 'Reminds clinic owners to pick a paid plan before trial concludes.',
                'brand_mode' => 'platform',
            ],
            'subscription_trial_ended' => [
                'name' => '14-Day Free Trial Expired',
                'category' => 'Subscription & Billing',
                'description' => 'Notifies clinic owner that trial ended while reassuring data is preserved.',
                'brand_mode' => 'platform',
            ],
            'subscription_cancelled' => [
                'name' => 'Subscription Cancelled',
                'category' => 'Subscription & Billing',
                'description' => 'Confirmation of cancellation with active date until end of period.',
                'brand_mode' => 'platform',
            ],
            'subscription_resumed' => [
                'name' => 'Subscription Resumed',
                'category' => 'Subscription & Billing',
                'description' => 'Confirmation when a cancelled subscription is reactivated.',
                'brand_mode' => 'platform',
            ],
            'subscription_plan_changed' => [
                'name' => 'Subscription Plan Changed',
                'category' => 'Subscription & Billing',
                'description' => 'Upgrade or downgrade confirmation showing prorated amount.',
                'brand_mode' => 'platform',
            ],
            'platform_announcement' => [
                'name' => 'Platform Broadcast Announcement',
                'category' => 'Platform',
                'description' => 'System broadcast to clinics with badge, optional banner, and CTA.',
                'brand_mode' => 'platform',
            ],
            'platform_lead_demo' => [
                'name' => 'New Lead Demo Request (Super Admin)',
                'category' => 'Platform',
                'description' => 'Notification to MedVisit team when a new doctor requests a demo.',
                'brand_mode' => 'platform',
            ],
            'patient_booking_confirmation' => [
                'name' => 'Booking Confirmation (Clinic Brand)',
                'category' => 'Patient (Clinic Brand)',
                'description' => 'Clinic-branded channeling token confirmation with doctor, date, and map.',
                'brand_mode' => 'clinic',
            ],
            'patient_booking_reminder' => [
                'name' => 'Appointment Reminder (Clinic Brand)',
                'category' => 'Patient (Clinic Brand)',
                'description' => 'Morning or prior-day channeling reminder with token number.',
                'brand_mode' => 'clinic',
            ],
            'patient_token_moved' => [
                'name' => 'Token Rescheduled / Moved (Clinic Brand)',
                'category' => 'Patient (Clinic Brand)',
                'description' => 'Notifies patient if their token was moved or appointment rescheduled.',
                'brand_mode' => 'clinic',
            ],
            'patient_booking_cancelled' => [
                'name' => 'Appointment Cancelled (Clinic Brand)',
                'category' => 'Patient (Clinic Brand)',
                'description' => 'Notifies patient of cancellation with reason and rebooking link.',
                'brand_mode' => 'clinic',
            ],
            'system_test_mail' => [
                'name' => 'Email Delivery Transport Test',
                'category' => 'System',
                'description' => 'Verification test email sent to verify SMTP/Resend connectivity.',
                'brand_mode' => 'platform',
            ],
        ];
    }

    /**
     * Create a mock instance of a mailable by key.
     */
    public static function create(string $key): Mailable
    {
        return match ($key) {
            'auth_registration_otp' => new RegistrationVerificationCodeMail(
                code: '849201',
                email: 'dr.kalinga@lankacare.lk',
                name: 'Dr. Kalinga Perera',
                clinicName: 'Lanka Care Family Health'
            ),

            'auth_find_clinic' => new FindClinicAccessMail(
                recipientEmail: 'dr.kalinga@lankacare.lk',
                clinics: [
                    [
                        'name' => 'Lanka Care Family Health - Colombo 03',
                        'subdomain' => 'lankacare-colombo',
                        'role' => 'clinic_admin',
                        'login_url' => 'https://lankacare-colombo.medvisit.lk/login',
                        'auto_login_url' => 'https://lankacare-colombo.medvisit.lk/auth/magic?token=sample1',
                    ],
                    [
                        'name' => 'Apex Specialist Center - Kandy',
                        'subdomain' => 'apex-kandy',
                        'role' => 'doctor',
                        'login_url' => 'https://apex-kandy.medvisit.lk/login',
                        'auto_login_url' => 'https://apex-kandy.medvisit.lk/auth/magic?token=sample2',
                    ],
                ]
            ),

            'auth_welcome_clinic' => new WelcomeClinicMail(
                tenant: self::mockTenant('nawaloka-family', 'Nawaloka Family Health'),
                user: self::mockUser('Dr. Ruwan Wickramasinghe', 'ruwan@nawaloka.lk')
            ),

            'auth_reset_password' => new ResetPasswordMail(
                token: 'sample-reset-token-xyz',
                user: self::mockUser('Dr. Priyantha Silva', 'priyantha@silvaclinic.lk'),
                clinicName: 'Silva Medical & Dental Clinic'
            ),

            'auth_verify_email' => new VerifyEmailMail(
                user: self::mockUser('Dr. Anoma Jayasuriya', 'anoma@suwapiyasa.lk'),
                verificationUrl: 'https://medvisit.lk/verify-email/sample-verification-token'
            ),

            'auth_staff_invite' => new StaffInviteMail(
                invitation: new StaffInvitation([
                    'name' => 'Niroshan Bandara',
                    'email' => 'niroshan@suwapiyasa.lk',
                    'role' => 'receptionist',
                    'tenant_id' => 'suwapiyasa',
                    'expires_at' => Carbon::now()->addHours(48),
                ]),
                acceptUrl: 'https://suwapiyasa.medvisit.lk/invitations/accept/sample-token-123',
                clinicName: 'Suwapiyasa Medical Clinic'
            ),

            'admin_invitation' => new AdminInvitationMail(
                invitation: new AdminInvitation([
                    'email' => 'operations@medvisit.lk',
                    'token' => 'sample-admin-token-789',
                    'expires_at' => Carbon::now()->addHours(48),
                ]),
                inviteUrl: 'https://medvisit.lk/super-admin/invitations/accept/sample-token-789',
                invitedByName: 'Sivanujan (Platform Admin)'
            ),

            'security_new_device_login' => new NewDeviceLoginMail(
                user: self::mockUser('Sivanujan', 'sivanujan@medvisit.lk'),
                ipAddress: '192.248.1.5 (Colombo, Sri Lanka)',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
            ),

            'security_two_factor_enabled' => new TwoFactorEnabledMail(
                user: self::mockUser('Dr. Sanjeewa Fernando', 'sanjeewa@colombocare.lk')
            ),

            'subscription_payment_success' => self::mockPaymentSuccessMail(),

            'subscription_payment_failed' => new SubscriptionPaymentFailedMail(
                invoice: new SubscriptionInvoice([
                    'invoice_number' => 'INV-2026-000088',
                    'amount' => 1500000,
                    'tenant_id' => 'asiri-care',
                ]),
                clinicName: 'Asiri Medical Care',
                retryUrl: 'https://asiri-care.medvisit.lk/billing/pay/INV-2026-000088',
                failureMessage: 'Card declined: Insufficient funds or bank authorization required.'
            ),

            'subscription_renewal_reminder' => new SubscriptionRenewalReminderMail(
                invoice: new SubscriptionInvoice([
                    'invoice_number' => 'INV-2026-000049',
                    'amount' => 2500000,
                    'tenant_id' => 'durdans-care',
                ]),
                clinicName: 'Durdans Healthcare',
                daysRemaining: 7,
                payUrl: 'https://durdans.medvisit.lk/billing'
            ),

            'subscription_past_due' => new SubscriptionPastDueMail(
                subscription: self::mockSubscription('Lanka Specialist Clinic', 0),
                clinicName: 'Lanka Specialist Clinic',
                isGrace: true,
                amount: 'LKR 15,000.00',
                payUrl: 'https://lankaspec.medvisit.lk/billing'
            ),

            'subscription_trial_ending_soon' => new TrialEndingSoonMail(
                tenant: self::mockTenant('medicare-jaffna', 'MediCare Jaffna'),
                user: self::mockUser('Dr. Tharmalingam', 'tharma@medicare.lk')
            ),

            'subscription_trial_ended' => new TrialEndedMail(
                tenant: self::mockTenant('medicare-jaffna', 'MediCare Jaffna'),
                user: self::mockUser('Dr. Tharmalingam', 'tharma@medicare.lk')
            ),

            'subscription_cancelled' => new SubscriptionCancelledMail(
                subscription: self::mockSubscription('Galle Family Clinic', 14),
                clinicName: 'Galle Family Clinic',
                accessUntil: Carbon::now()->addDays(14)->format('M d, Y'),
                resumeUrl: 'https://gallefam.medvisit.lk/billing',
                reason: 'Transitioning clinic branch location'
            ),

            'subscription_resumed' => new SubscriptionResumedMail(
                subscription: self::mockSubscription('Galle Family Clinic', 30),
                clinicName: 'Galle Family Clinic',
                billingUrl: 'https://gallefam.medvisit.lk/billing'
            ),

            'subscription_plan_changed' => new SubscriptionPlanChangedMail(
                subscription: self::mockSubscription('Matara Health Clinic', 30),
                clinicName: 'Matara Health Clinic',
                oldPlanName: 'MedVisit Essential',
                newPlanName: 'MedVisit Professional',
                changeType: 'Upgrade (Immediate)',
                effectiveDate: Carbon::now()->format('M d, Y'),
                amountCharged: 'LKR 5,000.00',
                billingUrl: 'https://matarahealth.medvisit.lk/billing'
            ),

            'subscription_template_downgrade_notice' => new TemplateDowngradeNoticeMail(
                tenant: self::mockTenant('suwa-shanthi', 'Suwashanthi Specialist Clinic'),
                template: WebsiteTemplate::where('tier', 'premium')->first() ?? new WebsiteTemplate([
                    'name' => 'Serene Medical Center',
                    'slug' => 'serene',
                    'price_cents' => 350000,
                ]),
                effectiveDateFormatted: Carbon::now()->addDays(7)->format('d F Y'),
                purchaseUrl: 'https://suwa-shanthi.medvisit.lk/website/templates?action=buy&template=serene',
                priceFormatted: 'Rs. 3,500'
            ),

            'platform_announcement' => new AnnouncementMail(
                announcement: new Announcement([
                    'title' => 'New Automated WhatsApp Queue Notifications Now Active!',
                    'type' => 'update',
                    'message' => '<p>We are excited to roll out <strong>automated WhatsApp reminders</strong> for all Sri Lankan clinics on MedVisit.</p><p>Patients will now receive instant channel notifications and live queue status updates directly on WhatsApp without manual staff intervention.</p>',
                    'cta_label' => 'Configure Messaging Channels',
                    'cta_url' => 'https://medvisit.lk/settings/messaging',
                ]),
                trackingCtaUrl: 'https://medvisit.lk/announcements/cta/sample-tracking-url',
                unsubscribeUrl: 'https://medvisit.lk/announcements/unsubscribe?email=clinic@medvisit.lk'
            ),

            'platform_lead_demo' => new LeadDemoRequestNotificationMail(
                lead: new Lead([
                    'clinic_name' => 'Kings Hospital Outpatient Department',
                    'contact_name' => 'Dr. Dilshan Samarasinghe',
                    'phone' => '070 129 1688',
                    'email' => 'dilshan@kingshospital.lk',
                    'city' => 'Colombo 05',
                    'notes' => 'We operate 4 OPD doctor channeling consultation rooms and would like to trial digital tokens.',
                ])
            ),

            'patient_booking_confirmation' => self::mockBookingMail(BookingConfirmationMail::class),

            'patient_booking_reminder' => self::mockBookingMail(BookingReminderMail::class),

            'patient_token_moved' => self::mockTokenMovedMail(),

            'patient_booking_cancelled' => self::mockBookingMail(BookingCancelledMail::class),

            'system_test_mail' => new TestMail(
                recipientEmail: 'admin@medvisit.lk',
                mailDriver: 'resend'
            ),

            default => new RegistrationVerificationCodeMail(code: '123456'),
        };
    }

    private static function mockTenant(string $subdomain, string $name): Tenant
    {
        $tenant = new Tenant([
            'id' => $subdomain,
            'name' => $name,
            'subdomain' => $subdomain,
            'address' => 'No. 120, Galle Road, Colombo 03, Sri Lanka',
            'phone' => '+94 11 257 8900',
            'trial_ends_at' => Carbon::now()->addDays(14),
        ]);

        return $tenant;
    }

    private static function mockUser(string $name, string $email): User
    {
        return new User([
            'name' => $name,
            'email' => $email,
        ]);
    }

    private static function mockSubscription(string $clinicName, int $daysLeft): Subscription
    {
        $tenant = self::mockTenant(strtolower(str_replace(' ', '-', $clinicName)), $clinicName);

        $plan = new Plan([
            'name' => 'MedVisit Professional',
            'price' => 1500000,
            'currency' => 'LKR',
        ]);

        $sub = new Subscription([
            'tenant_id' => $tenant->id,
            'current_period_end' => Carbon::now()->addDays($daysLeft),
        ]);

        $sub->setRelation('tenant', $tenant);
        $sub->setRelation('plan', $plan);

        return $sub;
    }

    private static function mockPaymentSuccessMail(): SubscriptionPaymentSuccessMail
    {
        $invoice = new SubscriptionInvoice([
            'invoice_number' => 'INV-2026-000042',
            'receipt_number' => 'REC-2026-000042',
            'amount' => 1500000,
            'tenant_id' => 'suwa-shanthi',
        ]);

        $sub = self::mockSubscription('Suwa Shanthi Clinic', 30);
        $invoice->setRelation('subscription', $sub);

        // Minimal mock PDF binary so attachment generator runs without failing
        $mockPdf = "%PDF-1.4\n1 0 obj\n<< /Title (Receipt) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";

        return new SubscriptionPaymentSuccessMail(
            invoice: $invoice,
            clinicName: 'Suwa Shanthi Medical Clinic',
            billingUrl: 'https://suwa-shanthi.medvisit.lk/settings/billing',
            pdfBinary: $mockPdf
        );
    }

    private static function mockBookingMail(string $mailClass): MedVisitMailable
    {
        $tenant = self::mockTenant('suwa-shanthi', 'Suwa Shanthi Family Clinic');
        $tenant->address = 'No. 45, Temple Road, Maharagama, Sri Lanka';
        $tenant->phone = '+94 11 285 4321';

        $doctor = new Doctor([
            'title' => 'Dr.',
            'name' => 'Kamal Jayawardena',
            'specialty' => 'Consultant Physician & Cardiologist',
        ]);

        $session = new DoctorSession([
            'session_date' => Carbon::now()->addDays(2),
            'start_time' => '17:00:00',
            'end_time' => '20:00:00',
            'room_number' => 'Consultation Suite 02 (Ground Floor)',
        ]);
        $session->setRelation('doctor', $doctor);

        $patient = new Patient([
            'name' => 'Mrs. Chandani Rathnayake',
            'phone' => '+94 71 987 6543',
        ]);

        $token = new BookingToken([
            'token_number' => 12,
            'estimated_time' => Carbon::now()->addDays(2)->setTime(17, 45),
            'tenant_id' => $tenant->id,
            'signed_cancel_token' => 'sample-signed-cancel-token-xyz',
            'cancellation_reason' => 'Patient requested postponement to next week',
        ]);
        $token->setRelation('doctorSession', $session);
        $token->setRelation('patient', $patient);

        if ($mailClass === BookingCancelledMail::class) {
            return new BookingCancelledMail($token, 'Doctor unavailable due to emergency hospital duty', $tenant, $tenant->name);
        }

        if ($mailClass === BookingReminderMail::class) {
            return new BookingReminderMail($token, $tenant, $tenant->name);
        }

        return new BookingConfirmationMail($token, $tenant, $tenant->name);
    }

    private static function mockTokenMovedMail(): BookingTokenMovedMail
    {
        $tenant = self::mockTenant('suwa-shanthi', 'Suwa Shanthi Family Clinic');
        $tenant->address = 'No. 45, Temple Road, Maharagama, Sri Lanka';
        $tenant->phone = '+94 11 285 4321';

        $doctor = new Doctor([
            'title' => 'Dr.',
            'name' => 'Kamal Jayawardena',
            'specialty' => 'Consultant Physician',
        ]);

        $session = new DoctorSession([
            'session_date' => Carbon::now()->addDays(1),
            'start_time' => '17:00:00',
            'end_time' => '20:00:00',
            'room_number' => 'Suite 02',
        ]);
        $session->setRelation('doctor', $doctor);

        $patient = new Patient([
            'name' => 'Mrs. Chandani Rathnayake',
        ]);

        $token = new BookingToken([
            'token_number' => 16,
            'estimated_time' => Carbon::now()->addDays(1)->setTime(18, 15),
            'tenant_id' => $tenant->id,
        ]);
        $token->setRelation('doctorSession', $session);
        $token->setRelation('patient', $patient);

        return new BookingTokenMovedMail($token, 12, 'Emergency surgical patient prioritized', $tenant, $tenant->name);
    }
}
