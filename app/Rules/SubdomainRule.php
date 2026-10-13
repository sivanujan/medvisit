<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Tenant;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;
use Illuminate\Translation\PotentiallyTranslatedString;
use Stancl\Tenancy\Database\Models\Domain;

class SubdomainRule implements ValidationRule
{
    /**
     * Reserved subdomains for system services and central routing.
     *
     * @var list<string>
     */
    public const RESERVED = [
        'www',
        'app',
        'api',
        'admin',
        'mail',
        'help',
        'support',
        'status',
        'billing',
        'dashboard',
        'demo',
        'test',
        'staging',
        'medvisit',
        'blog',
        'docs',
        'login',
        'register',
    ];

    public function __construct(
        protected ?string $ignoreTenantId = null
    ) {}

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The web address must be a valid text string.');

            return;
        }

        $subdomain = Str::lower(trim($value));

        if (strlen($subdomain) < 3 || strlen($subdomain) > 30) {
            $fail('The web address must be between 3 and 30 characters long.');

            return;
        }

        if (! preg_match('/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/', $subdomain)) {
            $fail('The web address may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.');

            return;
        }

        if (in_array($subdomain, self::RESERVED, true)) {
            $fail("The web address '{$subdomain}' is reserved by MedVisit.");

            return;
        }

        $tenantQuery = Tenant::where(function ($query) use ($subdomain) {
            $query->where('id', $subdomain)->orWhere('subdomain', $subdomain);
        });

        if ($this->ignoreTenantId) {
            $tenantQuery->where('id', '!=', $this->ignoreTenantId);
        }

        if ($tenantQuery->exists()) {
            $fail("The web address '{$subdomain}' is already taken. Please choose another.");

            return;
        }

        $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');
        $domainQuery = Domain::where(function ($query) use ($subdomain, $centralDomain) {
            $query->where('domain', $subdomain)
                ->orWhere('domain', "{$subdomain}.{$centralDomain}");
        });

        if ($this->ignoreTenantId) {
            $domainQuery->where('tenant_id', '!=', $this->ignoreTenantId);
        }

        if ($domainQuery->exists()) {
            $fail("The web address '{$subdomain}' is already taken. Please choose another.");
        }
    }

    /**
     * Generate 3 available suggestions based on the provided subdomain.
     *
     * @return list<string>
     */
    public static function generateSuggestions(string $base): array
    {
        $clean = Str::slug($base);
        if (strlen($clean) < 2) {
            $clean = 'clinic';
        }

        $candidates = [
            $clean.'-clinic',
            $clean.'-care',
            $clean.'-health',
            $clean.'lk',
            $clean.'1',
            $clean.'-med',
        ];

        $suggestions = [];
        $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');

        foreach ($candidates as $candidate) {
            if (strlen($candidate) < 3 || strlen($candidate) > 30) {
                continue;
            }
            if (in_array($candidate, self::RESERVED, true)) {
                continue;
            }
            if (Tenant::where('id', $candidate)->orWhere('subdomain', $candidate)->exists()) {
                continue;
            }
            if (Domain::where('domain', $candidate)->orWhere('domain', "{$candidate}.{$centralDomain}")->exists()) {
                continue;
            }

            $suggestions[] = $candidate;
            if (count($suggestions) >= 3) {
                break;
            }
        }

        return $suggestions;
    }
}
