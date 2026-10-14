<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Doctor;
use App\Models\DoctorSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DoctorSession>
 */
class DoctorSessionFactory extends Factory
{
    protected $model = DoctorSession::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn (array $attrs) => Doctor::find($attrs['doctor_id'])?->tenant_id,
            'doctor_id' => Doctor::factory(),
            'session_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 25,
            'mode' => 'token',
            'status' => 'scheduled',
            'room_number' => 'Room '.fake()->numberBetween(1, 6),
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'current_token_number' => 0,
        ];
    }
}
