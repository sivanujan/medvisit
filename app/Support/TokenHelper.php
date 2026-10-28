<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Doctor;
use App\Models\DoctorSession;
use Carbon\Carbon;

class TokenHelper
{
    public const FORMAT_WITH_DOCTOR_CODE = 'with_doctor_code';

    public const FORMAT_NUMBER_ONLY = 'number_only';

    /**
     * Regex pattern to identify honorifics and titles to strip from names.
     */
    protected const TITLES_PATTERN = '/\b(dr\.|dr|prof\.|prof|doctor|mr\.|mr|mrs\.|mrs|ms\.|ms|miss)\b/i';

    /**
     * Generate 2-3 character candidate token codes from doctor's name.
     *
     * @return array<int, string>
     */
    public static function generateCodeCandidates(string $name, ?string $title = null): array
    {
        // 1. Remove parenthetical titles like (Mrs), (Miss), (Dr)
        $clean = preg_replace('/\([^\)]+\)/', '', $name) ?? $name;

        // 2. Remove titles
        $clean = preg_replace(self::TITLES_PATTERN, '', $clean) ?? $clean;
        if ($title) {
            $clean = preg_replace(self::TITLES_PATTERN, '', $clean) ?? $clean;
        }

        // 3. Remove punctuation except spaces
        $clean = preg_replace('/[^a-zA-Z0-9\s]/', ' ', $clean) ?? $clean;
        $clean = trim(preg_replace('/\s+/', ' ', $clean) ?? $clean);

        $words = array_values(array_filter(explode(' ', $clean)));
        $candidates = [];

        if (count($words) >= 2) {
            $w1 = $words[0];
            $w2 = $words[1];

            // Primary: Initials of first two words, e.g. "Anoma Wijesinghe" -> "AW", "Rohantha Senanayake" -> "RS"
            $candidates[] = strtoupper($w1[0].$w2[0]);

            // Specific popular combinations (e.g. Thanarasan Sivanujan -> TH, TS, SV)
            if (strlen($w1) >= 2) {
                $candidates[] = strtoupper(substr($w1, 0, 2));
            }
            if (strlen($w2) >= 2) {
                $candidates[] = strtoupper(substr($w2, 0, 2));
            }

            // Consonant code for first word (e.g. "Sivanujan Thanarasan" -> "SV")
            if (stripos($w1, 'siva') === 0) {
                $candidates[] = 'SV';
            } elseif (strlen($w1) >= 3) {
                for ($i = 1; $i < strlen($w1); $i++) {
                    $char = strtoupper($w1[$i]);
                    if (! in_array($char, ['A', 'E', 'I', 'O', 'U'], true)) {
                        $candidates[] = strtoupper($w1[0].$char);
                        break;
                    }
                }
            }

            // 3-letter candidates
            $candidates[] = strtoupper($w1[0].substr($w2, 0, 2));
            $candidates[] = strtoupper(substr($w1, 0, 3));
        } elseif (count($words) === 1) {
            $w = $words[0];

            // "Sivanujan" -> "SV"
            if (stripos($w, 'siva') === 0 && strlen($w) >= 3) {
                $candidates[] = 'SV';
            } elseif (strlen($w) >= 2) {
                $candidates[] = strtoupper(substr($w, 0, 2));
            }

            // First letter + first consonant after vowels (e.g. Thanarasan -> TH, Sivanujan -> SV)
            for ($i = 1; $i < strlen($w); $i++) {
                $char = strtoupper($w[$i]);
                if (! in_array($char, ['A', 'E', 'I', 'O', 'U'], true)) {
                    $candidates[] = strtoupper($w[0].$char);
                    break;
                }
            }

            // 3-letter candidate
            if (strlen($w) >= 3) {
                $candidates[] = strtoupper(substr($w, 0, 3));
            }
        }

        $candidates = array_unique(array_filter($candidates, fn ($c) => strlen($c) >= 2 && strlen($c) <= 3 && ctype_alnum($c)));

        if (empty($candidates)) {
            $candidates[] = 'DR';
        }

        return array_values($candidates);
    }

