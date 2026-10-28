<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CompExistingTenantsCommand extends Command
{
    protected $signature = 'subscriptions:comp-existing';

    protected $description = 'Grant complimentary lifetime subscriptions to existing clinics that lack an active subscription';

    public function handle(): int
    {
        $compPlan = Plan::firstOrCreate(
            ['slug' => 'comp'],
            [
                'name' => 'Complimentary',
                'price_cents' => 0,
                'billing_interval' => 'month',
                'features' => [
                    'All MedVisit Features Included',
                    'Grandfathered Active Status (No Monthly Billing)',
                ],
                'is_active' => true,
            ]
        );

        $now = Carbon::now();
        $tenants = Tenant::all();
        $count = 0;

        foreach ($tenants as $tenant) {
            $existing = Subscription::where('tenant_id', $tenant->id)->first();
            if (! $existing) {
                Subscription::create([
                    'tenant_id' => $tenant->id,
                    'plan_id' => $compPlan->id,
                    'status' => Subscription::STATUS_ACTIVE,
                    'current_period_start' => $now,
                    'current_period_end' => null,
                    'activated_at' => $now,
                    'created_by' => 'migration',
                    'notes' => 'Existing clinic grandfathered on complimentary plan',
                ]);
                $count++;
                $this->info("Grandfathered clinic [{$tenant->name} ({$tenant->id})] with comp subscription.");
            }
        }

        $this->info("Completed. {$count} clinic(s) grandfathered.");

        return Command::SUCCESS;
    }
}
