<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChannelingCalendarController extends Controller
{
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
            'badge' => 'bg-blue-600',
            'hex' => '#1E6FD9',
            'name' => 'Blue',
        ],
        [
            'id' => 1,
            'bg' => 'bg-teal-500/10 dark:bg-teal-500/20',
            'border' => 'border-teal-500/40 dark:border-teal-400/40',
            'text' => 'text-teal-700 dark:text-teal-300',
            'badge' => 'bg-teal-600',
            'hex' => '#0E9E8F',
            'name' => 'Teal',
        ],
        [
            'id' => 2,
            'bg' => 'bg-orange-500/10 dark:bg-orange-500/20',
            'border' => 'border-orange-500/40 dark:border-orange-400/40',
            'text' => 'text-orange-700 dark:text-orange-300',
            'badge' => 'bg-orange-500',
            'hex' => '#FF7A59',
            'name' => 'Coral',
        ],
        [
            'id' => 3,
            'bg' => 'bg-purple-500/10 dark:bg-purple-500/20',
            'border' => 'border-purple-500/40 dark:border-purple-400/40',
            'text' => 'text-purple-700 dark:text-purple-300',
            'badge' => 'bg-purple-600',
            'hex' => '#7C3AED',
            'name' => 'Purple',
        ],
        [
            'id' => 4,
            'bg' => 'bg-rose-500/10 dark:bg-rose-500/20',
            'border' => 'border-rose-500/40 dark:border-rose-400/40',
            'text' => 'text-rose-700 dark:text-rose-300',
            'badge' => 'bg-rose-600',
            'hex' => '#E11D48',
            'name' => 'Rose',
        ],
        [
            'id' => 5,
            'bg' => 'bg-cyan-500/10 dark:bg-cyan-500/20',
            'border' => 'border-cyan-500/40 dark:border-cyan-400/40',
            'text' => 'text-cyan-700 dark:text-cyan-300',
            'badge' => 'bg-cyan-600',
            'hex' => '#0891B2',
            'name' => 'Cyan',
        ],
        [
            'id' => 6,
            'bg' => 'bg-indigo-500/10 dark:bg-indigo-500/20',
            'border' => 'border-indigo-500/40 dark:border-indigo-400/40',
            'text' => 'text-indigo-700 dark:text-indigo-300',
            'badge' => 'bg-indigo-600',
            'hex' => '#4F46E5',
            'name' => 'Indigo',
        ],
        [
            'id' => 7,
            'bg' => 'bg-amber-500/10 dark:bg-amber-500/20',
            'border' => 'border-amber-500/40 dark:border-amber-400/40',
            'text' => 'text-amber-800 dark:text-amber-300',
            'badge' => 'bg-amber-500',
            'hex' => '#D97706',
            'name' => 'Amber',
        ],
    ];

    /**
     * Display the channeling calendar.
     */
    public function index(Request $request): Response
    {
        $view = $request->query('view', 'month');
        if (! in_array($view, ['month', 'week', 'day', 'agenda'], true)) {
            $view = 'month';
        }

        $nowColombo = Carbon::now('Asia/Colombo');
        $selectedDate = $request->query('date')
            ? Carbon::parse($request->query('date'), 'Asia/Colombo')->startOfDay()
            : $nowColombo->copy()->startOfDay();

        // Multi-doctor filter support
        $selectedDoctorIds = [];
        if ($request->has('doctor_ids')) {
            $rawDocIds = $request->query('doctor_ids');
            if (is_array($rawDocIds)) {
                $selectedDoctorIds = array_map('intval', array_filter($rawDocIds));
            } elseif (is_string($rawDocIds) && strlen(trim($rawDocIds)) > 0) {
                $selectedDoctorIds = array_map('intval', explode(',', $rawDocIds));
            }
        } elseif ($request->filled('doctor_id')) {
            $selectedDoctorIds = [(int) $request->query('doctor_id')];
        }

        // Calculate date range in Asia/Colombo based on view
        if ($view === 'day') {
            $startDate = $selectedDate->copy()->startOfDay();
            $endDate = $selectedDate->copy()->endOfDay();
        } elseif ($view === 'week') {
            $startDate = $selectedDate->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
            $endDate = $selectedDate->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();
        } else {
            // Month view: show full calendar grid including padding days (Mon-Sun)
            $startDate = $selectedDate->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY)->startOfDay();
            $endDate = $selectedDate->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY)->endOfDay();
        }

        // Generate full list of days for grid rendering
        $days = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $days[] = $cursor->toDateString();
            $cursor->addDay();
        }

        // Fetch doctors and assign persistent, ID-hashed colors
        $doctors = Doctor::orderBy('name')->get()->values()->map(function ($doc) {
            $paletteCount = count($this->doctorPalette);
            $color = $this->doctorPalette[$doc->id % $paletteCount];

            return [
                'id' => $doc->id,
                'name' => $doc->name,
                'title' => $doc->title ?? 'Dr.',
                'full_title' => trim(($doc->title ?? 'Dr.').' '.$doc->name),
                'specialty' => $doc->specialty,
                'doctor_fee_lkr' => round($doc->doctor_fee / 100, 2),
                'clinic_fee_lkr' => round($doc->clinic_fee / 100, 2),
                'color' => $color,
            ];
        });

        // Doctor color lookup
        $doctorColorMap = $doctors->keyBy('id')->map(fn ($d) => $d['color'])->all();

        // Query sessions in range
        $sessionsQuery = DoctorSession::with(['doctor', 'tokens'])
            ->whereBetween('session_date', [$startDate->toDateString(), $endDate->toDateString()]);

        if (! empty($selectedDoctorIds)) {
            $sessionsQuery->whereIn('doctor_id', $selectedDoctorIds);
        }

        $sessions = $sessionsQuery->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) use ($doctorColorMap, $nowColombo) {
                $docColor = $doctorColorMap[$s->doctor_id] ?? $this->doctorPalette[0];
                $bookedCount = $s->tokens->whereNotIn('status', ['cancelled'])->count();

                // Colombo date & time calculation
                $sessionDateStr = $s->session_date->format('Y-m-d');
                $endTimeStr = substr((string) $s->end_time, 0, 5);
                $startTimeStr = substr((string) $s->start_time, 0, 5);

                $sessionEndCarbon = Carbon::parse("{$sessionDateStr} {$endTimeStr}:00", 'Asia/Colombo');
                $isPastEnd = $nowColombo->greaterThan($sessionEndCarbon);

                $isOverrunning = ($s->status === 'in_progress' && $isPastEnd);
                $isPastUnstarted = ($s->status === 'scheduled' && $isPastEnd);

                if ($s->status === 'in_progress') {
                    $effectiveStatus = $isOverrunning ? 'overrunning' : 'live';
                    $statusLabel = $isOverrunning ? 'Overrunning' : 'Live';
                } elseif ($s->status === 'scheduled') {
                    $effectiveStatus = $isPastUnstarted ? 'not_started' : 'scheduled';
                    $statusLabel = $isPastUnstarted ? 'Not started' : 'Scheduled';
                } elseif ($s->status === 'paused') {
                    $effectiveStatus = 'paused';
                    $statusLabel = 'Paused';
                } elseif ($s->status === 'completed') {
                    $effectiveStatus = 'completed';
                    $statusLabel = 'Completed';
                } elseif ($s->status === 'cancelled') {
                    $effectiveStatus = 'cancelled';
                    $statusLabel = 'Cancelled';
                } else {
                    $effectiveStatus = $s->status;
                    $statusLabel = ucfirst($s->status);
                }

                return [
                    'id' => $s->id,
                    'doctor_id' => $s->doctor_id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'General Specialist',
                    'session_date' => $sessionDateStr,
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                    'start_time_raw' => $startTimeStr,
                    'end_time_raw' => $endTimeStr,
                    'max_tokens' => $s->max_tokens,
                    'booked_tokens_count' => $bookedCount,
                    'available_tokens_count' => max(0, $s->max_tokens - $bookedCount),
                    'raw_status' => $s->status,
                    'status' => $s->status,
                    'effective_status' => $effectiveStatus,
                    'status_label' => $statusLabel,
                    'is_overrunning' => $isOverrunning,
                    'is_past_unstarted' => $isPastUnstarted,
                    'room_number' => $s->room_number ?: 'Suite A',
                    'cancellation_reason' => $s->cancellation_reason,
                    'notes' => $s->notes,
                    'doctor_fee_lkr' => round($s->doctor_fee / 100, 2),
                    'clinic_fee_lkr' => round($s->clinic_fee / 100, 2),
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                    'color' => $docColor,
                ];
            });

        // Collect distinct room names for the Day view columns
        $knownRooms = DoctorSession::whereNotNull('room_number')
            ->where('room_number', '!=', '')
            ->distinct()
            ->pluck('room_number')
            ->sort()
            ->values()
            ->all();

        if (empty($knownRooms)) {
            $knownRooms = ['Suite A', 'Suite B', 'Suite C', 'Room 1', 'Room 2'];
        }

        return Inertia::render('Calendar/Index', [
            'view' => $view,
            'selectedDate' => $selectedDate->format('Y-m-d'),
            'selectedDoctorIds' => $selectedDoctorIds,
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'days' => $days,
            'doctors' => $doctors,
            'sessions' => $sessions,
            'rooms' => $knownRooms,
            'serverTimeColombo' => $nowColombo->toIso8601String(),
        ]);
    }

    /**
     * Get roster details for a given session.
     */
    public function roster(DoctorSession $session): JsonResponse
    {
        $session->load(['doctor', 'tokens.patient']);

        $tokens = $session->tokens->map(fn ($token) => [
            'id' => $token->id,
            'token_number' => $token->token_number,
            'patient_id' => $token->patient_id,
            'patient_name' => $token->patient?->name ?? 'Walk-in Patient',
            'patient_phone' => $token->patient?->phone ?? '—',
            'patient_nic' => $token->patient?->nic ?? '—',
            'estimated_time' => $token->estimated_time ? Carbon::parse($token->estimated_time)->format('h:i A') : null,
            'status' => $token->status,
            'payment_status' => $token->payment_status,
            'doctor_fee' => $token->doctor_fee,
            'clinic_fee' => $token->clinic_fee,
        ]);

        return response()->json([
            'session' => [
                'id' => $session->id,
                'doctor_id' => $session->doctor_id,
                'doctor_name' => trim(($session->doctor?->title ?? 'Dr.').' '.($session->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $session->doctor?->specialty ?? 'General',
                'session_date' => $session->session_date->format('Y-m-d'),
                'session_date_formatted' => $session->session_date->format('M d, Y (l)'),
                'start_time' => Carbon::parse($session->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($session->end_time)->format('h:i A'),
                'start_time_raw' => substr((string) $session->start_time, 0, 5),
                'end_time_raw' => substr((string) $session->end_time, 0, 5),
                'room_number' => $session->room_number ?? 'Suite A',
                'status' => $session->status,
                'max_tokens' => $session->max_tokens,
                'booked_count' => $tokens->whereNotIn('status', ['cancelled'])->count(),
                'doctor_fee_lkr' => round($session->doctor_fee / 100, 2),
                'clinic_fee_lkr' => round($session->clinic_fee / 100, 2),
                'cancellation_reason' => $session->cancellation_reason,
                'notes' => $session->notes,
            ],
            'tokens' => $tokens,
        ]);
    }

    /**
     * Cancel a session and update active tokens.
     */
    public function cancelSession(Request $request, DoctorSession $session): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        // Guard: Block cancelling a session that has paid bills or completed tokens
        $paidBillsCount = Bill::where('tenant_id', $session->tenant_id)
            ->where('payment_status', Bill::STATUS_PAID)
            ->whereHas('token', fn ($q) => $q->where('doctor_session_id', $session->id))
            ->count();

        $completedTokensCount = $session->tokens()->where('status', BookingToken::STATUS_COMPLETED)->count();

        if ($paidBillsCount > 0 || $completedTokensCount > 0) {
            $msg = "Cannot cancel session: This session has {$paidBillsCount} paid bill(s)";
            if ($completedTokensCount > 0) {
                $msg .= " and {$completedTokensCount} completed consultation(s)";
            }
            $msg .= '. Please refund or move these patient bookings first before cancelling.';

            return redirect()->back()->with('error', $msg);
        }

        $session->update([
            'status' => 'cancelled',
            'cancellation_reason' => $validated['reason'],
        ]);

        // Cancel all active tokens
        $affectedTokens = $session->tokens()
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->update([
                'status' => BookingToken::STATUS_CANCELLED,
            ]);

        $msg = 'Channeling session cancelled.';
        if ($affectedTokens > 0) {
            $msg .= " {$affectedTokens} patient token(s) flagged as cancelled.";
        }

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Reschedule a session to a new date/time and update tokens.
     */
    public function rescheduleSession(Request $request, DoctorSession $session): RedirectResponse
    {
        $validated = $request->validate([
            'session_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ]);

        $session->update([
            'session_date' => $validated['session_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'status' => 'scheduled',
        ]);

        // Recalculate estimated consultation times for all existing tokens
        $tokens = $session->tokens()->whereNotIn('status', ['cancelled'])->get();
        foreach ($tokens as $token) {
            $newEstimatedTime = $session->calculateEstimatedTime($token->token_number);
            $token->update(['estimated_time' => $newEstimatedTime]);
        }

        return redirect()->back()->with('success', "Session rescheduled to {$validated['session_date']} at {$validated['start_time']}. Estimated token times recalculated for {$tokens->count()} patient(s).");
    }

    /**
     * Update session details (quota, room, fees, notes).
     */
    public function updateSession(Request $request, DoctorSession $session): RedirectResponse
    {
        $validated = $request->validate([
            'max_tokens' => ['required', 'integer', 'min:1', 'max:200'],
            'room_number' => ['nullable', 'string', 'max:50'],
            'doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $bookedCount = $session->tokens()->whereNotIn('status', ['cancelled'])->count();
        if ($validated['max_tokens'] < $bookedCount) {
            return redirect()->back()->withErrors([
                'max_tokens' => "Cannot set max tokens to {$validated['max_tokens']} because {$bookedCount} patient(s) are already booked.",
            ]);
        }

        $updates = [
            'max_tokens' => $validated['max_tokens'],
            'room_number' => $validated['room_number'] ?? $session->room_number,
            'notes' => $validated['notes'] ?? $session->notes,
        ];

        if (isset($validated['doctor_fee_lkr'])) {
            $updates['doctor_fee'] = (int) round(((float) $validated['doctor_fee_lkr']) * 100);
            $updates['custom_doctor_fee'] = $updates['doctor_fee'];
        }

        if (isset($validated['clinic_fee_lkr'])) {
            $updates['clinic_fee'] = (int) round(((float) $validated['clinic_fee_lkr']) * 100);
            $updates['custom_clinic_fee'] = $updates['clinic_fee'];
        }

        $session->update($updates);

        return redirect()->back()->with('success', 'Session details and quota updated successfully.');
    }

    /**
     * Duplicate a session to a target date.
     */
    public function duplicateSession(Request $request, DoctorSession $session): RedirectResponse
    {
        $validated = $request->validate([
            'target_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'room_number' => ['nullable', 'string', 'max:50'],
        ]);

        $startTime = $validated['start_time'] ?? substr((string) $session->start_time, 0, 5);
        $endTime = $validated['end_time'] ?? substr((string) $session->end_time, 0, 5);
        $room = $validated['room_number'] ?? $session->room_number;

        // Check doctor overlap on target date
        $overlap = DoctorSession::findDoctorOverlap(
            $session->tenant_id,
            $session->doctor_id,
            $validated['target_date'],
            $startTime,
            $endTime
        );

        if ($overlap) {
            return redirect()->back()->withErrors([
                'target_date' => "Dr. {$session->doctor?->name} already has a session on {$validated['target_date']} ({$overlap->start_time} - {$overlap->end_time}).",
            ]);
        }

        DoctorSession::create([
            'tenant_id' => $session->tenant_id,
            'doctor_id' => $session->doctor_id,
            'session_template_id' => null,
            'session_date' => $validated['target_date'],
            'start_time' => $startTime,
            'end_time' => $endTime,
            'max_tokens' => $session->max_tokens,
            'mode' => $session->mode ?? 'token',
            'status' => 'scheduled',
            'room_number' => $room,
            'doctor_fee' => $session->doctor_fee,
            'clinic_fee' => $session->clinic_fee,
            'fee_override_type' => $session->fee_override_type ?? 'inherit',
            'notes' => $session->notes ? "Duplicated from {$session->session_date->format('Y-m-d')}: {$session->notes}" : null,
        ]);

        return redirect()->back()->with('success', "Session duplicated to {$validated['target_date']} successfully.");
    }
}
