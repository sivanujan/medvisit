<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class PrescriptionTemplateItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'prescription_template_id',
        'clinic_medicine_id',
        'medicine_variant_id',
        'generic_name',
        'strength_text',
        'dosage_form',
        'brand_name',
        'display_name',
        'source',
        'dose_amount',
        'dose_unit',
        'dose_display',
        'frequency',
        'frequency_text',
        'duration_days',
        'timing',
        'quantity',
        'instructions',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'dose_amount' => 'decimal:3',
            'duration_days' => 'integer',
            'quantity' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PrescriptionTemplate::class, 'prescription_template_id');
    }

    public function clinicMedicine(): BelongsTo
    {
        return $this->belongsTo(ClinicMedicine::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(MedicineVariant::class, 'medicine_variant_id');
    }
}
