<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\AuditLogger;
use App\Services\Pharmacy\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class StockController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Display the clinic medicine inventory stock list.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        $search = trim((string) $request->input('search', ''));
        $filter = $request->input('filter', 'all'); // all, low_stock, out_of_stock, expiring_soon, expired, inactive
        $expiringDays = (int) $request->input('expiring_days', $tenant->pharmacy_expiring_soon_days ?? 60);

        $query = ClinicMedicine::query()
            ->with([
                'variant.medicine',
                'brand',
                'batches' => function ($bq) {
                    $bq->whereNull('voided_at')
                        ->where('quantity_remaining', '>', 0)
                        ->with('supplier')
                        ->orderByRaw('expiry_date ASC NULLS LAST');
                },
            ])
            ->withSum(['batches as total_quantity' => function ($bq) {
                $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0);
            }], 'quantity_remaining')
            ->withExists('movements')
            ->where('tenant_id', $tenantId);

        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(display_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(shelf_location) LIKE ?', [$term])
                    ->orWhereHas('variant.medicine', function ($mq) use ($term) {
                        $mq->whereRaw('LOWER(generic_name) LIKE ?', [$term]);
                    })
                    ->orWhereHas('brand', function ($bq) use ($term) {
                        $bq->whereRaw('LOWER(brand_name) LIKE ?', [$term]);
                    });
            });
        }

        $today = now()->toDateString();
        $expiringThreshold = now()->addDays($expiringDays)->toDateString();

        if ($filter === 'inactive') {
            $query->where('is_active', false);
        } else {
            $query->where('is_active', true);

            if ($filter === 'out_of_stock') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('batches')
                        ->orWhereDoesntHave('batches', function ($bq) {
                            $bq->whereNull('voided_at')->where('quantity_remaining', '>', 0);
                        })
                        ->orWhereRaw('(SELECT COALESCE(SUM(quantity_remaining), 0) FROM stock_batches WHERE stock_batches.clinic_medicine_id = clinic_medicines.id AND stock_batches.voided_at IS NULL) <= 0');
                });
            } elseif ($filter === 'low_stock') {
                $query->whereRaw('(SELECT COALESCE(SUM(quantity_remaining), 0) FROM stock_batches WHERE stock_batches.clinic_medicine_id = clinic_medicines.id AND stock_batches.voided_at IS NULL) > 0')
                    ->whereRaw('(SELECT COALESCE(SUM(quantity_remaining), 0) FROM stock_batches WHERE stock_batches.clinic_medicine_id = clinic_medicines.id AND stock_batches.voided_at IS NULL) <= COALESCE(clinic_medicines.reorder_level, ?)', [$tenant->pharmacy_default_reorder_level ?? 10]);
            } elseif ($filter === 'expiring_soon') {
                $query->whereHas('batches', function ($bq) use ($today, $expiringThreshold) {
                    $bq->whereNull('voided_at')
                        ->where('quantity_remaining', '>', 0)
                        ->whereNotNull('expiry_date')
                        ->where('expiry_date', '>=', $today)
                        ->where('expiry_date', '<=', $expiringThreshold);
                });
            } elseif ($filter === 'expired') {
                $query->whereHas('batches', function ($bq) use ($today) {
                    $bq->whereNull('voided_at')
                        ->where('quantity_remaining', '>', 0)
                        ->whereNotNull('expiry_date')
                        ->where('expiry_date', '<', $today);
                });
            }
        }

        $medicines = $query->latest('id')->paginate(30)->withQueryString()->through(function ($cm) use ($today, $expiringThreshold) {
            $totalQuantity = (int) ($cm->total_quantity ?? 0);
            $nearestBatch = $cm->batches->first();
            $nearestExpiry = $nearestBatch?->expiry_date?->toDateString();

            $status = 'in_stock';
            if (! $cm->is_active) {
                $status = 'inactive';
            } elseif ($totalQuantity <= 0) {
                $status = 'out_of_stock';
            } elseif ($nearestExpiry && $nearestExpiry < $today) {
                $status = 'expired';
            } elseif ($nearestExpiry && $nearestExpiry <= $expiringThreshold) {
                $status = 'expiring_soon';
            } elseif ($cm->reorder_level !== null && $totalQuantity <= $cm->reorder_level) {
                $status = 'low_stock';
            }

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
                    'expiry_date' => $exp,
                    'quantity_remaining' => (int) $b->quantity_remaining,
                    'quantity_received' => (int) $b->quantity_received,
                    'cost_price_cents' => (int) $b->cost_price_cents,
                    'supplier_id' => $b->supplier_id,
                    'supplier_name' => $b->supplier?->name ?? '—',
                    'received_at' => $b->received_at?->toDateString(),
                    'status' => $bStatus,
                ];
            })->values()->all();

            $allActiveExpiries = $cm->batches
                ->pluck('expiry_date')
                ->filter()
                ->map(fn ($d) => $d->toDateString())
                ->values()
                ->all();

            return [
                'id' => $cm->id,
                'display_name' => $cm->display_name,
                'generic_name' => $cm->variant?->medicine?->generic_name ?? '-',
                'strength_form' => $cm->variant?->display_name ?? '-',
                'brand_name' => $cm->brand?->brand_name,
                'base_unit' => $cm->base_unit,
                'selling_price_cents' => (int) ($cm->selling_price_cents ?? 0),
                'reorder_level' => $cm->reorder_level !== null ? (int) $cm->reorder_level : null,
                'shelf_location' => $cm->shelf_location,
                'is_active' => (bool) $cm->is_active,
                'total_quantity' => $totalQuantity,
                'nearest_expiry' => $nearestExpiry,
                'all_active_expiries' => $allActiveExpiries,
                'extra_batches_count' => max(0, count($allActiveExpiries) - 1),
                'batch_count' => count($activeBatches),
                'batches' => $activeBatches,
                'has_movements' => (bool) $cm->movements_exists,
                'status' => $status,
            ];
        });

        $suppliers = Supplier::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Tenant/Pharmacy/Medicines/Index', [
            'medicines' => $medicines,
            'suppliers' => $suppliers,
            'filters' => [
                'search' => $search,
                'filter' => $filter,
                'expiring_days' => $expiringDays,
            ],
            'settings' => [
                'default_reorder_level' => (int) ($tenant->pharmacy_default_reorder_level ?? 10),
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

        $hasMovements = $medicine->movements()->exists() || $medicine->batches()->where('quantity_received', '>', 0)->exists();

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
                'quantity_received' => (int) $b->quantity_received,
                'quantity_remaining' => (int) $b->quantity_remaining,
                'cost_price_cents' => (int) $b->cost_price_cents,
                'supplier_id' => $b->supplier_id,
                'supplier_name' => $b->supplier?->name,
                'receipt_id' => $b->stock_receipt_id,
                'receipt_number' => $b->receipt?->receipt_number,
                'received_at' => $b->received_at?->toDateString(),
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
                'created_at' => $m->created_at->format('M d, Y h:i A'),
                'created_at_raw' => $m->created_at->toIso8601String(),
            ]);

        return response()->json([
            'medicine' => [
                'id' => $medicine->id,
                'display_name' => $medicine->display_name,
                'generic_name' => $medicine->variant?->medicine?->generic_name,
                'strength_form' => $medicine->variant?->display_name,
                'brand_name' => $medicine->brand?->brand_name,
                'base_unit' => $medicine->base_unit,
                'selling_price_cents' => (int) ($medicine->selling_price_cents ?? 0),
                'reorder_level' => $medicine->reorder_level !== null ? (int) $medicine->reorder_level : null,
                'shelf_location' => $medicine->shelf_location,
                'is_active' => (bool) $medicine->is_active,
                'total_quantity' => (int) $medicine->total_quantity,
                'has_movements' => $hasMovements,
            ],
            'batches' => $batches,
            'movements' => $movements,
        ]);
    }

    /**
     * Unified fast search across clinic stock and visible global catalog.
     */
    public function searchCatalog(Request $request): JsonResponse
    {
        $tenantId = tenant('id');
        $query = trim((string) $request->input('q', ''));

        if ($query === '') {
            return response()->json(['results' => []]);
        }

        $term = '%'.strtolower($query).'%';

        // 1. Search clinic stock first
        $clinicResults = ClinicMedicine::with(['variant.medicine', 'brand'])
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(display_name) LIKE ?', [$term])
                    ->orWhereHas('variant.medicine', fn ($mq) => $mq->whereRaw('LOWER(generic_name) LIKE ?', [$term])->orWhereRaw('LOWER(CAST(synonyms AS TEXT)) LIKE ?', [$term]))
                    ->orWhereHas('brand', fn ($bq) => $bq->whereRaw('LOWER(brand_name) LIKE ?', [$term]));
            })
            ->limit(10)
            ->get()
            ->map(fn ($cm) => [
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
                'total_quantity' => $cm->total_quantity,
            ]);

        // Pre-fetch in-stock items for this tenant to flag catalog items
        $existingInStock = ClinicMedicine::where('tenant_id', $tenantId)
            ->get(['medicine_variant_id', 'medicine_brand_id'])
            ->map(fn ($cm) => "{$cm->medicine_variant_id}_".($cm->medicine_brand_id ?? 'null'))
            ->flip()
            ->all();

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
            ->flatMap(function ($medicine) use ($existingInStock) {
                $items = [];
                foreach ($medicine->variants as $variant) {
                    $genericKey = "{$variant->id}_null";
                    $isGenericInStock = isset($existingInStock[$genericKey]);

                    // Generic variant option
                    $items[] = [
                        'source' => 'catalog',
                        'in_stock' => $isGenericInStock,
                        'clinic_medicine_id' => null,
                        'variant_id' => $variant->id,
                        'brand_id' => null,
                        'display_name' => "{$medicine->generic_name} {$variant->display_name}",
                        'generic_name' => $medicine->generic_name,
                        'strength_form' => $variant->display_name,
                        'brand_name' => null,
                        'base_unit' => strtolower(explode(' ', $variant->dosage_form)[0] ?: 'tablet'),
                        'selling_price_cents' => 0,
                    ];

                    // Brand variant options
                    foreach ($variant->brands as $brand) {
                        $brandKey = "{$variant->id}_{$brand->id}";
                        $isBrandInStock = isset($existingInStock[$brandKey]);

                        $items[] = [
                            'source' => 'catalog',
                            'in_stock' => $isBrandInStock,
                            'clinic_medicine_id' => null,
                            'variant_id' => $variant->id,
                            'brand_id' => $brand->id,
                            'display_name' => "{$brand->brand_name} ({$medicine->generic_name}) {$variant->display_name}",
                            'generic_name' => $medicine->generic_name,
                            'strength_form' => $variant->display_name,
                            'brand_name' => $brand->brand_name,
                            'base_unit' => strtolower(explode(' ', $variant->dosage_form)[0] ?: 'tablet'),
                            'selling_price_cents' => 0,
                        ];
                    }
                }

                return $items;
            });

        return response()->json([
            'results' => $clinicResults->concat($catalogResults)->take(25)->values(),
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
            'selling_price' => ['required', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'shelf_location' => ['nullable', 'string', 'max:100'],
            'opening_batches' => ['nullable', 'array'],
            'opening_batches.*.batch_number' => ['required_with:opening_batches', 'string', 'max:100'],
            'opening_batches.*.expiry_date' => ['required_with:opening_batches', 'date', 'after:today'],
            'opening_batches.*.quantity' => ['required_with:opening_batches', 'integer', 'min:1'],
            'opening_batches.*.cost_price' => ['nullable', 'numeric', 'min:0'],
        ], [
            'opening_batches.*.batch_number.required_with' => 'Batch number is required for every opening batch (use N/A if none).',
            'opening_batches.*.expiry_date.required_with' => 'Expiry date is required for every opening batch.',
            'opening_batches.*.expiry_date.after' => 'Expiry date must be in the future.',
            'opening_batches.*.quantity.min' => 'Batch quantity must be greater than zero.',
        ]);

        $variantId = $validated['variant_id'] ?? null;
        $brandId = $validated['brand_id'] ?? null;

        // If new catalog submission required
        if (! $variantId) {
            $genericName = trim($validated['generic_name']);
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
                    'strength_text' => trim($validated['strength']),
                    'dosage_form' => trim($validated['dosage_form']),
                    'form_detail' => null,
                ],
                [
                    'source' => Medicine::SOURCE_CLINIC,
                    'status' => MedicineVariant::STATUS_PENDING,
                    'created_by_tenant_id' => $tenantId,
                ]
            );
            $variantId = $variant->id;

            if (! empty($validated['brand_name'])) {
                $brand = MedicineBrand::firstOrCreate(
                    [
                        'medicine_variant_id' => $variantId,
                        'brand_name' => trim($validated['brand_name']),
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

        $sellingPriceCents = (int) round(((float) $validated['selling_price']) * 100);

        $clinicMedicine = ClinicMedicine::create([
            'tenant_id' => $tenantId,
            'medicine_variant_id' => $variantId,
            'medicine_brand_id' => $brandId,
            'display_name' => $displayName,
            'base_unit' => strtolower($validated['base_unit']),
            'selling_price_cents' => $sellingPriceCents,
            'reorder_level' => isset($validated['reorder_level']) ? (int) $validated['reorder_level'] : null,
            'shelf_location' => $validated['shelf_location'] ?? null,
            'is_active' => true,
        ]);

        if (! empty($validated['opening_batches'])) {
            $openingBatches = [];
            foreach ($validated['opening_batches'] as $b) {
                $costRupees = isset($b['cost_price']) && $b['cost_price'] !== '' ? (float) $b['cost_price'] : 0.0;
                $openingBatches[] = [
                    'batch_number' => $b['batch_number'],
                    'expiry_date' => $b['expiry_date'],
                    'quantity' => (int) $b['quantity'],
                    'cost_price_cents' => (int) round($costRupees * 100),
                ];
            }
            $this->stockService->recordOpeningStock($clinicMedicine, $openingBatches, $user, $tenantId);
        }

        return redirect()->back()->with('success', "{$clinicMedicine->display_name} added to clinic stock.");
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
     * Remove clinic medicine from stock (allowed only if no movements exist).
     */
    public function destroy(ClinicMedicine $medicine): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($medicine->tenant_id === $tenantId, 404);

        $hasMovements = $medicine->movements()->exists() || $medicine->batches()->exists();
        if ($hasMovements) {
            return redirect()->back()->withErrors([
                'error' => 'Cannot remove medicine with existing stock movements or batches. You can mark it inactive instead.',
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
