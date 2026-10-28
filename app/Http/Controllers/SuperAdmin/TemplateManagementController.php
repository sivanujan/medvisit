<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\TemplatePurchase;
use App\Models\Tenant;
use App\Models\WebsiteTemplate;
use App\Services\AuditLogger;
use App\Services\PlatformSettingsService;
use App\Services\Templates\TemplateService;
use App\Support\ClinicWebsite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as FacadeResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TemplateManagementController extends Controller
{
    public function __construct(
        protected PlatformSettingsService $settingsService
    ) {}

    /**
     * Templates Management Index (/super-admin/templates).
     */
    public function index(Request $request): Response
    {
        $templates = WebsiteTemplate::orderBy('sort_order')
            ->withCount(['purchases' => fn ($q) => $q->where('status', TemplatePurchase::STATUS_PAID)])
            ->get();

        $settings = $this->settingsService->all();
        $freeWithAdvanced = (int) ($settings['templates.free_templates_included_with_advanced'] ?? 1);

        return Inertia::render('SuperAdmin/Templates/Index', [
            'templates' => $templates,
            'settings' => [
                'free_templates_included_with_advanced' => $freeWithAdvanced,
            ],
        ]);
    }

    /**
     * Update template details (price, active, sort order, tags, definition).
     */
    public function update(Request $request): RedirectResponse
    {
        $templateParam = $request->route('template');
        $template = $templateParam instanceof WebsiteTemplate
            ? $templateParam
            : WebsiteTemplate::findOrFail($templateParam);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'tagline' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'tags' => ['nullable', 'array'],
            'definition' => ['nullable', 'array'],
        ]);

        $template->update($validated);

        AuditLogger::log('template.updated_by_admin', [
            'admin_id' => auth()->id(),
            'template_id' => $template->id,
            'template_name' => $template->name,
            'new_price_cents' => $template->price_cents,
            'is_active' => $template->is_active,
        ]);

        return redirect()->back()->with('success', "Template '{$template->name}' updated successfully.");
    }

    /**
     * Update platform settings for website templates.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'free_templates_included_with_advanced' => ['required', 'integer', 'min:0', 'max:10'],
        ]);

        $this->settingsService->set('templates.free_templates_included_with_advanced', $validated['free_templates_included_with_advanced']);

        AuditLogger::log('platform_settings.updated', [
            'admin_id' => auth()->id(),
            'key' => 'templates.free_templates_included_with_advanced',
            'value' => $validated['free_templates_included_with_advanced'],
        ]);

        return redirect()->back()->with('success', 'Platform template settings updated successfully.');
    }

    /**
     * Template Sales Report (/super-admin/template-sales).
     */
    public function sales(Request $request): Response
    {
        $query = TemplatePurchase::with(['template', 'tenant', 'invoice', 'purchaser'])
            ->latest('id');

        if ($request->filled('template_id')) {
            $query->where('template_id', $request->input('template_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('source')) {
            $query->where('source', $request->input('source'));
        }

        $purchases = $query->paginate(25)->withQueryString();

        $totalRevenueCents = (int) TemplatePurchase::where('status', TemplatePurchase::STATUS_PAID)
            ->where('source', TemplatePurchase::SOURCE_PURCHASE)
            ->sum('price_cents');

        $paidCount = TemplatePurchase::where('status', TemplatePurchase::STATUS_PAID)->count();
        $planIncludedCount = TemplatePurchase::where('status', TemplatePurchase::STATUS_PAID)
            ->where('source', TemplatePurchase::SOURCE_PLAN_INCLUDED)
            ->count();

        $templates = WebsiteTemplate::active()->get(['id', 'name', 'slug']);

        return Inertia::render('SuperAdmin/Templates/Sales', [
            'purchases' => $purchases,
            'metrics' => [
                'total_revenue_cents' => $totalRevenueCents,
                'total_revenue_formatted' => 'Rs. '.number_format($totalRevenueCents / 100, 2),
                'paid_count' => $paidCount,
                'plan_included_count' => $planIncludedCount,
            ],
            'templates' => $templates,
            'filters' => $request->only(['template_id', 'status', 'source']),
        ]);
    }

    /**
     * Export template sales CSV.
     */
    public function exportSalesCsv(Request $request): StreamedResponse
    {
        AuditLogger::log('template.sales_csv_exported', [
            'admin_id' => auth()->id(),
            'filters' => $request->all(),
        ]);

        $query = TemplatePurchase::with(['template', 'tenant', 'invoice', 'purchaser'])
            ->latest('id');

        if ($request->filled('template_id')) {
            $query->where('template_id', $request->input('template_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="medvisit_template_sales_'.now()->format('Y-m-d').'.csv"',
        ];

        return FacadeResponse::stream(function () use ($query) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Purchase ID',
                'Template',
                'Clinic Subdomain',
                'Clinic Name',
                'Source',
                'Price (LKR)',
                'Status',
                'Invoice / Receipt',
                'First Published At',
                'Purchased At',
            ]);

            $query->chunk(100, function ($purchases) use ($file) {
                foreach ($purchases as $p) {
                    fputcsv($file, [
                        $p->id,
                        $p->template?->name ?? 'Unknown',
                        $p->tenant?->subdomain ?? $p->tenant_id,
                        $p->tenant?->name ?? 'Clinic',
                        $p->source,
                        number_format($p->price_cents / 100, 2, '.', ''),
                        $p->status,
                        $p->invoice?->receipt_number ?? ($p->invoice?->invoice_number ?? 'N/A'),
                        $p->first_published_at?->toIso8601String() ?? 'Unpublished',
                        $p->purchased_at?->toIso8601String() ?? $p->created_at->toIso8601String(),
                    ]);
                }
            });

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Grant or revoke template entitlement for a clinic (Admin action with required reason).
     */
    public function overrideClinicEntitlement(Request $request): RedirectResponse
    {
        $clinicId = (string) $request->route('clinicId');
        $validated = $request->validate([
            'template_id' => ['required', 'exists:website_templates,id'],
            'action' => ['required', 'in:grant,revoke'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $tenant = Tenant::findOrFail($clinicId);
        $template = WebsiteTemplate::findOrFail($validated['template_id']);

        if ($validated['action'] === 'grant') {
            TemplatePurchase::updateOrCreate(
                ['tenant_id' => $tenant->id, 'template_id' => $template->id],
                [
                    'source' => TemplatePurchase::SOURCE_ADMIN_GRANT,
                    'price_cents' => 0,
                    'version_at_purchase' => $template->version,
                    'status' => TemplatePurchase::STATUS_PAID,
                    'purchased_at' => now(),
                    'purchased_by_user_id' => auth()->id(),
                    'revoked_at' => null,
                    'revoked_reason' => null,
                ]
            );

            AuditLogger::log('template.admin_grant', [
                'admin_id' => auth()->id(),
                'tenant_id' => $tenant->id,
                'template_id' => $template->id,
                'reason' => $validated['reason'],
            ]);

            return redirect()->back()->with('success', "Granted '{$template->name}' entitlement to {$tenant->name}.");
        } else {
            $purchase = TemplatePurchase::where('tenant_id', $tenant->id)
                ->where('template_id', $template->id)
                ->first();

            if ($purchase) {
                $purchase->update([
                    'status' => TemplatePurchase::STATUS_REVOKED,
                    'revoked_at' => now(),
                    'revoked_reason' => $validated['reason'],
                ]);
            }

            if ((int) $tenant->applied_template_id === (int) $template->id) {
                app(TemplateService::class)->revertToPreviousDesign($tenant);
                ClinicWebsite::publish($tenant);
            }

            AuditLogger::log('template.admin_revoke', [
                'admin_id' => auth()->id(),
                'tenant_id' => $tenant->id,
                'template_id' => $template->id,
                'reason' => $validated['reason'],
            ]);

            return redirect()->back()->with('success', "Revoked '{$template->name}' entitlement from {$tenant->name}.");
        }
    }
}
