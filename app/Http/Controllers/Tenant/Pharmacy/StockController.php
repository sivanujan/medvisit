<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\BillItem;
use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBarcode;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionTemplateItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\AuditLogger;
use App\Services\Pharmacy\MedicineDuplicateService;
use App\Services\Pharmacy\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockController extends Controller
{
    public function __construct(
        protected StockService $stockService,
        protected MedicineDuplicateService $duplicateService
    ) {}

    /**
     * Display the clinic medicine inventory stock list.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $search = trim((string) $request->input('search', ''));
        $tab = $request->input('tab', $request->input('filter', 'all')); // all, low_stock, out_of_stock, expiring_soon, expired, inactive, duplicates
        $expiringDays = (int) $request->input('expiring_days', $tenant->pharmacy_expiring_soon_days ?? 60);
        $dosageFormFilter = $request->input('form');
        $supplierIdFilter = $request->input('supplier_id');
        $shelfFilter = $request->input('shelf');
        $sortBy = $request->input('sort', 'name'); // name, stock, expiry, value
        $sortDirection = strtolower((string) $request->input('direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $defaultReorderLevel = (int) ($tenant->pharmacy_default_reorder_level ?? 10);

        // Detect all possible duplicates for this tenant
        $duplicatePairs = $this->duplicateService->detectDuplicates($tenantId);
        $duplicateMedicineIds = [];
        $medicineToPairKeyMap = [];
        foreach ($duplicatePairs as $dp) {
            $idA = (int) $dp['medicine_a']['id'];
            $idB = (int) $dp['medicine_b']['id'];
            $duplicateMedicineIds[$idA] = true;
            $duplicateMedicineIds[$idB] = true;
            $medicineToPairKeyMap[$idA] = $dp['pair_key'];
            $medicineToPairKeyMap[$idB] = $dp['pair_key'];
        }

        $today = now()->toDateString();
        $expiringThreshold = now()->addDays($expiringDays)->toDateString();

        // Base Query
        $query = ClinicMedicine::query()
            ->with([
                'variant.medicine',
                'brand.barcodes',
                'batches' => function ($bq) {
                    $bq->whereNull('voided_at')
                        ->where('quantity_remaining', '>', 0)
                        ->with('supplier')
                        ->orderByRaw('expiry_date ASC NULLS LAST');
                },
                'movements' => function ($mq) {
                    $mq->latest('created_at')->limit(5)->with('user');
                },
            ])
            ->withSum(['batches as total_quantity' => function ($bq) {
                $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0);
            }], 'quantity_remaining')
            ->withExists('movements')
            ->where('tenant_id', $tenantId);

        // Search: Name, Generic, Brand, Barcode, Batch Number
        if ($search !== '') {
            $rawSearch = strtolower($search);
            $fullTerm = '%'.$rawSearch.'%';
            $words = array_values(array_filter(explode(' ', $rawSearch), fn ($w) => strlen(trim($w)) > 0));

            $query->where(function ($mainQ) use ($fullTerm, $words) {
                $mainQ->where(function ($q) use ($fullTerm) {
                    $q->whereRaw('LOWER(display_name) LIKE ?', [$fullTerm])
                        ->orWhereRaw('LOWER(COALESCE(shelf_location, \'\')) LIKE ?', [$fullTerm])
                        ->orWhereHas('variant.medicine', function ($mq) use ($fullTerm) {
                            $mq->whereRaw('LOWER(generic_name) LIKE ?', [$fullTerm])
                                ->orWhereRaw('LOWER(CAST(synonyms AS TEXT)) LIKE ?', [$fullTerm]);
                        })
                        ->orWhereHas('variant', function ($vq) use ($fullTerm) {
                            $vq->whereRaw('LOWER(strength_text) LIKE ?', [$fullTerm])
                                ->orWhereRaw('LOWER(dosage_form) LIKE ?', [$fullTerm]);
                        })
                        ->orWhereHas('brand', function ($bq) use ($fullTerm) {
                            $bq->whereRaw('LOWER(brand_name) LIKE ?', [$fullTerm])
                                ->orWhereRaw('LOWER(COALESCE(manufacturer, \'\')) LIKE ?', [$fullTerm]);
                        })
                        ->orWhereHas('batches', function ($bq) use ($fullTerm) {
                            $bq->whereRaw('LOWER(batch_number) LIKE ?', [$fullTerm]);
                        })
                        ->orWhereHas('brand.barcodes', function ($bcq) use ($fullTerm) {
                            $bcq->whereRaw('barcode LIKE ?', [$fullTerm]);
                        });
                });

                if (count($words) > 1) {
                    $mainQ->orWhere(function ($allWordsQ) use ($words) {
                        foreach ($words as $word) {
                            $wordTerm = '%'.$word.'%';
                            $allWordsQ->where(function ($singleWordQ) use ($wordTerm) {
                                $singleWordQ->whereRaw('LOWER(display_name) LIKE ?', [$wordTerm])
                                    ->orWhereRaw('LOWER(COALESCE(shelf_location, \'\')) LIKE ?', [$wordTerm])
                                    ->orWhereHas('variant.medicine', function ($mq) use ($wordTerm) {
                                        $mq->whereRaw('LOWER(generic_name) LIKE ?', [$wordTerm])
                                            ->orWhereRaw('LOWER(CAST(synonyms AS TEXT)) LIKE ?', [$wordTerm]);
                                    })
                                    ->orWhereHas('variant', function ($vq) use ($wordTerm) {
                                        $vq->whereRaw('LOWER(strength_text) LIKE ?', [$wordTerm])
                                            ->orWhereRaw('LOWER(dosage_form) LIKE ?', [$wordTerm]);
                                    })
                                    ->orWhereHas('brand', function ($bq) use ($wordTerm) {
                                        $bq->whereRaw('LOWER(brand_name) LIKE ?', [$wordTerm])
                                            ->orWhereRaw('LOWER(COALESCE(manufacturer, \'\')) LIKE ?', [$wordTerm]);
                                    })
                                    ->orWhereHas('batches', function ($bq) use ($wordTerm) {
                                        $bq->whereRaw('LOWER(batch_number) LIKE ?', [$wordTerm]);
                                    })
                                    ->orWhereHas('brand.barcodes', function ($bcq) use ($wordTerm) {
                                        $bcq->whereRaw('barcode LIKE ?', [$wordTerm]);
                                    });
                            });
                        }
                    });
                }
            });
        }

        // Secondary Filters: Dosage form, Supplier, Shelf
        if (! empty($dosageFormFilter)) {
            $query->whereHas('variant', fn ($vq) => $vq->whereRaw('LOWER(dosage_form) = ?', [strtolower($dosageFormFilter)]));
        }

        if (! empty($supplierIdFilter)) {
            $query->whereHas('batches', fn ($bq) => $bq->where('supplier_id', (int) $supplierIdFilter));
        }

        if (! empty($shelfFilter)) {
            $query->where('shelf_location', $shelfFilter);
        }

        // Tab Filters
        if ($tab === 'inactive') {
            $query->where('is_active', false);
        } elseif ($tab === 'duplicates') {
            $query->whereIn('id', array_keys($duplicateMedicineIds));
        } else {
            $query->where('is_active', true);

            if ($tab === 'out_of_stock') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('batches', fn ($bq) => $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0))
                        ->orWhereRaw('(SELECT COALESCE(SUM(quantity_remaining), 0) FROM stock_batches WHERE stock_batches.clinic_medicine_id = clinic_medicines.id AND stock_batches.voided_at IS NULL) <= 0');
                });
            } elseif ($tab === 'low_stock') {
                $query->whereRaw('(SELECT COALESCE(SUM(quantity_remaining), 0) FROM stock_batches WHERE stock_batches.clinic_medicine_id = clinic_medicines.id AND stock_batches.voided_at IS NULL) > 0')
                    ->whereRaw('(SELECT COALESCE(SUM(quantity_remaining), 0) FROM stock_batches WHERE stock_batches.clinic_medicine_id = clinic_medicines.id AND stock_batches.voided_at IS NULL) <= COALESCE(clinic_medicines.reorder_level, ?)', [$defaultReorderLevel]);
            } elseif ($tab === 'expiring_soon') {
                $query->whereHas('batches', function ($bq) use ($today, $expiringThreshold) {
                    $bq->whereNull('voided_at')
                        ->where('quantity_remaining', '>', 0)
                        ->whereNotNull('expiry_date')
                        ->where('expiry_date', '>=', $today)
                        ->where('expiry_date', '<=', $expiringThreshold);
                });
            } elseif ($tab === 'expired') {
                $query->whereHas('batches', function ($bq) use ($today) {
                    $bq->whereNull('voided_at')
                        ->where('quantity_remaining', '>', 0)
                        ->whereNotNull('expiry_date')
                        ->where('expiry_date', '<', $today);
                });
            }
        }

        // Sorting
        if ($sortBy === 'stock') {
            $query->orderBy('total_quantity', $sortDirection);
        } elseif ($sortBy === 'expiry') {
            $query->orderBy(
                StockBatch::select('expiry_date')
                    ->whereColumn('stock_batches.clinic_medicine_id', 'clinic_medicines.id')
                    ->whereNull('voided_at')
                    ->where('quantity_remaining', '>', 0)
                    ->orderByRaw('expiry_date ASC NULLS LAST')
                    ->limit(1),
                $sortDirection
            );
        } elseif ($sortBy === 'value') {
            $query->orderBy('selling_price_cents', $sortDirection);
        } else {
            $query->orderBy('display_name', $sortDirection);
        }

        // Transform results
        $medicines = $query->paginate(25)->withQueryString()->through(function ($cm) use ($today, $expiringThreshold, $defaultReorderLevel, $duplicateMedicineIds, $medicineToPairKeyMap) {
            $totalQuantity = (int) ($cm->total_quantity ?? 0);
            $effectiveReorderLevel = $cm->reorder_level !== null ? (int) $cm->reorder_level : $defaultReorderLevel;
            $nearestBatch = $cm->batches->first();
            $nearestExpiry = $nearestBatch?->expiry_date?->toDateString();

            // Determine urgency
            $nearestExpiryUrgency = 'ok';
            if ($nearestExpiry && $nearestExpiry < $today) {
                $nearestExpiryUrgency = 'expired';
            } elseif ($nearestExpiry && $nearestExpiry <= $expiringThreshold) {
                $nearestExpiryUrgency = 'expiring_soon';
            }

            // Determine item status
            $status = 'in_stock';
            if (! $cm->is_active) {
                $status = 'inactive';
            } elseif ($totalQuantity <= 0) {
                $status = 'out_of_stock';
            } elseif ($nearestExpiry && $nearestExpiry < $today) {
                $status = 'expired';
            } elseif ($nearestExpiry && $nearestExpiry <= $expiringThreshold) {
                $status = 'expiring_soon';
            } elseif ($totalQuantity <= $effectiveReorderLevel) {
                $status = 'low_stock';
            }

            // Normalization
            $norm = $this->duplicateService->normalizeDisplayName($cm);

            // Active batches
            $activeBatches = $cm->batches->map(function ($b) use ($today, $expiringThreshold) {
                $exp = $b->expiry_date?->toDateString();
                $bStatus = 'ok';
                if ($exp && $exp < $today) {
                    $bStatus = 'expired';
                } elseif ($exp && $exp <= $expiringThreshold) {
                    $bStatus = 'expiring_soon';
                }

                return [
                    'id' => $b->id,
                    'batch_number' => $b->batch_number ?: 'N/A',
                    'expiry_date' => $b->expiry_date?->format('d/m/Y'),
                    'expiry_date_raw' => $exp,
                    'quantity_remaining' => (int) $b->quantity_remaining,
                    'quantity_received' => (int) $b->quantity_received,
                    'cost_price_cents' => (int) $b->cost_price_cents,
                    'supplier_name' => $b->supplier?->name ?? '—',
                    'received_at' => $b->received_at?->format('d/m/Y') ?? '—',
                    'stock_receipt_id' => $b->stock_receipt_id,
                    'status' => $bStatus,
                ];
            });

            // Last 5 movements for expandable row
            $lastMovements = $cm->movements->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type,
                'quantity' => (int) $m->quantity,
                'reason' => $m->reason,
                'user_name' => $m->user?->name ?? 'System',
                'created_at' => $m->created_at?->format('d/m/Y h:i A') ?? '—',
            ]);

            // Latest cost price and margin %
            $latestBatch = $cm->batches->first();
            $costPriceCents = $latestBatch ? (int) $latestBatch->cost_price_cents : 0;
            $sellingPriceCents = (int) ($cm->selling_price_cents ?? 0);
            $marginPercent = null;
            if ($sellingPriceCents > 0 && $costPriceCents > 0) {
                $marginPercent = (int) round((($sellingPriceCents - $costPriceCents) / $sellingPriceCents) * 100);
            }

            $hasPossibleDuplicate = isset($duplicateMedicineIds[$cm->id]);

            return [
                'id' => $cm->id,
                'display_name' => $cm->display_name,
                'normalized_display_name' => $norm['normalized_name'],
                'generic_name' => $cm->variant?->medicine?->generic_name ?? 'Generic',
                'strength_form' => $cm->variant?->display_name ?? '—',
                'dosage_form' => $cm->variant?->dosage_form ?? '—',
                'strength' => $cm->variant?->strength_text ?? '—',
                'brand_name' => $cm->brand?->brand_name,
                'base_unit' => $cm->base_unit,
                'selling_price_cents' => $sellingPriceCents,
                'cost_price_cents' => $costPriceCents,
                'margin_percent' => $marginPercent,
                'reorder_level' => $cm->reorder_level !== null ? (int) $cm->reorder_level : null,
                'effective_reorder_level' => $effectiveReorderLevel,
                'shelf_location' => $cm->shelf_location ? trim($cm->shelf_location) : null,
                'is_active' => (bool) $cm->is_active,
                'total_quantity' => $totalQuantity,
                'nearest_expiry' => $nearestExpiry,
                'nearest_expiry_formatted' => $nearestBatch?->expiry_date?->format('d/m/Y'),
                'nearest_expiry_raw' => $nearestExpiry,
                'nearest_expiry_urgency' => $nearestExpiryUrgency,
                'batch_count' => count($activeBatches),
                'batches' => $activeBatches,
                'last_movements' => $lastMovements,
                'has_movements' => (bool) $cm->movements_exists,
                'status' => $status,
                'has_possible_duplicate' => $hasPossibleDuplicate,
                'duplicate_pair_key' => $medicineToPairKeyMap[$cm->id] ?? null,
                'brand_flag' => $norm['brand_flag'],
            ];
        });

        // Compute Stats Strip Data Across All Active Stock
        $allActiveMedicines = ClinicMedicine::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['batches' => fn ($bq) => $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0)])
            ->get();

        $totalItems = $allActiveMedicines->count();
        $stockValueCostCents = 0;
        $stockValueSellingCents = 0;
        $lowStockCount = 0;
        $outOfStockCount = 0;
        $expiringSoonCount = 0;
        $expiredCount = 0;

        foreach ($allActiveMedicines as $med) {
            $remainingBatches = $med->batches;
            $qty = (int) $remainingBatches->sum('quantity_remaining');

            foreach ($remainingBatches as $b) {
                $stockValueCostCents += ((int) $b->quantity_remaining) * ((int) $b->cost_price_cents);
                $stockValueSellingCents += ((int) $b->quantity_remaining) * ((int) ($med->selling_price_cents ?? 0));
            }

            $effectiveReorder = $med->reorder_level !== null ? (int) $med->reorder_level : $defaultReorderLevel;
            $nearestExp = $remainingBatches->sortBy('expiry_date')->first()?->expiry_date?->toDateString();

            if ($qty <= 0) {
                $outOfStockCount++;
            } elseif ($qty <= $effectiveReorder) {
                $lowStockCount++;
            }

            if ($nearestExp && $nearestExp < $today) {
                $expiredCount++;
            } elseif ($nearestExp && $nearestExp <= $expiringThreshold) {
                $expiringSoonCount++;
            }
        }

        $inactiveCount = ClinicMedicine::where('tenant_id', $tenantId)->where('is_active', false)->count();

        $stats = [
            'total_items' => $totalItems,
            'stock_value_cost_cents' => $stockValueCostCents,
            'stock_value_selling_cents' => $stockValueSellingCents,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'expiring_soon_count' => $expiringSoonCount,
            'expired_count' => $expiredCount,
            'possible_duplicates_count' => count($duplicatePairs),
            'inactive_count' => $inactiveCount,
        ];

        // Filter Options
        $suppliers = Supplier::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $shelves = ClinicMedicine::where('tenant_id', $tenantId)
            ->whereNotNull('shelf_location')
            ->where('shelf_location', '!=', '')
            ->distinct()
            ->orderBy('shelf_location')
            ->pluck('shelf_location')
            ->map(fn ($s) => trim($s))
            ->unique()
            ->values();

        $forms = MedicineVariant::whereHas('clinicMedicines', fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereNotNull('dosage_form')
            ->distinct()
            ->pluck('dosage_form')
            ->map(fn ($f) => ucfirst(strtolower(trim($f))))
            ->unique()
            ->values();

        return Inertia::render('Tenant/Pharmacy/Medicines/Index', [
            'medicines' => $medicines,
            'stats' => $stats,
            'duplicatePairs' => $duplicatePairs,
            'suppliers' => $suppliers,
            'shelves' => $shelves,
            'forms' => $forms,
            'filters' => [
                'search' => $search,
                'tab' => $tab,
                'expiring_days' => $expiringDays,
                'form' => $dosageFormFilter,
                'supplier_id' => $supplierIdFilter ? (int) $supplierIdFilter : null,
                'shelf' => $shelfFilter,
                'sort' => $sortBy,
                'direction' => $sortDirection,
            ],
            'settings' => [
                'default_reorder_level' => $defaultReorderLevel,
                'expiring_soon_days' => $expiringDays,
            ],
        ]);
    }

    /**
     * Get detailed batch list and movement ledger for a clinic medicine.
     */
    public function show(ClinicMedicine $medicine): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($medicine->tenant_id === $tenantId, 404);

        $medicine->load([
            'variant.medicine',
            'brand.barcodes',
        ]);

        $hasBatches = $medicine->batches()->exists();
        $hasMovements = $medicine->movements()->exists();
        $prescriptionsCount = PrescriptionItem::where('clinic_medicine_id', $medicine->id)
            ->orWhere('dispensed_clinic_medicine_id', $medicine->id)
            ->count();
        $hasBills = BillItem::where('clinic_medicine_id', $medicine->id)->exists();

        $hasHistory = $hasBatches || $hasMovements || ($prescriptionsCount > 0) || $hasBills;

        $batches = $medicine->batches()
            ->with(['supplier', 'receipt', 'voidedByUser'])
            ->withExists(['movements as has_dispense' => function ($q) {
                $q->where('type', StockMovement::TYPE_DISPENSE);
            }])
            ->orderByRaw('CASE WHEN voided_at IS NOT NULL THEN 1 ELSE 0 END ASC')
            ->orderByRaw('expiry_date ASC NULLS LAST')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'batch_number' => $b->batch_number ?: 'No batch',
                'expiry_date' => $b->expiry_date?->toDateString(),
                'expiry_date_formatted' => $b->expiry_date?->format('d/m/Y'),
                'quantity_received' => (int) $b->quantity_received,
                'quantity_remaining' => (int) $b->quantity_remaining,
                'cost_price_cents' => (int) $b->cost_price_cents,
                'supplier_id' => $b->supplier_id,
                'supplier_name' => $b->supplier?->name,
                'receipt_id' => $b->stock_receipt_id,
                'receipt_number' => $b->receipt?->receipt_number,
                'received_at' => $b->received_at?->toDateString(),
                'received_at_formatted' => $b->received_at?->format('d/m/Y'),
                'is_voided' => $b->voided_at !== null,
                'voided_at' => $b->voided_at?->toIso8601String(),
                'voided_by_name' => $b->voidedByUser?->name,
                'void_reason' => $b->void_reason,
                'has_dispense' => (bool) $b->has_dispense,
            ]);

        $movements = $medicine->movements()
            ->with(['user', 'batch.receipt'])
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type,
                'quantity' => (int) $m->quantity,
                'batch_id' => $m->stock_batch_id,
                'batch_number' => $m->batch?->batch_number,
                'receipt_number' => $m->batch?->receipt?->receipt_number,
                'reason' => $m->reason,
                'user_name' => $m->user?->name ?? 'System',
                'created_at' => $m->created_at->format('d/m/Y h:i A'),
                'created_at_raw' => $m->created_at->toIso8601String(),
            ]);

        $activeBatches = $medicine->batches->whereNull('voided_at')->where('quantity_remaining', '>', 0);
        $totalActiveStock = (int) $activeBatches->sum('quantity_remaining');
        $avgCostCents = 0;
        if ($totalActiveStock > 0) {
            $totalCost = $activeBatches->sum(fn ($b) => $b->quantity_remaining * $b->cost_price_cents);
            $avgCostCents = (int) round($totalCost / $totalActiveStock);
        } elseif ($batches->first()) {
            $avgCostCents = (int) $batches->first()['cost_price_cents'];
        }

        $latestBatch = $medicine->batches()->whereNull('voided_at')->orderByRaw('received_at DESC NULLS LAST, id DESC')->first();
        $latestCostCents = $latestBatch ? (int) $latestBatch->cost_price_cents : $avgCostCents;

        $sellingPriceCents = (int) ($medicine->selling_price_cents ?? 0);
        $profitCents = $sellingPriceCents - $latestCostCents;
        $marginPercent = null;
        if ($sellingPriceCents > 0 && $latestCostCents > 0) {
            $marginPercent = (int) round((($sellingPriceCents - $latestCostCents) / $sellingPriceCents) * 100);
        }

        $barcodes = $medicine->brand?->barcodes?->pluck('barcode')->all() ?? [];
        $norm = $this->duplicateService->normalizeDisplayName($medicine);

        $lastPriceChange = AuditEvent::where('action', 'stock.medicine_updated')
            ->where('resource_id', (string) $medicine->id)
            ->latest('created_at')
            ->first()?->created_at?->format('d/m/Y') ?? $medicine->updated_at?->format('d/m/Y');

        $brandsAvailable = MedicineBrand::where('medicine_variant_id', $medicine->medicine_variant_id)
            ->orderBy('brand_name')
            ->get(['id', 'brand_name', 'manufacturer']);

        $usage = PrescriptionItem::where('clinic_medicine_id', $medicine->id)
            ->orWhere('dispensed_clinic_medicine_id', $medicine->id)
            ->with(['prescription.patient', 'prescription.doctor'])
            ->latest('created_at')
            ->limit(30)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'prescription_id' => $item->prescription_id,
                'prescription_number' => $item->prescription?->prescription_number ?? 'RX-#'.$item->prescription_id,
                'patient_name' => $item->prescription?->patient?->full_name ?? 'Walk-in Patient',
                'doctor_name' => $item->prescription?->doctor?->name ?? 'Dr. Clinic',
                'dose' => $item->dose_display ?? $item->dose,
                'frequency' => $item->frequency,
                'duration' => $item->duration_days ? "{$item->duration_days} days" : $item->duration,
                'quantity_prescribed' => (int) $item->quantity_prescribed,
                'quantity_dispensed' => (int) $item->quantity_dispensed,
                'status' => $item->prescription?->status ?? 'completed',
                'date' => $item->created_at->format('d/m/Y'),
            ]);

        return response()->json([
            'medicine' => [
                'id' => $medicine->id,
                'display_name' => $medicine->display_name,
                'normalized_display_name' => $norm['normalized_name'],
                'generic_name' => $medicine->variant?->medicine?->generic_name ?? 'Generic',
                'strength_form' => $medicine->variant?->display_name ?? '—',
                'dosage_form' => $medicine->variant?->dosage_form ?? '—',
                'strength' => $medicine->variant?->strength_text ?? '—',
                'brand_name' => $medicine->brand?->brand_name,
                'medicine_brand_id' => $medicine->medicine_brand_id,
                'rxterms_code' => $medicine->variant?->rxterms_code ?? $medicine->variant?->medicine?->rxterms_code ?? null,
                'barcodes' => $barcodes,
                'base_unit' => $medicine->base_unit,
                'selling_price_cents' => $sellingPriceCents,
                'cost_price_cents' => $latestCostCents,
                'avg_cost_price_cents' => $avgCostCents,
                'profit_cents' => $profitCents,
                'margin_percent' => $marginPercent,
                'last_price_change_date' => $lastPriceChange,
                'reorder_level' => $medicine->reorder_level !== null ? (int) $medicine->reorder_level : null,
                'shelf_location' => $medicine->shelf_location,
                'is_active' => (bool) $medicine->is_active,
                'total_quantity' => (int) $medicine->total_quantity,
                'has_movements' => $hasMovements,
                'has_history' => $hasHistory,
                'prescriptions_count' => $prescriptionsCount,
                'brand_flag' => $norm['brand_flag'],
                'brands_available' => $brandsAvailable,
            ],
            'batches' => $batches,
            'movements' => $movements,
            'usage' => $usage,
        ]);
    }

    /**
     * Unified fast search across clinic stock and visible global catalog.
     */
    public function searchCatalog(Request $request): JsonResponse
    {
        $tenantId = tenant('id');
        $query = trim((string) ($request->input('q') ?? $request->input('query') ?? ''));

        if ($query === '') {
            return response()->json([
                'results' => [],
                'data' => [],
            ]);
        }

        $term = '%'.strtolower($query).'%';
        $lowerQuery = strtolower($query);

        // Pre-fetch all in-stock items for this tenant with total quantity and latest batch cost
        $existingInStock = ClinicMedicine::where('tenant_id', $tenantId)
            ->withSum(['batches as total_quantity' => function ($bq) {
                $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0);
            }], 'quantity_remaining')
            ->with(['batches' => fn ($bq) => $bq->whereNull('voided_at')->latest('id')])
            ->get()
            ->keyBy(fn ($cm) => "{$cm->medicine_variant_id}_".($cm->medicine_brand_id ?? 'null'));

        // 1. Search clinic stock first
        $clinicResults = ClinicMedicine::with([
            'variant.medicine',
            'brand',
            'batches' => fn ($bq) => $bq->whereNull('voided_at')->latest('id'),
        ])
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(display_name) LIKE ?', [$term])
                    ->orWhereHas('variant.medicine', fn ($mq) => $mq->whereRaw('LOWER(generic_name) LIKE ?', [$term])->orWhereRaw('LOWER(CAST(synonyms AS TEXT)) LIKE ?', [$term]))
                    ->orWhereHas('brand', fn ($bq) => $bq->whereRaw('LOWER(brand_name) LIKE ?', [$term]));
            })
            ->limit(10)
            ->get()
            ->map(function ($cm) {
                $lastBatch = $cm->batches?->first();
                $lastCostCents = $lastBatch?->cost_price_cents;

                return [
                    'source' => 'stock',
                    'in_stock' => true,
                    'clinic_medicine_id' => $cm->id,
                    'variant_id' => $cm->medicine_variant_id,
                    'brand_id' => $cm->medicine_brand_id,
                    'display_name' => $cm->display_name,
                    'generic_name' => $cm->variant?->medicine?->generic_name,
                    'strength_form' => $cm->variant?->display_name,
                    'brand_name' => $cm->brand?->brand_name,
                    'base_unit' => $cm->base_unit,
                    'selling_price_cents' => $cm->selling_price_cents,
                    'last_cost_cents' => $lastCostCents,
                    'total_quantity' => (int) $cm->total_quantity,
                    'is_custom' => $cm->variant?->medicine?->source === Medicine::SOURCE_CLINIC,
                    'synonym_hint' => null,
                    'existing_medicine' => [
                        'id' => $cm->id,
                        'display_name' => $cm->display_name,
                        'total_quantity' => (int) $cm->total_quantity,
                        'base_unit' => $cm->base_unit,
                        'last_cost_cents' => $lastCostCents,
                    ],
                ];
            });

        // 2. Search visible global catalog
        $catalogResults = Medicine::with(['variants.brands'])
            ->visibleToTenant($tenantId)
            ->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(generic_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(normalized_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(CAST(synonyms AS TEXT)) LIKE ?', [$term])
                    ->orWhereHas('variants.brands', fn ($bq) => $bq->whereRaw('LOWER(brand_name) LIKE ?', [$term]));
            })
            ->limit(15)
            ->get()
            ->flatMap(function ($medicine) use ($existingInStock, $lowerQuery) {
                $matchedSynonym = null;
                if (! empty($medicine->synonyms) && is_array($medicine->synonyms)) {
                    foreach ($medicine->synonyms as $syn) {
                        if (str_contains(strtolower((string) $syn), $lowerQuery)) {
                            $matchedSynonym = (string) $syn;
                            break;
                        }
                    }
                }
                $synonymHint = $matchedSynonym ? "matched '{$matchedSynonym}' → {$medicine->generic_name}" : null;
                $isCustom = $medicine->source === Medicine::SOURCE_CLINIC;

                $items = [];
                foreach ($medicine->variants as $variant) {
                    $genericKey = "{$variant->id}_null";
                    $existingGenericMed = $existingInStock->get($genericKey);

                    // Generic variant option
                    $items[] = [
                        'source' => 'catalog',
                        'in_stock' => (bool) $existingGenericMed,
                        'clinic_medicine_id' => $existingGenericMed?->id,
                        'variant_id' => $variant->id,
                        'brand_id' => null,
                        'display_name' => "{$medicine->generic_name} {$variant->display_name}",
                        'generic_name' => $medicine->generic_name,
                        'strength_form' => $variant->display_name,
                        'dosage_form' => $variant->dosage_form,
                        'strength' => $variant->strength_text,
                        'brand_name' => null,
                        'base_unit' => strtolower(explode(' ', $variant->dosage_form)[0] ?: 'tablet'),
                        'selling_price_cents' => 0,
                        'is_custom' => $isCustom,
                        'synonym_hint' => $synonymHint,
                        'rxterms_code' => $variant->rxterms_code ?? $medicine->rxterms_sxdg_rxcui ?? null,
                        'existing_medicine' => $existingGenericMed ? [
                            'id' => $existingGenericMed->id,
                            'display_name' => $existingGenericMed->display_name,
                            'total_quantity' => (int) ($existingGenericMed->total_quantity ?? 0),
                            'base_unit' => $existingGenericMed->base_unit,
                            'last_cost_cents' => $existingGenericMed->batches?->first()?->cost_price_cents,
                        ] : null,
                    ];

                    // Brand variant options
                    foreach ($variant->brands as $brand) {
                        $brandKey = "{$variant->id}_{$brand->id}";
                        $existingBrandMed = $existingInStock->get($brandKey);

                        $items[] = [
                            'source' => 'catalog',
                            'in_stock' => (bool) $existingBrandMed,
                            'clinic_medicine_id' => $existingBrandMed?->id,
                            'variant_id' => $variant->id,
                            'brand_id' => $brand->id,
                            'display_name' => "{$brand->brand_name} ({$medicine->generic_name}) {$variant->display_name}",
                            'generic_name' => $medicine->generic_name,
                            'strength_form' => $variant->display_name,
                            'dosage_form' => $variant->dosage_form,
                            'strength' => $variant->strength_text,
                            'brand_name' => $brand->brand_name,
                            'base_unit' => strtolower(explode(' ', $variant->dosage_form)[0] ?: 'tablet'),
                            'selling_price_cents' => 0,
                            'is_custom' => $isCustom,
                            'synonym_hint' => $synonymHint,
                            'rxterms_code' => $variant->rxterms_code ?? $medicine->rxterms_sxdg_rxcui ?? null,
                            'existing_medicine' => $existingBrandMed ? [
                                'id' => $existingBrandMed->id,
                                'display_name' => $existingBrandMed->display_name,
                                'total_quantity' => (int) ($existingBrandMed->total_quantity ?? 0),
                                'base_unit' => $existingBrandMed->base_unit,
                                'last_cost_cents' => $existingBrandMed->batches?->first()?->cost_price_cents,
                            ] : null,
                        ];
                    }
                }

                return $items;
            });

        $combined = $clinicResults->concat($catalogResults)->take(25)->values();

        return response()->json([
            'results' => $combined,
            'data' => $combined,
        ]);
    }

    /**
     * Add medicine to clinic stock, or create pending catalog rows.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $user = $request->user();

        $validated = $request->validate([
            'variant_id' => ['nullable', 'exists:medicine_variants,id'],
            'brand_id' => ['nullable', 'exists:medicine_brands,id'],
            'generic_name' => ['required_without:variant_id', 'nullable', 'string', 'max:255'],
            'strength' => ['required_without:variant_id', 'nullable', 'string', 'max:50'],
            'dosage_form' => ['required_without:variant_id', 'nullable', 'string', 'max:50'],
            'route' => ['nullable', 'string', 'max:50'],
            'brand_name' => ['nullable', 'string', 'max:255'],
            'manufacturer' => ['nullable', 'string', 'max:255'],
            'base_unit' => ['required', 'string', 'max:30'],
            'selling_price' => ['required', 'numeric', 'min:0.01'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'pack_size' => ['nullable', 'integer', 'min:1'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'shelf_location' => ['nullable', 'string', 'max:100'],
            'barcode' => ['nullable', 'string', 'max:100'],
            'new_barcode' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
            'opening_batches' => ['nullable', 'array'],
            'opening_batches.*.batch_number' => ['required_with:opening_batches', 'string', 'max:100'],
            'opening_batches.*.expiry_date' => ['required_with:opening_batches', 'date', 'after:today'],
            'opening_batches.*.quantity' => ['required_with:opening_batches', 'integer', 'min:1'],
            'opening_batches.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'opening_batches.*.supplier_id' => ['nullable', 'exists:suppliers,id'],
        ], [
            'selling_price.min' => 'Selling price must be greater than zero.',
            'opening_batches.*.batch_number.required_with' => 'Batch number is required for every opening batch (use N/A if none).',
            'opening_batches.*.expiry_date.required_with' => 'Expiry date is required for every opening batch.',
            'opening_batches.*.expiry_date.after' => 'Expiry date must be in the future.',
            'opening_batches.*.quantity.min' => 'Batch quantity must be greater than zero.',
        ]);

        $variantId = $validated['variant_id'] ?? null;
        $brandId = $validated['brand_id'] ?? null;

        // If new catalog submission required
        if (! $variantId) {
            $genericName = trim((string) $validated['generic_name']);
            $medicine = Medicine::firstOrCreate(
                [
                    'normalized_name' => strtolower($genericName),
                    'route' => $validated['route'] ?? 'Oral',
                ],
                [
                    'generic_name' => $genericName,
                    'is_combination' => str_contains($genericName, '/'),
                    'source' => Medicine::SOURCE_CLINIC,
                    'status' => Medicine::STATUS_PENDING,
                    'created_by_tenant_id' => $tenantId,
                    'created_by_user_id' => $user->id,
                ]
            );

            $variant = MedicineVariant::firstOrCreate(
                [
                    'medicine_id' => $medicine->id,
                    'strength_text' => trim((string) $validated['strength']),
                    'dosage_form' => trim((string) $validated['dosage_form']),
                    'form_detail' => null,
                ],
                [
                    'source' => MedicineVariant::SOURCE_CLINIC ?? 'clinic',
                    'status' => MedicineVariant::STATUS_PENDING,
                    'created_by_tenant_id' => $tenantId,
                ]
            );
            $variantId = $variant->id;

            if (! empty($validated['brand_name'])) {
                $brand = MedicineBrand::firstOrCreate(
                    [
                        'medicine_variant_id' => $variantId,
                        'brand_name' => trim((string) $validated['brand_name']),
                    ],
                    [
                        'manufacturer' => $validated['manufacturer'] ?? null,
                        'status' => MedicineBrand::STATUS_PENDING,
                        'created_by_tenant_id' => $tenantId,
                    ]
                );
                $brandId = $brand->id;
            }
        }

        $variant = MedicineVariant::with('medicine')->findOrFail($variantId);
        $brand = $brandId ? MedicineBrand::find($brandId) : null;

        $displayName = $brand
            ? "{$brand->brand_name} ({$variant->medicine->generic_name}) {$variant->strength_text}"
            : "{$variant->medicine->generic_name} {$variant->display_name}";

        // Prevent adding duplicate medicine to stock
        $existingStock = ClinicMedicine::where('tenant_id', $tenantId)
            ->where('medicine_variant_id', $variantId)
            ->where(function ($q) use ($brandId) {
                if ($brandId === null) {
                    $q->whereNull('medicine_brand_id');
                } else {
                    $q->where('medicine_brand_id', $brandId);
                }
            })
            ->first();

        if ($existingStock) {
            return redirect()->back()->withErrors([
                'variant_id' => "Already in your stock: {$existingStock->display_name}",
            ])->with('error', "Already in your stock: {$existingStock->display_name}");
        }

        // Validate Barcode uniqueness within tenant
        $rawBarcode = trim((string) ($validated['new_barcode'] ?? $validated['barcode'] ?? ''));
        if ($rawBarcode !== '') {
            $existingBarcode = MedicineBarcode::where('barcode', $rawBarcode)
                ->where(function ($q) use ($tenantId) {
                    $q->where('created_by_tenant_id', $tenantId)
                        ->orWhere('status', MedicineBarcode::STATUS_APPROVED);
                })
                ->first();

            if ($existingBarcode && $existingBarcode->medicine_brand_id !== $brandId) {
                return redirect()->back()->withErrors([
                    'barcode' => "Barcode {$rawBarcode} is already assigned to another medicine in this clinic.",
                    'new_barcode' => "Barcode {$rawBarcode} is already assigned to another medicine in this clinic.",
                ])->with('error', "Barcode {$rawBarcode} is already assigned to another medicine in this clinic.");
            }
        }

        $sellingPriceCents = (int) round(((float) $validated['selling_price']) * 100);

        $clinicMedicine = ClinicMedicine::create([
            'tenant_id' => $tenantId,
            'medicine_variant_id' => $variantId,
            'medicine_brand_id' => $brandId,
            'display_name' => $displayName,
            'base_unit' => strtolower($validated['base_unit']),
            'selling_price_cents' => $sellingPriceCents,
            'reorder_level' => array_key_exists('reorder_level', $validated) && $validated['reorder_level'] !== null && $validated['reorder_level'] !== '' ? (int) $validated['reorder_level'] : null,
            'shelf_location' => ! empty($validated['shelf_location']) ? trim((string) $validated['shelf_location']) : null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Link barcode if supplied
        if ($rawBarcode !== '') {
            $targetBrandId = $brandId;
            if (! $targetBrandId && $variantId) {
                $genericBrand = MedicineBrand::firstOrCreate([
                    'medicine_variant_id' => $variantId,
                    'brand_name' => 'Generic',
                ], [
                    'status' => MedicineBrand::STATUS_APPROVED,
                    'created_by_tenant_id' => $tenantId,
                ]);
                $targetBrandId = $genericBrand->id;
                $clinicMedicine->update(['medicine_brand_id' => $targetBrandId]);
            }

            if ($targetBrandId) {
                MedicineBarcode::firstOrCreate([
                    'barcode' => $rawBarcode,
                    'medicine_brand_id' => $targetBrandId,
                ], [
                    'pack_size' => (int) ($validated['pack_size'] ?? 1),
                    'status' => MedicineBarcode::STATUS_APPROVED,
                    'created_by_tenant_id' => $tenantId,
                ]);
            }
        }

        $totalOpeningQty = 0;
        if (! empty($validated['opening_batches'])) {
            $openingBatches = [];
            foreach ($validated['opening_batches'] as $b) {
                $costRupees = isset($b['cost_price']) && $b['cost_price'] !== '' ? (float) $b['cost_price'] : 0.0;
                $qty = (int) $b['quantity'];
                $openingBatches[] = [
                    'batch_number' => ! empty($b['batch_number']) ? trim((string) $b['batch_number']) : 'N/A',
                    'expiry_date' => $b['expiry_date'],
                    'quantity' => $qty,
                    'cost_price_cents' => (int) round($costRupees * 100),
                    'supplier_id' => $b['supplier_id'] ?? null,
                ];
                $totalOpeningQty += $qty;
            }
            $this->stockService->recordOpeningStock($clinicMedicine, $openingBatches, $user, $tenantId);
        }

        $baseUnit = $clinicMedicine->base_unit;
        $successMsg = $totalOpeningQty > 0
            ? "{$clinicMedicine->display_name} added · {$totalOpeningQty} {$baseUnit}s in stock"
            : "{$clinicMedicine->display_name} added to clinic stock";

        return redirect()->back()
            ->with('success', $successMsg)
            ->with('created_medicine_id', $clinicMedicine->id);
    }

    /**
     * Add batches to an existing clinic medicine without a full GRN (Quick Add Stock).
     */
    public function addBatches(Request $request, ClinicMedicine $medicine): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($medicine->tenant_id === $tenantId, 404);
        $user = $request->user();

        $validated = $request->validate([
            'batches' => ['required', 'array', 'min:1'],
            'batches.*.batch_number' => ['required', 'string', 'max:100'],
            'batches.*.expiry_date' => ['required', 'date', 'after:today'],
            'batches.*.quantity' => ['required', 'integer', 'min:1'],
            'batches.*.cost_price' => ['nullable', 'numeric', 'min:0'],
        ], [
            'batches.*.batch_number.required' => 'Batch number is required (use N/A if none).',
            'batches.*.expiry_date.required' => 'Expiry date is required for every batch.',
            'batches.*.expiry_date.after' => 'Expiry date must be in the future.',
            'batches.*.quantity.min' => 'Quantity must be greater than zero.',
        ]);

        $batches = array_map(function ($b) {
            $costRupees = isset($b['cost_price']) && $b['cost_price'] !== '' ? (float) $b['cost_price'] : 0.0;

            return [
                'batch_number' => $b['batch_number'],
                'expiry_date' => $b['expiry_date'],
                'quantity' => (int) $b['quantity'],
                'cost_price_cents' => (int) round($costRupees * 100),
            ];
        }, $validated['batches']);

        $this->stockService->addStockBatches($medicine, $batches, $user, $tenantId);

        return redirect()->back()->with('success', "Stock batches added to {$medicine->display_name} successfully.");
    }

    /**
     * Perform stock adjustment on a batch.
     */
    public function adjust(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $validated = $request->validate([
            'batch_id' => ['required', 'exists:stock_batches,id'],
            'type' => ['required', 'in:adjustment_in,adjustment_out,expired,damaged,return_to_supplier'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $this->stockService->adjustStock(
                (int) $validated['batch_id'],
                $validated['type'],
                (int) $validated['quantity'],
                $validated['reason'],
                $request->user(),
                $tenantId
            );

            return redirect()->back()->with('success', 'Stock adjustment recorded in ledger.');
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['quantity' => $e->getMessage()]);
        }
    }

    /**
     * Toggle active status.
     */
    public function toggleActive(ClinicMedicine $medicine): RedirectResponse
    {
        abort_unless($medicine->tenant_id === tenant('id'), 404);

        $medicine->update(['is_active' => ! $medicine->is_active]);

        return redirect()->back()->with('success', 'Medicine status updated.');
    }

    /**
     * Update clinic medicine settings (selling price, reorder level, shelf location, unit, status).
     */
    public function update(Request $request, ClinicMedicine $medicine): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($medicine->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'shelf_location' => ['nullable', 'string', 'max:100'],
            'base_unit' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'medicine_brand_id' => ['nullable', 'exists:medicine_brands,id'],
            'brand_name' => ['nullable', 'string', 'max:150'],
            'new_barcode' => ['nullable', 'string', 'max:100'],
        ]);

        $hasMovements = $medicine->movements()->exists() || $medicine->batches()->where('quantity_received', '>', 0)->exists();

        if (array_key_exists('base_unit', $validated) && $validated['base_unit'] !== null && $validated['base_unit'] !== $medicine->base_unit) {
            if ($hasMovements) {
                return redirect()->back()->withErrors([
                    'base_unit' => 'Base unit cannot be changed once stock movements exist.',
                ]);
            }
        }

        $oldData = [
            'selling_price_cents' => $medicine->selling_price_cents,
            'reorder_level' => $medicine->reorder_level,
            'shelf_location' => $medicine->shelf_location,
            'base_unit' => $medicine->base_unit,
            'is_active' => $medicine->is_active,
            'medicine_brand_id' => $medicine->medicine_brand_id,
        ];

        $updates = [];
        if (array_key_exists('selling_price', $validated)) {
            $updates['selling_price_cents'] = $validated['selling_price'] !== null && $validated['selling_price'] !== ''
                ? (int) round(((float) $validated['selling_price']) * 100)
                : 0;
        }
        if (array_key_exists('reorder_level', $validated)) {
            $updates['reorder_level'] = $validated['reorder_level'] !== null && $validated['reorder_level'] !== ''
                ? (int) $validated['reorder_level']
                : null;
        }
        if (array_key_exists('shelf_location', $validated)) {
            $updates['shelf_location'] = $validated['shelf_location'] ? trim($validated['shelf_location']) : null;
        }
        if (array_key_exists('base_unit', $validated) && ! $hasMovements && ! empty($validated['base_unit'])) {
            $updates['base_unit'] = trim($validated['base_unit']);
        }
        if (array_key_exists('is_active', $validated)) {
            $updates['is_active'] = (bool) $validated['is_active'];
        }

        // Brand handling
        if (array_key_exists('brand_name', $validated)) {
            $bName = trim((string) $validated['brand_name']);
            if ($bName === '' || strcasecmp($bName, 'generic') === 0) {
                $updates['medicine_brand_id'] = null;
            } elseif ($medicine->medicine_variant_id) {
                $brand = MedicineBrand::firstOrCreate([
                    'medicine_variant_id' => $medicine->medicine_variant_id,
                    'brand_name' => $bName,
                ], [
                    'status' => MedicineBrand::STATUS_APPROVED,
                    'created_by_tenant_id' => $tenantId,
                ]);
                $updates['medicine_brand_id'] = $brand->id;
            }
        } elseif (array_key_exists('medicine_brand_id', $validated)) {
            $updates['medicine_brand_id'] = $validated['medicine_brand_id'] ? (int) $validated['medicine_brand_id'] : null;
        }

        // Barcode uniqueness and linking
        if (! empty($validated['new_barcode'])) {
            $code = trim((string) $validated['new_barcode']);
            $existingBarcode = MedicineBarcode::where('barcode', $code)
                ->where(function ($q) use ($tenantId) {
                    $q->where('created_by_tenant_id', $tenantId)
                        ->orWhere('status', MedicineBarcode::STATUS_APPROVED);
                })
                ->first();

            $targetBrandId = $updates['medicine_brand_id'] ?? $medicine->medicine_brand_id;

            if ($existingBarcode && $existingBarcode->medicine_brand_id !== $targetBrandId) {
                return redirect()->back()->withErrors([
                    'new_barcode' => "Barcode {$code} is already assigned to another medicine in this clinic.",
                ]);
            }

            if (! $targetBrandId && $medicine->medicine_variant_id) {
                $genericBrand = MedicineBrand::firstOrCreate([
                    'medicine_variant_id' => $medicine->medicine_variant_id,
                    'brand_name' => 'Generic',
                ], [
                    'status' => MedicineBrand::STATUS_APPROVED,
                    'created_by_tenant_id' => $tenantId,
                ]);
                $targetBrandId = $genericBrand->id;
                $updates['medicine_brand_id'] = $targetBrandId;
            }

            if ($targetBrandId) {
                MedicineBarcode::firstOrCreate([
                    'barcode' => $code,
                    'medicine_brand_id' => $targetBrandId,
                ], [
                    'pack_size' => 1,
                    'status' => MedicineBarcode::STATUS_APPROVED,
                    'created_by_tenant_id' => $tenantId,
                ]);
            }
        }

        $medicine->update($updates);

        $newData = [
            'selling_price_cents' => $medicine->selling_price_cents,
            'reorder_level' => $medicine->reorder_level,
            'shelf_location' => $medicine->shelf_location,
            'base_unit' => $medicine->base_unit,
            'is_active' => $medicine->is_active,
        ];

        AuditLogger::log('stock.medicine_updated', [
            'tenant_id' => $tenantId,
            'user_id' => $request->user()?->id,
            'resource' => $medicine,
            'metadata' => [
                'old' => $oldData,
                'new' => $newData,
            ],
        ]);

        return redirect()->back()->with('success', "Updated {$medicine->display_name} successfully.");
    }

    /**
     * Remove clinic medicine from stock.
     * Hard delete is blocked if any batch, stock movement, prescription or bill line exists.
     * Only zero-history items can be deleted; others must be deactivated.
     */
    public function destroy(ClinicMedicine $medicine): RedirectResponse|JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($medicine->tenant_id === $tenantId, 404);

        $hasBatches = $medicine->batches()->exists();
        $hasMovements = $medicine->movements()->exists();
        $hasPrescriptions = PrescriptionItem::where('clinic_medicine_id', $medicine->id)
            ->orWhere('dispensed_clinic_medicine_id', $medicine->id)
            ->exists();
        $hasTemplates = PrescriptionTemplateItem::where('clinic_medicine_id', $medicine->id)->exists();
        $hasBills = BillItem::where('clinic_medicine_id', $medicine->id)->exists();

        if ($hasBatches || $hasMovements || $hasPrescriptions || $hasTemplates || $hasBills) {
            if (request()->wantsJson()) {
                return response()->json([
                    'error' => 'Cannot delete medicine with existing clinical or inventory history (batches, movements, prescriptions, or bills). Please deactivate it instead.',
                ], 422);
            }

            return redirect()->back()->withErrors([
                'error' => 'Cannot delete medicine with existing clinical or inventory history (batches, movements, prescriptions, or bills). Please deactivate it instead.',
            ]);
        }

        $displayName = $medicine->display_name;

        AuditLogger::log('stock.medicine_deleted', [
            'tenant_id' => $tenantId,
            'user_id' => auth()->id(),
            'metadata' => [
                'medicine_id' => $medicine->id,
                'display_name' => $displayName,
            ],
        ]);

        $medicine->delete();

        return redirect()->route('tenant.pharmacy.medicines')
            ->with('success', "{$displayName} removed from stock.");
    }

    /**
     * Merge a duplicate clinic medicine into a kept clinic medicine.
     */
    public function merge(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $validated = $request->validate([
            'kept_id' => ['required', 'integer', 'exists:clinic_medicines,id'],
            'merged_id' => ['required', 'integer', 'exists:clinic_medicines,id', 'different:kept_id'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $kept = ClinicMedicine::where('tenant_id', $tenantId)->findOrFail((int) $validated['kept_id']);
        $merged = ClinicMedicine::where('tenant_id', $tenantId)->findOrFail((int) $validated['merged_id']);

        try {
            $this->duplicateService->mergeMedicines(
                $kept,
                $merged,
                $request->user(),
                $tenantId,
                $validated['reason'] ?? null
            );

            return redirect()->back()->with('success', "Merged '{$merged->display_name}' into '{$kept->display_name}'. All batches, movements, and prescriptions have been redirected.");
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['merge' => $e->getMessage()]);
        }
    }

    /**
     * Dismiss a possible duplicate pair warning.
     */
    public function dismissDuplicate(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $validated = $request->validate([
            'pair_key' => ['required', 'string', 'max:50'],
        ]);

        $this->duplicateService->dismissDuplicatePair(
            $validated['pair_key'],
            $request->user(),
            $tenantId
        );

        return redirect()->back()->with('success', 'Possible duplicate flag dismissed.');
    }

    /**
     * Export all clinic stock as a CSV file (Permission-gated & Audit-logged).
     */
    public function export(Request $request): StreamedResponse
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $user = $request->user();

        $medicines = ClinicMedicine::where('tenant_id', $tenantId)
            ->with(['variant.medicine', 'brand.barcodes', 'batches' => fn ($bq) => $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0)])
            ->orderBy('display_name', 'asc')
            ->get();

        AuditLogger::log('stock.csv_exported', [
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'metadata' => [
                'total_exported' => $medicines->count(),
            ],
        ]);

        $fileName = 'clinic_stock_'.date('Y_m_d_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($medicines, $tenant) {
            $handle = fopen('php://output', 'w');
            // UTF-8 BOM
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'ID',
                'Medicine Name',
                'Generic Name',
                'Strength',
                'Dosage Form',
                'Brand Name',
                'Barcode',
                'Base Unit',
                'Total Stock',
                'Reorder Level',
                'Selling Price (LKR)',
                'Nearest Expiry',
                'Shelf Location',
                'Status',
            ]);

            $defaultReorder = (int) ($tenant->pharmacy_default_reorder_level ?? 10);
            $today = now()->toDateString();

            foreach ($medicines as $m) {
                $qty = (int) $m->batches->sum('quantity_remaining');
                $reorder = $m->reorder_level !== null ? (int) $m->reorder_level : $defaultReorder;
                $nearestExp = $m->batches->sortBy('expiry_date')->first()?->expiry_date?->format('d/m/Y') ?? 'N/A';
                $barcode = $m->brand?->barcodes?->pluck('barcode')->join(', ') ?? '';

                $status = 'In Stock';
                if (! $m->is_active) {
                    $status = 'Inactive';
                } elseif ($qty <= 0) {
                    $status = 'Out of Stock';
                } elseif ($qty <= $reorder) {
                    $status = 'Low Stock';
                }

                $sellingLkr = number_format(($m->selling_price_cents ?? 0) / 100, 2, '.', '');

                fputcsv($handle, [
                    $m->id,
                    $m->display_name,
                    $m->variant?->medicine?->generic_name ?? 'Generic',
                    $m->variant?->strength_text ?? '—',
                    $m->variant?->dosage_form ?? '—',
                    $m->brand?->brand_name ?? 'Generic',
                    $barcode,
                    $m->base_unit,
                    $qty,
                    $reorder,
                    $sellingLkr,
                    $nearestExp,
                    $m->shelf_location ?? '',
                    $status,
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Edit batch details (metadata: batch_number, expiry_date, cost_price, supplier).
     * Quantities cannot be edited here.
     */
    public function updateBatch(Request $request, StockBatch $batch): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($batch->tenant_id === $tenantId, 404);

        if ($batch->voided_at !== null) {
            return redirect()->back()->withErrors(['batch' => 'Cannot edit a voided batch.']);
        }

        $validated = $request->validate([
            'batch_number' => ['required', 'string', 'max:100'],
            'expiry_date' => ['required', 'date'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
        ]);

        if ($batch->received_at !== null) {
            $receivedDate = $batch->received_at->toDateString();
            if ($validated['expiry_date'] <= $receivedDate) {
                return redirect()->back()->withErrors([
                    'expiry_date' => "Expiry date must be after the received date ({$batch->received_at->format('d/m/Y')}).",
                ]);
            }
        }

        $oldData = [
            'batch_number' => $batch->batch_number,
            'expiry_date' => $batch->expiry_date?->toDateString(),
            'cost_price_cents' => $batch->cost_price_cents,
            'supplier_id' => $batch->supplier_id,
        ];

        $costCents = (int) round(((float) $validated['cost_price']) * 100);

        $batch->update([
            'batch_number' => trim($validated['batch_number']),
            'expiry_date' => $validated['expiry_date'],
            'cost_price_cents' => $costCents,
            'supplier_id' => ! empty($validated['supplier_id']) ? (int) $validated['supplier_id'] : null,
        ]);

        $newData = [
            'batch_number' => $batch->batch_number,
            'expiry_date' => $batch->expiry_date?->toDateString(),
            'cost_price_cents' => $batch->cost_price_cents,
            'supplier_id' => $batch->supplier_id,
        ];

        AuditLogger::log('stock.batch_updated', [
            'tenant_id' => $tenantId,
            'user_id' => $request->user()?->id,
            'resource' => $batch,
            'metadata' => [
                'old' => $oldData,
                'new' => $newData,
            ],
        ]);

        return redirect()->back()->with('success', "Batch {$batch->batch_number} updated successfully.");
    }

    /**
     * Void a single batch and reverse its remaining stock.
     */
    public function voidBatch(Request $request, StockBatch $batch): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($batch->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $this->stockService->voidBatch(
                $batch,
                $validated['reason'],
                $request->user(),
                $tenantId
            );

            return redirect()->back()->with('success', "Batch {$batch->batch_number} voided and remaining stock reversed.");
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['reason' => $e->getMessage()]);
        }
    }
}
