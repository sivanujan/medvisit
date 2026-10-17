<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtpLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'channel',
        'phone_masked',
        'status',
        'provider_message_id',
        'cost',
        'sms_count',
        'error',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
