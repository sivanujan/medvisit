<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\DoctorSession;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BookingTokenController extends Controller
{
    /**
     * Display the token booking / issuance desk.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $today = Carbon::today('Asia/Colombo')->toDateString();

        // 1. Fetch upcoming active sessions (from today onwards, scheduled or in_progress)
        $sessions = DoctorSession::with(['doctor'])
            ->where('session_date', '>=', $today)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) {
                $bookedCount = $s->tokens()->whereNotIn('status', ['cancelled'])->count();
                $available = max(0, $s->max_tokens - $bookedCount);

                return [
                    'id' => $s->id,
                    'doctor_id' => $s->doctor_id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'General',
                    'session_date' => $s->session_date->format('Y-m-d'),
                    'session_date_formatted' => $s->session_date->format('M d, Y (D)'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Suite 1',
                    'status' => $s->status,
                    'max_tokens' => $s->max_tokens,
                    'booked_tokens_count' => $bookedCount,
                    'available_tokens_count' => $available,
                    'is_full' => $available <= 0,
                    'doctor_fee_lkr' => round($s->doctor_fee / 100, 2),
                    'clinic_fee_lkr' => round($s->clinic_fee / 100, 2),
                    'total_fee_lkr' => round(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                ];
            });

        // 2. Fetch recent bookings issued today
        $recentBookings = BookingToken::with(['session.doctor', 'patient', 'bill'])
            ->whereDate('created_at', $today)
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(function ($b) {
                $totalCents = ($b->session?->doctor_fee ?? 0) + ($b->session?->clinic_fee ?? 0);

                return [
                    'id' => $b->id,
                    'token_number' => $b->token_number,
                    'doctor_name' => trim(($b->session?->doctor?->title ?? 'Dr.').' '.($b->session?->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $b->session?->doctor?->specialty ?? '',
                    'session_date' => $b->session?->session_date?->format('M d, Y') ?? '',
                    'room_number' => $b->session?->room_number ?? 'Suite 1',
                    'patient_id' => $b->patient_id,
                    'patient_name' => $b->patient?->name ?? 'Walk-in Patient',
                    'patient_phone' => $b->patient?->phone ?? '',
                    'patient_nic' => $b->patient?->nic ?? '',
                    'estimated_time' => $b->estimated_time ? Carbon::parse($b->estimated_time)->format('h:i A') : '',
                    'status' => $b->status,
                    'booked_via' => $b->booked_via,
                    'created_at_time' => $b->created_at->format('h:i A'),
                    'total_fee_formatted' => 'Rs. '.number_format($totalCents / 100, 2),
                    'receipt_number' => $b->bill?->receipt_number ?? null,
                    'payment_status' => $b->bill?->payment_status ?? 'pending',
                ];
            });

        // Clinic info for slip printing
        $clinicInfo = [
            'name' => ucwords((string) (tenant('name') ?? 'MedVisit Clinic')),
            'phone' => tenant('phone') ?? '+94 11 234 5678',
            'address' => tenant('address') ?? 'Colombo, Sri Lanka',
            'subdomain' => tenant('subdomain') ?? 'clinic',
        ];

        return Inertia::render('Bookings/Index', [
            'sessions' => $sessions,
            'recentBookings' => $recentBookings,
            'clinicInfo' => $clinicInfo,
        ]);
    }

    /**
     * Search patients by phone (+94) or NIC or name.
     */
    public function searchPatients(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $patients = Patient::where('phone', 'like', "%{$q}%")
            ->orWhere('nic', 'like', "%{$q}%")
            ->orWhere('name', 'ilike', "%{$q}%")
            ->limit(10)
            ->get(['id', 'name', 'phone', 'nic', 'city', 'allergies']);

        return response()->json($patients);
    }

    /**
     * Issue an atomic booking token.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_session_id' => ['required', 'exists:doctor_sessions,id'],
            'patient_id' => ['nullable', 'exists:patients,id'],
            'new_patient_name' => ['required_without:patient_id', 'nullable', 'string', 'max:255'],
            'new_patient_phone' => ['required_without:patient_id', 'nullable', 'string', 'max:30'],
            'new_patient_nic' => ['nullable', 'string', 'max:20'],
            'new_patient_gender' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $tokenResult = DB::transaction(function () use ($validated) {
            $tenantId = tenant('id');

            // 1. Resolve or create patient
            if (! empty($validated['patient_id'])) {
                $patient = Patient::findOrFail($validated['patient_id']);
            } else {
                // Check if patient already exists by phone
                $patient = Patient::where('phone', $validated['new_patient_phone'])->first();

                if (! $patient) {
                    $patient = Patient::create([
                        'tenant_id' => $tenantId,
                        'name' => $validated['new_patient_name'],
                        'phone' => $validated['new_patient_phone'],
                        'nic' => $validated['new_patient_nic'] ?? null,
                        'gender' => $validated['new_patient_gender'] ?? 'other',
                    ]);
                }
            }

            // 2. Lock session for concurrency safety
            $session = DoctorSession::where('id', $validated['doctor_session_id'])
                ->lockForUpdate()
                ->firstOrFail();

            // Check capacity
            $activeCount = BookingToken::where('doctor_session_id', $session->id)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($activeCount >= $session->max_tokens) {
                throw new \Exception("Session is full ({$session->max_tokens} maximum tokens booked).");
            }

            // 3. Next atomic token number
            $lastTokenNumber = (int) BookingToken::where('doctor_session_id', $session->id)
                ->max('token_number') ?? 0;

            $tokenNumber = $lastTokenNumber + 1;

            // 4. Calculate estimated time
            $estimatedTime = $session->calculateEstimatedTime($tokenNumber);

            // 5. Create token
            $token = BookingToken::create([
                'tenant_id' => $tenantId,
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
                'token_number' => $tokenNumber,
                'estimated_time' => $estimatedTime,
                'status' => BookingToken::STATUS_BOOKED,
                'booked_via' => 'reception',
                'signed_cancel_token' => Str::random(40),
                'notes' => $validated['notes'] ?? null,
            ]);

            // 6. Create initial Bill record (pending payment)
            $receiptNumber = 'REC-'.strtoupper(Str::random(6)).'-'.date('dmy');
            $doctorFee = $session->doctor_fee;
            $clinicFee = $session->clinic_fee;

            $bill = Bill::create([
                'tenant_id' => $tenantId,
                'booking_token_id' => $token->id,
                'patient_id' => $patient->id,
                'doctor_id' => $session->doctor_id,
                'receipt_number' => $receiptNumber,
                'doctor_fee' => $doctorFee,
                'clinic_fee' => $clinicFee,
                'other_fee' => 0,
                'discount' => 0,
                'total_amount' => $doctorFee + $clinicFee,
                'payment_method' => 'cash',
                'payment_status' => 'pending',
            ]);

            return [
                'token' => $token,
                'patient' => $patient,
                'session' => $session,
                'bill' => $bill,
            ];
        });

        $tokenNo = $tokenResult['token']->token_number;
        $docName = $tokenResult['session']->doctor?->name ?? 'Doctor';

        return redirect()->back()->with('success', "Token #{$tokenNo} issued successfully for {$tokenResult['patient']->name} with Dr. {$docName}.");
    }

    /**
     * Cancel an issued booking token.
     */
    public function cancel(Request $request, BookingToken $token): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $token->update([
            'status' => BookingToken::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancellation_reason' => $validated['reason'] ?? 'Cancelled by reception',
        ]);

        return redirect()->back()->with('success', "Token #{$token->token_number} cancelled.");
    }
}
