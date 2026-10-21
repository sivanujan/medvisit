<?php

use App\Http\Controllers\Api\ClinicAnnouncementController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicLegalController;
use App\Http\Controllers\SuperAdmin\AdminUserController;
use App\Http\Controllers\SuperAdmin\AnnouncementManagementController;
use App\Http\Controllers\SuperAdmin\ClinicManagementController;
use App\Http\Controllers\SuperAdmin\EmailPreviewController;
use App\Http\Controllers\SuperAdmin\LeadManagementController;
use App\Http\Controllers\SuperAdmin\MedicineCatalogController;
use App\Http\Controllers\SuperAdmin\MessagingUsageController;
use App\Http\Controllers\SuperAdmin\OtpAnalyticsController;
use App\Http\Controllers\SuperAdmin\PlanManagementController;
use App\Http\Controllers\SuperAdmin\PlatformAuditLogController;
use App\Http\Controllers\SuperAdmin\PlatformDashboardController;
use App\Http\Controllers\SuperAdmin\PlatformSettingsController;
use App\Http\Controllers\SuperAdmin\SubscriptionManagementController;
use App\Http\Controllers\SuperAdmin\SystemHealthController;
use App\Http\Controllers\Webhooks\PaymentsLkWebhookController;
use App\Http\Controllers\Webhooks\WhatsAppWebhookController;
use App\Models\Tenant;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Central Routes (Marketing site, signup, super-admin)
|--------------------------------------------------------------------------
|
| Central routes are served only on central domains (e.g. medvisit.test, localhost).
| Tenant domains and subdomains (e.g. demo.medvisit.test) are served via routes/tenant.php.
|
*/

