<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\User;
use App\Models\VisitType;
use App\Services\AuditLogger;
use App\Services\FeeResolutionService;
use App\Services\Media\ImageProcessingService;
use App\Services\SessionGeneratorService;
use App\Support\TokenHelper;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DoctorController extends Controller
{
    public function __construct(
        protected FeeResolutionService $feeService,
        protected SessionGeneratorService $sessionGenerator
    ) {}

    /**
     * Display a listing of doctors, templates, and leaves.
     */
    /**
     * WCAG AA accessible color palette for doctor badges and session blocks.
     * Incorporates brand palette (#1E6FD9 blue, #0E9E8F teal, #FF7A59 coral).
     */
    protected array $doctorPalette = [
        [
            'id' => 0,
            'bg' => 'bg-blue-500/10 dark:bg-blue-500/20',
            'border' => 'border-blue-500/40 dark:border-blue-400/40',
            'text' => 'text-blue-700 dark:text-blue-300',
            'badge' => 'bg-[#1E6FD9]',
            'hex' => '#1E6FD9',
            'name' => 'Blue',
            'gradient' => 'from-[#1E6FD9] to-blue-600',
        ],
        [
            'id' => 1,
            'bg' => 'bg-teal-500/10 dark:bg-teal-500/20',
            'border' => 'border-teal-500/40 dark:border-teal-400/40',
            'text' => 'text-teal-700 dark:text-teal-300',
            'badge' => 'bg-[#0E9E8F]',
            'hex' => '#0E9E8F',
            'name' => 'Teal',
            'gradient' => 'from-[#0E9E8F] to-emerald-600',
        ],
        [
            'id' => 2,
            'bg' => 'bg-orange-500/10 dark:bg-orange-500/20',
            'border' => 'border-orange-500/40 dark:border-orange-400/40',
            'text' => 'text-orange-700 dark:text-orange-300',
            'badge' => 'bg-[#FF7A59]',
            'hex' => '#FF7A59',
            'name' => 'Coral',
            'gradient' => 'from-[#FF7A59] to-amber-600',
        ],
        [
            'id' => 3,
            'bg' => 'bg-purple-500/10 dark:bg-purple-500/20',
            'border' => 'border-purple-500/40 dark:border-purple-400/40',
            'text' => 'text-purple-700 dark:text-purple-300',
            'badge' => 'bg-[#7C3AED]',
            'hex' => '#7C3AED',
            'name' => 'Purple',
            'gradient' => 'from-[#7C3AED] to-violet-600',
        ],
        [
            'id' => 4,
            'bg' => 'bg-rose-500/10 dark:bg-rose-500/20',
            'border' => 'border-rose-500/40 dark:border-rose-400/40',
            'text' => 'text-rose-700 dark:text-rose-300',
            'badge' => 'bg-[#E11D48]',
            'hex' => '#E11D48',
            'name' => 'Rose',
            'gradient' => 'from-[#E11D48] to-pink-600',
        ],
        [
            'id' => 5,
            'bg' => 'bg-cyan-500/10 dark:bg-cyan-500/20',
            'border' => 'border-cyan-500/40 dark:border-cyan-400/40',
            'text' => 'text-cyan-700 dark:text-cyan-300',
            'badge' => 'bg-[#0891B2]',
            'hex' => '#0891B2',
            'name' => 'Cyan',
            'gradient' => 'from-[#0891B2] to-teal-600',
        ],
        [
            'id' => 6,
            'bg' => 'bg-indigo-500/10 dark:bg-indigo-500/20',
            'border' => 'border-indigo-500/40 dark:border-indigo-400/40',
            'text' => 'text-indigo-700 dark:text-indigo-300',
            'badge' => 'bg-[#4F46E5]',
            'hex' => '#4F46E5',
            'name' => 'Indigo',
            'gradient' => 'from-[#4F46E5] to-blue-700',
        ],
        [
            'id' => 7,
            'bg' => 'bg-amber-500/10 dark:bg-amber-500/20',
            'border' => 'border-amber-500/40 dark:border-amber-400/40',
            'text' => 'text-amber-800 dark:text-amber-300',
            'badge' => 'bg-[#D97706]',
            'hex' => '#D97706',
            'name' => 'Amber',
            'gradient' => 'from-[#D97706] to-yellow-600',
        ],
    ];

    /**
     * Display a listing of doctors, templates, and leaves.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $feeSettings = $this->feeService->getTenantSettings($tenant);
        $todayColombo = Carbon::today('Asia/Colombo');

        $visitTypes = VisitType::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'pricing_type', 'percentage_value', 'fixed_fee_cents', 'is_default']);

        $doctors = Doctor::with(['user:id,name,email', 'sessionTemplates:id,doctor_id,day_of_week,is_active'])
            ->withCount([
                'sessionTemplates as templates_count',
                'sessions as upcoming_sessions_count' => function ($query) use ($todayColombo) {
                    $query->where('session_date', '>=', $todayColombo->toDateString())
                        ->whereNotIn('status', ['cancelled']);
                },
                'sessions as total_sessions_count',
                'bills as total_bills_count',
                'settlements as total_settlements_count',
                'prescriptions as total_prescriptions_count',
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($doc) use ($feeSettings, $tenant, $todayColombo) {
                $useDefault = (bool) ($doc->use_clinic_default_fees ?? true);
                $docFeeCents = ! $useDefault && $doc->custom_doctor_fee !== null ? $doc->custom_doctor_fee : ($doc->doctor_fee ?: ($feeSettings['default_doctor_fee'] ?? 200000));
                $clinicFeeCents = ! $useDefault && $doc->custom_clinic_fee !== null ? $doc->custom_clinic_fee : ($doc->clinic_fee ?: ($feeSettings['default_clinic_fee'] ?? 80000));
                $totalCents = ! $useDefault && $doc->custom_total_fee !== null ? $doc->custom_total_fee : ($docFeeCents + $clinicFeeCents);

                $paletteCount = count($this->doctorPalette);
                $color = $this->doctorPalette[$doc->id % $paletteCount];

                // Next upcoming session
                $nextSession = DoctorSession::where('doctor_id', $doc->id)
                    ->where('session_date', '>=', $todayColombo->toDateString())
                    ->whereNotIn('status', ['cancelled'])
                    ->orderBy('session_date')
                    ->orderBy('start_time')
                    ->first();

                $nextSessionFormatted = null;
                if ($nextSession) {
                    $dateStr = Carbon::parse($nextSession->session_date)->format('D d M');
                    $timeStr = Carbon::parse($nextSession->start_time)->format('h:i A');
                    $nextSessionFormatted = "{$dateStr} · {$timeStr}";
                }

                // Days of week doctor has active weekly templates (0=Sun, 1=Mon, ..., 6=Sat)
                $templateDays = $doc->sessionTemplates
                    ->where('is_active', true)
                    ->pluck('day_of_week')
                    ->unique()
                    ->values()
                    ->all();

                // Has history check: bookings, bills, settlements, prescriptions, or sessions
                $hasBookings = BookingToken::whereIn('doctor_session_id', $doc->sessions()->pluck('id'))->exists();
                $hasHistory = ($doc->total_sessions_count > 0)
                    || $hasBookings
                    || ($doc->total_bills_count > 0)
                    || ($doc->total_settlements_count > 0)
                    || ($doc->total_prescriptions_count > 0);

                $cleanSlmc = $doc->clean_slmc;

                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'title' => $doc->title ?? 'Dr.',
                    'full_title' => trim(($doc->title ?? 'Dr.').' '.$doc->name),
                    'specialty' => $doc->specialty,
                    'slmc_number' => $cleanSlmc ?: $doc->slmc_number,
                    'slmc_clean' => $cleanSlmc,
                    'slmc_display' => $doc->slmc_display,
                    'slug' => $doc->slug,
                    'booking_url' => $tenant->url("/book/{$doc->slug}"),
                    'phone' => $doc->phone,
                    'email' => $doc->email,
                    'photo_url' => $doc->photo_url,
                    'bio' => $doc->bio,
                    'color' => $color,
                    'token_code' => $doc->token_code,
                    'future_bookings_count' => $doc->future_bookings_count,
                    'use_clinic_default_fees' => $useDefault,
                    'pricing_mode' => $doc->pricing_mode ?? ($feeSettings['pricing_mode'] ?? 'split'),
                    'doctor_fee_cents' => $docFeeCents,
                    'clinic_fee_cents' => $clinicFeeCents,
                    'doctor_fee_lkr' => round($docFeeCents / 100, 2),
                    'clinic_fee_lkr' => round($clinicFeeCents / 100, 2),
                    'total_fee_lkr' => round($totalCents / 100, 2),
                    'total_fee_formatted' => 'Rs. '.number_format($totalCents / 100, 2),
                    'payout_rule' => $doc->payout_rule ?? ['type' => 'use_clinic_default'],
                    'visit_type_overrides' => $doc->visit_type_overrides ?? (object) [],
                    'avg_consultation_minutes' => $doc->avg_consultation_minutes,
                    'is_active' => (bool) $doc->is_active,
                    'user_id' => $doc->user_id,
                    'user' => $doc->user ? [
                        'id' => $doc->user->id,
                        'name' => $doc->user->name,
                        'email' => $doc->user->email,
                    ] : null,
                    'templates_count' => $doc->templates_count,
                    'upcoming_sessions_count' => $doc->upcoming_sessions_count,
                    'next_session' => $nextSessionFormatted,
                    'template_days' => $templateDays,
                    'has_history' => $hasHistory,
                ];
            });

        $templates = SessionTemplate::with(['doctor:id,name,title,specialty'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(function ($tpl) {
                $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                $paletteCount = count($this->doctorPalette);
                $color = $this->doctorPalette[$tpl->doctor_id % $paletteCount];

                // Count future generated sessions from this template
                $futureSessionsCount = DoctorSession::where('session_template_id', $tpl->id)
                    ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
                    ->whereNotIn('status', ['cancelled'])
                    ->count();

                return [
                    'id' => $tpl->id,
                    'doctor_id' => $tpl->doctor_id,
                    'doctor_name' => trim(($tpl->doctor?->title ?? 'Dr.').' '.($tpl->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $tpl->doctor?->specialty ?? '',
                    'doctor_color' => $color,
                    'title' => $tpl->title,
                    'day_of_week' => $tpl->day_of_week,
                    'day_name' => $dayNames[$tpl->day_of_week] ?? 'Day '.$tpl->day_of_week,
                    'start_time' => Carbon::parse($tpl->start_time)->format('h:i A'),
                    'end_time' => Carbon::parse($tpl->end_time)->format('h:i A'),
                    'start_time_raw' => substr((string) $tpl->start_time, 0, 5),
                    'end_time_raw' => substr((string) $tpl->end_time, 0, 5),
                    'max_patients' => $tpl->max_patients,
                    'room_number' => $tpl->room_number ?? 'Suite A',
                    'mode' => $tpl->mode,
                    'doctor_fee_cents' => $tpl->doctor_fee,
                    'clinic_fee_cents' => $tpl->clinic_fee,
                    'fee_override_type' => $tpl->fee_override_type ?? 'inherit',
                    'custom_doctor_fee_lkr' => $tpl->custom_doctor_fee ? round($tpl->custom_doctor_fee / 100, 2) : null,
                    'custom_clinic_fee_lkr' => $tpl->custom_clinic_fee ? round($tpl->custom_clinic_fee / 100, 2) : null,
                    'is_active' => (bool) $tpl->is_active,
                    'future_sessions_count' => $futureSessionsCount,
                ];
            });

        // Fetch upcoming and past leaves per doctor
        $leaves = DoctorLeave::with(['doctor:id,name,title,specialty,photo_url'])
            ->orderByDesc('start_date')
            ->get()
            ->map(function ($leave) use ($todayColombo) {
                $paletteCount = count($this->doctorPalette);
                $color = $this->doctorPalette[$leave->doctor_id % $paletteCount];

                $affectedSessionsCount = DoctorSession::where('doctor_id', $leave->doctor_id)
                    ->whereBetween('session_date', [
                        $leave->start_date->toDateString(),
                        $leave->end_date->toDateString(),
                    ])
                    ->count();

                $affectedTokensCount = BookingToken::whereIn(
                    'doctor_session_id',
                    DoctorSession::where('doctor_id', $leave->doctor_id)
                        ->whereBetween('session_date', [$leave->start_date->toDateString(), $leave->end_date->toDateString()])
                        ->pluck('id')
                )->whereNotIn('status', ['cancelled'])->count();

                $isUpcoming = $leave->end_date->gte($todayColombo);

                return [
                    'id' => $leave->id,
                    'doctor_id' => $leave->doctor_id,
                    'doctor_name' => trim(($leave->doctor?->title ?? 'Dr.').' '.($leave->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $leave->doctor?->specialty ?? '',
                    'doctor_photo' => $leave->doctor?->photo_url,
                    'doctor_color' => $color,
                    'start_date' => $leave->start_date->format('Y-m-d'),
                    'end_date' => $leave->end_date->format('Y-m-d'),
                    'start_date_formatted' => $leave->start_date->format('M d, Y'),
                    'end_date_formatted' => $leave->end_date->format('M d, Y'),
                    'days_count' => $leave->start_date->diffInDays($leave->end_date) + 1,
                    'reason' => $leave->reason ?? 'On Leave',
                    'affected_sessions_count' => $affectedSessionsCount,
                    'affected_tokens_count' => $affectedTokensCount,
                    'is_upcoming' => $isUpcoming,
                ];
            });

        // Users in this clinic who can be linked to a doctor
        $eligibleUsers = User::where('tenant_id', $tenantId)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $specialties = [
            'General Physician',
            'Cardiologist',
            'Consultant Physician',
            'Paediatrician',
            'ENT Surgeon',
            'Dermatologist',
            'Obstetrician & Gynaecologist',
            'Orthopaedic Surgeon',
            'Neurologist',
            'Psychiatrist',
            'Eye Surgeon / Ophthalmologist',
            'Endocrinologist',
            'Urologist',
            'Gastroenterologist',
            'Dental Surgeon',
            'Radiologist',
        ];

        // Metadata for "Last generated: ... · Sessions until: ..."
        $latestSession = DoctorSession::where('tenant_id', $tenantId)
            ->whereNotNull('session_template_id')
            ->orderByDesc('created_at')
            ->first();

        $furthestSessionDate = DoctorSession::where('tenant_id', $tenantId)
            ->whereNotNull('session_template_id')
            ->max('session_date');

        $lastGeneratedIso = $tenant->getSetting('sessions_last_generated_at', $latestSession?->created_at?->toIso8601String());
        $lastGeneratedFormatted = $lastGeneratedIso ? Carbon::parse($lastGeneratedIso)->format('d M') : null;
        $furthestFormatted = $furthestSessionDate ? Carbon::parse($furthestSessionDate)->format('d M') : null;

        return Inertia::render('Doctors/Index', [
            'doctors' => $doctors,
            'templates' => $templates,
            'leaves' => $leaves,
            'eligibleUsers' => $eligibleUsers,
            'specialties' => $specialties,
            'feeSettings' => [
                'pricing_mode' => $feeSettings['pricing_mode'] ?? 'split',
                'default_doctor_fee_lkr' => round(($feeSettings['default_doctor_fee'] ?? 200000) / 100, 2),
                'default_clinic_fee_lkr' => round(($feeSettings['default_clinic_fee'] ?? 80000) / 100, 2),
                'default_total_fee_lkr' => round(($feeSettings['default_total_fee'] ?? 280000) / 100, 2),
                'default_payout_rule' => $feeSettings['default_payout_rule'] ?? [
                    'type' => 'full_doctor_fee',
                    'value' => 0,
                ],
            ],
            'visitTypes' => $visitTypes,
            'lastGeneratedInfo' => [
                'last_generated_at' => $lastGeneratedIso,
                'last_generated_formatted' => $lastGeneratedFormatted,
                'furthest_date' => $furthestSessionDate,
                'furthest_date_formatted' => $furthestFormatted,
                'has_scheduled_job' => true,
                'scheduled_job_note' => 'Automatic generator runs daily at midnight for 30 days ahead.',
            ],
        ]);
    }

    /**
     * Store a newly created doctor.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:255'],
            'specialty' => ['required', 'string', 'max:255'],
            'slmc_number' => ['required', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'bio' => ['nullable', 'string'],
            'use_clinic_default_fees' => ['boolean'],
            'pricing_mode' => ['nullable', 'string', 'in:split,single_price'],
            'doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'total_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'payout_rule' => ['nullable', 'array'],
            'visit_type_overrides' => ['nullable', 'array'],
            'avg_consultation_minutes' => ['required', 'integer', 'min:1', 'max:120'],
            'token_code' => ['nullable', 'string', 'max:5', 'regex:/^[A-Za-z0-9]{2,5}$/'],
            'is_active' => ['boolean'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $tenantId = (string) tenant('id');

        $tokenCode = ! empty($validated['token_code'])
            ? strtoupper(trim($validated['token_code']))
            : null;

        if ($tokenCode) {
            $exists = Doctor::where('tenant_id', $tenantId)
                ->where('token_code', $tokenCode)
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'token_code' => "Doctor token code '{$tokenCode}' is already assigned to another doctor in this clinic.",
                ]);
            }
        } else {
            $tokenCode = TokenHelper::generateUniqueCode(
                tenantId: $tenantId,
                name: $validated['name'],
                title: $validated['title'] ?? null
            );
        }

        $useDefault = $request->has('use_clinic_default_fees')
            ? (bool) $request->input('use_clinic_default_fees')
            : (empty($validated['doctor_fee_lkr']) && empty($validated['clinic_fee_lkr']));
        $docFeeCents = isset($validated['doctor_fee_lkr']) ? (int) round($validated['doctor_fee_lkr'] * 100) : 0;
        $clinicFeeCents = isset($validated['clinic_fee_lkr']) ? (int) round($validated['clinic_fee_lkr'] * 100) : 0;
        $totalFeeCents = isset($validated['total_fee_lkr']) ? (int) round($validated['total_fee_lkr'] * 100) : ($docFeeCents + $clinicFeeCents);

        $doctor = Doctor::create([
            'tenant_id' => $tenantId,
            'user_id' => $validated['user_id'] ?? null,
            'title' => $validated['title'],
            'name' => $validated['name'],
            'token_code' => $tokenCode,
            'specialty' => $validated['specialty'],
            'slmc_number' => $validated['slmc_number'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'photo_url' => $validated['photo_url'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'use_clinic_default_fees' => $useDefault,
            'pricing_mode' => $validated['pricing_mode'] ?? 'split',
            'custom_doctor_fee' => ! $useDefault ? $docFeeCents : null,
            'custom_clinic_fee' => ! $useDefault ? $clinicFeeCents : null,
            'custom_total_fee' => ! $useDefault ? $totalFeeCents : null,
            'doctor_fee' => $docFeeCents,
            'clinic_fee' => $clinicFeeCents,
            'payout_rule' => $validated['payout_rule'] ?? null,
            'visit_type_overrides' => $validated['visit_type_overrides'] ?? null,
            'avg_consultation_minutes' => $validated['avg_consultation_minutes'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', "Doctor {$doctor->name} added successfully (Token Code: {$tokenCode}).");
    }

    /**
     * Update the specified doctor.
     */
    public function update(Request $request, Doctor $doctor): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:20'],
            'name' => ['required', 'string', 'max:255'],
            'specialty' => ['required', 'string', 'max:255'],
            'slmc_number' => ['required', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'bio' => ['nullable', 'string'],
            'use_clinic_default_fees' => ['boolean'],
            'pricing_mode' => ['nullable', 'string', 'in:split,single_price'],
            'doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'total_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'payout_rule' => ['nullable', 'array'],
            'visit_type_overrides' => ['nullable', 'array'],
            'avg_consultation_minutes' => ['required', 'integer', 'min:1', 'max:120'],
            'token_code' => ['nullable', 'string', 'max:5', 'regex:/^[A-Za-z0-9]{2,5}$/'],
            'is_active' => ['boolean'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $tenantId = (string) $doctor->tenant_id;
        $oldCode = $doctor->token_code;
        $newCode = ! empty($validated['token_code'])
            ? strtoupper(trim($validated['token_code']))
            : $oldCode;

        if ($newCode && $newCode !== $oldCode) {
            $exists = Doctor::where('tenant_id', $tenantId)
                ->where('id', '!=', $doctor->id)
                ->where('token_code', $newCode)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'token_code' => "Doctor token code '{$newCode}' is already in use by another doctor in this clinic.",
                ]);
            }
        }

        $futureBookingsCount = $doctor->future_bookings_count;

        $useDefault = $validated['use_clinic_default_fees'] ?? true;
        $docFeeCents = isset($validated['doctor_fee_lkr']) ? (int) round($validated['doctor_fee_lkr'] * 100) : 0;
        $clinicFeeCents = isset($validated['clinic_fee_lkr']) ? (int) round($validated['clinic_fee_lkr'] * 100) : 0;
        $totalFeeCents = isset($validated['total_fee_lkr']) ? (int) round($validated['total_fee_lkr'] * 100) : ($docFeeCents + $clinicFeeCents);

        $doctor->update([
            'user_id' => $validated['user_id'] ?? null,
            'title' => $validated['title'],
            'name' => $validated['name'],
            'token_code' => $newCode,
            'specialty' => $validated['specialty'],
            'slmc_number' => $validated['slmc_number'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'photo_url' => $validated['photo_url'] ?? null,
            'bio' => $validated['bio'] ?? null,
            'use_clinic_default_fees' => $useDefault,
            'pricing_mode' => $validated['pricing_mode'] ?? 'split',
            'custom_doctor_fee' => ! $useDefault ? $docFeeCents : null,
            'custom_clinic_fee' => ! $useDefault ? $clinicFeeCents : null,
            'custom_total_fee' => ! $useDefault ? $totalFeeCents : null,
            'doctor_fee' => $docFeeCents,
            'clinic_fee' => $clinicFeeCents,
            'payout_rule' => $validated['payout_rule'] ?? null,
            'visit_type_overrides' => $validated['visit_type_overrides'] ?? null,
            'avg_consultation_minutes' => $validated['avg_consultation_minutes'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $successMsg = "Doctor {$doctor->name} updated successfully.";
        if ($oldCode !== $newCode && $futureBookingsCount > 0) {
            $warningMsg = "Doctor updated. Warning: {$futureBookingsCount} future booked tokens will keep their original code ({$oldCode}) snapshot. New sessions will use {$newCode}.";

            return redirect()->back()->with('success', $warningMsg)->with('warning', $warningMsg);
        }

        return redirect()->back()->with('success', $successMsg);
    }

    /**
     * Toggle doctor active status.
     */
    public function toggleActive(Doctor $doctor): RedirectResponse
    {
        $doctor->update(['is_active' => ! $doctor->is_active]);

        $status = $doctor->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Doctor {$doctor->name} is now {$status}.");
    }

    /**
     * Delete a doctor only if they have zero history (no sessions, bookings, bills, settlements, or prescriptions).
     * Doctors with any history must only be deactivated.
     */
    public function destroy(Doctor $doctor): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($doctor->tenant_id === $tenantId, 404);

        $hasSessions = $doctor->sessions()->exists();
        $hasBookings = BookingToken::whereIn('doctor_session_id', $doctor->sessions()->pluck('id'))->exists();
        $hasBills = $doctor->bills()->exists();
        $hasSettlements = $doctor->settlements()->exists();
        $hasPrescriptions = $doctor->prescriptions()->exists();

        if ($hasSessions || $hasBookings || $hasBills || $hasSettlements || $hasPrescriptions) {
            return redirect()->back()->with('error', "Cannot delete Dr. {$doctor->name} because they have existing history (sessions, patient bookings, bills, or payouts). You can deactivate this doctor instead to hide them from the directory and online booking while preserving records.");
        }

        // Doctor has zero history -> safe to completely delete
        $doctor->sessionTemplates()->delete();
        $doctor->leaves()->delete();
        $doctor->forceDelete();

        return redirect()->back()->with('success', "Doctor {$doctor->name} deleted successfully.");
    }

    /**
     * Store a weekly recurring session template.
     */
    public function storeTemplate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'title' => ['required', 'string', 'max:255'],
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'max_patients' => ['required', 'integer', 'min:1', 'max:200'],
            'room_number' => ['nullable', 'string', 'max:50'],
            'mode' => ['nullable', 'string', Rule::in(['token', 'slot'])],
            'fee_override_type' => ['nullable', 'string', 'in:inherit,custom'],
            'custom_doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'custom_clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'custom_total_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'payout_rule_override' => ['nullable', 'array'],
        ]);

        $doctor = Doctor::findOrFail($validated['doctor_id']);

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $dayName = $dayNames[$validated['day_of_week']] ?? 'this day';

        // Check doctor overlap
        $overlap = SessionTemplate::findDoctorOverlap(
            tenant('id'),
            $doctor->id,
            (int) $validated['day_of_week'],
            $validated['start_time'],
            $validated['end_time']
        );
        if ($overlap) {
            return redirect()->back()->withErrors([
                'start_time' => "Dr. {$doctor->name} already has a scheduled session on {$dayName} from {$overlap->start_time} to {$overlap->end_time} ('{$overlap->title}'). Overlapping sessions are not allowed.",
            ]);
        }

        // Check room conflict
        if (! empty($validated['room_number'])) {
            $roomConflict = SessionTemplate::findRoomConflict(
                tenant('id'),
                $validated['room_number'],
                (int) $validated['day_of_week'],
                $validated['start_time'],
                $validated['end_time']
            );
            if ($roomConflict) {
                return redirect()->back()->withErrors([
                    'room_number' => "Room '{$validated['room_number']}' is already booked on {$dayName} by Dr. {$roomConflict->doctor?->name} ({$roomConflict->start_time} to {$roomConflict->end_time}).",
                ]);
            }
        }

        $isCustom = ($validated['fee_override_type'] ?? 'inherit') === 'custom';
        $customDoc = $isCustom && isset($validated['custom_doctor_fee_lkr']) ? (int) round($validated['custom_doctor_fee_lkr'] * 100) : null;
        $customClinic = $isCustom && isset($validated['custom_clinic_fee_lkr']) ? (int) round($validated['custom_clinic_fee_lkr'] * 100) : null;
        $customTotal = $isCustom && isset($validated['custom_total_fee_lkr']) ? (int) round($validated['custom_total_fee_lkr'] * 100) : null;

        $template = SessionTemplate::create([
            'tenant_id' => tenant('id'),
            'doctor_id' => $doctor->id,
            'title' => $validated['title'],
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'max_patients' => $validated['max_patients'],
            'room_number' => $validated['room_number'] ?? 'Suite A',
            'mode' => $validated['mode'] ?? 'token',
            'doctor_fee' => $customDoc ?? $doctor->doctor_fee,
            'clinic_fee' => $customClinic ?? $doctor->clinic_fee,
            'fee_override_type' => $validated['fee_override_type'] ?? 'inherit',
            'custom_doctor_fee' => $customDoc,
            'custom_clinic_fee' => $customClinic,
            'custom_total_fee' => $customTotal,
            'payout_rule_override' => $validated['payout_rule_override'] ?? null,
            'is_active' => true,
        ]);

        // Auto-generate upcoming sessions immediately for this template for the next 30 days
        $count = $this->sessionGenerator->generateForTemplate($template, 30);

        return redirect()->back()->with('success', "Weekly session template created and {$count} upcoming session(s) populated.");
    }

    /**
     * Update a weekly recurring session template and regenerate sessions.
     */
    public function updateTemplate(Request $request, SessionTemplate $template): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'max_patients' => ['required', 'integer', 'min:1', 'max:200'],
            'room_number' => ['nullable', 'string', 'max:50'],
            'mode' => ['nullable', 'string', Rule::in(['token', 'slot'])],
            'fee_override_type' => ['nullable', 'string', 'in:inherit,custom'],
            'custom_doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'custom_clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'custom_total_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'payout_rule_override' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $doctor = $template->doctor;

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $dayName = $dayNames[$validated['day_of_week']] ?? 'this day';

        // Check doctor overlap
        $overlap = SessionTemplate::findDoctorOverlap(
            tenant('id'),
            $doctor->id,
            (int) $validated['day_of_week'],
            $validated['start_time'],
            $validated['end_time'],
            $template->id
        );
        if ($overlap) {
            return redirect()->back()->withErrors([
                'start_time' => "Dr. {$doctor->name} already has a session on {$dayName} from {$overlap->start_time} to {$overlap->end_time} ('{$overlap->title}'). Overlapping sessions are not allowed.",
            ]);
        }

        // Check room conflict
        if (! empty($validated['room_number'])) {
            $roomConflict = SessionTemplate::findRoomConflict(
                tenant('id'),
                $validated['room_number'],
                (int) $validated['day_of_week'],
                $validated['start_time'],
                $validated['end_time'],
                $template->id
            );
            if ($roomConflict) {
                return redirect()->back()->withErrors([
                    'room_number' => "Room '{$validated['room_number']}' is already booked on {$dayName} by Dr. {$roomConflict->doctor?->name} ({$roomConflict->start_time} to {$roomConflict->end_time}).",
                ]);
            }
        }
        $isCustom = ($validated['fee_override_type'] ?? 'inherit') === 'custom';
        $customDoc = $isCustom && isset($validated['custom_doctor_fee_lkr']) ? (int) round($validated['custom_doctor_fee_lkr'] * 100) : null;
        $customClinic = $isCustom && isset($validated['custom_clinic_fee_lkr']) ? (int) round($validated['custom_clinic_fee_lkr'] * 100) : null;
        $customTotal = $isCustom && isset($validated['custom_total_fee_lkr']) ? (int) round($validated['custom_total_fee_lkr'] * 100) : null;

        $template->update([
            'title' => $validated['title'],
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'max_patients' => $validated['max_patients'],
            'room_number' => $validated['room_number'] ?? $template->room_number,
            'mode' => $validated['mode'] ?? $template->mode,
            'doctor_fee' => $customDoc ?? ($doctor ? $doctor->doctor_fee : $template->doctor_fee),
            'clinic_fee' => $customClinic ?? ($doctor ? $doctor->clinic_fee : $template->clinic_fee),
            'fee_override_type' => $validated['fee_override_type'] ?? 'inherit',
            'custom_doctor_fee' => $customDoc,
            'custom_clinic_fee' => $customClinic,
            'custom_total_fee' => $customTotal,
            'payout_rule_override' => $validated['payout_rule_override'] ?? $template->payout_rule_override,
            'is_active' => $validated['is_active'] ?? $template->is_active,
        ]);

        // Auto-generate upcoming sessions immediately
        $count = $this->sessionGenerator->generateForTemplate($template, 30);

        return redirect()->back()->with('success', "Session template updated and schedule refreshed ({$count} new sessions generated).");
    }

    /**
     * Delete a session template with optional removal of future generated sessions.
     */
    public function destroyTemplate(Request $request, SessionTemplate $template): RedirectResponse
    {
        $removeFuture = $request->boolean('remove_future_sessions');
        $affectedCount = 0;

        if ($removeFuture) {
            $today = Carbon::today('Asia/Colombo')->toDateString();
            $sessions = DoctorSession::where('session_template_id', $template->id)
                ->where('session_date', '>=', $today)
                ->whereNotIn('status', ['cancelled'])
                ->get();

            foreach ($sessions as $session) {
                if ($session->tokens()->whereNotIn('status', ['cancelled'])->exists()) {
                    $session->update([
                        'status' => 'cancelled',
                        'cancellation_reason' => 'Template removed by clinic admin',
                    ]);
                } else {
                    $session->delete();
                }
                $affectedCount++;
            }
        }

        $template->delete();

        $msg = 'Session template deleted.';
        if ($affectedCount > 0) {
            $msg .= " ({$affectedCount} upcoming session(s) removed/cancelled).";
        }

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Duplicate a weekly session template to other days of the week.
     */
    public function duplicateTemplate(Request $request, SessionTemplate $template): RedirectResponse
    {
        $validated = $request->validate([
            'target_days' => ['required', 'array', 'min:1'],
            'target_days.*' => ['integer', 'min:0', 'max:6'],
        ]);

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $created = 0;
        $skipped = [];

        foreach ($validated['target_days'] as $dayOfWeek) {
            if ((int) $dayOfWeek === (int) $template->day_of_week) {
                continue;
            }

            $startTime = substr((string) $template->start_time, 0, 5);
            $endTime = substr((string) $template->end_time, 0, 5);

            // Check doctor overlap
            $overlap = SessionTemplate::findDoctorOverlap(
                tenant('id'),
                $template->doctor_id,
                (int) $dayOfWeek,
                $startTime,
                $endTime
            );

            if ($overlap) {
                $skipped[] = "{$dayNames[$dayOfWeek]} (doctor overlap)";

                continue;
            }

            // Check room conflict
            if (! empty($template->room_number)) {
                $roomConflict = SessionTemplate::findRoomConflict(
                    tenant('id'),
                    $template->room_number,
                    (int) $dayOfWeek,
                    $startTime,
                    $endTime
                );
                if ($roomConflict) {
                    $skipped[] = "{$dayNames[$dayOfWeek]} (room conflict)";

                    continue;
                }
            }

            $newTemplate = SessionTemplate::create([
                'tenant_id' => tenant('id'),
                'doctor_id' => $template->doctor_id,
                'title' => $template->title,
                'day_of_week' => (int) $dayOfWeek,
                'start_time' => $template->start_time,
                'end_time' => $template->end_time,
                'max_patients' => $template->max_patients,
                'room_number' => $template->room_number,
                'mode' => $template->mode,
                'doctor_fee' => $template->doctor_fee,
                'clinic_fee' => $template->clinic_fee,
                'fee_override_type' => $template->fee_override_type,
                'custom_doctor_fee' => $template->custom_doctor_fee,
                'custom_clinic_fee' => $template->custom_clinic_fee,
                'custom_total_fee' => $template->custom_total_fee,
                'payout_rule_override' => $template->payout_rule_override,
                'is_active' => true,
            ]);

            // Auto-generate for the new template
            $this->sessionGenerator->generateForTemplate($newTemplate, 30);
            $created++;
        }

        $msg = "Duplicated template to {$created} day(s).";
        if (! empty($skipped)) {
            $msg .= ' Skipped: '.implode(', ', $skipped).'.';
        }

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Create a one-off channeling session.
     */
    public function storeOneOffSession(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'session_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'max_tokens' => ['required', 'integer', 'min:1', 'max:200'],
            'room_number' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'fee_override_type' => ['nullable', 'string', 'in:inherit,custom'],
            'custom_doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'custom_clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'custom_total_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'payout_rule_override' => ['nullable', 'array'],
        ]);

        $doctor = Doctor::findOrFail($validated['doctor_id']);

        // Check if doctor is on leave on this date
        $onLeave = DoctorLeave::where('doctor_id', $doctor->id)
            ->where('start_date', '<=', $validated['session_date'])
            ->where('end_date', '>=', $validated['session_date'])
            ->exists();

        if ($onLeave) {
            return redirect()->back()->withErrors([
                'session_date' => "Doctor {$doctor->name} is marked on leave on {$validated['session_date']}.",
            ]);
        }

        // Check doctor overlap on this specific date
        $overlap = DoctorSession::findDoctorOverlap(
            tenant('id'),
            $doctor->id,
            $validated['session_date'],
            $validated['start_time'],
            $validated['end_time']
        );
        if ($overlap) {
            return redirect()->back()->withErrors([
                'start_time' => "Dr. {$doctor->name} already has a scheduled session on {$validated['session_date']} from {$overlap->start_time} to {$overlap->end_time}. Overlapping sessions are not allowed.",
            ]);
        }

        // Check room conflict on this specific date
        if (! empty($validated['room_number'])) {
            $roomConflict = DoctorSession::findRoomConflict(
                tenant('id'),
                $validated['room_number'],
                $validated['session_date'],
                $validated['start_time'],
                $validated['end_time']
            );
            if ($roomConflict) {
                return redirect()->back()->withErrors([
                    'room_number' => "Room '{$validated['room_number']}' is already booked on {$validated['session_date']} by Dr. {$roomConflict->doctor?->name} ({$roomConflict->start_time} to {$roomConflict->end_time}).",
                ]);
            }
        }

        $rawDocFee = $request->input('custom_doctor_fee_lkr') ?? $request->input('doctor_fee');
        $rawClinicFee = $request->input('custom_clinic_fee_lkr') ?? $request->input('clinic_fee');
        $rawTotalFee = $request->input('custom_total_fee_lkr');

        $isCustom = ($validated['fee_override_type'] ?? null) === 'custom'
            || ($request->has('doctor_fee') && ! $request->has('fee_override_type'));

        $customDoc = $isCustom && $rawDocFee !== null ? (int) round(((float) $rawDocFee) * 100) : null;
        $customClinic = $isCustom && $rawClinicFee !== null ? (int) round(((float) $rawClinicFee) * 100) : null;
        $customTotal = $isCustom && $rawTotalFee !== null ? (int) round(((float) $rawTotalFee) * 100) : null;
        $overrideType = $isCustom ? 'custom' : ($validated['fee_override_type'] ?? 'inherit');

        $session = DoctorSession::create([
            'tenant_id' => tenant('id'),
            'doctor_id' => $doctor->id,
            'doctor_token_code' => $doctor->token_code,
            'session_template_id' => null,
            'session_date' => $validated['session_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'max_tokens' => $validated['max_tokens'],
            'mode' => 'token',
            'status' => 'scheduled',
            'room_number' => $validated['room_number'] ?? 'Suite A',
            'doctor_fee' => $customDoc ?? $doctor->doctor_fee,
            'clinic_fee' => $customClinic ?? $doctor->clinic_fee,
            'fee_override_type' => $overrideType,
            'custom_doctor_fee' => $customDoc,
            'custom_clinic_fee' => $customClinic,
            'custom_total_fee' => $customTotal,
            'payout_rule_override' => $validated['payout_rule_override'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()
            ->with('success', "One-off channeling session for Dr. {$doctor->name} created successfully.")
            ->with('createdSessionId', $session->id);
    }

    /**
     * Preview affected sessions and booked patients for a doctor leave range.
     */
    public function previewLeaveImpact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $sessions = DoctorSession::where('doctor_id', $validated['doctor_id'])
            ->whereBetween('session_date', [$validated['start_date'], $validated['end_date']])
            ->whereNotIn('status', ['cancelled'])
            ->withCount(['tokens as booked_tokens_count' => fn ($q) => $q->whereNotIn('status', ['cancelled'])])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get();

        $sessionsCount = $sessions->count();
        $tokensCount = $sessions->sum('booked_tokens_count');

        return response()->json([
            'success' => true,
            'sessions_count' => $sessionsCount,
            'tokens_count' => $tokensCount,
            'sessions' => $sessions->map(fn ($s) => [
                'id' => $s->id,
                'session_date' => $s->session_date->format('Y-m-d'),
                'session_date_formatted' => $s->session_date->format('M d, Y (D)'),
                'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                'booked_tokens_count' => $s->booked_tokens_count,
            ]),
        ]);
    }

    /**
     * Log doctor leave with customizable session handling.
     */
    public function storeLeave(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:255'],
            'action_on_sessions' => ['nullable', 'string', 'in:cancel_all,cancel_unbooked,keep'],
        ]);

        $leave = DoctorLeave::create([
            'tenant_id' => tenant('id'),
            'doctor_id' => $validated['doctor_id'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'reason' => $validated['reason'] ?? 'On Leave',
        ]);

        $action = $validated['action_on_sessions'] ?? 'cancel_unbooked';
        $reasonText = 'Doctor on leave: '.($validated['reason'] ?? 'Not specified');

        $affectedQuery = DoctorSession::where('doctor_id', $validated['doctor_id'])
            ->whereBetween('session_date', [$validated['start_date'], $validated['end_date']])
            ->whereNotIn('status', ['cancelled']);

        $cancelledSessions = 0;
        $cancelledTokens = 0;

        if ($action === 'cancel_all') {
            $sessions = $affectedQuery->get();
            foreach ($sessions as $session) {
                $session->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => $reasonText,
                ]);
                $tCount = $session->tokens()
                    ->whereNotIn('status', ['cancelled', 'completed'])
                    ->update(['status' => BookingToken::STATUS_CANCELLED]);
                $cancelledTokens += $tCount;
                $cancelledSessions++;
            }
        } elseif ($action === 'cancel_unbooked') {
            $unbookedSessions = $affectedQuery->doesntHave('tokens')->get();
            foreach ($unbookedSessions as $session) {
                $session->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => $reasonText,
                ]);
                $cancelledSessions++;
            }
        }

        $msg = 'Doctor leave recorded successfully.';
        if ($cancelledSessions > 0) {
            $msg .= " ({$cancelledSessions} session(s) cancelled";
            if ($cancelledTokens > 0) {
                $msg .= ", {$cancelledTokens} patient booking(s) marked cancelled";
            }
            $msg .= ').';
        }

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Delete a doctor leave record.
     */
    public function destroyLeave(DoctorLeave $leave): RedirectResponse
    {
        $leave->delete();

        return redirect()->back()->with('success', 'Doctor leave record removed.');
    }

    /**
     * Preview generation counts for chosen date range and doctors.
     */
    public function previewGenerateSessions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'doctor_ids' => ['nullable', 'array'],
            'doctor_ids.*' => ['integer', 'exists:doctors,id'],
        ]);

        $startDate = ! empty($validated['start_date'])
            ? Carbon::parse($validated['start_date'], 'Asia/Colombo')
            : Carbon::today('Asia/Colombo');

        $endDate = ! empty($validated['end_date'])
            ? Carbon::parse($validated['end_date'], 'Asia/Colombo')
            : (clone $startDate)->addDays(30);

        $preview = $this->sessionGenerator->previewForTenant(
            tenant(),
            $startDate,
            $endDate,
            $validated['doctor_ids'] ?? []
        );

        return response()->json([
            'success' => true,
            'preview' => $preview,
        ]);
    }

    /**
     * Manually trigger session generation for a chosen date range and doctors.
     */
    public function generateSessions(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'doctor_ids' => ['nullable', 'array'],
            'doctor_ids.*' => ['integer', 'exists:doctors,id'],
        ]);

        $startDate = ! empty($validated['start_date'])
            ? Carbon::parse($validated['start_date'], 'Asia/Colombo')
            : Carbon::today('Asia/Colombo');

        $endDate = ! empty($validated['end_date'])
            ? Carbon::parse($validated['end_date'], 'Asia/Colombo')
            : (clone $startDate)->addDays(30);

        $doctorIds = $validated['doctor_ids'] ?? [];

        // Run preview first to know skipped counts
        $preview = $this->sessionGenerator->previewForTenant(tenant(), $startDate, $endDate, $doctorIds);

        $days = (int) $startDate->diffInDays($endDate);
        $count = $this->sessionGenerator->generateForTenant(tenant(), $days, $startDate, $endDate, $doctorIds);

        $msg = "Generated {$count} channeling session(s).";
        if ($preview['already_exists'] > 0 || $preview['on_leave'] > 0) {
            $msg .= " (Skipped {$preview['already_exists']} existing, {$preview['on_leave']} on doctor leave).";
        }

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Upload or fetch doctor photo with tenant isolation.
     */
    public function uploadPhoto(
        Request $request,
        Doctor $doctor,
        ImageProcessingService $imageService
    ): JsonResponse|RedirectResponse {
        $tenant = tenant();
        if ($doctor->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized access to doctor profile in another clinic.');
        }

        $request->validate([
            'file' => ['nullable', 'file', 'max:5120', 'mimes:png,jpg,jpeg,webp'],
            'source_url' => ['nullable', 'string', 'max:2048'],
            'crop_x' => ['nullable', 'numeric'],
            'crop_y' => ['nullable', 'numeric'],
            'crop_width' => ['nullable', 'numeric'],
            'crop_height' => ['nullable', 'numeric'],
            'rotate' => ['nullable', 'numeric'],
        ]);

        $binary = null;
        if ($request->hasFile('file')) {
            $uploaded = $request->file('file');
            if (! $uploaded->isValid()) {
                throw ValidationException::withMessages([
                    'file' => ['The uploaded file is corrupt or invalid.'],
                ]);
            }
            $binary = $uploaded->get();
        } elseif ($request->filled('source_url')) {
            $binary = $imageService->fetchSecurelyFromUrl(
                $request->input('source_url'),
                $request->user()?->id
            );
        } else {
            throw ValidationException::withMessages([
                'file' => ['Please upload an image file or provide an image link.'],
            ]);
        }

        $cropData = [
            'crop_x' => $request->input('crop_x'),
            'crop_y' => $request->input('crop_y'),
            'crop_width' => $request->input('crop_width'),
            'crop_height' => $request->input('crop_height'),
            'rotate' => $request->input('rotate'),
        ];

        $result = $imageService->processDoctorPhoto($doctor, $binary, $cropData);

        AuditLogger::log('doctor.photo_updated', [
            'resource' => $doctor,
            'metadata' => [
                'doctor_id' => $doctor->id,
                'photo_path' => $result['photo_path'],
                'photo_url' => $result['photo_url'],
            ],
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Doctor photo updated.',
                'photo_url' => $result['photo_url'],
            ]);
        }

        return redirect()->back()->with('success', 'Doctor photo updated.');
    }

    /**
     * Delete doctor photo.
     */
    public function deletePhoto(
        Request $request,
        Doctor $doctor,
        ImageProcessingService $imageService
    ): JsonResponse|RedirectResponse {
        $tenant = tenant();
        if ($doctor->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized access to doctor profile in another clinic.');
        }

        $imageService->deleteOldDoctorPhoto($doctor);

        $doctor->photo_path = null;
        $doctor->photo_url = null;
        $doctor->save();

        AuditLogger::log('doctor.photo_removed', [
            'resource' => $doctor,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Doctor photo removed.',
                'photo_url' => null,
            ]);
        }

        return redirect()->back()->with('success', 'Doctor photo removed.');
    }
}
