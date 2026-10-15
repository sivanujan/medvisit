<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BookingToken;
use App\Models\DoctorSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LiveQueueTvController extends Controller
{
    /**
     * Display the waiting room TV live display.
     */
    public function index(Request $request): Response
    {
        $tvData = $this->getTvData($request);

        return Inertia::render('Queue/Tv', [
            'tvData' => $tvData,
        ]);
    }

    /**
     * Polling endpoint for 5-second live updates.
     */
    public function data(Request $request): JsonResponse
    {
        $tvData = $this->getTvData($request);

        return response()->json($tvData);
    }

    /**
     * Assemble live TV data for today's active session and clinic rooms.
     */
    protected function getTvData(Request $request): array
    {
        $today = Carbon::today('Asia/Colombo')->toDateString();
        $sessionId = $request->query('session_id') ? (int) $request->query('session_id') : null;

        // Fetch all today's sessions
        $allTodaySessions = DoctorSession::with(['doctor', 'tokens.patient'])
            ->where('session_date', $today)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('start_time')
            ->get();

        $primarySession = null;
        if ($sessionId) {
            $primarySession = $allTodaySessions->firstWhere('id', $sessionId);
        }

        if (! $primarySession) {
            $primarySession = $allTodaySessions->firstWhere('status', 'in_progress')
                ?? $allTodaySessions->firstWhere('status', 'scheduled')
                ?? $allTodaySessions->first();
        }

        $nowServing = null;
        $nextInLine = [];
        $waitingCount = 0;
        $completedCount = 0;

        if ($primarySession) {
            $tokens = $primarySession->tokens->sortBy('token_number')->values();

            // Find current active token
            $activeToken = $tokens->firstWhere('token_number', $primarySession->current_token_number)
                ?? $tokens->firstWhere('status', BookingToken::STATUS_CALLED)
                ?? $tokens->firstWhere('status', BookingToken::STATUS_IN_CONSULTATION);

            if ($activeToken && in_array($activeToken->status, [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])) {
                $nowServing = [
                    'id' => $activeToken->id,
                    'token_number' => $activeToken->token_number,
                    'patient_name' => $activeToken->patient?->name ?? 'Patient',
                    'status' => $activeToken->status,
                    'called_at' => $activeToken->called_at ? Carbon::parse($activeToken->called_at)->timestamp : null,
                    'room_number' => $primarySession->room_number ?? 'Consultation Room',
                    'doctor_name' => trim(($primarySession->doctor?->title ?? 'Dr.').' '.($primarySession->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $primarySession->doctor?->specialty ?? 'Specialist',
                ];
            }

            // Next 3 in line
            $nextInLine = $tokens->filter(function ($t) use ($primarySession) {
                return $t->token_number > $primarySession->current_token_number
                    && in_array($t->status, [BookingToken::STATUS_CHECKED_IN, BookingToken::STATUS_BOOKED]);
            })->take(3)->map(fn ($t) => [
                'token_number' => $t->token_number,
                'patient_name' => $t->patient?->name ?? 'Patient',
                'status' => $t->status,
                'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '',
            ])->values()->all();

            $waitingCount = $tokens->whereIn('status', [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN])->count();
            $completedCount = $tokens->where('status', BookingToken::STATUS_COMPLETED)->count();
        }

        // Multi-room overview for clinics running simultaneous channeling sessions
        $roomsOverview = $allTodaySessions->map(function ($s) {
            return [
                'id' => $s->id,
                'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                'room_number' => $s->room_number ?? 'Suite',
                'current_token_number' => $s->current_token_number > 0 ? $s->current_token_number : '—',
                'status' => $s->status,
            ];
        })->all();

        return [
            'clinic' => [
                'name' => ucwords((string) (tenant('name') ?? 'MedVisit Clinic')),
                'subdomain' => tenant('subdomain') ?? 'clinic',
                'phone' => tenant('phone') ?? '',
            ],
            'primarySession' => $primarySession ? [
                'id' => $primarySession->id,
                'doctor_name' => trim(($primarySession->doctor?->title ?? 'Dr.').' '.($primarySession->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $primarySession->doctor?->specialty ?? 'Specialist',
                'room_number' => $primarySession->room_number ?? 'Consultation Suite 1',
                'status' => $primarySession->status,
            ] : null,
            'nowServing' => $nowServing,
            'nextInLine' => $nextInLine,
            'waitingCount' => $waitingCount,
            'completedCount' => $completedCount,
            'roomsOverview' => $roomsOverview,
            'currentTime' => Carbon::now('Asia/Colombo')->format('h:i:s A'),
            'currentDate' => Carbon::now('Asia/Colombo')->format('l, F d, Y'),
        ];
    }
}