Route::domain('{central_domain}')
    ->whereIn('central_domain', config('tenancy.central_domains', [
        config('medvisit.base_domain', 'medvisit.localhost'),
        'medvisit.localhost',
        'localhost',
        '127.0.0.1',
    ]))
    ->group(function () {
        Route::get('/', function () {
            return Inertia::render('Welcome', [
                'isCentral' => true,
                'canLogin' => Route::has('login'),
                'canRegister' => Route::has('register'),
                'laravelVersion' => Application::VERSION,
                'phpVersion' => PHP_VERSION,
            ]);
        })->name('home');

        // Public Pricing & Legal Pages (Payment Gateway Compliance & Merchant Review)
        Route::get('/pricing', [PublicLegalController::class, 'pricing'])->name('pricing');
        Route::get('/terms', [PublicLegalController::class, 'terms'])->name('terms');
        Route::get('/refund-policy', [PublicLegalController::class, 'refundPolicy'])->name('refund_policy');
        Route::get('/dispute-policy', [PublicLegalController::class, 'disputePolicy'])->name('dispute_policy');
        Route::get('/privacy-policy', [PublicLegalController::class, 'privacyPolicy'])->name('privacy_policy');

        Route::get('/dashboard', function () {
            $user = auth()->user();
            if ($user?->hasRole('super_admin')) {
                return redirect()->route('super_admin.dashboard');
            }
            if ($user?->tenant_id) {
                $tenant = $user->tenant ?? Tenant::find($user->tenant_id);
                if ($tenant) {
                    return redirect()->away($tenant->url('/dashboard'));
                }
            }

            return redirect()->route('home');
        })->middleware(['auth', 'verified'])->name('dashboard');

        if (app()->environment('local', 'testing')) {
            Route::get('/dev/components', function () {
                return Inertia::render('Dev/Components');
            })->name('dev.components');
        }

        Route::middleware('auth')->group(function () {
            Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
            Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
            Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
            Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])->name('profile.avatar.upload');
            Route::delete('/profile/avatar', [ProfileController::class, 'deleteAvatar'])->name('profile.avatar.delete');

            Route::get('/reception', function () {
                return Inertia::render('Dashboard', ['view' => 'reception']);
            })->name('reception.index');

            Route::get('/doctor', function () {
                return Inertia::render('Dashboard', ['view' => 'doctor']);
            })->name('doctor.index');

            Route::get('/super-admin/otp-usage', [OtpAnalyticsController::class, 'index'])
                ->name('super_admin.otp_usage');

            // Super Admin Platform Dashboard & Management
            Route::middleware(['role:super_admin'])->group(function () {
                // Platform Dashboard
                Route::get('/super-admin', [PlatformDashboardController::class, 'index'])
                    ->name('super_admin.dashboard');
                Route::get('/super-admin/dashboard', [PlatformDashboardController::class, 'index']);

                // Clinics Management
                Route::get('/super-admin/clinics', [ClinicManagementController::class, 'index'])
                    ->name('super_admin.clinics.index');
                Route::get('/super-admin/clinics/{clinicId}', [ClinicManagementController::class, 'show'])
                    ->name('super_admin.clinics.show');
                Route::post('/super-admin/clinics/{clinicId}/suspend', [ClinicManagementController::class, 'suspend'])
                    ->name('super_admin.clinics.suspend');
                Route::post('/super-admin/clinics/{clinicId}/reactivate', [ClinicManagementController::class, 'reactivate'])
                    ->name('super_admin.clinics.reactivate');
                Route::post('/super-admin/clinics/{clinicId}/extend-trial', [ClinicManagementController::class, 'extendTrial'])
                    ->name('super_admin.clinics.extend_trial');
                Route::post('/super-admin/clinics/{clinicId}/reset-password', [ClinicManagementController::class, 'sendPasswordResetLink'])
                    ->name('super_admin.clinics.reset_password');
                Route::post('/super-admin/clinics/{clinicId}/impersonate', [ClinicManagementController::class, 'impersonate'])
                    ->name('super_admin.clinics.impersonate');
                Route::post('/super-admin/clinics/{clinicId}/notes', [ClinicManagementController::class, 'storeNote'])
                    ->name('super_admin.clinics.notes.store');
                Route::post('/super-admin/clinics/{clinicId}/export', [ClinicManagementController::class, 'requestDataExport'])
                    ->name('super_admin.clinics.export');
                Route::get('/super-admin/clinics/exports/{export}/download', [ClinicManagementController::class, 'downloadExport'])
                    ->name('super_admin.clinics.export.download');
                Route::post('/super-admin/clinics/{clinicId}/restore', [ClinicManagementController::class, 'restore'])
                    ->name('super_admin.clinics.restore');
                Route::delete('/super-admin/clinics/{clinicId}', [ClinicManagementController::class, 'destroy'])
                    ->name('super_admin.clinics.destroy');

                // Plans Management
                Route::get('/super-admin/plans', [PlanManagementController::class, 'index'])
                    ->name('super_admin.plans.index');
                Route::post('/super-admin/plans', [PlanManagementController::class, 'store'])
                    ->name('super_admin.plans.store');
                Route::put('/super-admin/plans/{plan}', [PlanManagementController::class, 'update'])
                    ->name('super_admin.plans.update');
                Route::post('/super-admin/plans/{plan}/toggle-active', [PlanManagementController::class, 'toggleActive'])
                    ->name('super_admin.plans.toggle_active');
                Route::delete('/super-admin/plans/{plan}', [PlanManagementController::class, 'destroy'])
                    ->name('super_admin.plans.destroy');

                // Leads & Demos CRM
                Route::get('/super-admin/leads', [LeadManagementController::class, 'index'])
                    ->name('super_admin.leads.index');
                Route::post('/super-admin/leads', [LeadManagementController::class, 'store'])
                    ->name('super_admin.leads.store');
                Route::put('/super-admin/leads/{lead}', [LeadManagementController::class, 'update'])
                    ->name('super_admin.leads.update');
                Route::patch('/super-admin/leads/{lead}/stage', [LeadManagementController::class, 'updateStage'])
                    ->name('super_admin.leads.stage');
                Route::post('/super-admin/leads/{lead}/convert', [LeadManagementController::class, 'convertToClinic'])
                    ->name('super_admin.leads.convert');
                Route::delete('/super-admin/leads/{lead}', [LeadManagementController::class, 'destroy'])
                    ->name('super_admin.leads.destroy');

                // Global Medicine Catalog & Review Queue
                Route::get('/super-admin/medicines', [MedicineCatalogController::class, 'index'])
                    ->name('super_admin.medicines');
                Route::post('/super-admin/medicines/rxterms/search', [MedicineCatalogController::class, 'searchRxTerms'])
                    ->name('super_admin.medicines.rxterms.search');
                Route::post('/super-admin/medicines/rxterms/import', [MedicineCatalogController::class, 'importRxTerms'])
                    ->name('super_admin.medicines.rxterms.import');
                Route::post('/super-admin/medicines/review/{type}/{id}/approve', [MedicineCatalogController::class, 'approve'])
                    ->name('super_admin.medicines.review.approve');
                Route::post('/super-admin/medicines/review/{type}/{id}/reject', [MedicineCatalogController::class, 'reject'])
                    ->name('super_admin.medicines.review.reject');
                Route::post('/super-admin/medicines/review/merge', [MedicineCatalogController::class, 'merge'])
                    ->name('super_admin.medicines.review.merge');
                Route::delete('/super-admin/medicines/{medicine}', [MedicineCatalogController::class, 'destroy'])
                    ->name('super_admin.medicines.destroy');

                // Clinic Subscriptions & Payments
                Route::get('/super-admin/subscriptions', [SubscriptionManagementController::class, 'index'])
                    ->name('super_admin.subscriptions');
                Route::post('/super-admin/subscriptions/invoices/{invoice}/mark-paid', [SubscriptionManagementController::class, 'markPaid'])
                    ->name('super_admin.subscriptions.mark_paid');
                Route::post('/super-admin/subscriptions/invoices/{invoice}/remind', [SubscriptionManagementController::class, 'sendPaymentReminder'])
                    ->name('super_admin.subscriptions.remind');
                Route::post('/super-admin/subscriptions/{subscription}/toggle-comp', [SubscriptionManagementController::class, 'toggleComp'])
                    ->name('super_admin.subscriptions.toggle_comp');
                Route::post('/super-admin/subscriptions/{subscription}/extend', [SubscriptionManagementController::class, 'extendPeriod'])
                    ->name('super_admin.subscriptions.extend');

                // Announcements (Broadcasts)
                Route::get('/super-admin/announcements', [AnnouncementManagementController::class, 'index'])
                    ->name('super_admin.announcements.index');
                Route::post('/super-admin/announcements', [AnnouncementManagementController::class, 'store'])
                    ->name('super_admin.announcements.store');
                Route::post('/super-admin/announcements/audience-count', [AnnouncementManagementController::class, 'audienceCount'])
                    ->name('super_admin.announcements.audience_count');
                Route::post('/super-admin/announcements/test-send', [AnnouncementManagementController::class, 'sendTest'])
                    ->name('super_admin.announcements.test_send');
                Route::get('/super-admin/announcements/{id}', [AnnouncementManagementController::class, 'show'])
                    ->name('super_admin.announcements.show');
                Route::put('/super-admin/announcements/{id}', [AnnouncementManagementController::class, 'update'])
                    ->name('super_admin.announcements.update');
                Route::post('/super-admin/announcements/{id}/cancel', [AnnouncementManagementController::class, 'cancel'])
                    ->name('super_admin.announcements.cancel');
                Route::post('/super-admin/announcements/{id}/duplicate', [AnnouncementManagementController::class, 'duplicate'])
                    ->name('super_admin.announcements.duplicate');
                Route::get('/super-admin/announcements/{id}/export', [AnnouncementManagementController::class, 'export'])
                    ->name('super_admin.announcements.export');
                Route::delete('/super-admin/announcements/{id}', [AnnouncementManagementController::class, 'destroy'])
                    ->name('super_admin.announcements.destroy');

                // Messaging Usage (Replaces OTP usage)
                Route::get('/super-admin/messaging', [MessagingUsageController::class, 'index'])
                    ->name('super_admin.messaging.index');

                // System Health & Queue
                Route::get('/super-admin/system-health', [SystemHealthController::class, 'index'])
                    ->name('super_admin.system_health.index');
                Route::post('/super-admin/system-health/failed-jobs/{id}/retry', [SystemHealthController::class, 'retryJob'])
                    ->name('super_admin.system_health.retry_job');
                Route::delete('/super-admin/system-health/failed-jobs/{id}', [SystemHealthController::class, 'deleteJob'])
                    ->name('super_admin.system_health.delete_job');
                Route::post('/super-admin/system-health/failed-jobs/retry-all', [SystemHealthController::class, 'retryAll'])
                    ->name('super_admin.system_health.retry_all');
                Route::post('/super-admin/system-health/failed-jobs/flush-all', [SystemHealthController::class, 'flushAll'])
                    ->name('super_admin.system_health.flush_all');
                Route::post('/super-admin/system-health/run-command', [SystemHealthController::class, 'runCommand'])
                    ->name('super_admin.system_health.run_command');

                // Platform Audit Log
                Route::get('/super-admin/audit-logs', [PlatformAuditLogController::class, 'index'])
                    ->name('super_admin.audit_logs.index');
                Route::get('/super-admin/audit-logs/export', [PlatformAuditLogController::class, 'export'])
                    ->name('super_admin.audit_logs.export');

                // Platform Settings
                Route::get('/super-admin/settings', [PlatformSettingsController::class, 'index'])
                    ->name('super_admin.settings.index');
                Route::put('/super-admin/settings', [PlatformSettingsController::class, 'update'])
                    ->name('super_admin.settings.update');

                // Admin Users & 2FA
                Route::get('/super-admin/admins', [AdminUserController::class, 'index'])
                    ->name('super_admin.admins.index');
                Route::post('/super-admin/admins/invite', [AdminUserController::class, 'invite'])
                    ->name('super_admin.admins.invite');
                Route::delete('/super-admin/admins/invitations/{id}', [AdminUserController::class, 'revokeInvite'])
                    ->name('super_admin.admins.revoke_invite');
                Route::post('/super-admin/admins/{id}/deactivate', [AdminUserController::class, 'deactivate'])
                    ->name('super_admin.admins.deactivate');
                Route::post('/super-admin/admins/{id}/reactivate', [AdminUserController::class, 'reactivate'])
                    ->name('super_admin.admins.reactivate');
                Route::get('/super-admin/admins/2fa/setup', [AdminUserController::class, 'getTwoFactorSetup'])
                    ->name('super_admin.admins.2fa_setup');
                Route::post('/super-admin/admins/2fa/confirm', [AdminUserController::class, 'confirmTwoFactor'])
                    ->name('super_admin.admins.2fa_confirm');
                Route::post('/super-admin/admins/2fa/recovery-codes', [AdminUserController::class, 'regenerateRecoveryCodes'])
                    ->name('super_admin.admins.2fa_recovery_codes');
                Route::post('/super-admin/admins/2fa/disable', [AdminUserController::class, 'disableTwoFactor'])
                    ->name('super_admin.admins.2fa_disable');
                Route::post('/super-admin/admins/sessions/logout-others', [AdminUserController::class, 'logoutOtherSessions'])
                    ->name('super_admin.admins.logout_other_sessions');

                // Email Templates Preview & Testing
                Route::get('/super-admin/email-previews', [EmailPreviewController::class, 'index'])
                    ->name('super_admin.email_previews.index');
                Route::get('/super-admin/email-previews/render', [EmailPreviewController::class, 'renderPreview'])
                    ->name('super_admin.email_previews.render');
                Route::post('/super-admin/email-previews/send-test', [EmailPreviewController::class, 'sendTest'])
                    ->name('super_admin.email_previews.send_test');
            });
        });

        // 2FA Challenge & Public Announcement CTA
        Route::get('/two-factor-challenge', [TwoFactorChallengeController::class, 'create'])
            ->name('two-factor.challenge');
        Route::post('/two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
            ->name('two-factor.challenge.store');

        Route::get('/announcements/cta/{recipient}', [ClinicAnnouncementController::class, 'trackCtaClick'])
            ->name('announcements.cta');

        // Central/fallback API for banners & notifications
        Route::get('/api/announcements/active-banners', [ClinicAnnouncementController::class, 'getActiveBanners'])
            ->name('announcements.active_banners');
        Route::post('/api/announcements/{id}/dismiss', [ClinicAnnouncementController::class, 'dismissBanner'])
            ->name('announcements.dismiss_banner');
        Route::get('/api/announcements/notifications', [ClinicAnnouncementController::class, 'getNotifications'])
            ->name('announcements.notifications');
        Route::post('/api/announcements/{id}/read', [ClinicAnnouncementController::class, 'markRead'])
            ->name('announcements.mark_read');
        Route::post('/api/announcements/mark-all-read', [ClinicAnnouncementController::class, 'markAllRead'])
            ->name('announcements.mark_all_read');

        require __DIR__.'/auth.php';
    });

// WhatsApp Cloud API Webhook (Central domain & Cloudflare quick tunnels, no CSRF, no tenancy identification)
Route::get('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify'])
    ->name('webhooks.whatsapp.verify');
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle'])
    ->name('webhooks.whatsapp.handle');

// Payments.lk Hosted Checkout Webhook (External gateway callbacks, no CSRF, no tenancy identification)
Route::post('/webhooks/paymentslk', [PaymentsLkWebhookController::class, 'handle'])
    ->name('webhooks.paymentslk');
