<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class PrescriptionTemplate extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'name',
        'description',
        'condition_tags',
        'is_shared',
        'usage_count',
        'last_used_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_shared' => 'boolean',
            'condition_tags' => 'array',
            'usage_count' => 'integer',
            'last_used_at' => 'datetime',
        ];
    }

    public function recordUsage(): void
    {
        $this->increment('usage_count');
        $this->update(['last_used_at' => now()]);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PrescriptionTemplateItem::class)->orderBy('sort_order');
    }
}
