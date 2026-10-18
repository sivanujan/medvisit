<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Patient extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'nic',
        'phone',
        'email',
        'gender',
        'date_of_birth',
        'district',
        'city',
        'address',
        'allergies',
        'notes',
        'emergency_contact_name',
        'emergency_contact_phone',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
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

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class)->latest('id');
    }
}
