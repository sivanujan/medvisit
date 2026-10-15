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

        $todaySessions = $sessionsQuery->orderBy('start_time')->get()->map(function ($s) {
            return [
                'id' => $s->id,
                'doctor_id' => $s->doctor_id,
                'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $s->doctor?->specialty ?? 'General',
                'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                'room_number' => $s->room_number ?? 'Consultation Suite',
                'status' => $s->status,
                'current_token_number' => $s->current_token_number,
                'max_tokens' => $s->max_tokens,
                'booked_tokens_count' => $s->booked_tokens_count,
            ];
        });

        // Determine active session
        $selectedSessionId = $request->query('session_id') ? (int) $request->query('session_id') : null;
        $activeSessionModel = null;

        if ($selectedSessionId) {
            $activeSessionModel = DoctorSession::with(['doctor', 'tokens.patient', 'tokens.bill'])
                ->find($selectedSessionId);
        }

        if (! $activeSessionModel && $todaySessions->isNotEmpty()) {
            $firstSessionId = $todaySessions->firstWhere('status', 'in_progress')['id']
                ?? $todaySessions->firstWhere('status', 'scheduled')['id']
                ?? $todaySessions->first()['id'];

            $activeSessionModel = DoctorSession::with(['doctor', 'tokens.patient', 'tokens.bill'])
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
            'no_show' => 0,
        ];

        if ($activeSessionModel) {
            $rawTokens = $activeSessionModel->tokens->sortBy('token_number')->values();

            $tokens = $rawTokens->map(function ($t) {
                return [
                    'id' => $t->id,
                    'token_number' => $t->token_number,
                    'patient_id' => $t->patient_id,
                    'patient_name' => $t->patient?->name ?? 'Walk-in Patient',
                    'patient_phone' => $t->patient?->phone ?? '—',
                    'patient_nic' => $t->patient?->nic ?? '—',
                    'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '—',
                    'status' => $t->status,
                    'booked_via' => $t->booked_via,
                    'payment_status' => $t->bill?->payment_status ?? 'pending',
                    'checked_in_at' => $t->checked_in_at ? Carbon::parse($t->checked_in_at)->format('h:i A') : null,
                    'called_at' => $t->called_at ? Carbon::parse($t->called_at)->format('h:i A') : null,
                ];
            })->all();

            // Stats
            $stats['total'] = count($tokens);
            $stats['checked_in'] = $rawTokens->where('status', BookingToken::STATUS_CHECKED_IN)->count();
            $stats['waiting'] = $rawTokens->whereIn('status', [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN])->count();
            $stats['completed'] = $rawTokens->where('status', BookingToken::STATUS_COMPLETED)->count();
            $stats['no_show'] = $rawTokens->where('status', BookingToken::STATUS_NO_SHOW)->count();

            // Now serving
            $nowServingModel = $rawTokens->firstWhere('token_number', $activeSessionModel->current_token_number)
                ?? $rawTokens->firstWhere('status', BookingToken::STATUS_IN_CONSULTATION)
                ?? $rawTokens->firstWhere('status', BookingToken::STATUS_CALLED);

            if ($nowServingModel && in_array($nowServingModel->status, [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])) {
                $nowServingToken = [
                    'id' => $nowServingModel->id,
                    'token_number' => $nowServingModel->token_number,
                    'patient_name' => $nowServingModel->patient?->name ?? 'Patient',
                    'patient_phone' => $nowServingModel->patient?->phone ?? '—',
                    'status' => $nowServingModel->status,
                    'estimated_time' => $nowServingModel->estimated_time ? Carbon::parse($nowServingModel->estimated_time)->format('h:i A') : '',
                    'called_at' => $nowServingModel->called_at ? Carbon::parse($nowServingModel->called_at)->diffForHumans() : '',
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
            ];
        }

        return Inertia::render('Queue/Today', [
            'todaySessions' => $todaySessions,
            'activeSession' => $activeSession,
            'tokens' => $tokens,
            'nowServingToken' => $nowServingToken,
            'nextInLine' => $nextInLine,
            'stats' => $stats,
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

        return redirect()->back()->with('success', "Now Calling Token #{$nextToken->token_number} ({$nextToken->patient?->name}) to Room {$session->room_number}.");
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
}
