<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanMatrixSeeder extends Seeder
{
    public function run(): void
    {
        $tiers = config('plans.tiers', []);

        foreach ($tiers as $slug => $data) {
            Plan::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $data['name'],
                    'price_cents' => (int) $data['price_cents'],
                    'billing_interval' => $data['billing_interval'] ?? 'month',
                    'description' => $data['description'] ?? null,
                    'limits' => $data['limits'] ?? [],
                    'features' => $data['features'] ?? [],
                    'is_active' => true,
                    'is_public' => (bool) ($data['is_public'] ?? true),
                ]
            );
        }
    }
}
