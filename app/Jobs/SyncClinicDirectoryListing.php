<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncClinicDirectoryListing implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of seconds the job can run before timing out.
     */
    public int $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $tenantId
    ) {}

    /**
     * The unique ID of the job.
     */
    public function uniqueId(): string
    {
        return $this->tenantId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        /** @var Tenant|null $tenant */
        $tenant = Tenant::find($this->tenantId);

        if (! $tenant) {
            DirectoryListing::where('tenant_id', $this->tenantId)->delete();

            return;
        }

        // 1. Check opt-in toggle
        $data = is_array($tenant->data) ? $tenant->data : [];
        $isOptedIn = (bool) ($tenant->directory_enabled ?? ($data['directory_enabled'] ?? false));

        // 2. Check tenant usability & active subscription
        $isUsable = $tenant->isUsable();
        $hasActiveSub = $tenant->hasActiveSubscription();

        // 3. Check allowed plan
        $allowedPlans = config('medvisit_public.directory.allowed_plans', ['*']);
        $isPlanAllowed = in_array('*', $allowedPlans, true) || in_array($tenant->plan, $allowedPlans, true);

        // 4. Check required coordinates and district
        $lat = $tenant->directory_latitude ?? ($data['directory_latitude'] ?? null);
        $lng = $tenant->directory_longitude ?? ($data['directory_longitude'] ?? null);
        $district = $tenant->directory_district ?? ($data['directory_district'] ?? ($tenant->district ?? ($data['district'] ?? null)));
        $city = $tenant->directory_city ?? ($data['directory_city'] ?? ($tenant->city ?? ($data['city'] ?? $district)));
        $phone = $tenant->phone;

        // Fetch active public doctors
        $activeDoctors = Doctor::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        $hasRequiredFields = $isOptedIn
            && $isUsable
            && $hasActiveSub
            && $isPlanAllowed
            && ! empty($district)
            && ! empty($phone)
            && $lat !== null
            && $lng !== null
            && $activeDoctors->isNotEmpty();

        if (! $hasRequiredFields) {
            // Turning off or missing requirements removes the listing immediately
            DirectoryListing::where('tenant_id', $tenant->id)->delete();

            return;
        }

        // 5. Upsert directory listing
        $listing = DirectoryListing::updateOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'clinic_name' => $tenant->name,
                'slug' => $tenant->subdomain,
                'district' => (string) $district,
                'city' => (string) $city,
                'address' => $tenant->address,
                'latitude' => (float) $lat,
                'longitude' => (float) $lng,
                'phone' => $phone,
                'whatsapp' => $tenant->whatsapp ?? ($tenant->whatsapp_number ?? ($data['whatsapp_number'] ?? null)),
                'logo_url' => $tenant->logo_url,
                'description' => ! empty($tenant->directory_description) ? substr((string) $tenant->directory_description, 0, 300) : (! empty($data['directory_description']) ? substr((string) $data['directory_description'], 0, 300) : null),
                'services' => $tenant->directory_services ?? ($data['directory_services'] ?? ['OPD Consultation', 'Specialist Channeling']),
                'online_booking_enabled' => (bool) ($tenant->online_booking_enabled ?? true),
                'is_active' => true,
                'consented_at' => $tenant->directory_consented_at ? Carbon::parse($tenant->directory_consented_at) : (isset($data['directory_consented_at']) ? Carbon::parse($data['directory_consented_at']) : now()),
                'consented_by_user_id' => $tenant->directory_consented_by_user_id ?? ($data['directory_consented_by_user_id'] ?? null),
                'doctor_count' => $activeDoctors->count(),
            ]
        );

        // 6. Sync active doctors
        $syncedDoctorIds = [];
        $dayNames = [
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
        ];

        foreach ($activeDoctors as $doctor) {
            $syncedDoctorIds[] = $doctor->id;

            // Resolve templates for weekly schedule
            $templates = SessionTemplate::where('tenant_id', $tenant->id)
                ->where('doctor_id', $doctor->id)
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get();

            $schedules = [];
            if ($templates->isNotEmpty()) {
                foreach ($templates as $tpl) {
                    $schedules[] = [
                        'day_of_week' => $tpl->day_of_week,
                        'day_name' => $dayNames[$tpl->day_of_week] ?? "Day {$tpl->day_of_week}",
                        'start_time' => Carbon::parse($tpl->start_time)->format('h:i A'),
                        'end_time' => Carbon::parse($tpl->end_time)->format('h:i A'),
                        'room' => $tpl->room_number ?? 'Suite 1',
                    ];
                }
            } else {
                // Fallback to next upcoming distinct sessions within next 14 days
                $upcoming = DoctorSession::where('tenant_id', $tenant->id)
                    ->where('doctor_id', $doctor->id)
                    ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
                    ->where('session_date', '<=', Carbon::today('Asia/Colombo')->addDays(14)->toDateString())
                    ->whereNotIn('status', ['cancelled'])
                    ->orderBy('session_date')
                    ->orderBy('start_time')
                    ->limit(5)
                    ->get();

                foreach ($upcoming as $sess) {
                    $sDate = $sess->session_date instanceof Carbon ? $sess->session_date : Carbon::parse($sess->session_date);
                    $schedules[] = [
                        'day_of_week' => $sDate->dayOfWeek,
                        'day_name' => $sDate->format('l, M d'),
                        'start_time' => Carbon::parse($sess->start_time)->format('h:i A'),
                        'end_time' => Carbon::parse($sess->end_time)->format('h:i A'),
                        'room' => $sess->room_number ?? 'Suite 1',
                    ];
                }
            }

            $minFeeCents = (int) ($doctor->doctor_fee + $doctor->clinic_fee);

            DirectoryDoctor::updateOrCreate(
                [
                    'directory_listing_id' => $listing->id,
                    'doctor_id' => $doctor->id,
                ],
                [
                    'tenant_id' => $tenant->id,
                    'name' => $doctor->name,
                    'title' => $doctor->title ?? 'Dr.',
                    'specialty' => $doctor->specialty,
                    'slug' => $doctor->slug,
                    'photo_url' => $doctor->photo_url,
                    'min_fee_cents' => $minFeeCents > 0 ? $minFeeCents : null,
                    'session_schedules' => $schedules,
                    'is_active' => true,
                ]
            );
        }

        // Clean up doctors no longer active or removed
        DirectoryDoctor::where('directory_listing_id', $listing->id)
            ->whereNotIn('doctor_id', $syncedDoctorIds)
            ->delete();

        Log::info("Synced directory listing for tenant: {$tenant->id} with {$activeDoctors->count()} doctors.");
    }
}
