<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PlatformIncident;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PlatformIncidentController extends Controller
{
    /**
     * Display a listing of platform incidents.
     */
    public function index(Request $request): InertiaResponse
    {
        $incidents = PlatformIncident::latest('started_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (PlatformIncident $inc) => [
                'id' => $inc->id,
                'title' => $inc->title,
                'started_at' => $inc->started_at->toIso8601String(),
                'ended_at' => $inc->ended_at?->toIso8601String(),
                'duration_hours' => $inc->duration_hours,
                'affects_all_tenants' => $inc->affects_all_tenants,
                'tenant_ids' => $inc->tenant_ids ?? [],
                'is_planned_maintenance' => $inc->is_planned_maintenance,
                'notes' => $inc->notes,
                'created_at' => $inc->created_at->format('d M Y H:i'),
            ]);

        $tenants = Tenant::select(['id', 'name'])->orderBy('name')->get();

        return Inertia::render('SuperAdmin/Incidents/Index', [
            'incidents' => $incidents,
            'tenants' => $tenants,
        ]);
    }

    /**
     * Store a newly created platform incident.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'started_at' => ['required', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'affects_all_tenants' => ['boolean'],
            'tenant_ids' => ['nullable', 'array'],
            'tenant_ids.*' => ['string'],
            'is_planned_maintenance' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        PlatformIncident::create($validated);

        return back()->with('success', 'Platform incident recorded successfully.');
    }

    protected function resolveIncident(Request $request): PlatformIncident
    {
        $param = $request->route('incident');

        return $param instanceof PlatformIncident ? $param : PlatformIncident::findOrFail($param);
    }

    /**
     * Update the specified platform incident.
     */
    public function update(Request $request): RedirectResponse
    {
        $incident = $this->resolveIncident($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'started_at' => ['required', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'affects_all_tenants' => ['boolean'],
            'tenant_ids' => ['nullable', 'array'],
            'tenant_ids.*' => ['string'],
            'is_planned_maintenance' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $incident->update($validated);

        return back()->with('success', 'Platform incident updated successfully.');
    }

    /**
     * Remove the specified platform incident.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $incident = $this->resolveIncident($request);
        $incident->delete();

        return back()->with('success', 'Platform incident deleted.');
    }
}
