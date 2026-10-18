<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\Doctor;
use App\Services\Billing\BillCalculator;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    /**
     * Display the Billing & Collections workspace.
     */
    public function index(Request $request): Response
    {
        $selectedDate = $request->query('date') ? Carbon::parse($request->query('date'))->toDateString() : Carbon::today('Asia/Colombo')->toDateString();

        // 1. Pending Bills (patients who haven't paid yet)
        $pendingBills = Bill::with(['token.session.doctor', 'patient', 'doctor'])
            ->where('payment_status', 'pending')
            ->latest('id')
            ->limit(30)
            ->get()
            ->map(fn ($b) => $this->transformBill($b));

        // 2. Paid / Processed Bills for selected date
        $recentReceipts = Bill::with(['token.session.doctor', 'patient', 'doctor'])
            ->whereDate('updated_at', $selectedDate)
            ->whereIn('payment_status', ['paid', 'refunded'])
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(fn ($b) => $this->transformBill($b));

        // 3. Daily Collections Report Aggregations for selected date
        $paidBills = Bill::with(['doctor'])
            ->whereDate('updated_at', $selectedDate)
            ->where('payment_status', 'paid')
            ->get();

        $refundedBills = Bill::whereDate('refunded_at', $selectedDate)
            ->where('payment_status', 'refunded')
            ->get();

        $grossDoctorFeeCents = (int) $paidBills->sum('doctor_fee');
        $grossClinicFeeCents = (int) $paidBills->sum('clinic_fee');
        $totalDiscountCents = (int) $paidBills->sum('discount');
        $totalRefundCents = (int) $refundedBills->sum('total_amount');
        $netCollectedCents = (int) $paidBills->sum('total_amount');

        // Breakdown by payment method
        $paymentMethods = [
            'cash' => [
                'count' => $paidBills->where('payment_method', 'cash')->count(),
                'total_lkr' => round($paidBills->where('payment_method', 'cash')->sum('total_amount') / 100, 2),
            ],
            'card' => [
                'count' => $paidBills->where('payment_method', 'card')->count(),
                'total_lkr' => round($paidBills->where('payment_method', 'card')->sum('total_amount') / 100, 2),
            ],
            'bank_transfer' => [
                'count' => $paidBills->where('payment_method', 'bank_transfer')->count(),
                'total_lkr' => round($paidBills->where('payment_method', 'bank_transfer')->sum('total_amount') / 100, 2),
            ],
        ];

        // Breakdown by Doctor
        $doctorsSummary = $paidBills->groupBy('doctor_id')->map(function ($billsForDoc) {
            $firstBill = $billsForDoc->first();
            $docName = $firstBill->doctor ? trim(($firstBill->doctor->title ?? 'Dr.').' '.$firstBill->doctor->name) : 'Clinic Consultation';

            return [
                'doctor_id' => $firstBill->doctor_id,
                'doctor_name' => $docName,
                'consultations_count' => $billsForDoc->count(),
                'doctor_fee_total_lkr' => round($billsForDoc->sum('doctor_fee') / 100, 2),
                'clinic_fee_total_lkr' => round($billsForDoc->sum('clinic_fee') / 100, 2),
                'total_lkr' => round($billsForDoc->sum('total_amount') / 100, 2),
            ];
        })->values()->all();

        $report = [
            'date' => $selectedDate,
            'date_formatted' => Carbon::parse($selectedDate)->format('M d, Y (l)'),
            'gross_doctor_fee_lkr' => round($grossDoctorFeeCents / 100, 2),
            'gross_clinic_fee_lkr' => round($grossClinicFeeCents / 100, 2),
            'total_discount_lkr' => round($totalDiscountCents / 100, 2),
            'total_refund_lkr' => round($totalRefundCents / 100, 2),
            'net_collected_lkr' => round($netCollectedCents / 100, 2),
            'net_collected_formatted' => 'Rs. '.number_format($netCollectedCents / 100, 2),
            'payment_methods' => $paymentMethods,
            'doctors_summary' => $doctorsSummary,
        ];

        // Clinic details
        $clinicInfo = [
            'name' => ucwords((string) (tenant('name') ?? 'MedVisit Clinic')),
            'phone' => tenant('phone') ?? '+94 11 234 5678',
            'address' => tenant('address') ?? 'Colombo, Sri Lanka',
            'reg_no' => tenant('reg_no') ?? 'PV-89421',
        ];

        return Inertia::render('Billing/Index', [
            'pendingBills' => $pendingBills,
            'recentReceipts' => $recentReceipts,
            'report' => $report,
            'selectedDate' => $selectedDate,
            'clinicInfo' => $clinicInfo,
        ]);
    }

    /**
     * Process payment collection for a bill.
     */
    public function pay(Request $request, Bill $bill): RedirectResponse
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer'],
            'discount_lkr' => ['nullable', 'numeric', 'min:0'],
            'discount_reason' => ['required_if_accepted:has_discount', 'nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $discountCents = ! empty($validated['discount_lkr']) ? (int) round($validated['discount_lkr'] * 100) : 0;
        $subtotalCents = $bill->doctor_fee + $bill->clinic_fee + $bill->other_fee;
        $totalAmountCents = max(0, $subtotalCents - $discountCents);

        $bill->update([
            'payment_method' => $validated['payment_method'],
            'payment_status' => Bill::STATUS_PAID,
            'discount' => $discountCents,
            'discount_reason' => $discountCents > 0 ? ($validated['discount_reason'] ?? 'Staff/Senior citizen discount') : null,
            'total_amount' => $totalAmountCents,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', "Receipt {$bill->receipt_number} generated. Payment collected via {$validated['payment_method']}.");
    }

    /**
     * Refund a paid bill (e.g. cancelled doctor session).
     */
    public function refund(Request $request, Bill $bill): RedirectResponse
    {
        $validated = $request->validate([
            'refund_reason' => ['required', 'string', 'max:255'],
        ]);

        $bill->update([
            'payment_status' => Bill::STATUS_REFUNDED,
            'refunded_at' => now(),
            'refund_reason' => $validated['refund_reason'],
        ]);

        return redirect()->back()->with('success', "Bill {$bill->receipt_number} has been refunded.");
    }

    /**
     * Format a bill object for frontend display.
     */
    protected function transformBill(Bill $b): array
    {
        $doc = $b->doctor ?? $b->token?->session?->doctor;
        $docName = $doc ? trim(($doc->title ?? 'Dr.').' '.$doc->name) : 'Specialist';
        $specialty = $doc?->specialty ?? 'General';
        $snapshot = $b->fee_snapshot ?? $b->token?->fee_snapshot;

        return [
            'id' => $b->id,
            'receipt_number' => $b->receipt_number,
            'token_number' => $b->token?->token_number,
            'token_id' => $b->booking_token_id,
            'patient_id' => $b->patient_id,
            'patient_name' => $b->patient?->name ?? 'Walk-in Patient',
            'patient_phone' => $b->patient?->phone ?? '—',
            'doctor_name' => $docName,
            'doctor_specialty' => $specialty,
            'visit_type_name' => $b->visitType?->name ?? ($snapshot['visit_type']['name'] ?? 'Consultation'),
            'session_date' => $b->token?->session?->session_date?->format('M d, Y') ?? '—',
            'room_number' => $b->token?->session?->room_number ?? 'Suite 1',
            'doctor_fee_lkr' => round($b->doctor_fee / 100, 2),
            'clinic_fee_lkr' => round($b->clinic_fee / 100, 2),
            'other_fee_lkr' => round($b->other_fee / 100, 2),
            'discount_lkr' => round($b->discount / 100, 2),
            'discount_reason' => $b->discount_reason,
            'total_amount_lkr' => round($b->total_amount / 100, 2),
            'total_amount_formatted' => 'Rs. '.number_format($b->total_amount / 100, 2),
            'doctor_payout_amount_lkr' => round(($b->doctor_payout_amount ?: ($snapshot['doctor_payout_amount'] ?? 0)) / 100, 2),
            'clinic_net_amount_lkr' => round(($b->clinic_net_amount ?: ($snapshot['clinic_net_amount'] ?? 0)) / 100, 2),
            'payment_method' => $b->payment_method,
            'payment_status' => $b->payment_status,
            'refund_reason' => $b->refund_reason,
            'refunded_at' => $b->refunded_at?->format('M d, Y h:i A'),
            'created_at_formatted' => $b->created_at->format('M d, Y h:i A'),
            'fee_snapshot' => $snapshot,
            'receipt_lines' => app(BillCalculator::class)->formatCombinedReceiptLines($b),
            'bill_items' => $b->items->map(fn ($item) => [
                'id' => $item->id,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price_lkr' => round($item->unit_price_cents / 100, 2),
                'total_price_lkr' => round($item->total_price_cents / 100, 2),
                'unit_price_formatted' => $item->formatted_unit_price,
                'total_price_formatted' => $item->formatted_total_price,
            ]),
        ];
    }
}
