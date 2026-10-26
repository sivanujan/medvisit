<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\TvDevice;
use App\Models\TvPairingCode;
use App\Support\TvDisplayHelper;
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
        $device = $this->authenticateDevice($request);
        $isStaff = auth()->check();

        $clinicInfo = [
            'name' => ucwords((string) (tenant('name') ?? 'MedVisit Clinic')),
            'subdomain' => (string) (tenant('subdomain') ?? 'clinic'),
            'logo_url' => (string) (tenant('logo_url') ?: tenant('logo_png_url') ?: ''),
            'phone' => (string) (tenant('phone') ?? ''),
            'address' => (string) (tenant('formatted_address') ?: tenant('address') ?: ''),
            'opening_hours' => (string) (tenant('opening_hours') ?? '8:00 AM - 8:00 PM'),
        ];

        if (! $device && ! $isStaff) {
            return Inertia::render('Queue/Tv', [
                'isPaired' => false,
                'isStaff' => false,
                'deviceName' => null,
                'tvData' => null,
                'clinic' => $clinicInfo,
                'prefillCode' => (string) $request->query('code', ''),
            ]);
        }

        $tvData = $this->getTvData($request, $device);

        return Inertia::render('Queue/Tv', [
            'isPaired' => true,
            'isStaff' => $isStaff,
            'deviceName' => $device?->name ?? 'Staff Preview',
            'tvData' => $tvData,
            'clinic' => $clinicInfo,
        ]);
    }

    /**
     * Polling endpoint for live updates.
     */
    public function data(Request $request): JsonResponse
    {
        $device = $this->authenticateDevice($request);
        $isStaff = auth()->check();

        if (! $device && ! $isStaff) {
            return response()->json([
                'isPaired' => false,
                'error' => 'TV display is not paired or device token has been revoked.',
            ], 401);
        }

        $tvData = $this->getTvData($request, $device);

        return response()->json([
            'isPaired' => true,
            'deviceName' => $device?->name ?? 'Staff Preview',
            ...$tvData,
        ]);
    }

    /**
     * Pair a TV device using a 6-digit code.
     */
    public function pair(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'device_name' => ['nullable', 'string', 'max:50'],
        ]);

        $code = trim((string) $request->input('code'));
        $tenantId = tenant('id');

        $pairingCode = TvPairingCode::where('tenant_id', $tenantId)
            ->where('code', $code)
            ->where('expires_at', '>', now())
            ->whereNull('used_at')
            ->first();

        if (! $pairingCode) {
            return response()->json([
                'message' => 'Invalid or expired pairing code. Please generate a fresh code in Clinic Settings → TV Display.',
            ], 422);
        }

        $pairingCode->markAsUsed();

        $plainToken = TvDevice::generateToken();
        $deviceName = $request->input('device_name') ?: ($pairingCode->device_name ?: 'Waiting Room TV');

        $device = TvDevice::create([
            'tenant_id' => $tenantId,
            'name' => $deviceName,
            'device_token_hash' => hash('sha256', $plainToken),
            'doctor_ids' => $pairingCode->doctor_ids,
            'last_seen_at' => now(),
            'created_by' => $pairingCode->created_by,
        ]);

        // Long-lived 5-year httpOnly cookie
        $cookie = cookie()->make(
            'tv_device_token',
            $plainToken,
            60 * 24 * 365 * 5,
            '/',
            null,
            false,
            true, // httpOnly
            false,
            'lax'
        );

        return response()->json([
            'success' => true,
            'device' => [
                'id' => $device->id,
                'name' => $device->name,
            ],
        ])->withCookie($cookie);
    }

    /**
     * Unpair the current TV display.
     */
    public function unpair(Request $request): JsonResponse
    {
        $rawToken = $request->cookie('tv_device_token');
        if (is_array($rawToken)) {
            $rawToken = reset($rawToken);
        }

        if (is_string($rawToken) && trim($rawToken) !== '') {
            $device = TvDevice::where('tenant_id', tenant('id'))
                ->where('device_token_hash', hash('sha256', trim($rawToken)))
                ->first();

            $device?->revoke();
        }

        return response()->json(['success' => true])
            ->withCookie(cookie()->forget('tv_device_token'));
    }

    /**
     * Generate a new 6-digit pairing code (Staff API).
     */
    public function createPairingCode(Request $request): JsonResponse
    {
        $request->validate([
            'device_name' => ['nullable', 'string', 'max:50'],
            'doctor_ids' => ['nullable', 'array'],
            'doctor_ids.*' => ['integer'],
        ]);

        $code = TvPairingCode::createCode(
            tenantId: tenant('id'),
            deviceName: $request->input('device_name', 'Waiting Room TV'),
            doctorIds: $request->input('doctor_ids'),
            createdBy: auth()->id()
        );

        $pairingUrl = url('/queue/tv?code='.$code->code);

        return response()->json([
            'code' => $code->code,
            'expires_at' => $code->expires_at->toIso8601String(),
            'device_name' => $code->device_name,
            'qr_url' => $pairingUrl,
            'direct_tv_url' => url('/queue/tv'),
        ]);
    }

    /**
     * List all paired devices for this clinic (Staff API).
     */
    public function listDevices(Request $request): JsonResponse
    {
        $devices = TvDevice::where('tenant_id', tenant('id'))
            ->orderByDesc('last_seen_at')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'doctor_ids' => $d->doctor_ids,
                'last_seen_at' => $d->last_seen_at?->diffForHumans() ?? 'Never',
                'last_seen_timestamp' => $d->last_seen_at?->timestamp,
                'is_online' => $d->last_seen_at ? $d->last_seen_at->gt(now()->subMinutes(2)) : false,
                'is_revoked' => $d->isRevoked(),
                'revoked_at' => $d->revoked_at?->toIso8601String(),
                'created_at' => $d->created_at->format('M d, Y'),
            ]);

        return response()->json($devices);
    }

    /**
     * Update device name or doctor filter (Staff API).
     */
    public function updateDevice(Request $request, TvDevice $device): JsonResponse
    {
        if ($device->tenant_id !== tenant('id')) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'doctor_ids' => ['nullable', 'array'],
            'doctor_ids.*' => ['integer'],
        ]);

        $device->update($validated);

        return response()->json(['success' => true, 'device' => $device]);
    }

    /**
     * Revoke access for a TV device (Staff API).
     */
    public function revokeDevice(Request $request, TvDevice $device): JsonResponse
    {
        if ($device->tenant_id !== tenant('id')) {
            abort(403);
        }

        $device->revoke();

        return response()->json(['success' => true]);
    }

    /**
     * Authenticate TV device via secure httpOnly cookie.
     */
    protected function authenticateDevice(Request $request): ?TvDevice
    {
        $rawToken = $request->cookie('tv_device_token');

        if (is_array($rawToken)) {
            $rawToken = reset($rawToken);
        }

        if (! is_string($rawToken) || trim($rawToken) === '') {
            return null;
        }

        $hash = hash('sha256', trim($rawToken));

        $device = TvDevice::where('tenant_id', tenant('id'))
            ->where('device_token_hash', $hash)
            ->whereNull('revoked_at')
            ->first();

        if ($device) {
            $device->touchLastSeen();
        }

        return $device;
    }

    /**
     * Assemble live TV data for today's active sessions and clinic rooms.
     */
    protected function getTvData(Request $request, ?TvDevice $device = null): array
    {
        $tenant = tenant();
        $today = Carbon::today('Asia/Colombo')->toDateString();
        $nameDisplayMode = (string) ($tenant->tv_name_display_mode ?? 'token_only');

        // Session/Doctor filter scoped to device or query override
        $filterDoctorIds = null;
        if ($device && ! empty($device->doctor_ids)) {
            $filterDoctorIds = $device->doctor_ids;
        } elseif ($request->filled('doctor_ids')) {
            $filterDoctorIds = array_filter(array_map('intval', explode(',', (string) $request->query('doctor_ids'))));
        }

        // Fetch all today's sessions with relations
        $query = DoctorSession::with(['doctor', 'tokens.patient'])
            ->where('session_date', $today)
            ->whereNotIn('status', ['cancelled']);

        if ($filterDoctorIds) {
            $query->whereIn('doctor_id', $filterDoctorIds);
        }

        $allTodaySessions = $query->orderBy('start_time')->get();

        $processedSessions = $allTodaySessions->map(function ($session) use ($nameDisplayMode) {
            $doctor = $session->doctor;
            $doctorName = TvDisplayHelper::formatDoctorName($doctor?->name, $doctor?->title);
            $doctorColor = Doctor::getDoctorColor($session->doctor_id);
            $roomNumber = $session->room_number ?? 'Consultation Suite';

            $tokens = $session->tokens->sortBy('token_number')->values();

            // Find currently active token
            $activeToken = $tokens->firstWhere('token_number', $session->current_token_number)
                ?? $tokens->firstWhere('status', BookingToken::STATUS_CALLED)
                ?? $tokens->firstWhere('status', BookingToken::STATUS_IN_CONSULTATION);

            $nowServing = null;
            if ($activeToken && in_array($activeToken->status, [BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])) {
                $nowServing = [
                    'id' => $activeToken->id,
                    'token_number' => $activeToken->token_number,
                    'patient_name' => TvDisplayHelper::maskPatientName($activeToken->patient?->name, $nameDisplayMode),
                    'status' => $activeToken->status,
                    'called_at' => $activeToken->called_at ? Carbon::parse($activeToken->called_at)->timestamp : null,
                    'room_number' => $roomNumber,
                    'doctor_name' => $doctorName,
                    'doctor_specialty' => $doctor?->specialty ?? 'Specialist',
                    'doctor_color' => $doctorColor,
                ];
            }

            // Next 5 tokens in line
            $nextInLine = $tokens->filter(function ($t) use ($session) {
                return $t->token_number > $session->current_token_number
                    && in_array($t->status, [BookingToken::STATUS_CHECKED_IN, BookingToken::STATUS_BOOKED]);
            })->take(5)->map(fn ($t) => [
                'id' => $t->id,
                'token_number' => $t->token_number,
                'patient_name' => TvDisplayHelper::maskPatientName($t->patient?->name, $nameDisplayMode),
                'status' => $t->status,
                'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '',
            ])->values()->all();

            $waitingTokens = $tokens->whereIn('status', [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN]);
            $waitingCount = $waitingTokens->count();
            $completedCount = $tokens->where('status', BookingToken::STATUS_COMPLETED)->count();

            $avgConsultMinutes = (int) ($doctor?->avg_consultation_minutes ?? 10);
            $estimatedWaitMinutes = $waitingCount * $avgConsultMinutes;

            $statusMessage = null;
            if ($session->status === 'paused') {
                $statusMessage = 'Short break';
            } elseif ($session->status === 'scheduled') {
                $timeFormatted = $session->start_time ? Carbon::parse($session->start_time)->format('h:i A') : '';
                $statusMessage = $timeFormatted ? "Doctor starts at {$timeFormatted}" : 'Starting soon';
            }

            return [
                'id' => $session->id,
                'doctor_id' => $session->doctor_id,
                'doctor_name' => $doctorName,
                'doctor_specialty' => $doctor?->specialty ?? 'Specialist',
                'doctor_photo_url' => $doctor?->photo_url ?? null,
                'doctor_color' => $doctorColor,
                'room_number' => $roomNumber,
                'status' => $session->status,
                'status_message' => $statusMessage,
                'start_time' => $session->start_time ? Carbon::parse($session->start_time)->format('h:i A') : '',
                'end_time' => $session->end_time ? Carbon::parse($session->end_time)->format('h:i A') : '',
                'current_token_number' => $session->current_token_number > 0 ? $session->current_token_number : null,
                'now_serving' => $nowServing,
                'next_in_line' => $nextInLine,
                'waiting_count' => $waitingCount,
                'waiting_text' => TvDisplayHelper::pluralWaiting($waitingCount),
                'completed_count' => $completedCount,
                'estimated_wait_minutes' => $estimatedWaitMinutes,
            ];
        });

        // Split into live vs upcoming
        $liveSessions = $processedSessions->filter(function ($s) {
            return in_array($s['status'], ['in_progress', 'paused']) || ($s['status'] === 'scheduled' && $s['now_serving'] !== null);
        })->values();

        $upcomingSessions = $processedSessions->filter(function ($s) {
            return $s['status'] === 'scheduled' && $s['now_serving'] === null;
        })->values();

        $endedSessions = $processedSessions->filter(function ($s) {
            return $s['status'] === 'completed';
        })->values();

        // Adaptive Layout decision
        $liveCount = $liveSessions->count();
        if ($liveCount === 0) {
            $layoutMode = 'idle';
        } elseif ($liveCount === 1) {
            $layoutMode = 'hero';
        } elseif ($liveCount <= 4) {
            $layoutMode = 'grid';
        } else {
            $layoutMode = 'board';
        }

        // For single hero layout compatibility
        $primarySession = $liveSessions->first() ?? $upcomingSessions->first() ?? null;

        return [
            'layoutMode' => $layoutMode,
            'liveSessions' => $liveSessions->all(),
            'upcomingSessions' => $upcomingSessions->all(),
            'endedSessions' => $endedSessions->all(),
            'allSessions' => $processedSessions->all(),
            'primarySession' => $primarySession,
            'nowServing' => $primarySession['now_serving'] ?? null,
            'nextInLine' => $primarySession['next_in_line'] ?? [],
            'waitingCount' => $primarySession['waiting_count'] ?? 0,
            'waitingText' => $primarySession ? $primarySession['waiting_text'] : 'No one waiting',
            'completedCount' => $primarySession['completed_count'] ?? 0,
            'settings' => [
                'name_display_mode' => $nameDisplayMode,
                'languages' => $tenant->tv_languages ?? ['en', 'ta', 'si'],
                'chime_enabled' => (bool) ($tenant->tv_chime_enabled ?? true),
                'voice_language' => (string) ($tenant->tv_voice_language ?? 'off'),
                'ticker_text' => (string) ($tenant->tv_ticker_text ?? 'Please have your token slip ready. Keep the waiting area quiet and comfortable for all patients.'),
                'theme' => (string) ($tenant->tv_theme ?? 'dark'),
                'reduced_motion' => (bool) ($tenant->tv_reduced_motion ?? false),
            ],
            'currentTime' => Carbon::now('Asia/Colombo')->format('h:i:s A'),
            'currentDate' => Carbon::now('Asia/Colombo')->format('l, F j, Y'),
            'timestamp' => Carbon::now('Asia/Colombo')->timestamp,
        ];
    }
}
