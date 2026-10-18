<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    /**
     * List clinic suppliers.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $search = trim((string) $request->input('search', ''));

        $query = Supplier::withCount(['receipts', 'batches'])
            ->where('tenant_id', $tenantId)
            ->latest('id');

        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(phone) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
            });
        }

        $suppliers = $query->paginate(20)->withQueryString();

        return Inertia::render('Tenant/Pharmacy/Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => [
                'search' => $search,
            ],
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
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $supplier = Supplier::create([
            'tenant_id' => $tenantId,
            'name' => trim($validated['name']),
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
        ]);

        AuditLogger::log('supplier.created', [
            'tenant_id' => $tenantId,
            'resource' => $supplier,
            'metadata' => ['name' => $supplier->name],
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
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $supplier->update($validated);

        AuditLogger::log('supplier.updated', [
            'tenant_id' => $supplier->tenant_id,
            'resource' => $supplier,
            'metadata' => ['name' => $supplier->name],
        ]);

        return redirect()->back()->with('success', "Supplier {$supplier->name} updated.");
    }

    /**
     * Toggle supplier active status.
     */
    public function toggle(Supplier $supplier): RedirectResponse
    {
        abort_unless($supplier->tenant_id === tenant('id'), 404);

        $supplier->update(['is_active' => ! $supplier->is_active]);

        return redirect()->back()->with('success', "Supplier {$supplier->name} status updated.");
    }
}
