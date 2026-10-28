<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Tenant;
use Illuminate\Validation\Rule;

class SiteKit
{
    public const SYSTEM_IDS = ['primary', 'secondary', 'accent', 'text'];

    public const MAX_CUSTOM_COLORS = 10;

    public const TYPOGRAPHY_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'button'];

    private const FALLBACK_THEME = 'medvisit-teal';

    private const SIZE_REGEX = '/^\d+(\.\d+)?(px|rem|em|vw)$/';

    public const THEME_COLORS = [
        'medvisit-teal' => ['primary' => '#0E9E8F', 'secondary' => '#0F172A', 'accent' => '#F59E0B', 'text' => '#334155'],
        'ocean-blue' => ['primary' => '#1E6FD9', 'secondary' => '#0F172A', 'accent' => '#F59E0B', 'text' => '#334155'],
        'coral-health' => ['primary' => '#FF7A59', 'secondary' => '#0F172A', 'accent' => '#0E9E8F', 'text' => '#334155'],
        'emerald-health' => ['primary' => '#059669', 'secondary' => '#0F172A', 'accent' => '#F59E0B', 'text' => '#334155'],
        'royal-purple' => ['primary' => '#7C3AED', 'secondary' => '#0F172A', 'accent' => '#F59E0B', 'text' => '#334155'],
        'slate-luxury' => ['primary' => '#334155', 'secondary' => '#0F172A', 'accent' => '#F59E0B', 'text' => '#334155'],
    ];

    /** key => [desktop, tablet, mobile, weight, lineHeight] */
    private const TYPOGRAPHY_DEFAULTS = [
        'h1' => ['48px', '40px', '32px', 800, 1.15],
        'h2' => ['40px', '34px', '28px', 700, 1.2],
        'h3' => ['32px', '28px', '24px', 700, 1.25],
        'h4' => ['26px', '24px', '20px', 600, 1.3],
        'h5' => ['22px', '20px', '18px', 600, 1.35],
        'h6' => ['18px', '17px', '16px', 600, 1.4],
        'body' => ['16px', '16px', '16px', 400, 1.6],
        'button' => ['16px', '16px', '16px', 600, 1.2],
    ];

    /**
     * Default kit derived from a website theme preset.
     *
     * @return array<string, mixed>
     */
    public static function defaultsForTheme(string $theme): array
    {
        $palette = self::THEME_COLORS[$theme] ?? self::THEME_COLORS[self::FALLBACK_THEME];
        $names = ['primary' => 'Primary', 'secondary' => 'Secondary', 'accent' => 'Accent', 'text' => 'Text'];

        $colors = [];
        foreach (self::SYSTEM_IDS as $id) {
            $colors[] = ['id' => $id, 'name' => $names[$id], 'value' => $palette[$id]];
        }

        $typography = [];
        foreach (self::TYPOGRAPHY_DEFAULTS as $key => [$desktop, $tablet, $mobile, $weight, $lineHeight]) {
            $typography[$key] = [
                'size' => ['desktop' => $desktop, 'tablet' => $tablet, 'mobile' => $mobile],
                'weight' => $weight,
                'lineHeight' => $lineHeight,
            ];
        }

        return [
            'colors' => $colors,
            'retired' => [],
            'fonts' => ['heading' => 'Poppins', 'body' => 'Inter'],
            'typography' => $typography,
        ];
    }

    /**
     * The tenant's stored kit, or defaults for its theme.
     *
     * @return array<string, mixed>
     */
    public static function resolveFor(Tenant $tenant): array
    {
        $stored = $tenant->website_kit;

        if (is_array($stored) && ! empty($stored['colors'])) {
            return $stored;
        }

        return self::defaultsForTheme((string) ($tenant->website_theme ?? self::FALLBACK_THEME));
    }

    /**
     * Validation rules for a full kit payload.
     *
     * @return array<string, mixed>
     */
    public static function rules(): array
    {
        $rules = [
            'colors' => ['required', 'array', 'min:4'],
            'colors.*.id' => ['required', 'string', 'regex:/^(primary|secondary|accent|text|custom-[a-z0-9-]+)$/', 'distinct'],
            'colors.*.name' => ['required', 'string', 'max:40', 'not_regex:/[<>{};]/'],
            'colors.*.value' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'fonts' => ['required', 'array'],
            'fonts.heading' => ['required', 'string', Rule::in(PageBuilderFonts::families())],
            'fonts.body' => ['required', 'string', Rule::in(PageBuilderFonts::families())],
            'typography' => ['required', 'array'],
        ];

        foreach (self::TYPOGRAPHY_KEYS as $key) {
            $rules["typography.$key"] = ['required', 'array'];
            $rules["typography.$key.size"] = ['required', 'array'];
            foreach (['desktop', 'tablet', 'mobile'] as $device) {
                $rules["typography.$key.size.$device"] = [$device === 'desktop' ? 'required' : 'nullable', 'string', 'regex:'.self::SIZE_REGEX];
            }
            $rules["typography.$key.weight"] = ['required', 'integer', 'between:100,900', 'multiple_of:100'];
            $rules["typography.$key.lineHeight"] = ['required', 'numeric', 'between:0.8,3'];
        }

        return $rules;
    }

    /**
     * Build the kit to store: keep only known fields and move removed
     * custom colors into `retired` so existing pages keep resolving them.
     *
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $current
     * @return array<string, mixed>
     */
    public static function normalize(array $validated, array $current): array
    {
        $colors = array_map(
            static fn (array $c): array => ['id' => $c['id'], 'name' => $c['name'], 'value' => $c['value']],
            array_values($validated['colors'])
        );
        $incomingIds = array_column($colors, 'id');

        $retired = [];
        foreach ([...($current['retired'] ?? []), ...($current['colors'] ?? [])] as $color) {
            $id = (string) ($color['id'] ?? '');
            if (! str_starts_with($id, 'custom-') || in_array($id, $incomingIds, true)) {
                continue;
            }
            $retired[$id] = ['id' => $id, 'name' => $color['name'], 'value' => $color['value']];
        }

        $typography = [];
        foreach (self::TYPOGRAPHY_KEYS as $key) {
            $t = $validated['typography'][$key];
            $typography[$key] = [
                'size' => array_filter([
                    'desktop' => $t['size']['desktop'],
                    'tablet' => $t['size']['tablet'] ?? null,
                    'mobile' => $t['size']['mobile'] ?? null,
                ], static fn ($v) => $v !== null),
                'weight' => (int) $t['weight'],
                'lineHeight' => (float) $t['lineHeight'],
            ];
        }

        return [
            'colors' => $colors,
            'retired' => array_values($retired),
            'fonts' => ['heading' => $validated['fonts']['heading'], 'body' => $validated['fonts']['body']],
            'typography' => $typography,
        ];
    }
}
