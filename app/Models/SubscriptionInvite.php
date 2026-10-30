<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SubscriptionInvite extends Model
{
    use HasFactory;

    public const STATUS_SENT = 'sent';

    public const STATUS_REGISTERED = 'registered';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'recipient_email',
        'recipient_name',
        'clinic_name',
        'plan_slug',
        'free_period_type',
        'free_period_value',
        'token_hash',
        'status',
        'expires_at',
        'registered_at',
        'registered_tenant_id',
        'registered_user_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'free_period_value' => 'integer',
        'expires_at' => 'datetime',
        'registered_at' => 'datetime',
    ];

    public static function hashToken(string $plainToken): string
    {
        return hash('sha256', trim($plainToken));
    }

    public static function createWithToken(array $attributes, ?string $token = null): array
    {
        $plainToken = $token ?: Str::random(48);
        $attributes['token_hash'] = self::hashToken($plainToken);
        $attributes['status'] = $attributes['status'] ?? self::STATUS_SENT;
        $attributes['expires_at'] = $attributes['expires_at'] ?? now()->addDays(14);

        $invite = self::create($attributes);

        return [
            'invite' => $invite,
            'plain_token' => $plainToken,
        ];
    }

    public static function findByToken(string $plainToken): ?self
    {
        return self::where('token_hash', self::hashToken($plainToken))->first();
    }

    public function markRegistered(string $tenantId, ?int $userId = null): void
    {
        $this->update([
            'status' => self::STATUS_REGISTERED,
            'registered_at' => now(),
            'registered_tenant_id' => $tenantId,
            'registered_user_id' => $userId,
        ]);
    }

    public function isValid(): bool
    {
        return $this->status === self::STATUS_SENT && $this->expires_at->isFuture();
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registeredTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'registered_tenant_id');
    }

    public function registeredUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_user_id');
    }
}
