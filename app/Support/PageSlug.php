<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ClinicPage;
use Illuminate\Validation\Rule;

class PageSlug
{
    public const PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

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

        return ['required', 'string', 'max:100', 'regex:'.self::PATTERN, $unique];
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

        $candidate = "{$base}-copy";
        $n = 2;
        while ($taken($candidate)) {
            $candidate = "{$base}-copy-{$n}";
            $n++;
        }

        return $candidate;
    }
}
