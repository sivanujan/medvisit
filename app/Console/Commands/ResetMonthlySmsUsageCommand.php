<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantSmsUsage;
use Illuminate\Console\Command;

class ResetMonthlySmsUsageCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:reset-monthly-sms';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Daily check to initialize new SMS usage cycles when each clinic\'s billing period renews';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking active clinics for billing period renewal and SMS quota reset...');

        $tenants = Tenant::where('status', 'active')->get();
        $newCyclesCreated = 0;

        foreach ($tenants as $tenant) {
            $latestUsage = TenantSmsUsage::where('tenant_id', $tenant->id)
                ->orderBy('period_start', 'desc')
                ->first();

            $currentUsage = TenantSmsUsage::currentForTenant($tenant);

            if (! $latestUsage || $currentUsage->id !== $latestUsage->id) {
                $newCyclesCreated++;
                $this->line("Initialized new SMS quota cycle for clinic [{$tenant->id}] ({$currentUsage->period_start->toDateString()} to {$currentUsage->period_end->toDateString()}).");
            }
        }

        $this->info("SMS usage renewal check completed. {$newCyclesCreated} new cycle(s) created.");

        return self::SUCCESS;
    }
}
