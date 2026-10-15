<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\FeeComponent;
use App\Models\VisitType;
use App\Services\FeeResolutionService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FeeSettingsController extends Controller
{
    public function __construct(
        protected FeeResolutionService $feeService
    ) {}

    /**
     * Display Fees & Payouts settings.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $settings = $this->feeService->getTenantSettings($tenant);

        $components = FeeComponent::where('tenant_id', $tenant->id)
            ->with('targetComponent')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'amount_type' => $c->amount_type,
                'target_component_id' => $c->target_component_id,
                'target_component_name' => $c->targetComponent?->name,
                'amount_value' => $c->amount_value,
                'amount_display' => $c->amount_type === 'fixed'
                    ? 'Rs. '.number_format($c->amount_value / 100, 2)
                    : $c->amount_value.'%',
                'amount_lkr' => $c->amount_type === 'fixed' ? round($c->amount_value / 100, 2) : $c->amount_value,
                'recipient' => $c->recipient,
                'recipient_name' => $c->recipient_name,
                'applies_to' => $c->applies_to ?? ['walk_in', 'phone', 'online'],
                'is_mandatory' => (bool) $c->is_mandatory,
                'is_separate_line' => (bool) $c->is_separate_line,
                'is_active' => (bool) $c->is_active,
                'sort_order' => $c->sort_order,
            ]);

        $visitTypes = VisitType::where('tenant_id', $tenant->id)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'name' => $v->name,
                'code' => $v->code,
                'pricing_type' => $v->pricing_type,
                'percentage_value' => $v->percentage_value,
                'fixed_fee_cents' => $v->fixed_fee_cents,
                'fixed_fee_lkr' => round($v->fixed_fee_cents / 100, 2),
                'fixed_fee_formatted' => 'Rs. '.number_format($v->fixed_fee_cents / 100, 2),
                'is_default' => (bool) $v->is_default,
                'is_active' => (bool) $v->is_active,
                'allow_online' => (bool) $v->allow_online,
                'sort_order' => $v->sort_order,
                'payout_rule_override' => $v->payout_rule_override,
            ]);

        return Inertia::render('Settings/FeesAndPayouts', [
            'settings' => [
                'pricing_mode' => $settings['pricing_mode'] ?? 'split',
                'default_doctor_fee_lkr' => round(($settings['default_doctor_fee'] ?? 200000) / 100, 2),
                'default_clinic_fee_lkr' => round(($settings['default_clinic_fee'] ?? 80000) / 100, 2),
                'default_total_fee_lkr' => round(($settings['default_total_fee'] ?? 280000) / 100, 2),
                'online_booking_fee_lkr' => round(($settings['online_booking_fee'] ?? 0) / 100, 2),
                'rounding_step' => (int) ($settings['rounding_step'] ?? 0),
                'default_payout_rule' => $settings['default_payout_rule'] ?? [
                    'type' => 'full_doctor_fee',
                    'value' => 0,
                    'min_patients' => 0,
                    'pay_no_shows' => false,
                    'pay_cancelled' => false,
                ],
                'receptionist_can_discount' => (bool) ($settings['receptionist_can_discount'] ?? true),
                'receptionist_max_discount_type' => $settings['receptionist_max_discount_type'] ?? 'percent',
                'receptionist_max_discount_value' => (int) ($settings['receptionist_max_discount_value'] ?? 20),
                'fee_setup_completed' => (bool) ($settings['fee_setup_completed'] ?? false),
            ],
            'components' => $components,
            'visitTypes' => $visitTypes,
        ]);
    }

    /**
     * Update Clinic Defaults & Payout Rules.
     */
    public function updateDefaults(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pricing_mode' => ['required', 'string', 'in:split,single_price'],
            'default_doctor_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'default_clinic_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'default_total_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'online_booking_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'rounding_step' => ['required', 'integer', 'in:0,10,50,100'],
            'default_payout_rule' => ['required', 'array'],
            'default_payout_rule.type' => ['required', 'string', 'in:full_doctor_fee,fixed_per_patient,percentage_of_total,fixed_per_session,salaried,none'],
            'default_payout_rule.value' => ['nullable', 'numeric', 'min:0'],
            'default_payout_rule.min_patients' => ['nullable', 'integer', 'min:0'],
            'default_payout_rule.pay_no_shows' => ['nullable', 'boolean'],
            'default_payout_rule.pay_cancelled' => ['nullable', 'boolean'],
            'receptionist_can_discount' => ['required', 'boolean'],
            'receptionist_max_discount_type' => ['required', 'string', 'in:percent,amount'],
            'receptionist_max_discount_value' => ['required', 'numeric', 'min:0'],
        ]);

        $tenant = tenant();
        $oldSettings = $tenant->fee_settings ?? [];

        $payoutVal = (int) round(($validated['default_payout_rule']['value'] ?? 0) * 100);
        // If percentage, store percentage value directly
        if ($validated['default_payout_rule']['type'] === 'percentage_of_total') {
            $payoutVal = (int) ($validated['default_payout_rule']['value'] ?? 0);
        }

        $newSettings = array_merge($oldSettings, [
            'pricing_mode' => $validated['pricing_mode'],
            'default_doctor_fee' => (int) round(($validated['default_doctor_fee_lkr'] ?? 0) * 100),
            'default_clinic_fee' => (int) round(($validated['default_clinic_fee_lkr'] ?? 0) * 100),
            'default_total_fee' => (int) round(($validated['default_total_fee_lkr'] ?? 0) * 100),
            'online_booking_fee' => (int) round(($validated['online_booking_fee_lkr'] ?? 0) * 100),
            'rounding_step' => $validated['rounding_step'],
            'default_payout_rule' => [
                'type' => $validated['default_payout_rule']['type'],
                'value' => $payoutVal,
                'min_patients' => (int) ($validated['default_payout_rule']['min_patients'] ?? 0),
                'pay_no_shows' => (bool) ($validated['default_payout_rule']['pay_no_shows'] ?? false),
                'pay_cancelled' => (bool) ($validated['default_payout_rule']['pay_cancelled'] ?? false),
            ],
            'receptionist_can_discount' => $validated['receptionist_can_discount'],
            'receptionist_max_discount_type' => $validated['receptionist_max_discount_type'],
            'receptionist_max_discount_value' => $validated['receptionist_max_discount_type'] === 'amount'
                ? (int) round($validated['receptionist_max_discount_value'] * 100)
                : (int) $validated['receptionist_max_discount_value'],
            'fee_setup_completed' => true,
        ]);

        $tenant->fee_settings = $newSettings;
        $tenant->save();

        // Audit Trail
        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'fees.defaults_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => [
                'old' => $oldSettings,
                'new' => $newSettings,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Fee defaults and payout policies updated.');
    }

    /**
     * Apply a pre-configured fee structure preset.
     */
    public function applyPreset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'preset' => ['required', 'string', 'in:split,single_price,dispensary,hospital_opd'],
        ]);

        $tenant = tenant();
        $oldSettings = $tenant->fee_settings ?? [];

        DB::transaction(function () use ($tenant, $validated) {
            $now = now();
            // Wipe existing components for clean preset initialization
            FeeComponent::where('tenant_id', $tenant->id)->delete();

            $preset = $validated['preset'];

            if ($preset === 'split') {
                // Channeling centre (split)
                $tenant->fee_settings = array_merge($tenant->fee_settings ?? [], [
                    'pricing_mode' => 'split',
                    'default_doctor_fee' => 200000,
                    'default_clinic_fee' => 80000,
                    'default_total_fee' => 280000,
                    'default_payout_rule' => [
                        'type' => 'full_doctor_fee',
                        'value' => 0,
                        'min_patients' => 0,
                        'pay_no_shows' => false,
                        'pay_cancelled' => false,
                    ],
                    'fee_setup_completed' => true,
                ]);
                $tenant->save();

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Doctor fee',
                    'code' => 'doctor_fee',
                    'amount_type' => 'fixed',
                    'amount_value' => 200000,
                    'recipient' => 'doctor',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 1,
                ]);

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Channeling fee',
                    'code' => 'channeling_fee',
                    'amount_type' => 'fixed',
                    'amount_value' => 80000,
                    'recipient' => 'clinic',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 2,
                ]);
            } elseif ($preset === 'single_price') {
                // Single price clinic
                $tenant->fee_settings = array_merge($tenant->fee_settings ?? [], [
                    'pricing_mode' => 'single_price',
                    'default_doctor_fee' => 0,
                    'default_clinic_fee' => 250000,
                    'default_total_fee' => 250000,
                    'default_payout_rule' => [
                        'type' => 'percentage_of_total',
                        'value' => 60, // 60% to doctor
                        'min_patients' => 0,
                        'pay_no_shows' => false,
                        'pay_cancelled' => false,
                    ],
                    'fee_setup_completed' => true,
                ]);
                $tenant->save();

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Consultation fee',
                    'code' => 'consultation_fee',
                    'amount_type' => 'fixed',
                    'amount_value' => 250000,
                    'recipient' => 'clinic',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => false,
                    'is_active' => true,
                    'sort_order' => 1,
                ]);
            } elseif ($preset === 'dispensary') {
                // Dispensary (Consultation fee + optional Medicine)
                $tenant->fee_settings = array_merge($tenant->fee_settings ?? [], [
                    'pricing_mode' => 'single_price',
                    'default_doctor_fee' => 0,
                    'default_clinic_fee' => 150000,
                    'default_total_fee' => 150000,
                    'default_payout_rule' => [
                        'type' => 'fixed_per_patient',
                        'value' => 80000, // Rs. 800 per patient
                        'min_patients' => 0,
                        'pay_no_shows' => false,
                        'pay_cancelled' => false,
                    ],
                    'fee_setup_completed' => true,
                ]);
                $tenant->save();

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Consultation fee',
                    'code' => 'consultation_fee',
                    'amount_type' => 'fixed',
                    'amount_value' => 150000,
                    'recipient' => 'clinic',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 1,
                ]);

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Medicine charge',
                    'code' => 'medicine_charge',
                    'amount_type' => 'fixed',
                    'amount_value' => 100000,
                    'recipient' => 'clinic',
                    'applies_to' => ['walk_in', 'phone'],
                    'is_mandatory' => false, // Optional, ticked at reception
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 2,
                ]);
            } elseif ($preset === 'hospital_opd') {
                // Hospital OPD style (Doctor fee + Hospital charge + 10% Service charge)
                $tenant->fee_settings = array_merge($tenant->fee_settings ?? [], [
                    'pricing_mode' => 'split',
                    'default_doctor_fee' => 200000,
                    'default_clinic_fee' => 120000,
                    'default_total_fee' => 320000,
                    'default_payout_rule' => [
                        'type' => 'full_doctor_fee',
                        'value' => 0,
                        'min_patients' => 0,
                        'pay_no_shows' => false,
                        'pay_cancelled' => false,
                    ],
                    'fee_setup_completed' => true,
                ]);
                $tenant->save();

                $docComp = FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Doctor fee',
                    'code' => 'doctor_fee',
                    'amount_type' => 'fixed',
                    'amount_value' => 200000,
                    'recipient' => 'doctor',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 1,
                ]);

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Hospital charge',
                    'code' => 'hospital_charge',
                    'amount_type' => 'fixed',
                    'amount_value' => 100000,
                    'recipient' => 'clinic',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 2,
                ]);

                FeeComponent::create([
                    'tenant_id' => $tenant->id,
                    'name' => 'Service charge (10%)',
                    'code' => 'service_charge',
                    'amount_type' => 'percent_subtotal',
                    'amount_value' => 10,
                    'recipient' => 'clinic',
                    'applies_to' => ['walk_in', 'phone', 'online'],
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 3,
                ]);
            }
        });

        // Audit Trail
        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'fees.preset_applied',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => [
                'preset' => $validated['preset'],
                'old_settings' => $oldSettings,
                'new_settings' => $tenant->fee_settings,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Preset '{$validated['preset']}' applied successfully.");
    }

    /**
     * Store or update a fee component.
     */
    public function storeComponent(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'amount_type' => ['required', 'string', 'in:fixed,percent_component,percent_subtotal'],
            'target_component_id' => ['nullable', 'exists:fee_components,id'],
            'amount_lkr' => ['nullable', 'numeric', 'min:0'],
            'amount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'recipient' => ['required', 'string', 'in:doctor,clinic,third_party'],
            'recipient_name' => ['nullable', 'string', 'max:100'],
            'applies_to' => ['required', 'array', 'min:1'],
            'applies_to.*' => ['string', 'in:walk_in,phone,online'],
            'is_mandatory' => ['required', 'boolean'],
            'is_separate_line' => ['required', 'boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $tenant = tenant();

        $amountValue = $validated['amount_type'] === 'fixed'
            ? (int) round(($validated['amount_lkr'] ?? 0) * 100)
            : (int) ($validated['amount_percent'] ?? 0);

        FeeComponent::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'code' => strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', trim($validated['name']))),
            'amount_type' => $validated['amount_type'],
            'target_component_id' => $validated['target_component_id'] ?? null,
            'amount_value' => $amountValue,
            'recipient' => $validated['recipient'],
            'recipient_name' => $validated['recipient_name'] ?? null,
            'applies_to' => $validated['applies_to'],
            'is_mandatory' => $validated['is_mandatory'],
            'is_separate_line' => $validated['is_separate_line'],
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'fees.component_created',
            'resource_type' => 'fee_component',
            'resource_id' => $validated['name'],
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Fee component '{$validated['name']}' added.");
    }

    /**
     * Update an existing fee component.
     */
    public function updateComponent(Request $request, FeeComponent $component): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'amount_type' => ['required', 'string', 'in:fixed,percent_component,percent_subtotal'],
            'target_component_id' => ['nullable', 'exists:fee_components,id'],
            'amount_lkr' => ['nullable', 'numeric', 'min:0'],
            'amount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'recipient' => ['required', 'string', 'in:doctor,clinic,third_party'],
            'recipient_name' => ['nullable', 'string', 'max:100'],
            'applies_to' => ['required', 'array', 'min:1'],
            'applies_to.*' => ['string', 'in:walk_in,phone,online'],
            'is_mandatory' => ['required', 'boolean'],
            'is_separate_line' => ['required', 'boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        // Validation against cyclic reference
        if (! empty($validated['target_component_id']) && (int) $validated['target_component_id'] === $component->id) {
            throw ValidationException::withMessages([
                'target_component_id' => 'A component cannot calculate its percentage from itself.',
            ]);
        }

        $amountValue = $validated['amount_type'] === 'fixed'
            ? (int) round(($validated['amount_lkr'] ?? 0) * 100)
            : (int) ($validated['amount_percent'] ?? 0);

        $old = $component->toArray();

        $component->update([
            'name' => $validated['name'],
            'amount_type' => $validated['amount_type'],
            'target_component_id' => $validated['target_component_id'] ?? null,
            'amount_value' => $amountValue,
            'recipient' => $validated['recipient'],
            'recipient_name' => $validated['recipient_name'] ?? null,
            'applies_to' => $validated['applies_to'],
            'is_mandatory' => $validated['is_mandatory'],
            'is_separate_line' => $validated['is_separate_line'],
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        AuditEvent::create([
            'tenant_id' => tenant('id'),
            'user_id' => $request->user()->id,
            'action' => 'fees.component_updated',
            'resource_type' => 'fee_component',
            'resource_id' => (string) $component->id,
            'metadata' => [
                'old' => $old,
                'new' => $component->toArray(),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Fee component '{$component->name}' updated.");
    }

    /**
     * Delete a fee component (if not the sole active component).
     */
    public function destroyComponent(FeeComponent $component): RedirectResponse
    {
        $tenantId = tenant('id');
        $activeCount = FeeComponent::where('tenant_id', $tenantId)->where('is_active', true)->count();

        if ($activeCount <= 1 && $component->is_active) {
            return redirect()->back()->withErrors([
                'component' => 'At least one active fee component must remain configured.',
            ]);
        }

        $component->delete();

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => auth()->id(),
            'action' => 'fees.component_deleted',
            'resource_type' => 'fee_component',
            'resource_id' => (string) $component->id,
            'metadata' => ['deleted_component' => $component->name],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Fee component '{$component->name}' deleted.");
    }

    /**
     * Store or update a Visit Type.
     */
    public function storeVisitType(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'pricing_type' => ['required', 'string', 'in:percentage,fixed'],
            'percentage_value' => ['nullable', 'integer', 'min:0', 'max:500'],
            'fixed_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'allow_online' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'payout_rule_override' => ['nullable', 'array'],
        ]);

        $tenant = tenant();

        if (! empty($validated['is_default'])) {
            VisitType::where('tenant_id', $tenant->id)->update(['is_default' => false]);
        }

        $vt = VisitType::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'code' => strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', trim($validated['name']))),
            'pricing_type' => $validated['pricing_type'],
            'percentage_value' => $validated['pricing_type'] === 'percentage' ? ($validated['percentage_value'] ?? 100) : 0,
            'fixed_fee_cents' => $validated['pricing_type'] === 'fixed' ? (int) round(($validated['fixed_fee_lkr'] ?? 0) * 100) : 0,
            'is_default' => $validated['is_default'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'allow_online' => $validated['allow_online'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
            'payout_rule_override' => $validated['payout_rule_override'] ?? null,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'fees.visit_type_created',
            'resource_type' => 'visit_type',
            'resource_id' => (string) $vt->id,
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Visit type '{$vt->name}' added.");
    }

    /**
     * Update an existing Visit Type.
     */
    public function updateVisitType(Request $request, VisitType $visitType): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'pricing_type' => ['required', 'string', 'in:percentage,fixed'],
            'percentage_value' => ['nullable', 'integer', 'min:0', 'max:500'],
            'fixed_fee_lkr' => ['nullable', 'numeric', 'min:0'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'allow_online' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'payout_rule_override' => ['nullable', 'array'],
        ]);

        $tenantId = tenant('id');

        if (! empty($validated['is_default']) && ! $visitType->is_default) {
            VisitType::where('tenant_id', $tenantId)->update(['is_default' => false]);
        }

        $old = $visitType->toArray();

        $visitType->update([
            'name' => $validated['name'],
            'pricing_type' => $validated['pricing_type'],
            'percentage_value' => $validated['pricing_type'] === 'percentage' ? ($validated['percentage_value'] ?? 100) : 0,
            'fixed_fee_cents' => $validated['pricing_type'] === 'fixed' ? (int) round(($validated['fixed_fee_lkr'] ?? 0) * 100) : 0,
            'is_default' => $validated['is_default'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'allow_online' => $validated['allow_online'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
            'payout_rule_override' => $validated['payout_rule_override'] ?? null,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'fees.visit_type_updated',
            'resource_type' => 'visit_type',
            'resource_id' => (string) $visitType->id,
            'metadata' => ['old' => $old, 'new' => $visitType->toArray()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', "Visit type '{$visitType->name}' updated.");
    }

    /**
     * Delete a Visit Type.
     */
    public function destroyVisitType(VisitType $visitType): RedirectResponse
    {
        if ($visitType->is_default) {
            return redirect()->back()->withErrors([
                'visit_type' => 'Cannot delete the default visit type. Mark another visit type as default first.',
            ]);
        }

        $visitType->delete();

        return redirect()->back()->with('success', "Visit type '{$visitType->name}' deleted.");
    }
}
