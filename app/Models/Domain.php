<?php

declare(strict_types=1);

namespace App\Models;

use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

class Domain extends BaseDomain
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'domain',
        'tenant_id',
        'status',
        'verified_at',
        'last_checked_at',
        'dns_records',
        'failure_reason',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'last_checked_at' => 'datetime',
        'dns_records' => 'array',
    ];

    public function isVerified(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->verified_at !== null;
    }
}
