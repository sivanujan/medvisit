<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
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
            'mapping' => ['nullable'],
        ]);

        try {
            $file = $request->file('file');
            $customMapping = null;
            if ($request->filled('mapping')) {
                $rawMapping = $request->input('mapping');
                $customMapping = is_string($rawMapping) ? json_decode($rawMapping, true) : (array) $rawMapping;
            }

            $previewData = $this->importService->parseAndPreview($file, $tenantId, $customMapping);

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
     * Fetch past stock import audit history for the current tenant.
     */
    public function history(Request $request): JsonResponse
    {
        $tenantId = tenant('id');

        $events = AuditEvent::with('user:id,name,email')
            ->where('tenant_id', $tenantId)
            ->where('action', 'stock.imported')
            ->latest()
            ->take(20)
            ->get()
            ->map(function ($event) {
                return [
                    'id' => $event->id,
                    'created_at' => $event->created_at?->toIso8601String(),
                    'user_name' => $event->user?->name ?? 'System',
                    'user_email' => $event->user?->email,
                    'metadata' => $event->metadata,
                ];
            });

        return response()->json([
            'success' => true,
            'history' => $events,
        ]);
    }

    /**
     * Confirm and execute the imported stock rows.
     */
    public function confirm(Request $request): JsonResponse|RedirectResponse
    {
        $tenantId = tenant('id');
        $user = $request->user();

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
            'file_hash' => ['nullable', 'string'],
            'file_name' => ['nullable', 'string'],
        ]);

        try {
            $result = $this->importService->executeImport(
                $validated['rows'],
                $user,
                $tenantId,
                $validated['file_hash'] ?? null,
                $validated['file_name'] ?? null
            );

            if ($request->wantsJson() || $request->isJson()) {
                return response()->json([
                    'success' => true,
                    ...$result,
                ]);
            }

            return redirect()->route('tenant.pharmacy.medicines')
                ->with('success', sprintf(
                    'Imported successfully: %d GRNs, %d batches, %d new medicines.',
                    $result['created_receipts'],
                    $result['created_batches'],
                    $result['created_medicines']
                ));
        } catch (\Throwable $e) {
            if ($request->wantsJson() || $request->isJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Import failed: '.$e->getMessage(),
                ], 422);
            }

            return redirect()->back()->withErrors(['rows' => 'Import failed: '.$e->getMessage()]);
        }
    }
}
