<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\BookingToken;
use App\Models\DoctorSession;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BookingToken>
 */
class BookingTokenFactory extends Factory
{
    protected $model = BookingToken::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn (array $attrs) => DoctorSession::find($attrs['doctor_session_id'])?->tenant_id,
            'doctor_session_id' => DoctorSession::factory(),
            'patient_id' => Patient::factory(),
            'token_number' => fake()->numberBetween(1, 30),
            'estimated_time' => now()->addMinutes(30),
            'status' => BookingToken::STATUS_BOOKED,
            'booked_via' => 'reception',
            'signed_cancel_token' => Str::random(40),
        ];
    }
}
