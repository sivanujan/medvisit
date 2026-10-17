<?php

declare(strict_types=1);

namespace App\Services\PhoneVerification;

use App\Models\OtpLog;
use App\Models\PhoneVerification;
use App\Models\Tenant;
use App\Models\VerifiedPhone;
use App\Services\PhoneVerification\Contracts\ChannelDriverInterface;
use App\Services\PhoneVerification\Drivers\FakeChannelDriver;
use App\Services\PhoneVerification\Drivers\LogChannelDriver;
use App\Services\PhoneVerification\Drivers\TextLkChannelDriver;
use App\Services\PhoneVerification\Drivers\WhatsAppChannelDriver;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PhoneVerificationService
{
    /**
     * @var array<string, ChannelDriverInterface>
     */
    protected array $drivers = [];

    public function __construct()
    {
        $this->registerDefaultDrivers();
    }

    protected function registerDefaultDrivers(): void
    {
        $this->drivers['whatsapp'] = new WhatsAppChannelDriver;
        $this->drivers['textlk'] = new TextLkChannelDriver;
        $this->drivers['log'] = new LogChannelDriver;
        $this->drivers['fake'] = new FakeChannelDriver;
    }

    public function setDriver(string $name, ChannelDriverInterface $driver): self
    {
        $this->drivers[$name] = $driver;

        return $this;
    }

    public function getDriver(string $name): ChannelDriverInterface
    {
        if (isset($this->drivers[$name])) {
            return $this->drivers[$name];
        }

        // Fallback for local testing if requested
        if (app()->environment('local', 'testing')) {
            return $this->drivers['log'];
        }

        throw new \InvalidArgumentException("Unsupported phone verification channel: {$name}");
    }

    /**
     * Normalise Sri Lankan phone number to +947XXXXXXXX format.
     */
    public function normalizePhone(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw);

        if (empty($digits)) {
            return '';
        }

        // If starts with 94 followed by 9 digits
        if (str_starts_with($digits, '94') && strlen($digits) >= 11) {
            return '+94'.substr($digits, 2, 9);
        }

        // If starts with 0 (e.g. 0771234567)
        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            return '+94'.substr($digits, 1, 9);
        }

        // If 9 digits starting with 7 (e.g. 771234567)
        if (strlen($digits) === 9 && str_starts_with($digits, '7')) {
            return '+94'.$digits;
        }

        // Generic fallback for international numbers
        return '+'.$digits;
    }

    /**
     * Mask phone number for public/audit display (e.g. +94 77 *** *567).
     */
    public function maskPhone(string $phone): string
    {
        $norm = $this->normalizePhone($phone);
        if (strlen($norm) < 8) {
            return $norm;
        }

        $prefix = substr($norm, 0, 6);
        $suffix = substr($norm, -3);

        return "{$prefix} *** *{$suffix}";
    }

    /**
     * Get list of available verification channels for clinic/platform.
     *
     * @return array<int, string>
     */
    public function getAvailableChannels(?Tenant $tenant = null): array
    {
        $platformChannels = config('phone_verification.channels', ['whatsapp', 'textlk']);

        if ($tenant && ! empty($tenant->phone_verification_methods) && is_array($tenant->phone_verification_methods)) {
            $allowed = array_intersect($platformChannels, $tenant->phone_verification_methods);

            return array_values($allowed);
        }

        return $platformChannels;
    }

    /**
     * Check if a phone number is currently verified and valid (180 days retention or signed cookie).
     */
    public function isPhoneVerified(string $phone, ?Tenant $tenant = null, ?string $cookieToken = null): bool
    {
        $normalized = $this->normalizePhone($phone);
        if (empty($normalized)) {
            return false;
        }

        // 1. Check signed cookie token
        if ($cookieToken && $this->verifyCookiePayload($cookieToken) === $normalized) {
            return true;
        }

        // 2. Check verified_phones table
        return VerifiedPhone::where('phone', $normalized)
            ->where('expires_at', '>', Carbon::now())
            ->exists();
    }

    /**
     * Create a tamper-proof signed cookie string for verified phones (180 days).
     */
    public function createCookiePayload(string $phone): string
    {
        $normalized = $this->normalizePhone($phone);
        $expiresAt = Carbon::now()->addDays(config('phone_verification.verified_retention_days', 180))->timestamp;
        $signature = hash_hmac('sha256', "{$normalized}|{$expiresAt}", (string) config('app.key'));

        return base64_encode("{$normalized}|{$expiresAt}|{$signature}");
    }

    /**
     * Verify cookie payload and return phone if valid.
     */
    public function verifyCookiePayload(?string $cookie): ?string
    {
        if (empty($cookie)) {
            return null;
        }

        $decoded = base64_decode($cookie, true);
        if ($decoded === false) {
            return null;
        }

        $parts = explode('|', $decoded);
        if (count($parts) !== 3) {
            return null;
        }

        [$phone, $expiresAt, $signature] = $parts;

        if ((int) $expiresAt < Carbon::now()->timestamp) {
            return null;
        }

        $expectedSig = hash_hmac('sha256', "{$phone}|{$expiresAt}", (string) config('app.key'));
        if (! hash_equals($expectedSig, $signature)) {
            return null;
        }

        return $phone;
    }

    /**
     * Start a phone verification attempt.
     *
     * @return array{
     *     success: bool,
     *     verification_id?: int,
     *     channel?: string,
     *     expires_in_seconds?: int,
     *     error?: string,
     *     data?: array<string, mixed>
     * }
     */
    public function startVerification(
        string $rawPhone,
        string $channel,
        string $sessionId,
        ?Tenant $tenant = null
    ): array {
        $normalized = $this->normalizePhone($rawPhone);
        if (empty($normalized) || strlen($normalized) < 9) {
            return [
                'success' => false,
                'error' => 'Please enter a valid mobile phone number.',
            ];
        }

        $available = $this->getAvailableChannels($tenant);
        if (! in_array($channel, $available, true) && ! in_array($channel, ['log', 'fake'], true)) {
            return [
                'success' => false,
                'error' => "Verification channel '{$channel}' is not enabled.",
            ];
        }

        // Rate Limit: Max 5 attempts per phone per hour
        $maxPerHour = config('phone_verification.max_attempts_per_hour', 5);
        $recentAttempts = PhoneVerification::where('phone', $normalized)
            ->where('created_at', '>=', Carbon::now()->subHour())
            ->count();

        if ($recentAttempts >= $maxPerHour) {
            return [
                'success' => false,
                'error' => 'Too many verification attempts for this number. Please wait an hour before trying again.',
            ];
        }

        // Generate 6-digit random code
        $plainCode = sprintf('%06d', random_int(100000, 999999));
        $codeHash = hash('sha256', $plainCode);

        // Mark any existing pending attempt for this session and phone as expired
        PhoneVerification::where('session_id', $sessionId)
            ->where('phone', $normalized)
            ->where('status', PhoneVerification::STATUS_PENDING)
            ->update(['status' => PhoneVerification::STATUS_EXPIRED]);

        $expiryMinutes = config('phone_verification.expiry_minutes', 10);
        $expiresAt = Carbon::now()->addMinutes($expiryMinutes);

        $verification = PhoneVerification::create([
            'tenant_id' => $tenant?->id,
            'session_id' => $sessionId,
            'phone' => $normalized,
            'channel' => $channel,
            'code_hash' => $codeHash,
            'status' => PhoneVerification::STATUS_PENDING,
            'attempts' => 0,
            'expires_at' => $expiresAt,
        ]);

        // Choose driver
        $driverChannel = $channel;
        if ($channel === 'textlk' && empty(config('services.textlk.api_token')) && app()->environment('local', 'testing')) {
            $driverChannel = app()->environment('testing') ? 'fake' : 'log';
        }

        $driver = $this->getDriver($driverChannel);
        $result = $driver->send($verification, $plainCode);

        // Audit log (masked phone, no codes)
        OtpLog::create([
            'tenant_id' => $tenant?->id,
            'channel' => $channel,
            'phone_masked' => $this->maskPhone($normalized),
            'status' => $result['success'] ? 'sent' : 'failed',
            'provider_message_id' => $result['provider_message_id'] ?? null,
            'error' => $result['error'] ?? null,
        ]);

        if (! $result['success']) {
            $verification->update(['status' => PhoneVerification::STATUS_FAILED]);

            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to send verification code.',
            ];
        }

        $responseData = $result['data'] ?? [];
        if (app()->environment('local') && ($channel === 'textlk' || $channel === 'log')) {
            $responseData['dev_code'] = $plainCode;
        }

        return [
            'success' => true,
            'verification_id' => $verification->id,
            'channel' => $channel,
            'phone' => $normalized,
            'expires_in_seconds' => $expiryMinutes * 60,
            'data' => $responseData,
        ];
    }

    /**
     * Check verification status (useful for polling during WhatsApp reverse verification).
     */
    public function checkStatus(int|string $verificationId, ?string $sessionId = null): array
    {
        $query = PhoneVerification::where('id', $verificationId);
        if ($sessionId) {
            $query->where('session_id', $sessionId);
        }

        $verification = $query->first();

        if (! $verification) {
            return [
                'found' => false,
                'is_verified' => false,
                'status' => 'not_found',
            ];
        }

        if ($verification->status === PhoneVerification::STATUS_PENDING && $verification->isExpired()) {
            $verification->update(['status' => PhoneVerification::STATUS_EXPIRED]);
        }

        return [
            'found' => true,
            'is_verified' => $verification->status === PhoneVerification::STATUS_VERIFIED,
            'status' => $verification->status,
            'channel' => $verification->channel,
            'phone' => $verification->phone,
            'mismatch_phone' => $verification->mismatch_phone,
            'mismatch_error' => ! empty($verification->mismatch_phone)
                ? "The WhatsApp message came from a different number ({$verification->mismatch_phone}). Please send it from {$verification->phone} or change the number."
                : null,
            'attempts' => $verification->attempts,
        ];
    }

    /**
     * Verify submitted 6-digit code (Path B).
     *
     * @return array{
     *     success: bool,
     *     error?: string,
     *     attempts_remaining?: int,
     *     cookie?: string
     * }
     */
    public function verifyCode(int|string $verificationId, string $code, ?Tenant $tenant = null): array
    {
        $verification = PhoneVerification::find($verificationId);

        if (! $verification) {
            return [
                'success' => false,
                'error' => 'Verification attempt not found. Please request a new code.',
            ];
        }

        if ($verification->status === PhoneVerification::STATUS_VERIFIED) {
            return [
                'success' => true,
                'cookie' => $this->createCookiePayload($verification->phone),
            ];
        }

        if ($verification->isExpired() || $verification->status === PhoneVerification::STATUS_EXPIRED) {
            $verification->update(['status' => PhoneVerification::STATUS_EXPIRED]);

            return [
                'success' => false,
                'error' => 'The verification code has expired. Please request a new code.',
            ];
        }

        $maxCodeAttempts = config('phone_verification.max_code_attempts', 5);
        if ($verification->attempts >= $maxCodeAttempts || $verification->status === PhoneVerification::STATUS_FAILED) {
            $verification->update(['status' => PhoneVerification::STATUS_FAILED]);

            return [
                'success' => false,
                'error' => 'Too many incorrect attempts. Please request a new code.',
            ];
        }

        $submittedHash = hash('sha256', trim($code));

        if (hash_equals($verification->code_hash, $submittedHash)) {
            $verification->update([
                'status' => PhoneVerification::STATUS_VERIFIED,
                'verified_at' => Carbon::now(),
            ]);

            $this->markVerified($verification->phone, $verification->channel, $tenant);

            OtpLog::create([
                'tenant_id' => $tenant?->id ?? $verification->tenant_id,
                'channel' => $verification->channel,
                'phone_masked' => $this->maskPhone($verification->phone),
                'status' => 'verified',
            ]);

            return [
                'success' => true,
                'cookie' => $this->createCookiePayload($verification->phone),
            ];
        }

        // Mismatch: increment attempts
        $newAttempts = $verification->attempts + 1;
        $remaining = max(0, $maxCodeAttempts - $newAttempts);
        $newStatus = $remaining <= 0 ? PhoneVerification::STATUS_FAILED : PhoneVerification::STATUS_PENDING;

        $verification->update([
            'attempts' => $newAttempts,
            'status' => $newStatus,
        ]);

        if ($remaining <= 0) {
            OtpLog::create([
                'tenant_id' => $tenant?->id ?? $verification->tenant_id,
                'channel' => $verification->channel,
                'phone_masked' => $this->maskPhone($verification->phone),
                'status' => 'failed',
                'error' => 'Max attempts exceeded',
            ]);

            return [
                'success' => false,
                'error' => 'Too many incorrect code attempts. Please request a new code.',
                'attempts_remaining' => 0,
            ];
        }

        return [
            'success' => false,
            'error' => "Incorrect verification code. {$remaining} ".($remaining === 1 ? 'attempt' : 'attempts').' remaining.',
            'attempts_remaining' => $remaining,
        ];
    }

    /**
     * Mark a phone number verified in verified_phones cache (180 days).
     */
    public function markVerified(string $phone, string $channel, ?Tenant $tenant = null): VerifiedPhone
    {
        $normalized = $this->normalizePhone($phone);
        $retentionDays = config('phone_verification.verified_retention_days', 180);

        return VerifiedPhone::updateOrCreate(
            ['phone' => $normalized],
            [
                'tenant_id' => $tenant?->id,
                'channel' => $channel,
                'verified_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addDays($retentionDays),
            ]
        );
    }
}
