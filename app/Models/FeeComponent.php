<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class FeeComponent extends Model
{
    use BelongsToTenant, HasFactory;

    public const AMOUNT_TYPE_FIXED = 'fixed';

    public const AMOUNT_TYPE_PERCENT_COMPONENT = 'percent_component';

    public const AMOUNT_TYPE_PERCENT_SUBTOTAL = 'percent_subtotal';

    public const RECIPIENT_DOCTOR = 'doctor';

    public const RECIPIENT_CLINIC = 'clinic';

    public const RECIPIENT_THIRD_PARTY = 'third_party';

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'amount_type',
        'target_component_id',
        'amount_value',
        'recipient',
        'recipient_type',
        'recipient_name',
        'applies_to',
        'is_mandatory',
        'is_separate_line',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'amount_value' => 'integer',
            'applies_to' => 'array',
            'is_mandatory' => 'boolean',
            'is_separate_line' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function targetComponent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'target_component_id');
    }

    public function setRecipientTypeAttribute(?string $value): void
    {
        $this->attributes['recipient'] = $value;
    }

    public function getRecipientTypeAttribute(): ?string
    {
        return $this->attributes['recipient'] ?? null;
    }
}
