<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Here you can register the tenant routes for your application.
| These routes are loaded by TenancyServiceProvider.
|
*/

Route::middleware([
    'web',
    InitializeTenancyBySubdomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    Route::get('/', function () {
        $tenant = tenant();
        return Inertia::render('Welcome', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name ?? 'Demo Clinic',
                'subdomain' => $tenant->subdomain ?? 'demo',
                'plan' => $tenant->plan ?? 'starter',
                'status' => $tenant->status ?? 'active',
            ],
            'canLogin' => Route::has('login'),
            'canRegister' => false,
            'laravelVersion' => \Illuminate\Foundation\Application::VERSION,
            'phpVersion' => PHP_VERSION,
        ]);
    })->name('tenant.home');
});
