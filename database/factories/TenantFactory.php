<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Models\Subscription;
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
            'setup_completed_at' => now(),
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

    public function pendingPayment(): static
    {
        return $this->afterCreating(function (Tenant $tenant) {
            $plan = Plan::firstOrCreate(
                ['slug' => 'medvisit-standard'],
                ['name' => 'MedVisit Standard', 'price_cents' => 500000, 'billing_interval' => 'month', 'is_active' => true]
            );

            Subscription::updateOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'plan_id' => $plan->id,
                    'status' => Subscription::STATUS_PENDING_PAYMENT,
                    'current_period_start' => now(),
                    'current_period_end' => null,
                    'created_by' => 'factory',
                ]
            );
        });
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Tenant $tenant) {
            $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
            $tenant->domains()->firstOrCreate(['domain' => $tenant->subdomain]);
            $tenant->domains()->firstOrCreate(['domain' => "{$tenant->subdomain}.{$baseDomain}"]);

            // Default to grandfathered complimentary subscription if active
            if ($tenant->status === 'active' || ($tenant->trial_ends_at && $tenant->trial_ends_at->isFuture())) {
                $compPlan = Plan::firstOrCreate(
                    ['slug' => 'comp'],
                    ['name' => 'Complimentary', 'price_cents' => 0, 'billing_interval' => 'month', 'is_active' => true]
                );

                Subscription::firstOrCreate(
                    ['tenant_id' => $tenant->id],
                    [
                        'plan_id' => $compPlan->id,
                        'status' => Subscription::STATUS_ACTIVE,
                        'current_period_start' => now(),
                        'current_period_end' => null,
                        'activated_at' => now(),
                        'created_by' => 'factory',
                    ]
                );
            }
        });
    }
}
