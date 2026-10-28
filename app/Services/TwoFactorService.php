<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class TwoFactorService
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a new 16-character Base32 secret key.
     */
    public function generateSecretKey(): string
    {
        $secret = '';
        $charsLen = strlen(self::BASE32_CHARS);

        for ($i = 0; $i < 16; $i++) {
            $secret .= self::BASE32_CHARS[random_int(0, $charsLen - 1)];
        }

        return $secret;
    }

    /**
     * Generate standard otpauth:// URL for authenticator apps.
     */
    public function getOtpAuthUrl(string $issuer, string $accountName, string $secret): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode($issuer),
            rawurlencode($accountName),
            $secret,
            rawurlencode($issuer)
        );
    }

    /**
     * Generate an SVG data URI or online QR code URL for displaying the QR code in UI.
     */
    public function getQrCodeUrl(string $issuer, string $accountName, string $secret): string
    {
        $otpauth = $this->getOtpAuthUrl($issuer, $accountName, $secret);

        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='.urlencode($otpauth);
    }

    /**
     * Verify a 6-digit TOTP code against a Base32 secret.
     */
    public function verifyCode(string $secret, string $code, int $discrepancy = 1): bool
    {
        $cleanCode = trim(str_replace(' ', '', $code));
        if (strlen($cleanCode) !== 6 || ! ctype_digit($cleanCode)) {
            return false;
        }

        $currentTimeSlice = (int) floor(time() / 30);

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = $this->calculateCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculatedCode, $cleanCode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate a 6-digit code for a given secret and time slice.
     */
    public function calculateCode(string $secret, int $timeSlice): string
    {
        $secretBinary = $this->base32Decode($secret);
        $timeBytes = pack('N*', 0).pack('N*', $timeSlice);

        $hmac = hash_hmac('sha1', $timeBytes, $secretBinary, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;

        $fourBytes = substr($hmac, $offset, 4);
        $value = unpack('N', $fourBytes)[1] & 0x7FFFFFFF;

        $modulo = $value % 1000000;

        return str_pad((string) $modulo, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate 10 one-time recovery codes.
     *
     * @return array<int, string>
     */
    public function generateRecoveryCodes(int $count = 10): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $part1 = Str::random(5);
            $part2 = Str::random(5);
            $codes[] = strtolower("{$part1}-{$part2}");
        }

        return $codes;
    }

    /**
     * Check and consume a recovery code for the user.
     */
    public function verifyAndConsumeRecoveryCode(User $user, string $code): bool
    {
        $cleanCode = strtolower(trim($code));
        $storedCodes = $user->two_factor_recovery_codes;

        if (empty($storedCodes) || ! is_array($storedCodes)) {
            return false;
        }

        $foundIndex = null;
        foreach ($storedCodes as $index => $stored) {
            if (hash_equals(strtolower($stored), $cleanCode)) {
                $foundIndex = $index;
                break;
            }
        }

        if ($foundIndex === null) {
            return false;
        }

        // Consume the code
        unset($storedCodes[$foundIndex]);
        $user->two_factor_recovery_codes = array_values($storedCodes);
        $user->save();

        AuditLogger::log('admin.2fa_recovery_used', [
            'user_id' => $user->id,
            'metadata' => [
                'remaining_codes' => count($storedCodes),
            ],
        ]);

        return true;
    }

    /**
     * Base32 decode implementation.
     */
    private function base32Decode(string $b32): string
    {
        $b32 = strtoupper(trim($b32));
        $binary = '';

        foreach (str_split($b32) as $char) {
            $val = strpos(self::BASE32_CHARS, $char);
            if ($val === false) {
                continue;
            }
            $binary .= sprintf('%05b', $val);
        }

        $bytes = '';
        $chunks = str_split($binary, 8);
        foreach ($chunks as $chunk) {
            if (strlen($chunk) === 8) {
                $bytes .= chr(bindec($chunk));
            }
        }

        return $bytes;
    }
}
