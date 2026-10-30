<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Tenant;
use App\Rules\SubdomainRule;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadManagementController extends Controller
{
    /**
     * Display the Leads & Demos CRM board or list.
     */
    public function index(Request $request): Response|StreamedResponse
    {
        $search = trim((string) $request->input('search', ''));
        $stageFilter = $request->input('stage', 'all');
        $sourceFilter = $request->input('source', 'all');
        $followUpFilter = $request->input('follow_up', 'all');
        $viewMode = $request->input('view', 'kanban'); // 'kanban' or 'list'

        $query = Lead::query()->with(['tenant', 'creator'])->latest('id');

        // Search
        if ($search !== '') {
            $term = '%'.strtolower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(clinic_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(contact_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(phone) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(city) LIKE ?', [$term]);
            });
        }

        // Stage filter
        if ($stageFilter !== 'all') {
            $query->where('stage', $stageFilter);
        }

        // Source filter
        if ($sourceFilter !== 'all') {
            $query->where('source', $sourceFilter);
        }

        // Follow up filter
        $today = Carbon::today('Asia/Colombo');
        if ($followUpFilter === 'due_today') {
            $query->whereDate('next_follow_up_at', $today);
        } elseif ($followUpFilter === 'overdue') {
            $query->whereDate('next_follow_up_at', '<', $today)
                ->whereNotIn('stage', [Lead::STAGE_PAYING, Lead::STAGE_LOST]);
        } elseif ($followUpFilter === 'upcoming') {
            $query->whereDate('next_follow_up_at', '>', $today);
        }

        // Export to CSV if requested
        if ($request->input('export') === 'csv') {
            AuditLogger::log('superadmin.leads.exported_csv');

            return response()->streamDownload(function () use ($query) {
                $out = fopen('php://output', 'w');
                fputcsv($out, ['ID', 'Clinic Name', 'Contact Name', 'Phone', 'Email', 'City', 'Source', 'Stage', 'Follow-up Date', 'Notes', 'Created At']);
                foreach ($query->get() as $l) {
                    fputcsv($out, [
                        $l->id,
                        $l->clinic_name,
                        $l->contact_name,
                        $l->phone,
                        $l->email,
                        $l->city,
                        $l->source,
                        $l->stage,
                        $l->next_follow_up_at?->toDateString(),
                        $l->notes,
                        $l->created_at?->toDateString(),
                    ]);
                }
                fclose($out);
            }, 'medvisit_leads_'.date('Y_m_d').'.csv');
        }

        // KPI metrics
        $startOfMonth = now()->startOfMonth();
        $totalLeads = Lead::count();
        $newThisMonth = Lead::where('created_at', '>=', $startOfMonth)->count();
        $demosBooked = Lead::whereIn('stage', [Lead::STAGE_DEMO_BOOKED, Lead::STAGE_DEMO_DONE])->count();
        $payingCustomers = Lead::where('stage', Lead::STAGE_PAYING)->count();
        $followUpsDue = Lead::dueFollowUp()->count();
        $conversionRate = $totalLeads > 0
            ? round(($payingCustomers / $totalLeads) * 100, 1)
            : 0.0;

        // Clinics list for the "convert to clinic" linking modal
        $existingClinics = Tenant::select(['id', 'name', 'subdomain', 'status', 'plan'])
            ->latest('id')
            ->limit(100)
            ->get();

        // Prepare lead data based on view mode
        if ($viewMode === 'list') {
            $leadsData = $query->paginate(20)->through(fn (Lead $l) => $this->formatLead($l))->withQueryString();
        } else {
            // Kanban: fetch all filtered leads and group by stage
            $allFiltered = $query->get()->map(fn (Lead $l) => $this->formatLead($l));
            $grouped = [];
            foreach (array_keys(Lead::STAGES) as $stageKey) {
                $grouped[$stageKey] = $allFiltered->where('stage', $stageKey)->values()->all();
            }
            $leadsData = $grouped;
        }

        return Inertia::render('SuperAdmin/Leads/Index', [
            'leads' => $leadsData,
            'viewMode' => $viewMode,
            'metrics' => [
                'total_leads' => $totalLeads,
                'new_this_month' => $newThisMonth,
                'demos_booked' => $demosBooked,
                'paying_customers' => $payingCustomers,
                'follow_ups_due' => $followUpsDue,
                'conversion_rate' => $conversionRate,
            ],
            'stages' => Lead::STAGES,
            'sources' => Lead::SOURCES,
            'existingClinics' => $existingClinics,
            'filters' => [
                'search' => $search,
                'stage' => $stageFilter,
                'source' => $sourceFilter,
                'follow_up' => $followUpFilter,
                'view' => $viewMode,
            ],
        ]);
    }

    /**
     * Store a manually created lead.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'clinic_name' => ['required', 'string', 'max:150'],
            'contact_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'city' => ['nullable', 'string', 'max:100'],
            'source' => ['required', 'string'],
            'stage' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
            'next_follow_up_at' => ['nullable', 'date'],
            'demo_scheduled_at' => ['nullable', 'date'],
        ]);

        $lead = Lead::create([
            ...$validated,
            'created_by_user_id' => $request->user()->id,
        ]);

        AuditLogger::log('superadmin.lead.created', [
            'resource' => $lead,
            'user' => $request->user(),
            'metadata' => ['clinic_name' => $lead->clinic_name],
        ]);

        return back()->with('success', "Lead '{$lead->clinic_name}' added.");
    }

    /**
     * Update lead details.
     */
    public function update(Request $request): RedirectResponse
    {
        $leadId = $request->route('lead');
        $lead = $leadId instanceof Lead ? $leadId : Lead::findOrFail($leadId);

        $validated = $request->validate([
            'clinic_name' => ['required', 'string', 'max:150'],
            'contact_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'city' => ['nullable', 'string', 'max:100'],
            'source' => ['required', 'string'],
            'stage' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
            'next_follow_up_at' => ['nullable', 'date'],
            'demo_scheduled_at' => ['nullable', 'date'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $lead->update($validated);

        AuditLogger::log('superadmin.lead.updated', [
            'resource' => $lead,
            'user' => $request->user(),
        ]);

        return back()->with('success', "Lead '{$lead->clinic_name}' updated.");
    }

    /**
     * Update lead stage (inline or drag-and-drop).
     */
    public function updateStage(Request $request): RedirectResponse
    {
        $leadId = $request->route('lead');
        $lead = $leadId instanceof Lead ? $leadId : Lead::findOrFail($leadId);

        $validated = $request->validate([
            'stage' => ['required', 'string', 'in:'.implode(',', array_keys(Lead::STAGES))],
            'lost_reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $oldStage = $lead->stage;
        $newStage = $validated['stage'];

        $updateData = ['stage' => $newStage];
        if (isset($validated['lost_reason'])) {
            $updateData['lost_reason'] = $validated['lost_reason'];
        }
        if (isset($validated['notes'])) {
            $updateData['notes'] = $validated['notes'];
        }

        $lead->update($updateData);

        AuditLogger::log('superadmin.lead.stage_changed', [
            'resource' => $lead,
            'user' => $request->user(),
            'metadata' => [
                'from_stage' => $oldStage,
                'to_stage' => $newStage,
            ],
        ]);

        $stageName = Lead::STAGES[$newStage] ?? $newStage;

        return back()->with('success', "Moved {$lead->clinic_name} to '{$stageName}'.");
    }

    /**
     * Convert lead to an active clinic workspace (link existing or create new).
     */
    public function convertToClinic(Request $request): RedirectResponse
    {
        $leadId = $request->route('lead');
        $lead = $leadId instanceof Lead ? $leadId : Lead::findOrFail($leadId);

        $actionType = $request->input('action_type', 'create_new'); // 'create_new' or 'link_existing'

        if ($actionType === 'link_existing') {
            $request->validate([
                'tenant_id' => ['required', 'string', 'exists:tenants,id'],
            ]);

            $tenant = Tenant::findOrFail($request->input('tenant_id'));
            $lead->update([
                'converted_tenant_id' => $tenant->id,
                'stage' => $tenant->status === 'active' ? Lead::STAGE_PAYING : Lead::STAGE_TRIAL,
            ]);

            AuditLogger::log('superadmin.lead.converted_to_clinic', [
                'resource' => $lead,
                'tenant_id' => $tenant->id,
                'user' => $request->user(),
                'metadata' => ['mode' => 'linked_existing', 'tenant_id' => $tenant->id],
            ]);

            return back()->with('success', "Lead {$lead->clinic_name} linked to clinic '{$tenant->name}'.");
        }

        // Create a new tenant
        $allowOverride = $request->boolean('override_reserved');
        $overrideReason = trim((string) $request->input('override_reason', ''));

        if ($allowOverride && empty($overrideReason)) {
            return back()->withErrors(['override_reason' => 'An override reason is required when bypassing reserved subdomains.']);
        }

        $validated = $request->validate([
            'subdomain' => [
                'required',
                'string',
                new SubdomainRule(
                    allowReservedOverride: $allowOverride,
                    clinicName: $request->input('clinic_name')
                ),
            ],
            'clinic_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:30'],
            'plan' => ['nullable', 'string'],
            'override_reserved' => ['nullable', 'boolean'],
            'override_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $subdomain = Str::lower($validated['subdomain']);
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $tenant = Tenant::create([
            'id' => $subdomain,
            'name' => $validated['clinic_name'],
            'subdomain' => $subdomain,
            'phone' => $validated['phone'],
            'plan' => $validated['plan'] ?? 'standard',
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(30),
        ]);

        // Create domain bindings
        $tenant->domains()->create(['domain' => $subdomain]);
        $tenant->domains()->create(['domain' => "{$subdomain}.{$baseDomain}"]);

        // Link lead to tenant
        $lead->update([
            'converted_tenant_id' => $tenant->id,
            'stage' => Lead::STAGE_TRIAL,
        ]);

        AuditLogger::log('superadmin.lead.converted_to_clinic', [
            'resource' => $lead,
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => [
                'mode' => 'created_new',
                'tenant_id' => $tenant->id,
                'subdomain' => $subdomain,
                'override_reserved' => $allowOverride,
                'override_reason' => $allowOverride ? $overrideReason : null,
            ],
        ]);

        if ($allowOverride) {
            AuditLogger::log('superadmin.subdomain.reserved_override', [
                'tenant_id' => $tenant->id,
                'user' => $request->user(),
                'metadata' => [
                    'subdomain' => $subdomain,
                    'reason' => $overrideReason,
                ],
            ]);
        }

        return back()->with('success', "New clinic '{$tenant->name}' created with 30-day trial and linked to lead.");
    }

    /**
     * Soft delete a lead.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $leadId = $request->route('lead');
        $lead = $leadId instanceof Lead ? $leadId : Lead::findOrFail($leadId);

        $lead->delete();

        AuditLogger::log('superadmin.lead.deleted', [
            'resource' => $lead,
            'user' => $request->user(),
        ]);

        return back()->with('success', "Lead '{$lead->clinic_name}' archived.");
    }

    /**
     * Format lead data for frontend consumption.
     */
    protected function formatLead(Lead $l): array
    {
        $today = Carbon::today('Asia/Colombo');
        $nextFollowUp = $l->next_follow_up_at;
        $isOverdue = $nextFollowUp && $nextFollowUp->lt($today) && ! in_array($l->stage, [Lead::STAGE_PAYING, Lead::STAGE_LOST]);
        $isDueToday = $nextFollowUp && $nextFollowUp->isToday();

        return [
            'id' => $l->id,
            'clinic_name' => $l->clinic_name,
            'contact_name' => $l->contact_name,
            'phone' => $l->phone,
            'email' => $l->email,
            'city' => $l->city,
            'source' => $l->source,
            'source_label' => Lead::SOURCES[$l->source] ?? $l->source,
            'stage' => $l->stage,
            'stage_label' => Lead::STAGES[$l->stage] ?? $l->stage,
            'notes' => $l->notes,
            'lost_reason' => $l->lost_reason,
            'next_follow_up_at' => $nextFollowUp?->toDateString(),
            'demo_scheduled_at' => $l->demo_scheduled_at?->toDateTimeString(),
            'is_overdue' => $isOverdue,
            'is_due_today' => $isDueToday,
            'converted_tenant_id' => $l->converted_tenant_id,
            'tenant' => $l->tenant ? [
                'id' => $l->tenant->id,
                'name' => $l->tenant->name,
                'subdomain' => $l->tenant->subdomain,
                'status' => $l->tenant->status,
            ] : null,
            'role' => $l->role,
            'roles_tried' => $l->roles_tried ?? [],
            'sessions_count' => $l->sessions_count ?? 1,
            'last_seen_at' => $l->last_seen_at?->diffForHumans(),
            'created_at' => $l->created_at?->diffForHumans(),
            'created_date' => $l->created_at?->toDateString(),
        ];
    }

    /**
     * Trigger manual reset of the public demo sandbox.
     */
    public function resetDemo(Request $request): RedirectResponse
    {
        Artisan::call('demo:reset');

        AuditLogger::log('superadmin.demo_sandbox.manually_reset', [
            'user' => $request->user(),
        ]);

        return back()->with('success', 'Public demo sandbox has been reset cleanly to default seeded state.');
    }
}
