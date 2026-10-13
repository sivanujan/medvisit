<?php

declare(strict_types=1);

namespace App\Providers;

use App\Mail\Auth\ResetPasswordMail;
use App\Mail\Auth\VerifyEmailMail;
use App\Models\Tenant;
use GuzzleHttp\Client;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Resend\Transporters\HttpTransporter;
use Resend\ValueObjects\ApiKey;
use Resend\ValueObjects\Transporter\BaseUri;
use Resend\ValueObjects\Transporter\Headers;

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

        // Ensure Resend transport uses the local CA bundle on Windows if system trust store is missing
        Mail::extend('resend', function (array $config = []) {
            $apiKey = (string) ($config['key'] ?? config('services.resend.key'));
            $certPath = storage_path('certs/ca-bundle.crt');
            $guzzleOptions = file_exists($certPath) ? ['verify' => $certPath] : [];

            $client = new Client($guzzleOptions);
            $baseUri = BaseUri::from(getenv('RESEND_BASE_URL') ?: 'api.resend.com');
            $headers = Headers::withAuthorization(ApiKey::from($apiKey));
            $transporter = new HttpTransporter($client, $baseUri, $headers);
            $resendClient = new \Resend\Client($transporter);

            return new ResendTransport($resendClient);
        });
    }
}
