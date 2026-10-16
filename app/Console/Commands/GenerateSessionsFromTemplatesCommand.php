<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\SessionGeneratorService;
use Illuminate\Console\Command;

class GenerateSessionsFromTemplatesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sessions:generate-from-templates {--days=30 : Number of days ahead to generate sessions for} {--tenant= : Optional specific tenant ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate concrete doctor channeling sessions from recurring weekly templates for the next 30 days.';

    /**
     * Execute the console command.
     */
    public function handle(SessionGeneratorService $generator): int
    {
        $days = (int) $this->option('days');
        if ($days <= 0) {
            $days = 30;
        }

        $tenantOption = $this->option('tenant');

        if ($tenantOption) {
            $tenant = Tenant::find($tenantOption);
            if (! $tenant) {
                $this->error("Tenant '{$tenantOption}' not found.");

                return self::FAILURE;
            }

            $count = $generator->generateForTenant($tenant, $days);
            $this->info("Generated {$count} doctor session(s) successfully for tenant '{$tenantOption}'.");

            return self::SUCCESS;
        }

        $results = $generator->generateForAllTenants($days);
        $total = array_sum($results);

        $this->info("Generated {$total} doctor session(s) successfully across ".count($results).' clinic(s).');

        return self::SUCCESS;
    }
}
