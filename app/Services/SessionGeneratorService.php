<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use Carbon\Carbon;

class SessionGeneratorService
{
    /**
     * Generate sessions for a specific doctor for the given number of days ahead.
     * Idempotent: will not create duplicate sessions.
     */
    public function generateForDoctor(Doctor $doctor, int $days = 14): int
    {
        if (! $doctor->is_active) {
            return 0;
        }

        $templates = SessionTemplate::where('doctor_id', $doctor->id)
            ->where('is_active', true)
            ->get();

        $total = 0;
        foreach ($templates as $template) {
            $total += $this->generateForTemplate($template, $days);
        }

        return $total;
    }

    /**
     * Generate sessions for a specific session template for the given number of days ahead.
    /**
     * Generate sessions for a specific session template for the given number of days ahead or custom date range.
     * Idempotent: will not create duplicate sessions for the same doctor, template, and date.
     */
    public function generateForTemplate(
        SessionTemplate $template,
        int $days = 30,
        ?Carbon $customStartDate = null,
        ?Carbon $customEndDate = null
    ): int {
        if (! $template->is_active) {
            return 0;
        }

        $template->loadMissing('doctor');
        if (! $template->doctor || ! $template->doctor->is_active) {
            return 0;
        }

        $leaves = DoctorLeave::where('doctor_id', $template->doctor_id)->get();
        $startDate = $customStartDate ? $customStartDate->copy()->startOfDay() : Carbon::today('Asia/Colombo');
        $endDate = $customEndDate ? $customEndDate->copy()->startOfDay() : (clone $startDate)->addDays($days);

        $generated = 0;
        $tenantId = $template->tenant_id ?? tenant('id');

        for ($date = clone $startDate; $date->lte($endDate); $date->addDay()) {
            if ($date->dayOfWeek !== (int) $template->day_of_week) {
                continue;
            }

            $dateString = $date->toDateString();

            // Check if doctor is on leave
            $onLeave = $leaves->contains(function (DoctorLeave $leave) use ($dateString) {
                $start = $leave->start_date instanceof Carbon ? $leave->start_date->toDateString() : substr((string) $leave->start_date, 0, 10);
                $end = $leave->end_date instanceof Carbon ? $leave->end_date->toDateString() : substr((string) $leave->end_date, 0, 10);

                return $start <= $dateString && $end >= $dateString;
            });

            if ($onLeave) {
                continue;
            }

            // Check if session already exists for this template and date (strict idempotency)
            $exists = DoctorSession::where('tenant_id', $tenantId)
                ->where('doctor_id', $template->doctor_id)
                ->where('session_template_id', $template->id)
                ->where('session_date', $dateString)
                ->exists();

            if ($exists) {
                continue;
            }

            // Check if doctor already has an active overlapping session on this date
            $overlap = DoctorSession::where('tenant_id', $tenantId)
                ->where('doctor_id', $template->doctor_id)
                ->where('session_date', $dateString)
                ->whereNotIn('status', ['cancelled'])
                ->where('start_time', '<', $template->end_time)
                ->where('end_time', '>', $template->start_time)
                ->exists();

            if ($overlap) {
                continue;
            }

            DoctorSession::create([
                'tenant_id' => $tenantId,
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
                'fee_override_type' => $template->fee_override_type ?? 'inherit',
                'custom_doctor_fee' => $template->custom_doctor_fee,
                'custom_clinic_fee' => $template->custom_clinic_fee,
                'custom_total_fee' => $template->custom_total_fee,
                'payout_rule_override' => $template->payout_rule_override,
                'current_token_number' => 0,
            ]);

            $generated++;
        }

        return $generated;
    }

