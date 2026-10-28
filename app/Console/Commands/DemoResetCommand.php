<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\AuditLogger;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class DemoResetCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'demo:reset {--force : Force reset without interactive confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Wipe and deterministically reseed the public sandbox demo clinic (03:00 Asia/Colombo).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tenantId = (string) config('demo.tenant_id', 'demo');
        $subdomain = (string) config('demo.subdomain', 'demo');

        $tenant = Tenant::find($tenantId);

        // Strict Abort-Guard: Ensure target tenant is marked is_demo = true AND matches configured subdomain
        if (! $tenant) {
            $this->info("Demo tenant '{$tenantId}' not found. Seeding initial demo clinic sandbox...");
            $this->call(DemoClinicSeeder::class);
            $tenant = Tenant::find($tenantId);
            if (! $tenant) {
                $this->error("Abort! Demo tenant '{$tenantId}' could not be created.");

                return self::FAILURE;
            }
        }

        if (! $tenant->is_demo) {
            $this->error("SECURITY ABORT! Tenant '{$tenantId}' does NOT have is_demo = true. Aborting immediately to protect live/dev data.");

            return self::FAILURE;
        }

        if ($tenant->subdomain !== $subdomain) {
            $this->error("SECURITY ABORT! Tenant subdomain '{$tenant->subdomain}' does not match configured demo subdomain '{$subdomain}'. Aborting.");

            return self::FAILURE;
        }

        $this->warn("Resetting public sandbox demo clinic '{$tenant->name}' ({$tenant->subdomain})...");

        // Execute deterministic seeder
        $seeder = new DemoClinicSeeder;
        $seeder->run();

        // Flush tenant cache tags if applicable
        Cache::flush();

        // Audit log
        AuditLogger::log('demo.sandbox_reset_completed', [
            'resource' => $tenant,
            'metadata' => [
                'tenant_id' => $tenantId,
                'subdomain' => $subdomain,
                'reset_at' => now()->toIso8601String(),
            ],
        ]);

        $this->info('✓ Public demo sandbox has been reset successfully. Fresh sessions and demo state are live.');

        return self::SUCCESS;
    }
}
