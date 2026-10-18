<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\ClinicMedicine;
use App\Models\Prescription;
use App\Models\StockBatch;
use App\Services\Pharmacy\DispenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class DispenseController extends Controller
{
    public function __construct(
        protected DispenseService $dispenseService
    ) {}

    /**
     * Display the Pharmacist Dispense Queue (Mode a).
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;

        abort_unless(
            (bool) ($tenant->pharmacy_enabled ?? false),
            403,
            'Pharmacy module is currently disabled for this clinic.'
        );

        $search = trim((string) $request->input('search', ''));

        $query = Prescription::where('tenant_id', $tenantId)
            ->whereIn('status', [
                Prescription::STATUS_FINALIZED,
                Prescription::STATUS_PARTIALLY_DISPENSED,
            ])
            ->where('stock_reduction_mode', Prescription::MODE_DISPENSE)
            ->with(['patient', 'doctor', 'token', 'items'])
            ->latest('finalized_at');

        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(prescription_number) LIKE ?', [$term])
                    ->orWhereHas('patient', fn ($pq) => $pq->whereRaw('LOWER(name) LIKE ?', [$term])->orWhere('phone', 'LIKE', $term))
                    ->orWhereHas('doctor', fn ($dq) => $dq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        $prescriptions = $query->paginate(25)->withQueryString()->through(function ($p) {
            $clinicItemsCount = $p->items->where('source', 'clinic')->count();
            $outsideItemsCount = $p->items->where('source', 'outside')->count();

            return [
                'id' => $p->id,
                'prescription_number' => $p->prescription_number,
                'status' => $p->status,
                'token_id' => $p->booking_token_id,
                'token_number' => $p->token?->token_number,
                'patient_name' => $p->patient->name,
                'patient_phone' => $p->patient->phone,
                'doctor_name' => $p->doctor ? trim(($p->doctor->title ?? 'Dr.').' '.$p->doctor->name) : 'Doctor',
                'finalized_at' => $p->finalized_at?->format('h:i A'),
                'finalized_date' => $p->finalized_at?->format('d/m/Y'),
                'items_count' => $p->items->count(),
                'clinic_items_count' => $clinicItemsCount,
                'outside_items_count' => $outsideItemsCount,
            ];
        });

        return Inertia::render('Tenant/Pharmacy/Dispense/Index', [
            'prescriptions' => $prescriptions,
            'filters' => [
                'search' => $search,
            ],
            'mode' => $tenant->pharmacy_stock_reduction_mode ?? Prescription::MODE_DISPENSE,
        ]);
    }

    /**
     * Get review details and available FEFO batches for a prescription.
     */
    public function show(Prescription $prescription): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($prescription->tenant_id === $tenantId, 404);

        $prescription->load(['patient', 'doctor', 'token.bill', 'items.clinicMedicine.batches', 'items.variant.medicine']);
        $today = now()->toDateString();

        $items = $prescription->items->map(function ($it) use ($tenantId, $today) {
            $batches = [];
            $substituteOptions = [];
            $totalInStock = 0;

            if ($it->clinic_medicine_id) {
                // Fetch valid FEFO batches
                $rawBatches = StockBatch::where('tenant_id', $tenantId)
                    ->where('clinic_medicine_id', $it->clinic_medicine_id)
                    ->whereNull('voided_at')
                    ->where(function ($q) use ($today) {
                        $q->whereNull('expiry_date')
                            ->orWhere('expiry_date', '>=', $today);
                    })
                    ->where('quantity_remaining', '>', 0)
                    ->orderByRaw('expiry_date ASC NULLS LAST')
                    ->get();

                $totalInStock = (int) $rawBatches->sum('quantity_remaining');

                $batches = $rawBatches->map(fn ($b) => [
                    'id' => $b->id,
                    'batch_number' => $b->batch_number ?: 'N/A',
                    'expiry_date' => $b->expiry_date?->format('d/m/Y'),
                    'quantity_remaining' => (int) $b->quantity_remaining,
                    'cost_price_cents' => (int) $b->cost_price_cents,
                ]);

                // Same variant brand substitutions
                if ($it->medicine_variant_id) {
                    $substituteOptions = ClinicMedicine::where('tenant_id', $tenantId)
                        ->where('medicine_variant_id', $it->medicine_variant_id)
                        ->where('id', '!=', $it->clinic_medicine_id)
                        ->where('is_active', true)
                        ->get()
                        ->map(fn ($cm) => [
                            'id' => $cm->id,
                            'display_name' => $cm->display_name,
                            'total_quantity' => $cm->total_quantity,
                            'selling_price_cents' => $cm->selling_price_cents,
                        ]);
                }
            }

            return [
                'id' => $it->id,
                'display_name' => $it->display_name,
                'clinic_medicine_id' => $it->clinic_medicine_id,
                'medicine_variant_id' => $it->medicine_variant_id,
                'source' => $it->source,
                'dose' => $it->dose_display,
                'frequency' => $it->frequency,
                'timing' => $it->timing,
                'duration_days' => $it->duration_days,
                'quantity' => $it->quantity,
                'dispensed_quantity' => $it->dispensed_quantity,
                'total_in_stock' => $totalInStock,
                'batches' => $batches,
                'substitute_options' => $substituteOptions,
                'instructions' => $it->instructions,
            ];
        });

        $bill = $prescription->token?->bill;

        return response()->json([
            'prescription' => [
                'id' => $prescription->id,
                'prescription_number' => $prescription->prescription_number,
                'status' => $prescription->status,
                'patient_name' => $prescription->patient->name,
                'patient_phone' => $prescription->patient->phone,
                'doctor_name' => $prescription->doctor ? trim(($prescription->doctor->title ?? 'Dr.').' '.$prescription->doctor->name) : 'Doctor',
                'finalized_at' => $prescription->finalized_at?->format('d/m/Y h:i A'),
                'is_paid' => $bill?->payment_status === Bill::STATUS_PAID,
                'bill_total_formatted' => $bill?->formatted_total,
            ],
            'items' => $items,
        ]);
    }

    /**
     * Confirm dispensing of a prescription.
     */
    public function confirm(Request $request, Prescription $prescription): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($prescription->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'overrides' => ['nullable', 'array'],
            'overrides.*.substituted_clinic_medicine_id' => ['nullable', 'integer'],
            'overrides.*.dispense_quantity' => ['nullable', 'integer', 'min:0'],
            'overrides.*.mark_outside' => ['nullable', 'boolean'],
            'overrides.*.batch_allocations' => ['nullable', 'array'],
            'overrides.*.batch_allocations.*.batch_id' => ['required', 'integer'],
            'overrides.*.batch_allocations.*.quantity' => ['required', 'integer', 'min:1'],
            'items' => ['nullable', 'array'],
            'items.*.prescription_item_id' => ['required_with:items', 'integer'],
            'items.*.quantity_to_dispense' => ['nullable', 'integer', 'min:0'],
            'items.*.substitute_clinic_medicine_id' => ['nullable', 'integer'],
            'items.*.mark_outside' => ['nullable', 'boolean'],
        ]);

        $overrides = [];
        if ($request->has('items') && is_array($request->input('items'))) {
            foreach ($request->input('items') as $it) {
                if (isset($it['prescription_item_id'])) {
                    $overrides[$it['prescription_item_id']] = [
                        'dispense_quantity' => $it['quantity_to_dispense'] ?? null,
                        'substituted_clinic_medicine_id' => $it['substitute_clinic_medicine_id'] ?? null,
                        'mark_outside' => $it['mark_outside'] ?? false,
                    ];
                }
            }
        } elseif ($request->has('overrides') && is_array($request->input('overrides'))) {
            $overrides = $request->input('overrides');
        }

        try {
            $this->dispenseService->dispensePrescription(
                $prescription,
                $request->user(),
                $tenantId,
                $overrides
            );

            return redirect()->back()->with('success', "Prescription {$prescription->prescription_number} dispensed successfully.");
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['dispense' => $e->getMessage()]);
        }
    }

    /**
     * Undo a dispensed prescription before bill payment.
     */
    public function undo(Request $request, Prescription $prescription): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($prescription->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $this->dispenseService->undoDispense(
                $prescription,
                $validated['reason'],
                $request->user(),
                $tenantId
            );

            return redirect()->back()->with('success', "Dispense for {$prescription->prescription_number} undone and stock reversed.");
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['undo' => $e->getMessage()]);
        }
    }

    /**
     * Display the historical log of dispensed prescriptions.
     */
    public function history(Request $request): Response
    {
        $tenantId = tenant('id');
        $search = trim((string) $request->input('search', ''));

        $query = Prescription::where('tenant_id', $tenantId)
            ->whereIn('status', [
                Prescription::STATUS_DISPENSED,
                Prescription::STATUS_PARTIALLY_DISPENSED,
            ])
            ->with(['patient', 'doctor', 'token.bill.items', 'items.itemBatches.batch'])
            ->latest('dispensed_at');

        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(prescription_number) LIKE ?', [$term])
                    ->orWhereHas('patient', fn ($pq) => $pq->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('doctor', fn ($dq) => $dq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        $dispensed = $query->paginate(25)->withQueryString()->through(function ($p) {
            $bill = $p->token?->bill;

            return [
                'id' => $p->id,
                'prescription_number' => $p->prescription_number,
                'status' => $p->status,
                'patient_name' => $p->patient->name,
                'patient_phone' => $p->patient->phone,
                'doctor_name' => $p->doctor ? trim(($p->doctor->title ?? 'Dr.').' '.$p->doctor->name) : 'Doctor',
                'dispensed_at' => $p->dispensed_at?->format('d/m/Y h:i A'),
                'is_paid' => $bill?->payment_status === Bill::STATUS_PAID,
                'payment_status' => $bill?->payment_status ?? 'pending',
                'total_amount_formatted' => $bill?->formatted_total ?? '—',
                'items_count' => $p->items->count(),
                'items' => $p->items->map(fn ($it) => [
                    'id' => $it->id,
                    'display_name' => $it->display_name,
                    'dispensed_quantity' => $it->dispensed_quantity,
                    'source' => $it->source,
                ]),
            ];
        });

        return Inertia::render('Tenant/Pharmacy/Dispense/History', [
            'dispensed' => $dispensed,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }
}
