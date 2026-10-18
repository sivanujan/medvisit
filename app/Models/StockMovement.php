<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use LogicException;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class StockMovement extends Model
{
    use BelongsToTenant, HasFactory;

    public const TYPE_RECEIPT = 'receipt';

    public const TYPE_OPENING_STOCK = 'opening_stock';

    public const TYPE_ADJUSTMENT_IN = 'adjustment_in';

    public const TYPE_ADJUSTMENT_OUT = 'adjustment_out';

    public const TYPE_EXPIRED = 'expired';

    public const TYPE_DAMAGED = 'damaged';

    public const TYPE_RETURN_TO_SUPPLIER = 'return_to_supplier';

    public const TYPE_DISPENSE = 'dispense';

    public const TYPE_VOID = 'void';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'clinic_medicine_id',
        'stock_batch_id',
        'type',
        'quantity',
        'reason',
        'reference_type',
        'reference_id',
        'user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (! $model->created_at) {
                $model->created_at = now();
            }
        });

        static::updating(function () {
            throw new LogicException('Stock movements are append-only and cannot be updated.');
        });

        static::deleting(function () {
            throw new LogicException('Stock movements are append-only and cannot be deleted.');
        });
    }

    public function clinicMedicine(): BelongsTo
    {
        return $this->belongsTo(ClinicMedicine::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(StockBatch::class, 'stock_batch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
