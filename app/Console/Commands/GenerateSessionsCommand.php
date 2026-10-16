<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\SessionGeneratorService;
use Illuminate\Console\Command;

class GenerateSessionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:generate-sessions {tenant? : Optional specific tenant ID} {--days=30 : Number of days ahead to generate sessions for}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate concrete doctor channeling sessions from recurring weekly templates for all or a specific tenant.';

    /**
     * Execute the console command.
     */
    public function handle(SessionGeneratorService $generator): int
    {
        $tenantId = $this->argument('tenant');
        $days = (int) $this->option('days');
        if ($days <= 0) {
            $days = 30;
        }

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if (! $tenant) {
                $this->error("Tenant '{$tenantId}' not found.");

                return self::FAILURE;
            }

            $count = $generator->generateForTenant($tenant, $days);
            $this->info("Generated {$count} session(s) for tenant '{$tenantId}' over the next {$days} days.");

            return self::SUCCESS;
        }

        $results = $generator->generateForAllTenants($days);
        $total = array_sum($results);

        foreach ($results as $id => $count) {
            $this->line(" - Tenant {$id}: {$count} session(s)");
        }

        $this->info("Total {$total} session(s) generated across ".count($results).' tenant(s).');

        return self::SUCCESS;
    }
}
