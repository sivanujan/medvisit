<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ClinicPage;
use Illuminate\Validation\Rule;

class PageSlug
{
    public const PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    public const MAX_LENGTH = 60;

    /**
     * Reserved slugs that cannot be used by custom clinic pages.
     * Prevents collisions with tenant routes, central legal documents, and system paths.
     */
    public const RESERVED_SLUGS = [
        'terms',
        'privacy-policy',
        'refund-policy',
        'dispute-policy',
        'privacy',
        'refund',
        'dispute',
        'login',
        'logout',
        'register',
        'book',
        'queue',
        'dashboard',
        'settings',
        'admin',
        'demo',
        'clinic',
        'impersonate',
    ];

    /**
     * Validation rules for a page slug. Uniqueness deliberately counts
     * soft-deleted rows so a restore can never collide.
     *
     * @return array<int, mixed>
     */
    public static function rule(string $tenantId, ?int $ignoreId = null): array
    {
        $unique = Rule::unique('clinic_pages', 'slug')->where('tenant_id', $tenantId);

        if ($ignoreId !== null) {
            $unique->ignore($ignoreId);
        }

        return [
            'required',
            'string',
            'max:'.self::MAX_LENGTH,
            'regex:'.self::PATTERN,
            Rule::notIn(self::RESERVED_SLUGS),
            $unique,
        ];
    }

    /**
     * Next free "{base}-copy", "{base}-copy-2", ... slug (soft-deleted rows count as taken).
     */
    public static function nextAvailable(string $tenantId, string $base): string
    {
        $taken = fn (string $slug): bool => ClinicPage::withTrashed()
            ->where('tenant_id', $tenantId)
            ->where('slug', $slug)
            ->exists();

        $build = function (string $suffix) use ($base): string {
            $trimmed = rtrim(substr($base, 0, self::MAX_LENGTH - strlen($suffix)), '-');

            return $trimmed.$suffix;
        };

        $candidate = $build('-copy');
        $n = 2;
        while ($taken($candidate)) {
            $candidate = $build("-copy-{$n}");
            $n++;
        }

        return $candidate;
    }
}
