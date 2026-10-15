<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class VisitType extends Model
{
    use BelongsToTenant, HasFactory;

    public const PRICING_PERCENTAGE = 'percentage';

    public const PRICING_FIXED = 'fixed';

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'pricing_type',
        'percentage_value',
        'fixed_fee_cents',
        'is_default',
        'is_active',
        'allow_online',
        'sort_order',
        'payout_rule_override',
    ];

    protected function casts(): array
    {
        return [
            'percentage_value' => 'integer',
            'fixed_fee_cents' => 'integer',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'allow_online' => 'boolean',
            'sort_order' => 'integer',
            'payout_rule_override' => 'array',
        ];
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(BookingToken::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }
}
