<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use App\Services\SessionGeneratorService;
use Illuminate\Console\Command;

class CleanupDuplicateSessionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:cleanup-duplicate-sessions {tenant? : The tenant ID or subdomain} {--tenant= : The tenant ID or subdomain}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Find and clean up duplicate and overlapping doctor sessions and templates across tenants.';

    /**
     * Execute the console command.
     */
    public function handle(SessionGeneratorService $generator): int
    {
        $tenantId = (string) ($this->option('tenant') ?: $this->argument('tenant'));
        $tenants = $tenantId
            ? Tenant::where('id', $tenantId)->orWhere('subdomain', $tenantId)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('No matching tenants found.');

            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $this->info("Scanning tenant '{$tenant->id}' ({$tenant->name}) for duplicates and overlaps...");
            tenancy()->initialize($tenant);

            $deletedSessionsCount = 0;
            $deletedTemplatesCount = 0;

            // 1. Clean up duplicate/overlapping session templates
            $templates = SessionTemplate::with('doctor')
                ->where('tenant_id', $tenant->id)
                ->orderBy('id')
                ->get();

            $keptTemplates = [];
            foreach ($templates as $tpl) {
                // Check if this template overlaps with any already kept template for this doctor
                $doctorOverlap = false;
                foreach ($keptTemplates as $kept) {
                    if ($kept->doctor_id === $tpl->doctor_id && $kept->day_of_week === $tpl->day_of_week) {
                        if ($kept->start_time < $tpl->end_time && $kept->end_time > $tpl->start_time) {
                            $doctorOverlap = true;
                            break;
                        }
                    }
                }

                // Check if this template's room conflicts with another doctor's already kept template
                $roomConflict = false;
                if (! empty($tpl->room_number)) {
                    foreach ($keptTemplates as $kept) {
                        if ($kept->room_number === $tpl->room_number && $kept->day_of_week === $tpl->day_of_week && $kept->doctor_id !== $tpl->doctor_id) {
                            if ($kept->start_time < $tpl->end_time && $kept->end_time > $tpl->start_time) {
                                $roomConflict = true;
                                break;
                            }
                        }
                    }
                }

                if ($doctorOverlap || $roomConflict) {
                    // Check if this template has any booked tokens
                    $hasBookings = DoctorSession::where('session_template_id', $tpl->id)
                        ->whereHas('tokens', fn ($q) => $q->whereNotIn('status', ['cancelled']))
                        ->exists();

                    if (! $hasBookings) {
                        // Safe to delete duplicate template and its empty generated sessions
                        DoctorSession::where('session_template_id', $tpl->id)->delete();
                        $tpl->delete();
                        $deletedTemplatesCount++;
                        $reason = $doctorOverlap ? 'doctor schedule overlap' : 'room conflict';
                        $this->line("  - Removed duplicate template #{$tpl->id} ({$tpl->title} on Day {$tpl->day_of_week}) due to {$reason}.");

                        continue;
                    }
                }

                $keptTemplates[] = $tpl;
            }

            // 2. Clean up duplicate/overlapping doctor sessions on the same date
            $sessions = DoctorSession::with(['doctor', 'tokens'])
                ->where('tenant_id', $tenant->id)
                ->orderBy('session_date')
                ->orderBy('start_time')
                ->get();

            $grouped = $sessions->groupBy(fn ($s) => $s->session_date->format('Y-m-d'));

            foreach ($grouped as $date => $dateSessions) {
                $keptDateSessions = [];

                // Sort so sessions with active bookings are processed first and kept
                $sorted = $dateSessions->sortByDesc(fn ($s) => $s->tokens->where('status', '!=', 'cancelled')->count());

                foreach ($sorted as $s) {
                    $overlap = false;
                    foreach ($keptDateSessions as $kept) {
                        if ($kept->doctor_id === $s->doctor_id) {
                            if ($kept->start_time < $s->end_time && $kept->end_time > $s->start_time) {
                                $overlap = true;
                                break;
                            }
                        }
                    }

                    if ($overlap) {
                        $activeBookings = $s->tokens->where('status', '!=', 'cancelled')->count();
                        if ($activeBookings === 0) {
                            $s->delete();
                            $deletedSessionsCount++;
                            $this->line("  - Removed overlapping session #{$s->id} on {$date} for Dr. {$s->doctor?->name} ({$s->start_time}-{$s->end_time}).");

                            continue;
                        }
                    }

                    $keptDateSessions[] = $s;
                }
            }

            // 3. Ensure clean schedule for next 30 days
            $newGenerated = $generator->generateForTenant($tenant, 30);

            $this->info("Completed for tenant '{$tenant->id}':");
            $this->info("  - Removed {$deletedTemplatesCount} duplicate template(s)");
            $this->info("  - Removed {$deletedSessionsCount} overlapping session(s)");
            $this->info("  - Generated/verified {$newGenerated} active session(s)");
        }

        return self::SUCCESS;
    }
}
