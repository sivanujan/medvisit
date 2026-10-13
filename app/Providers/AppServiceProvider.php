<?php

declare(strict_types=1);

namespace App\Providers;

use App\Mail\Auth\ResetPasswordMail;
use App\Mail\Auth\VerifyEmailMail;
use App\Models\Tenant;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
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

        // Custom ResetPassword URL generation to ensure tenant clinic subdomains are used
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $tenant = $notifiable->tenant ?? ($notifiable->tenant_id ? Tenant::find($notifiable->tenant_id) : null);
            if ($tenant) {
                return $tenant->url("/reset-password/{$token}?email=".urlencode($notifiable->getEmailForPasswordReset()));
            }

            return url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));
        });

        // Use MedVisit branded mailable for Password Reset
        ResetPassword::toMailUsing(function ($notifiable, string $token) {
            return (new ResetPasswordMail($notifiable, $token))->to($notifiable->getEmailForPasswordReset());
        });

        // Use MedVisit branded mailable for Email Verification
        VerifyEmail::toMailUsing(function ($notifiable, string $url) {
            return (new VerifyEmailMail($notifiable, $url))->to($notifiable->getEmailForVerification());
        });
    }
}
