<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Services\Pharmacy\StockImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class StockImportController extends Controller
{
    public function __construct(
        protected StockImportService $importService
    ) {}

    /**
     * Show the Import Stock page.
     */
    public function index(): Response
    {
        return Inertia::render('Tenant/Pharmacy/Import/Index');
    }

    /**
     * Download the standard CSV or Excel stock import template.
     */
    public function downloadTemplate(Request $request): HttpResponse
    {
        $format = strtolower((string) $request->query('format', 'xlsx'));

        if ($format === 'csv') {
            $csvContent = $this->importService->generateTemplateCsv();

            return response($csvContent, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="medvisit_stock_import_template.csv"',
            ]);
        }

        $xlsxContent = $this->importService->generateTemplateXlsx();

        return response($xlsxContent, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="medvisit_stock_import_template.xlsx"',
        ]);
    }

    /**
     * Upload and preview CSV or Excel file with matched catalog rows.
     */
    public function preview(Request $request): JsonResponse
    {
        $tenantId = tenant('id');
        $request->validate([
            'file' => ['required', 'file', 'max:5120', 'extensions:csv,txt,xlsx'], // 5MB
        ]);

        try {
            $file = $request->file('file');
            $previewData = $this->importService->parseAndPreview($file, $tenantId);

            return response()->json([
                'success' => true,
                ...$previewData,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Confirm and execute the imported stock rows.
     */
    public function confirm(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $user = $request->user();

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
        ]);

        try {
            $result = $this->importService->executeImport($validated['rows'], $user, $tenantId);

            return redirect()->route('tenant.pharmacy.medicines')
                ->with('success', sprintf(
                    'Imported successfully: %d GRNs, %d batches, %d new medicines.',
                    $result['created_receipts'],
                    $result['created_batches'],
                    $result['created_medicines']
                ));
        } catch (\Throwable $e) {
            return redirect()->back()->withErrors(['rows' => 'Import failed: '.$e->getMessage()]);
        }
    }
}
