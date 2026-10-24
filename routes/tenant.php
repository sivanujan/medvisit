<?php

declare(strict_types=1);

use App\Http\Controllers\Api\ClinicAnnouncementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Support\SupportBroadcastAuthController;
use App\Http\Controllers\Support\SupportChatWidgetController;
use App\Http\Controllers\Tenant\BillingController;
use App\Http\Controllers\Tenant\BookingTokenController;
use App\Http\Controllers\Tenant\ChannelingCalendarController;
use App\Http\Controllers\Tenant\ClinicBrandingController;
use App\Http\Controllers\Tenant\ClinicPageController;
use App\Http\Controllers\Tenant\ClinicSettingsController;
use App\Http\Controllers\Tenant\ClinicShareImageController;
use App\Http\Controllers\Tenant\ClinicWebsiteController;
use App\Http\Controllers\Tenant\Doctor\ConsultationController;
use App\Http\Controllers\Tenant\Doctor\PrescriptionTemplateController;
use App\Http\Controllers\Tenant\DoctorController;
use App\Http\Controllers\Tenant\DoctorSettlementController;
use App\Http\Controllers\Tenant\FeeSettingsController;
use App\Http\Controllers\Tenant\LiveQueueTvController;
use App\Http\Controllers\Tenant\PatientController;
use App\Http\Controllers\Tenant\Pharmacy\DispenseController;
use App\Http\Controllers\Tenant\Pharmacy\StockController;
use App\Http\Controllers\Tenant\Pharmacy\StockImportController;
use App\Http\Controllers\Tenant\Pharmacy\StockReceiptController;
use App\Http\Controllers\Tenant\Pharmacy\SupplierController;
use App\Http\Controllers\Tenant\PublicBookingController;
use App\Http\Controllers\Tenant\Settings\BillingCenterController;
use App\Http\Controllers\Tenant\SiteKitController;
use App\Http\Controllers\Tenant\StaffController;
use App\Http\Controllers\Tenant\SubscriptionBillingController;
use App\Http\Controllers\Tenant\TenantAuthenticatedSessionController;
use App\Http\Controllers\Tenant\TenantDashboardController;
use App\Http\Controllers\Tenant\TenantImpersonationController;
use App\Http\Controllers\Tenant\TenantNewPasswordController;
use App\Http\Controllers\Tenant\TenantPasswordResetLinkController;
use App\Http\Controllers\Tenant\TenantSignedLoginController;
use App\Http\Controllers\Tenant\TenantSuspendedController;
use App\Http\Controllers\Tenant\TodayQueueController;
use App\Http\Controllers\Tenant\WorkspaceNotificationController;
use App\Http\Controllers\Tenant\WorkspaceSearchController;
use App\Http\Middleware\EnsurePublicBookingAvailable;
use App\Http\Middleware\EnsureSubscriptionActive;
use App\Http\Middleware\EnsureTenantIsActive;
use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Tenant routes are loaded by TenancyServiceProvider for all clinic subdomains.
|
*/

