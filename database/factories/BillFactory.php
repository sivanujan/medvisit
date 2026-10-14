<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Bill;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bill>
 */
class BillFactory extends Factory
{
    protected $model = Bill::class;

    public function definition(): array
    {
        $doctorFee = 200000;
        $clinicFee = 50000;
        $total = $doctorFee + $clinicFee;

        return [
            'tenant_id' => Tenant::factory(),
            'patient_id' => Patient::factory(),
            'doctor_id' => Doctor::factory(),
            'receipt_number' => 'REC-'.fake()->unique()->numerify('######'),
            'doctor_fee' => $doctorFee,
            'clinic_fee' => $clinicFee,
            'other_fee' => 0,
            'discount' => 0,
            'total_amount' => $total,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
        ];
    }
}
