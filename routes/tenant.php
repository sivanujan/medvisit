<?php

declare(strict_types=1);

use App\Http\Controllers\Tenant\BillingController;
use App\Http\Controllers\Tenant\BookingTokenController;
use App\Http\Controllers\Tenant\ChannelingCalendarController;
use App\Http\Controllers\Tenant\ClinicSettingsController;
use App\Http\Controllers\Tenant\ClinicWebsiteController;
use App\Http\Controllers\Tenant\DoctorController;
use App\Http\Controllers\Tenant\LiveQueueTvController;
use App\Http\Controllers\Tenant\PatientController;
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
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
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

    // 2. Tenant Public Landing
    Route::get('/', function () {
        $tenant = tenant();

        if (! $tenant->isUsable()) {
            return redirect()->route('tenant.suspended');
        }

        return Inertia::render('Welcome', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => ucwords((string) ($tenant->name ?? 'Demo Clinic')),
                'subdomain' => $tenant->subdomain ?? 'demo',
                'plan' => $tenant->plan ?? 'starter',
                'status' => $tenant->status ?? 'active',
                'base_domain' => config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost')),
            ],
            'canLogin' => true,
            'canRegister' => false,
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
        ]);
    })->name('tenant.home');

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
        });

        // Administration routes: Clinic Admin Only (Doctor & Receptionist restricted -> 403)
        Route::middleware(['role:clinic_admin|super_admin'])->group(function () {
            Route::get('/website', [ClinicWebsiteController::class, 'index'])
                ->name('tenant.website');

            Route::get('/staff', [StaffController::class, 'index'])
                ->name('tenant.staff');

            Route::get('/settings', [ClinicSettingsController::class, 'index'])
                ->name('tenant.settings');
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
