<?php

use App\Http\Controllers\Api\ClinicAnnouncementController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicDemoController;
use App\Http\Controllers\PublicDirectoryController;
use App\Http\Controllers\PublicLegalController;
use App\Http\Controllers\PublicTemplateShowcaseController;
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
use App\Http\Controllers\SuperAdmin\PlatformIncidentController;
use App\Http\Controllers\SuperAdmin\PlatformSettingsController;
use App\Http\Controllers\SuperAdmin\RefundManagementController;
use App\Http\Controllers\SuperAdmin\SubscriptionManagementController;
use App\Http\Controllers\SuperAdmin\SupportInboxController;
use App\Http\Controllers\SuperAdmin\SystemHealthController;
use App\Http\Controllers\SuperAdmin\TemplateManagementController;
use App\Http\Controllers\Support\SupportBroadcastAuthController;
use App\Http\Controllers\Support\SupportChatWidgetController;
use App\Http\Controllers\Webhooks\PaymentsLkWebhookController;
use App\Http\Controllers\Webhooks\WhatsAppWebhookController;
use App\Models\Tenant;
use App\Models\TvPairingCode;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
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
        'medvisit.test',
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

        // Public Interactive Demo Hub (/demo)
        Route::get('/demo', [PublicDemoController::class, 'index'])->name('public.demo');
        Route::post('/demo/start', [PublicDemoController::class, 'launch'])->name('public.demo.launch');

        // Public Pricing & Legal Pages (Payment Gateway Compliance & Merchant Review)
        Route::get('/pricing', [PublicLegalController::class, 'pricing'])->name('pricing');
        Route::get('/templates', [PublicTemplateShowcaseController::class, 'index'])->name('templates.index');
        Route::get('/templates/{slug}/demo-preview', [PublicTemplateShowcaseController::class, 'demoPreview'])->name('templates.demo-preview');
        Route::get('/terms', [PublicLegalController::class, 'terms'])->name('terms');
        Route::get('/refund-policy', [PublicLegalController::class, 'refundPolicy'])->name('refund_policy');
        Route::get('/dispute-policy', [PublicLegalController::class, 'disputePolicy'])->name('dispute_policy');
        Route::get('/privacy-policy', [PublicLegalController::class, 'privacyPolicy'])->name('privacy_policy');

        // Public Clinic & Doctor Directory
        Route::get('/find', [PublicDirectoryController::class, 'index'])->name('public.directory.index');
        Route::get('/clinics/{slug}', [PublicDirectoryController::class, 'showClinic'])->name('public.directory.clinic');
        Route::get('/doctors/{clinicSlug}/{doctorSlug}', [PublicDirectoryController::class, 'showDoctor'])->name('public.directory.doctor');
        Route::get('/sitemap.xml', [PublicDirectoryController::class, 'sitemap'])->name('public.directory.sitemap');

        // Central TV Pairing redirect helper
        Route::get('/tv', function (Request $request) {
            return Inertia::render('Queue/CentralTvPairing', [
                'prefillCode' => (string) $request->query('code', ''),
            ]);
        })->name('central.tv');

        Route::post('/tv/resolve-code', function (Request $request) {
            $code = trim((string) $request->input('code'));
            $pairing = TvPairingCode::where('code', $code)
                ->where('expires_at', '>', now())
                ->whereNull('used_at')
                ->first();

            if (! $pairing) {
                return response()->json([
                    'message' => 'Invalid or expired pairing code. Please check the code on your clinic dashboard.',
                ], 422);
            }

            $tenant = Tenant::find($pairing->tenant_id);
            if (! $tenant) {
                return response()->json(['message' => 'Associated clinic not found.'], 404);
            }

            $scheme = config('app.env') === 'production' ? 'https://' : 'http://';
            $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
            $host = $tenant->subdomain.'.'.$baseDomain;
            $redirectUrl = $scheme.$host.'/queue/tv?code='.$code;

            return response()->json([
                'success' => true,
                'clinic_name' => $tenant->name,
                'redirect_url' => $redirectUrl,
            ]);
        })->middleware('throttle:30,1')->name('central.tv.resolve');

        // MedVisit Support Chat Widget API & Guest Broadcasting Auth
        Route::get('/support/status', [SupportChatWidgetController::class, 'status'])->name('support.status');
        Route::post('/support/conversations', [SupportChatWidgetController::class, 'store'])->name('support.conversations.store');
        Route::get('/support/conversations/{publicId}', [SupportChatWidgetController::class, 'show'])->name('support.conversations.show');
        Route::post('/support/conversations/{publicId}/messages', [SupportChatWidgetController::class, 'sendMessage'])->name('support.conversations.messages.send');
        Route::post('/support/conversations/{publicId}/read', [SupportChatWidgetController::class, 'markRead'])->name('support.conversations.read');
        Route::post('/support/conversations/{publicId}/typing', [SupportChatWidgetController::class, 'typing'])->name('support.conversations.typing');
        Route::post('/support/conversations/{publicId}/close', [SupportChatWidgetController::class, 'close'])->name('support.conversations.close');
        Route::post('/support/broadcasting/auth', [SupportBroadcastAuthController::class, 'authenticate'])->name('support.broadcasting.auth');

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
                Route::post('/super-admin/leads/reset-demo', [LeadManagementController::class, 'resetDemo'])
                    ->name('super_admin.leads.reset_demo');

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

                // Refund Requests Management
                Route::get('/super-admin/refunds', [RefundManagementController::class, 'index'])
                    ->name('super_admin.refunds.index');
                Route::get('/super-admin/refunds/{refundRequest}', [RefundManagementController::class, 'show'])
                    ->name('super_admin.refunds.show');
                Route::post('/super-admin/refunds/{refundRequest}/recheck', [RefundManagementController::class, 'recheck'])
                    ->name('super_admin.refunds.recheck');
                Route::post('/super-admin/refunds/{refundRequest}/approve', [RefundManagementController::class, 'approve'])
                    ->name('super_admin.refunds.approve');
                Route::post('/super-admin/refunds/{refundRequest}/reject', [RefundManagementController::class, 'reject'])
                    ->name('super_admin.refunds.reject');
                Route::post('/super-admin/refunds/{refundRequest}/process', [RefundManagementController::class, 'process'])
                    ->name('super_admin.refunds.process');
                Route::get('/super-admin/refunds/{refundRequest}/credit-note', [RefundManagementController::class, 'downloadCreditNote'])
                    ->name('super_admin.refunds.credit_note');

                // Platform Incidents & Downtime Management
                Route::get('/super-admin/incidents', [PlatformIncidentController::class, 'index'])
                    ->name('super_admin.incidents.index');
                Route::post('/super-admin/incidents', [PlatformIncidentController::class, 'store'])
                    ->name('super_admin.incidents.store');
                Route::put('/super-admin/incidents/{incident}', [PlatformIncidentController::class, 'update'])
                    ->name('super_admin.incidents.update');
                Route::delete('/super-admin/incidents/{incident}', [PlatformIncidentController::class, 'destroy'])
                    ->name('super_admin.incidents.destroy');

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

                // Website Template Marketplace Management & Sales
                Route::get('/super-admin/templates', [TemplateManagementController::class, 'index'])
                    ->name('super_admin.templates.index');
                Route::put('/super-admin/templates/settings', [TemplateManagementController::class, 'updateSettings'])
                    ->name('super_admin.templates.settings');
                Route::put('/super-admin/templates/{template}', [TemplateManagementController::class, 'update'])
                    ->name('super_admin.templates.update');
                Route::get('/super-admin/template-sales', [TemplateManagementController::class, 'sales'])
                    ->name('super_admin.template_sales.index');
                Route::get('/super-admin/template-sales/export', [TemplateManagementController::class, 'exportSalesCsv'])
                    ->name('super_admin.template_sales.export');
                Route::post('/super-admin/clinics/{clinicId}/template-entitlement', [TemplateManagementController::class, 'overrideClinicEntitlement'])
                    ->name('super_admin.clinics.template_entitlement');

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

                // Support Chat Inbox & Management
                Route::get('/super-admin/support', [SupportInboxController::class, 'index'])
                    ->name('super_admin.support.index');
                Route::post('/super-admin/support/conversations/{publicId}/reply', [SupportInboxController::class, 'reply'])
                    ->name('super_admin.support.reply');
                Route::post('/super-admin/support/conversations/{publicId}/take-over', [SupportInboxController::class, 'takeOver'])
                    ->name('super_admin.support.take_over');
                Route::post('/super-admin/support/conversations/{publicId}/return-ai', [SupportInboxController::class, 'returnToAi'])
                    ->name('super_admin.support.return_ai');
                Route::post('/super-admin/support/conversations/{publicId}/close', [SupportInboxController::class, 'close'])
                    ->name('super_admin.support.close');
                Route::post('/super-admin/support/canned-replies', [SupportInboxController::class, 'storeCannedReply'])
                    ->name('super_admin.support.canned_replies.store');
                Route::put('/super-admin/support/canned-replies/{reply}', [SupportInboxController::class, 'updateCannedReply'])
                    ->name('super_admin.support.canned_replies.update');
                Route::delete('/super-admin/support/canned-replies/{reply}', [SupportInboxController::class, 'destroyCannedReply'])
                    ->name('super_admin.support.canned_replies.destroy');
                Route::post('/super-admin/support/settings', [SupportInboxController::class, 'updateSettings'])
                    ->name('super_admin.support.settings.update');
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
        if (app()->environment('local')) {
            Route::get('/dev/preview/register-success', function () {
                return Inertia::render('Auth/RegisterClinicSuccess', [
                    'registration' => [
                        'clinic_name' => 'Apex Family Health',
                        'subdomain' => 'apexfamily',
                        'clinic_url' => 'http://apexfamily.medvisit.test',
                        'admin_name' => 'Dr. Samantha Perera',
                        'admin_email' => 'samantha@apexfamily.lk',
                        'admin_phone' => '0771234567',
                        'admin_role' => 'Clinic Admin',
                        'login_url' => '/dev/preview/subscribe',
                    ],
                ]);
            })->name('dev.preview.register-success');

            Route::get('/dev/preview/subscribe', function () {
                $configPlans = config('medvisit_public.plans', []);
                $plans = [
                    [
                        'slug' => 'basic',
                        'name' => 'Basic',
                        'price_cents' => (int) ($configPlans['basic']['price_cents'] ?? 700000),
                        'features' => (array) ($configPlans['basic']['features'] ?? []),
                        'recommended' => false,
                    ],
                    [
                        'slug' => 'pro',
                        'name' => 'Pro',
                        'price_cents' => (int) ($configPlans['pro']['price_cents'] ?? 900000),
                        'features' => (array) ($configPlans['pro']['features'] ?? []),
                        'recommended' => true,
                    ],
                    [
                        'slug' => 'advanced',
                        'name' => 'Advanced',
                        'price_cents' => (int) ($configPlans['advanced']['price_cents'] ?? 1500000),
                        'features' => (array) ($configPlans['advanced']['features'] ?? []),
                        'recommended' => false,
                    ],
                ];

                $sharedFeatures = [
                    'Online appointments & channeling schedules',
                    'Token numbers & live queue',
                    'Live Queue TV Display',
                    'Patient records & consultation history',
                    'Prescriptions & dispensing / medicine catalog',
                    'Fees & payouts calculation',
                    'Dedicated email & WhatsApp support',
                    'Automatic daily cloud backups',
                ];

                return Inertia::render('Subscription/Subscribe', [
                    'tenant' => [
                        'id' => 'preview-clinic',
                        'name' => 'Apex Family Health',
                        'subdomain' => 'apexfamily',
                        'plan' => 'pro',
                        'phone' => '070 129 1688',
                    ],
                    'currentPlan' => 'pro',
                    'plans' => $plans,
                    'sharedFeatures' => $sharedFeatures,
                    'renewalDate' => now()->addMonth()->format('F j, Y'),
                    'termsVersion' => '2026-10-v1',
                    'legalConsentText' => 'I agree to the MedVisit Terms of Service and Privacy Policy. I authorize MedVisit to charge the chosen plan amount monthly until cancelled.',
                    'pendingInvoice' => null,
                    'statusParam' => request()->query('status'),
                ]);
            })->name('dev.preview.subscribe');

            Route::get('/dev/preview/dashboard', function () {
                $isSetup = request()->query('mode') === 'setup';

                if ($isSetup) {
                    return Inertia::render('Dashboard', [
                        'isSetupMode' => true,
                        'isClinicAdmin' => true,
                        'isDoctor' => false,
                        'isReceptionist' => false,
                        'canViewMoney' => true,
                        'stats' => [
                            'patients_today' => 0,
                            'patients_sparkline' => [0, 0, 0, 0, 0, 0, 0],
                            'patients_trend' => 0,
                            'waiting_now' => 0,
                            'sessions_today' => 0,
                            'sessions_sparkline' => [0, 0, 0, 0, 0, 0, 0],
                            'sessions_trend' => 0,
                            'collections_today' => 0,
                            'collections_sparkline' => [0, 0, 0, 0, 0, 0, 0],
                            'collections_trend' => 0,
                        ],
                        'todaySessions' => [],
                        'runningSessions' => [],
                        'timelineSessions' => [],
                        'upcomingSessions' => [],
                        'alerts' => [],
                        'setupChecklist' => [
                            [
                                'step' => 1,
                                'title' => 'Add your doctors & channeling hours',
                                'description' => 'Add at least one doctor profile and set their weekly channeling schedule so patients can book.',
                                'action_label' => 'Add doctors & schedules',
                                'action_url' => '/doctors',
                                'completed' => true,
                                'current' => false,
                            ],
                            [
                                'step' => 2,
                                'title' => 'Setup consultation & clinic fees',
                                'description' => 'Define your doctor consultation fee, clinic facility charge, and visit types.',
                                'action_label' => 'Configure fees',
                                'action_url' => '/settings/fees',
                                'completed' => true,
                                'current' => false,
                            ],
                            [
                                'step' => 3,
                                'title' => 'Publish your online booking website',
                                'description' => 'Customize your clinic hero banner, about section, contact info, and hit Publish.',
                                'action_label' => 'Open website builder',
                                'action_url' => '/website',
                                'completed' => false,
                                'current' => true,
                            ],
                            [
                                'step' => 4,
                                'title' => 'Test your patient booking link',
                                'description' => 'Visit apexfamily.medvisit.lk to preview how patients will discover and book doctors online.',
                                'action_label' => 'Open public booking link',
                                'action_url' => 'http://apexfamily.medvisit.lk',
                                'completed' => false,
                                'current' => false,
                            ],
                            [
                                'step' => 5,
                                'title' => 'Issue your first clinic token',
                                'description' => 'Walk through issuing a walk-in token at reception to see the live queue and TV display in action.',
                                'action_label' => 'Issue test token',
                                'action_url' => '/bookings',
                                'completed' => false,
                                'current' => false,
                            ],
                        ],
                        'setupDismissed' => false,
                    ]);
                }

                return Inertia::render('Dashboard', [
                    'isSetupMode' => false,
                    'isClinicAdmin' => true,
                    'isDoctor' => false,
                    'isReceptionist' => false,
                    'canViewMoney' => true,
                    'stats' => [
                        'patients_today' => 42,
                        'patients_sparkline' => [18, 24, 30, 28, 35, 38, 42],
                        'patients_trend' => 10.5,
                        'waiting_now' => 8,
                        'sessions_today' => 4,
                        'sessions_sparkline' => [2, 3, 3, 4, 3, 4, 4],
                        'sessions_trend' => 0,
                        'collections_today' => 128500,
                        'collections_sparkline' => [45000, 60000, 78000, 92000, 85000, 110000, 128500],
                        'collections_trend' => 16.8,
                    ],
                    'todaySessions' => [
                        [
                            'id' => 1,
                            'doctor_name' => 'Dr. Samantha Perera',
                            'specialty' => 'Cardiologist',
                            'start_time' => '08:30 AM',
                            'end_time' => '12:00 PM',
                            'room' => 'Consultation Room 1',
                            'status' => 'in_progress',
                            'tokens_count' => 18,
                            'waiting_count' => 5,
                        ],
                        [
                            'id' => 2,
                            'doctor_name' => 'Dr. Rohan De Silva',
                            'specialty' => 'Pediatrician',
                            'start_time' => '10:00 AM',
                            'end_time' => '01:30 PM',
                            'room' => 'Consultation Room 2',
                            'status' => 'in_progress',
                            'tokens_count' => 12,
                            'waiting_count' => 3,
                        ],
                        [
                            'id' => 3,
                            'doctor_name' => 'Dr. Nimal Jayawardena',
                            'specialty' => 'Dermatologist',
                            'start_time' => '02:00 PM',
                            'end_time' => '05:30 PM',
                            'room' => 'Consultation Room 1',
                            'status' => 'scheduled',
                            'tokens_count' => 8,
                            'waiting_count' => 0,
                        ],
                        [
                            'id' => 4,
                            'doctor_name' => 'Dr. Samantha Perera',
                            'specialty' => 'Cardiologist',
                            'start_time' => '05:30 PM',
                            'end_time' => '08:30 PM',
                            'room' => 'Consultation Room 3',
                            'status' => 'scheduled',
                            'tokens_count' => 14,
                            'waiting_count' => 0,
                        ],
                    ],
                    'runningSessions' => [
                        [
                            'id' => 1,
                            'doctor_name' => 'Dr. Samantha Perera',
                            'specialty' => 'Cardiologist',
                            'room' => 'Room 1',
                            'start_time' => '08:30 AM',
                            'end_time' => '12:00 PM',
                            'nowServing' => 9,
                            'nextInLine' => [10, 11, 12],
                            'waitingCount' => 5,
                            'completedCount' => 8,
                            'estimatedWaitMinutes' => 25,
                        ],
                        [
                            'id' => 2,
                            'doctor_name' => 'Dr. Rohan De Silva',
                            'specialty' => 'Pediatrician',
                            'room' => 'Room 2',
                            'start_time' => '10:00 AM',
                            'end_time' => '01:30 PM',
                            'nowServing' => 4,
                            'nextInLine' => [5, 6, 7],
                            'waitingCount' => 3,
                            'completedCount' => 3,
                            'estimatedWaitMinutes' => 15,
                        ],
                    ],
                    'timelineSessions' => [
                        [
                            'id' => 1,
                            'doctor_name' => 'Dr. Samantha Perera',
                            'specialty' => 'Cardiologist',
                            'start_time' => '08:30',
                            'end_time' => '12:00',
                            'start_minutes' => 510,
                            'end_minutes' => 720,
                            'status' => 'in_progress',
                            'tokens_count' => 18,
                            'room' => 'Room 1',
                        ],
                        [
                            'id' => 2,
                            'doctor_name' => 'Dr. Rohan De Silva',
                            'specialty' => 'Pediatrician',
                            'start_time' => '10:00',
                            'end_time' => '13:30',
                            'start_minutes' => 600,
                            'end_minutes' => 810,
                            'status' => 'in_progress',
                            'tokens_count' => 12,
                            'room' => 'Room 2',
                        ],
                        [
                            'id' => 3,
                            'doctor_name' => 'Dr. Nimal Jayawardena',
                            'specialty' => 'Dermatologist',
                            'start_time' => '14:00',
                            'end_time' => '17:30',
                            'start_minutes' => 840,
                            'end_minutes' => 1050,
                            'status' => 'scheduled',
                            'tokens_count' => 8,
                            'room' => 'Room 1',
                        ],
                        [
                            'id' => 4,
                            'doctor_name' => 'Dr. Samantha Perera',
                            'specialty' => 'Cardiologist',
                            'start_time' => '17:30',
                            'end_time' => '20:30',
                            'start_minutes' => 1050,
                            'end_minutes' => 1230,
                            'status' => 'scheduled',
                            'tokens_count' => 14,
                            'room' => 'Room 3',
                        ],
                    ],
                    'upcomingSessions' => [
                        [
                            'id' => 101,
                            'doctor_name' => 'Dr. Samantha Perera',
                            'specialty' => 'Cardiologist',
                            'session_date' => now()->addDay()->format('Y-m-d'),
                            'day_name' => now()->addDay()->format('l'),
                            'date_formatted' => now()->addDay()->format('D, M j'),
                            'start_time' => '08:30 AM',
                            'end_time' => '12:00 PM',
                            'tokens_count' => 11,
                        ],
                        [
                            'id' => 102,
                            'doctor_name' => 'Dr. Nimal Jayawardena',
                            'specialty' => 'Dermatologist',
                            'session_date' => now()->addDay()->format('Y-m-d'),
                            'day_name' => now()->addDay()->format('l'),
                            'date_formatted' => now()->addDay()->format('D, M j'),
                            'start_time' => '02:00 PM',
                            'end_time' => '05:30 PM',
                            'tokens_count' => 6,
                        ],
                        [
                            'id' => 103,
                            'doctor_name' => 'Dr. Anoma Senanayake',
                            'specialty' => 'Gynecologist',
                            'session_date' => now()->addDays(2)->format('Y-m-d'),
                            'day_name' => now()->addDays(2)->format('l'),
                            'date_formatted' => now()->addDays(2)->format('D, M j'),
                            'start_time' => '09:00 AM',
                            'end_time' => '12:00 PM',
                            'tokens_count' => 9,
                        ],
                    ],
                    'alerts' => [
                        [
                            'type' => 'warning',
                            'title' => 'Session starting in 35 mins with 0 bookings',
                            'message' => 'Dr. Nimal Jayawardena (Dermatologist) session starts at 02:00 PM and has no confirmed tokens yet.',
                            'action_label' => 'View Channeling Calendar',
                            'action_url' => '/calendar',
                        ],
                    ],
                    'setupChecklist' => [],
                    'setupDismissed' => true,
                ]);
            })->name('dev.preview.dashboard');
        }

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
