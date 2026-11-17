<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\ClinicReferral;
use App\Models\Plan;
use App\Models\TenantBillingCredit;
use App\Services\Referrals\ReferralCreditService;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicReferralController extends Controller
{
    /**
     * Display the "Refer a clinic" page for clinic admin.
     */
    public function index(
        Request $request,
        ReferralService $referralService,
        ReferralCreditService $creditService
    ): Response {
        $tenant = tenant();
        $user = $request->user();

        // 1. Strict flag check: if disabled, hide UI entirely
        if (! $referralService->isEnabled()) {
            abort(404, 'The clinic referral program is currently not active.');
        }

        // 2. Role authorization: clinic_admin or super_admin only
        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403, 'Only clinic administrators can access the Referral Program.');
        }

        $referralCode = $tenant->effective_referral_code;
        $referralUrl = $referralService->getReferralUrl($tenant);
        $creditBalanceCents = $creditService->getBalance($tenant);

        // Fetch referrals made by this clinic (clinic names only, NO personal data)
        $referrals = ClinicReferral::where('referrer_tenant_id', $tenant->id)
            ->with('referredTenant')
            ->orderByDesc('id')
            ->get()
            ->map(fn (ClinicReferral $r) => [
                'id' => $r->id,
                'clinic_name' => $r->referredTenant?->name ?? 'New Clinic',
                'status' => $r->status,
                'reward_amount_cents' => $r->reward_amount_cents,
                'reward_formatted' => $r->formatted_reward,
                'qualifying_invoices_count' => $r->qualifying_invoices_count,
                'created_at' => $r->created_at?->toDateString(),
            ]);

        $totalEarnedCents = (int) TenantBillingCredit::where('tenant_id', $tenant->id)
            ->where('type', TenantBillingCredit::TYPE_REFERRAL_REWARD)
            ->sum('amount_cents');

        $referrerPlan = Plan::where('slug', $tenant->plan)->first();
        $maxRewardPerReferralCents = $referrerPlan ? $referrerPlan->price_cents : 900000;

        return Inertia::render('Billing/Referrals', [
            'referralCode' => $referralCode,
            'referralUrl' => $referralUrl,
            'creditBalanceCents' => $creditBalanceCents,
            'creditBalanceFormatted' => 'Rs. '.number_format(max(0, $creditBalanceCents) / 100, 2),
            'totalEarnedCents' => $totalEarnedCents,
            'totalEarnedFormatted' => 'Rs. '.number_format($totalEarnedCents / 100, 2),
            'maxRewardFormatted' => 'Rs. '.number_format($maxRewardPerReferralCents / 100, 2),
            'referrals' => $referrals,
            'hasPaidInvoice' => $tenant->hasPaidAtLeastOneInvoice(),
            'isCompOrDemo' => $tenant->isCompOrDemo(),
            'qualifyingTarget' => (int) config('referrals.qualifying_paid_invoices', 2),
            'currentPlanName' => $referrerPlan ? $referrerPlan->name : 'Your Plan',
        ]);
    }
}
