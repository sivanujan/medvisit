<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class PendingRegistration extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'email',
        'phone',
        'token',
        'code_hash',
        'phone_code_hash',
        'attempts',
        'phone_attempts',
        'expires_at',
        'phone_expires_at',
        'resend_available_at',
        'phone_resend_available_at',
        'verified_at',
        'phone_verified_at',
        'phone_signed_token',
        'payload',
        'ip_address',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'phone_expires_at' => 'datetime',
            'resend_available_at' => 'datetime',
            'phone_resend_available_at' => 'datetime',
            'verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'attempts' => 'integer',
            'phone_attempts' => 'integer',
        ];
    }

    /**
     * Determine if the verification code has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Determine if the registration email has already been verified.
     */
    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    /**
     * Determine if the maximum number of attempts (5) has been reached.
     */
    public function hasExceededAttempts(): bool
    {
        return $this->attempts >= 5;
    }

    /**
     * Determine if the phone verification code has expired.
     */
    public function isPhoneExpired(): bool
    {
        return $this->phone_expires_at === null || $this->phone_expires_at->isPast();
    }

    /**
     * Determine if the registration phone has already been verified.
     */
    public function isPhoneVerified(): bool
    {
        return $this->phone_verified_at !== null;
    }

    /**
     * Determine if the maximum number of phone attempts (5) has been reached.
     */
    public function hasExceededPhoneAttempts(): bool
    {
        return $this->phone_attempts >= 5;
    }

    /**
     * Decrypt and decode the registration wizard data payload.
     *
     * @return array<string, mixed>
     */
    public function getDecryptedPayload(): array
    {
        try {
            $json = Crypt::decryptString($this->payload);

            return (array) json_decode($json, true);
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Set the encrypted payload from array.
     *
     * @param  array<string, mixed>  $data
     */
    public function setEncryptedPayload(array $data): void
    {
        $this->payload = Crypt::encryptString(json_encode($data));
    }
}
