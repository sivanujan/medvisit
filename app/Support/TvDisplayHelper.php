<?php

declare(strict_types=1);

namespace App\Support;

class TvDisplayHelper
{
    public const NAME_MODE_TOKEN_ONLY = 'token_only';

    public const NAME_MODE_INITIAL_LAST = 'initial_last';

    public const NAME_MODE_FIRST_ONLY = 'first_only';

    public const NAME_MODE_FULL_NAME = 'full_name';

    /**
     * Clean and format doctor display name without duplicate prefixes.
     */
    public static function formatDoctorName(?string $name, ?string $title = 'Dr.'): string
    {
        $raw = trim($name ?? '');
        if ($raw === '') {
            return 'Doctor';
        }

        // Collapse any repeated Dr. / Prof. prefixes like "Dr. Dr." or "Dr. Dr. Dr."
        $clean = preg_replace('/^((?:dr|prof|mr|mrs|ms)\.?\s*)+/i', '', $raw);
        $clean = trim((string) $clean);

        // Check if original had Prof. specifically
        if (preg_match('/^prof\.?\s+/i', $raw)) {
            return 'Prof. '.$clean;
        }

        $chosenTitle = trim($title ?? 'Dr.');
        if ($chosenTitle === '') {
            $chosenTitle = 'Dr.';
        }
        if (! str_ends_with($chosenTitle, '.')) {
            $chosenTitle .= '.';
        }

        return $chosenTitle.' '.$clean;
    }

    /**
     * Proper pluralization for waiting count on TV display.
     */
    public static function pluralWaiting(int $count): string
    {
        if ($count <= 0) {
            return 'No one waiting';
        }

        if ($count === 1) {
            return '1 patient waiting';
        }

        return "{$count} patients waiting";
    }

    /**
     * Mask patient name for waiting room TV privacy.
     */
    public static function maskPatientName(?string $fullName, string $mode = self::NAME_MODE_TOKEN_ONLY): ?string
    {
        $trimmed = trim($fullName ?? '');
        if ($trimmed === '' || $mode === self::NAME_MODE_TOKEN_ONLY) {
            return null;
        }

        if ($mode === self::NAME_MODE_FULL_NAME) {
            return $trimmed;
        }

        $parts = preg_split('/\s+/', $trimmed, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (empty($parts)) {
            return null;
        }

        if ($mode === self::NAME_MODE_FIRST_ONLY) {
            return $parts[0];
        }

        if ($mode === self::NAME_MODE_INITIAL_LAST) {
            if (count($parts) === 1) {
                return $parts[0];
            }

            $firstInitial = mb_strtoupper(mb_substr($parts[0], 0, 1));
            $lastName = end($parts);

            return "{$firstInitial}. {$lastName}";
        }

        return null;
    }
}
