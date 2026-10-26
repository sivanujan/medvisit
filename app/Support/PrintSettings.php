<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Tenant;

class PrintSettings
{
    public const FORMAT_80MM = '80mm';

    public const FORMAT_A4 = 'a4';

    public const FORMAT_BOTH = 'both';

    public const PAPER_A5 = 'a5';

    public const PAPER_A4 = 'a4';

    /**
     * Resolve print settings array for the tenant, falling back to clean defaults.
     *
     * @return array{
     *     print_enabled: bool,
     *     receipt_format: string,
     *     receipt_prefix: string,
     *     token_slip_enabled: bool,
     *     token_slip_autoprint: bool,
     *     prescription_print_enabled: bool,
     *     prescription_print_language: string,
     *     prescription_paper_size: string,
     *     show_logo: bool,
     *     show_address: bool,
     *     registration_number: string
     * }
     */
    public static function forTenant(?Tenant $tenant = null): array
    {
        $tenant = $tenant ?? (function_exists('tenant') ? tenant() : null);
        if (! $tenant) {
            return self::defaults();
        }

        return [
            'print_enabled' => (bool) ($tenant->print_enabled ?? true),
            'receipt_format' => in_array($tenant->print_receipt_format, [self::FORMAT_80MM, self::FORMAT_A4, self::FORMAT_BOTH], true)
                ? $tenant->print_receipt_format
                : self::FORMAT_80MM,
            'receipt_prefix' => (string) ($tenant->receipt_prefix ?? 'REC'),
            'token_slip_enabled' => (bool) ($tenant->print_token_slip_enabled ?? true),
            'token_slip_autoprint' => (bool) ($tenant->print_token_slip_autoprint ?? false),
            'prescription_print_enabled' => (bool) ($tenant->prescription_print_enabled ?? true),
            'prescription_print_language' => in_array($tenant->prescription_print_language, ['en', 'ta', 'si'], true)
                ? $tenant->prescription_print_language
                : 'en',
            'prescription_paper_size' => in_array($tenant->prescription_paper_size, [self::PAPER_A5, self::PAPER_A4], true)
                ? $tenant->prescription_paper_size
                : self::PAPER_A5,
            'show_logo' => (bool) ($tenant->print_header_show_logo ?? true),
            'show_address' => (bool) ($tenant->print_header_show_address ?? true),
            'registration_number' => (string) ($tenant->registration_number ?? ''),
        ];
    }

    /**
     * Default print settings for clinics.
     */
    public static function defaults(): array
    {
        return [
            'print_enabled' => true,
            'receipt_format' => self::FORMAT_80MM,
            'receipt_prefix' => 'REC',
            'token_slip_enabled' => true,
            'token_slip_autoprint' => false,
            'prescription_print_enabled' => true,
            'prescription_print_language' => 'en',
            'prescription_paper_size' => self::PAPER_A5,
            'show_logo' => true,
            'show_address' => true,
            'registration_number' => '',
        ];
    }
}
