<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\ClinicMedicine;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionItemBatch;
use App\Models\StockBatch;
use App\Services\Pharmacy\DispenseService;
use App\Support\TokenHelper;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class DispenseController extends Controller
{
    public function __construct(
        protected DispenseService $dispenseService
    ) {}

    /**
     * Display the Pharmacist Dispense Queue (Mode A).
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

        abort_if(
            $request->user()->hasRole('doctor') && ! $request->user()->hasRole('clinic_admin') && ! $request->user()->hasRole('super_admin'),
            403,
            'Doctor role is not authorized to access pharmacy dispensing.'
        );

        $search = trim((string) $request->input('search', ''));
        $statusFilter = (string) $request->input('status', 'all');
        $doctorIdFilter = $request->input('doctor_id');

        $query = Prescription::where('tenant_id', $tenantId)
            ->whereIn('status', [
                Prescription::STATUS_FINALIZED,
                Prescription::STATUS_PARTIALLY_DISPENSED,
            ])
            ->where('stock_reduction_mode', Prescription::MODE_DISPENSE)
            ->with([
                'patient',
                'doctor',
                'token.bill',
                'token.doctorSession',
                'items.clinicMedicine.batches',
            ])
            ->orderBy('finalized_at', 'asc'); // Oldest first: serve longest-waiting patients first

        // Filter chips: Waiting / In progress / Partial / Today / Doctor
        if ($statusFilter === 'waiting') {
            $query->where('status', Prescription::STATUS_FINALIZED);
        } elseif ($statusFilter === 'partial') {
            $query->where('status', Prescription::STATUS_PARTIALLY_DISPENSED);
        } elseif ($statusFilter === 'today') {
            $query->whereDate('finalized_at', now()->toDateString());
        }

        if (! empty($doctorIdFilter)) {
            $query->where('doctor_id', (int) $doctorIdFilter);
        }

        // Search: patient name, phone in any format, Rx no., token no.
        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $digits = preg_replace('/\D/', '', $search);
            $normalizedPhone = Patient::normalizePhone($search);
            $parsedToken = TokenHelper::parseSearchTerm($search);

            $query->where(function ($q) use ($term, $search, $digits, $normalizedPhone, $parsedToken) {
                $q->whereRaw('LOWER(prescription_number) LIKE ?', [$term])
                    ->orWhereHas('token', function ($tq) use ($term, $parsedToken) {
                        if ($parsedToken) {
                            $tq->where('token_number', $parsedToken['number']);
                            if ($parsedToken['code'] !== null) {
                                $tq->whereHas('doctorSession', fn ($sq) => $sq->where('doctor_token_code', $parsedToken['code']));
                            }
                        } else {
                            $tq->where('token_number', 'LIKE', $term);
                        }
                    })
                    ->orWhereHas('doctor', fn ($dq) => $dq->whereRaw('LOWER(name) LIKE ?', [$term]))
                    ->orWhereHas('patient', function ($pq) use ($term, $search, $digits, $normalizedPhone) {
                        $pq->whereRaw('LOWER(name) LIKE ?', [$term])
                            ->orWhere('phone', 'LIKE', "%{$search}%")
                            ->orWhere('phone_normalized', 'LIKE', "%{$search}%");

                        if (! empty($digits)) {
                            $pq->orWhere('phone', 'LIKE', "%{$digits}%")
                                ->orWhere('phone_normalized', 'LIKE', "%{$digits}%");
                        }

                        if (! empty($normalizedPhone)) {
                            $pq->orWhere('phone_normalized', 'LIKE', "%{$normalizedPhone}%");
                        }
                    });
            });
        }

        $todayDate = now()->toDateString();
        $currentUser = $request->user();

        // Paginate / fetch queue
        $prescriptions = $query->paginate(30)->withQueryString()->through(function ($p) use ($tenantId, $todayDate, $currentUser) {
            $clinicItems = $p->items->where('source', 'clinic');
            $outsideItemsCount = $p->items->where('source', 'outside')->count();
            $outOfStockCount = 0;
            $allInStock = true;

            foreach ($clinicItems as $item) {
                $validStock = 0;
                if ($item->clinicMedicine) {
                    $validStock = (int) $item->clinicMedicine->batches
                        ->whereNull('voided_at')
                        ->filter(fn ($b) => $b->quantity_remaining > 0 && ($b->expiry_date === null || $b->expiry_date->toDateString() >= $todayDate))
                        ->sum('quantity_remaining');
                }

                $neededQty = max(0, (int) $item->quantity - (int) $item->dispensed_quantity);
                if ($validStock < $neededQty) {
                    $allInStock = false;
                    $outOfStockCount++;
                }
            }

            // Concurrency lock check
            $lockKey = "dispense_lock:{$tenantId}:{$p->id}";
            $lock = Cache::get($lockKey);
            $lockedBy = null;
            if ($lock && is_array($lock)) {
                $lockedAt = isset($lock['locked_at']) ? Carbon::parse($lock['locked_at']) : null;
                if ($lockedAt && $lockedAt->diffInMinutes(now()) < 15) {
                    $lockedBy = [
                        'user_id' => (int) ($lock['user_id'] ?? 0),
                        'user_name' => (string) ($lock['user_name'] ?? 'Another pharmacist'),
                        'locked_at' => $lock['locked_at'] ?? null,
                        'is_current_user' => (int) ($lock['user_id'] ?? 0) === (int) ($currentUser?->id ?? 0),
                    ];
                }
            }

            $patient = $p->patient;
            $patientAge = $patient->date_of_birth ? (int) $patient->date_of_birth->age : null;
            $patientGender = $patient->gender ? ucfirst((string) $patient->gender) : null;
            $minutesWaiting = $p->finalized_at ? max(0, (int) now()->diffInMinutes($p->finalized_at)) : 0;

            return [
                'id' => $p->id,
                'prescription_number' => $p->prescription_number,
                'status' => $p->status,
                'token_id' => $p->booking_token_id,
                'token_number' => $p->token?->token_number,
                'token_display' => $p->token?->display_token ?? ($p->token ? (string) $p->token->token_number : null),
                'patient_id' => $p->patient_id,
                'patient_name' => $patient->name,
                'patient_phone' => $patient->phone,
                'patient_age' => $patientAge,
                'patient_gender' => $patientGender,
                'doctor_name' => $p->doctor ? trim(($p->doctor->title ?? 'Dr.').' '.$p->doctor->name) : 'Doctor',
                'doctor_id' => $p->doctor_id,
                'finalized_at' => $p->finalized_at?->format('h:i A'),
                'finalized_at_raw' => $p->finalized_at?->toIso8601String(),
                'finalized_date' => $p->finalized_at?->format('d/m/Y'),
                'minutes_waiting' => $minutesWaiting,
                'items_count' => $p->items->count(),
                'clinic_items_count' => $clinicItems->count(),
                'outside_items_count' => $outsideItemsCount,
                'all_in_stock' => $allInStock,
                'out_of_stock_count' => $outOfStockCount,
                'locked_by' => $lockedBy,
            ];
        });

        // Today's Stats strip
        $waitingCount = Prescription::where('tenant_id', $tenantId)
            ->where('stock_reduction_mode', Prescription::MODE_DISPENSE)
            ->where('status', Prescription::STATUS_FINALIZED)
            ->whereDate('finalized_at', $todayDate)
            ->count();

        $partiallyDispensedCount = Prescription::where('tenant_id', $tenantId)
            ->where('stock_reduction_mode', Prescription::MODE_DISPENSE)
            ->where('status', Prescription::STATUS_PARTIALLY_DISPENSED)
            ->whereDate('finalized_at', $todayDate)
            ->count();

        $dispensedCount = Prescription::where('tenant_id', $tenantId)
            ->where('stock_reduction_mode', Prescription::MODE_DISPENSE)
            ->where('status', Prescription::STATUS_DISPENSED)
            ->whereDate('dispensed_at', $todayDate)
            ->count();

        // Calculate active in_progress locks count
        $inProgressCount = 0;
        foreach ($prescriptions as $pRow) {
            if (! empty($pRow['locked_by'])) {
                $inProgressCount++;
            }
        }

        // Value dispensed today in cents (from PrescriptionItemBatch)
        $valueDispensedCents = (int) PrescriptionItemBatch::where('tenant_id', $tenantId)
            ->whereDate('created_at', $todayDate)
            ->sum(DB::raw('quantity * selling_price_cents'));

        $todayStats = [
            'waiting' => $waitingCount,
            'in_progress' => $inProgressCount,
            'dispensed' => $dispensedCount,
            'partially_dispensed' => $partiallyDispensedCount,
            'value_dispensed_cents' => $valueDispensedCents,
        ];

        // Inventory Alerts for empty state
        $lowStockMedicines = ClinicMedicine::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with('batches')
            ->get()
            ->filter(function ($cm) {
                return $cm->total_quantity <= $cm->reorder_level;
            })
            ->take(5)
            ->values()
            ->map(fn ($cm) => [
                'id' => $cm->id,
                'display_name' => $cm->display_name,
                'total_quantity' => $cm->total_quantity,
                'reorder_level' => $cm->reorder_level,
                'unit' => $cm->base_unit ?? 'units',
            ]);

        $expiringSoonBatches = StockBatch::where('tenant_id', $tenantId)
            ->whereNull('voided_at')
            ->where('quantity_remaining', '>', 0)
            ->whereBetween('expiry_date', [$todayDate, now()->addDays(30)->toDateString()])
            ->with('clinicMedicine')
            ->orderBy('expiry_date', 'asc')
            ->take(5)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'batch_number' => $b->batch_number ?: 'N/A',
                'medicine_name' => $b->clinicMedicine?->display_name ?? 'Medicine',
                'expiry_date' => $b->expiry_date?->format('d/m/Y'),
                'quantity_remaining' => (int) $b->quantity_remaining,
            ]);

        // Active doctors for filter list
        $doctors = Doctor::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name', 'asc')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
            ]);

        return Inertia::render('Tenant/Pharmacy/Dispense/Index', [
            'prescriptions' => $prescriptions,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
                'doctor_id' => $doctorIdFilter ? (int) $doctorIdFilter : null,
            ],
            'todayStats' => $todayStats,
            'inventoryAlerts' => [
                'low_stock' => $lowStockMedicines,
                'expiring_soon' => $expiringSoonBatches,
            ],
            'clinicSettings' => [
                'print_language' => $tenant->prescription_print_language ?? 'en',
                'clinic_name' => $tenant->name,
                'clinic_phone' => $tenant->phone,
                'clinic_address' => $tenant->formatted_address ?: $tenant->address,
            ],
            'doctors' => $doctors,
            'mode' => $tenant->pharmacy_stock_reduction_mode ?? Prescription::MODE_DISPENSE,
        ]);
    }

    /**
     * Get review details and available FEFO batches for a prescription.
     */
    public function show(Request $request, Prescription $prescription): JsonResponse
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        abort_unless($prescription->tenant_id === $tenantId, 404);

        abort_if(
            $request->user()->hasRole('doctor') && ! $request->user()->hasRole('clinic_admin') && ! $request->user()->hasRole('super_admin'),
            403,
            'Doctor role is not authorized to access pharmacy dispensing.'
        );

        $currentUser = $request->user();
        $lockKey = "dispense_lock:{$tenantId}:{$prescription->id}";
        $existingLock = Cache::get($lockKey);
        $lockedBy = null;
        $isLockedByOther = false;

        if ($existingLock && is_array($existingLock)) {
            $lockedAt = isset($existingLock['locked_at']) ? Carbon::parse($existingLock['locked_at']) : null;
            if ($lockedAt && $lockedAt->diffInMinutes(now()) < 15) {
                if ((int) ($existingLock['user_id'] ?? 0) !== (int) $currentUser->id) {
                    $isLockedByOther = true;
                    $lockedBy = [
                        'user_id' => (int) $existingLock['user_id'],
                        'user_name' => (string) $existingLock['user_name'],
                        'locked_at' => $existingLock['locked_at'],
                        'is_current_user' => false,
                    ];
                }
            }
        }

        // Acquire or renew lock if not locked by someone else
        if (! $isLockedByOther) {
            $lockInfo = [
                'user_id' => $currentUser->id,
                'user_name' => $currentUser->name,
                'locked_at' => now()->toIso8601String(),
            ];
            Cache::put($lockKey, $lockInfo, now()->addMinutes(15));
            $lockedBy = [
                'user_id' => (int) $currentUser->id,
                'user_name' => (string) $currentUser->name,
                'locked_at' => $lockInfo['locked_at'],
                'is_current_user' => true,
            ];
        }

        $prescription->load([
            'patient',
            'doctor',
            'token.bill',
            'items.clinicMedicine.batches',
            'items.clinicMedicine.brand.barcodes',
            'items.variant.medicine',
        ]);

        $today = now()->toDateString();
        $printLanguage = $tenant->prescription_print_language ?? 'en';

        $items = $prescription->items->map(function ($it) use ($tenantId, $today, $printLanguage) {
            $batches = [];
            $totalInStock = 0;
            $unitPriceCents = 0;
            $barcodes = [];

            $neededQty = max(0, (int) $it->quantity - (int) $it->dispensed_quantity);

            if ($it->clinic_medicine_id && $it->clinicMedicine) {
                $clinicMed = $it->clinicMedicine;
                $unitPriceCents = (int) ($clinicMed->selling_price_cents ?? 0);

                // Collect brand barcodes
                if ($clinicMed->brand && $clinicMed->brand->relationLoaded('barcodes')) {
                    $barcodes = $clinicMed->brand->barcodes->pluck('barcode')->filter()->values()->all();
                }

                // Fetch valid FEFO batches: not voided, not expired, quantity > 0, ordered by expiry_date ASC
                $rawBatches = StockBatch::where('tenant_id', $tenantId)
                    ->where('clinic_medicine_id', $it->clinic_medicine_id)
                    ->whereNull('voided_at')
                    ->where(function ($q) use ($today) {
                        $q->whereNull('expiry_date')
                            ->orWhere('expiry_date', '>=', $today);
                    })
                    ->where('quantity_remaining', '>', 0)
                    ->orderByRaw('expiry_date ASC NULLS LAST')
                    ->orderBy('id', 'asc')
                    ->get();

                $totalInStock = (int) $rawBatches->sum('quantity_remaining');

                $batches = $rawBatches->map(function ($b) {
                    $isNearExpiry = false;
                    if ($b->expiry_date) {
                        $diffDays = now()->diffInDays($b->expiry_date, false);
                        $isNearExpiry = $diffDays >= 0 && $diffDays <= 90;
                    }

                    return [
                        'id' => $b->id,
                        'batch_number' => $b->batch_number ?: 'N/A',
                        'expiry_date' => $b->expiry_date?->format('d/m/Y'),
                        'expiry_date_iso' => $b->expiry_date?->toDateString(),
                        'quantity_remaining' => (int) $b->quantity_remaining,
                        'cost_price_cents' => (int) $b->cost_price_cents,
                        'is_near_expiry' => $isNearExpiry,
                    ];
                })->all();
            }

            // Auto-allocate batches using FEFO
            $autoAllocatedBatches = [];
            $remToAllocate = $neededQty;
            foreach ($batches as $batch) {
                if ($remToAllocate <= 0) {
                    break;
                }
                $alloc = min($remToAllocate, (int) $batch['quantity_remaining']);
                if ($alloc > 0) {
                    $autoAllocatedBatches[] = [
                        'batch_id' => $batch['id'],
                        'batch_number' => $batch['batch_number'],
                        'expiry_date' => $batch['expiry_date'],
                        'quantity' => $alloc,
                        'is_near_expiry' => $batch['is_near_expiry'],
                    ];
                    $remToAllocate -= $alloc;
                }
            }

            // Determine stock status
            $itemStatus = 'ready';
            if ($it->source === PrescriptionItem::SOURCE_OUTSIDE) {
                $itemStatus = 'outside';
            } elseif ($totalInStock <= 0) {
                $itemStatus = 'out_of_stock';
            } elseif ($totalInStock < $neededQty) {
                $itemStatus = 'partially_available';
            }

            // Instruction lines in clinic language and EN
            $timingEn = trans("prescriptions.timing.{$it->timing}", [], 'en');
            if ($timingEn === "prescriptions.timing.{$it->timing}") {
                $timingEn = str_replace('_', ' ', (string) $it->timing);
            }
            $freqEn = trans("prescriptions.frequency.{$it->frequency}", [], 'en');
            if ($freqEn === "prescriptions.frequency.{$it->frequency}") {
                $freqEn = (string) $it->frequency;
            }
            $durationEn = $it->duration_days ? "{$it->duration_days} days" : '';
            $instructionEn = trim("{$it->dose_display} · {$freqEn} · {$timingEn}".($durationEn ? " · {$durationEn}" : ''));

            $timingClinic = trans("prescriptions.timing.{$it->timing}", [], $printLanguage);
            if ($timingClinic === "prescriptions.timing.{$it->timing}") {
                $timingClinic = $timingEn;
            }
            $freqClinic = trans("prescriptions.frequency.{$it->frequency}", [], $printLanguage);
            if ($freqClinic === "prescriptions.frequency.{$it->frequency}") {
                $freqClinic = $freqEn;
            }
            $durationClinic = $it->duration_days ? trans('prescriptions.duration', ['days' => $it->duration_days], $printLanguage) : '';
            if ($durationClinic === 'prescriptions.duration' || empty($durationClinic)) {
                $durationClinic = $durationEn;
            }
            $instructionClinic = trim("{$it->dose_display} · {$freqClinic} · {$timingClinic}".($durationClinic ? " · {$durationClinic}" : ''));

            return [
                'id' => $it->id,
                'display_name' => $it->display_name,
                'generic_name' => $it->generic_name,
                'brand_name' => $it->brand_name,
                'dosage_form' => $it->dosage_form,
                'strength_text' => $it->strength_text,
                'clinic_medicine_id' => $it->clinic_medicine_id,
                'medicine_variant_id' => $it->medicine_variant_id,
                'source' => $it->source,
                'dose' => $it->dose_display,
                'frequency' => $it->frequency,
                'timing' => $it->timing,
                'duration_days' => $it->duration_days,
                'quantity' => (int) $it->quantity,
                'dispensed_quantity' => (int) $it->dispensed_quantity,
                'needed_quantity' => $neededQty,
                'dispense_qty' => min($neededQty, $totalInStock),
                'total_in_stock' => $totalInStock,
                'batches' => $batches,
                'auto_allocated_batches' => $autoAllocatedBatches,
                'unit_price_cents' => $unitPriceCents,
                'line_total_cents' => min($neededQty, $totalInStock) * $unitPriceCents,
                'status' => $itemStatus,
                'barcodes' => $barcodes,
                'instruction_clinic_lang' => $instructionClinic,
                'instruction_en' => $instructionEn,
                'instructions' => $it->instructions,
            ];
        });

        $bill = $prescription->token?->bill;
        $patient = $prescription->patient;

        return response()->json([
            'prescription' => [
                'id' => $prescription->id,
                'prescription_number' => $prescription->prescription_number,
                'status' => $prescription->status,
                'token_number' => $prescription->token?->token_number,
                'token_display' => $prescription->token?->display_token ?? ($prescription->token ? (string) $prescription->token->token_number : null),
                'patient_id' => $prescription->patient_id,
                'patient_name' => $patient->name,
                'patient_phone' => $patient->phone,
                'patient_age' => $patient->date_of_birth ? (int) $patient->date_of_birth->age : null,
                'patient_gender' => $patient->gender ? ucfirst((string) $patient->gender) : null,
                'doctor_name' => $prescription->doctor ? trim(($prescription->doctor->title ?? 'Dr.').' '.$prescription->doctor->name) : 'Doctor',
                'finalized_at' => $prescription->finalized_at?->format('d/m/Y h:i A'),
                'is_paid' => $bill?->payment_status === Bill::STATUS_PAID,
                'payment_status' => $bill?->payment_status ?? 'pending',
                'bill_total_formatted' => $bill?->formatted_total ?? '—',
                'bill_total_cents' => $bill?->total_amount_cents ?? 0,
            ],
            'items' => $items,
            'locked_by' => $lockedBy,
            'is_locked_by_other' => $isLockedByOther,
        ]);
    }

    /**
     * Lock a prescription when pharmacist begins dispensing.
     */
    public function lock(Request $request, Prescription $prescription): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($prescription->tenant_id === $tenantId, 404);

        $currentUser = $request->user();
        $lockKey = "dispense_lock:{$tenantId}:{$prescription->id}";
        $existingLock = Cache::get($lockKey);

        if ($existingLock && is_array($existingLock) && (int) ($existingLock['user_id'] ?? 0) !== (int) $currentUser->id) {
            $lockedAt = isset($existingLock['locked_at']) ? Carbon::parse($existingLock['locked_at']) : null;
            if ($lockedAt && $lockedAt->diffInMinutes(now()) < 15) {
                return response()->json([
                    'success' => false,
                    'message' => "Being prepared by {$existingLock['user_name']}",
                    'locked_by' => $existingLock,
                ], 423);
            }
        }

        $lockInfo = [
            'user_id' => $currentUser->id,
            'user_name' => $currentUser->name,
            'locked_at' => now()->toIso8601String(),
        ];
        Cache::put($lockKey, $lockInfo, now()->addMinutes(15));

        return response()->json([
            'success' => true,
            'locked_by' => $lockInfo,
        ]);
    }

    /**
     * Unlock a prescription.
     */
    public function unlock(Request $request, Prescription $prescription): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($prescription->tenant_id === $tenantId, 404);

        $lockKey = "dispense_lock:{$tenantId}:{$prescription->id}";
        $existingLock = Cache::get($lockKey);

        if ($existingLock && is_array($existingLock) && (int) ($existingLock['user_id'] ?? 0) === (int) $request->user()->id) {
            Cache::forget($lockKey);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Put prescription on hold with a pharmacist reason.
     */
    public function hold(Request $request, Prescription $prescription): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($prescription->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $holdNote = "[Dispense on hold by {$request->user()->name} at ".now()->format('h:i A').": {$validated['reason']}]";
        $prescription->update([
            'clinical_notes' => trim(($prescription->clinical_notes ? $prescription->clinical_notes."\n" : '').$holdNote),
        ]);

        $lockKey = "dispense_lock:{$tenantId}:{$prescription->id}";
        Cache::forget($lockKey);

        return redirect()->back()->with('success', "Prescription {$prescription->prescription_number} put on hold.");
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
            'items.*.batch_allocations' => ['nullable', 'array'],
            'items.*.batch_allocations.*.batch_id' => ['required_with:items.*.batch_allocations', 'integer'],
            'items.*.batch_allocations.*.quantity' => ['required_with:items.*.batch_allocations', 'integer', 'min:1'],
        ]);

        $overrides = [];
        if ($request->has('items') && is_array($request->input('items'))) {
            foreach ($request->input('items') as $it) {
                if (isset($it['prescription_item_id'])) {
                    $overrides[$it['prescription_item_id']] = [
                        'dispense_quantity' => $it['quantity_to_dispense'] ?? null,
                        'substituted_clinic_medicine_id' => $it['substitute_clinic_medicine_id'] ?? null,
                        'mark_outside' => $it['mark_outside'] ?? false,
                        'batch_allocations' => $it['batch_allocations'] ?? null,
                    ];
                }
            }
        } elseif ($request->has('overrides') && is_array($request->input('overrides'))) {
            $overrides = $request->input('overrides');
        }

        try {
            $dispensedRx = $this->dispenseService->dispensePrescription(
                $prescription,
                $request->user(),
                $tenantId,
                $overrides
            );

            // Clear concurrency lock upon completion
            Cache::forget("dispense_lock:{$tenantId}:{$prescription->id}");

            $statusText = $dispensedRx->status === Prescription::STATUS_DISPENSED ? 'dispensed' : 'partially dispensed';

            return redirect()->back()->with('success', "Prescription {$prescription->prescription_number} {$statusText} successfully.");
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
        abort_if(
            $request->user()->hasRole('doctor') && ! $request->user()->hasRole('clinic_admin') && ! $request->user()->hasRole('super_admin'),
            403,
            'Doctor role is not authorized to access pharmacy dispensing.'
        );

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
