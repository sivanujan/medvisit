<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\Tenants\TrialEndedMail;
use App\Mail\Tenants\TrialEndingSoonMail;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendTrialRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:send-trial-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch trial expiration reminder emails to clinic administrators';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking clinic trials for reminder dispatches...');

        $now = now();
        $inThreeDays = $now->copy()->addDays(3);

        $endingRemindersDispatched = 0;
        $endedRemindersDispatched = 0;

        // 1. Process "Trial ending in 3 days" (only once per tenant)
        $endingSoonTenants = Tenant::where('status', 'trial')
            ->whereNotNull('trial_ends_at')
            ->whereNull('trial_ending_reminder_sent_at')
            ->where('trial_ends_at', '>', $now)
            ->where('trial_ends_at', '<=', $inThreeDays)
            ->with(['users'])
            ->get();

        foreach ($endingSoonTenants as $tenant) {
            $admins = $tenant->users->filter(function ($user) {
                return $user->hasRole('clinic_admin');
            });

            if ($admins->isEmpty()) {
                $admins = $tenant->users;
            }

            foreach ($admins as $admin) {
                Mail::to($admin->email)->queue(new TrialEndingSoonMail($tenant, $admin));
            }

            $tenant->update(['trial_ending_reminder_sent_at' => $now]);
            Log::info("Dispatched trial-ending reminder for tenant [{$tenant->id}]");
            $endingRemindersDispatched++;
        }

        // 2. Process "Trial ended" (only once per tenant)
        $endedTenants = Tenant::where('status', 'trial')
            ->whereNotNull('trial_ends_at')
            ->whereNull('trial_ended_reminder_sent_at')
            ->where('trial_ends_at', '<=', $now)
            ->with(['users'])
            ->get();

        foreach ($endedTenants as $tenant) {
            $admins = $tenant->users->filter(function ($user) {
                return $user->hasRole('clinic_admin');
            });

            if ($admins->isEmpty()) {
                $admins = $tenant->users;
            }

            foreach ($admins as $admin) {
                Mail::to($admin->email)->queue(new TrialEndedMail($tenant, $admin));
            }

            $tenant->update(['trial_ended_reminder_sent_at' => $now]);
            Log::info("Dispatched trial-ended reminder for tenant [{$tenant->id}]");
            $endedRemindersDispatched++;
        }

        $this->info("Completed: {$endingRemindersDispatched} trial-ending, {$endedRemindersDispatched} trial-ended reminders queued.");

        return Command::SUCCESS;
    }
}
