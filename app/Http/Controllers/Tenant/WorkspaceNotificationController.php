<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementRecipient;
use App\Models\BookingToken;
use App\Models\DoctorSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::today('Asia/Colombo')->toDateString();

        $notifications = [];

        // 1. Today's in-progress session alerts
        $inProgressSessions = DoctorSession::with('doctor')
            ->where('session_date', $today)
            ->where('status', 'in_progress')
            ->get();

        foreach ($inProgressSessions as $session) {
            $doctorName = $session->doctor?->name ?? 'Doctor';
            $notifications[] = [
                'id' => 'session_'.$session->id,
                'title' => 'Live Session In Progress',
                'message' => "{$doctorName} is now consulting in {$session->room_number}. Serving token #{$session->current_token_number}.",
                'time' => 'Live',
                'url' => '/sessions/today',
                'type' => 'session',
                'tone' => 'emerald',
            ];
        }

        // 2. Recent checked-in tokens
        $recentTokens = BookingToken::with(['patient', 'session.doctor'])
            ->whereHas('session', fn ($q) => $q->where('session_date', $today))
            ->whereIn('status', [BookingToken::STATUS_CHECKED_IN, BookingToken::STATUS_CALLED])
            ->latest('updated_at')
            ->limit(4)
            ->get();

        foreach ($recentTokens as $token) {
            $patientName = $token->patient?->name ?? 'Patient';
            $doctorName = $token->session?->doctor?->name ?? 'Doctor';
            $notifications[] = [
                'id' => 'token_'.$token->id,
                'title' => $token->status === BookingToken::STATUS_CALLED ? "Token #{$token->token_number} Called" : "Token #{$token->token_number} Checked In",
                'message' => "{$patientName} for {$doctorName} ({$token->status})",
                'time' => $token->updated_at->diffForHumans(),
                'url' => '/sessions/today',
                'type' => 'token',
                'tone' => $token->status === BookingToken::STATUS_CALLED ? 'primary' : 'blue',
            ];
        }

        // 3. Platform Broadcast Announcements
        $user = $request->user();
        if ($user) {
            $announcements = AnnouncementRecipient::with('announcement')
                ->where('user_id', $user->id)
                ->where('channel', 'in_app')
                ->whereNull('read_at')
                ->latest()
                ->limit(5)
                ->get();

            foreach ($announcements as $rec) {
                if (! $rec->announcement) {
                    continue;
                }
                $notifications[] = [
                    'id' => 'announcement_'.$rec->id,
                    'title' => $rec->announcement->title,
                    'message' => strip_tags((string) $rec->announcement->message),
                    'time' => $rec->created_at->diffForHumans(),
                    'url' => $rec->announcement->cta_url ? route('announcements.cta', ['recipient' => $rec->id]) : '#',
                    'type' => 'announcement',
                    'tone' => in_array($rec->announcement->type, ['warning', 'maintenance', 'billing'], true) ? 'primary' : 'emerald',
                ];
            }
        }

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => count($notifications),
        ]);
    }
}
