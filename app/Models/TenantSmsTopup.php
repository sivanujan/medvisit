<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSmsTopup extends Model
{
    protected $table = 'tenant_sms_topups';

    protected $fillable = [
        'tenant_id',
        'pack_id',
        'credits_total',
        'credits_remaining',
        'price_cents',
        'invoice_id',
        'payment_id',
        'expires_at',
    ];

    protected $casts = [
        'credits_total' => 'integer',
        'credits_remaining' => 'integer',
        'price_cents' => 'integer',
        'expires_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('credits_remaining', '>', 0)
            ->where('expires_at', '>', Carbon::now('Asia/Colombo'));
    }
}
