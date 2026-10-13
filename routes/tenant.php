<?php

declare(strict_types=1);

use App\Http\Controllers\Tenant\TenantAuthenticatedSessionController;
use App\Http\Controllers\Tenant\TenantNewPasswordController;
use App\Http\Controllers\Tenant\TenantPasswordResetLinkController;
use App\Http\Controllers\Tenant\TenantSignedLoginController;
use App\Http\Controllers\Tenant\TenantSuspendedController;
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
                'name' => $tenant->name ?? 'Demo Clinic',
                'subdomain' => $tenant->subdomain ?? 'demo',
                'plan' => $tenant->plan ?? 'starter',
                'status' => $tenant->status ?? 'active',
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
        Route::get('/dashboard', function () {
            return Inertia::render('Dashboard');
        })->name('tenant.dashboard');

        Route::get('/reception', function () {
            return Inertia::render('Dashboard', ['view' => 'reception']);
        })->name('tenant.reception.index');

        Route::get('/doctor', function () {
            return Inertia::render('Dashboard', ['view' => 'doctor']);
        })->name('tenant.doctor.index');

        Route::post('/logout', [TenantAuthenticatedSessionController::class, 'destroy'])
            ->name('tenant.logout');
    });
});
