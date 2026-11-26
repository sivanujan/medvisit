<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustHosts as Middleware;

class TrustHosts extends Middleware
{
    /**
     * Get the host patterns that should be trusted.
     *
     * @return array<int, string|null>
     */
    public function hosts(): array
    {
        return array_values(array_filter([
            $this->allSubdomainsOfApplicationUrl(),
            // Production domain and any subdomains (e.g. clinic.medvisit.lk, admin.medvisit.lk)
            '^(.+\.)?medvisit\.lk$',
            // Development and testing base domains
            config('medvisit.base_domain') ? '^(.+\.)?'.preg_quote((string) config('medvisit.base_domain')).'$' : null,
            '^(.+\.)?medvisit\.localhost$',
            '^localhost$',
            '^127\.0\.0\.1$',
        ]));
    }

    /**
     * Determine if the application should specify trusted hosts.
     * Enabled for all non-local environments (including testing so tests verify host integrity).
     */
    protected function shouldSpecifyTrustedHosts(): bool
    {
        return ! $this->app->environment('local');
    }
}
