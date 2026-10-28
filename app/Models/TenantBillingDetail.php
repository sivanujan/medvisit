<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantBillingDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'legal_name',
        'billing_email',
        'phone',
        'address',
        'tax_id',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
