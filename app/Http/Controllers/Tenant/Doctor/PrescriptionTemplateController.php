<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Prescription;
use App\Models\PrescriptionTemplate;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PrescriptionTemplateController extends Controller
{
    /**
     * Display the prescription templates management page.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor');
        $currentDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;
        $canManageShared = $user->can('templates.manage_shared');

        $tab = $request->input('tab', 'all');
        $search = trim((string) $request->input('search', ''));
        $sort = $request->input('sort', 'most_used');

        // Base query: shared templates + personal templates owned by doctor/creator
        $baseQuery = PrescriptionTemplate::where('tenant_id', $tenantId)
            ->where(function ($q) use ($currentDoctor, $user, $canManageShared) {
                if ($canManageShared) {
                    // Admins with manage_shared permission can see all templates
                    return;
                }
                $q->where('is_shared', true);
                if ($currentDoctor) {
                    $q->orWhere('doctor_id', $currentDoctor->id);
                }
                $q->orWhere('created_by', $user->id);
            });

        // Tab counts
        $totalCount = (clone $baseQuery)->count();
        $personalCount = (clone $baseQuery)->where('is_shared', false)->count();
        $sharedCount = (clone $baseQuery)->where('is_shared', true)->count();

        // Apply Tab Filter
        $query = clone $baseQuery;
        if ($tab === 'personal') {
            $query->where('is_shared', false);
        } elseif ($tab === 'shared') {
            $query->where('is_shared', true);
        }

        // Apply Search (name, condition_tags, or item medicines)
        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(COALESCE(description, \'\')) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(CAST(condition_tags AS TEXT)) LIKE ?', [$term])
                    ->orWhereHas('items', function ($iq) use ($term) {
                        $iq->whereRaw('LOWER(display_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(generic_name, \'\')) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(COALESCE(brand_name, \'\')) LIKE ?', [$term]);
                    });
            });
        }

        // Apply Sorting
        if ($sort === 'recently_used') {
            $query->orderByRaw('last_used_at DESC NULLS LAST')->orderByDesc('id');
        } elseif ($sort === 'name_asc') {
            $query->orderBy('name', 'asc');
        } else {
            // default: most_used
            $query->orderByDesc('usage_count')->orderByDesc('id');
        }

        $templates = $query->with(['items', 'doctor', 'creator'])
            ->get()
            ->map(function ($t) use ($user, $canManageShared) {
                $canEdit = $canManageShared || ($t->created_by === $user->id);
                $canDelete = $canManageShared || ($t->created_by === $user->id);

                $lastUsedFormatted = 'Never used';
                if ($t->last_used_at) {
                    $diffDays = (int) Carbon::now('Asia/Colombo')->diffInDays($t->last_used_at);
                    if ($diffDays === 0) {
                        $lastUsedFormatted = 'last used today';
                    } elseif ($diffDays === 1) {
                        $lastUsedFormatted = 'last used yesterday';
                    } else {
                        $lastUsedFormatted = "last used {$diffDays} days ago";
                    }
                }

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'description' => $t->description,
                    'condition_tags' => is_array($t->condition_tags) ? $t->condition_tags : [],
                    'is_shared' => (bool) $t->is_shared,
                    'doctor_id' => $t->doctor_id,
                    'doctor_name' => $t->doctor ? trim(($t->doctor->title ?? 'Dr.').' '.$t->doctor->name) : ($t->creator?->name ?? 'Clinic Team'),
                    'doctor_avatar_id' => $t->doctor_id ?? $t->created_by ?? $t->id,
                    'usage_count' => (int) ($t->usage_count ?? 0),
                    'last_used_at' => $t->last_used_at?->toIso8601String(),
                    'last_used_formatted' => $lastUsedFormatted,
                    'items_count' => $t->items->count(),
                    'can_edit' => $canEdit,
                    'can_delete' => $canDelete,
                    'can_share' => $canManageShared,
                    'items' => $t->items->map(fn ($it) => [
                        'id' => $it->id,
                        'clinic_medicine_id' => $it->clinic_medicine_id,
                        'medicine_variant_id' => $it->medicine_variant_id,
                        'display_name' => $it->display_name,
                        'generic_name' => $it->generic_name,
                        'brand_name' => $it->brand_name,
                        'strength_text' => $it->strength_text,
                        'dosage_form' => $it->dosage_form,
                        'dose' => $it->dose_display,
                        'frequency' => $it->frequency,
                        'frequency_text' => $it->frequency_text,
                        'timing' => $it->timing,
                        'route' => $it->route ?? 'oral',
                        'duration_days' => $it->duration_days,
                        'quantity' => $it->quantity,
                        'instructions' => $it->instructions,
                        'source' => $it->source,
                    ]),
                ];
            });

        // Doctor's recent finalized prescriptions for "Save from past prescription" picker
        $recentPrescriptionsQuery = Prescription::where('tenant_id', $tenantId)
            ->whereIn('status', [Prescription::STATUS_FINALIZED, Prescription::STATUS_PARTIALLY_DISPENSED, Prescription::STATUS_DISPENSED]);

        if ($currentDoctor) {
            $recentPrescriptionsQuery->where('doctor_id', $currentDoctor->id);
        }

        $recentPrescriptions = $recentPrescriptionsQuery
            ->with(['patient', 'items'])
            ->latest('finalized_at')
            ->limit(15)
            ->get()
            ->map(fn ($rx) => [
                'id' => $rx->id,
                'prescription_number' => $rx->prescription_number,
                'date_formatted' => $rx->finalized_at?->format('d M Y') ?? $rx->created_at->format('d M Y'),
                'patient_name' => $rx->patient?->name ?? 'Walk-in Patient',
                'diagnosis' => $rx->diagnosis ?: 'General Consultation',
                'items_count' => $rx->items->count(),
                'items' => $rx->items->map(fn ($it) => [
                    'clinic_medicine_id' => $it->clinic_medicine_id,
                    'medicine_variant_id' => $it->medicine_variant_id,
                    'display_name' => $it->display_name,
                    'generic_name' => $it->generic_name,
                    'brand_name' => $it->brand_name,
                    'strength_text' => $it->strength_text,
                    'dosage_form' => $it->dosage_form ?: 'Tablet',
                    'dose' => $it->dose_display ?: '1',
                    'frequency' => $it->frequency ?: '1-0-1',
                    'timing' => $it->timing ?: 'after_meals',
                    'route' => 'oral',
                    'duration_days' => $it->duration_days ?: 3,
                    'quantity' => $it->quantity ?: 6,
                    'instructions' => $it->instructions,
                    'source' => $it->source ?: 'clinic',
                ]),
            ]);

        // Prescription instructions translations dictionary for live client preview
        $translations = [
            'en' => [
                'prescription' => trans('prescriptions.prescription', [], 'en'),
                'timing' => trans('prescriptions.timing', [], 'en'),
                'frequency' => trans('prescriptions.frequency', [], 'en'),
                'duration' => trans('prescriptions.duration', [], 'en'),
                'doctor_signature' => trans('prescriptions.doctor_signature', [], 'en'),
            ],
            'ta' => [
                'prescription' => trans('prescriptions.prescription', [], 'ta'),
                'timing' => trans('prescriptions.timing', [], 'ta'),
                'frequency' => trans('prescriptions.frequency', [], 'ta'),
                'duration' => trans('prescriptions.duration', [], 'ta'),
                'doctor_signature' => trans('prescriptions.doctor_signature', [], 'ta'),
            ],
            'si' => [
                'prescription' => trans('prescriptions.prescription', [], 'si'),
                'timing' => trans('prescriptions.timing', [], 'si'),
                'frequency' => trans('prescriptions.frequency', [], 'si'),
                'duration' => trans('prescriptions.duration', [], 'si'),
                'doctor_signature' => trans('prescriptions.doctor_signature', [], 'si'),
            ],
        ];

        return Inertia::render('Tenant/Doctor/Templates/Index', [
            'templates' => $templates,
            'filters' => [
                'tab' => $tab,
                'search' => $search,
                'sort' => $sort,
            ],
            'counts' => [
                'total' => $totalCount,
                'personal' => $personalCount,
                'shared' => $sharedCount,
            ],
            'can_manage_shared' => $canManageShared,
            'current_doctor_name' => $currentDoctor ? trim(($currentDoctor->title ?? 'Dr.').' '.$currentDoctor->name) : $user->name,
            'clinic_name' => tenant('name') ?? 'MedVisit Clinic',
            'recent_prescriptions' => $recentPrescriptions,
            'translations' => $translations,
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
            'condition_tags' => ['nullable', 'array'],
            'condition_tags.*' => ['string', 'max:50'],
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
            'items.*.route' => ['nullable', 'string', 'max:50'],
            'items.*.duration_days' => ['nullable', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.instructions' => ['nullable', 'string', 'max:500'],
            'items.*.source' => ['nullable', 'string', 'in:clinic,outside,buy_outside'],
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
                'condition_tags' => $validated['condition_tags'] ?? [],
                'is_shared' => $isShared,
                'usage_count' => 0,
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
                    'route' => $item['route'] ?? 'oral',
                    'quantity' => (int) $item['quantity'],
                    'instructions' => $item['instructions'] ?? null,
                    'sort_order' => $idx,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Prescription template saved successfully.');
    }

    /**
     * Update an existing prescription template.
     */
    public function update(Request $request, PrescriptionTemplate $template): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($template->tenant_id === $tenantId, 404);

        $user = $request->user();
        $canManageShared = $user->can('templates.manage_shared');

        if ($template->is_shared && ! $canManageShared) {
            abort(403, 'You do not have permission to edit clinic-shared templates.');
        }
        if (! $template->is_shared && $template->created_by !== $user->id && ! $canManageShared) {
            abort(403, 'You can only edit your own templates.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:500'],
            'condition_tags' => ['nullable', 'array'],
            'condition_tags.*' => ['string', 'max:50'],
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
            'items.*.route' => ['nullable', 'string', 'max:50'],
            'items.*.duration_days' => ['nullable', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.instructions' => ['nullable', 'string', 'max:500'],
            'items.*.source' => ['nullable', 'string', 'in:clinic,outside,buy_outside'],
        ]);

        $isShared = ! empty($validated['is_shared']);
        if ($isShared !== (bool) $template->is_shared && ! $canManageShared) {
            abort(403, 'You do not have permission to modify template sharing status.');
        }

        DB::transaction(function () use ($template, $tenantId, $validated, $isShared) {
            $template->update([
                'name' => trim($validated['name']),
                'description' => ! empty($validated['description']) ? trim($validated['description']) : null,
                'condition_tags' => $validated['condition_tags'] ?? [],
                'is_shared' => $isShared,
            ]);

            // Replace items
            $template->items()->delete();

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
                    'route' => $item['route'] ?? 'oral',
                    'quantity' => (int) $item['quantity'],
                    'instructions' => $item['instructions'] ?? null,
                    'sort_order' => $idx,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Prescription template updated successfully.');
    }

    /**
     * Duplicate a template into personal templates.
     */
    public function duplicate(Request $request, PrescriptionTemplate $template): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($template->tenant_id === $tenantId, 404);

        $user = $request->user();
        $isDoctor = $user->hasRole('doctor');
        $currentDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;

        DB::transaction(function () use ($template, $tenantId, $user, $currentDoctor) {
            $copy = PrescriptionTemplate::create([
                'tenant_id' => $tenantId,
                'doctor_id' => $currentDoctor?->id,
                'name' => "{$template->name} (Copy)",
                'description' => $template->description,
                'condition_tags' => $template->condition_tags,
                'is_shared' => false,
                'usage_count' => 0,
                'created_by' => $user->id,
            ]);

            foreach ($template->items as $idx => $it) {
                $copy->items()->create([
                    'tenant_id' => $tenantId,
                    'clinic_medicine_id' => $it->clinic_medicine_id,
                    'medicine_variant_id' => $it->medicine_variant_id,
                    'generic_name' => $it->generic_name,
                    'strength_text' => $it->strength_text,
                    'dosage_form' => $it->dosage_form,
                    'brand_name' => $it->brand_name,
                    'display_name' => $it->display_name,
                    'source' => $it->source,
                    'dose_amount' => $it->dose_amount,
                    'dose_unit' => $it->dose_unit,
                    'dose_display' => $it->dose_display,
                    'frequency' => $it->frequency,
                    'duration_days' => $it->duration_days,
                    'timing' => $it->timing,
                    'route' => $it->route,
                    'quantity' => $it->quantity,
                    'instructions' => $it->instructions,
                    'sort_order' => $idx,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Template duplicated to your personal templates.');
    }

    /**
     * Toggle sharing status of a template.
     */
    public function toggleShare(Request $request, PrescriptionTemplate $template): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($template->tenant_id === $tenantId, 404);

        $user = $request->user();
        if (! $user->can('templates.manage_shared')) {
            abort(403, 'You do not have permission to manage template sharing.');
        }

        $template->update([
            'is_shared' => ! $template->is_shared,
        ]);

        $status = $template->is_shared ? 'shared with clinic' : 'converted to personal';

        return redirect()->back()->with('success', "Template is now {$status}.");
    }

    /**
     * Record template application usage.
     */
    public function recordUsage(Request $request, PrescriptionTemplate $template): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($template->tenant_id === $tenantId, 404);

        $template->recordUsage();

        return response()->json([
            'success' => true,
            'usage_count' => $template->usage_count,
            'last_used_at' => $template->last_used_at?->toIso8601String(),
        ]);
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
