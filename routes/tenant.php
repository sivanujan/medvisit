<?php

declare(strict_types=1);

use App\Http\Controllers\Tenant\BillingController;
use App\Http\Controllers\Tenant\BookingTokenController;
use App\Http\Controllers\Tenant\ChannelingCalendarController;
use App\Http\Controllers\Tenant\ClinicSettingsController;
use App\Http\Controllers\Tenant\ClinicWebsiteController;
use App\Http\Controllers\Tenant\DoctorController;
use App\Http\Controllers\Tenant\DoctorSettlementController;
use App\Http\Controllers\Tenant\FeeSettingsController;
use App\Http\Controllers\Tenant\LiveQueueTvController;
use App\Http\Controllers\Tenant\PatientController;
use App\Http\Controllers\Tenant\PublicBookingController;
use App\Http\Controllers\Tenant\StaffController;
use App\Http\Controllers\Tenant\TenantAuthenticatedSessionController;
use App\Http\Controllers\Tenant\TenantDashboardController;
use App\Http\Controllers\Tenant\TenantNewPasswordController;
use App\Http\Controllers\Tenant\TenantPasswordResetLinkController;
use App\Http\Controllers\Tenant\TenantSignedLoginController;
use App\Http\Controllers\Tenant\TenantSuspendedController;
use App\Http\Controllers\Tenant\TodayQueueController;
use App\Http\Controllers\Tenant\WorkspaceNotificationController;
use App\Http\Controllers\Tenant\WorkspaceSearchController;
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

    // 2. Tenant Public Landing & Public Online Booking
    Route::get('/', [ClinicWebsiteController::class, 'publicHome'])
        ->name('tenant.home');

    Route::get('/preview', [ClinicWebsiteController::class, 'previewHome'])
        ->name('tenant.preview');

    // 2. Tenant Public Landing & Calendly-Style Online Booking Flow
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

    Route::get('/book/{slug}', [PublicBookingController::class, 'showDoctor'])
        ->name('tenant.book.doctor');

    Route::get('/book/{slug}/{session}', [PublicBookingController::class, 'showSession'])
        ->name('tenant.book.session');

    Route::post('/book', [PublicBookingController::class, 'store'])
        ->middleware('throttle:15,1')
        ->name('tenant.book.store');

    Route::get('/queue', [ClinicWebsiteController::class, 'publicQueue'])
        ->name('tenant.queue.public');

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
    Route::middleware(['auth', EnsureTenantIsActive::class])->group(function () {
        // Universal Clinical Routes (accessible to all authenticated staff: clinic_admin, doctor, receptionist)
        Route::get('/dashboard', [TenantDashboardController::class, 'index'])
            ->name('tenant.dashboard');

        Route::get('/sessions/today', [TodayQueueController::class, 'index'])
            ->name('tenant.sessions.today');
        Route::post('/sessions/today/{session}/call-next', [TodayQueueController::class, 'callNext'])
            ->name('tenant.sessions.today.call_next');
        Route::post('/sessions/today/{session}/recall', [TodayQueueController::class, 'recall'])
            ->name('tenant.sessions.today.recall');
        Route::post('/sessions/today/{session}/start', [TodayQueueController::class, 'startConsultation'])
            ->name('tenant.sessions.today.start');
        Route::post('/sessions/today/{session}/complete', [TodayQueueController::class, 'completeConsultation'])
            ->name('tenant.sessions.today.complete');
        Route::post('/sessions/today/{session}/complete-and-next', [TodayQueueController::class, 'completeAndNext'])
            ->name('tenant.sessions.today.complete_and_next');
        Route::post('/sessions/today/{token}/check-in', [TodayQueueController::class, 'checkIn'])
            ->name('tenant.sessions.today.check_in');
        Route::post('/sessions/today/{token}/no-show', [TodayQueueController::class, 'noShow'])
            ->name('tenant.sessions.today.no_show');

        Route::get('/calendar', [ChannelingCalendarController::class, 'index'])
            ->name('tenant.calendar');
        Route::get('/calendar/roster/{session}', [ChannelingCalendarController::class, 'roster'])
            ->name('tenant.calendar.roster');
        Route::post('/calendar/sessions/{session}/cancel', [ChannelingCalendarController::class, 'cancelSession'])
            ->name('tenant.calendar.sessions.cancel');
        Route::post('/calendar/sessions/{session}/reschedule', [ChannelingCalendarController::class, 'rescheduleSession'])
            ->name('tenant.calendar.sessions.reschedule');

        Route::get('/patients', [PatientController::class, 'index'])
            ->name('tenant.patients');
        Route::post('/patients', [PatientController::class, 'store'])
            ->name('tenant.patients.store');
        Route::put('/patients/{patient}', [PatientController::class, 'update'])
            ->name('tenant.patients.update');
        Route::get('/patients/{patient}/history', [PatientController::class, 'history'])
            ->name('tenant.patients.history');

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

        // Doctor Settlements (accessible to doctor, receptionist, clinic_admin)
        Route::middleware(['role:clinic_admin|receptionist|doctor|super_admin'])->group(function () {
            Route::get('/billing/payouts', [DoctorSettlementController::class, 'index'])
                ->name('tenant.settlements');
            Route::get('/billing/payouts/slip/{settlement}', [DoctorSettlementController::class, 'slip'])
                ->name('tenant.settlements.slip');
        });

        // Operations routes: Receptionist & Clinic Admin (Doctor role restricted -> 403)
        Route::middleware(['role:clinic_admin|receptionist|super_admin'])->group(function () {
            Route::get('/bookings', [BookingTokenController::class, 'index'])
                ->name('tenant.bookings');
            Route::post('/bookings', [BookingTokenController::class, 'store'])
                ->name('tenant.bookings.store');
            Route::post('/bookings/{token}/cancel', [BookingTokenController::class, 'cancel'])
                ->name('tenant.bookings.cancel');

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

            Route::post('/doctors/templates', [DoctorController::class, 'storeTemplate'])
                ->name('tenant.doctors.templates.store');
            Route::put('/doctors/templates/{template}', [DoctorController::class, 'updateTemplate'])
                ->name('tenant.doctors.templates.update');
            Route::delete('/doctors/templates/{template}', [DoctorController::class, 'destroyTemplate'])
                ->name('tenant.doctors.templates.destroy');

            Route::post('/doctors/sessions/one-off', [DoctorController::class, 'storeOneOffSession'])
                ->name('tenant.doctors.sessions.one_off');
            Route::post('/doctors/leaves', [DoctorController::class, 'storeLeave'])
                ->name('tenant.doctors.leaves.store');
            Route::delete('/doctors/leaves/{leave}', [DoctorController::class, 'destroyLeave'])
                ->name('tenant.doctors.leaves.destroy');
            Route::post('/doctors/generate-sessions', [DoctorController::class, 'generateSessions'])
                ->name('tenant.doctors.generate_sessions');

            Route::get('/billing', [BillingController::class, 'index'])
                ->name('tenant.billing');
            Route::post('/billing/{bill}/pay', [BillingController::class, 'pay'])
                ->name('tenant.billing.pay');
            Route::post('/billing/{bill}/refund', [BillingController::class, 'refund'])
                ->name('tenant.billing.refund');
        });

        // Administration routes: Clinic Admin Only (Doctor & Receptionist restricted -> 403)
        Route::middleware(['role:clinic_admin|super_admin'])->group(function () {
            Route::post('/billing/payouts', [DoctorSettlementController::class, 'store'])
                ->name('tenant.settlements.store');
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

            // Visual Page Builder & Media Library
            Route::get('/website/builder', [ClinicWebsiteController::class, 'showBuilder'])
                ->name('tenant.website.builder');
            Route::post('/website/builder/save', [ClinicWebsiteController::class, 'saveBuilder'])
                ->name('tenant.website.builder.save');
            Route::post('/website/builder/publish', [ClinicWebsiteController::class, 'publishBuilder'])
                ->name('tenant.website.builder.publish');
            Route::post('/website/builder/revert/{revision}', [ClinicWebsiteController::class, 'revertRevision'])
                ->name('tenant.website.builder.revert');
            Route::get('/website/builder/revisions', [ClinicWebsiteController::class, 'listRevisions'])
                ->name('tenant.website.builder.revisions');
            Route::get('/website/builder/media', [ClinicWebsiteController::class, 'listMedia'])
                ->name('tenant.website.builder.media');
            Route::post('/website/builder/media/upload', [ClinicWebsiteController::class, 'uploadMedia'])
                ->name('tenant.website.builder.media.upload');
            Route::delete('/website/builder/media/{asset}', [ClinicWebsiteController::class, 'deleteMedia'])
                ->name('tenant.website.builder.media.delete');
            Route::patch('/website/builder/media/{asset}', [ClinicWebsiteController::class, 'updateMedia'])
                ->name('tenant.website.builder.media.update');

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

            Route::get('/settings', [ClinicSettingsController::class, 'index'])
                ->name('tenant.settings');
            Route::put('/settings/profile', [ClinicSettingsController::class, 'updateProfile'])
                ->name('tenant.settings.profile');
            Route::put('/settings/session-defaults', [ClinicSettingsController::class, 'updateSessionDefaults'])
                ->name('tenant.settings.session_defaults');
            Route::put('/settings/billing', [ClinicSettingsController::class, 'updateBillingSettings'])
                ->name('tenant.settings.billing');
            Route::put('/settings/online-booking', [ClinicSettingsController::class, 'updateOnlineBooking'])
                ->name('tenant.settings.online_booking');
        });

        // Legacy / shortcut redirects
        Route::get('/reception', fn () => redirect()->route('tenant.bookings'))
            ->name('tenant.reception.index');

        Route::get('/doctor', fn () => redirect()->route('tenant.sessions.today'))
            ->name('tenant.doctor.index');

        Route::post('/logout', [TenantAuthenticatedSessionController::class, 'destroy'])
            ->name('tenant.logout');
    });
});
