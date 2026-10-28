<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\BookingToken;
use App\Models\DoctorSession;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Console\Command;

class DemoRefreshTodayCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'demo:refresh-today';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Refresh demo clinic session times to ensure at least two live in-progress sessions during current Colombo time.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tenantId = (string) config('demo.tenant_id', 'demo');
        $tenant = Tenant::find($tenantId);

        if (! $tenant || ! $tenant->is_demo) {
            $this->error("Abort! Tenant '{$tenantId}' is not an active demo tenant.");

            return self::FAILURE;
        }

        if (! $tenant->online_booking_enabled || ! $tenant->require_phone_verification) {
            $tenant->update([
                'online_booking_enabled' => true,
                'require_phone_verification' => true,
            ]);
        }

        $now = Carbon::now('Asia/Colombo');
        $today = $now->toDateString();

        // Find today's sessions
        $sessions = DoctorSession::where('tenant_id', $tenantId)
            ->where('session_date', $today)
            ->get();

        if ($sessions->isEmpty()) {
            $this->info("No sessions found for today ({$today}). Run demo:reset to generate them.");

            return self::SUCCESS;
        }

        // Shift Session 1: Dr. Nimal Senaratne (starts 1 hour ago, ends in 2 hours) -> In Progress
        $sess1 = $sessions->firstWhere('doctor_token_code', 'NS');
        if ($sess1) {
            $sess1->update([
                'start_time' => $now->copy()->subMinutes(60)->format('H:i:s'),
                'end_time' => $now->copy()->addMinutes(120)->format('H:i:s'),
                'status' => 'in_progress',
                'current_token_number' => 4,
            ]);

            // Ensure tokens 1-3 completed, token 4 called, token 5 checked-in
            BookingToken::where('doctor_session_id', $sess1->id)
                ->where('token_number', '<', 4)
                ->update(['status' => BookingToken::STATUS_COMPLETED]);

            BookingToken::where('doctor_session_id', $sess1->id)
                ->where('token_number', 4)
                ->update([
                    'status' => BookingToken::STATUS_CALLED,
                    'called_at' => $now->copy()->subMinutes(3),
                ]);

            BookingToken::where('doctor_session_id', $sess1->id)
                ->where('token_number', 5)
                ->update(['status' => BookingToken::STATUS_CHECKED_IN]);
        }

        // Shift Session 2: Dr. Arul Pragasam (starts 30 mins ago, ends in 2.5 hours) -> In Progress
        $sess2 = $sessions->firstWhere('doctor_token_code', 'AP');
        if ($sess2) {
            $sess2->update([
                'start_time' => $now->copy()->subMinutes(30)->format('H:i:s'),
                'end_time' => $now->copy()->addMinutes(150)->format('H:i:s'),
                'status' => 'in_progress',
                'current_token_number' => 3,
            ]);

            BookingToken::where('doctor_session_id', $sess2->id)
                ->where('token_number', '<', 3)
                ->update(['status' => BookingToken::STATUS_COMPLETED]);

            BookingToken::where('doctor_session_id', $sess2->id)
                ->where('token_number', 3)
                ->update([
                    'status' => BookingToken::STATUS_CALLED,
                    'called_at' => $now->copy()->subMinutes(2),
                ]);
        }

        $this->info("✓ Demo clinic today sessions successfully shifted relative to {$now->format('H:i:s')} Colombo time.");

        return self::SUCCESS;
    }
}