Route::middleware([
    'web',
    InitializeTenancyBySubdomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    // 1. Suspension & Expiration Notice Page
    Route::get('/clinic/suspended', [TenantSuspendedController::class, 'show'])
        ->name('tenant.suspended');

    // 1.1 Impersonation routes (consumed by Super Admin single-use token)
    Route::get('/impersonate/{token}', [TenantImpersonationController::class, 'enter'])
        ->name('tenant.impersonate');
    Route::match(['get', 'post'], '/impersonate/exit', [TenantImpersonationController::class, 'exit'])
        ->name('tenant.impersonate.exit');

    // 2. Tenant Public Landing & Public Online Booking
    Route::get('/', [ClinicWebsiteController::class, 'publicHome'])
        ->name('tenant.home');

    Route::get('/p/{slug}', [ClinicWebsiteController::class, 'publicPage'])
        ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')
        ->name('tenant.page');

    // 2. Tenant Public Landing & Calendly-Style Online Booking Flow
    Route::middleware([EnsurePublicBookingAvailable::class])->group(function () {
        Route::get('/book', [PublicBookingController::class, 'index'])
            ->name('tenant.book');

        Route::get('/book/api/availability/{slug}', [PublicBookingController::class, 'doctorMonthAvailability'])
            ->name('tenant.book.availability');

        Route::get('/book/confirmed/{signedToken}', [PublicBookingController::class, 'confirmed'])
            ->name('tenant.book.confirmed');

        Route::get('/book/ics/{signedToken}', [PublicBookingController::class, 'downloadIcs'])
            ->name('tenant.book.ics');

        Route::post('/book/cancel/{signedToken}', [PublicBookingController::class, 'cancel'])
            ->name('tenant.book.cancel');

        // Phone verification endpoints for online public booking
        Route::post('/book/verify/start', [PublicBookingController::class, 'startPhoneVerification'])
            ->middleware('throttle:15,1')
            ->name('tenant.book.verify.start');

        Route::get('/book/verify/status', [PublicBookingController::class, 'checkPhoneVerificationStatus'])
            ->middleware('throttle:60,1')
            ->name('tenant.book.verify.status');

        Route::post('/book/verify/check-code', [PublicBookingController::class, 'verifyPhoneCode'])
            ->middleware('throttle:20,1')
            ->name('tenant.book.verify.check_code');

        Route::get('/book/verify/check-remembered', [PublicBookingController::class, 'checkRememberedPhone'])
            ->middleware('throttle:60,1')
            ->name('tenant.book.verify.check_remembered');

        Route::get('/book/{slug}', [PublicBookingController::class, 'showDoctor'])
            ->name('tenant.book.doctor');

        Route::get('/book/{slug}/{session}', [PublicBookingController::class, 'showSession'])
            ->name('tenant.book.session');

        Route::post('/book', [PublicBookingController::class, 'store'])
            ->middleware('throttle:15,1')
            ->name('tenant.book.store');
    });

    Route::get('/queue', [ClinicWebsiteController::class, 'publicQueue'])
        ->name('tenant.queue.public');

    // Link-preview image (WhatsApp/Facebook) generated from the clinic's name and logo.
    Route::get('/share-image.png', [ClinicShareImageController::class, 'show'])
        ->name('tenant.share_image');

    Route::get('/tokens/{token}/status', [ClinicWebsiteController::class, 'publicTokenStatus'])
        ->name('tenant.token.status');

    Route::post('/tokens/{token}/cancel', [ClinicWebsiteController::class, 'cancelPublicToken'])
        ->name('tenant.token.cancel');

    // 3. Guest Auth Routes
    Route::middleware('guest')->group(function () {
        Route::get('/login', [TenantAuthenticatedSessionController::class, 'create'])
            ->name('tenant.login');

        Route::post('/login', [TenantAuthenticatedSessionController::class, 'store']);

        Route::get('/login/one-time', [TenantSignedLoginController::class, 'login'])
            ->name('tenant.login.one_time');

        Route::get('/forgot-password', [TenantPasswordResetLinkController::class, 'create'])
            ->name('tenant.password.request');

        Route::post('/forgot-password', [TenantPasswordResetLinkController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('tenant.password.email');

        Route::get('/reset-password/{token}', [TenantNewPasswordController::class, 'create'])
            ->name('tenant.password.reset');

        Route::post('/reset-password', [TenantNewPasswordController::class, 'store'])
            ->name('tenant.password.store');

        Route::get('/invitation/accept/{token}', [StaffController::class, 'showAcceptInvite'])
            ->name('tenant.invitation.accept');

        Route::post('/invitation/accept/{token}', [StaffController::class, 'acceptInvite'])
            ->name('tenant.invitation.store');
    });

    // 4. Authenticated & Active Tenant Routes
    Route::middleware(['auth', EnsureTenantIsActive::class, EnsureSubscriptionActive::class])->group(function () {
        // Clinic Subscription & Payments.lk Billing
        Route::get('/subscription/subscribe', [SubscriptionBillingController::class, 'subscribe'])
            ->name('tenant.subscription.subscribe');
        Route::post('/subscription/checkout', [SubscriptionBillingController::class, 'createCheckout'])
            ->name('tenant.subscription.checkout');
        Route::get('/subscription/return', [SubscriptionBillingController::class, 'return'])
            ->name('tenant.subscription.return');
        Route::get('/subscription/check-status', [SubscriptionBillingController::class, 'checkStatus'])
            ->name('tenant.subscription.check_status');
        Route::get('/subscription/inactive', [SubscriptionBillingController::class, 'inactive'])
            ->name('tenant.subscription.inactive');
        Route::get('/subscription', [SubscriptionBillingController::class, 'invoices'])
            ->name('tenant.subscription.index');
        Route::get('/subscription/invoices/{invoice}/receipt', [SubscriptionBillingController::class, 'receipt'])
            ->name('tenant.subscription.receipt');

        // URL aliases
        Route::get('/billing/subscribe', fn () => redirect()->route('tenant.subscription.subscribe'))
            ->name('tenant.billing.subscribe');
        Route::get('/billing/inactive', fn () => redirect()->route('tenant.subscription.inactive'))
            ->name('tenant.billing.inactive');

        // Clinic Settings -> Billing Center (Clinic Admin only)
        Route::prefix('settings/billing')->name('tenant.settings.billing')->group(function () {
            Route::get('/', [BillingCenterController::class, 'index']);
            Route::match(['post', 'put'], '/details', [BillingCenterController::class, 'updateBillingDetails'])->name('.details');
            Route::post('/cancel', [BillingCenterController::class, 'cancelSubscription'])->name('.cancel');
            Route::post('/resume', [BillingCenterController::class, 'resumeSubscription'])->name('.resume');
            Route::get('/change-plan', [BillingCenterController::class, 'changePlan'])->name('.change_plan');
            Route::post('/upgrade', [BillingCenterController::class, 'upgrade'])->name('.upgrade');
            Route::post('/downgrade', [BillingCenterController::class, 'downgrade'])->name('.downgrade');
            Route::post('/cancel-downgrade', [BillingCenterController::class, 'cancelDowngrade'])->name('.cancel_downgrade');
            Route::get('/invoices/{invoice}/download', [BillingCenterController::class, 'downloadInvoice'])->name('.invoice.download');
            Route::get('/invoices/{invoice}/view', [BillingCenterController::class, 'viewInvoice'])->name('.invoice.view');
            Route::post('/refund-preview', [BillingCenterController::class, 'previewRefundEligibility'])->name('.refund.preview');
            Route::post('/refunds', [BillingCenterController::class, 'requestRefund'])->name('.refund.store');
            Route::post('/refunds/{refundRequest}/cancel', [BillingCenterController::class, 'cancelRefund'])->name('.refund.cancel');
            Route::get('/refunds/{refundRequest}/credit-note', [BillingCenterController::class, 'downloadCreditNote'])->name('.refund.credit_note');
        });

        // Universal Clinical Routes (accessible to all authenticated staff: clinic_admin, doctor, receptionist)
        Route::get('/dashboard', [TenantDashboardController::class, 'index'])
            ->name('tenant.dashboard');

        Route::get('/sessions/today', [TodayQueueController::class, 'index'])
            ->name('tenant.sessions.today');
        Route::post('/sessions/today/{session}/call-next', [TodayQueueController::class, 'callNext'])
            ->name('tenant.sessions.today.call_next');
        Route::post('/sessions/today/{session}/recall', [TodayQueueController::class, 'recall'])
            ->name('tenant.sessions.today.recall');
        Route::post('/sessions/today/{session}/skip', [TodayQueueController::class, 'skip'])
            ->name('tenant.sessions.today.skip');
        Route::post('/sessions/today/{session}/start', [TodayQueueController::class, 'startConsultation'])
            ->name('tenant.sessions.today.start');
        Route::post('/sessions/today/{session}/complete', [TodayQueueController::class, 'completeConsultation'])
            ->name('tenant.sessions.today.complete');
        Route::post('/sessions/today/{session}/complete-and-next', [TodayQueueController::class, 'completeAndNext'])
            ->name('tenant.sessions.today.complete_and_next');
        Route::post('/sessions/today/{session}/pause', [TodayQueueController::class, 'pauseSession'])
            ->name('tenant.sessions.today.pause');
        Route::post('/sessions/today/{session}/resume', [TodayQueueController::class, 'resumeSession'])
            ->name('tenant.sessions.today.resume');
        Route::post('/sessions/today/{session}/end', [TodayQueueController::class, 'endSession'])
            ->name('tenant.sessions.today.end');
        Route::post('/sessions/today/{session}/delay', [TodayQueueController::class, 'delaySession'])
            ->name('tenant.sessions.today.delay');
        Route::post('/sessions/today/{session}/doctor-arrived', [TodayQueueController::class, 'doctorArrived'])
            ->name('tenant.sessions.today.doctor_arrived');
        Route::post('/sessions/today/{token}/check-in', [TodayQueueController::class, 'checkIn'])
            ->name('tenant.sessions.today.check_in');
        Route::post('/sessions/today/{token}/no-show', [TodayQueueController::class, 'noShow'])
            ->name('tenant.sessions.today.no_show');
        Route::post('/sessions/today/tokens/{token}/call', [TodayQueueController::class, 'callToken'])
            ->name('tenant.sessions.today.call_token');
        Route::post('/sessions/today/tokens/{token}/restore', [TodayQueueController::class, 'restoreToken'])
            ->name('tenant.sessions.today.restore_token');
        Route::post('/sessions/today/tokens/{token}/reorder', [TodayQueueController::class, 'reorderToken'])
            ->name('tenant.sessions.today.reorder_token');

        Route::get('/calendar', [ChannelingCalendarController::class, 'index'])
            ->name('tenant.calendar');
        Route::get('/calendar/roster/{session}', [ChannelingCalendarController::class, 'roster'])
            ->name('tenant.calendar.roster');
        Route::post('/calendar/sessions/{session}/cancel', [ChannelingCalendarController::class, 'cancelSession'])
            ->name('tenant.calendar.sessions.cancel');
        Route::post('/calendar/sessions/{session}/reschedule', [ChannelingCalendarController::class, 'rescheduleSession'])
            ->name('tenant.calendar.sessions.reschedule');
        Route::post('/calendar/sessions/{session}/update', [ChannelingCalendarController::class, 'updateSession'])
            ->name('tenant.calendar.sessions.update');
        Route::post('/calendar/sessions/{session}/duplicate', [ChannelingCalendarController::class, 'duplicateSession'])
            ->name('tenant.calendar.sessions.duplicate');

        Route::get('/patients', [PatientController::class, 'index'])
            ->name('tenant.patients');
        Route::post('/patients', [PatientController::class, 'store'])
            ->name('tenant.patients.store');
        Route::put('/patients/{patient}', [PatientController::class, 'update'])
            ->name('tenant.patients.update');
        Route::get('/patients/{patient}/history', [PatientController::class, 'history'])
            ->name('tenant.patients.history');
        Route::post('/patients/{patient}/reveal-nic', [PatientController::class, 'revealNic'])
            ->name('tenant.patients.reveal_nic');

        // Doctor Consultation & Prescriptions
        Route::get('/doctor/consultation/{token}', [ConsultationController::class, 'show'])
            ->name('tenant.doctor.consultation');
        Route::post('/doctor/consultation/{token}/draft', [ConsultationController::class, 'saveDraft'])
            ->name('tenant.doctor.consultation.draft');
        Route::post('/doctor/consultation/{token}/finalize', [ConsultationController::class, 'finalize'])
            ->name('tenant.doctor.consultation.finalize');
        Route::post('/doctor/consultation/{token}/cancel', [ConsultationController::class, 'cancel'])
            ->name('tenant.doctor.consultation.cancel');
        Route::post('/doctor/consultation/{token}/addendum', [ConsultationController::class, 'addendum'])
            ->name('tenant.doctor.consultation.addendum');
        Route::post('/doctor/consultation/{token}/repeat-last', [ConsultationController::class, 'repeatLast'])
            ->name('tenant.doctor.consultation.repeat_last');
        Route::get('/doctor/prescriptions/{prescription}/print', [ConsultationController::class, 'print'])
            ->name('tenant.doctor.prescriptions.print');
        Route::get('/doctor/patients/{patient}/history', [ConsultationController::class, 'patientHistory'])
            ->name('tenant.doctor.patients.history');

        // Prescription Templates
        Route::get('/doctor/templates', [PrescriptionTemplateController::class, 'index'])
            ->name('tenant.doctor.templates');
        Route::get('/prescription-templates', [PrescriptionTemplateController::class, 'index'])
            ->name('tenant.prescription_templates');
        Route::post('/doctor/templates', [PrescriptionTemplateController::class, 'store'])
            ->name('tenant.doctor.templates.store');
        Route::put('/doctor/templates/{template}', [PrescriptionTemplateController::class, 'update'])
            ->name('tenant.doctor.templates.update');
        Route::post('/doctor/templates/{template}/duplicate', [PrescriptionTemplateController::class, 'duplicate'])
            ->name('tenant.doctor.templates.duplicate');
        Route::post('/doctor/templates/{template}/toggle-share', [PrescriptionTemplateController::class, 'toggleShare'])
            ->name('tenant.doctor.templates.toggle_share');
        Route::post('/doctor/templates/{template}/apply', [PrescriptionTemplateController::class, 'recordUsage'])
            ->name('tenant.doctor.templates.apply');
        Route::delete('/doctor/templates/{template}', [PrescriptionTemplateController::class, 'destroy'])
            ->name('tenant.doctor.templates.destroy');

        Route::get('/queue/tv', [LiveQueueTvController::class, 'index'])
            ->name('tenant.queue.tv');
        Route::get('/queue/tv/data', [LiveQueueTvController::class, 'data'])
            ->name('tenant.queue.tv.data');

        // Global Search & Notification APIs
        Route::get('/api/search', [WorkspaceSearchController::class, 'search'])
            ->name('tenant.api.search');
        Route::get('/api/notifications', [WorkspaceNotificationController::class, 'index'])
            ->name('tenant.api.notifications');
        Route::get('/api/patients/search', [BookingTokenController::class, 'searchPatients'])
            ->name('tenant.api.patients.search');
        Route::get('/api/patients/by-phone', [BookingTokenController::class, 'findPatientByPhone'])
            ->name('tenant.api.patients.by_phone');

        // Broadcast Announcements APIs
        Route::get('/api/announcements/active-banners', [ClinicAnnouncementController::class, 'getActiveBanners'])
            ->name('tenant.api.announcements.active_banners');
        Route::post('/api/announcements/{id}/dismiss', [ClinicAnnouncementController::class, 'dismissBanner'])
            ->name('tenant.api.announcements.dismiss_banner');
        Route::get('/api/announcements/notifications', [ClinicAnnouncementController::class, 'getNotifications'])
            ->name('tenant.api.announcements.notifications');
        Route::post('/api/announcements/{id}/read', [ClinicAnnouncementController::class, 'markRead'])
            ->name('tenant.api.announcements.mark_read');
        Route::post('/api/announcements/mark-all-read', [ClinicAnnouncementController::class, 'markAllRead'])
            ->name('tenant.api.announcements.mark_all_read');

        // User Profile & Avatar
        Route::get('/profile', [ProfileController::class, 'edit'])
            ->name('tenant.profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])
            ->name('tenant.profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])
            ->name('tenant.profile.destroy');
        Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])
            ->name('tenant.profile.avatar.upload');
        Route::delete('/profile/avatar', [ProfileController::class, 'deleteAvatar'])
            ->name('tenant.profile.avatar.delete');

        // Doctor Settlements (accessible to doctor, receptionist, clinic_admin)
        Route::middleware(['role:clinic_admin|receptionist|doctor|super_admin'])->group(function () {
            Route::get('/billing/payouts', [DoctorSettlementController::class, 'index'])
                ->name('tenant.settlements');
            Route::get('/billing/payouts/slip/{settlement}', [DoctorSettlementController::class, 'slip'])
                ->name('tenant.settlements.slip');
            Route::get('/billing/payouts/session-bills/{session}', [DoctorSettlementController::class, 'sessionBills'])
                ->name('tenant.settlements.session_bills');
            Route::get('/billing/payouts/export', [DoctorSettlementController::class, 'export'])
                ->name('tenant.settlements.export');
        });

        // Operations routes: Receptionist & Clinic Admin (Doctor role restricted -> 403)
        Route::middleware(['role:clinic_admin|receptionist|super_admin'])->group(function () {
            Route::get('/bookings', [BookingTokenController::class, 'index'])
                ->name('tenant.bookings');
            Route::post('/bookings', [BookingTokenController::class, 'store'])
                ->name('tenant.bookings.store');
            Route::post('/bookings/{token}/cancel', [BookingTokenController::class, 'cancel'])
                ->name('tenant.bookings.cancel');
            Route::post('/bookings/{token}/move', [BookingTokenController::class, 'move'])
                ->name('tenant.bookings.move');
            Route::get('/doctors/{doctor}/available-sessions', [BookingTokenController::class, 'availableSessions'])
                ->name('tenant.doctors.available_sessions');

            Route::get('/doctors', [DoctorController::class, 'index'])
                ->name('tenant.doctors');
            Route::post('/doctors', [DoctorController::class, 'store'])
                ->name('tenant.doctors.store');
            Route::put('/doctors/{doctor}', [DoctorController::class, 'update'])
                ->name('tenant.doctors.update');
            Route::patch('/doctors/{doctor}/toggle', [DoctorController::class, 'toggleActive'])
                ->name('tenant.doctors.toggle');
            Route::delete('/doctors/{doctor}', [DoctorController::class, 'destroy'])
                ->name('tenant.doctors.destroy');
            Route::post('/doctors/{doctor}/photo', [DoctorController::class, 'uploadPhoto'])
                ->name('tenant.doctors.photo.upload');
            Route::delete('/doctors/{doctor}/photo', [DoctorController::class, 'deletePhoto'])
                ->name('tenant.doctors.photo.delete');

            Route::post('/doctors/templates', [DoctorController::class, 'storeTemplate'])
                ->name('tenant.doctors.templates.store');
            Route::put('/doctors/templates/{template}', [DoctorController::class, 'updateTemplate'])
                ->name('tenant.doctors.templates.update');
            Route::delete('/doctors/templates/{template}', [DoctorController::class, 'destroyTemplate'])
                ->name('tenant.doctors.templates.destroy');

            Route::post('/doctors/templates/{template}/duplicate', [DoctorController::class, 'duplicateTemplate'])
                ->name('tenant.doctors.templates.duplicate');

            Route::post('/doctors/sessions/one-off', [DoctorController::class, 'storeOneOffSession'])
                ->name('tenant.doctors.sessions.one_off');
            Route::post('/doctors/leaves', [DoctorController::class, 'storeLeave'])
                ->name('tenant.doctors.leaves.store');
            Route::post('/doctors/leaves/preview', [DoctorController::class, 'previewLeaveImpact'])
                ->name('tenant.doctors.leaves.preview');
            Route::delete('/doctors/leaves/{leave}', [DoctorController::class, 'destroyLeave'])
                ->name('tenant.doctors.leaves.destroy');
            Route::post('/doctors/generate-sessions', [DoctorController::class, 'generateSessions'])
                ->name('tenant.doctors.generate_sessions');
            Route::post('/doctors/generate-sessions/preview', [DoctorController::class, 'previewGenerateSessions'])
                ->name('tenant.doctors.generate_sessions.preview');

            Route::get('/billing', [BillingController::class, 'index'])
                ->name('tenant.billing');
            Route::get('/billing/export', [BillingController::class, 'export'])
                ->name('tenant.billing.export');
            Route::post('/billing/{bill}/pay', [BillingController::class, 'pay'])
                ->name('tenant.billing.pay');
            Route::post('/billing/{bill}/refund', [BillingController::class, 'refund'])
                ->name('tenant.billing.refund');
        });

        // Administration routes: Clinic Admin Only (Doctor & Receptionist restricted -> 403)
        Route::middleware(['role:clinic_admin|super_admin'])->group(function () {
            // Staff-only draft previews of public pages
            Route::get('/preview', [ClinicWebsiteController::class, 'previewHome'])
                ->name('tenant.preview');
            Route::get('/preview/p/{slug}', [ClinicWebsiteController::class, 'previewPage'])
                ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')
                ->name('tenant.preview.page');

            Route::post('/billing/payouts', [DoctorSettlementController::class, 'store'])
                ->name('tenant.settlements.store');
            Route::get('/billing/payouts/unsettled-bills/{doctor}', [DoctorSettlementController::class, 'unsettledBills'])
                ->name('tenant.settlements.unsettled_bills');
            Route::post('/billing/payouts/{settlement}/void', [DoctorSettlementController::class, 'void'])
                ->name('tenant.settlements.void');
            Route::post('/billing/payouts/disburse', [DoctorSettlementController::class, 'disburse'])
                ->name('tenant.settlements.disburse');
            Route::post('/billing/payouts/{settlement}/pay', [DoctorSettlementController::class, 'recordPayment'])
                ->name('tenant.settlements.pay');

            // Settings: Fees & Doctor Payouts
            Route::get('/settings/fees', [FeeSettingsController::class, 'index'])
                ->name('tenant.settings.fees');
            Route::put('/settings/fees/defaults', [FeeSettingsController::class, 'updateDefaults'])
                ->name('tenant.settings.fees.defaults');
            Route::post('/settings/fees/preset', [FeeSettingsController::class, 'applyPreset'])
                ->name('tenant.settings.fees.preset');
            Route::post('/settings/fees/components', [FeeSettingsController::class, 'storeComponent'])
                ->name('tenant.settings.fees.components.store');
            Route::put('/settings/fees/components/{component}', [FeeSettingsController::class, 'updateComponent'])
                ->name('tenant.settings.fees.components.update');
            Route::delete('/settings/fees/components/{component}', [FeeSettingsController::class, 'destroyComponent'])
                ->name('tenant.settings.fees.components.destroy');
            Route::post('/settings/fees/visit-types', [FeeSettingsController::class, 'storeVisitType'])
                ->name('tenant.settings.fees.visit_types.store');
            Route::put('/settings/fees/visit-types/{visitType}', [FeeSettingsController::class, 'updateVisitType'])
                ->name('tenant.settings.fees.visit_types.update');
            Route::delete('/settings/fees/visit-types/{visitType}', [FeeSettingsController::class, 'destroyVisitType'])
                ->name('tenant.settings.fees.visit_types.destroy');

            Route::get('/website', [ClinicWebsiteController::class, 'index'])
                ->name('tenant.website');
            Route::put('/website/sections', [ClinicWebsiteController::class, 'updateSections'])
                ->name('tenant.website.sections');
            Route::post('/website/publish', [ClinicWebsiteController::class, 'publish'])
                ->name('tenant.website.publish');
            Route::put('/website/theme', [ClinicWebsiteController::class, 'updateTheme'])
                ->name('tenant.website.theme');
            Route::put('/website/seo', [ClinicWebsiteController::class, 'updateSeo'])
                ->name('tenant.website.seo');
            Route::post('/website/pages/{page}/menu', [ClinicWebsiteController::class, 'togglePageMenu'])
                ->name('tenant.website.pages.menu');
            Route::get('/website/kit', [SiteKitController::class, 'show'])
                ->name('tenant.website.kit');
            Route::put('/website/kit', [SiteKitController::class, 'update'])
                ->name('tenant.website.kit.update');

            // Visual Page Builder & Media Library
            Route::get('/website/builder/media', [ClinicWebsiteController::class, 'listMedia'])
                ->name('tenant.website.builder.media');
            Route::post('/website/builder/media/upload', [ClinicWebsiteController::class, 'uploadMedia'])
                ->name('tenant.website.builder.media.upload');
            Route::delete('/website/builder/media/{asset}', [ClinicWebsiteController::class, 'deleteMedia'])
                ->name('tenant.website.builder.media.delete');
            Route::patch('/website/builder/media/{asset}', [ClinicWebsiteController::class, 'updateMedia'])
                ->name('tenant.website.builder.media.update');

            Route::get('/website/builder/{page?}', [ClinicWebsiteController::class, 'showBuilder'])
                ->whereNumber('page')
                ->name('tenant.website.builder');
            Route::post('/website/builder/{page}/save', [ClinicWebsiteController::class, 'saveBuilder'])
                ->whereNumber('page')
                ->name('tenant.website.builder.save');
            Route::post('/website/builder/{page}/publish', [ClinicWebsiteController::class, 'publishBuilder'])
                ->whereNumber('page')
                ->name('tenant.website.builder.publish');
            Route::get('/website/builder/{page}/revisions', [ClinicWebsiteController::class, 'listRevisions'])
                ->whereNumber('page')
                ->name('tenant.website.builder.revisions');
            Route::post('/website/builder/{page}/revert/{revision}', [ClinicWebsiteController::class, 'revertRevision'])
                ->whereNumber(['page', 'revision'])
                ->name('tenant.website.builder.revert');

            // Multi-page management (JSON API)
            Route::get('/website/pages', [ClinicPageController::class, 'index'])
                ->name('tenant.website.pages.index');
            Route::get('/website/pages/trash', [ClinicPageController::class, 'trash'])
                ->name('tenant.website.pages.trash');
            Route::post('/website/pages', [ClinicPageController::class, 'store'])
                ->name('tenant.website.pages.store');
            Route::post('/website/pages/{page}/duplicate', [ClinicPageController::class, 'duplicate'])
                ->name('tenant.website.pages.duplicate');
            Route::patch('/website/pages/{page}', [ClinicPageController::class, 'update'])
                ->name('tenant.website.pages.update');
            Route::delete('/website/pages/{page}', [ClinicPageController::class, 'destroy'])
                ->name('tenant.website.pages.destroy');
            Route::post('/website/pages/{pageId}/restore', [ClinicPageController::class, 'restore'])
                ->name('tenant.website.pages.restore');
            Route::post('/website/pages/{page}/homepage', [ClinicPageController::class, 'homepage'])
                ->name('tenant.website.pages.homepage');

            Route::get('/staff', [StaffController::class, 'index'])
                ->name('tenant.staff');
            Route::post('/staff/invite', [StaffController::class, 'invite'])
                ->name('tenant.staff.invite');
            Route::post('/staff/invitations/{invitation}/resend', [StaffController::class, 'resendInvite'])
                ->name('tenant.staff.invitations.resend');
            Route::delete('/staff/invitations/{invitation}', [StaffController::class, 'revokeInvite'])
                ->name('tenant.staff.invitations.revoke');
            Route::patch('/staff/{user}/toggle', [StaffController::class, 'toggleStatus'])
                ->name('tenant.staff.toggle');
            Route::put('/staff/{user}/role', [StaffController::class, 'updateRole'])
                ->name('tenant.staff.role');
            Route::post('/staff/{user}/link-doctor', [StaffController::class, 'linkDoctor'])
                ->name('tenant.staff.link_doctor');
            Route::post('/staff/{user}/unlink-doctor', [StaffController::class, 'unlinkDoctor'])
                ->name('tenant.staff.unlink_doctor');
            Route::post('/staff/{user}/reset-password', [StaffController::class, 'sendPasswordReset'])
                ->name('tenant.staff.reset_password');

            Route::get('/settings', [ClinicSettingsController::class, 'index'])
                ->name('tenant.settings');
            Route::get('/settings/audit/export', [ClinicSettingsController::class, 'exportAuditLogs'])
                ->name('tenant.settings.audit.export');
            Route::get('/settings/{section}', [ClinicSettingsController::class, 'index'])
                ->where('section', 'profile|branding|hours|sessions|booking|prescriptions|billing|receipts|pharmacy|directory|audit')
                ->name('tenant.settings.section');
            Route::put('/settings/profile', [ClinicSettingsController::class, 'updateProfile'])
                ->name('tenant.settings.profile');
            Route::put('/settings/session-defaults', [ClinicSettingsController::class, 'updateSessionDefaults'])
                ->name('tenant.settings.session_defaults');
            Route::put('/settings/billing', [ClinicSettingsController::class, 'updateBillingSettings'])
                ->name('tenant.settings.billing_rules');
            Route::put('/settings/online-booking', [ClinicSettingsController::class, 'updateOnlineBooking'])
                ->name('tenant.settings.online_booking');
            Route::put('/settings/pharmacy', [ClinicSettingsController::class, 'updatePharmacySettings'])
                ->name('tenant.settings.pharmacy');
            Route::put('/settings/directory', [ClinicSettingsController::class, 'updateDirectory'])
                ->name('tenant.settings.directory');
            Route::post('/settings/branding/logo', [ClinicBrandingController::class, 'uploadLogo'])
                ->name('tenant.settings.branding.logo.upload');
            Route::delete('/settings/branding/logo', [ClinicBrandingController::class, 'deleteLogo'])
                ->name('tenant.settings.branding.logo.delete');
        });

        // 5. Pharmacy & Inventory Module (Requires pharmacy.enabled)
        Route::middleware(['pharmacy.enabled'])->group(function () {
            // View / Search Medicines & Receipts
            Route::middleware(['permission:pharmacy.view'])->group(function () {
                Route::get('/pharmacy/medicines', [StockController::class, 'index'])
                    ->name('tenant.pharmacy.medicines');
                Route::get('/pharmacy/medicines/{medicine}', [StockController::class, 'show'])
                    ->name('tenant.pharmacy.medicines.show');
                Route::get('/pharmacy/receipts', [StockReceiptController::class, 'index'])
                    ->name('tenant.pharmacy.receipts');
                Route::get('/pharmacy/receipts/{receipt}', [StockReceiptController::class, 'show'])
                    ->whereNumber('receipt')
                    ->name('tenant.pharmacy.receipts.show');
                Route::get('/pharmacy/catalog/search', [StockController::class, 'searchCatalog'])
                    ->name('tenant.pharmacy.catalog.search');
                Route::get('/pharmacy/barcodes/{code}', [StockReceiptController::class, 'lookupBarcode'])
                    ->name('tenant.pharmacy.barcodes.lookup');
                Route::get('/pharmacy/variants/{variant}/brands', [StockReceiptController::class, 'getVariantBrands'])
                    ->name('tenant.pharmacy.variants.brands');
                Route::get('/pharmacy/medicines-export', [StockController::class, 'export'])
                    ->name('tenant.pharmacy.medicines.export');
                Route::get('/pharmacy/receipts-export', [StockReceiptController::class, 'export'])
                    ->name('tenant.pharmacy.receipts.export');
            });

            // Stock Adjustments & Voiding
            Route::middleware(['permission:pharmacy.adjust_stock'])->group(function () {
                Route::post('/pharmacy/stock/adjust', [StockController::class, 'adjust'])
                    ->name('tenant.pharmacy.stock.adjust');
                Route::post('/pharmacy/batches/{batch}/void', [StockController::class, 'voidBatch'])
                    ->name('tenant.pharmacy.batches.void');
                Route::post('/pharmacy/receipts/{receipt}/void', [StockReceiptController::class, 'voidReceipt'])
                    ->whereNumber('receipt')
                    ->name('tenant.pharmacy.receipts.void');
            });

            // Manage Medicines in Stock & Link Barcodes
            Route::post('/pharmacy/barcodes/link', [StockReceiptController::class, 'linkBarcode'])
                ->middleware(['permission:pharmacy.manage_medicines|pharmacy.receive_stock'])
                ->name('tenant.pharmacy.barcodes.link');

            Route::middleware(['permission:pharmacy.manage_medicines'])->group(function () {
                Route::post('/pharmacy/medicines', [StockController::class, 'store'])
                    ->name('tenant.pharmacy.medicines.store');
                Route::post('/pharmacy/medicines/merge', [StockController::class, 'merge'])
                    ->name('tenant.pharmacy.medicines.merge');
                Route::post('/pharmacy/medicines/dismiss-duplicate', [StockController::class, 'dismissDuplicate'])
                    ->name('tenant.pharmacy.medicines.dismiss_duplicate');
                Route::put('/pharmacy/medicines/{medicine}', [StockController::class, 'update'])
                    ->name('tenant.pharmacy.medicines.update');
                Route::delete('/pharmacy/medicines/{medicine}', [StockController::class, 'destroy'])
                    ->name('tenant.pharmacy.medicines.destroy');
                Route::put('/pharmacy/batches/{batch}', [StockController::class, 'updateBatch'])
                    ->name('tenant.pharmacy.batches.update');
                Route::post('/pharmacy/medicines/{medicine}/batches', [StockController::class, 'addBatches'])
                    ->name('tenant.pharmacy.medicines.batches.store');
                Route::patch('/pharmacy/medicines/{medicine}/toggle', [StockController::class, 'toggleActive'])
                    ->name('tenant.pharmacy.medicines.toggle');
            });

            // Receive Stock (GRN)
            Route::middleware(['permission:pharmacy.receive_stock'])->group(function () {
                Route::get('/pharmacy/receipts/create', [StockReceiptController::class, 'create'])
                    ->name('tenant.pharmacy.receipts.create');
                Route::post('/pharmacy/receipts', [StockReceiptController::class, 'store'])
                    ->name('tenant.pharmacy.receipts.store');
            });

            // Suppliers Management
            Route::middleware(['permission:pharmacy.manage_suppliers'])->group(function () {
                Route::get('/pharmacy/suppliers', [SupplierController::class, 'index'])
                    ->name('tenant.pharmacy.suppliers');
                Route::post('/pharmacy/suppliers/check-duplicate', [SupplierController::class, 'checkDuplicate'])
                    ->name('tenant.pharmacy.suppliers.check-duplicate');
                Route::get('/pharmacy/suppliers/{supplier}', [SupplierController::class, 'show'])
                    ->name('tenant.pharmacy.suppliers.show');
                Route::post('/pharmacy/suppliers', [SupplierController::class, 'store'])
                    ->name('tenant.pharmacy.suppliers.store');
                Route::put('/pharmacy/suppliers/{supplier}', [SupplierController::class, 'update'])
                    ->name('tenant.pharmacy.suppliers.update');
                Route::patch('/pharmacy/suppliers/{supplier}/toggle', [SupplierController::class, 'toggle'])
                    ->name('tenant.pharmacy.suppliers.toggle');
                Route::delete('/pharmacy/suppliers/{supplier}', [SupplierController::class, 'destroy'])
                    ->name('tenant.pharmacy.suppliers.destroy');
            });

            // Bulk CSV Import
            Route::middleware(['permission:pharmacy.import'])->group(function () {
                Route::get('/pharmacy/import', [StockImportController::class, 'index'])
                    ->name('tenant.pharmacy.import');
                Route::get('/pharmacy/import/template', [StockImportController::class, 'downloadTemplate'])
                    ->name('tenant.pharmacy.import.template');
                Route::get('/pharmacy/import/history', [StockImportController::class, 'history'])
                    ->name('tenant.pharmacy.import.history');
                Route::post('/pharmacy/import/preview', [StockImportController::class, 'preview'])
                    ->name('tenant.pharmacy.import.preview');
                Route::post('/pharmacy/import/confirm', [StockImportController::class, 'confirm'])
                    ->name('tenant.pharmacy.import.confirm');
            });

            // Dispensing
            Route::middleware(['permission:pharmacy.dispense|pharmacy.view'])->group(function () {
                Route::get('/pharmacy/dispense', [DispenseController::class, 'index'])
                    ->name('tenant.pharmacy.dispense');
                Route::get('/pharmacy/dispense/history', [DispenseController::class, 'history'])
                    ->name('tenant.pharmacy.dispense.history');
                Route::get('/pharmacy/dispense/{prescription}', [DispenseController::class, 'show'])
                    ->name('tenant.pharmacy.dispense.show');
            });

            Route::middleware(['permission:pharmacy.dispense'])->group(function () {
                Route::post('/pharmacy/dispense/{prescription}/lock', [DispenseController::class, 'lock'])
                    ->name('tenant.pharmacy.dispense.lock');
                Route::post('/pharmacy/dispense/{prescription}/unlock', [DispenseController::class, 'unlock'])
                    ->name('tenant.pharmacy.dispense.unlock');
                Route::post('/pharmacy/dispense/{prescription}/hold', [DispenseController::class, 'hold'])
                    ->name('tenant.pharmacy.dispense.hold');
                Route::post('/pharmacy/dispense/{prescription}/confirm', [DispenseController::class, 'confirm'])
                    ->name('tenant.pharmacy.dispense.confirm');
                Route::post('/pharmacy/dispense/{prescription}/undo', [DispenseController::class, 'undo'])
                    ->name('tenant.pharmacy.dispense.undo');
            });
        });

        // Legacy / shortcut redirects
        Route::get('/reception', fn () => redirect()->route('tenant.bookings'))
            ->name('tenant.reception.index');

        Route::get('/doctor', fn () => redirect()->route('tenant.sessions.today'))
            ->name('tenant.doctor.index');

        // MedVisit Support Chat Widget API & Broadcasting Auth on Tenant Subdomain
        Route::get('/support/status', [SupportChatWidgetController::class, 'status'])
            ->name('tenant.support.status');
        Route::post('/support/conversations', [SupportChatWidgetController::class, 'store'])
            ->name('tenant.support.conversations.store');
        Route::get('/support/conversations/{publicId}', [SupportChatWidgetController::class, 'show'])
            ->name('tenant.support.conversations.show');
        Route::post('/support/conversations/{publicId}/messages', [SupportChatWidgetController::class, 'sendMessage'])
            ->name('tenant.support.conversations.messages.send');
        Route::post('/support/conversations/{publicId}/read', [SupportChatWidgetController::class, 'markRead'])
            ->name('tenant.support.conversations.read');
        Route::post('/support/conversations/{publicId}/typing', [SupportChatWidgetController::class, 'typing'])
            ->name('tenant.support.conversations.typing');
        Route::post('/support/conversations/{publicId}/close', [SupportChatWidgetController::class, 'close'])
            ->name('tenant.support.conversations.close');
        Route::post('/support/broadcasting/auth', [SupportBroadcastAuthController::class, 'authenticate'])
            ->name('tenant.support.broadcasting.auth');

        Route::post('/logout', [TenantAuthenticatedSessionController::class, 'destroy'])
            ->name('tenant.logout');
    });
});
