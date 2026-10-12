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
    ->whereIn('central_domain', config('tenancy.central_domains', ['medvisit.test', '127.0.0.1', 'localhost']))
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

        Route::middleware('auth')->group(function () {
            Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
            Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
            Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
        });

        require __DIR__.'/auth.php';
    });
