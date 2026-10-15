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
     * Color palette for doctor badges and session blocks.
     */
    protected array $doctorPalette = [
        ['bg' => 'bg-blue-500/10', 'border' => 'border-blue-500/30', 'text' => 'text-blue-600 dark:text-blue-400', 'badge' => 'bg-blue-500', 'hex' => '#3b82f6'],
        ['bg' => 'bg-emerald-500/10', 'border' => 'border-emerald-500/30', 'text' => 'text-emerald-600 dark:text-emerald-400', 'badge' => 'bg-emerald-500', 'hex' => '#10b981'],
        ['bg' => 'bg-purple-500/10', 'border' => 'border-purple-500/30', 'text' => 'text-purple-600 dark:text-purple-400', 'badge' => 'bg-purple-500', 'hex' => '#8b5cf6'],
        ['bg' => 'bg-amber-500/10', 'border' => 'border-amber-500/30', 'text' => 'text-amber-600 dark:text-amber-400', 'badge' => 'bg-amber-500', 'hex' => '#f59e0b'],
        ['bg' => 'bg-rose-500/10', 'border' => 'border-rose-500/30', 'text' => 'text-rose-600 dark:text-rose-400', 'badge' => 'bg-rose-500', 'hex' => '#f43f5e'],
        ['bg' => 'bg-cyan-500/10', 'border' => 'border-cyan-500/30', 'text' => 'text-cyan-600 dark:text-cyan-400', 'badge' => 'bg-cyan-500', 'hex' => '#06b6d4'],
        ['bg' => 'bg-indigo-500/10', 'border' => 'border-indigo-500/30', 'text' => 'text-indigo-600 dark:text-indigo-400', 'badge' => 'bg-indigo-500', 'hex' => '#6366f1'],
    ];

    /**
     * Display the channeling calendar.
     */
    public function index(Request $request): Response
    {
        $view = $request->query('view', 'month');
        $selectedDate = $request->query('date') ? Carbon::parse($request->query('date')) : Carbon::today('Asia/Colombo');
        $selectedDoctorId = $request->query('doctor_id') ? (int) $request->query('doctor_id') : null;

        // Calculate date range based on view
        if ($view === 'day') {
            $startDate = $selectedDate->copy()->startOfDay();
            $endDate = $selectedDate->copy()->endOfDay();
        } elseif ($view === 'week') {
            $startDate = $selectedDate->copy()->startOfWeek(Carbon::MONDAY);
            $endDate = $selectedDate->copy()->endOfWeek(Carbon::SUNDAY);
        } else {
            // Month view: show full calendar grid including padding days
            $startDate = $selectedDate->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY);
            $endDate = $selectedDate->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY);
        }

        // Fetch doctors and assign distinct colors
        $doctors = Doctor::orderBy('name')->get()->values()->map(function ($doc, $index) {
            $color = $this->doctorPalette[$index % count($this->doctorPalette)];

            return [
                'id' => $doc->id,
                'name' => $doc->name,
                'title' => $doc->title ?? 'Dr.',
                'full_title' => trim(($doc->title ?? 'Dr.').' '.$doc->name),
                'specialty' => $doc->specialty,
                'color' => $color,
            ];
        });

        // Doctor color lookup
        $doctorColorMap = $doctors->keyBy('id')->map(fn ($d) => $d['color'])->all();

        // Query sessions in range
        $sessionsQuery = DoctorSession::with(['doctor', 'tokens'])
            ->whereBetween('session_date', [$startDate->toDateString(), $endDate->toDateString()]);

        if ($selectedDoctorId) {
            $sessionsQuery->where('doctor_id', $selectedDoctorId);
        }

        $sessions = $sessionsQuery->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) use ($doctorColorMap) {
                $docColor = $doctorColorMap[$s->doctor_id] ?? $this->doctorPalette[0];
                $bookedCount = $s->tokens->whereNotIn('status', ['cancelled'])->count();

                return [
                    'id' => $s->id,
                    'doctor_id' => $s->doctor_id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'General Specialist',
                    'session_date' => $s->session_date->format('Y-m-d'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                    'start_time_raw' => substr((string) $s->start_time, 0, 5),
                    'end_time_raw' => substr((string) $s->end_time, 0, 5),
                    'max_tokens' => $s->max_tokens,
                    'booked_tokens_count' => $bookedCount,
                    'available_tokens_count' => max(0, $s->max_tokens - $bookedCount),
                    'status' => $s->status,
                    'room_number' => $s->room_number ?? 'Suite A',
                    'cancellation_reason' => $s->cancellation_reason,
                    'notes' => $s->notes,
                    'doctor_fee_lkr' => round($s->doctor_fee / 100, 2),
                    'clinic_fee_lkr' => round($s->clinic_fee / 100, 2),
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                    'color' => $docColor,
                ];
            });

        return Inertia::render('Calendar/Index', [
            'view' => $view,
            'selectedDate' => $selectedDate->format('Y-m-d'),
            'selectedDoctorId' => $selectedDoctorId,
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'doctors' => $doctors,
            'sessions' => $sessions,
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
                'doctor_name' => trim(($session->doctor?->title ?? 'Dr.').' '.($session->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $session->doctor?->specialty ?? 'General',
                'session_date' => $session->session_date->format('M d, Y (l)'),
                'start_time' => Carbon::parse($session->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($session->end_time)->format('h:i A'),
                'room_number' => $session->room_number ?? 'Suite A',
                'status' => $session->status,
                'max_tokens' => $session->max_tokens,
                'booked_count' => $tokens->whereNotIn('status', ['cancelled'])->count(),
                'cancellation_reason' => $session->cancellation_reason,
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
}
