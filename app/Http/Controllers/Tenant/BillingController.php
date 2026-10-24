<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Bill;
use App\Models\Doctor;
use App\Services\Billing\BillCalculator;
use App\Services\SequenceService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BillingController extends Controller
{
    public function __construct(
        protected SequenceService $sequenceService,
        protected BillCalculator $billCalculator,
    ) {}

    /**
     * Display the Billing & Collections workspace.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isClinicAdmin = $user && ($user->hasRole('clinic_admin') || $user->hasRole('super_admin'));
        $isDoctor = $user && $user->hasRole('doctor') && ! $isClinicAdmin;
        $isReceptionist = $user && $user->hasRole('receptionist') && ! $isClinicAdmin;

        // Financial figure visibility
        $canViewFinancials = $isClinicAdmin || $isDoctor || $isReceptionist;
        $canCollect = $isClinicAdmin || $isReceptionist;
        $canRefund = $isClinicAdmin;
        $canExport = $isClinicAdmin;

        // Resolve Date Range (default: Today in Asia/Colombo)
        $rangePreset = $request->query('range', 'today');
        $tz = 'Asia/Colombo';
        $today = Carbon::today($tz);

        if ($request->filled('date')) {
            $startDate = Carbon::parse($request->query('date'), $tz)->startOfDay();
            $endDate = Carbon::parse($request->query('date'), $tz)->endOfDay();
            $rangePreset = 'custom';
        } elseif ($rangePreset === 'yesterday') {
            $startDate = $today->copy()->subDay()->startOfDay();
            $endDate = $today->copy()->subDay()->endOfDay();
        } elseif ($rangePreset === 'this_week') {
            $startDate = $today->copy()->startOfWeek()->startOfDay();
            $endDate = $today->copy()->endOfWeek()->endOfDay();
        } elseif ($rangePreset === 'this_month') {
            $startDate = $today->copy()->startOfMonth()->startOfDay();
            $endDate = $today->copy()->endOfMonth()->endOfDay();
        } elseif ($rangePreset === 'custom' && $request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->query('start_date'), $tz)->startOfDay();
            $endDate = Carbon::parse($request->query('end_date'), $tz)->endOfDay();
        } else {
            // 'today' default
            $rangePreset = 'today';
            $startDate = $today->copy()->startOfDay();
            $endDate = $today->copy()->endOfDay();
        }

        // Previous period of equal length for comparison
        $daysCount = max(1, $startDate->diffInDays($endDate) + 1);
        $prevEndDate = $startDate->copy()->subSecond();
        $prevStartDate = $prevEndDate->copy()->subDays($daysCount)->addSecond()->startOfDay();

        // 1. Pending Bills (patients awaiting payment collection)
        $pendingBills = Bill::with(['token.session.doctor', 'patient', 'doctor', 'items'])
            ->where('payment_status', Bill::STATUS_PENDING)
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn ($b) => $this->transformBill($b, $canViewFinancials));

        // 2. Query Processed Receipts with filters and search
        $receiptsQuery = Bill::with(['token.session.doctor', 'patient', 'doctor', 'items'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('payment_status', [Bill::STATUS_PAID, Bill::STATUS_REFUNDED]);

        // Filter: Doctor
        if ($request->filled('doctor_id')) {
            $receiptsQuery->where('doctor_id', $request->query('doctor_id'));
        }

        // Filter: Payment Method
        if ($request->filled('method')) {
            $receiptsQuery->where('payment_method', $request->query('method'));
        }

        // Filter: Status (paid vs refunded)
        if ($request->filled('status')) {
            $receiptsQuery->where('payment_status', $request->query('status'));
        }

        // Search: Receipt number, Patient name, Phone, Token number
        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $receiptsQuery->where(function ($q) use ($search) {
                $q->where('receipt_number', 'ILIKE', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('name', 'ILIKE', "%{$search}%")
                            ->orWhere('phone', 'ILIKE', "%{$search}%")
                            ->orWhere('phone_normalized', 'ILIKE', "%{$search}%");
                    })
                    ->orWhereHas('token', function ($tq) use ($search) {
                        $tq->where('token_number', (int) $search);
                    });
            });
        }

        // Calculate Totals for the filtered receipts set
        $filteredReceipts = (clone $receiptsQuery)->get();
        $filteredPaidTotal = (int) $filteredReceipts->where('payment_status', Bill::STATUS_PAID)->sum('total_amount');
        $filteredDoctorShare = (int) $filteredReceipts->where('payment_status', Bill::STATUS_PAID)->sum('doctor_fee');
        $filteredClinicShare = (int) $filteredReceipts->where('payment_status', Bill::STATUS_PAID)->sum('clinic_fee');
        $filteredDiscount = (int) $filteredReceipts->where('payment_status', Bill::STATUS_PAID)->sum('discount');
        $filteredRefund = (int) $filteredReceipts->where('payment_status', Bill::STATUS_REFUNDED)->sum('total_amount');

        $filteredTotals = [
            'count' => $filteredReceipts->count(),
            'total_amount_lkr' => round($filteredPaidTotal / 100, 2),
            'total_amount_formatted' => Bill::formatLKR($filteredPaidTotal, true),
            'doctor_share_lkr' => round($filteredDoctorShare / 100, 2),
            'doctor_share_formatted' => Bill::formatLKR($filteredDoctorShare, true),
            'clinic_share_lkr' => round($filteredClinicShare / 100, 2),
            'clinic_share_formatted' => Bill::formatLKR($filteredClinicShare, true),
            'discount_lkr' => round($filteredDiscount / 100, 2),
            'discount_formatted' => Bill::formatLKR($filteredDiscount, true),
            'refund_lkr' => round($filteredRefund / 100, 2),
            'refund_formatted' => Bill::formatLKR($filteredRefund, true),
        ];

        // Sort Receipts
        $sort = $request->query('sort', 'newest');
        match ($sort) {
            'oldest' => $receiptsQuery->oldest('created_at'),
            'amount_high' => $receiptsQuery->orderByDesc('total_amount'),
            'amount_low' => $receiptsQuery->orderBy('total_amount'),
            default => $receiptsQuery->latest('created_at'),
        };

        $perPage = min(100, max(10, (int) $request->query('per_page', 25)));
        $paginatedReceipts = $receiptsQuery->paginate($perPage)->withQueryString();

        // 3. KPI Aggregations for the Selected Range
        $allRangeBills = Bill::whereBetween('created_at', [$startDate, $endDate])->get();
        $paidBills = $allRangeBills->where('payment_status', Bill::STATUS_PAID);
        $refundedBills = $allRangeBills->where('payment_status', Bill::STATUS_REFUNDED);

        $grossDoctorFeeCents = (int) $paidBills->sum('doctor_fee');
        $grossClinicFeeCents = (int) $paidBills->sum('clinic_fee');
        $totalDiscountCents = (int) $paidBills->sum('discount');
        $totalRefundCents = (int) $refundedBills->sum('total_amount');
        $netCollectedCents = (int) $paidBills->sum('total_amount');

        // Previous Period Collections (for % change indicator)
        $prevPeriodCollectedCents = (int) Bill::whereBetween('created_at', [$prevStartDate, $prevEndDate])
            ->where('payment_status', Bill::STATUS_PAID)
            ->sum('total_amount');

        $vsPreviousPct = null;
        if ($prevPeriodCollectedCents > 0) {
            $vsPreviousPct = round((($netCollectedCents - $prevPeriodCollectedCents) / $prevPeriodCollectedCents) * 100, 1);
        } elseif ($netCollectedCents > 0) {
            $vsPreviousPct = 100.0;
        }

        // Mini split bar totals by payment method
        $cashTotalCents = (int) $paidBills->where('payment_method', Bill::METHOD_CASH)->sum('total_amount');
        $cardTotalCents = (int) $paidBills->where('payment_method', Bill::METHOD_CARD)->sum('total_amount');
        $bankTotalCents = (int) $paidBills->where('payment_method', Bill::METHOD_BANK_TRANSFER)->sum('total_amount');
        $totalMethodCents = max(1, $cashTotalCents + $cardTotalCents + $bankTotalCents);

        $paymentMethodsSplit = [
            'cash' => [
                'count' => $paidBills->where('payment_method', Bill::METHOD_CASH)->count(),
                'total_cents' => $cashTotalCents,
                'total_lkr' => round($cashTotalCents / 100, 2),
                'total_formatted' => Bill::formatLKR($cashTotalCents, true),
                'percentage' => round(($cashTotalCents / $totalMethodCents) * 100, 1),
            ],
            'card' => [
                'count' => $paidBills->where('payment_method', Bill::METHOD_CARD)->count(),
                'total_cents' => $cardTotalCents,
                'total_lkr' => round($cardTotalCents / 100, 2),
                'total_formatted' => Bill::formatLKR($cardTotalCents, true),
                'percentage' => round(($cardTotalCents / $totalMethodCents) * 100, 1),
            ],
            'bank_transfer' => [
                'count' => $paidBills->where('payment_method', Bill::METHOD_BANK_TRANSFER)->count(),
                'total_cents' => $bankTotalCents,
                'total_lkr' => round($bankTotalCents / 100, 2),
                'total_formatted' => Bill::formatLKR($bankTotalCents, true),
                'percentage' => round(($bankTotalCents / $totalMethodCents) * 100, 1),
            ],
        ];

        // 4. Hourly Collections for Bar Chart (08:00 to 20:00)
        $hourlyBuckets = [];
        for ($h = 8; $h <= 20; $h++) {
            $hourlyBuckets[sprintf('%02d:00', $h)] = [
                'hour' => sprintf('%02d:00', $h),
                'label' => Carbon::createFromTime($h, 0, 0)->format('g A'),
                'amount_cents' => 0,
                'amount_lkr' => 0,
                'count' => 0,
            ];
        }

        foreach ($paidBills as $pb) {
            $billTime = $pb->created_at->timezone($tz);
            $hourKey = $billTime->format('H:00');
            if (isset($hourlyBuckets[$hourKey])) {
                $hourlyBuckets[$hourKey]['amount_cents'] += (int) $pb->total_amount;
                $hourlyBuckets[$hourKey]['count']++;
            }
        }

        foreach ($hourlyBuckets as $k => $v) {
            $hourlyBuckets[$k]['amount_lkr'] = round($v['amount_cents'] / 100, 2);
            $hourlyBuckets[$k]['amount_formatted'] = Bill::formatLKR($v['amount_cents'], true);
        }

        // 5. Breakdown by Doctor
        $doctorsSummary = $paidBills->groupBy('doctor_id')->map(function ($billsForDoc) {
            $firstBill = $billsForDoc->first();
            $doc = $firstBill->doctor ?? $firstBill->token?->session?->doctor;
            $docName = $doc ? trim(($doc->title ?? 'Dr.').' '.$doc->name) : 'Specialist Consultation';
            $docTotalCents = (int) $billsForDoc->sum('total_amount');
            $docFeeCents = (int) $billsForDoc->sum('doctor_fee');
            $clinicFeeCents = (int) $billsForDoc->sum('clinic_fee');

            return [
                'doctor_id' => $firstBill->doctor_id,
                'doctor_name' => $docName,
                'consultations_count' => $billsForDoc->count(),
                'doctor_fee_total_cents' => $docFeeCents,
                'doctor_fee_total_lkr' => round($docFeeCents / 100, 2),
                'doctor_fee_formatted' => Bill::formatLKR($docFeeCents, true),
                'clinic_fee_total_cents' => $clinicFeeCents,
                'clinic_fee_total_lkr' => round($clinicFeeCents / 100, 2),
                'clinic_fee_formatted' => Bill::formatLKR($clinicFeeCents, true),
                'total_cents' => $docTotalCents,
                'total_lkr' => round($docTotalCents / 100, 2),
                'total_formatted' => Bill::formatLKR($docTotalCents, true),
            ];
        })->values()->all();

        // Doctors List for Filter Dropdown
        $doctorsList = Doctor::where('tenant_id', tenant('id'))
            ->orderBy('name')
            ->get(['id', 'name', 'title', 'specialty'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty ?? 'General',
            ]);

        $kpis = [
            'collected_cents' => $canViewFinancials ? $netCollectedCents : 0,
            'collected_lkr' => $canViewFinancials ? round($netCollectedCents / 100, 2) : 0,
            'collected_formatted' => $canViewFinancials ? Bill::formatLKR($netCollectedCents, true) : '—',
            'vs_previous_percentage' => $vsPreviousPct,
            'doctor_share_cents' => $canViewFinancials ? $grossDoctorFeeCents : 0,
            'doctor_share_lkr' => $canViewFinancials ? round($grossDoctorFeeCents / 100, 2) : 0,
            'doctor_share_formatted' => $canViewFinancials ? Bill::formatLKR($grossDoctorFeeCents, true) : '—',
            'clinic_share_cents' => $canViewFinancials ? $grossClinicFeeCents : 0,
            'clinic_share_lkr' => $canViewFinancials ? round($grossClinicFeeCents / 100, 2) : 0,
            'clinic_share_formatted' => $canViewFinancials ? Bill::formatLKR($grossClinicFeeCents, true) : '—',
            'discount_cents' => $canViewFinancials ? $totalDiscountCents : 0,
            'discount_lkr' => $canViewFinancials ? round($totalDiscountCents / 100, 2) : 0,
            'discount_formatted' => $canViewFinancials ? Bill::formatLKR($totalDiscountCents, true) : '—',
            'refund_cents' => $canViewFinancials ? $totalRefundCents : 0,
            'refund_lkr' => $canViewFinancials ? round($totalRefundCents / 100, 2) : 0,
            'refund_formatted' => $canViewFinancials ? Bill::formatLKR($totalRefundCents, true) : '—',
            'methods_split' => $paymentMethodsSplit,
        ];

        // Format dates in Sri Lanka standard "23 Oct 2026"
        $reportMeta = [
            'range_preset' => $rangePreset,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'start_date_formatted' => $startDate->format('d M Y'),
            'end_date_formatted' => $endDate->format('d M Y'),
            'display_label' => $startDate->toDateString() === $endDate->toDateString()
                ? $startDate->format('d M Y')
                : $startDate->format('d M Y').' – '.$endDate->format('d M Y'),
            'payment_methods' => $paymentMethodsSplit,
            'hourly_chart' => array_values($hourlyBuckets),
            'doctors_summary' => $doctorsSummary,
            'cash_drawer' => [
                'status' => 'not_configured',
                'message' => 'No active cash drawer hardware or cash session close-out configured.',
            ],
        ];

        $clinicInfo = [
            'name' => ucwords((string) (tenant('name') ?? 'MedVisit Clinic')),
            'phone' => tenant('phone') ?? '+94 11 234 5678',
            'address' => tenant('address') ?? 'Colombo, Sri Lanka',
            'reg_no' => tenant('reg_no') ?? 'PV-89421',
        ];

        return Inertia::render('Billing/Index', [
            'pendingBills' => $pendingBills,
            'recentReceipts' => $paginatedReceipts->through(fn ($b) => $this->transformBill($b, $canViewFinancials)),
            'kpis' => $kpis,
            'report' => $reportMeta,
            'filteredTotals' => $filteredTotals,
            'doctorsList' => $doctorsList,
            'clinicInfo' => $clinicInfo,
            'permissions' => [
                'can_view_financials' => $canViewFinancials,
                'can_collect' => $canCollect,
                'can_refund' => $canRefund,
                'can_export' => $canExport,
            ],
            'filters' => [
                'range' => $rangePreset,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'search' => $request->query('search', ''),
                'doctor_id' => $request->query('doctor_id', ''),
                'method' => $request->query('method', ''),
                'status' => $request->query('status', ''),
                'sort' => $sort,
            ],
        ]);
    }

    /**
     * Process payment collection for a bill.
     * Guaranteed gapless sequential receipt number inside the DB transaction.
     */
    public function pay(Request $request, Bill $bill): RedirectResponse
    {
        $user = $request->user();
        if (! ($user && ($user->hasRole('clinic_admin') || $user->hasRole('receptionist') || $user->hasRole('super_admin')))) {
            abort(403, 'Unauthorized to collect payments.');
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer'],
            'discount_lkr' => ['nullable', 'numeric', 'min:0'],
            'discount_reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $discountCents = ! empty($validated['discount_lkr']) ? (int) round($validated['discount_lkr'] * 100) : 0;
        $medicinesTotal = (int) $bill->items()->sum('total_price_cents');
        $subtotalCents = (int) $bill->doctor_fee + (int) $bill->clinic_fee + (int) $bill->other_fee + $medicinesTotal;
        $totalAmountCents = max(0, $subtotalCents - $discountCents);

        DB::transaction(function () use ($bill, $validated, $discountCents, $totalAmountCents, $user) {
            // Assign dedicated, gapless sequence number inside the transaction if not already assigned
            $receiptNumber = $bill->receipt_number;
            if (! $receiptNumber || ! str_starts_with($receiptNumber, 'REC-') || str_contains($receiptNumber, 'PENDING') || str_contains($receiptNumber, 'DRAFT')) {
                $receiptNumber = $this->sequenceService->nextReceiptNumber($bill->tenant_id);
            }

            $bill->update([
                'receipt_number' => $receiptNumber,
                'payment_method' => $validated['payment_method'],
                'payment_status' => Bill::STATUS_PAID,
                'discount' => $discountCents,
                'discount_reason' => $discountCents > 0 ? ($validated['discount_reason'] ?? 'Staff / authorized discount') : null,
                'total_amount' => $totalAmountCents,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Audit log payment
            AuditEvent::create([
                'tenant_id' => $bill->tenant_id,
                'user_id' => $user->id,
                'action' => 'billing.payment_collected',
                'resource_type' => 'bill',
                'resource_id' => (string) $bill->id,
                'metadata' => [
                    'receipt_number' => $receiptNumber,
                    'patient_id' => $bill->patient_id,
                    'payment_method' => $validated['payment_method'],
                    'total_amount_cents' => $totalAmountCents,
                    'discount_cents' => $discountCents,
                ],
            ]);
        });

        return redirect()->back()->with('success', "Receipt {$bill->receipt_number} generated. Payment collected successfully.");
    }

    /**
     * Refund a paid bill (e.g. cancelled doctor session).
     */
    public function refund(Request $request, Bill $bill): RedirectResponse
    {
        $user = $request->user();
        if (! ($user && ($user->hasRole('clinic_admin') || $user->hasRole('super_admin')))) {
            abort(403, 'Unauthorized to process refunds.');
        }

        $validated = $request->validate([
            'refund_reason' => ['required', 'string', 'max:255'],
        ]);

        $bill->update([
            'payment_status' => Bill::STATUS_REFUNDED,
            'refunded_at' => now(),
            'refund_reason' => $validated['refund_reason'],
        ]);

        AuditEvent::create([
            'tenant_id' => $bill->tenant_id,
            'user_id' => $user->id,
            'action' => 'billing.refunded',
            'resource_type' => 'bill',
            'resource_id' => (string) $bill->id,
            'metadata' => [
                'receipt_number' => $bill->receipt_number,
                'refund_amount_cents' => $bill->total_amount,
                'reason' => $validated['refund_reason'],
            ],
        ]);

        return redirect()->back()->with('success', "Receipt {$bill->receipt_number} has been refunded.");
    }

    /**
     * Export billing receipts for the selected range to CSV.
     * Permission-gated to clinic_admin/super_admin and audit-logged.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        if (! ($user && ($user->hasRole('clinic_admin') || $user->hasRole('super_admin')))) {
            abort(403, 'Unauthorized to export billing data.');
        }

        $tz = 'Asia/Colombo';
        $today = Carbon::today($tz);
        $startDate = $request->filled('start_date') ? Carbon::parse($request->query('start_date'), $tz)->startOfDay() : $today->copy()->startOfDay();
        $endDate = $request->filled('end_date') ? Carbon::parse($request->query('end_date'), $tz)->endOfDay() : $today->copy()->endOfDay();

        // Audit log export action
        AuditEvent::create([
            'tenant_id' => tenant('id'),
            'user_id' => $user->id,
            'action' => 'billing.exported',
            'resource_type' => 'billing_export',
            'resource_id' => tenant('id'),
            'metadata' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'ip_address' => $request->ip(),
            ],
        ]);

        $bills = Bill::with(['patient', 'doctor', 'token'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('payment_status', [Bill::STATUS_PAID, Bill::STATUS_REFUNDED])
            ->latest('created_at')
            ->get();

        $filename = 'billing-receipts-'.$startDate->format('Ymd').'-'.$endDate->format('Ymd').'.csv';

        return response()->streamDownload(function () use ($bills, $tz) {
            $handle = fopen('php://output', 'w');
            // Add UTF-8 BOM
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Receipt Number',
                'Date & Time (Asia/Colombo)',
                'Token Number',
                'Patient Name',
                'Patient Phone',
                'Doctor Name',
                'Doctor Fee (LKR)',
                'Clinic Fee (LKR)',
                'Discount (LKR)',
                'Total Paid (LKR)',
                'Payment Method',
                'Status',
                'Refund Reason',
            ]);

            foreach ($bills as $b) {
                $doc = $b->doctor ?? $b->token?->session?->doctor;
                $docName = $doc ? trim(($doc->title ?? 'Dr.').' '.$doc->name) : 'Specialist';

                fputcsv($handle, [
                    $b->receipt_number ?? '—',
                    $b->created_at->timezone($tz)->format('Y-m-d H:i:s'),
                    $b->token?->token_number ? '#'.$b->token->token_number : '—',
                    $b->patient?->name ?? 'Walk-in',
                    $b->patient?->phone ?? '—',
                    $docName,
                    number_format($b->doctor_fee / 100, 2, '.', ''),
                    number_format($b->clinic_fee / 100, 2, '.', ''),
                    number_format($b->discount / 100, 2, '.', ''),
                    number_format($b->total_amount / 100, 2, '.', ''),
                    ucfirst(str_replace('_', ' ', (string) $b->payment_method)),
                    ucfirst((string) $b->payment_status),
                    $b->refund_reason ?? '',
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Transform a Bill model into structured frontend representation.
     */
    protected function transformBill(Bill $b, bool $canViewFinancials): array
    {
        $tz = 'Asia/Colombo';
        $doc = $b->doctor ?? $b->token?->session?->doctor;
        $docName = $doc ? trim(($doc->title ?? 'Dr.').' '.$doc->name) : 'Specialist Consultation';
        $specialty = $doc?->specialty ?? 'General';
        $snapshot = $b->fee_snapshot ?? $b->token?->fee_snapshot;

        $docFeeCents = (int) $b->doctor_fee;
        $clinicFeeCents = (int) $b->clinic_fee;
        $otherFeeCents = (int) $b->other_fee;
        $discountCents = (int) $b->discount;
        $totalCents = (int) $b->total_amount;
        $docPayoutCents = (int) ($b->doctor_payout_amount ?: ($snapshot['doctor_payout_amount'] ?? 0));
        $clinicNetCents = (int) ($b->clinic_net_amount ?: ($snapshot['clinic_net_amount'] ?? 0));

        return [
            'id' => $b->id,
            'receipt_number' => $b->receipt_number,
            'token_number' => $b->token?->token_number,
            'token_id' => $b->booking_token_id,
            'patient_id' => $b->patient_id,
            'patient_name' => $b->patient?->name ?? 'Walk-in Patient',
            'patient_phone' => $b->patient?->phone ?? '—',
            'doctor_id' => $b->doctor_id,
            'doctor_name' => $docName,
            'doctor_specialty' => $specialty,
            'visit_type_name' => $b->visitType?->name ?? ($snapshot['visit_type']['name'] ?? 'Consultation'),
            'session_date' => $b->token?->session?->session_date?->timezone($tz)->format('d M Y') ?? '—',
            'room_number' => $b->token?->session?->room_number ?? 'Suite 1',
            'doctor_fee_cents' => $canViewFinancials ? $docFeeCents : 0,
            'doctor_fee_lkr' => $canViewFinancials ? round($docFeeCents / 100, 2) : 0,
            'doctor_fee_formatted' => $canViewFinancials ? Bill::formatLKR($docFeeCents, true) : '—',
            'clinic_fee_cents' => $canViewFinancials ? $clinicFeeCents : 0,
            'clinic_fee_lkr' => $canViewFinancials ? round($clinicFeeCents / 100, 2) : 0,
            'clinic_fee_formatted' => $canViewFinancials ? Bill::formatLKR($clinicFeeCents, true) : '—',
            'other_fee_cents' => $canViewFinancials ? $otherFeeCents : 0,
            'other_fee_lkr' => $canViewFinancials ? round($otherFeeCents / 100, 2) : 0,
            'discount_cents' => $canViewFinancials ? $discountCents : 0,
            'discount_lkr' => $canViewFinancials ? round($discountCents / 100, 2) : 0,
            'discount_formatted' => $canViewFinancials ? Bill::formatLKR($discountCents, true) : '—',
            'discount_reason' => $b->discount_reason,
            'total_amount_cents' => $canViewFinancials ? $totalCents : 0,
            'total_amount_lkr' => $canViewFinancials ? round($totalCents / 100, 2) : 0,
            'total_amount_formatted' => $canViewFinancials ? Bill::formatLKR($totalCents, true) : '—',
            'doctor_payout_amount_lkr' => $canViewFinancials ? round($docPayoutCents / 100, 2) : 0,
            'clinic_net_amount_lkr' => $canViewFinancials ? round($clinicNetCents / 100, 2) : 0,
            'payment_method' => $b->payment_method ?? 'cash',
            'payment_status' => $b->payment_status ?? Bill::STATUS_PENDING,
            'refund_reason' => $b->refund_reason,
            'refunded_at' => $b->refunded_at?->timezone($tz)->format('d M Y, h:i A'),
            'created_at_date' => $b->created_at->timezone($tz)->format('d M Y'),
            'created_at_time' => $b->created_at->timezone($tz)->format('h:i A'),
            'created_at_formatted' => $b->created_at->timezone($tz)->format('d M Y, h:i A'),
            'receipt_lines' => $this->billCalculator->formatCombinedReceiptLines($b),
            'bill_items' => $b->items->map(fn ($item) => [
                'id' => $item->id,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price_cents' => $item->unit_price_cents,
                'total_price_cents' => $item->total_price_cents,
                'unit_price_lkr' => round($item->unit_price_cents / 100, 2),
                'total_price_lkr' => round($item->total_price_cents / 100, 2),
                'unit_price_formatted' => Bill::formatLKR($item->unit_price_cents, true),
                'total_price_formatted' => Bill::formatLKR($item->total_price_cents, true),
            ]),
        ];
    }
}
