<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\MedicineBarcode;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Services\Medicines\CatalogReviewService;
use App\Services\Medicines\RxTermsClient;
use App\Services\Medicines\RxTermsParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MedicineCatalogController extends Controller
{
    public function __construct(
        protected RxTermsClient $rxTermsClient,
        protected RxTermsParser $rxTermsParser,
        protected CatalogReviewService $reviewService
    ) {}

    /**
     * Display the Global Medicine Catalog and Review Queue.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status', 'all');
        $route = $request->input('route', 'all');
        $source = $request->input('source', 'all');

        $query = Medicine::with(['variants.brands.barcodes', 'components', 'createdByTenant'])
            ->latest('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $term = '%'.strtolower($search).'%';
                $q->whereRaw('LOWER(generic_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(normalized_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(CAST(synonyms AS TEXT)) LIKE ?', [$term])
                    ->orWhereHas('variants.brands', function ($bq) use ($term) {
                        $bq->whereRaw('LOWER(brand_name) LIKE ?', [$term]);
                    });
            });
        }

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($route !== 'all') {
            $query->where('route', $route);
        }

        if ($source !== 'all') {
            $query->where('source', $source);
        }

        $medicines = $query->paginate(25)->withQueryString();

        // Pending review queue items
        $pendingMedicines = Medicine::with(['createdByTenant', 'variants'])
            ->where('status', Medicine::STATUS_PENDING)
            ->latest()
            ->get();

        $pendingVariants = MedicineVariant::with(['medicine', 'createdByTenant'])
            ->where('status', MedicineVariant::STATUS_PENDING)
            ->latest()
            ->get();

        $pendingBrands = MedicineBrand::with(['variant.medicine', 'createdByTenant'])
            ->where('status', MedicineBrand::STATUS_PENDING)
            ->latest()
            ->get();

        $pendingBarcodes = MedicineBarcode::with(['brand.variant.medicine', 'createdByTenant'])
            ->where('status', MedicineBarcode::STATUS_PENDING)
            ->latest()
            ->get();

        return Inertia::render('SuperAdmin/MedicineCatalog', [
            'medicines' => $medicines,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'route' => $route,
                'source' => $source,
            ],
            'reviewQueue' => [
                'medicines' => $pendingMedicines,
                'variants' => $pendingVariants,
                'brands' => $pendingBrands,
                'barcodes' => $pendingBarcodes,
                'total_pending' => $pendingMedicines->count() + $pendingVariants->count() + $pendingBrands->count() + $pendingBarcodes->count(),
            ],
        ]);
    }

    /**
     * Proxy search endpoint for RxTerms API (safe backend proxy).
     */
    public function searchRxTerms(Request $request): JsonResponse
    {
        $term = trim((string) $request->input('term', ''));
        if ($term === '') {
            return response()->json(['results' => []]);
        }

        $searchData = $this->rxTermsClient->search($term, 15);
        $names = $searchData['names'];
        $ef = $searchData['extra_fields'];
        $strengthsList = $ef['STRENGTHS_AND_FORMS'] ?? [];
        $rxcuisList = $ef['RXCUIS'] ?? [];
        $sxdgList = $ef['SXDG_RXCUI'] ?? [];

        $results = [];

        foreach ($names as $idx => $rawName) {
            $normalizedName = $this->rxTermsParser->normalizeGenericName($rawName);
            $route = $this->rxTermsParser->parseRoute($rawName);
            $sxdgRxcui = ! empty($sxdgList[$idx]) ? (string) $sxdgList[$idx] : null;

            $rawStrengths = $strengthsList[$idx] ?? [];
            $rawRxcuis = $rxcuisList[$idx] ?? [];

            $parsedVariants = [];
            foreach ($rawStrengths as $sIdx => $rawSf) {
                $sf = $this->rxTermsParser->parseStrengthAndForm((string) $rawSf);
                $sf['rxcui'] = ! empty($rawRxcuis[$sIdx]) ? (string) $rawRxcuis[$sIdx] : null;
                $parsedVariants[] = $sf;
            }

            $results[] = [
                'raw_name' => $rawName,
                'generic_name' => $normalizedName,
                'route' => $route,
                'is_combination' => str_contains($rawName, '/'),
                'sxdg_rxcui' => $sxdgRxcui,
                'variants' => $parsedVariants,
            ];
        }

        return response()->json(['results' => $results]);
    }

    /**
     * Import selected RxTerms item and variants into catalog.
     */
    public function importRxTerms(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'generic_name' => ['required', 'string', 'max:255'],
            'route' => ['required', 'string', 'max:50'],
            'is_combination' => ['boolean'],
            'sxdg_rxcui' => ['nullable', 'string', 'max:50'],
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.strength_text' => ['required', 'string'],
            'variants.*.dosage_form' => ['required', 'string'],
            'variants.*.form_detail' => ['nullable', 'string'],
            'variants.*.strength_value' => ['nullable', 'numeric'],
            'variants.*.strength_unit' => ['nullable', 'string'],
            'variants.*.rxcui' => ['nullable', 'string'],
        ]);

        $medicine = Medicine::withTrashed()->updateOrCreate(
            [
                'normalized_name' => strtolower(trim($validated['generic_name'])),
                'route' => $validated['route'],
            ],
            [
                'generic_name' => $validated['generic_name'],
                'is_combination' => $validated['is_combination'] ?? false,
                'rxterms_sxdg_rxcui' => $validated['sxdg_rxcui'] ?? null,
                'source' => Medicine::SOURCE_RXTERMS,
                'status' => Medicine::STATUS_APPROVED,
                'deleted_at' => null,
            ]
        );

        foreach ($validated['variants'] as $vData) {
            MedicineVariant::updateOrCreate(
                [
                    'medicine_id' => $medicine->id,
                    'strength_text' => $vData['strength_text'],
                    'dosage_form' => $vData['dosage_form'],
                    'form_detail' => $vData['form_detail'] ?? null,
                ],
                [
                    'strength_value' => $vData['strength_value'] ?? null,
                    'strength_unit' => $vData['strength_unit'] ?? null,
                    'rxcui' => $vData['rxcui'] ?? null,
                    'source' => Medicine::SOURCE_RXTERMS,
                    'status' => Medicine::STATUS_APPROVED,
                ]
            );
        }

        return redirect()->back()->with('success', "Imported {$medicine->generic_name} with ".count($validated['variants']).' variants.');
    }

    /**
     * Approve a review queue item.
     */
    public function approve(Request $request): RedirectResponse
    {
        $type = (string) $request->route('type');
        $id = (int) $request->route('id');
        $edits = $request->input('edits', []);

        switch ($type) {
            case 'medicine':
                $item = Medicine::findOrFail($id);
                $this->reviewService->approveMedicine($item, $edits);
                break;
            case 'variant':
                $item = MedicineVariant::findOrFail($id);
                $this->reviewService->approveVariant($item, $edits);
                break;
            case 'brand':
                $item = MedicineBrand::findOrFail($id);
                $this->reviewService->approveBrand($item, $edits);
                break;
            case 'barcode':
                $item = MedicineBarcode::findOrFail($id);
                $this->reviewService->approveBarcode($item, $edits);
                break;
            default:
                abort(400, 'Invalid item type');
        }

        return redirect()->back()->with('success', 'Item approved successfully.');
    }

    /**
     * Reject a review queue item.
     */
    public function reject(Request $request): RedirectResponse
    {
        $type = (string) $request->route('type');
        $id = (int) $request->route('id');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $this->reviewService->rejectItem($type, $id, $validated['reason']);

        return redirect()->back()->with('success', 'Item rejected with feedback.');
    }

    /**
     * Merge duplicate item into existing target item.
     */
    public function merge(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:medicine,variant,brand'],
            'source_id' => ['required', 'integer'],
            'target_id' => ['required', 'integer', 'different:source_id'],
        ]);

        if ($validated['type'] === 'medicine') {
            $source = Medicine::findOrFail($validated['source_id']);
            $target = Medicine::findOrFail($validated['target_id']);
            $this->reviewService->mergeMedicine($source, $target);
        } elseif ($validated['type'] === 'variant') {
            $source = MedicineVariant::findOrFail($validated['source_id']);
            $target = MedicineVariant::findOrFail($validated['target_id']);
            $this->reviewService->mergeVariant($source, $target);
        } elseif ($validated['type'] === 'brand') {
            $source = MedicineBrand::findOrFail($validated['source_id']);
            $target = MedicineBrand::findOrFail($validated['target_id']);
            $this->reviewService->mergeBrand($source, $target);
        }

        return redirect()->back()->with('success', 'Items merged successfully.');
    }

    /**
     * Soft delete a medicine.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $id = (int) $request->route('medicine');
        $medicine = Medicine::findOrFail($id);
        $medicine->delete();

        return redirect()->back()->with('success', "Medicine {$medicine->generic_name} archived.");
    }
}