    /**
     * Preview generation counts without making any database changes.
     *
     * @return array{
     *     will_create: int,
     *     already_exists: int,
     *     on_leave: int,
     *     doctor_overlap: int,
     *     total_scanned: int
     * }
     */
    public function previewForTenant(
        Tenant|string $tenant,
        ?Carbon $customStartDate = null,
        ?Carbon $customEndDate = null,
        array $doctorIds = []
    ): array {
        $tenantModel = is_string($tenant) ? Tenant::findOrFail($tenant) : $tenant;

        $wasInitialized = tenancy()->initialized;
        $originalTenant = $wasInitialized ? tenant() : null;

        if (! $wasInitialized || $originalTenant?->id !== $tenantModel->id) {
            tenancy()->initialize($tenantModel);
        }

        try {
            $query = SessionTemplate::with('doctor')
                ->where('is_active', true)
                ->whereHas('doctor', fn ($q) => $q->where('is_active', true));

            if (! empty($doctorIds)) {
                $query->whereIn('doctor_id', $doctorIds);
            }

            $templates = $query->get();
            $startDate = $customStartDate ? $customStartDate->copy()->startOfDay() : Carbon::today('Asia/Colombo');
            $endDate = $customEndDate ? $customEndDate->copy()->startOfDay() : (clone $startDate)->addDays(30);

            $willCreate = 0;
            $alreadyExists = 0;
            $onLeaveCount = 0;
            $overlapCount = 0;
            $totalScanned = 0;

            $tenantId = $tenantModel->id;

            foreach ($templates as $template) {
                $leaves = DoctorLeave::where('doctor_id', $template->doctor_id)->get();

                for ($date = clone $startDate; $date->lte($endDate); $date->addDay()) {
                    if ($date->dayOfWeek !== (int) $template->day_of_week) {
                        continue;
                    }

                    $totalScanned++;
                    $dateString = $date->toDateString();

                    // Check leave
                    $onLeave = $leaves->contains(function (DoctorLeave $leave) use ($dateString) {
                        $start = $leave->start_date instanceof Carbon ? $leave->start_date->toDateString() : substr((string) $leave->start_date, 0, 10);
                        $end = $leave->end_date instanceof Carbon ? $leave->end_date->toDateString() : substr((string) $leave->end_date, 0, 10);

                        return $start <= $dateString && $end >= $dateString;
                    });

                    if ($onLeave) {
                        $onLeaveCount++;

                        continue;
                    }

                    // Check already exists
                    $exists = DoctorSession::where('tenant_id', $tenantId)
                        ->where('doctor_id', $template->doctor_id)
                        ->where('session_template_id', $template->id)
                        ->where('session_date', $dateString)
                        ->exists();

                    if ($exists) {
                        $alreadyExists++;

                        continue;
                    }

                    // Check overlap
                    $overlap = DoctorSession::where('tenant_id', $tenantId)
                        ->where('doctor_id', $template->doctor_id)
                        ->where('session_date', $dateString)
                        ->whereNotIn('status', ['cancelled'])
                        ->where('start_time', '<', $template->end_time)
                        ->where('end_time', '>', $template->start_time)
                        ->exists();

                    if ($overlap) {
                        $overlapCount++;

                        continue;
                    }

                    $willCreate++;
                }
            }

            return [
                'will_create' => $willCreate,
                'already_exists' => $alreadyExists,
                'on_leave' => $onLeaveCount,
                'doctor_overlap' => $overlapCount,
                'total_scanned' => $totalScanned,
            ];
        } finally {
            if ($wasInitialized && $originalTenant) {
                if (tenant('id') !== $originalTenant->id) {
                    tenancy()->initialize($originalTenant);
                }
            } elseif (! $wasInitialized) {
                tenancy()->end();
            }
        }
    }

    /**
     * Generate sessions for active templates in a tenant, optionally filtered by date range and doctors.
     */
    public function generateForTenant(
        Tenant|string $tenant,
        int $days = 30,
        ?Carbon $customStartDate = null,
        ?Carbon $customEndDate = null,
        array $doctorIds = []
    ): int {
        $tenantModel = is_string($tenant) ? Tenant::findOrFail($tenant) : $tenant;

        $wasInitialized = tenancy()->initialized;
        $originalTenant = $wasInitialized ? tenant() : null;

        if (! $wasInitialized || $originalTenant?->id !== $tenantModel->id) {
            tenancy()->initialize($tenantModel);
        }

        try {
            $query = SessionTemplate::with('doctor')
                ->where('is_active', true)
                ->whereHas('doctor', fn ($q) => $q->where('is_active', true));

            if (! empty($doctorIds)) {
                $query->whereIn('doctor_id', $doctorIds);
            }

            $templates = $query->get();

            $total = 0;
            foreach ($templates as $template) {
                $total += $this->generateForTemplate($template, $days, $customStartDate, $customEndDate);
            }

            // Record latest generation metadata on tenant
            $tenantModel->setSetting('sessions_last_generated_at', now()->toIso8601String());

            return $total;
        } finally {
            if ($wasInitialized && $originalTenant) {
                if (tenant('id') !== $originalTenant->id) {
                    tenancy()->initialize($originalTenant);
                }
            } elseif (! $wasInitialized) {
                tenancy()->end();
            }
        }
    }

    /**
     * Generate sessions across all existing tenants.
     *
     * @return array<string, int> Map of tenant ID to count of sessions generated.
     */
    public function generateForAllTenants(int $days = 30): array
    {
        $tenants = Tenant::all();
        $results = [];

        foreach ($tenants as $t) {
            $results[$t->id] = $this->generateForTenant($t, $days);
        }

        return $results;
    }
}
