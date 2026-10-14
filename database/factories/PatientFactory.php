<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    protected $model = Patient::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->name(),
            'nic' => fake()->numerify('199########0'),
            'phone' => '+94 '.fake()->numerify('7# ### ####'),
            'email' => fake()->safeEmail(),
            'gender' => fake()->randomElement(['male', 'female']),
            'date_of_birth' => fake()->dateTimeBetween('-70 years', '-10 years')->format('Y-m-d'),
            'district' => 'Colombo',
            'city' => 'Colombo 03',
            'address' => fake()->address(),
            'allergies' => fake()->randomElement([null, 'Penicillin', 'Sulfa drugs', 'None']),
        ];
    }
}
