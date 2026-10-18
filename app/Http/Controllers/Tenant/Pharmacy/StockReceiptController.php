<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\ClinicMedicine;
use App\Models\MedicineBrand;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Services\Pharmacy\BarcodeService;
use App\Services\Pharmacy\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class StockReceiptController extends Controller
{
    public function __construct(
        protected StockService $stockService,
        protected BarcodeService $barcodeService
    ) {}

    /**
     * Display the list of Goods Received Notes (GRNs).
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status', 'all'); // all, received, voided

        $query = StockReceipt::query()
            ->with(['supplier', 'creator', 'voidedByUser'])
            ->withCount('batches as lines_count')
            ->withSum('batches as total_units_received', 'quantity_received')
            ->where('tenant_id', $tenantId);

        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(receipt_number) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(invoice_number) LIKE ?', [$term])
                    ->orWhereHas('supplier', fn ($sq) => $sq->whereRaw('LOWER(name) LIKE ?', [$term]));
            });
        }

        if ($status === 'voided') {
            $query->where('status', StockReceipt::STATUS_VOIDED);
        } elseif ($status === 'received') {
            $query->where('status', StockReceipt::STATUS_RECEIVED);
        }

        $receipts = $query->latest('id')->paginate(20)->withQueryString()->through(function ($r) {
            return [
                'id' => $r->id,
                'receipt_number' => $r->receipt_number,
                'status' => $r->status,
                'received_date' => $r->received_date?->toDateString(),
                'supplier_name' => $r->supplier?->name ?? '—',
                'supplier_id' => $r->supplier_id,
                'invoice_number' => $r->invoice_number,
                'notes' => $r->notes,
                'total_cost_cents' => (int) $r->total_cost_cents,
                'lines_count' => (int) $r->lines_count,
                'total_units_received' => (int) ($r->total_units_received ?? 0),
                'created_by_name' => $r->creator?->name ?? 'System',
                'created_at' => $r->created_at?->toIso8601String(),
                'voided_at' => $r->voided_at?->toIso8601String(),
                'voided_by_name' => $r->voidedByUser?->name,
                'void_reason' => $r->void_reason,
            ];
        });

        return Inertia::render('Tenant/Pharmacy/Receipts/Index', [
            'receipts' => $receipts,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Show the Receive Stock (GRN) form.
     */
    public function create(): Response
    {
        $tenantId = tenant('id');
        $suppliers = Supplier::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'phone']);

        return Inertia::render('Tenant/Pharmacy/Receipts/Create', [
            'suppliers' => $suppliers,
            'defaultDate' => now()->toDateString(),
        ]);
    }

    /**
     * Save the Goods Received Note (GRN) and create batches & movements.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $user = $request->user();

        $validated = $request->validate([
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'received_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.clinic_medicine_id' => ['nullable', 'exists:clinic_medicines,id'],
            'items.*.medicine_variant_id' => ['nullable', 'exists:medicine_variants,id'],
            'items.*.medicine_brand_id' => ['nullable', 'exists:medicine_brands,id'],
            'items.*.display_name' => ['nullable', 'string'],
            'items.*.base_unit' => ['nullable', 'string'],
            'items.*.batch_number' => ['required', 'string', 'max:100'],
            'items.*.expiry_date' => ['required', 'date', 'after:received_date'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.cost_price' => ['required', 'numeric', 'min:0'],
            'items.*.selling_price' => ['nullable', 'numeric', 'min:0'],
        ], [
            'items.*.batch_number.required' => 'Batch number is required for every line (use N/A if none).',
            'items.*.expiry_date.required' => 'Expiry date is required for every line.',
            'items.*.expiry_date.after' => 'Expiry date must be after the received date.',
        ]);

        // Transform rupees to cents for cost_price and selling_price
        $items = array_map(function ($item) {
            $item['cost_price_cents'] = (int) round(((float) $item['cost_price']) * 100);
            if (isset($item['selling_price']) && $item['selling_price'] !== '') {
                $item['selling_price_cents'] = (int) round(((float) $item['selling_price']) * 100);
            }

            return $item;
        }, $validated['items']);

        $receipt = $this->stockService->receiveStock([
            'supplier_id' => ! empty($validated['supplier_id']) ? (int) $validated['supplier_id'] : null,
            'invoice_number' => $validated['invoice_number'] ?? null,
            'received_date' => $validated['received_date'],
            'notes' => $validated['notes'] ?? null,
            'items' => $items,
        ], $user, $tenantId);

        return redirect()->route('tenant.pharmacy.medicines')
            ->with('success', "Stock received successfully via GRN {$receipt->receipt_number}.");
    }

    /**
     * Resolve barcode via BarcodeService.
     */
    public function lookupBarcode(string $code): JsonResponse
    {
        $tenantId = tenant('id');
        $barcode = $this->barcodeService->lookup($code, $tenantId);

        if (! $barcode) {
            return response()->json([
                'found' => false,
                'barcode' => $code,
            ]);
        }

        $brand = $barcode->brand;
        $variant = $brand?->variant;
        $medicine = $variant?->medicine;

        $clinicMedicine = ClinicMedicine::where('tenant_id', $tenantId)
            ->where('medicine_variant_id', $variant?->id)
            ->where('medicine_brand_id', $brand?->id)
            ->first();

        return response()->json([
            'found' => true,
            'barcode' => $barcode->barcode,
            'pack_size' => $barcode->pack_size,
            'clinic_medicine_id' => $clinicMedicine?->id,
            'brand_id' => $brand?->id,
            'brand_name' => $brand?->brand_name,
            'variant_id' => $variant?->id,
            'variant_display' => $variant?->display_name,
            'generic_name' => $medicine?->generic_name,
            'base_unit' => strtolower(explode(' ', $variant?->dosage_form ?? 'tablet')[0] ?: 'tablet'),
        ]);
    }

    /**
     * Get brands for a specific variant visible to this tenant.
     */
    public function getVariantBrands(int $variantId): JsonResponse
    {
        $tenantId = tenant('id');
        $brands = MedicineBrand::where('medicine_variant_id', $variantId)
            ->visibleToTenant($tenantId)
            ->orderBy('brand_name')
            ->get(['id', 'brand_name', 'manufacturer', 'status']);

        return response()->json(['brands' => $brands]);
    }

    /**
     * Link an unknown barcode to a medicine brand.
     */
    public function linkBarcode(Request $request): JsonResponse
    {
        $tenantId = tenant('id');
        $validated = $request->validate([
            'barcode' => ['required', 'string', 'max:100'],
            'pack_size' => ['required', 'integer', 'min:1'],
            'medicine_brand_id' => ['nullable', 'exists:medicine_brands,id'],
            'medicine_variant_id' => ['nullable', 'exists:medicine_variants,id'],
            'brand_name' => ['nullable', 'string', 'max:150'],
            'manufacturer' => ['nullable', 'string', 'max:150'],
        ]);

        $code = trim($validated['barcode']);
        $packSize = (int) $validated['pack_size'];
        $brandId = ! empty($validated['medicine_brand_id']) ? (int) $validated['medicine_brand_id'] : null;

        if (! $brandId) {
            if (empty($validated['medicine_variant_id']) || empty($validated['brand_name'])) {
                return response()->json([
                    'message' => 'Please select an existing brand or provide a variant and brand name.',
                ], 422);
            }

            $brand = MedicineBrand::firstOrCreate(
                [
                    'medicine_variant_id' => (int) $validated['medicine_variant_id'],
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

        $barcodeRecord = $this->barcodeService->linkBarcode(
            $code,
            $brandId,
            $packSize,
            $tenantId
        );

        $brand = $barcodeRecord->brand ?? MedicineBrand::with('variant.medicine')->findOrFail($brandId);
        $variant = $brand->variant;
        $medicine = $variant?->medicine;

        // Ensure ClinicMedicine exists for this clinic
        $clinicMedicine = ClinicMedicine::firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'medicine_variant_id' => $brand->medicine_variant_id,
                'medicine_brand_id' => $brand->id,
            ],
            [
                'display_name' => "{$brand->brand_name} ({$medicine?->generic_name}) {$variant?->display_name}",
                'base_unit' => strtolower(explode(' ', $variant?->dosage_form ?? 'tablet')[0] ?: 'tablet'),
                'selling_price_cents' => 0,
                'is_active' => true,
            ]
        );

        return response()->json([
            'success' => true,
            'barcode' => $barcodeRecord->barcode,
            'status' => $barcodeRecord->status,
            'pack_size' => $barcodeRecord->pack_size,
            'clinic_medicine_id' => $clinicMedicine->id,
            'brand_id' => $brand->id,
            'brand_name' => $brand->brand_name,
            'variant_id' => $variant?->id,
            'variant_display' => $variant?->display_name,
            'generic_name' => $medicine?->generic_name,
            'base_unit' => strtolower(explode(' ', $variant?->dosage_form ?? 'tablet')[0] ?: 'tablet'),
            'message' => $barcodeRecord->status === 'approved'
                ? 'Barcode auto-approved!'
                : 'Barcode linked and queued for review.',
        ]);
    }

    /**
     * Get detailed GRN information and its batches.
     */
    public function show(StockReceipt $receipt): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($receipt->tenant_id === $tenantId, 404);

        $hasDispense = $receipt->batches()
            ->whereHas('movements', fn ($q) => $q->where('type', StockMovement::TYPE_DISPENSE))
            ->exists();

        $batches = $receipt->batches()
            ->with(['clinicMedicine', 'voidedByUser'])
            ->withExists(['movements as has_dispense' => fn ($q) => $q->where('type', StockMovement::TYPE_DISPENSE)])
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'medicine_name' => $b->clinicMedicine?->display_name ?? '—',
                'batch_number' => $b->batch_number,
                'expiry_date' => $b->expiry_date?->toDateString(),
                'quantity_received' => (int) $b->quantity_received,
                'quantity_remaining' => (int) $b->quantity_remaining,
                'cost_price_cents' => (int) $b->cost_price_cents,
                'is_voided' => $b->voided_at !== null,
                'voided_at' => $b->voided_at?->toIso8601String(),
                'voided_by_name' => $b->voidedByUser?->name,
                'void_reason' => $b->void_reason,
                'has_dispense' => (bool) $b->has_dispense,
            ]);

        return response()->json([
            'receipt' => [
                'id' => $receipt->id,
                'receipt_number' => $receipt->receipt_number,
                'status' => $receipt->status,
                'received_date' => $receipt->received_date?->toDateString(),
                'supplier_name' => $receipt->supplier?->name ?? '—',
                'supplier_id' => $receipt->supplier_id,
                'invoice_number' => $receipt->invoice_number,
                'notes' => $receipt->notes,
                'total_cost_cents' => (int) $receipt->total_cost_cents,
                'created_by_name' => $receipt->creator?->name ?? 'System',
                'created_at' => $receipt->created_at?->toIso8601String(),
                'is_voided' => $receipt->status === StockReceipt::STATUS_VOIDED,
                'voided_at' => $receipt->voided_at?->toIso8601String(),
                'voided_by_name' => $receipt->voidedByUser?->name,
                'void_reason' => $receipt->void_reason,
                'can_void' => $receipt->status !== StockReceipt::STATUS_VOIDED && ! $hasDispense,
                'has_dispense' => $hasDispense,
            ],
            'batches' => $batches,
        ]);
    }

    /**
     * Void a whole GRN receipt and reverse all its batches.
     */
    public function voidReceipt(Request $request, StockReceipt $receipt): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($receipt->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $this->stockService->voidReceipt(
                $receipt,
                $validated['reason'],
                $request->user(),
                $tenantId
            );

            return redirect()->back()->with('success', "GRN {$receipt->receipt_number} voided and all batch stock reversed.");
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['reason' => $e->getMessage()]);
        }
    }
}
