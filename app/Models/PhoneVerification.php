<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PhoneVerification extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_VERIFIED = 'verified';

    public const STATUS_FAILED = 'failed';

    public const STATUS_EXPIRED = 'expired';

    public const CHANNEL_WHATSAPP = 'whatsapp';

    public const CHANNEL_TEXTLK = 'textlk';

    public const CHANNEL_LOG = 'log';

    protected $fillable = [
        'tenant_id',
        'session_id',
        'phone',
        'channel',
        'code_hash',
        'status',
        'attempts',
        'expires_at',
        'verified_at',
        'mismatch_phone',
        'metadata',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isVerified(): bool
    {
        return $this->status === self::STATUS_VERIFIED;
    }
}
