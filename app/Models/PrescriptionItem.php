<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class PrescriptionItem extends Model
{
    use BelongsToTenant, HasFactory;

    public const SOURCE_CLINIC = 'clinic';

    public const SOURCE_OUTSIDE = 'outside';

    protected $fillable = [
        'tenant_id',
        'prescription_id',
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
        'dispensed_quantity',
        'dispensed_clinic_medicine_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'dose_amount' => 'decimal:3',
            'duration_days' => 'integer',
            'quantity' => 'integer',
            'dispensed_quantity' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function clinicMedicine(): BelongsTo
    {
        return $this->belongsTo(ClinicMedicine::class, 'clinic_medicine_id');
    }

    public function dispensedClinicMedicine(): BelongsTo
    {
        return $this->belongsTo(ClinicMedicine::class, 'dispensed_clinic_medicine_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(MedicineVariant::class, 'medicine_variant_id');
    }

    public function itemBatches(): HasMany
    {
        return $this->hasMany(PrescriptionItemBatch::class);
    }

    public function billItem(): HasOne
    {
        return $this->hasOne(BillItem::class);
    }
}
