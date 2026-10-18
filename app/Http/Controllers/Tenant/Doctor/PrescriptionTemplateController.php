<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\PrescriptionTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PrescriptionTemplateController extends Controller
{
    /**
     * Display the template packs management page.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor');
        $currentDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;

        $templates = PrescriptionTemplate::where('tenant_id', $tenantId)
            ->where(function ($q) use ($currentDoctor) {
                $q->where('is_shared', true);
                if ($currentDoctor) {
                    $q->orWhere('doctor_id', $currentDoctor->id);
                }
            })
            ->with(['items', 'doctor', 'creator'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'is_shared' => $t->is_shared,
                'doctor_name' => $t->doctor ? trim(($t->doctor->title ?? 'Dr.').' '.$t->doctor->name) : 'Clinic Shared',
                'items_count' => $t->items->count(),
                'items' => $t->items->map(fn ($it) => [
                    'id' => $it->id,
                    'display_name' => $it->display_name,
                    'clinic_medicine_id' => $it->clinic_medicine_id,
                    'medicine_variant_id' => $it->medicine_variant_id,
                    'generic_name' => $it->generic_name,
                    'strength_text' => $it->strength_text,
                    'dosage_form' => $it->dosage_form,
                    'brand_name' => $it->brand_name,
                    'dose' => $it->dose_display,
                    'frequency' => $it->frequency,
                    'timing' => $it->timing,
                    'duration_days' => $it->duration_days,
                    'quantity' => $it->quantity,
                    'instructions' => $it->instructions,
                    'source' => $it->source,
                ]),
                'can_edit' => $user->can('templates.manage_shared') || ($t->created_by === $user->id),
            ]);

        return Inertia::render('Tenant/Doctor/Templates/Index', [
            'templates' => $templates,
        ]);
    }

    /**
     * Store a new prescription template pack.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor');
        $currentDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_shared' => ['boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.display_name' => ['required', 'string', 'max:255'],
            'items.*.clinic_medicine_id' => ['nullable', 'integer'],
            'items.*.medicine_variant_id' => ['nullable', 'integer'],
            'items.*.generic_name' => ['nullable', 'string', 'max:200'],
            'items.*.strength_text' => ['nullable', 'string', 'max:100'],
            'items.*.dosage_form' => ['nullable', 'string', 'max:100'],
            'items.*.brand_name' => ['nullable', 'string', 'max:200'],
            'items.*.dose' => ['required', 'string', 'max:50'],
            'items.*.frequency' => ['required', 'string', 'max:50'],
            'items.*.timing' => ['required', 'string', 'max:50'],
            'items.*.duration_days' => ['nullable', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.instructions' => ['nullable', 'string', 'max:500'],
            'items.*.source' => ['nullable', 'string', 'in:clinic,outside'],
        ]);

        $isShared = ! empty($validated['is_shared']);
        if ($isShared && ! $user->can('templates.manage_shared')) {
            abort(403, 'You do not have permission to create clinic-shared templates.');
        }

        DB::transaction(function () use ($tenantId, $user, $currentDoctor, $validated, $isShared) {
            $template = PrescriptionTemplate::create([
                'tenant_id' => $tenantId,
                'doctor_id' => $isShared ? null : $currentDoctor?->id,
                'name' => trim($validated['name']),
                'description' => ! empty($validated['description']) ? trim($validated['description']) : null,
                'is_shared' => $isShared,
                'created_by' => $user->id,
            ]);

            foreach ($validated['items'] as $idx => $item) {
                $template->items()->create([
                    'tenant_id' => $tenantId,
                    'clinic_medicine_id' => $item['clinic_medicine_id'] ?? null,
                    'medicine_variant_id' => $item['medicine_variant_id'] ?? null,
                    'generic_name' => $item['generic_name'] ?? null,
                    'strength_text' => $item['strength_text'] ?? null,
                    'dosage_form' => $item['dosage_form'] ?? 'Tablet',
                    'brand_name' => $item['brand_name'] ?? null,
                    'display_name' => $item['display_name'],
                    'source' => $item['source'] ?? 'clinic',
                    'dose_amount' => 1.0,
                    'dose_unit' => strtolower($item['dosage_form'] ?? 'tablet'),
                    'dose_display' => trim((string) ($item['dose'] ?? '1')),
                    'frequency' => $item['frequency'],
                    'duration_days' => isset($item['duration_days']) ? (int) $item['duration_days'] : null,
                    'timing' => $item['timing'],
                    'quantity' => (int) $item['quantity'],
                    'instructions' => $item['instructions'] ?? null,
                    'sort_order' => $idx,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Prescription template saved successfully.');
    }

    /**
     * Delete a prescription template.
     */
    public function destroy(Request $request, PrescriptionTemplate $template): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($template->tenant_id === $tenantId, 404);

        $user = $request->user();
        if ($template->is_shared && ! $user->can('templates.manage_shared')) {
            abort(403, 'You do not have permission to delete clinic-shared templates.');
        }
        if (! $template->is_shared && $template->created_by !== $user->id && ! $user->can('templates.manage_shared')) {
            abort(403, 'You can only delete your own templates.');
        }

        $template->delete();

        return redirect()->back()->with('success', 'Prescription template deleted successfully.');
    }
}
