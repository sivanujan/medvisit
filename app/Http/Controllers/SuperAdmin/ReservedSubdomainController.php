<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ReservedSubdomain;
use App\Rules\SubdomainRule;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ReservedSubdomainController extends Controller
{
    /**
     * Display the Reserved Subdomains configuration and database blocks.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $tab = $request->input('tab', 'database'); // 'database' | 'config'

        $query = ReservedSubdomain::query()
            ->with(['createdBy:id,name'])
            ->latest('id');

        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(subdomain) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(reason) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(notes) LIKE ?', [$term]);
            });
        }

        $databaseList = $query->get()->map(function (ReservedSubdomain $record) {
            return [
                'id' => $record->id,
                'subdomain' => $record->subdomain,
                'reason' => $record->reason,
                'notes' => $record->notes,
                'held_until' => $record->held_until?->toIso8601String(),
                'is_active' => $record->isActive(),
                'is_indefinite' => $record->held_until === null,
                'original_tenant_id' => $record->original_tenant_id,
                'created_by' => $record->createdBy?->name,
                'created_at' => $record->created_at?->toIso8601String(),
            ];
        });

        $exact = (array) config('reserved_subdomains.exact', []);
        $routes = SubdomainRule::getCentralRouteSegments();
        $containsGlobal = (array) config('reserved_subdomains.patterns.contains_global', []);
        $segmentBlocks = (array) config('reserved_subdomains.patterns.segment_blocks', []);
        $offensive = (array) config('reserved_subdomains.offensive', []);

        $configData = [
            'hold_days' => config('reserved_subdomains.hold_days', 90),
            'exact' => array_values(array_unique($exact)),
            'routes' => array_values(array_unique($routes)),
            'contains_global' => $containsGlobal,
            'segment_blocks' => $segmentBlocks,
            'offensive' => $offensive,
        ];

        $stats = [
            'total_config_exact' => count($configData['exact']),
            'total_route_segments' => count($configData['routes']),
            'total_db_active' => ReservedSubdomain::active()->count(),
            'total_db_holds' => ReservedSubdomain::active()->whereNotNull('held_until')->count(),
            'total_db_indefinite' => ReservedSubdomain::active()->whereNull('held_until')->count(),
        ];

        return Inertia::render('SuperAdmin/ReservedSubdomains/Index', [
            'databaseList' => $databaseList,
            'configData' => $configData,
            'stats' => $stats,
            'activeTab' => $tab,
            'search' => $search,
        ]);
    }

    /**
     * Store a new custom reserved subdomain in the database.
     */
    public function store(Request $request): RedirectResponse
    {
        $raw = (string) $request->input('subdomain', '');
        $subdomain = Str::lower(trim($raw));

        $request->merge(['subdomain' => $subdomain]);

        $validated = $request->validate([
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/',
                'unique:reserved_subdomains,subdomain',
            ],
            'reason' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'hold_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ]);

        $heldUntil = ! empty($validated['hold_days'])
            ? now()->addDays((int) $validated['hold_days'])
            : null;

        $record = ReservedSubdomain::create([
            'subdomain' => $subdomain,
            'reason' => $validated['reason'],
            'notes' => $validated['notes'] ?? null,
            'held_until' => $heldUntil,
            'created_by_user_id' => $request->user()?->id,
        ]);

        AuditLogger::log('superadmin.reserved_subdomain.created', [
            'user' => $request->user(),
            'metadata' => [
                'id' => $record->id,
                'subdomain' => $record->subdomain,
                'reason' => $record->reason,
                'held_until' => $record->held_until?->toIso8601String(),
            ],
        ]);

        return redirect()->route('super_admin.reserved_subdomains.index')
            ->with('success', "Subdomain '{$subdomain}' has been added to reserved list.");
    }

    /**
     * Remove a custom reserved subdomain from the database.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $id = $request->route('reserved_subdomain') ?? $request->route('reservedSubdomain');
        $record = $id instanceof ReservedSubdomain ? $id : ReservedSubdomain::findOrFail($id);

        $subdomain = $record->subdomain;

        AuditLogger::log('superadmin.reserved_subdomain.deleted', [
            'user' => $request->user(),
            'metadata' => [
                'id' => $record->id,
                'subdomain' => $subdomain,
                'reason' => $record->reason,
            ],
        ]);

        $record->delete();

        return redirect()->route('super_admin.reserved_subdomains.index')
            ->with('success', "Subdomain '{$subdomain}' removed from database reserved list.");
    }
}
