<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $host = request()->getHost();
        $centralDomains = config('tenancy.central_domains', ['medvisit.test', '127.0.0.1', 'localhost']);
        $defaultCentral = in_array($host, $centralDomains, true) ? $host : ($centralDomains[0] ?? 'localhost');

        URL::defaults(['central_domain' => $defaultCentral]);
    }
}
