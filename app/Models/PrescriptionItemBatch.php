<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class PrescriptionItemBatch extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'prescription_item_id',
        'stock_batch_id',
        'stock_movement_id',
        'quantity',
        'cost_price_cents',
        'selling_price_cents',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'cost_price_cents' => 'integer',
            'selling_price_cents' => 'integer',
        ];
    }

    public function prescriptionItem(): BelongsTo
    {
        return $this->belongsTo(PrescriptionItem::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(StockBatch::class, 'stock_batch_id');
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }
}
