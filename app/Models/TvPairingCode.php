<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class TvPairingCode extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'code',
        'device_name',
        'doctor_ids',
        'expires_at',
        'used_at',
        'created_by',
    ];

    protected $casts = [
        'doctor_ids' => 'array',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    public function isValid(): bool
    {
        return ! $this->isExpired() && ! $this->isUsed();
    }

    public function markAsUsed(): void
    {
        $this->update(['used_at' => now()]);
    }

    /**
     * Generate a unique 6-digit numeric pairing code valid for 10 minutes.
     *
     * @param  array<int>|null  $doctorIds
     */
    public static function createCode(string $tenantId, ?int $createdBy = null, string $deviceName = 'Waiting Room TV', ?array $doctorIds = null): self
    {
        do {
            $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        } while (static::where('tenant_id', $tenantId)->where('code', $code)->where('expires_at', '>', now())->whereNull('used_at')->exists());

        return static::create([
            'tenant_id' => $tenantId,
            'code' => $code,
            'device_name' => $deviceName,
            'doctor_ids' => $doctorIds,
            'expires_at' => now()->addMinutes(10),
            'created_by' => $createdBy,
        ]);
    }
}