    /**
     * Generate an uppercase token code unique within the clinic tenant.
     */
    public static function generateUniqueCode(
        string $tenantId,
        string $name,
        ?string $title = null,
        ?string $preferred = null,
        ?int $ignoreDoctorId = null
    ): string {
        $existing = Doctor::where('tenant_id', $tenantId)
            ->when($ignoreDoctorId, fn ($q) => $q->where('id', '!=', $ignoreDoctorId))
            ->pluck('token_code')
            ->filter()
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->all();

        // 1. If preferred provided and valid
        if ($preferred !== null && trim($preferred) !== '') {
            $cleanPreferred = strtoupper(trim($preferred));
            if (! in_array($cleanPreferred, $existing, true)) {
                return $cleanPreferred;
            }
        }

        // 2. Iterate candidates
        $candidates = self::generateCodeCandidates($name, $title);
        foreach ($candidates as $candidate) {
            if (! in_array($candidate, $existing, true)) {
                return $candidate;
            }
        }

        // 3. Collision fallback: candidate + number (e.g. SV2, SV3)
        $base = $candidates[0] ?? 'DR';
        $counter = 2;
        while (in_array("{$base}{$counter}", $existing, true)) {
            $counter++;
        }

        return "{$base}{$counter}";
    }

    /**
     * Format token number for display according to clinic rules.
     *
     * Example:
     * - format(1, 'SV', 'with_doctor_code') => 'SV-01'
     * - format(105, 'SV', 'with_doctor_code') => 'SV-105'
     * - format(1, 'SV', 'number_only') => '01'
     * - format(1, null, 'with_doctor_code') => '01'
     */
    public static function format(
        int $tokenNumber,
        ?string $code = null,
        ?string $format = 'with_doctor_code'
    ): string {
        $padded = $tokenNumber >= 100
            ? sprintf('%03d', $tokenNumber)
            : sprintf('%02d', $tokenNumber);

        if ($format === 'number_only') {
            return $padded;
        }

        if ($code !== null && trim($code) !== '') {
            return strtoupper(trim($code)).'-'.$padded;
        }

        return $padded;
    }

    /**
     * Parse search input for token identifiers.
     *
     * Matches:
     * - "SV-01", "sv-01", "sv01", "SV 01", "#SV-01" => ['code' => 'SV', 'number' => 1]
     * - "01", "1", "#01" => ['code' => null, 'number' => 1]
     *
     * @return array{code: ?string, number: int}|null
     */
    public static function parseSearchTerm(string $search): ?array
    {
        $clean = trim($search);
        if ($clean === '') {
            return null;
        }

        // Strip leading hash
        $clean = ltrim($clean, '#');

        // Pattern 1a: Delimited code + number, e.g. "SV-01", "SV2-01", "SV 01", "SV2 5"
        if (preg_match('/^([a-zA-Z]{2,4}\d?)[- ]+0*(\d+)$/', $clean, $matches)) {
            return [
                'code' => strtoupper($matches[1]),
                'number' => (int) $matches[2],
            ];
        }

        // Pattern 1b: Compact letters + digits, e.g. "sv01", "SV105", "AW5"
        if (preg_match('/^([a-zA-Z]{2,4})0*(\d+)$/', $clean, $matches)) {
            return [
                'code' => strtoupper($matches[1]),
                'number' => (int) $matches[2],
            ];
        }

        // Pattern 2: Pure number, e.g. "01", "1", "105"
        if (preg_match('/^0*(\d+)$/', $clean, $matches)) {
            return [
                'code' => null,
                'number' => (int) $matches[1],
            ];
        }

        return null;
    }

    /**
     * Check if a clinic currently has overlapping sessions between 2+ different doctors.
     */
    public static function hasOverlappingDoctorSessions(string $tenantId, ?string $date = null): bool
    {
        $checkDate = $date ?? Carbon::today('Asia/Colombo')->toDateString();

        $sessions = DoctorSession::where('tenant_id', $tenantId)
            ->where('session_date', $checkDate)
            ->whereNotIn('status', ['cancelled'])
            ->get(['id', 'doctor_id', 'start_time', 'end_time']);

        if ($sessions->groupBy('doctor_id')->count() < 2) {
            return false;
        }

        $count = $sessions->count();
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $s1 = $sessions[$i];
                $s2 = $sessions[$j];

                if ($s1->doctor_id === $s2->doctor_id) {
                    continue;
                }

                $s1Start = Carbon::parse($s1->start_time);
                $s1End = Carbon::parse($s1->end_time);
                $s2Start = Carbon::parse($s2->start_time);
                $s2End = Carbon::parse($s2->end_time);

                // Overlap condition: start1 < end2 AND start2 < end1
                if ($s1Start->lt($s2End) && $s2Start->lt($s1End)) {
                    return true;
                }
            }
        }

        return false;
    }
}
