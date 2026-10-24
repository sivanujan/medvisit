<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TodayQueueController extends Controller
{
    /**
     * Display today's operational channeling queue.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $today = Carbon::today('Asia/Colombo')->toDateString();

        $isDoctor = $user->hasRole('doctor');
        $linkedDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;

        // Query today's sessions
        $sessionsQuery = DoctorSession::with(['doctor'])
            ->where('session_date', $today)
            ->whereNotIn('status', ['cancelled']);

        if ($isDoctor && $linkedDoctor) {
            $sessionsQuery->where('doctor_id', $linkedDoctor->id);
        }

        $allTodayModels = $sessionsQuery->get();

        // Sort: Live (in_progress) first, then paused, then scheduled, then completed
        $sortedSessions = $allTodayModels->sortBy(function ($s) {
            $order = [
                'in_progress' => 0,
                'paused' => 1,
                'scheduled' => 2,
                'completed' => 3,
            ];

            return ($order[$s->status] ?? 4).'_'.$s->start_time;
        })->values();

        $todaySessions = $sortedSessions->map(function ($s) {
            return [
                'id' => $s->id,
                'doctor_id' => $s->doctor_id,
                'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $s->doctor?->specialty ?? 'General',
                'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                'room_number' => $s->room_number ?? 'Room 1',
                'status' => $s->status,
                'current_token_number' => $s->current_token_number,
                'max_tokens' => $s->max_tokens,
                'booked_tokens_count' => $s->tokens()->whereNotIn('status', ['cancelled'])->count(),
            ];
        });

        // Determine active session
        $selectedSessionId = $request->query('session_id') ? (int) $request->query('session_id') : null;
        $activeSessionModel = null;

        if ($selectedSessionId) {
            $activeSessionModel = DoctorSession::with(['doctor', 'tokens.patient', 'tokens.bill', 'tokens.visitType'])
                ->find($selectedSessionId);
        }

        if (! $activeSessionModel && $todaySessions->isNotEmpty()) {
            $firstSessionId = $todaySessions->firstWhere('status', 'in_progress')['id']
                ?? $todaySessions->firstWhere('status', 'scheduled')['id']
                ?? $todaySessions->first()['id'];

            $activeSessionModel = DoctorSession::with(['doctor', 'tokens.patient', 'tokens.bill', 'tokens.visitType'])
                ->find($firstSessionId);
        }

        $activeSession = null;
        $tokens = [];
        $nowServingToken = null;
        $nextInLine = [];
        $stats = [
            'total' => 0,
            'checked_in' => 0,
            'waiting' => 0,
            'completed' => 0,
            'skipped' => 0,
            'no_show' => 0,
            'average_consult_minutes' => 8,
            'estimated_finish_time' => '—',
        ];

        $maskPhone = function (?string $phone): string {
            if (empty($phone)) {
                return '—';
            }
            $clean = trim($phone);
            $len = strlen($clean);
            if ($len <= 3) {
                return $clean;
            }

            return str_repeat('•', max(4, $len - 3)).substr($clean, -3);
        };

        if ($activeSessionModel) {
            $rawTokens = $activeSessionModel->tokens->sortBy('token_number')->values();

            $tokens = $rawTokens->map(function ($t) use ($maskPhone) {
                $rawPhone = $t->patient?->phone ?? '';
                $isWalkIn = in_array($t->booked_via, ['walk_in', 'reception', 'phone'], true);
                $isArrived = in_array($t->status, [
                    BookingToken::STATUS_CHECKED_IN,
                    BookingToken::STATUS_CALLED,
                    BookingToken::STATUS_IN_CONSULTATION,
                    BookingToken::STATUS_COMPLETED,
                ], true);

                $totalCents = ($t->session?->doctor_fee ?? 0) + ($t->session?->clinic_fee ?? 0);
                if (! empty($t->fee_snapshot['patient_total'])) {
                    $totalCents = (int) $t->fee_snapshot['patient_total'];
                }

                return [
                    'id' => $t->id,
                    'token_number' => $t->token_number,
                    'patient_id' => $t->patient_id,
                    'patient_name' => $t->patient?->name ?? 'Walk-in Patient',
                    'patient_phone' => $rawPhone ?: '—',
                    'patient_phone_masked' => $maskPhone($rawPhone),
                    'patient_nic' => $t->patient?->nic ?? '—',
                    'visit_type' => $t->visitType?->name ?? 'Standard Consultation',
                    'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '—',
                    'status' => $t->status,
                    'booked_via' => $t->booked_via,
                    'is_walk_in' => $isWalkIn,
                    'is_arrived' => $isArrived,
                    'payment_status' => $t->bill?->payment_status ?? 'paid',
                    'fee_formatted' => 'Rs. '.number_format($totalCents / 100, 2),
                    'checked_in_at' => $t->checked_in_at ? Carbon::parse($t->checked_in_at)->format('h:i A') : null,
                    'called_at' => $t->called_at ? Carbon::parse($t->called_at)->format('h:i A') : null,
                ];
            })->all();

            // Completed consults calculation for avg consult time
            $completedTokens = $rawTokens->where('status', BookingToken::STATUS_COMPLETED);
            $totalMins = 0;
            $countMins = 0;
            foreach ($completedTokens as $ct) {
                if ($ct->called_at && $ct->completed_at) {
                    $m = Carbon::parse($ct->called_at)->diffInMinutes(Carbon::parse($ct->completed_at));
                    if ($m > 0 && $m < 120) {
                        $totalMins += $m;
                        $countMins++;
                    }
                }
            }
            $avgConsultMinutes = $countMins > 0 ? (int) round($totalMins / $countMins) : 8;

            // Stats
            $stats['total'] = count($tokens);
            $stats['checked_in'] = $rawTokens->where('status', BookingToken::STATUS_CHECKED_IN)->count();
            $stats['waiting'] = $rawTokens->whereIn('status', [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN])->count();
            $stats['completed'] = $completedTokens->count();
            $stats['skipped'] = $rawTokens->where('status', BookingToken::STATUS_SKIPPED)->count();
            $stats['no_show'] = $rawTokens->where('status', BookingToken::STATUS_NO_SHOW)->count();
            $stats['average_consult_minutes'] = $avgConsultMinutes;

            // Estimated finish time
            $remainingPatients = $stats['waiting'] + ($activeSessionModel->status === 'in_progress' ? 1 : 0);
            $estFinishTime = Carbon::now('Asia/Colombo')->addMinutes($remainingPatients * $avgConsultMinutes)->format('h:i A');
            $stats['estimated_finish_time'] = $remainingPatients > 0 ? $estFinishTime : 'All Served';

            // Now serving
            $nowServingModel = $rawTokens->firstWhere('token_number', $activeSessionModel->current_token_number)
                ?? $rawTokens->firstWhere('status', BookingToken::STATUS_IN_CONSULTATION)
                ?? $rawTokens->firstWhere('status', BookingToken::STATUS_CALLED);

            if ($nowServingModel && in_array($nowServingModel->status, [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])) {
                $rawPhone = $nowServingModel->patient?->phone ?? '';
                $calledTimestamp = $nowServingModel->called_at ? Carbon::parse($nowServingModel->called_at)->timestamp : time();
                $inDurationSeconds = max(0, time() - $calledTimestamp);

                $totalCents = ($activeSessionModel->doctor_fee ?? 0) + ($activeSessionModel->clinic_fee ?? 0);
                if (! empty($nowServingModel->fee_snapshot['patient_total'])) {
                    $totalCents = (int) $nowServingModel->fee_snapshot['patient_total'];
                }

                $nowServingToken = [
                    'id' => $nowServingModel->id,
                    'token_number' => $nowServingModel->token_number,
                    'patient_name' => $nowServingModel->patient?->name ?? 'Patient',
                    'patient_phone' => $rawPhone ?: '—',
                    'patient_phone_masked' => $maskPhone($rawPhone),
                    'visit_type' => $nowServingModel->visitType?->name ?? 'Standard Consultation',
                    'payment_status' => $nowServingModel->bill?->payment_status ?? 'paid',
                    'fee_formatted' => 'Rs. '.number_format($totalCents / 100, 2),
                    'status' => $nowServingModel->status,
                    'estimated_time' => $nowServingModel->estimated_time ? Carbon::parse($nowServingModel->estimated_time)->format('h:i A') : '',
                    'called_at' => $nowServingModel->called_at ? Carbon::parse($nowServingModel->called_at)->format('h:i A') : 'Just now',
                    'called_timestamp' => $calledTimestamp,
                    'duration_seconds' => $inDurationSeconds,
                ];
            }

            // Next in line: checked_in or booked tokens with token_number > current_token_number
            $nextInLine = $rawTokens->filter(function ($t) use ($activeSessionModel) {
                return $t->token_number > $activeSessionModel->current_token_number
                    && in_array($t->status, [BookingToken::STATUS_CHECKED_IN, BookingToken::STATUS_BOOKED]);
            })->take(3)->map(fn ($t) => [
                'id' => $t->id,
                'token_number' => $t->token_number,
                'patient_name' => $t->patient?->name ?? 'Patient',
                'status' => $t->status,
                'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '',
            ])->values()->all();

            $activeSession = [
                'id' => $activeSessionModel->id,
                'doctor_id' => $activeSessionModel->doctor_id,
                'doctor_name' => trim(($activeSessionModel->doctor?->title ?? 'Dr.').' '.($activeSessionModel->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $activeSessionModel->doctor?->specialty ?? 'General',
                'start_time' => Carbon::parse($activeSessionModel->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($activeSessionModel->end_time)->format('h:i A'),
                'room_number' => $activeSessionModel->room_number ?? 'Consultation Suite',
                'status' => $activeSessionModel->status,
                'current_token_number' => $activeSessionModel->current_token_number,
                'max_tokens' => $activeSessionModel->max_tokens,
                'fee_formatted' => 'Rs. '.number_format(($activeSessionModel->doctor_fee + $activeSessionModel->clinic_fee) / 100, 2),
                'average_consult_minutes' => $avgConsultMinutes,
                'estimated_finish_time' => $stats['estimated_finish_time'],
            ];
        }

        // Upcoming sessions for State 2
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>', $today)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->limit(3)
            ->get()
            ->map(function ($s) {
                $sessionDate = Carbon::parse($s->session_date);
                $dateLabel = $sessionDate->isTomorrow() ? 'Tomorrow' : $sessionDate->format('D, M j');

                return [
                    'id' => $s->id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'General',
                    'date_formatted' => $dateLabel,
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Room 1',
                    'booked_tokens_count' => $s->tokens()->whereNotIn('status', ['cancelled'])->count(),
                    'max_tokens' => $s->max_tokens,
                ];
            });

        // Has clinic completed any session ever? (Controls showing 3-step guide in State 2)
        $hasCompletedAnySessionEver = DoctorSession::where('status', 'completed')->exists();

        // Calculate countdown info if State 3 (sessions today but none started yet)
        $nextUpcomingSessionToday = null;
        if ($todaySessions->isNotEmpty() && $todaySessions->every(fn ($s) => $s['status'] === 'scheduled')) {
            $first = $allTodayModels->firstWhere('id', $todaySessions->first()['id']);
            if ($first) {
                $now = Carbon::now('Asia/Colombo');
                $start = Carbon::parse($first->session_date->format('Y-m-d').' '.$first->start_time, 'Asia/Colombo');
                $diffMinutes = (int) $now->diffInMinutes($start, false);

                $nextUpcomingSessionToday = [
                    'id' => $first->id,
                    'doctor_name' => trim(($first->doctor?->title ?? 'Dr.').' '.($first->doctor?->name ?? 'Doctor')),
                    'start_time' => Carbon::parse($first->start_time)->format('h:i A'),
                    'starts_in_minutes' => max(0, $diffMinutes),
                    'starts_in_text' => $diffMinutes > 0 ? "starts in {$diffMinutes} min" : 'starting now',
                    'booked_count' => $first->tokens()->whereNotIn('status', ['cancelled'])->count(),
                ];
            }
        }

        return Inertia::render('Queue/Today', [
            'todaySessions' => $todaySessions,
            'activeSession' => $activeSession,
            'tokens' => $tokens,
            'nowServingToken' => $nowServingToken,
            'nextInLine' => $nextInLine,
            'stats' => $stats,
            'upcomingSessions' => $upcomingSessions,
            'hasCompletedAnySessionEver' => $hasCompletedAnySessionEver,
            'nextUpcomingSessionToday' => $nextUpcomingSessionToday,
            'isDoctor' => $isDoctor,
        ]);
    }

    /**
     * Mark a patient token as checked-in (arrived at clinic).
     */
    public function checkIn(BookingToken $token): RedirectResponse
    {
        $token->update([
            'status' => BookingToken::STATUS_CHECKED_IN,
            'checked_in_at' => now(),
        ]);

        return redirect()->back()->with('success', "Patient {$token->patient?->name} (Token #{$token->token_number}) checked in.");
    }

    /**
     * Call the next patient in line.
     */
    public function callNext(DoctorSession $session): RedirectResponse
    {
        // 1. Prefer checked-in patient tokens first
        $nextToken = $session->tokens()
            ->where('token_number', '>', $session->current_token_number)
            ->where('status', BookingToken::STATUS_CHECKED_IN)
            ->orderBy('token_number')
            ->first();

        // 2. Fall back to next booked token
        if (! $nextToken) {
            $nextToken = $session->tokens()
                ->where('token_number', '>', $session->current_token_number)
                ->where('status', BookingToken::STATUS_BOOKED)
                ->orderBy('token_number')
                ->first();
        }

        if (! $nextToken) {
            return redirect()->back()->with('info', 'No further waiting patients in queue for this session.');
        }

        $nextToken->update([
            'status' => BookingToken::STATUS_CALLED,
            'called_at' => now(),
        ]);

        $session->update([
            'current_token_number' => $nextToken->token_number,
            'status' => 'in_progress',
        ]);

        return redirect()->back()->with('success', "Now Calling Token #{$nextToken->token_number} ({$nextToken->patient?->name}) to {$session->room_number}.");
    }

    /**
     * Recall the currently called patient (re-triggers TV chime).
     */
    public function recall(DoctorSession $session): RedirectResponse
    {
        $currentToken = $session->tokens()
            ->where('token_number', $session->current_token_number)
            ->whereIn('status', [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])
            ->first();

        if (! $currentToken) {
            return redirect()->back()->with('error', 'No active token currently called to recall.');
        }

        $currentToken->update([
            'called_at' => now(),
        ]);

        return redirect()->back()->with('success', "Recalled Token #{$currentToken->token_number}. Audio chime sent to waiting room TV.");
    }

    /**
     * Skip the currently called patient token.
     */
    public function skip(DoctorSession $session): RedirectResponse
    {
        $currentToken = $session->tokens()
            ->where('token_number', $session->current_token_number)
            ->whereIn('status', [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])
            ->first();

        if (! $currentToken) {
            return redirect()->back()->with('error', 'No active patient is currently called to skip.');
        }

        $currentToken->update([
            'status' => BookingToken::STATUS_SKIPPED,
        ]);

        return redirect()->back()->with('info', "Token #{$currentToken->token_number} ({$currentToken->patient?->name}) skipped.");
    }

    /**
     * Start consultation for the called token.
     */
    public function startConsultation(DoctorSession $session): RedirectResponse
    {
        $currentToken = $session->tokens()
            ->where('token_number', $session->current_token_number)
            ->where('status', BookingToken::STATUS_CALLED)
            ->first();

        if (! $currentToken) {
            return redirect()->back()->with('error', 'No patient is currently waiting in called status.');
        }

        $currentToken->update([
            'status' => BookingToken::STATUS_IN_CONSULTATION,
        ]);

        return redirect()->back()->with('success', "Consultation started with Token #{$currentToken->token_number}.");
    }

    /**
     * Complete consultation for current patient.
     */
    public function completeConsultation(DoctorSession $session): RedirectResponse
    {
        $currentToken = $session->tokens()
            ->where('token_number', $session->current_token_number)
            ->whereIn('status', [BookingToken::STATUS_IN_CONSULTATION, BookingToken::STATUS_CALLED])
            ->first();

        if (! $currentToken) {
            return redirect()->back()->with('error', 'No active consultation to complete.');
        }

        $currentToken->update([
            'status' => BookingToken::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        return redirect()->back()->with('success', "Consultation for Token #{$currentToken->token_number} completed.");
    }

    /**
     * Complete current consultation AND immediately call next patient.
     */
    public function completeAndNext(DoctorSession $session): RedirectResponse
    {
        // 1. Complete current token
        $currentToken = $session->tokens()
            ->where('token_number', $session->current_token_number)
            ->whereIn('status', [BookingToken::STATUS_IN_CONSULTATION, BookingToken::STATUS_CALLED])
            ->first();

        if ($currentToken) {
            $currentToken->update([
                'status' => BookingToken::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
        }

        // 2. Call next token
        $nextToken = $session->tokens()
            ->where('token_number', '>', $session->current_token_number)
            ->where('status', BookingToken::STATUS_CHECKED_IN)
            ->orderBy('token_number')
            ->first();

        if (! $nextToken) {
            $nextToken = $session->tokens()
                ->where('token_number', '>', $session->current_token_number)
                ->where('status', BookingToken::STATUS_BOOKED)
                ->orderBy('token_number')
                ->first();
        }

        if (! $nextToken) {
            return redirect()->back()->with('success', 'Previous consultation completed. No more patients waiting in queue!');
        }

        $nextToken->update([
            'status' => BookingToken::STATUS_CALLED,
            'called_at' => now(),
        ]);

        $session->update([
            'current_token_number' => $nextToken->token_number,
            'status' => 'in_progress',
        ]);

        return redirect()->back()->with('success', "Consultation finished. Now Calling Token #{$nextToken->token_number} ({$nextToken->patient?->name}).");
    }

    /**
     * Mark patient token as No-Show.
     */
    public function noShow(BookingToken $token): RedirectResponse
    {
        $token->update([
            'status' => BookingToken::STATUS_NO_SHOW,
        ]);

        return redirect()->back()->with('info', "Token #{$token->token_number} marked as No-Show.");
    }

    /**
     * Pause a live session.
     */
    public function pauseSession(DoctorSession $session): RedirectResponse
    {
        $session->update(['status' => 'paused']);

        return redirect()->back()->with('info', "Session for {$session->doctor?->name} has been paused.");
    }

    /**
     * Resume a paused session.
     */
    public function resumeSession(DoctorSession $session): RedirectResponse
    {
        $session->update(['status' => 'in_progress']);

        return redirect()->back()->with('success', "Session for {$session->doctor?->name} resumed.");
    }

    /**
     * End a session (completing active consultations).
     */
    public function endSession(DoctorSession $session): RedirectResponse
    {
        $session->update(['status' => 'completed']);

        $session->tokens()
            ->whereIn('status', [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])
            ->update([
                'status' => BookingToken::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

        return redirect()->back()->with('success', "Session for {$session->doctor?->name} ended.");
    }

    /**
     * Mark doctor arrived and start session.
     */
    public function doctorArrived(DoctorSession $session): RedirectResponse
    {
        $session->update(['status' => 'in_progress']);

        return redirect()->back()->with('success', 'Doctor arrival recorded. Session is now live.');
    }

    /**
     * Delay session by N minutes.
     */
    public function delaySession(Request $request, DoctorSession $session): RedirectResponse
    {
        $validated = $request->validate([
            'minutes' => ['required', 'integer', 'min:5', 'max:180'],
        ]);

        $minutes = (int) $validated['minutes'];

        $waitingTokens = $session->tokens()
            ->whereIn('status', [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN])
            ->get();

        foreach ($waitingTokens as $token) {
            if ($token->estimated_time) {
                $token->update([
                    'estimated_time' => Carbon::parse($token->estimated_time)->addMinutes($minutes)->toTimeString(),
                ]);
            }
        }

        return redirect()->back()->with('info', "Session delayed by {$minutes} minutes. Waiting times updated.");
    }

    /**
     * Call a specific token directly from the queue table.
     */
    public function callToken(BookingToken $token): RedirectResponse
    {
        $session = $token->session;
        if (! $session) {
            return redirect()->back()->with('error', 'Session not found.');
        }

        $token->update([
            'status' => BookingToken::STATUS_CALLED,
            'called_at' => now(),
        ]);

        $session->update([
            'current_token_number' => $token->token_number,
            'status' => 'in_progress',
        ]);

        return redirect()->back()->with('success', "Now Calling Token #{$token->token_number} ({$token->patient?->name}).");
    }

    /**
     * Restore a skipped or no-show token back into the waiting line.
     */
    public function restoreToken(BookingToken $token): RedirectResponse
    {
        $newStatus = $token->checked_in_at ? BookingToken::STATUS_CHECKED_IN : BookingToken::STATUS_BOOKED;

        $token->update([
            'status' => $newStatus,
        ]);

        return redirect()->back()->with('success', "Token #{$token->token_number} restored to queue.");
    }

    /**
     * Reorder a waiting token up or down.
     */
    public function reorderToken(Request $request, BookingToken $token): RedirectResponse
    {
        $direction = $request->input('direction', 'up');
        $session = $token->session;

        if (! $session) {
            return redirect()->back()->with('error', 'Session not found.');
        }

        $waitingTokens = $session->tokens()
            ->whereIn('status', [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN])
            ->orderBy('token_number')
            ->get();

        $currentIndex = $waitingTokens->search(fn ($t) => $t->id === $token->id);

        if ($currentIndex === false) {
            return redirect()->back()->with('error', 'Token is not in waiting queue.');
        }

        $swapIndex = $direction === 'up' ? $currentIndex - 1 : $currentIndex + 1;

        if ($swapIndex < 0 || $swapIndex >= $waitingTokens->count()) {
            return redirect()->back()->with('info', 'Cannot move token further.');
        }

        $otherToken = $waitingTokens[$swapIndex];

        $currentNum = $token->token_number;
        $otherNum = $otherToken->token_number;

        $token->update(['token_number' => $otherNum]);
        $otherToken->update(['token_number' => $currentNum]);

        return redirect()->back()->with('success', "Token #{$currentNum} reordered to #{$otherNum}.");
    }
}
