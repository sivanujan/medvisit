<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Mail\SubscriptionInviteMail;
use App\Models\Plan;
use App\Models\PromoCode;
use App\Models\PromoCodeRedemption;
use App\Models\SubscriptionInvite;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PromotionManagementController extends Controller
{
    /**
     * Display the Promotions hub (Promo codes, Invites, Redemptions).
     */
    public function index(Request $request): Response
    {
        $activeTab = $request->query('tab', 'codes');
        $search = $request->query('search');

        // 1. Promo Codes Query
        $codesQuery = PromoCode::with(['creator:id,name,email'])
            ->withCount('redemptions')
            ->orderByDesc('id');

        if ($search) {
            $codesQuery->where(function ($q) use ($search) {
                $q->where('code', 'ILIKE', "%{$search}%")
                    ->orWhere('notes', 'ILIKE', "%{$search}%");
            });
        }

        $promoCodes = $codesQuery->get()->map(fn (PromoCode $c) => [
            'id' => $c->id,
            'code' => $c->code,
            'notes' => $c->notes,
            'type' => $c->type,
            'value' => $c->value,
            'value_display' => match ($c->type) {
                'percent' => "{$c->value}% off",
                'fixed' => 'Rs. '.number_format($c->value / 100, 2).' off',
                'free_months' => "{$c->value} month(s) free",
                'extra_trial_days' => "+{$c->value} trial days",
                default => (string) $c->value,
            },
            'duration' => $c->duration,
            'duration_months' => $c->duration_months,
            'eligible_plans' => $c->eligible_plans ?? ['*'],
            'new_clinics_only' => (bool) $c->new_clinics_only,
            'max_redemptions' => $c->max_redemptions,
            'times_redeemed' => $c->times_redeemed,
            'redemptions_count' => $c->redemptions_count,
            'valid_from' => $c->valid_from?->setTimezone('Asia/Colombo')->format('Y-m-d H:i'),
            'valid_until' => $c->valid_until?->setTimezone('Asia/Colombo')->format('Y-m-d H:i'),
            'is_active' => (bool) $c->is_active,
            'is_expired' => $c->isExpired(),
            'can_delete' => $c->canBeDeleted(),
            'created_at' => $c->created_at?->setTimezone('Asia/Colombo')->format('d M Y, h:i A'),
            'creator' => $c->creator ? ['id' => $c->creator->id, 'name' => $c->creator->name] : null,
        ]);

        // 2. Invites Query
        $invitesQuery = SubscriptionInvite::with(['creator:id,name', 'registeredTenant:id,name'])
            ->orderByDesc('id');

        if ($search) {
            $invitesQuery->where(function ($q) use ($search) {
                $q->where('recipient_email', 'ILIKE', "%{$search}%")
                    ->orWhere('recipient_name', 'ILIKE', "%{$search}%")
                    ->orWhere('clinic_name', 'ILIKE', "%{$search}%");
            });
        }

        $invites = $invitesQuery->get()->map(fn (SubscriptionInvite $inv) => [
            'id' => $inv->id,
            'recipient_email' => $inv->recipient_email,
            'recipient_name' => $inv->recipient_name,
            'clinic_name' => $inv->clinic_name,
            'plan_slug' => $inv->plan_slug,
            'free_period_type' => $inv->free_period_type,
            'free_period_value' => $inv->free_period_value,
            'free_period_display' => "{$inv->free_period_value} ".($inv->free_period_type === 'months' ? 'month(s)' : 'day(s)').' free',
            'status' => $inv->isExpired() && $inv->status === 'sent' ? 'expired' : $inv->status,
            'expires_at' => $inv->expires_at->setTimezone('Asia/Colombo')->format('d M Y, h:i A'),
            'registered_at' => $inv->registered_at?->setTimezone('Asia/Colombo')->format('d M Y, h:i A'),
            'registered_tenant' => $inv->registeredTenant ? ['id' => $inv->registeredTenant->id, 'name' => $inv->registeredTenant->name] : null,
            'notes' => $inv->notes,
            'creator' => $inv->creator ? ['id' => $inv->creator->id, 'name' => $inv->creator->name] : null,
        ]);

        // 3. Redemptions History
        $redemptions = PromoCodeRedemption::with(['promoCode:id,code', 'tenant:id,name', 'invoice:id,invoice_number'])
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (PromoCodeRedemption $r) => [
                'id' => $r->id,
                'promo_code' => $r->promoCode?->code ?? 'N/A',
                'tenant_name' => $r->tenant?->name ?? $r->tenant_id,
                'tenant_id' => $r->tenant_id,
                'invoice_number' => $r->invoice?->invoice_number,
                'status' => $r->status,
                'discount_type' => $r->discount_type,
                'discount_formatted' => 'Rs. '.number_format($r->discount_amount_cents / 100, 2),
                'final_formatted' => 'Rs. '.number_format($r->final_amount_cents / 100, 2),
                'reserved_at' => $r->reserved_at?->setTimezone('Asia/Colombo')->format('d M Y, h:i A'),
                'activated_at' => $r->activated_at?->setTimezone('Asia/Colombo')->format('d M Y, h:i A'),
                'months_remaining' => $r->months_remaining,
            ]);

        // Available subscription plans for dropdowns
        $plans = Plan::where('is_active', true)
            ->whereIn('slug', ['basic', 'pro', 'advanced'])
            ->orderBy('price_cents')
            ->get(['id', 'name', 'slug', 'price_cents']);

        return Inertia::render('SuperAdmin/Promotions/Index', [
            'activeTab' => $activeTab,
            'promoCodes' => $promoCodes,
            'invites' => $invites,
            'redemptions' => $redemptions,
            'plans' => $plans,
            'totalActiveCodes' => PromoCode::where('is_active', true)->count(),
            'totalRedemptionsCount' => PromoCodeRedemption::where('status', 'active')->count(),
            'totalInvitesSent' => SubscriptionInvite::where('status', 'sent')->count(),
            'flash' => [
                'created_invite_token' => session('created_invite_token'),
                'created_invite_url' => session('created_invite_url'),
            ],
        ]);
    }

    /**
     * Store a new promo code.
     */
    public function storePromo(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:64', 'alpha_num'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'type' => ['required', 'string', 'in:percent,fixed,free_months,extra_trial_days'],
            'value' => ['required', 'numeric', 'min:1'],
            'duration' => ['required', 'string', 'in:once,repeating,forever'],
            'duration_months' => ['nullable', 'integer', 'min:1', 'max:36'],
            'eligible_plans' => ['required', 'array', 'min:1'],
            'eligible_plans.*' => ['string'],
            'new_clinics_only' => ['boolean'],
            'max_redemptions' => ['nullable', 'integer', 'min:1'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active' => ['boolean'],
        ]);

        $code = ! empty($validated['code'])
            ? strtoupper(trim($validated['code']))
            : strtoupper(Str::random(8));

        if (PromoCode::where('code', $code)->exists()) {
            return back()->withErrors(['code' => "The promo code '{$code}' already exists."]);
        }

        // Convert value to appropriate units: fixed discount input in LKR -> cents
        $rawValue = (float) $validated['value'];
        $storedValue = match ($validated['type']) {
            'fixed' => (int) round($rawValue * 100),
            default => (int) round($rawValue),
        };

        $promo = PromoCode::create([
            'code' => $code,
            'notes' => $validated['notes'] ?? null,
            'type' => $validated['type'],
            'value' => $storedValue,
            'duration' => $validated['duration'],
            'duration_months' => $validated['duration'] === 'repeating' ? ($validated['duration_months'] ?? 1) : null,
            'eligible_plans' => in_array('*', $validated['eligible_plans'], true) ? ['*'] : $validated['eligible_plans'],
            'new_clinics_only' => (bool) ($validated['new_clinics_only'] ?? false),
            'max_redemptions' => $validated['max_redemptions'] ?? null,
            'times_redeemed' => 0,
            'valid_from' => ! empty($validated['valid_from']) ? Carbon::parse($validated['valid_from']) : null,
            'valid_until' => ! empty($validated['valid_until']) ? Carbon::parse($validated['valid_until']) : null,
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'created_by' => $request->user()?->id,
        ]);

        AuditLogger::log('promo_code.created', [
            'promo_id' => $promo->id,
            'code' => $promo->code,
            'type' => $promo->type,
            'value' => $promo->value,
            'duration' => $promo->duration,
            'admin_id' => $request->user()?->id,
        ]);

        return back()->with('success', "Promo code '{$promo->code}' created successfully.");
    }

    /**
     * Update an existing promo code.
     */
    public function updatePromo(Request $request, PromoCode $promoCode): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'eligible_plans' => ['required', 'array', 'min:1'],
            'new_clinics_only' => ['boolean'],
            'max_redemptions' => ['nullable', 'integer', 'min:1'],
            'valid_from' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ]);

        $promoCode->update([
            'notes' => $validated['notes'] ?? $promoCode->notes,
            'eligible_plans' => in_array('*', $validated['eligible_plans'], true) ? ['*'] : $validated['eligible_plans'],
            'new_clinics_only' => (bool) ($validated['new_clinics_only'] ?? false),
            'max_redemptions' => $validated['max_redemptions'] ?? null,
            'valid_from' => ! empty($validated['valid_from']) ? Carbon::parse($validated['valid_from']) : null,
            'valid_until' => ! empty($validated['valid_until']) ? Carbon::parse($validated['valid_until']) : null,
            'is_active' => (bool) ($validated['is_active'] ?? $promoCode->is_active),
        ]);

        AuditLogger::log('promo_code.updated', [
            'promo_id' => $promoCode->id,
            'code' => $promoCode->code,
            'admin_id' => $request->user()?->id,
        ]);

        return back()->with('success', "Promo code '{$promoCode->code}' updated successfully.");
    }

    /**
     * Toggle active state of a promo code.
     */
    public function togglePromoActive(Request $request, PromoCode $promoCode): RedirectResponse
    {
        $promoCode->update(['is_active' => ! $promoCode->is_active]);

        $status = $promoCode->is_active ? 'activated' : 'deactivated';
        AuditLogger::log('promo_code.'.$status, [
            'promo_id' => $promoCode->id,
            'code' => $promoCode->code,
            'admin_id' => $request->user()?->id,
        ]);

        return back()->with('success', "Promo code '{$promoCode->code}' {$status}.");
    }

    /**
     * Delete an unused promo code.
     * Enforces the rule: used codes can NEVER be deleted.
     */
    public function destroyPromo(Request $request, PromoCode $promoCode): RedirectResponse
    {
        if (! $promoCode->canBeDeleted()) {
            return back()->with('error', "Cannot delete promo code '{$promoCode->code}' because it has existing redemption history. You can deactivate it instead.");
        }

        $code = $promoCode->code;
        $promoCode->delete();

        AuditLogger::log('promo_code.deleted', [
            'code' => $code,
            'admin_id' => $request->user()?->id,
        ]);

        return back()->with('success', "Promo code '{$code}' deleted.");
    }

    /**
     * Create a new single-use free-access invite link.
     */
    public function storeInvite(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'recipient_email' => ['required', 'email', 'max:255'],
            'recipient_name' => ['nullable', 'string', 'max:120'],
            'clinic_name' => ['nullable', 'string', 'max:120'],
            'plan_slug' => ['required', 'string', 'in:basic,pro,advanced'],
            'free_period_type' => ['required', 'string', 'in:days,months'],
            'free_period_value' => ['required', 'integer', 'min:1', 'max:365'],
            'expiry_days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'send_email' => ['boolean'],
        ]);

        $expiryDays = (int) ($validated['expiry_days'] ?? 14);

        $result = SubscriptionInvite::createWithToken([
            'recipient_email' => Str::lower(trim($validated['recipient_email'])),
            'recipient_name' => $validated['recipient_name'] ?? null,
            'clinic_name' => $validated['clinic_name'] ?? null,
            'plan_slug' => $validated['plan_slug'],
            'free_period_type' => $validated['free_period_type'],
            'free_period_value' => (int) $validated['free_period_value'],
            'expires_at' => Carbon::now()->addDays($expiryDays),
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        /** @var SubscriptionInvite $invite */
        $invite = $result['invite'];
        $plainToken = $result['plain_token'];

        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.lk'));
        $scheme = config('app.env') === 'local' ? 'http' : 'https';
        $port = config('app.env') === 'local' ? ':8000' : '';
        $inviteUrl = "{$scheme}://{$baseDomain}{$port}/register?invite={$plainToken}";

        if ($request->boolean('send_email', true)) {
            try {
                Mail::to($invite->recipient_email)->queue(new SubscriptionInviteMail($invite, $plainToken));
            } catch (\Throwable $e) {
                // Ignore queue exceptions
            }
        }

        AuditLogger::log('invite.created', [
            'invite_id' => $invite->id,
            'recipient_email' => $invite->recipient_email,
            'plan_slug' => $invite->plan_slug,
            'free_period' => "{$invite->free_period_value} {$invite->free_period_type}",
            'admin_id' => $request->user()?->id,
        ]);

        return back()
            ->with('success', "Invite generated for {$invite->recipient_email}.")
            ->with('created_invite_token', $plainToken)
            ->with('created_invite_url', $inviteUrl);
    }

    /**
     * Resend an invite email.
     */
    public function resendInvite(Request $request, SubscriptionInvite $invite): RedirectResponse
    {
        if ($invite->status !== SubscriptionInvite::STATUS_SENT || $invite->isExpired()) {
            return back()->with('error', 'Only active pending invitations can be resent.');
        }

        // Generate a new plain token and hash since token was hashed on creation
        $newPlainToken = Str::random(48);
        $invite->update([
            'token_hash' => SubscriptionInvite::hashToken($newPlainToken),
            'expires_at' => Carbon::now()->addDays(14),
        ]);

        Mail::to($invite->recipient_email)->queue(new SubscriptionInviteMail($invite, $newPlainToken));

        AuditLogger::log('invite.resent', [
            'invite_id' => $invite->id,
            'recipient_email' => $invite->recipient_email,
            'admin_id' => $request->user()?->id,
        ]);

        return back()->with('success', "Invitation re-sent to {$invite->recipient_email}.");
    }

    /**
     * Revoke an invite link.
     */
    public function revokeInvite(Request $request, SubscriptionInvite $invite): RedirectResponse
    {
        if ($invite->status === SubscriptionInvite::STATUS_REGISTERED) {
            return back()->with('error', 'Cannot revoke an invitation that has already been registered.');
        }

        $invite->update(['status' => SubscriptionInvite::STATUS_REVOKED]);

        AuditLogger::log('invite.revoked', [
            'invite_id' => $invite->id,
            'recipient_email' => $invite->recipient_email,
            'admin_id' => $request->user()?->id,
        ]);

        return back()->with('success', "Invitation for {$invite->recipient_email} revoked.");
    }

    /**
     * Export redemptions history as CSV.
     */
    public function exportRedemptionsCsv(Request $request): StreamedResponse
    {
        AuditLogger::log('promotions.redemptions_exported', [
            'admin_id' => $request->user()?->id,
        ]);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="medvisit-promo-redemptions-'.date('YmdHis').'.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'ID',
                'Promo Code',
                'Clinic Name',
                'Subdomain',
                'Invoice Number',
                'Discount Type',
                'Discount Amount (LKR)',
                'Final Amount (LKR)',
                'Status',
                'Reserved At',
                'Activated At',
                'Months Remaining',
            ]);

            PromoCodeRedemption::with(['promoCode', 'tenant', 'invoice'])
                ->orderByDesc('id')
                ->chunk(200, function ($rows) use ($handle) {
                    foreach ($rows as $row) {
                        fputcsv($handle, [
                            $row->id,
                            $row->promoCode?->code ?? 'N/A',
                            $row->tenant?->name ?? 'N/A',
                            $row->tenant_id,
                            $row->invoice?->invoice_number ?? 'N/A',
                            $row->discount_type,
                            number_format($row->discount_amount_cents / 100, 2),
                            number_format($row->final_amount_cents / 100, 2),
                            $row->status,
                            $row->reserved_at?->format('Y-m-d H:i:s'),
                            $row->activated_at?->format('Y-m-d H:i:s'),
                            $row->months_remaining ?? 'N/A',
                        ]);
                    }
                });

            fclose($handle);
        }, 200, $headers);
    }
}
