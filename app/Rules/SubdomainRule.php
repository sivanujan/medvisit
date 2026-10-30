<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\ReservedSubdomain;
use App\Models\Tenant;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Translation\PotentiallyTranslatedString;
use Stancl\Tenancy\Database\Models\Domain;

class SubdomainRule implements ValidationRule
{
    public function __construct(
        protected ?string $ignoreTenantId = null,
        protected bool $allowReservedOverride = false,
        protected ?string $clinicName = null,
        protected ?string $city = null
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

        // 1. Length validation (3 - 30 chars)
        if (strlen($subdomain) < 3 || strlen($subdomain) > 30) {
            $fail('The web address must be between 3 and 30 characters long.');

            return;
        }

        // 2. Character validation (a-z, 0-9, and hyphen; must start and end with letter or digit)
        if (! preg_match('/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/', $subdomain)) {
            $fail('The web address may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.');

            return;
        }

        // 3. Consecutive hyphens check
        if (str_contains($subdomain, '--')) {
            $fail('The web address cannot contain consecutive hyphens.');

            return;
        }

        // 4. Punycode check ("xn--")
        if (str_contains($subdomain, 'xn--')) {
            $fail('The web address cannot contain punycode prefixes (xn--).');

            return;
        }

        // 5. Numeric-only check
        if (ctype_digit($subdomain)) {
            $fail('The web address cannot consist only of numbers.');

            return;
        }

        // 6. Reserved & blocked names check (unless explicitly overridden by Super Admin)
        if (! $this->allowReservedOverride) {
            if (static::isReserved($subdomain)) {
                $example = static::getPrimaryExample($subdomain, $this->clinicName, $this->city);
                $fail("This web address is reserved. Please choose another, e.g. {$example}.");

                return;
            }
        }

        // 7. Database uniqueness check across ALL tenants (including soft-deleted)
        $tenantQuery = Tenant::withTrashed()->where(function ($query) use ($subdomain) {
            $query->where('id', $subdomain)->orWhere('subdomain', $subdomain);
        });

        if ($this->ignoreTenantId) {
            $tenantQuery->where('id', '!=', $this->ignoreTenantId);
        }

        if ($tenantQuery->exists()) {
            $fail("The web address '{$subdomain}' is already taken. Please choose another.");

            return;
        }

        // 8. Domain record uniqueness
        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
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
     * Check if a normalized subdomain is reserved by config, route segments, pattern, offensive list, or DB hold.
     */
    public static function isReserved(string $subdomain): bool
    {
        $normalized = Str::lower(trim($subdomain));
        if ($normalized === '') {
            return false;
        }

        // A. Exact match in config
        $exactList = (array) config('reserved_subdomains.exact', []);
        if (in_array($normalized, $exactList, true)) {
            return true;
        }

        // B. Exact match in central route first segments
        $routeSegments = static::getCentralRouteSegments();
        if (in_array($normalized, $routeSegments, true)) {
            return true;
        }

        // C. Pattern Blocks
        // 1. Global substring match: 'medvisit', 'med-visit'
        $globalPatterns = (array) config('reserved_subdomains.patterns.contains_global', ['medvisit', 'med-visit']);
        foreach ($globalPatterns as $pattern) {
            if ($pattern !== '' && str_contains($normalized, $pattern)) {
                return true;
            }
        }

        // 2. Segment match (hyphen-separated only, avoiding the Scunthorpe problem)
        $segments = explode('-', $normalized);
        $segmentBlocks = (array) config('reserved_subdomains.patterns.segment_blocks', [
            'admin', 'support', 'official', 'billing', 'payment', 'login', 'verify', 'security', 'gov',
        ]);
        foreach ($segmentBlocks as $block) {
            if ($block !== '' && in_array($block, $segments, true)) {
                return true;
            }
        }

        // D. Offensive Words
        $offensiveWords = (array) config('reserved_subdomains.offensive', []);
        foreach ($offensiveWords as $word) {
            $w = Str::lower(trim($word));
            if ($w === '') {
                continue;
            }
            if (strlen($w) >= 5) {
                // 5+ letters: substring match
                if (str_contains($normalized, $w)) {
                    return true;
                }
            } else {
                // < 5 letters: segment match only
                if (in_array($w, $segments, true)) {
                    return true;
                }
            }
        }

        // E. Database Reservations (manual blocks + 90-day holds for force-deleted clinics)
        try {
            $isDbReserved = ReservedSubdomain::active()
                ->where('subdomain', $normalized)
                ->exists();

            if ($isDbReserved) {
                return true;
            }
        } catch (\Throwable $e) {
            // DB fallback safe
        }

        return false;
    }

    /**
     * Check if a subdomain is completely available (format, reserved, tenants, domains).
     */
    public static function isAvailable(string $subdomain, ?string $ignoreTenantId = null, bool $allowReservedOverride = false): bool
    {
        $sub = Str::lower(trim($subdomain));

        if (strlen($sub) < 3 || strlen($sub) > 30) {
            return false;
        }

        if (! preg_match('/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/', $sub)) {
            return false;
        }

        if (str_contains($sub, '--') || str_contains($sub, 'xn--') || ctype_digit($sub)) {
            return false;
        }

        if (! $allowReservedOverride && static::isReserved($sub)) {
            return false;
        }

        $tenantQuery = Tenant::withTrashed()->where(function ($query) use ($sub) {
            $query->where('id', $sub)->orWhere('subdomain', $sub);
        });

        if ($ignoreTenantId) {
            $tenantQuery->where('id', '!=', $ignoreTenantId);
        }

        if ($tenantQuery->exists()) {
            return false;
        }

        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $domainQuery = Domain::where(function ($query) use ($sub, $centralDomain) {
            $query->where('domain', $sub)
                ->orWhere('domain', "{$sub}.{$centralDomain}");
        });

        if ($ignoreTenantId) {
            $domainQuery->where('tenant_id', '!=', $ignoreTenantId);
        }

        if ($domainQuery->exists()) {
            return false;
        }

        return true;
    }

    /**
     * Build and cache first path segments of all central routes.
     * Cleared automatically when `optimize:clear` or `cache:clear` runs on deployment.
     *
     * @return list<string>
     */
    public static function getCentralRouteSegments(): array
    {
        return Cache::rememberForever('medvisit_central_route_first_segments', function () {
            try {
                $routes = Route::getRoutes();
                $segments = [];

                foreach ($routes as $route) {
                    $domain = (string) $route->getDomain();
                    // Match routes bound to {central_domain} or null (central domain)
                    if (str_contains($domain, 'central') || empty($domain)) {
                        $uri = trim($route->uri(), '/');
                        $parts = explode('/', $uri);
                        $first = strtolower($parts[0] ?? '');

                        if ($first !== '' && ! str_starts_with($first, '{')) {
                            $segments[] = $first;
                        }
                    }
                }

                return array_values(array_unique($segments));
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    /**
     * Get a primary suggestion string for the message example, e.g. "careclinic-colombo".
     */
    public static function getPrimaryExample(string $base, ?string $clinicName = null, ?string $city = null): string
    {
        $suggestions = static::generateSuggestions($base, $clinicName, $city);

        return $suggestions[0] ?? ($clinicName ? Str::slug($clinicName).'-clinic' : 'yourclinic-city');
    }

    /**
     * Generate 2–3 guaranteed-available suggestions based on the clinic name, city, or base handle.
     *
     * @return list<string>
     */
    public static function generateSuggestions(string $base, ?string $clinicName = null, ?string $city = null): array
    {
        $cleanBase = Str::slug($base);
        if (strlen($cleanBase) < 2 || static::isReserved($cleanBase)) {
            $cleanBase = 'myclinic';
        }

        $candidates = [];

        // If clinic name and city are available, prioritize contextual combinations
        if (! empty($clinicName) && ! empty($city)) {
            $nameSlug = Str::slug($clinicName);
            $citySlug = Str::slug($city);
            $candidates[] = "{$nameSlug}-{$citySlug}";
            $candidates[] = "{$nameSlug}-care";
            $candidates[] = "{$nameSlug}-clinic";
            $candidates[] = "{$nameSlug}-health";
            $candidates[] = "{$nameSlug}-med";
        } elseif (! empty($clinicName)) {
            $nameSlug = Str::slug($clinicName);
            $candidates[] = "{$nameSlug}-care";
            $candidates[] = "{$nameSlug}-clinic";
            $candidates[] = "{$nameSlug}-health";
            $candidates[] = "{$nameSlug}-med";
            $candidates[] = "{$nameSlug}lk";
        }

        // Generic patterns based on clean base
        $candidates[] = "{$cleanBase}-care";
        $candidates[] = "{$cleanBase}-clinic";
        $candidates[] = "{$cleanBase}-health";
        $candidates[] = "{$cleanBase}-med";
        $candidates[] = "{$cleanBase}lk";
        $candidates[] = "{$cleanBase}-center";

        $availableSuggestions = [];

        foreach ($candidates as $candidate) {
            // Trim to max 30 chars
            if (strlen($candidate) > 30) {
                $candidate = substr($candidate, 0, 30);
                $candidate = rtrim($candidate, '-');
            }

            if (strlen($candidate) < 3) {
                continue;
            }

            // Must pass availability test
            if (static::isAvailable($candidate)) {
                if (! in_array($candidate, $availableSuggestions, true)) {
                    $availableSuggestions[] = $candidate;
                }
            }

            if (count($availableSuggestions) >= 3) {
                break;
            }
        }

        // If still under 2, generate with safe random numerical suffixes
        $counter = 1;
        while (count($availableSuggestions) < 2 && $counter <= 99) {
            $candidate = "{$cleanBase}-{$counter}";
            if (static::isAvailable($candidate) && ! in_array($candidate, $availableSuggestions, true)) {
                $availableSuggestions[] = $candidate;
            }
            $counter++;
        }

        return $availableSuggestions;
    }
}
