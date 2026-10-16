<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\DoctorSession;
use App\Models\SessionTemplate;
use App\Models\User;
use App\Models\VisitType;
use App\Services\FeeResolutionService;
use App\Services\SessionGeneratorService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $feeSettings = $this->feeService->getTenantSettings($tenant);

        $visitTypes = VisitType::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'pricing_type', 'percentage_value', 'fixed_fee_cents', 'is_default']);

        $doctors = Doctor::with(['user:id,name,email'])
            ->withCount([
                'sessionTemplates as templates_count',
                'sessions as upcoming_sessions_count' => function ($query) {
                    $query->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
                        ->whereNotIn('status', ['cancelled']);
                },
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($doc) use ($feeSettings) {
                $useDefault = (bool) ($doc->use_clinic_default_fees ?? true);
                $docFeeCents = ! $useDefault && $doc->custom_doctor_fee !== null ? $doc->custom_doctor_fee : ($doc->doctor_fee ?: ($feeSettings['default_doctor_fee'] ?? 200000));
                $clinicFeeCents = ! $useDefault && $doc->custom_clinic_fee !== null ? $doc->custom_clinic_fee : ($doc->clinic_fee ?: ($feeSettings['default_clinic_fee'] ?? 80000));
                $totalCents = ! $useDefault && $doc->custom_total_fee !== null ? $doc->custom_total_fee : ($docFeeCents + $clinicFeeCents);

                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'title' => $doc->title ?? 'Dr.',
                    'full_title' => trim(($doc->title ?? 'Dr.').' '.$doc->name),
                    'specialty' => $doc->specialty,
                    'slmc_number' => $doc->slmc_number,
                    'slug' => $doc->slug,
                    'phone' => $doc->phone,
                    'email' => $doc->email,
                    'photo_url' => $doc->photo_url,
                    'bio' => $doc->bio,
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
                ];
            });

        $templates = SessionTemplate::with(['doctor:id,name,title,specialty'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(function ($tpl) {
                $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                return [
                    'id' => $tpl->id,
                    'doctor_id' => $tpl->doctor_id,
                    'doctor_name' => trim(($tpl->doctor?->title ?? 'Dr.').' '.($tpl->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $tpl->doctor?->specialty ?? '',
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
                ];
            });

        $leaves = DoctorLeave::with(['doctor:id,name,title,specialty'])
            ->where('end_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->orderBy('start_date')
            ->get()
            ->map(fn ($leave) => [
                'id' => $leave->id,
                'doctor_id' => $leave->doctor_id,
                'doctor_name' => trim(($leave->doctor?->title ?? 'Dr.').' '.($leave->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $leave->doctor?->specialty ?? '',
                'start_date' => $leave->start_date->format('Y-m-d'),
                'end_date' => $leave->end_date->format('Y-m-d'),
                'start_date_formatted' => $leave->start_date->format('M d, Y'),
                'end_date_formatted' => $leave->end_date->format('M d, Y'),
                'reason' => $leave->reason ?? 'On Leave',
            ]);

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
            'is_active' => ['boolean'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $useDefault = $request->has('use_clinic_default_fees')
            ? (bool) $request->input('use_clinic_default_fees')
            : (empty($validated['doctor_fee_lkr']) && empty($validated['clinic_fee_lkr']));
        $docFeeCents = isset($validated['doctor_fee_lkr']) ? (int) round($validated['doctor_fee_lkr'] * 100) : 0;
        $clinicFeeCents = isset($validated['clinic_fee_lkr']) ? (int) round($validated['clinic_fee_lkr'] * 100) : 0;
        $totalFeeCents = isset($validated['total_fee_lkr']) ? (int) round($validated['total_fee_lkr'] * 100) : ($docFeeCents + $clinicFeeCents);

        $doctor = Doctor::create([
            'tenant_id' => tenant('id'),
            'user_id' => $validated['user_id'] ?? null,
            'title' => $validated['title'],
            'name' => $validated['name'],
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

        return redirect()->back()->with('success', "Doctor {$doctor->name} added successfully.");
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
            'is_active' => ['boolean'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $useDefault = $validated['use_clinic_default_fees'] ?? true;
        $docFeeCents = isset($validated['doctor_fee_lkr']) ? (int) round($validated['doctor_fee_lkr'] * 100) : 0;
        $clinicFeeCents = isset($validated['clinic_fee_lkr']) ? (int) round($validated['clinic_fee_lkr'] * 100) : 0;
        $totalFeeCents = isset($validated['total_fee_lkr']) ? (int) round($validated['total_fee_lkr'] * 100) : ($docFeeCents + $clinicFeeCents);

        $doctor->update([
            'user_id' => $validated['user_id'] ?? null,
            'title' => $validated['title'],
            'name' => $validated['name'],
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

        return redirect()->back()->with('success', "Doctor {$doctor->name} updated successfully.");
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
     * Delete a doctor if no bookings exist.
     */
    public function destroy(Doctor $doctor): RedirectResponse
    {
        $hasSessions = $doctor->sessions()->exists();

        if ($hasSessions) {
            $doctor->update(['is_active' => false]);

            return redirect()->back()->with('success', "Doctor {$doctor->name} has existing channeling records and was deactivated instead of deleted.");
        }

        $doctor->delete();

        return redirect()->back()->with('success', 'Doctor removed successfully.');
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
     * Delete a session template.
     */
    public function destroyTemplate(SessionTemplate $template): RedirectResponse
    {
        $template->delete();

        return redirect()->back()->with('success', 'Session template deleted.');
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
     * Log doctor leave.
     */
    public function storeLeave(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $leave = DoctorLeave::create([
            'tenant_id' => tenant('id'),
            'doctor_id' => $validated['doctor_id'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'reason' => $validated['reason'] ?? 'On Leave',
        ]);

        // Automatically cancel any unbooked sessions falling within this leave window
        $cancelledCount = DoctorSession::where('doctor_id', $validated['doctor_id'])
            ->whereBetween('session_date', [$validated['start_date'], $validated['end_date']])
            ->where('status', 'scheduled')
            ->doesntHave('tokens')
            ->update([
                'status' => 'cancelled',
                'cancellation_reason' => 'Doctor on leave: '.($validated['reason'] ?? 'Not specified'),
            ]);

        $msg = 'Doctor leave recorded successfully.';
        if ($cancelledCount > 0) {
            $msg .= " ({$cancelledCount} empty session(s) automatically cancelled).";
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
     * Manually trigger session generation for the next 30 days.
     */
    public function generateSessions(): RedirectResponse
    {
        $count = $this->sessionGenerator->generateForTenant(tenant(), 30);

        return redirect()->back()->with('success', "{$count} channeling sessions generated for the next 30 days based on active weekly templates.");
    }
}
