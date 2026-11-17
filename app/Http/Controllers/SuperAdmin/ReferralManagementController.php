<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ClinicReferral;
use App\Models\Tenant;
use App\Models\TenantBillingCredit;
use App\Services\AuditLogger;
use App\Services\PlatformSettingsService;
use App\Services\Referrals\ReferralCreditService;
use App\Services\Referrals\ReferralService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReferralManagementController extends Controller
{
    /**
     * Super Admin Referrals Dashboard & Management View.
     */
    public function index(
        Request $request,
        PlatformSettingsService $settingsService,
        ReferralCreditService $creditService
    ): InertiaResponse {
        $settings = $settingsService->all();

        // 1. All referrals with referrer, referred, and audit info
        $referrals = ClinicReferral::with(['referrerTenant', 'referredTenant', 'approvedByUser', 'rejectedByUser'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (ClinicReferral $r) => [
                'id' => $r->id,
                'referrer' => [
                    'id' => $r->referrerTenant?->id,
                    'name' => $r->referrerTenant?->name,
                    'plan' => $r->referrerTenant?->plan,
                    'has_paid' => $r->referrerTenant?->hasPaidAtLeastOneInvoice() ?? false,
                ],
                'referred' => [
                    'id' => $r->referredTenant?->id,
                    'name' => $r->referredTenant?->name,
                    'plan' => $r->referredTenant?->plan,
                ],
                'referral_code' => $r->referral_code,
                'status' => $r->status,
                'reward_amount_cents' => $r->reward_amount_cents,
                'reward_formatted' => $r->formatted_reward,
                'qualifying_invoices_count' => $r->qualifying_invoices_count,
                'flags' => $r->flags,
                'has_flags' => $r->hasAbuseFlags(),
                'rejection_reason' => $r->rejection_reason,
                'admin_notes' => $r->admin_notes,
                'approved_by' => $r->approvedByUser?->name,
                'approved_at' => $r->approved_at?->toDateTimeString(),
                'rejected_by' => $r->rejectedByUser?->name,
                'rejected_at' => $r->rejected_at?->toDateTimeString(),
                'created_at' => $r->created_at?->toDateTimeString(),
            ]);

        // 2. Credit ledger recent entries across all clinics
        $ledgerEntries = TenantBillingCredit::with(['tenant', 'referral.referredTenant', 'invoice'])
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (TenantBillingCredit $c) => [
                'id' => $c->id,
                'tenant_name' => $c->tenant?->name ?? $c->tenant_id,
                'type' => $c->type,
                'amount_cents' => $c->amount_cents,
                'formatted_amount' => $c->formatted_amount,
                'balance_after_cents' => $c->balance_after_cents,
                'formatted_balance' => $c->formatted_balance,
                'expires_at' => $c->expires_at?->toDateString(),
                'is_expired' => $c->isExpired(),
                'notes' => $c->notes,
                'created_at' => $c->created_at?->toDateTimeString(),
            ]);

        // 3. Stats
        $stats = [
            'total_referrals' => ClinicReferral::count(),
            'rewarded_count' => ClinicReferral::where('status', ClinicReferral::STATUS_REWARDED)->count(),
            'pending_review_count' => ClinicReferral::where('status', ClinicReferral::STATUS_REWARD_PENDING)->count(),
            'flagged_count' => ClinicReferral::whereNotNull('flags')->count(),
            'total_credits_granted_cents' => (int) TenantBillingCredit::where('type', TenantBillingCredit::TYPE_REFERRAL_REWARD)->sum('amount_cents'),
            'total_credits_used_cents' => (int) abs((int) TenantBillingCredit::where('type', TenantBillingCredit::TYPE_INVOICE_DEDUCTION)->sum('amount_cents')),
        ];

        return Inertia::render('SuperAdmin/Referrals/Index', [
            'referrals' => $referrals,
            'ledgerEntries' => $ledgerEntries,
            'stats' => $stats,
            'settings' => [
                'enabled' => (bool) ($settings['referrals.enabled'] ?? false),
                'qualifying_invoices' => (int) ($settings['referrals.qualifying_invoices'] ?? 2),
                'approval_required' => (bool) ($settings['referrals.approval_required'] ?? false),
                'annual_cap_multiplier' => (int) ($settings['referrals.annual_cap_multiplier'] ?? 12),
                'credit_expiry_months' => (int) ($settings['referrals.credit_expiry_months'] ?? 12),
                'welcome_benefit_enabled' => (bool) ($settings['referrals.welcome_benefit_enabled'] ?? false),
                'welcome_benefit_type' => (string) ($settings['referrals.welcome_benefit_type'] ?? 'extra_trial_days'),
                'welcome_benefit_value' => (int) ($settings['referrals.welcome_benefit_value'] ?? 14),
            ],
        ]);
    }

    protected function resolveReferral(Request $request): ClinicReferral
    {
        $param = $request->route('referral');

        return $param instanceof ClinicReferral ? $param : ClinicReferral::findOrFail($param);
    }

    protected function resolveTenant(Request $request): Tenant
    {
        $param = $request->route('tenant');

        return $param instanceof Tenant ? $param : Tenant::findOrFail($param);
    }

    /**
     * Approve a pending referral reward.
     */
    public function approve(
        Request $request,
        ReferralService $referralService
    ): RedirectResponse {
        $referral = $this->resolveReferral($request);

        $validated = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $referralService->approveReferral(
            $referral,
            (int) $request->user()->id,
            $validated['admin_notes'] ?? null
        );

        return back()->with('success', "Referral reward approved and credited to clinic {$referral->referrerTenant?->name}.");
    }

    /**
     * Reject a referral reward (reason is required).
     */
    public function reject(
        Request $request,
        ReferralService $referralService
    ): RedirectResponse {
        $referral = $this->resolveReferral($request);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'admin_notes' => ['nullable', 'string', 'max:500'],
        ], [
            'reason.required' => 'A rejection reason is required.',
        ]);

        $referralService->rejectReferral(
            $referral,
            (int) $request->user()->id,
            $validated['reason'],
            $validated['admin_notes'] ?? null
        );

        return back()->with('success', 'Referral has been rejected.');
    }

    /**
     * Edit a clinic's referral code (allowed once by Super Admin).
     */
    public function editCode(Request $request): RedirectResponse
    {
        $tenant = $this->resolveTenant($request);

        if ($tenant->referral_code_edited_at !== null) {
            return back()->withErrors(['code' => 'This clinic referral code has already been edited once and cannot be changed again.']);
        }

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'min:3',
                'max:30',
                'alpha_dash',
                'unique:tenants,referral_code',
                'unique:tenants,subdomain',
            ],
        ]);

        $oldCode = $tenant->effective_referral_code;
        $newCode = strtolower(trim($validated['code']));

        $tenant->update([
            'referral_code' => $newCode,
            'referral_code_edited_at' => Carbon::now('Asia/Colombo'),
            'referral_code_edited_by' => $request->user()->id,
        ]);

        AuditLogger::log('referral.code_customized', [
            'tenant_id' => $tenant->id,
            'old_code' => $oldCode,
            'new_code' => $newCode,
            'user_id' => $request->user()->id,
        ]);

        return back()->with('success', "Clinic referral code updated to '{$newCode}'.");
    }

    /**
     * Update Referral Program Global Settings.
     */
    public function updateSettings(Request $request, PlatformSettingsService $settingsService): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'qualifying_invoices' => ['required', 'integer', 'min:1', 'max:12'],
            'approval_required' => ['required', 'boolean'],
            'annual_cap_multiplier' => ['required', 'integer', 'min:1', 'max:24'],
            'credit_expiry_months' => ['required', 'integer', 'min:1', 'max:36'],
            'welcome_benefit_enabled' => ['nullable', 'boolean'],
            'welcome_benefit_type' => ['nullable', 'string', 'in:extra_trial_days,discount_percent'],
            'welcome_benefit_value' => ['nullable', 'integer', 'min:1', 'max:90'],
        ]);

        $settingsService->setMany([
            'referrals.enabled' => (bool) $validated['enabled'],
            'referrals.qualifying_invoices' => (int) $validated['qualifying_invoices'],
            'referrals.approval_required' => (bool) $validated['approval_required'],
            'referrals.annual_cap_multiplier' => (int) $validated['annual_cap_multiplier'],
            'referrals.credit_expiry_months' => (int) $validated['credit_expiry_months'],
            'referrals.welcome_benefit_enabled' => (bool) ($validated['welcome_benefit_enabled'] ?? false),
            'referrals.welcome_benefit_type' => (string) ($validated['welcome_benefit_type'] ?? 'extra_trial_days'),
            'referrals.welcome_benefit_value' => (int) ($validated['welcome_benefit_value'] ?? 14),
        ]);

        AuditLogger::log('platform_settings.updated', [
            'section' => 'referrals',
            'user_id' => $request->user()->id,
        ]);

        return back()->with('success', 'Referral program settings updated successfully.');
    }

    /**
     * Export all referrals to CSV.
     */
    public function exportCsv(): StreamedResponse
    {
        $fileName = 'medvisit_referrals_'.Carbon::now('Asia/Colombo')->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'ID',
                'Referrer Clinic ID',
                'Referrer Clinic Name',
                'Referral Code',
                'Referred Clinic ID',
                'Referred Clinic Name',
                'Status',
                'Reward Amount (LKR)',
                'Qualifying Invoices Paid',
                'Abuse Flags',
                'Rejection Reason',
                'Created At',
            ]);

            ClinicReferral::with(['referrerTenant', 'referredTenant'])
                ->chunk(100, function ($referrals) use ($handle) {
                    foreach ($referrals as $r) {
                        $flags = ! empty($r->flags) ? implode('; ', array_values($r->flags)) : 'None';
                        fputcsv($handle, [
                            $r->id,
                            $r->referrer_tenant_id,
                            $r->referrerTenant?->name ?? 'N/A',
                            $r->referral_code,
                            $r->referred_tenant_id,
                            $r->referredTenant?->name ?? 'N/A',
                            $r->status,
                            number_format($r->reward_amount_cents / 100, 2),
                            $r->qualifying_invoices_count,
                            $flags,
                            $r->rejection_reason ?? '',
                            $r->created_at?->toDateTimeString(),
                        ]);
                    }
                });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
