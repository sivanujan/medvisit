<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Doctor>
 */
class DoctorFactory extends Factory
{
    protected $model = Doctor::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->name(),
            'title' => 'Dr.',
            'specialty' => fake()->randomElement([
                'General Physician',
                'Consultant Cardiologist',
                'Pediatrician',
                'Dermatologist',
                'ENT Surgeon',
                'Orthopedic Surgeon',
            ]),
            'slmc_number' => 'SLMC-'.fake()->numerify('#####'),
            'phone' => '+94 '.fake()->numerify('7# ### ####'),
            'email' => fake()->safeEmail(),
            'doctor_fee' => fake()->numberBetween(150000, 350000), // Rs. 1500 - 3500
            'clinic_fee' => fake()->numberBetween(40000, 80000),   // Rs. 400 - 800
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ];
    }
}
