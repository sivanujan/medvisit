<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Patient;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    /**
     * List clinic suppliers with metrics, search, sorting and tab counts.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', 'active');
        $sort = (string) $request->input('sort', 'name_asc');

        // Tab counts
        $tabCounts = [
            'active' => Supplier::where('tenant_id', $tenantId)->where('is_active', true)->count(),
            'inactive' => Supplier::where('tenant_id', $tenantId)->where('is_active', false)->count(),
            'all' => Supplier::where('tenant_id', $tenantId)->count(),
        ];

        // Stats strip calculations for the current month
        $now = Carbon::now('Asia/Colombo');
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();

        $grnsThisMonth = StockReceipt::where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->whereBetween('received_date', [$startOfMonth, $endOfMonth])
            ->count();

        $purchasesThisMonthCents = (int) StockReceipt::where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->whereBetween('received_date', [$startOfMonth, $endOfMonth])
            ->sum('total_cost_cents');

        $topSupplierRow = StockReceipt::where('tenant_id', $tenantId)
            ->where('status', '!=', 'voided')
            ->whereBetween('received_date', [$startOfMonth, $endOfMonth])
            ->whereNotNull('supplier_id')
            ->select('supplier_id', DB::raw('SUM(total_cost_cents) as total_spent'))
            ->groupBy('supplier_id')
            ->orderByDesc('total_spent')
            ->first();

        $topSupplierName = null;
        if ($topSupplierRow) {
            $topSupplier = Supplier::where('tenant_id', $tenantId)->find($topSupplierRow->supplier_id);
            $topSupplierName = $topSupplier?->name;
        }

        $stats = [
            'active_suppliers' => $tabCounts['active'],
            'grns_this_month' => $grnsThisMonth,
            'purchases_this_month_cents' => $purchasesThisMonthCents,
            'top_supplier_this_month' => $topSupplierName,
        ];

        // Base Query with Correlated Subqueries for accurate sort & totals
        $receiptsSub = StockReceipt::selectRaw('COALESCE(SUM(total_cost_cents), 0)')
            ->whereColumn('stock_receipts.supplier_id', 'suppliers.id')
            ->where('stock_receipts.status', '!=', 'voided');

        $lastDeliverySub = StockReceipt::selectRaw('MAX(received_date)')
            ->whereColumn('stock_receipts.supplier_id', 'suppliers.id')
            ->where('stock_receipts.status', '!=', 'voided');

        $query = Supplier::where('tenant_id', $tenantId)
            ->select('suppliers.*')
            ->selectSub($receiptsSub, 'total_purchased_cents')
            ->selectSub($lastDeliverySub, 'last_delivery_date')
            ->withCount(['receipts', 'batches']);

        // Status Filter
        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        // Search Filter across name, contact_person, email, city, and phone in any format
        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $digits = preg_replace('/\D/', '', $search);

            $query->where(function ($q) use ($term, $digits) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(contact_person, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(email, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(city, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(address, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$term]);

                if (! empty($digits)) {
                    $q->orWhereRaw('REGEXP_REPLACE(COALESCE(phone, \'\'), \'[^0-9]\', \'\', \'g\') LIKE ?', ['%'.$digits.'%']);

                    if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
                        $localDigits = substr($digits, 1);
                        $q->orWhereRaw('REGEXP_REPLACE(COALESCE(phone, \'\'), \'[^0-9]\', \'\', \'g\') LIKE ?', ['%'.$localDigits.'%']);
                    } elseif (str_starts_with($digits, '94') && strlen($digits) >= 11) {
                        $localDigits = substr($digits, 2);
                        $q->orWhereRaw('REGEXP_REPLACE(COALESCE(phone, \'\'), \'[^0-9]\', \'\', \'g\') LIKE ?', ['%'.$localDigits.'%']);
                    }
                }
            });
        }

        // Sorting
        if ($sort === 'last_delivery_desc') {
            $query->orderByRaw('last_delivery_date DESC NULLS LAST')->orderBy('name', 'asc');
        } elseif ($sort === 'purchases_desc') {
            $query->orderByDesc('total_purchased_cents')->orderBy('name', 'asc');
        } else {
            $query->orderBy('name', 'asc');
        }

        $suppliers = $query->paginate(24)->withQueryString();

        // Compute 6-month spend history for sparkline
        $supplierIds = collect($suppliers->items())->pluck('id')->filter()->all();
        $monthlySpendMap = [];

        if (! empty($supplierIds)) {
            $months = [];
            for ($i = 5; $i >= 0; $i--) {
                $monthDate = $now->copy()->subMonths($i);
                $months[] = $monthDate->format('Y-m');
            }

            $earliestDate = $now->copy()->subMonths(5)->startOfMonth()->toDateString();
            $receiptSpends = StockReceipt::where('tenant_id', $tenantId)
                ->whereIn('supplier_id', $supplierIds)
                ->where('status', '!=', 'voided')
                ->where('received_date', '>=', $earliestDate)
                ->select([
                    'supplier_id',
                    DB::raw("TO_CHAR(received_date, 'YYYY-MM') as month_key"),
                    DB::raw('SUM(total_cost_cents) as spend_cents'),
                ])
                ->groupBy('supplier_id', DB::raw("TO_CHAR(received_date, 'YYYY-MM')"))
                ->get();

            foreach ($supplierIds as $sId) {
                $monthlySpendMap[$sId] = [];
                foreach ($months as $mKey) {
                    $row = $receiptSpends->first(fn ($r) => $r->supplier_id == $sId && $r->month_key === $mKey);
                    $monthlySpendMap[$sId][] = $row ? (int) $row->spend_cents : 0;
                }
            }
        }

        // Transform supplier items with formatted fields and sparkline array
        $suppliers->through(function ($s) use ($monthlySpendMap) {
            return [
                'id' => $s->id,
                'name' => $s->name,
                'contact_person' => $s->contact_person,
                'phone' => $s->phone,
                'email' => $s->email,
                'address' => $s->address,
                'city' => $s->city,
                'payment_terms' => $s->payment_terms,
                'notes' => $s->notes,
                'is_active' => (bool) $s->is_active,
                'receipts_count' => (int) $s->receipts_count,
                'batches_count' => (int) $s->batches_count,
                'total_purchased_cents' => (int) ($s->total_purchased_cents ?? 0),
                'last_delivery_date' => $s->last_delivery_date ? Carbon::parse($s->last_delivery_date)->toDateString() : null,
                'monthly_spend' => $monthlySpendMap[$s->id] ?? [0, 0, 0, 0, 0, 0],
                'created_at' => $s->created_at?->toIso8601String(),
            ];
        });

        return Inertia::render('Tenant/Pharmacy/Suppliers/Index', [
            'suppliers' => $suppliers,
            'stats' => $stats,
            'tabCounts' => $tabCounts,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
            ],
        ]);
    }

    /**
     * Get detailed supplier profile with GRNs, supplied medicines, and activity audit.
     */
    public function show(Supplier $supplier): JsonResponse
    {
        abort_unless($supplier->tenant_id === tenant('id'), 404);

        $recentReceipts = StockReceipt::where('supplier_id', $supplier->id)
            ->withCount('batches')
            ->with(['creator:id,name'])
            ->latest('received_date')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'receipt_number' => $r->receipt_number,
                'received_date' => $r->received_date?->toDateString(),
                'invoice_number' => $r->invoice_number,
                'total_cost_cents' => $r->total_cost_cents,
                'status' => $r->status,
                'items_count' => $r->batches_count,
                'created_by_name' => $r->creator?->name,
            ]);

        $batches = StockBatch::where('supplier_id', $supplier->id)
            ->with('clinicMedicine')
            ->orderBy('clinic_medicine_id')
            ->latest('received_at')
            ->latest('id')
            ->get();

        $medicinesGrouped = $batches->groupBy('clinic_medicine_id');
        $medicinesSupplied = [];

        foreach ($medicinesGrouped as $medId => $medBatches) {
            $latest = $medBatches->first();
            $previous = $medBatches->skip(1)->first();
            $trend = 'same';

            if ($previous) {
                if ($latest->cost_price_cents > $previous->cost_price_cents) {
                    $trend = 'up';
                } elseif ($latest->cost_price_cents < $previous->cost_price_cents) {
                    $trend = 'down';
                }
            }

            $medicinesSupplied[] = [
                'clinic_medicine_id' => $medId,
                'medicine_name' => $latest->clinicMedicine?->display_name ?? 'Unknown Medicine',
                'base_unit' => $latest->clinicMedicine?->base_unit ?? 'unit',
                'last_unit_cost_cents' => $latest->cost_price_cents,
                'previous_unit_cost_cents' => $previous?->cost_price_cents,
                'cost_trend' => $trend,
                'last_batch_number' => $latest->batch_number,
                'last_expiry_date' => $latest->expiry_date?->toDateString(),
                'last_received_date' => $latest->received_at?->toDateString(),
                'total_batches_supplied' => $medBatches->count(),
                'total_units_supplied' => $medBatches->sum('quantity_received'),
            ];
        }

        $activityLog = AuditEvent::where('tenant_id', $supplier->tenant_id)
            ->where('resource_type', Supplier::class)
            ->where('resource_id', $supplier->id)
            ->with('user:id,name')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'action' => $e->action,
                'user_name' => $e->user?->name ?? 'System',
                'created_at' => $e->created_at?->toIso8601String(),
                'metadata' => $e->metadata,
            ]);

        return response()->json([
            'supplier' => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'contact_person' => $supplier->contact_person,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'city' => $supplier->city,
                'payment_terms' => $supplier->payment_terms,
                'notes' => $supplier->notes,
                'is_active' => (bool) $supplier->is_active,
                'receipts_count' => $supplier->receipts()->count(),
                'batches_count' => $supplier->batches()->count(),
                'total_purchased_cents' => (int) $supplier->receipts()->where('status', '!=', 'voided')->sum('total_cost_cents'),
                'created_at' => $supplier->created_at?->toIso8601String(),
                'updated_at' => $supplier->updated_at?->toIso8601String(),
            ],
            'recent_receipts' => $recentReceipts,
            'medicines_supplied' => $medicinesSupplied,
            'activity_log' => $activityLog,
        ]);
    }

    /**
     * Check if a supplier with the same name or normalised phone already exists.
     */
    public function checkDuplicate(Request $request): JsonResponse
    {
        $tenantId = tenant('id');
        $name = trim((string) $request->input('name', ''));
        $phone = trim((string) $request->input('phone', ''));
        $excludeId = $request->input('exclude_id');

        $normalizedPhone = Patient::normalizePhone($phone);

        $query = Supplier::where('tenant_id', $tenantId);
        if (! empty($excludeId)) {
            $query->where('id', '!=', $excludeId);
        }

        $existing = $query->where(function ($q) use ($name, $normalizedPhone) {
            if ($name !== '') {
                $q->whereRaw('LOWER(name) = ?', [strtolower($name)]);
            }

            if (! empty($normalizedPhone)) {
                $digits = preg_replace('/\D/', '', $normalizedPhone);
                $q->orWhereRaw('REGEXP_REPLACE(COALESCE(phone, \'\'), \'[^0-9]\', \'\', \'g\') LIKE ?', ['%'.substr($digits, -9).'%']);
            }
        })->first();

        return response()->json([
            'is_duplicate' => (bool) $existing,
            'existing_supplier' => $existing ? [
                'id' => $existing->id,
                'name' => $existing->name,
                'phone' => $existing->phone,
                'city' => $existing->city,
                'is_active' => $existing->is_active,
            ] : null,
        ]);
    }

    /**
     * Store a new supplier.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $phone = $validated['phone'] ?? null;
        if (! empty($phone)) {
            $phone = Patient::normalizePhone($phone) ?? $phone;
        }

        $supplier = Supplier::create([
            'tenant_id' => $tenantId,
            'name' => trim($validated['name']),
            'contact_person' => ! empty($validated['contact_person']) ? trim($validated['contact_person']) : null,
            'phone' => $phone,
            'email' => ! empty($validated['email']) ? trim($validated['email']) : null,
            'address' => ! empty($validated['address']) ? trim($validated['address']) : null,
            'city' => ! empty($validated['city']) ? trim($validated['city']) : null,
            'payment_terms' => ! empty($validated['payment_terms']) ? trim($validated['payment_terms']) : null,
            'notes' => ! empty($validated['notes']) ? trim($validated['notes']) : null,
            'is_active' => true,
        ]);

        AuditLogger::log('supplier.created', [
            'tenant_id' => $tenantId,
            'resource' => $supplier,
            'metadata' => [
                'name' => $supplier->name,
                'phone' => $supplier->phone,
                'city' => $supplier->city,
            ],
        ]);

        return redirect()->back()->with('success', "Supplier {$supplier->name} created.");
    }

    /**
     * Update an existing supplier.
     */
    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        abort_unless($supplier->tenant_id === tenant('id'), 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $phone = $validated['phone'] ?? null;
        if (! empty($phone)) {
            $phone = Patient::normalizePhone($phone) ?? $phone;
        }

        $supplier->update([
            'name' => trim($validated['name']),
            'contact_person' => ! empty($validated['contact_person']) ? trim($validated['contact_person']) : null,
            'phone' => $phone,
            'email' => ! empty($validated['email']) ? trim($validated['email']) : null,
            'address' => ! empty($validated['address']) ? trim($validated['address']) : null,
            'city' => ! empty($validated['city']) ? trim($validated['city']) : null,
            'payment_terms' => ! empty($validated['payment_terms']) ? trim($validated['payment_terms']) : null,
            'notes' => ! empty($validated['notes']) ? trim($validated['notes']) : null,
            'is_active' => isset($validated['is_active']) ? (bool) $validated['is_active'] : $supplier->is_active,
        ]);

        AuditLogger::log('supplier.updated', [
            'tenant_id' => $supplier->tenant_id,
            'resource' => $supplier,
            'metadata' => [
                'name' => $supplier->name,
                'phone' => $supplier->phone,
            ],
        ]);

        return redirect()->back()->with('success', "Supplier {$supplier->name} updated.");
    }

    /**
     * Toggle supplier active status.
     */
    public function toggle(Supplier $supplier): RedirectResponse
    {
        abort_unless($supplier->tenant_id === tenant('id'), 404);

        $newStatus = ! $supplier->is_active;
        $supplier->update(['is_active' => $newStatus]);

        AuditLogger::log('supplier.status_toggled', [
            'tenant_id' => $supplier->tenant_id,
            'resource' => $supplier,
            'metadata' => [
                'name' => $supplier->name,
                'is_active' => $newStatus,
            ],
        ]);

        $statusText = $newStatus ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Supplier {$supplier->name} {$statusText}.");
    }

    /**
     * Delete supplier only if 0 GRNs / batches exist. Otherwise block and advise deactivate.
     */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        abort_unless($supplier->tenant_id === tenant('id'), 404);

        $receiptsCount = $supplier->receipts()->count();
        $batchesCount = $supplier->batches()->count();

        if ($receiptsCount > 0 || $batchesCount > 0) {
            return redirect()->back()->with('error', "Cannot delete {$supplier->name} because {$receiptsCount} stock receipt(s) and {$batchesCount} batch(es) are linked. Deactivate the supplier instead to keep historical records.");
        }

        $name = $supplier->name;

        AuditLogger::log('supplier.deleted', [
            'tenant_id' => $supplier->tenant_id,
            'resource' => $supplier,
            'metadata' => ['name' => $name],
        ]);

        $supplier->delete();

        return redirect()->back()->with('success', "Supplier {$name} permanently deleted.");
    }
}
