<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SyncClinicDirectoryListing;
use App\Models\Tenant;
use Illuminate\Console\Command;

class SyncDirectoryCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'directory:sync {--tenant= : Specific tenant ID to sync}';

    /**
     * The console command description.
     */
    protected $description = 'Sync opted-in clinic listings and public doctors to the central medvisit.lk directory';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $specificTenant = $this->option('tenant');

        if ($specificTenant) {
            $this->info("Syncing directory listing for tenant: {$specificTenant}");
            SyncClinicDirectoryListing::dispatchSync((string) $specificTenant);
            $this->info('Done.');

            return self::SUCCESS;
        }

        $this->info('Finding all eligible clinics for directory sync...');

        $tenants = Tenant::all();
        $count = 0;

        foreach ($tenants as $tenant) {
            SyncClinicDirectoryListing::dispatchSync((string) $tenant->id);
            $count++;
        }

        $this->info("Dispatched directory sync for {$count} tenants.");

        return self::SUCCESS;
    }
}
