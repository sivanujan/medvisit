<?php

use App\Http\Controllers\ProfileController;
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
        });

        require __DIR__.'/auth.php';
    });
