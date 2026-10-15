<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\DoctorLeave;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use Carbon\Carbon;
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
    public function handle(): int
    {
        $days = (int) $this->option('days');
        if ($days <= 0) {
            $days = 30;
        }

        $tenantOption = $this->option('tenant');
        $tenants = $tenantOption ? Tenant::where('id', $tenantOption)->get() : Tenant::all();

        $totalGenerated = 0;

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);

            $templates = SessionTemplate::with('doctor')
                ->where('is_active', true)
                ->whereHas('doctor', fn ($q) => $q->where('is_active', true))
                ->get();

            if ($templates->isEmpty()) {
                continue;
            }

            $leaves = DoctorLeave::all();

            $startDate = Carbon::today('Asia/Colombo');
            $endDate = (clone $startDate)->addDays($days);

            for ($date = clone $startDate; $date->lte($endDate); $date->addDay()) {
                $dayOfWeek = $date->dayOfWeek;
                $dateString = $date->toDateString();

                $matchingTemplates = $templates->where('day_of_week', $dayOfWeek);

                foreach ($matchingTemplates as $template) {
                    $isOnLeave = $leaves->contains(function (DoctorLeave $leave) use ($template, $dateString) {
                        return $leave->doctor_id === $template->doctor_id
                            && $leave->start_date->toDateString() <= $dateString
                            && $leave->end_date->toDateString() >= $dateString;
                    });

                    if ($isOnLeave) {
                        continue;
                    }

                    // Idempotent check
                    $exists = DoctorSession::where('doctor_id', $template->doctor_id)
                        ->where('session_template_id', $template->id)
                        ->where('session_date', $dateString)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    DoctorSession::create([
                        'tenant_id' => $tenant->id,
                        'doctor_id' => $template->doctor_id,
                        'session_template_id' => $template->id,
                        'session_date' => $dateString,
                        'start_time' => $template->start_time,
                        'end_time' => $template->end_time,
                        'max_tokens' => $template->max_patients,
                        'mode' => $template->mode ?? 'token',
                        'status' => 'scheduled',
                        'room_number' => $template->room_number ?? 'Room 1',
                        'doctor_fee' => $template->doctor_fee ?? $template->doctor->doctor_fee,
                        'clinic_fee' => $template->clinic_fee ?? $template->doctor->clinic_fee,
                        'current_token_number' => 0,
                    ]);

                    $totalGenerated++;
                }
            }

            tenancy()->end();
        }

        $this->info("Generated {$totalGenerated} doctor session(s) successfully across ".count($tenants).' clinic(s).');

        return self::SUCCESS;
    }
}
