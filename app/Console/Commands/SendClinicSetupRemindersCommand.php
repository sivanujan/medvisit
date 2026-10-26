<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\Clinic\ClinicSetupReminderMail;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendClinicSetupRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'clinic:send-setup-reminders';

    /**
     * The console command description.
     */
    protected $description = 'Send a one-time reminder to clinic admins who have not completed setup within 24 hours';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cutoff = Carbon::now()->subHours(24);

        $tenants = Tenant::whereNull('setup_completed_at')
            ->whereNull('setup_reminder_sent_at')
            ->where(function ($query) use ($cutoff) {
                // Activated/created at least 24h ago
                $query->where('created_at', '<=', $cutoff)
                    ->orWhereHas('subscriptions', function ($subQuery) use ($cutoff) {
                        $subQuery->where('status', 'active')
                            ->where('created_at', '<=', $cutoff);
                    });
            })
            ->get();

        $count = 0;

        foreach ($tenants as $tenant) {
            /** @var User|null $admin */
            $admin = $tenant->users()
                ->whereHas('roles', fn ($q) => $q->where('name', 'clinic_admin'))
                ->first() ?? $tenant->users()->first();

            if (! $admin || empty($admin->email)) {
                continue;
            }

            try {
                $setupUrl = $tenant->url('/setup');
                $daysRemaining = $tenant->setupGraceDaysRemaining();

                Mail::to($admin->email)->send(
                    new ClinicSetupReminderMail($tenant, $setupUrl, $daysRemaining)
                );

                $tenant->update(['setup_reminder_sent_at' => Carbon::now()]);
                $count++;

                Log::info("Sent clinic setup reminder to {$admin->email} for tenant [{$tenant->id}]");
            } catch (\Throwable $e) {
                Log::error("Failed sending clinic setup reminder for tenant [{$tenant->id}]: {$e->getMessage()}");
            }
        }

        $this->info("Dispatched {$count} setup reminder email(s).");

        return self::SUCCESS;
    }
}
