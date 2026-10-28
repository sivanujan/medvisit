<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class DiagnosisTag extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'usage_count',
    ];

    protected function casts(): array
    {
        return [
            'usage_count' => 'integer',
        ];
    }

    public function prescriptions(): BelongsToMany
    {
        return $this->belongsToMany(Prescription::class, 'prescription_diagnosis_tag');
    }
}
