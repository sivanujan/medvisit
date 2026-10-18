<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = fake()->company().' Clinic';
        $subdomain = Str::slug(fake()->unique()->word()).'-'.fake()->numberBetween(10, 99);

        return [
            'id' => $subdomain,
            'name' => $name,
            'subdomain' => $subdomain,
            'phone' => '+94 11 '.fake()->numerify('### ####'),
            'address' => fake()->streetAddress().', Colombo, Sri Lanka',
            'plan' => 'trial',
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(14),
            'require_phone_verification' => false,
            'phone_verification_methods' => ['whatsapp', 'textlk'],
            'data' => [
                'clinic_type' => 'medical centre',
                'district' => 'Colombo',
                'city' => 'Colombo',
                'currency' => 'LKR',
                'timezone' => 'Asia/Colombo',
                'token_reset' => 'daily',
            ],
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => 'active',
            'plan' => 'standard',
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn () => [
            'status' => 'suspended',
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'status' => 'trial',
            'trial_ends_at' => now()->subDay(),
        ]);
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Tenant $tenant) {
            $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
            $tenant->domains()->firstOrCreate(['domain' => $tenant->subdomain]);
            $tenant->domains()->firstOrCreate(['domain' => "{$tenant->subdomain}.{$baseDomain}"]);
        });
    }
}
