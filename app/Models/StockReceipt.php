<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class StockReceipt extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_RECEIVED = 'received';

    public const STATUS_VOIDED = 'voided';

    protected $attributes = [
        'status' => self::STATUS_RECEIVED,
    ];

    protected $fillable = [
        'tenant_id',
        'receipt_number',
        'status',
        'supplier_id',
        'invoice_number',
        'received_date',
        'notes',
        'total_cost_cents',
        'created_by',
        'voided_at',
        'voided_by',
        'void_reason',
    ];

    protected function casts(): array
    {
        return [
            'received_date' => 'date',
            'total_cost_cents' => 'integer',
            'voided_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function voidedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }
}
