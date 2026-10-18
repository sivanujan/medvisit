<?php

declare(strict_types=1);

namespace App\Support;

class PageBuilderFonts
{
    /** @var list<string>|null */
    private static ?array $families = null;

    /**
     * Curated font family names shared with the page builder front end.
     *
     * @return list<string>
     */
    public static function families(): array
    {
        if (self::$families === null) {
            $path = resource_path('js/Components/PageBuilder/lib/fonts.json');
            $decoded = json_decode((string) file_get_contents($path), true);

            self::$families = array_values(array_map(
                static fn (array $font): string => (string) $font['family'],
                is_array($decoded) ? $decoded : []
            ));
        }

        return self::$families;
    }
}
