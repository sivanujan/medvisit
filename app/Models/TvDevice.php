<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class TvDevice extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'device_token_hash',
        'doctor_ids',
        'last_seen_at',
        'revoked_at',
        'created_by',
    ];

    protected $casts = [
        'doctor_ids' => 'array',
        'last_seen_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function revoke(): void
    {
        $this->update(['revoked_at' => now()]);
    }

    public function touchLastSeen(): void
    {
        $this->update(['last_seen_at' => now()]);
    }

    /**
     * Generate a new 64-character random device token string.
     */
    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Hash a plain device token with SHA-256.
     */
    public static function hashToken(string $plain): string
    {
        return hash('sha256', $plain);
    }
}
