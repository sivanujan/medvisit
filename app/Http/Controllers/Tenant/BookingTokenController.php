<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\DoctorSession;
use App\Models\FeeComponent;
use App\Models\Patient;
use App\Models\VisitType;
use App\Services\FeeResolutionService;
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
    public function __construct(
        protected FeeResolutionService $feeService
    ) {}

    /**
     * Display the token booking / issuance desk.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $today = Carbon::today('Asia/Colombo')->toDateString();
        $user = $request->user();
        $isAdmin = $user->hasRole('clinic_admin') || $user->hasRole('super_admin');
        $feeSettings = $this->feeService->getTenantSettings($tenant);

        // Active Visit Types
        $visitTypes = VisitType::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'pricing_type', 'percentage_value', 'fixed_fee_cents', 'is_default']);

        // Optional and standard fee components
        $feeComponents = FeeComponent::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'amount_type' => $c->amount_type,
                'amount_value' => $c->amount_value,
                'amount_lkr' => $c->amount_type === 'fixed' ? round($c->amount_value / 100, 2) : $c->amount_value,
                'recipient' => $c->recipient,
                'recipient_name' => $c->recipient_name,
                'is_mandatory' => (bool) $c->is_mandatory,
                'is_separate_line' => (bool) $c->is_separate_line,
            ]);

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

                // Resolve effective fee preview for default visit type
                $resolved = $this->feeService->resolve(
                    doctor: $s->doctor,
                    session: $s,
                    channel: 'walk_in'
                );

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
                    'doctor_fee_lkr' => round($resolved['doctor_fee_portion'] / 100, 2),
                    'clinic_fee_lkr' => round($resolved['clinic_portion'] / 100, 2),
                    'total_fee_lkr' => round($resolved['patient_total'] / 100, 2),
                    'total_fee_formatted' => $resolved['patient_total_formatted'],
                    'source_label' => $resolved['source_levels']['doctor_fee'] ?? 'from clinic',
                    'pricing_mode' => $resolved['pricing_mode'],
                ];
            });

        // 2. Fetch recent bookings issued today
        $recentBookings = BookingToken::with(['session.doctor', 'patient', 'bill', 'visitType'])
            ->whereDate('created_at', $today)
            ->latest('id')
            ->limit(25)
            ->get()
            ->map(function ($b) {
                $snapshot = $b->fee_snapshot;
                $totalCents = $snapshot ? ($snapshot['patient_total'] ?? 0) : (($b->session?->doctor_fee ?? 0) + ($b->session?->clinic_fee ?? 0));

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
                    'visit_type_name' => $b->visitType?->name ?? ($snapshot['visit_type']['name'] ?? 'Consultation'),
                    'estimated_time' => $b->estimated_time ? Carbon::parse($b->estimated_time)->format('h:i A') : '',
                    'status' => $b->status,
                    'booked_via' => $b->booked_via,
                    'created_at_time' => $b->created_at->format('h:i A'),
                    'total_fee_formatted' => 'Rs. '.number_format($totalCents / 100, 2),
                    'receipt_number' => $b->bill?->receipt_number ?? null,
                    'payment_status' => $b->bill?->payment_status ?? 'pending',
                    'has_discount' => ! empty($snapshot['discount']['amount']),
                    'discount_amount_formatted' => ! empty($snapshot['discount']['amount']) ? 'Rs. '.number_format($snapshot['discount']['amount'] / 100, 2) : null,
                    'source_label' => $snapshot['source_levels']['doctor_fee'] ?? 'from clinic',
                ];
            });

        // Clinic info for slip printing
        $clinicInfo = [
            'name' => ucwords((string) ($tenant->name ?? 'MedVisit Clinic')),
            'phone' => $tenant->phone ?? '+94 11 234 5678',
            'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            'subdomain' => $tenant->subdomain ?? 'clinic',
        ];

        $discountConfig = [
            'is_admin' => $isAdmin,
            'can_discount' => $isAdmin || (bool) ($feeSettings['receptionist_can_discount'] ?? true),
            'max_type' => $feeSettings['receptionist_max_discount_type'] ?? 'percent',
            'max_value' => (int) ($feeSettings['receptionist_max_discount_value'] ?? 20),
            'max_display' => ($feeSettings['receptionist_max_discount_type'] ?? 'percent') === 'percent'
                ? ($feeSettings['receptionist_max_discount_value'] ?? 20).'%'
                : 'Rs. '.number_format(($feeSettings['receptionist_max_discount_value'] ?? 200000) / 100, 2),
        ];

        return Inertia::render('Bookings/Index', [
            'sessions' => $sessions,
            'recentBookings' => $recentBookings,
            'visitTypes' => $visitTypes,
            'feeComponents' => $feeComponents,
            'discountConfig' => $discountConfig,
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
            'visit_type_id' => ['nullable', 'exists:visit_types,id'],
            'optional_component_ids' => ['nullable', 'array'],
            'optional_component_ids.*' => ['integer', 'exists:fee_components,id'],
            'discount_type' => ['nullable', 'string', 'in:amount,percent,waiver'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'discount_reason' => ['required_with:discount_value', 'nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $userRole = ($user->hasRole('clinic_admin') || $user->hasRole('super_admin')) ? 'clinic_admin' : 'receptionist';

        $manualDiscount = null;
        if (! empty($validated['discount_reason']) && (! empty($validated['discount_value']) || $validated['discount_type'] === 'waiver')) {
            $val = $validated['discount_type'] === 'amount'
                ? (int) round(($validated['discount_value'] ?? 0) * 100)
                : (int) ($validated['discount_value'] ?? 0);

            $manualDiscount = [
                'type' => $validated['discount_type'] ?? 'amount',
                'value' => $val,
                'reason' => $validated['discount_reason'],
            ];
        }

        $tokenResult = DB::transaction(function () use ($validated, $manualDiscount, $userRole, $request) {
            $tenantId = tenant('id');

            // 1. Resolve or create patient
            if (! empty($validated['patient_id'])) {
                $patient = Patient::findOrFail($validated['patient_id']);
            } else {
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
            $session = DoctorSession::with('doctor')
                ->where('id', $validated['doctor_session_id'])
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
            $estimatedTime = $session->calculateEstimatedTime($tokenNumber);

            // 4. Resolve immutable Fee Snapshot
            $snapshot = $this->feeService->resolve(
                doctor: $session->doctor,
                session: $session,
                visitType: $validated['visit_type_id'] ?? null,
                channel: 'walk_in',
                optionalComponentIds: $validated['optional_component_ids'] ?? [],
                manualDiscount: $manualDiscount,
                userRole: $userRole
            );

            // 5. Create token
            $token = BookingToken::create([
                'tenant_id' => $tenantId,
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
                'token_number' => $tokenNumber,
                'visit_type_id' => $snapshot['visit_type']['id'] ?? null,
                'estimated_time' => $estimatedTime,
                'status' => BookingToken::STATUS_BOOKED,
                'booked_via' => 'reception',
                'signed_cancel_token' => Str::random(40),
                'fee_snapshot' => $snapshot,
                'payout_status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            // 6. Create initial Bill record (pending payment)
            $receiptNumber = 'REC-'.strtoupper(Str::random(6)).'-'.date('dmy');

            $bill = Bill::create([
                'tenant_id' => $tenantId,
                'booking_token_id' => $token->id,
                'patient_id' => $patient->id,
                'doctor_id' => $session->doctor_id,
                'visit_type_id' => $snapshot['visit_type']['id'] ?? null,
                'receipt_number' => $receiptNumber,
                'doctor_fee' => $snapshot['doctor_fee_portion'],
                'clinic_fee' => $snapshot['clinic_portion'],
                'other_fee' => $snapshot['third_party_portion'],
                'discount' => $snapshot['discount']['amount'],
                'discount_reason' => $snapshot['discount']['reason'],
                'total_amount' => $snapshot['patient_total'],
                'fee_snapshot' => $snapshot,
                'doctor_payout_amount' => $snapshot['doctor_payout_amount'],
                'clinic_net_amount' => $snapshot['clinic_net_amount'],
                'third_party_amount' => $snapshot['third_party_portion'],
                'payment_method' => 'cash',
                'payment_status' => 'pending',
            ]);

            // 7. Audit log if discount was applied
            if (! empty($snapshot['discount']['amount'])) {
                AuditEvent::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $request->user()->id,
                    'action' => 'billing.discount_granted',
                    'resource_type' => 'booking_token',
                    'resource_id' => (string) $token->id,
                    'metadata' => [
                        'token_number' => $tokenNumber,
                        'patient_name' => $patient->name,
                        'discount' => $snapshot['discount'],
                        'gross_subtotal' => $snapshot['gross_subtotal'],
                        'patient_total' => $snapshot['patient_total'],
                    ],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => Carbon::now('Asia/Colombo'),
                ]);
            }

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
