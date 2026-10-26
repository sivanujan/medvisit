<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Bill;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\DoctorSettlement;
use App\Services\DoctorPayoutService;
use App\Services\FeeResolutionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DoctorSettlementController extends Controller
{
    public function __construct(
        protected DoctorPayoutService $payoutService,
        protected FeeResolutionService $feeService
    ) {}

    /**
     * Display Doctor Payouts & Settlements hub with 3 tabs:
     * 1. By doctor
     * 2. Sessions breakdown
     * 3. Payout history
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor') && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin');
        $canManage = $user->hasRole('clinic_admin') || $user->hasRole('super_admin');

        $linkedDoctor = $isDoctor ? Doctor::where('tenant_id', $tenant->id)->where('user_id', $user->id)->first() : null;

        // Date range
        $startDate = $request->query('start_date')
            ? Carbon::parse($request->query('start_date'))->toDateString()
            : Carbon::now('Asia/Colombo')->startOfMonth()->toDateString();

        $endDate = $request->query('end_date')
            ? Carbon::parse($request->query('end_date'))->toDateString()
            : Carbon::now('Asia/Colombo')->endOfMonth()->toDateString();

        // Selected doctor(s)
        $selectedDoctorId = $request->query('doctor_id') ? (int) $request->query('doctor_id') : null;
        if ($isDoctor) {
            $selectedDoctorId = $linkedDoctor?->id ?? 0;
        }

        // Clinic setting for doctor visibility
        $feeSettings = $this->feeService->getTenantSettings($tenant);
        $showClinicShareToDoctors = (bool) ($feeSettings['show_clinic_share_to_doctors'] ?? false);
        $hideClinicShare = $isDoctor && ! $showClinicShareToDoctors;

        // Query available doctors
        $doctorsQuery = Doctor::where('tenant_id', $tenant->id)->where('is_active', true);
        if ($isDoctor) {
            $doctorsQuery->where('id', $selectedDoctorId);
        }
        $doctors = $doctorsQuery->orderBy('name')->get(['id', 'name', 'title', 'specialty'])->map(fn ($d) => [
            'id' => $d->id,
            'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
            'specialty' => $d->specialty,
            'color' => Doctor::getDoctorColor($d->id),
        ]);

        // -------------------------------------------------------------
        // TAB 2 DATA: SESSIONS BREAKDOWN (Includes cancelled sessions with paid bills!)
        // -------------------------------------------------------------
        $sessionsQuery = DoctorSession::with(['doctor', 'tokens.bill.items', 'tokens.bill.settlementItem'])
            ->where('tenant_id', $tenant->id)
            ->whereBetween('session_date', [$startDate, $endDate]);

        if ($selectedDoctorId) {
            $sessionsQuery->where('doctor_id', $selectedDoctorId);
        }

        $allSessions = $sessionsQuery->orderBy('session_date')->orderBy('start_time')->get();

        $sessionItems = [];
        $totalGrossCents = 0;
        $totalDoctorEarnedCents = 0;
        $totalClinicShareCents = 0;
        $totalPaidPatientsCount = 0;

        foreach ($allSessions as $session) {
            $fin = $this->payoutService->calculateSessionFinancials($session);

            if ($hideClinicShare) {
                $fin['clinic_share_cents'] = null;
                $fin['clinic_share_lkr'] = null;
            }

            $sessionItems[] = $fin;

            $totalGrossCents += $fin['consultation_gross_cents'];
            $totalDoctorEarnedCents += $fin['doctor_share_cents'];
            if (! $hideClinicShare) {
                $totalClinicShareCents += ($fin['clinic_share_cents'] ?? 0);
            }
            $totalPaidPatientsCount += $fin['paid_patients'];
        }

        // -------------------------------------------------------------
        // TAB 3 DATA: PAYOUT HISTORY (Settlements)
        // -------------------------------------------------------------
        $settlementsQuery = DoctorSettlement::with(['doctor', 'creator', 'voidedByUser', 'items'])
            ->where('tenant_id', $tenant->id)
            ->whereBetween('period_start', [$startDate, $endDate]);

        if ($selectedDoctorId) {
            $settlementsQuery->where('doctor_id', $selectedDoctorId);
        }

        $allSettlements = $settlementsQuery->latest('id')->get();
        $totalDisbursedPaidCents = (int) $allSettlements->where('is_voided', false)->sum('paid_amount');
        $totalAdjustmentsCents = (int) $allSettlements->where('is_voided', false)->sum('adjustments_total');

        $settlementItems = $allSettlements->map(function ($s) {
            return [
                'id' => $s->id,
                'settlement_number' => $s->settlement_number,
                'is_legacy' => (bool) $s->is_legacy,
                'is_voided' => (bool) $s->is_voided,
                'void_reason' => $s->void_reason,
                'voided_at' => $s->voided_at?->format('M d, Y h:i A'),
                'voided_by_name' => $s->voidedByUser?->name,
                'doctor_id' => $s->doctor_id,
                'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $s->doctor?->specialty ?? '',
                'doctor_color' => Doctor::getDoctorColor($s->doctor_id),
                'period_start' => $s->period_start->format('M d, Y'),
                'period_end' => $s->period_end->format('M d, Y'),
                'period_start_raw' => $s->period_start->toDateString(),
                'period_end_raw' => $s->period_end->toDateString(),
                'sessions_count' => $s->sessions_count,
                'patients_seen' => $s->patients_seen,
                'bills_count' => $s->items->count() > 0 ? $s->items->count() : $s->patients_seen,
                'gross_collected_lkr' => round($s->gross_collected / 100, 2),
                'gross_collected_formatted' => Bill::formatLKR($s->gross_collected, true),
                'doctor_payout_amount_lkr' => round($s->doctor_payout_amount / 100, 2),
                'doctor_payout_formatted' => Bill::formatLKR($s->doctor_payout_amount, true),
                'adjustments_total_lkr' => round($s->adjustments_total / 100, 2),
                'clinic_amount_lkr' => $hideClinicShare ? null : round($s->clinic_amount / 100, 2),
                'clinic_amount_formatted' => $hideClinicShare ? null : Bill::formatLKR($s->clinic_amount, true),
                'paid_amount_lkr' => round($s->paid_amount / 100, 2),
                'paid_amount_formatted' => Bill::formatLKR($s->paid_amount, true),
                'balance_due_lkr' => round(max(0, $s->doctor_payout_amount - $s->paid_amount) / 100, 2),
                'balance_due_formatted' => Bill::formatLKR(max(0, $s->doctor_payout_amount - $s->paid_amount), true),
                'payment_status' => $s->payment_status,
                'payment_method' => $s->payment_method ?? 'bank_transfer',
                'payment_reference' => $s->payment_reference,
                'paid_at' => $s->paid_at?->format('M d, Y h:i A'),
                'notes' => $s->notes,
                'created_at' => $s->created_at->format('M d, Y'),
                'created_by_name' => $s->creator?->name ?? 'System',
            ];
        });

        // -------------------------------------------------------------
        // TAB 1 DATA: BY DOCTOR SUMMARY
        // -------------------------------------------------------------
        $doctorsSummary = [];
        $sessionsByDoctor = collect($sessionItems)->groupBy('doctor_id');

        foreach ($doctors as $d) {
            $docId = $d['id'];
            $docSessions = $sessionsByDoctor->get($docId, collect());

            $docGross = (int) $docSessions->sum('consultation_gross_cents');
            $docEarned = (int) $docSessions->sum('doctor_share_cents');
            $docClinic = (int) $docSessions->sum('clinic_share_cents');
            $docSeen = (int) $docSessions->sum('patients_seen');
            $docPaidPatients = (int) $docSessions->sum('paid_patients');
            $docNoShows = (int) $docSessions->sum('no_shows');

            // Doctor paid in non-voided settlements
            $docSettlements = $allSettlements->where('doctor_id', $docId)->where('is_voided', false);
            $docPaid = (int) $docSettlements->sum('paid_amount');
            $docAdjustments = (int) $docSettlements->sum('adjustments_total');

            // Outstanding = Earned - Paid + Pending Adjustments
            $pendingAdjustments = (int) DB::table('settlement_adjustments')
                ->where('tenant_id', $tenant->id)
                ->where('doctor_id', $docId)
                ->whereNull('doctor_settlement_id')
                ->sum('amount_cents');

            $docOutstanding = max(0, $docEarned - $docPaid + $pendingAdjustments);

            $progressPct = $docEarned > 0 ? min(100, (int) round(($docPaid / $docEarned) * 100)) : 100;

            $doctorsSummary[] = [
                'doctor_id' => $docId,
                'doctor_name' => $d['name'],
                'doctor_specialty' => $d['specialty'],
                'doctor_color' => $d['color'],
                'sessions_count' => $docSessions->count(),
                'patients_seen' => $docSeen,
                'paid_patients' => $docPaidPatients,
                'no_shows' => $docNoShows,
                'consultation_gross_cents' => $docGross,
                'consultation_gross_lkr' => round($docGross / 100, 2),
                'doctor_share_cents' => $docEarned,
                'doctor_share_lkr' => round($docEarned / 100, 2),
                'paid_amount_cents' => $docPaid,
                'paid_amount_lkr' => round($docPaid / 100, 2),
                'adjustments_cents' => $pendingAdjustments,
                'adjustments_lkr' => round($pendingAdjustments / 100, 2),
                'outstanding_cents' => $docOutstanding,
                'outstanding_lkr' => round($docOutstanding / 100, 2),
                'clinic_share_cents' => $hideClinicShare ? null : $docClinic,
                'clinic_share_lkr' => $hideClinicShare ? null : round($docClinic / 100, 2),
                'progress_percentage' => $progressPct,
                'settlements_count' => $docSettlements->count(),
                'sessions' => $docSessions->values()->all(),
            ];
        }

        // Global outstanding
        $totalOutstandingCents = max(0, $totalDoctorEarnedCents - $totalDisbursedPaidCents);

        return Inertia::render('Billing/DoctorPayouts', [
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'doctor_id' => $selectedDoctorId,
            ],
            'selectedDoctorId' => $selectedDoctorId,
            'doctors' => $doctors,
            'isDoctorRole' => $isDoctor,
            'canManage' => $canManage,
            'hideClinicShare' => $hideClinicShare,
            'showClinicShareSetting' => $showClinicShareToDoctors,
            'doctorsSummary' => $doctorsSummary,
            'sessions' => $sessionItems,
            'settlements' => $settlementItems,
            'summary' => [
                'total_sessions' => count($sessionItems),
                'total_patients' => $totalPaidPatientsCount,
                'total_no_shows' => (int) $allSessions->sum(fn ($s) => $s->tokens->where('status', 'no_show')->count()),
                'gross_collected_lkr' => round($totalGrossCents / 100, 2),
                'gross_collected_formatted' => Bill::formatLKR($totalGrossCents, true),
                'doctor_payout_due_lkr' => round($totalDoctorEarnedCents / 100, 2),
                'doctor_payout_due_formatted' => Bill::formatLKR($totalDoctorEarnedCents, true),
                'clinic_share_lkr' => $hideClinicShare ? null : round($totalClinicShareCents / 100, 2),
                'clinic_share_formatted' => $hideClinicShare ? null : Bill::formatLKR($totalClinicShareCents, true),
                'paid_amount_lkr' => round($totalDisbursedPaidCents / 100, 2),
                'paid_amount_formatted' => Bill::formatLKR($totalDisbursedPaidCents, true),
                'settlements_count' => $allSettlements->where('is_voided', false)->count(),
                'adjustments_total_lkr' => round($totalAdjustmentsCents / 100, 2),
                'outstanding_balance_lkr' => round($totalOutstandingCents / 100, 2),
                'outstanding_balance_formatted' => Bill::formatLKR($totalOutstandingCents, true),
            ],
            'clinicInfo' => [
                'name' => ucwords((string) ($tenant->name ?? 'MedVisit Clinic')),
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            ],
        ]);
    }

    /**
     * Fetch unsettled bills and pending adjustments for a doctor (used by Record Payout drawer).
     */
    public function unsettledBills(Request $request, Doctor $doctor): JsonResponse
    {
        $tenantId = tenant('id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $data = $this->payoutService->getUnsettledBillsForDoctor($tenantId, $doctor->id, $startDate, $endDate);

        return response()->json($data);
    }

    /**
     * Fetch detailed bills drill-down for a specific session.
     */
    public function sessionBills(Request $request, DoctorSession $session): JsonResponse
    {
        $tenant = tenant();
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor') && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin');

        if ($isDoctor) {
            $linkedDoctor = Doctor::where('tenant_id', $tenant->id)->where('user_id', $user->id)->first();
            if (! $linkedDoctor || $session->doctor_id !== $linkedDoctor->id) {
                abort(403, 'Unauthorized access to session bills.');
            }
        }

        $feeSettings = $this->feeService->getTenantSettings($tenant);
        $showClinicShareToDoctors = (bool) ($feeSettings['show_clinic_share_to_doctors'] ?? false);
        $hideClinicShare = $isDoctor && ! $showClinicShareToDoctors;

        $bills = Bill::with(['patient', 'items', 'settlementItem.settlement'])
            ->where('tenant_id', $session->tenant_id)
            ->whereHas('token', fn ($q) => $q->where('doctor_session_id', $session->id))
            ->get();

        $payoutRule = $session->payout_rule_override
            ?? $session->doctor?->payout_rule
            ?? ['type' => 'full_doctor_fee'];

        $billsList = $bills->map(function ($b) use ($payoutRule, $hideClinicShare) {
            $pharmacyCents = (int) $b->items->sum('total_price_cents');
            $consultationCents = max(0, $b->total_amount - $pharmacyCents);
            $docShare = $this->payoutService->calculateBillDoctorShare($b, $consultationCents, $payoutRule);

            return [
                'id' => $b->id,
                'receipt_number' => $b->receipt_number ?? "REC-{$b->id}",
                'token_number' => $b->token?->token_number ?? 1,
                'patient_name' => $b->patient?->name ?? 'Patient',
                'patient_phone' => $b->patient?->phone ?? '',
                'payment_status' => $b->payment_status,
                'paid_at' => $b->paid_at?->format('M d, Y h:i A') ?? $b->created_at->format('M d, Y'),
                'total_amount_lkr' => round($b->total_amount / 100, 2),
                'consultation_fee_lkr' => round($consultationCents / 100, 2),
                'pharmacy_fee_lkr' => round($pharmacyCents / 100, 2),
                'doctor_share_lkr' => round($docShare / 100, 2),
                'clinic_share_lkr' => $hideClinicShare ? null : round(max(0, $consultationCents - $docShare) / 100, 2),
                'is_settled' => $b->settlementItem !== null,
                'settlement_number' => $b->settlementItem?->settlement?->settlement_number,
            ];
        });

        return response()->json([
            'session_id' => $session->id,
            'doctor_name' => trim(($session->doctor?->title ?? 'Dr.').' '.($session->doctor?->name ?? 'Doctor')),
            'session_date' => $session->session_date->format('M d, Y'),
            'session_status' => $session->status,
            'bills' => $billsList,
        ]);
    }

    /**
     * Record a new doctor settlement with atomic row locks and gapless PAY sequence.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');

        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'doctor_session_id' => ['nullable', 'exists:doctor_sessions,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'bill_ids' => ['required', 'array', 'min:1'],
            'bill_ids.*' => ['integer', 'exists:bills,id'],
            'adjustment_ids' => ['nullable', 'array'],
            'adjustment_ids.*' => ['integer', 'exists:settlement_adjustments,id'],
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer,cheque'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $settlement = $this->payoutService->recordSettlement($tenantId, $validated, $request->user());

            return redirect()->back()->with('success', "Payout recorded successfully. Reference: {$settlement->settlement_number}.");
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Failed to record payout: '.$e->getMessage());
        }
    }

    /**
     * Void a doctor settlement (unlocks bills, unlinks adjustments, audit-logs).
     */
    public function void(Request $request, DoctorSettlement $settlement): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->payoutService->voidSettlement(tenant('id'), $settlement->id, $validated['reason'], $request->user());

            return redirect()->back()->with('success', "Settlement {$settlement->settlement_number} has been voided. Linked bills have been released.");
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Failed to void settlement: '.$e->getMessage());
        }
    }

    /**
     * Return JSON data for rendering or printing the settlement slip.
     */
    public function slip(Request $request, DoctorSettlement $settlement): JsonResponse
    {
        $tenant = tenant();
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor') && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin');

        if ($isDoctor) {
            $linkedDoctor = Doctor::where('tenant_id', $tenant->id)->where('user_id', $user->id)->first();
            if (! $linkedDoctor || $settlement->doctor_id !== $linkedDoctor->id) {
                abort(403, 'Unauthorized access to settlement slip.');
            }
        }

        $feeSettings = $this->feeService->getTenantSettings($tenant);
        $showClinicShareToDoctors = (bool) ($feeSettings['show_clinic_share_to_doctors'] ?? false);
        $hideClinicShare = $isDoctor && ! $showClinicShareToDoctors;

        $settlement->load(['doctor', 'items.bill.patient', 'adjustments', 'creator', 'voidedByUser']);

        $billsBreakdown = $settlement->items->map(fn ($item) => [
            'bill_id' => $item->bill_id,
            'receipt_number' => $item->bill?->receipt_number ?? "REC-{$item->bill_id}",
            'patient_name' => $item->bill?->patient?->name ?? 'Patient',
            'token_number' => $item->bill?->token?->token_number ?? 1,
            'paid_at' => $item->bill?->paid_at?->format('M d, Y') ?? $item->bill?->created_at->format('M d, Y'),
            'consultation_fee' => Bill::formatLKR($item->consultation_fee_cents, true),
            'doctor_share' => Bill::formatLKR($item->doctor_share_cents, true),
            'clinic_share' => $hideClinicShare ? null : Bill::formatLKR($item->clinic_share_cents, true),
        ]);

        $adjustmentsBreakdown = $settlement->adjustments->map(fn ($adj) => [
            'type' => $adj->type,
            'reason' => $adj->reason,
            'amount' => Bill::formatLKR($adj->amount_cents, true),
            'amount_cents' => $adj->amount_cents,
        ]);

        return response()->json([
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'MedVisit Clinic')),
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'email' => $tenant->email ?? 'info@medvisit.lk',
            ],
            'settlement' => [
                'id' => $settlement->id,
                'settlement_number' => $settlement->settlement_number,
                'is_legacy' => $settlement->is_legacy,
                'is_voided' => $settlement->is_voided,
                'void_reason' => $settlement->void_reason,
                'voided_at' => $settlement->voided_at?->format('M d, Y h:i A'),
                'voided_by' => $settlement->voidedByUser?->name,
                'period_start' => $settlement->period_start->format('M d, Y'),
                'period_end' => $settlement->period_end->format('M d, Y'),
                'paid_at' => $settlement->paid_at?->format('M d, Y h:i A') ?? $settlement->created_at->format('M d, Y h:i A'),
                'payment_method' => strtoupper(str_replace('_', ' ', $settlement->payment_method ?? 'Bank Transfer')),
                'payment_reference' => $settlement->payment_reference ?? 'N/A',
                'notes' => $settlement->notes,
                'created_by' => $settlement->creator?->name ?? 'Administrator',
                'bills_count' => $billsBreakdown->count() > 0 ? $billsBreakdown->count() : $settlement->patients_seen,
                'gross_collected_formatted' => Bill::formatLKR($settlement->gross_collected, true),
                'doctor_payout_formatted' => Bill::formatLKR($settlement->doctor_payout_amount, true),
                'clinic_amount_formatted' => $hideClinicShare ? null : Bill::formatLKR($settlement->clinic_amount, true),
                'paid_amount_formatted' => Bill::formatLKR($settlement->paid_amount, true),
                'adjustments_total_formatted' => Bill::formatLKR($settlement->adjustments_total, true),
            ],
            'doctor' => [
                'id' => $settlement->doctor_id,
                'name' => trim(($settlement->doctor?->title ?? 'Dr.').' '.($settlement->doctor?->name ?? 'Doctor')),
                'specialty' => $settlement->doctor?->specialty ?? 'General Practitioner',
                'qualification' => $settlement->doctor?->qualification ?? '',
            ],
            'bills' => $billsBreakdown,
            'adjustments' => $adjustmentsBreakdown,
        ]);
    }

    /**
     * CSV Export for Doctor Payouts sessions and settlements.
     */
    public function export(Request $request): StreamedResponse
    {
        $tenant = tenant();
        $startDate = $request->query('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', now()->endOfMonth()->toDateString());
        $doctorId = $request->query('doctor_id');

        $query = DoctorSession::with(['doctor', 'tokens.bill'])
            ->where('tenant_id', $tenant->id)
            ->whereBetween('session_date', [$startDate, $endDate]);

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        $sessions = $query->orderBy('session_date')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"doctor_payouts_{$startDate}_to_{$endDate}.csv\"",
        ];

        return response()->stream(function () use ($sessions) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Session ID',
                'Date',
                'Start Time',
                'Doctor Name',
                'Specialty',
                'Status',
                'Patients Seen',
                'Paid Patients',
                'Consultation Gross (LKR)',
                'Doctor Share (LKR)',
                'Clinic Share (LKR)',
                'Settlement Status',
            ]);

            foreach ($sessions as $s) {
                $fin = $this->payoutService->calculateSessionFinancials($s);
                fputcsv($handle, [
                    $s->id,
                    $fin['session_date_raw'],
                    $fin['start_time'],
                    $fin['doctor_name'],
                    $s->doctor?->specialty ?? '',
                    $fin['session_status'],
                    $fin['patients_seen'],
                    $fin['paid_patients'],
                    $fin['consultation_gross_lkr'],
                    $fin['doctor_share_lkr'],
                    $fin['clinic_share_lkr'],
                    $fin['settlement_status'],
                ]);
            }

            fclose($handle);
        }, 200, $headers);
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

        return redirect()->back()->with('success', "Payment of Rs. {$validated['payment_amount_lkr']} recorded for settlement {$settlement->settlement_number}.");
    }
}
