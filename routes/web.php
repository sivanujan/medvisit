<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SuperAdmin\MedicineCatalogController;
use App\Http\Controllers\SuperAdmin\OtpAnalyticsController;
use App\Http\Controllers\Webhooks\WhatsAppWebhookController;
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

        Route::get('/dashboard', function () {
            return Inertia::render('Dashboard');
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

            Route::get('/reception', function () {
                return Inertia::render('Dashboard', ['view' => 'reception']);
            })->name('reception.index');

            Route::get('/doctor', function () {
                return Inertia::render('Dashboard', ['view' => 'doctor']);
            })->name('doctor.index');

            Route::get('/super-admin/otp-usage', [OtpAnalyticsController::class, 'index'])
                ->name('super_admin.otp_usage');

            // Super Admin Global Medicine Catalog & Review Queue
            Route::middleware(['role:super_admin'])->group(function () {
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
            });
        });

        require __DIR__.'/auth.php';
    });

// WhatsApp Cloud API Webhook (Central domain & Cloudflare quick tunnels, no CSRF, no tenancy identification)
Route::get('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify'])
    ->name('webhooks.whatsapp.verify');
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle'])
    ->name('webhooks.whatsapp.handle');
