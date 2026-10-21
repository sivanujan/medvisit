<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\DoctorSettlement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DoctorSettlementController extends Controller
{
    /**
     * Display Doctor Settlements list and date range summary.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor') && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin');

        $linkedDoctor = $isDoctor ? Doctor::where('tenant_id', $tenant->id)->where('user_id', $user->id)->first() : null;

        $startDate = $request->query('start_date')
            ? Carbon::parse($request->query('start_date'))->toDateString()
            : Carbon::now('Asia/Colombo')->startOfMonth()->toDateString();

        $endDate = $request->query('end_date')
            ? Carbon::parse($request->query('end_date'))->toDateString()
            : Carbon::now('Asia/Colombo')->endOfMonth()->toDateString();

        $selectedDoctorId = $request->query('doctor_id') ? (int) $request->query('doctor_id') : null;

        // If logged in as doctor, force selection to linked doctor only
        if ($isDoctor) {
            $selectedDoctorId = $linkedDoctor?->id ?? 0;
        }

        // Available doctors dropdown (filtered for doctor role)
        $doctorsQuery = Doctor::where('tenant_id', $tenant->id)->where('is_active', true);
        if ($isDoctor) {
            $doctorsQuery->where('id', $selectedDoctorId);
        }
        $doctors = $doctorsQuery->orderBy('name')->get(['id', 'name', 'title', 'specialty']);

        // Settlements history
        $settlementsQuery = DoctorSettlement::with(['doctor', 'session', 'creator'])
            ->where('tenant_id', $tenant->id)
            ->whereBetween('period_start', [$startDate, $endDate]);

        if ($selectedDoctorId) {
            $settlementsQuery->where('doctor_id', $selectedDoctorId);
        }

        $settlements = $settlementsQuery->latest('id')->get()->map(fn ($s) => [
            'id' => $s->id,
            'settlement_number' => $s->settlement_number,
            'doctor_id' => $s->doctor_id,
            'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
            'doctor_specialty' => $s->doctor?->specialty ?? '',
            'period_start' => $s->period_start->format('M d, Y'),
            'period_end' => $s->period_end->format('M d, Y'),
            'sessions_count' => $s->sessions_count,
            'patients_seen' => $s->patients_seen,
            'no_shows_count' => $s->no_shows_count,
            'gross_collected_lkr' => round($s->gross_collected / 100, 2),
            'doctor_payout_amount_lkr' => round($s->doctor_payout_amount / 100, 2),
            'doctor_payout_formatted' => 'Rs. '.number_format($s->doctor_payout_amount / 100, 2),
            'clinic_amount_lkr' => round($s->clinic_amount / 100, 2),
            'paid_amount_lkr' => round($s->paid_amount / 100, 2),
            'balance_due_lkr' => round($s->balance_due / 100, 2),
            'payment_status' => $s->payment_status,
            'payment_method' => $s->payment_method,
            'payment_reference' => $s->payment_reference,
            'paid_at' => $s->paid_at?->format('M d, Y h:i A'),
            'notes' => $s->notes,
            'created_at' => $s->created_at->format('M d, Y'),
            'created_by_name' => $s->creator?->name ?? 'System',
        ]);

        // Unsettled Sessions & Summary Calculation
        $sessionsQuery = DoctorSession::with(['doctor', 'tokens.bill', 'settlements'])
            ->where('tenant_id', $tenant->id)
            ->whereBetween('session_date', [$startDate, $endDate])
            ->whereNotIn('status', ['cancelled']);

        if ($selectedDoctorId) {
            $sessionsQuery->where('doctor_id', $selectedDoctorId);
        }

        $sessions = $sessionsQuery->orderBy('session_date')->get()->map(function ($sess) {
            $tokens = $sess->tokens;
            $seenTokens = $tokens->whereIn('status', ['completed', 'in_consultation', 'checked_in', 'called', 'booked']);
            $noShows = $tokens->where('status', 'no_show');

            $grossCollected = 0;
            $doctorPayout = 0;
            $clinicShare = 0;

            // Check payout rule of session / doctor
            $payoutRule = $sess->payout_rule_override ?? $sess->doctor?->payout_rule ?? [
                'type' => 'full_doctor_fee',
                'value' => 0,
                'min_patients' => 0,
                'pay_no_shows' => false,
                'pay_cancelled' => false,
            ];

            $payNoShows = ! empty($payoutRule['pay_no_shows']);
            $payoutType = $payoutRule['type'] ?? 'full_doctor_fee';

            foreach ($tokens as $t) {
                if ($t->status === 'cancelled' || $t->status === 'moved') {
                    continue;
                }

                if ($t->status === 'no_show' && ! $payNoShows) {
                    continue;
                }

                $snapshot = $t->fee_snapshot;
                if ($snapshot) {
                    $grossCollected += (int) ($snapshot['patient_total'] ?? 0);
                    if ($payoutType !== 'fixed_per_session') {
                        $doctorPayout += (int) ($snapshot['doctor_payout_amount'] ?? 0);
                    }
                } else {
                    $docFee = $sess->doctor_fee;
                    $clFee = $sess->clinic_fee;
                    $grossCollected += ($docFee + $clFee);
                    if ($payoutType !== 'fixed_per_session') {
                        $doctorPayout += $docFee;
                    }
                }
            }

            // Fixed per session rule
            if ($payoutType === 'fixed_per_session') {
                $minPatients = (int) ($payoutRule['min_patients'] ?? 0);
                $patientsCount = $seenTokens->count();
                if ($minPatients === 0 || $patientsCount >= $minPatients) {
                    $doctorPayout = (int) ($payoutRule['value'] ?? 0);
                } else {
                    // Prorated if below minimum threshold
                    $doctorPayout = $minPatients > 0
                        ? (int) round((($payoutRule['value'] ?? 0) * $patientsCount) / $minPatients)
                        : (int) ($payoutRule['value'] ?? 0);
                }
            }

            $clinicShare = max(0, $grossCollected - $doctorPayout);
            $isSettled = DoctorSettlement::where('doctor_session_id', $sess->id)
                ->where('payment_status', 'paid')
                ->exists();

            return [
                'id' => $sess->id,
                'doctor_id' => $sess->doctor_id,
                'doctor_name' => trim(($sess->doctor?->title ?? 'Dr.').' '.($sess->doctor?->name ?? 'Doctor')),
                'session_date' => $sess->session_date->format('M d, Y (D)'),
                'session_date_raw' => $sess->session_date->toDateString(),
                'start_time' => Carbon::parse($sess->start_time)->format('h:i A'),
                'room_number' => $sess->room_number ?? 'Suite 1',
                'patients_seen' => $seenTokens->count(),
                'no_shows' => $noShows->count(),
                'gross_collected_lkr' => round($grossCollected / 100, 2),
                'doctor_payout_lkr' => round($doctorPayout / 100, 2),
                'clinic_share_lkr' => round($clinicShare / 100, 2),
                'is_settled' => $isSettled,
                'payout_type' => $payoutType,
            ];
        });

        // Overall summary across the selected period
        $totalGross = $sessions->sum('gross_collected_lkr');
        $totalDoctorPayout = $sessions->sum('doctor_payout_lkr');
        $totalClinicShare = $sessions->sum('clinic_share_lkr');
        $totalPatients = $sessions->sum('patients_seen');
        $totalNoShows = $sessions->sum('no_shows');
        $totalSettledPaid = $settlements->sum('paid_amount_lkr');
        $outstandingBalance = max(0, $totalDoctorPayout - $totalSettledPaid);

        return Inertia::render('Billing/DoctorPayouts', [
            'doctors' => $doctors,
            'selectedDoctorId' => $selectedDoctorId,
            'isDoctorRole' => $isDoctor,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'doctor_id' => $selectedDoctorId,
            ],
            'settlements' => $settlements,
            'sessions' => $sessions,
            'summary' => [
                'total_sessions' => $sessions->count(),
                'total_patients' => $totalPatients,
                'total_no_shows' => $totalNoShows,
                'gross_collected_lkr' => $totalGross,
                'gross_collected_formatted' => 'Rs. '.number_format($totalGross, 2),
                'doctor_payout_due_lkr' => $totalDoctorPayout,
                'doctor_payout_due_formatted' => 'Rs. '.number_format($totalDoctorPayout, 2),
                'clinic_share_lkr' => $totalClinicShare,
                'clinic_share_formatted' => 'Rs. '.number_format($totalClinicShare, 2),
                'paid_amount_lkr' => $totalSettledPaid,
                'paid_amount_formatted' => 'Rs. '.number_format($totalSettledPaid, 2),
                'outstanding_balance_lkr' => $outstandingBalance,
                'outstanding_balance_formatted' => 'Rs. '.number_format($outstandingBalance, 2),
            ],
            'clinicInfo' => [
                'name' => ucwords((string) ($tenant->name ?? 'MedVisit Clinic')),
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            ],
        ]);
    }

    /**
     * Create or record a doctor settlement.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'doctor_session_id' => ['nullable', 'exists:doctor_sessions,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'sessions_count' => ['required', 'integer', 'min:0'],
            'patients_seen' => ['required', 'integer', 'min:0'],
            'no_shows_count' => ['required', 'integer', 'min:0'],
            'gross_collected_lkr' => ['required', 'numeric', 'min:0'],
            'doctor_payout_amount_lkr' => ['required', 'numeric', 'min:0'],
            'paid_amount_lkr' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer,cheque'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $tenantId = tenant('id');
        $settlementNumber = 'SET-'.strtoupper(Str::random(6)).'-'.date('dmy');

        $grossCents = (int) round($validated['gross_collected_lkr'] * 100);
        $payoutCents = (int) round($validated['doctor_payout_amount_lkr'] * 100);
        $paidCents = (int) round($validated['paid_amount_lkr'] * 100);
        $clinicCents = max(0, $grossCents - $payoutCents);

        $status = DoctorSettlement::STATUS_UNPAID;
        if ($paidCents >= $payoutCents && $payoutCents > 0) {
            $status = DoctorSettlement::STATUS_PAID;
        } elseif ($paidCents > 0) {
            $status = DoctorSettlement::STATUS_PARTIAL;
        }

        $settlement = DoctorSettlement::create([
            'tenant_id' => $tenantId,
            'doctor_id' => $validated['doctor_id'],
            'doctor_session_id' => $validated['doctor_session_id'] ?? null,
            'settlement_number' => $settlementNumber,
            'period_start' => $validated['period_start'],
            'period_end' => $validated['period_end'],
            'sessions_count' => $validated['sessions_count'],
            'patients_seen' => $validated['patients_seen'],
            'no_shows_count' => $validated['no_shows_count'],
            'gross_collected' => $grossCents,
            'doctor_payout_amount' => $payoutCents,
            'clinic_amount' => $clinicCents,
            'paid_amount' => $paidCents,
            'payment_status' => $status,
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? null,
            'paid_at' => $paidCents > 0 ? now() : null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        // Link tokens to this settlement if session-level
        if (! empty($validated['doctor_session_id'])) {
            BookingToken::where('doctor_session_id', $validated['doctor_session_id'])
                ->whereNotIn('status', ['cancelled', 'moved'])
                ->update([
                    'doctor_settlement_id' => $settlement->id,
                    'payout_status' => $status === DoctorSettlement::STATUS_PAID ? 'settled' : 'pending',
                ]);
        }

        // Audit Trail
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'doctor_settlement.created',
            'resource_type' => 'doctor_settlement',
            'resource_id' => $settlementNumber,
            'metadata' => [
                'doctor_id' => $validated['doctor_id'],
                'payout_amount' => $payoutCents,
                'paid_amount' => $paidCents,
                'status' => $status,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Settlement {$settlementNumber} recorded successfully.");
    }

    /**
     * Mark or record additional payment on an existing settlement.
     */
    public function recordPayment(Request $request, DoctorSettlement $settlement): RedirectResponse
    {
        $validated = $request->validate([
            'payment_amount_lkr' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer,cheque'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $addCents = (int) round($validated['payment_amount_lkr'] * 100);
        $newPaid = min($settlement->doctor_payout_amount, $settlement->paid_amount + $addCents);
        $status = $newPaid >= $settlement->doctor_payout_amount ? DoctorSettlement::STATUS_PAID : DoctorSettlement::STATUS_PARTIAL;

        $settlement->update([
            'paid_amount' => $newPaid,
            'payment_status' => $status,
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? $settlement->payment_reference,
            'paid_at' => now(),
            'notes' => $validated['notes'] ? ($settlement->notes."\n".$validated['notes']) : $settlement->notes,
        ]);

        if ($status === DoctorSettlement::STATUS_PAID && $settlement->doctor_session_id) {
            BookingToken::where('doctor_session_id', $settlement->doctor_session_id)
                ->whereNotIn('status', ['cancelled', 'moved'])
                ->update(['payout_status' => 'settled']);
        }

        return redirect()->back()->with('success', "Payment of Rs. {$validated['payment_amount_lkr']} recorded for settlement {$settlement->settlement_number}.");
    }

    /**
     * Generate printable slip payload for a settlement.
     */
    public function slip(DoctorSettlement $settlement): JsonResponse
    {
        $tenant = tenant();
        $settlement->load(['doctor', 'session', 'creator']);

        return response()->json([
            'settlement' => [
                'id' => $settlement->id,
                'settlement_number' => $settlement->settlement_number,
                'doctor_name' => trim(($settlement->doctor?->title ?? 'Dr.').' '.($settlement->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $settlement->doctor?->specialty ?? '',
                'slmc_number' => $settlement->doctor?->slmc_number ?? '',
                'period_start' => $settlement->period_start->format('M d, Y'),
                'period_end' => $settlement->period_end->format('M d, Y'),
                'sessions_count' => $settlement->sessions_count,
                'patients_seen' => $settlement->patients_seen,
                'no_shows_count' => $settlement->no_shows_count,
                'gross_collected_formatted' => 'Rs. '.number_format($settlement->gross_collected / 100, 2),
                'doctor_payout_formatted' => 'Rs. '.number_format($settlement->doctor_payout_amount / 100, 2),
                'clinic_amount_formatted' => 'Rs. '.number_format($settlement->clinic_amount / 100, 2),
                'paid_amount_formatted' => 'Rs. '.number_format($settlement->paid_amount / 100, 2),
                'balance_due_formatted' => 'Rs. '.number_format($settlement->balance_due / 100, 2),
                'payment_status' => $settlement->payment_status,
                'payment_method' => $settlement->payment_method,
                'payment_reference' => $settlement->payment_reference,
                'paid_at' => $settlement->paid_at?->format('M d, Y h:i A'),
                'created_by' => $settlement->creator?->name ?? 'System',
                'created_at' => $settlement->created_at->format('M d, Y h:i A'),
            ],
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'MedVisit Clinic')),
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            ],
        ]);
    }

    /**
     * Record a doctor payout disbursement directly.
     */
    public function disburse(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'doctor_session_id' => ['nullable', 'exists:doctor_sessions,id'],
            'amount_lkr' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer,cheque'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'disbursed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $tenantId = tenant('id');
        $settlementNumber = 'SET-'.strtoupper(Str::random(6)).'-'.date('dmy');
        $amountCents = (int) round($validated['amount_lkr'] * 100);
        $ref = $validated['reference_number'] ?? $validated['payment_reference'] ?? null;
        $disbursedAt = ! empty($validated['disbursed_at']) ? Carbon::parse($validated['disbursed_at']) : now();

        $settlement = DoctorSettlement::create([
            'tenant_id' => $tenantId,
            'doctor_id' => $validated['doctor_id'],
            'doctor_session_id' => $validated['doctor_session_id'] ?? null,
            'settlement_number' => $settlementNumber,
            'period_start' => $disbursedAt->toDateString(),
            'period_end' => $disbursedAt->toDateString(),
            'sessions_count' => 1,
            'patients_seen' => 1,
            'no_shows_count' => 0,
            'gross_collected' => $amountCents,
            'doctor_payout_amount' => $amountCents,
            'clinic_amount' => 0,
            'paid_amount' => $amountCents,
            'payment_status' => DoctorSettlement::STATUS_PAID,
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $ref,
            'paid_at' => $disbursedAt,
            'notes' => $validated['notes'] ?? 'Direct disbursement',
            'created_by' => $request->user()->id,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'doctor_settlement.disbursed',
            'resource_type' => 'doctor_settlement',
            'resource_id' => $settlementNumber,
            'metadata' => [
                'doctor_id' => $validated['doctor_id'],
                'paid_amount' => $amountCents,
                'method' => $validated['payment_method'],
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Disbursement of Rs. {$validated['amount_lkr']} recorded successfully.");
    }
}
