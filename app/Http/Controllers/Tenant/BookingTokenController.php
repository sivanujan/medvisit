<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Jobs\SendTokenMoveNotificationJob;
use App\Models\AuditEvent;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\FeeComponent;
use App\Models\Patient;
use App\Models\VisitType;
use App\Services\Billing\BillCalculator;
use App\Services\FeeResolutionService;
use App\Services\SequenceService;
use App\Services\SessionGeneratorService;
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
        protected FeeResolutionService $feeService,
        protected SessionGeneratorService $sessionGenerator,
        protected BillCalculator $billCalculator,
        protected SequenceService $sequenceService,
    ) {}

    /**
     * Display the token booking / issuance desk.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $today = Carbon::today('Asia/Colombo');
        $todayString = $today->toDateString();
        $selectedDate = $request->query('date', $todayString);
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

        // Build 14-day date strip: Today, Tomorrow, next 12 days
        $countsQuery = DoctorSession::where('tenant_id', $tenantId)
            ->where('session_date', '>=', $todayString)
            ->where('session_date', '<=', (clone $today)->addDays(14)->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->groupBy('session_date')
            ->selectRaw('session_date, count(*) as count')
            ->pluck('count', 'session_date');

        $dateStrip = [];
        for ($i = 0; $i < 14; $i++) {
            $d = (clone $today)->addDays($i);
            $dStr = $d->toDateString();
            $label = $i === 0 ? 'Today' : ($i === 1 ? 'Tomorrow' : $d->format('D'));
            $dateStrip[] = [
                'date' => $dStr,
                'label' => $label,
                'day_name' => $d->format('D'),
                'day_number' => $d->format('d'),
                'month_name' => $d->format('M'),
                'formatted' => $d->format('M d, Y (D)'),
                'session_count' => (int) ($countsQuery[$dStr] ?? 0),
                'is_today' => $i === 0,
                'is_tomorrow' => $i === 1,
            ];
        }

        // Active Doctors for inline Quick Create Session modal
        $doctors = Doctor::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'title', 'name', 'specialty', 'doctor_fee', 'clinic_fee', 'avg_consultation_minutes'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty,
                'avg_consultation_minutes' => $d->avg_consultation_minutes,
                'doctor_fee_lkr' => round($d->doctor_fee / 100, 2),
                'clinic_fee_lkr' => round($d->clinic_fee / 100, 2),
                'total_fee_lkr' => round(($d->doctor_fee + $d->clinic_fee) / 100, 2),
            ]);

        // 1. Fetch upcoming active sessions (for the next 30 days)
        $sessions = DoctorSession::with(['doctor'])
            ->where('tenant_id', $tenantId)
            ->where('session_date', '>=', $todayString)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) {
                $bookedCount = $s->tokens()->whereNotIn('status', ['cancelled'])->count();
                $available = max(0, $s->max_tokens - $bookedCount);
                $isFull = $available <= 0;
                $isEnded = in_array($s->status, ['cancelled', 'closed', 'completed'], true);

                $isSelectable = ! $isFull && ! $isEnded;
                $unselectableReason = null;
                if ($isFull) {
                    $unselectableReason = "Session is full ({$s->max_tokens}/{$s->max_tokens} tokens booked)";
                } elseif ($s->status === 'cancelled') {
                    $unselectableReason = 'Session cancelled';
                } elseif (in_array($s->status, ['closed', 'completed'], true)) {
                    $unselectableReason = 'Session ended';
                }

                $avgMins = $s->doctor?->avg_consultation_minutes ?? 15;
                $nextToken = $bookedCount + 1;
                $sessionStart = Carbon::parse($s->session_date->format('Y-m-d').' '.$s->start_time);
                $approxTime = (clone $sessionStart)->addMinutes($bookedCount * $avgMins);

                // Doctor initials
                $docName = $s->doctor?->name ?? 'Doctor';
                $words = explode(' ', trim(str_replace(['Dr.', 'Dr', 'Prof.', 'Prof'], '', $docName)));
                $initials = '';
                foreach ($words as $w) {
                    if (! empty($w)) {
                        $initials .= strtoupper(substr($w, 0, 1));
                    }
                }
                $initials = substr($initials, 0, 2) ?: 'DR';

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
                    'doctor_photo_url' => $s->doctor?->photo_url,
                    'doctor_initials' => $initials,
                    'doctor_avg_minutes' => $avgMins,
                    'session_date' => $s->session_date->format('Y-m-d'),
                    'session_date_formatted' => $s->session_date->format('M d, Y (D)'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Suite 1',
                    'status' => $s->status,
                    'max_tokens' => $s->max_tokens,
                    'booked_tokens_count' => $bookedCount,
                    'available_tokens_count' => $available,
                    'is_full' => $isFull,
                    'is_selectable' => $isSelectable,
                    'unselectable_reason' => $unselectableReason,
                    'next_token_number' => $nextToken,
                    'next_approx_time' => 'approx. '.$approxTime->format('g:i A'),
                    'doctor_fee_lkr' => round($resolved['doctor_fee_portion'] / 100, 2),
                    'clinic_fee_lkr' => round($resolved['clinic_portion'] / 100, 2),
                    'total_fee_lkr' => round($resolved['patient_total'] / 100, 2),
                    'total_fee_formatted' => $resolved['patient_total_formatted'],
                    'doctor_payout_lkr' => round($resolved['doctor_payout_amount'] / 100, 2),
                    'clinic_net_lkr' => round($resolved['clinic_net_amount'] / 100, 2),
                    'source_label' => $resolved['source_levels']['doctor_fee'] ?? 'from clinic',
                    'pricing_mode' => $resolved['pricing_mode'],
                ];
            });

        // 2. Fetch recent bookings issued today
        $recentBookings = BookingToken::with(['session.doctor', 'patient', 'bill', 'visitType'])
            ->where('tenant_id', $tenantId)
            ->whereDate('created_at', $todayString)
            ->latest('id')
            ->limit(25)
            ->get()
            ->map(function ($b) {
                $snapshot = $b->fee_snapshot;
                $totalCents = $snapshot ? ($snapshot['patient_total'] ?? 0) : (($b->session?->doctor_fee ?? 0) + ($b->session?->clinic_fee ?? 0));

                return [
                    'id' => $b->id,
                    'token_number' => $b->token_number,
                    'doctor_id' => $b->session?->doctor_id,
                    'doctor_session_id' => $b->doctor_session_id,
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

        // Clinic info for slip printing & payment settings
        $clinicInfo = [
            'name' => ucwords((string) ($tenant->name ?? 'MedVisit Clinic')),
            'phone' => $tenant->phone ?? '+94 11 234 5678',
            'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            'subdomain' => $tenant->subdomain ?? 'clinic',
            'collect_payment_at_issue' => (bool) ($feeSettings['collect_payment_at_issue'] ?? false),
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
            'dateStrip' => $dateStrip,
            'selectedDate' => $selectedDate,
            'doctors' => $doctors,
            'recentBookings' => $recentBookings,
            'visitTypes' => $visitTypes,
            'feeComponents' => $feeComponents,
            'discountConfig' => $discountConfig,
            'clinicInfo' => $clinicInfo,
        ]);
    }

    /**
     * Search patients by ID ("14", "#14", "P-14", "PAT-00014"), phone (+94), NIC or name.
     */
    public function searchPatients(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if (strlen($q) < 1) {
            return response()->json([]);
        }

        // Extract numeric ID if input is like "14", "#14", "P-14", "PAT-00014", "PAT14"
        $extractedId = null;
        if (preg_match('/^(?:#|P-|PAT-|PAT)?(\d+)$/i', $q, $matches)) {
            $extractedId = (int) $matches[1];
        }

        $patients = Patient::where('tenant_id', tenant('id'))
            ->where(function ($query) use ($q, $extractedId) {
                if ($extractedId !== null) {
                    $query->orWhere('id', $extractedId);
                }
                $query->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('nic', 'like', "%{$q}%")
                    ->orWhere('name', 'ilike', "%{$q}%");
            })
            ->limit(10)
            ->get(['id', 'name', 'phone', 'nic', 'gender', 'date_of_birth', 'city', 'allergies'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'phone' => $p->phone,
                'nic' => $p->nic,
                'gender' => $p->gender,
                'city' => $p->city,
                'date_of_birth' => $p->date_of_birth?->format('Y-m-d'),
                'age' => $p->date_of_birth ? Carbon::parse($p->date_of_birth)->age : null,
                'formatted_id' => 'PAT-'.str_pad((string) $p->id, 5, '0', STR_PAD_LEFT),
                'display_label' => "#{$p->id} - {$p->name} ({$p->phone})",
            ]);

        return response()->json($patients);
    }

    /**
     * Check if a patient exists with the given phone number for walk-in duplicate warning.
     */
    public function findPatientByPhone(Request $request): JsonResponse
    {
        $phone = trim((string) $request->query('phone', ''));
        if (empty($phone)) {
            return response()->json(null);
        }

        $clean = preg_replace('/\D/', '', $phone);
        $patient = Patient::where('tenant_id', tenant('id'))
            ->where(function ($q) use ($phone, $clean) {
                $q->where('phone', $phone);
                if (strlen($clean) >= 7) {
                    $q->orWhere('phone', 'like', "%{$clean}%");
                }
            })
            ->first(['id', 'name', 'phone', 'nic', 'gender', 'date_of_birth', 'city', 'allergies']);

        if (! $patient) {
            return response()->json(null);
        }

        return response()->json([
            'id' => $patient->id,
            'name' => $patient->name,
            'phone' => $patient->phone,
            'nic' => $patient->nic,
            'gender' => $patient->gender,
            'city' => $patient->city,
            'date_of_birth' => $patient->date_of_birth?->format('Y-m-d'),
            'age' => $patient->date_of_birth ? Carbon::parse($patient->date_of_birth)->age : null,
            'formatted_id' => 'PAT-'.str_pad((string) $patient->id, 5, '0', STR_PAD_LEFT),
            'display_label' => "#{$patient->id} - {$patient->name} ({$patient->phone})",
        ]);
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
            'new_patient_dob' => ['nullable', 'date'],
            'visit_type_id' => ['nullable', 'exists:visit_types,id'],
            'optional_component_ids' => ['nullable', 'array'],
            'optional_component_ids.*' => ['integer', 'exists:fee_components,id'],
            'discount_type' => ['nullable', 'string', 'in:none,amount,percent,waiver'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'discount_reason' => ['nullable', 'string', 'max:255'],
            'payment_collected' => ['nullable', 'boolean'],
            'payment_method' => ['nullable', 'string', 'in:cash,card,bank_transfer'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        // Validate discount reason if discount is chosen
        if (! empty($validated['discount_type']) && $validated['discount_type'] !== 'none') {
            if (empty(trim((string) ($validated['discount_reason'] ?? '')))) {
                return redirect()->back()->withErrors([
                    'discount_reason' => 'A valid reason is required when granting a discount or fee waiver.',
                ]);
            }
        }

        $user = $request->user();
        $userRole = ($user->hasRole('clinic_admin') || $user->hasRole('super_admin')) ? 'clinic_admin' : 'receptionist';

        $manualDiscount = null;
        if (! empty($validated['discount_type']) && $validated['discount_type'] !== 'none' && ! empty($validated['discount_reason'])) {
            $val = $validated['discount_type'] === 'amount'
                ? (int) round(((float) ($validated['discount_value'] ?? 0)) * 100)
                : (int) ($validated['discount_value'] ?? 0);

            $manualDiscount = [
                'type' => $validated['discount_type'],
                'value' => $val,
                'reason' => $validated['discount_reason'],
            ];
        }

        $tokenResult = DB::transaction(function () use ($validated, $manualDiscount, $userRole, $request) {
            $tenantId = tenant('id');

            // 1. Resolve or create patient
            if (! empty($validated['patient_id'])) {
                $patient = Patient::where('tenant_id', $tenantId)->findOrFail($validated['patient_id']);
            } else {
                $patient = Patient::where('tenant_id', $tenantId)
                    ->where('phone', $validated['new_patient_phone'])
                    ->first();

                if (! $patient) {
                    $patient = Patient::create([
                        'tenant_id' => $tenantId,
                        'name' => $validated['new_patient_name'],
                        'phone' => $validated['new_patient_phone'],
                        'nic' => $validated['new_patient_nic'] ?? null,
                        'gender' => $validated['new_patient_gender'] ?? 'other',
                        'date_of_birth' => $validated['new_patient_dob'] ?? null,
                    ]);
                }
            }

            // 2. Lock session for concurrency safety
            $session = DoctorSession::with('doctor')
                ->where('tenant_id', $tenantId)
                ->where('id', $validated['doctor_session_id'])
                ->lockForUpdate()
                ->firstOrFail();

            // Check if patient already has active token in this session
            $existingActive = BookingToken::where('doctor_session_id', $session->id)
                ->where('patient_id', $patient->id)
                ->whereNotIn('status', ['cancelled', 'moved'])
                ->first();

            if ($existingActive) {
                throw new \Exception("Patient {$patient->name} already has an active token (#{$existingActive->token_number}) in this session.");
            }

            // Check capacity (excluding cancelled and moved tokens)
            $activeCount = BookingToken::where('doctor_session_id', $session->id)
                ->whereNotIn('status', ['cancelled', 'moved'])
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

            // 6. Create initial Bill record (receipt number assigned only when payment collected)
            $paymentCollected = ! empty($validated['payment_collected']);
            $receiptNumber = $paymentCollected ? $this->sequenceService->nextReceiptNumber($tenantId) : null;
            $paymentMethod = $validated['payment_method'] ?? 'cash';

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
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentCollected ? Bill::STATUS_PAID : Bill::STATUS_PENDING,
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
        $formattedTime = $tokenResult['token']->estimated_time ? Carbon::parse($tokenResult['token']->estimated_time)->format('g:i A') : '';

        return redirect()->back()
            ->with('success', "Token #{$tokenNo} issued successfully for {$tokenResult['patient']->name} with Dr. {$docName}.")
            ->with('issuedToken', [
                'id' => $tokenResult['token']->id,
                'token_number' => $tokenNo,
                'patient_id' => $tokenResult['patient']->id,
                'patient_name' => $tokenResult['patient']->name,
                'patient_phone' => $tokenResult['patient']->phone,
                'patient_nic' => $tokenResult['patient']->nic,
                'doctor_name' => trim(($tokenResult['session']->doctor?->title ?? 'Dr.').' '.($tokenResult['session']->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $tokenResult['session']->doctor?->specialty ?? 'General',
                'room_number' => $tokenResult['session']->room_number ?? 'Suite 1',
                'session_date' => $tokenResult['session']->session_date->format('M d, Y (D)'),
                'estimated_time' => $formattedTime ? "approx. {$formattedTime}" : '',
                'receipt_number' => $tokenResult['bill']->receipt_number,
                'bill_id' => $tokenResult['bill']->id,
                'total_fee_formatted' => 'Rs. '.number_format($tokenResult['bill']->total_amount / 100, 2),
                'total_fee_lkr' => round($tokenResult['bill']->total_amount / 100, 2),
                'payment_status' => $tokenResult['bill']->payment_status,
                'payment_method' => $tokenResult['bill']->payment_method,
                'doctor_share_formatted' => 'Rs. '.number_format($tokenResult['bill']->doctor_payout_amount / 100, 2),
                'clinic_share_formatted' => 'Rs. '.number_format($tokenResult['bill']->clinic_net_amount / 100, 2),
            ]);
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

    /**
     * Get available sessions for a doctor for the next 14 days.
     * Generates on-demand from the doctor's recurring schedule idempotently.
     */
    public function availableSessions(Request $request, Doctor $doctor): JsonResponse
    {
        $tenantId = tenant('id');
        if ($doctor->tenant_id !== $tenantId) {
            abort(404);
        }

        $days = (int) $request->query('days', 14);
        $days = max(1, min(30, $days));

        // Generate sessions on-demand idempotently
        $this->sessionGenerator->generateForDoctor($doctor, $days);

        $today = Carbon::today('Asia/Colombo');
        $endDate = (clone $today)->addDays($days);

        $sessions = DoctorSession::where('tenant_id', $tenantId)
            ->where('doctor_id', $doctor->id)
            ->whereBetween('session_date', [$today->toDateString(), $endDate->toDateString()])
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) use ($doctor) {
                // Capacity counts exclude cancelled and moved tokens
                $bookedCount = $s->tokens()->whereNotIn('status', ['cancelled', 'moved'])->count();
                $available = max(0, $s->max_tokens - $bookedCount);
                $isFull = $available <= 0;
                $isEnded = in_array($s->status, ['cancelled', 'closed', 'completed'], true);
                $isSelectable = ! $isFull && ! $isEnded;

                $avgMins = $doctor->avg_consultation_minutes ?? 15;
                $nextToken = $bookedCount + 1;
                $sessionStart = Carbon::parse($s->session_date->format('Y-m-d').' '.$s->start_time);
                $approxTime = (clone $sessionStart)->addMinutes($bookedCount * $avgMins);

                $resolved = $this->feeService->resolve(
                    doctor: $doctor,
                    session: $s,
                    channel: 'walk_in'
                );

                $startHour = Carbon::parse($s->start_time)->hour;
                $timeOfDay = $startHour < 12 ? 'morning' : ($startHour < 17 ? 'afternoon' : 'evening');

                return [
                    'id' => $s->id,
                    'doctor_id' => $s->doctor_id,
                    'doctor_name' => trim(($doctor->title ?? 'Dr.').' '.$doctor->name),
                    'doctor_specialty' => $doctor->specialty,
                    'session_date' => $s->session_date->format('Y-m-d'),
                    'session_date_formatted' => $s->session_date->format('M d, Y (D)'),
                    'day_name' => $s->session_date->format('l'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Suite 1',
                    'status' => $s->status,
                    'max_tokens' => $s->max_tokens,
                    'booked_tokens_count' => $bookedCount,
                    'available_tokens_count' => $available,
                    'is_full' => $isFull,
                    'is_selectable' => $isSelectable,
                    'is_today' => $s->session_date->isToday(),
                    'is_tomorrow' => $s->session_date->isTomorrow(),
                    'time_of_day' => $timeOfDay,
                    'next_token_number' => $nextToken,
                    'next_approx_time' => $approxTime->format('g:i A'),
                    'doctor_fee_lkr' => round($resolved['doctor_fee_portion'] / 100, 2),
                    'clinic_fee_lkr' => round($resolved['clinic_portion'] / 100, 2),
                    'total_fee_lkr' => round($resolved['patient_total'] / 100, 2),
                    'total_fee_formatted' => $resolved['patient_total_formatted'],
                ];
            });

        return response()->json([
            'doctor' => [
                'id' => $doctor->id,
                'name' => trim(($doctor->title ?? 'Dr.').' '.$doctor->name),
                'specialty' => $doctor->specialty,
                'doctor_fee_lkr' => round($doctor->doctor_fee / 100, 2),
                'clinic_fee_lkr' => round($doctor->clinic_fee / 100, 2),
                'total_fee_lkr' => round(($doctor->doctor_fee + $doctor->clinic_fee) / 100, 2),
                'avg_consultation_minutes' => $doctor->avg_consultation_minutes ?? 15,
            ],
            'sessions' => $sessions,
        ]);
    }

    /**
     * Move an existing booking token to another doctor session.
     */
    public function move(Request $request, BookingToken $token): RedirectResponse
    {
        $user = $request->user();
        $isStaff = $user->hasRole('receptionist') || $user->hasRole('clinic_admin') || $user->hasRole('super_admin');
        if (! $isStaff) {
            abort(403, 'Unauthorized to move booking tokens.');
        }

        $validated = $request->validate([
            'destination_session_id' => ['required', 'exists:doctor_sessions,id'],
            'reason' => ['nullable', 'string', 'max:255'],
            'notify_patient' => ['nullable', 'boolean'],
        ]);

        if (in_array($token->status, [BookingToken::STATUS_IN_CONSULTATION, BookingToken::STATUS_COMPLETED], true)) {
            return redirect()->back()->withErrors([
                'move_error' => 'Cannot move a token whose consultation has already started or completed.',
            ]);
        }

        if (in_array($token->status, [BookingToken::STATUS_CANCELLED, BookingToken::STATUS_MOVED], true)) {
            return redirect()->back()->withErrors([
                'move_error' => "Cannot move a token that has status '{$token->status}'.",
            ]);
        }

        if ((int) $token->doctor_session_id === (int) $validated['destination_session_id']) {
            return redirect()->back()->withErrors([
                'move_error' => 'Destination session is identical to current session.',
            ]);
        }

        $userRole = ($user->hasRole('clinic_admin') || $user->hasRole('super_admin')) ? 'clinic_admin' : 'receptionist';

        $moveResult = DB::transaction(function () use ($token, $validated, $userRole, $request) {
            $tenantId = tenant('id');

            // 1. Lock current token and session
            $lockedToken = BookingToken::where('tenant_id', $tenantId)
                ->where('id', $token->id)
                ->lockForUpdate()
                ->firstOrFail();

            $currentSession = DoctorSession::with('doctor')
                ->where('tenant_id', $tenantId)
                ->where('id', $lockedToken->doctor_session_id)
                ->firstOrFail();

            // 2. Lock destination session
            $destSession = DoctorSession::with('doctor')
                ->where('tenant_id', $tenantId)
                ->where('id', $validated['destination_session_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array($destSession->status, ['cancelled', 'closed', 'completed'], true)) {
                throw new \Exception('Destination session is not active.');
            }

            // Check capacity in destination session (excluding cancelled and moved)
            $activeCount = BookingToken::where('doctor_session_id', $destSession->id)
                ->whereNotIn('status', ['cancelled', 'moved'])
                ->count();

            if ($activeCount >= $destSession->max_tokens) {
                throw new \Exception("Destination session is full ({$destSession->max_tokens} maximum tokens booked).");
            }

            // Check if patient already has active token in destination session
            $alreadyActive = BookingToken::where('doctor_session_id', $destSession->id)
                ->where('patient_id', $lockedToken->patient_id)
                ->whereNotIn('status', ['cancelled', 'moved'])
                ->exists();

            if ($alreadyActive) {
                throw new \Exception('Patient already has an active booking token in the destination session.');
            }

            // 3. Sequential token number for destination session
            $lastTokenNumber = (int) BookingToken::where('doctor_session_id', $destSession->id)
                ->max('token_number') ?? 0;
            $newTokenNumber = $lastTokenNumber + 1;
            $estimatedTime = $destSession->calculateEstimatedTime($newTokenNumber);

            // 4. Resolve new fee snapshot for destination doctor/session
            $newSnapshot = $this->feeService->resolve(
                doctor: $destSession->doctor,
                session: $destSession,
                visitType: $lockedToken->visit_type_id,
                channel: 'walk_in',
                optionalComponentIds: [],
                manualDiscount: null,
                userRole: $userRole
            );

            // 5. Create new token
            $newToken = BookingToken::create([
                'tenant_id' => $tenantId,
                'doctor_session_id' => $destSession->id,
                'patient_id' => $lockedToken->patient_id,
                'token_number' => $newTokenNumber,
                'visit_type_id' => $newSnapshot['visit_type']['id'] ?? $lockedToken->visit_type_id,
                'estimated_time' => $estimatedTime,
                'status' => BookingToken::STATUS_BOOKED,
                'booked_via' => $lockedToken->booked_via,
                'signed_cancel_token' => Str::random(40),
                'fee_snapshot' => $newSnapshot,
                'payout_status' => 'pending',
                'notes' => $lockedToken->notes,
            ]);

            // 6. Mark old token as moved
            $moveReason = $validated['reason'] ?? 'Moved to another session';
            $lockedToken->update([
                'status' => BookingToken::STATUS_MOVED,
                'moved_to_token_id' => $newToken->id,
                'moved_at' => now(),
                'move_reason' => $moveReason,
            ]);

            // 7. Handle Bill according to immutable paid bill rule
            $bill = $lockedToken->bill;
            $diffCents = 0;
            $differentialMessage = '';

            if ($bill) {
                if ($bill->payment_status === Bill::STATUS_PAID) {
                    // Paid bills are immutable: Keep original amounts and payment.
                    // Re-link bill to the new token and new doctor.
                    $bill->update([
                        'booking_token_id' => $newToken->id,
                        'doctor_id' => $destSession->doctor_id,
                    ]);

                    $newTotal = (int) ($newSnapshot['patient_total'] ?? 0);
                    $paidTotal = (int) $bill->total_amount;
                    $diffCents = $newTotal - $paidTotal;

                    // Record separate adjustment entry via central BillCalculator
                    $this->billCalculator->recordMoveAdjustment(
                        bill: $bill,
                        diffCents: $diffCents,
                        reason: "Move adjustment from Dr. {$currentSession->doctor?->name} to Dr. {$destSession->doctor?->name}",
                        metadata: [
                            'old_token_id' => $lockedToken->id,
                            'new_token_id' => $newToken->id,
                            'old_session_id' => $currentSession->id,
                            'new_session_id' => $destSession->id,
                            'old_doctor_id' => $currentSession->doctor_id,
                            'new_doctor_id' => $destSession->doctor_id,
                            'paid_total_cents' => $paidTotal,
                            'new_total_cents' => $newTotal,
                            'differential_cents' => $diffCents,
                        ]
                    );

                    if ($diffCents > 0) {
                        $differentialMessage = 'Balance due: Rs. '.number_format($diffCents / 100, 2);
                    } elseif ($diffCents < 0) {
                        $differentialMessage = 'Refund due: Rs. '.number_format(abs($diffCents) / 100, 2);
                    } else {
                        $differentialMessage = 'No fee difference.';
                    }
                } else {
                    // Unpaid bills: simply recalculate with new fee snapshot
                    $bill->update([
                        'booking_token_id' => $newToken->id,
                        'doctor_id' => $destSession->doctor_id,
                        'visit_type_id' => $newSnapshot['visit_type']['id'] ?? null,
                        'doctor_fee' => $newSnapshot['doctor_fee_portion'],
                        'clinic_fee' => $newSnapshot['clinic_portion'],
                        'other_fee' => $newSnapshot['third_party_portion'],
                        'discount' => $newSnapshot['discount']['amount'],
                        'discount_reason' => $newSnapshot['discount']['reason'],
                        'total_amount' => $newSnapshot['patient_total'],
                        'fee_snapshot' => $newSnapshot,
                        'doctor_payout_amount' => $newSnapshot['doctor_payout_amount'],
                        'clinic_net_amount' => $newSnapshot['clinic_net_amount'],
                        'third_party_amount' => $newSnapshot['third_party_portion'],
                    ]);

                    $differentialMessage = 'Unpaid bill updated to Rs. '.number_format($newSnapshot['patient_total'] / 100, 2);
                }
            }

            // 8. Audit Event
            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'booking_token.moved',
                'resource_type' => 'booking_token',
                'resource_id' => (string) $newToken->id,
                'metadata' => [
                    'old_token_id' => $lockedToken->id,
                    'new_token_id' => $newToken->id,
                    'old_token_number' => $lockedToken->token_number,
                    'new_token_number' => $newTokenNumber,
                    'patient_id' => $lockedToken->patient_id,
                    'old_session_id' => $lockedToken->doctor_session_id,
                    'new_session_id' => $destSession->id,
                    'diff_cents' => $diffCents,
                    'reason' => $moveReason,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => Carbon::now('Asia/Colombo'),
            ]);

            // 9. Dispatch notification
            $notify = $request->boolean('notify_patient', true);
            if ($notify) {
                SendTokenMoveNotificationJob::dispatch(
                    $lockedToken->id,
                    $newToken->id,
                    $moveReason
                );
            }

            return [
                'oldToken' => $lockedToken,
                'newToken' => $newToken,
                'session' => $destSession,
                'patient' => $lockedToken->patient,
                'diffCents' => $diffCents,
                'differentialMessage' => $differentialMessage,
            ];
        });

        $docName = trim(($moveResult['session']->doctor?->title ?? 'Dr.').' '.($moveResult['session']->doctor?->name ?? 'Doctor'));
        $successMsg = "Token moved to #{$moveResult['newToken']->token_number} with {$docName}. {$moveResult['differentialMessage']}";

        return redirect()->back()
            ->with('success', $successMsg)
            ->with('movedToken', [
                'id' => $moveResult['newToken']->id,
                'token_number' => $moveResult['newToken']->token_number,
                'patient_name' => $moveResult['patient']?->name,
                'doctor_name' => $docName,
                'session_date' => $moveResult['session']->session_date->format('M d, Y (D)'),
                'start_time' => Carbon::parse($moveResult['session']->start_time)->format('h:i A'),
                'differential_cents' => $moveResult['diffCents'],
                'differential_message' => $moveResult['differentialMessage'],
            ]);
    }
}
