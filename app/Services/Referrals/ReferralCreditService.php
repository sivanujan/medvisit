<?php

declare(strict_types=1);

namespace App\Services\Referrals;

use App\Models\ClinicReferral;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\TenantBillingCredit;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReferralCreditService
{
    /**
     * Get the current active billing credit balance in cents for a clinic.
     */
    public function getBalance(Tenant $tenant): int
    {
        $this->expireOverdueCredits($tenant);

        $latest = TenantBillingCredit::where('tenant_id', $tenant->id)
            ->latest('id')
            ->first();

        if (! $latest) {
            return 0;
        }

        return (int) $latest->balance_after_cents;
    }

    /**
     * Record a new referral reward credit grant in the ledger.
     */
    public function recordReward(
        Tenant $tenant,
        ClinicReferral $referral,
        int $amountCents,
        ?string $notes = null
    ): TenantBillingCredit {
        return DB::transaction(function () use ($tenant, $referral, $amountCents, $notes) {
            $currentBalance = $this->getBalance($tenant);
            $expiryMonths = (int) config('referrals.credit_expiry_months', 12);
            $expiresAt = Carbon::now('Asia/Colombo')->addMonths($expiryMonths);

            $newBalance = $currentBalance + $amountCents;

            $credit = TenantBillingCredit::create([
                'tenant_id' => $tenant->id,
                'referral_id' => $referral->id,
                'invoice_id' => null,
                'type' => TenantBillingCredit::TYPE_REFERRAL_REWARD,
                'amount_cents' => $amountCents,
                'balance_after_cents' => $newBalance,
                'expires_at' => $expiresAt,
                'notes' => $notes ?: "Referral reward earned for referring clinic {$referral->referredTenant?->name}",
            ]);

            AuditLogger::log('referral.credit_granted', [
                'tenant_id' => $tenant->id,
                'resource' => $referral,
                'amount_cents' => $amountCents,
                'new_balance_cents' => $newBalance,
            ]);

            Log::info('ReferralCreditService: Credited Rs. '.($amountCents / 100)." to tenant [{$tenant->id}] for referral [{$referral->id}]");

            return $credit;
        });
    }

    /**
     * Reserve credit for an unpaid invoice awaiting cash payment.
     */
    public function reserveForInvoice(
        Tenant $tenant,
        SubscriptionInvoice $invoice,
        int $requestedCreditCents
    ): ?TenantBillingCredit {
        return DB::transaction(function () use ($tenant, $invoice, $requestedCreditCents) {
            // Check if there is already an active reservation for this exact invoice
            $existing = TenantBillingCredit::where('invoice_id', $invoice->id)
                ->where('type', TenantBillingCredit::TYPE_INVOICE_RESERVATION)
                ->first();

            if ($existing) {
                // Release old reservation first if amount changed
                if ($existing->amount_cents !== -$requestedCreditCents) {
                    $this->releaseReservation($invoice, 'Replacing invoice credit reservation');
                } else {
                    return $existing;
                }
            }

            $currentBalance = $this->getBalance($tenant);
            if ($currentBalance <= 0 || $requestedCreditCents <= 0) {
                return null;
            }

            $creditToDeduct = min($currentBalance, $requestedCreditCents);
            $newBalance = $currentBalance - $creditToDeduct;

            $credit = TenantBillingCredit::create([
                'tenant_id' => $tenant->id,
                'referral_id' => null,
                'invoice_id' => $invoice->id,
                'type' => TenantBillingCredit::TYPE_INVOICE_RESERVATION,
                'amount_cents' => -$creditToDeduct,
                'balance_after_cents' => $newBalance,
                'expires_at' => null,
                'notes' => "Credit reserved for invoice {$invoice->invoice_number}",
            ]);

            $invoice->update(['credit_cents' => $creditToDeduct]);

            Log::info('ReferralCreditService: Reserved Rs. '.($creditToDeduct / 100)." for invoice [{$invoice->invoice_number}]");

            return $credit;
        });
    }

    /**
     * Confirm reservation on successful invoice payment.
     */
    public function confirmReservation(SubscriptionInvoice $invoice): void
    {
        DB::transaction(function () use ($invoice) {
            $reservation = TenantBillingCredit::where('invoice_id', $invoice->id)
                ->where('type', TenantBillingCredit::TYPE_INVOICE_RESERVATION)
                ->first();

            if ($reservation) {
                $reservation->update([
                    'type' => TenantBillingCredit::TYPE_INVOICE_DEDUCTION,
                    'notes' => "Credit applied to paid invoice {$invoice->invoice_number}",
                ]);

                AuditLogger::log('referral.credit_deducted', [
                    'tenant_id' => $invoice->tenant_id,
                    'invoice_id' => $invoice->id,
                    'amount_cents' => abs($reservation->amount_cents),
                ]);
            }
        });
    }

    /**
     * Release reserved credit when checkout fails, is cancelled, or invoice is voided/expired.
     */
    public function releaseReservation(SubscriptionInvoice $invoice, ?string $reason = null): void
    {
        DB::transaction(function () use ($invoice, $reason) {
            $reservation = TenantBillingCredit::where('invoice_id', $invoice->id)
                ->where('type', TenantBillingCredit::TYPE_INVOICE_RESERVATION)
                ->first();

            if (! $reservation) {
                return;
            }

            $tenant = Tenant::find($invoice->tenant_id);
            if (! $tenant) {
                return;
            }

            $currentBalance = $this->getBalance($tenant);
            $amountToRelease = abs($reservation->amount_cents);
            $newBalance = $currentBalance + $amountToRelease;

            TenantBillingCredit::create([
                'tenant_id' => $tenant->id,
                'referral_id' => null,
                'invoice_id' => $invoice->id,
                'type' => TenantBillingCredit::TYPE_RESERVATION_RELEASE,
                'amount_cents' => $amountToRelease,
                'balance_after_cents' => $newBalance,
                'expires_at' => null,
                'notes' => $reason ?: "Released credit reservation for invoice {$invoice->invoice_number}",
            ]);

            // Mark reservation resolved
            $reservation->update([
                'type' => 'invoice_reservation_cancelled',
            ]);

            $invoice->update(['credit_cents' => 0]);

            Log::info('ReferralCreditService: Released reservation Rs. '.($amountToRelease / 100)." for invoice [{$invoice->invoice_number}]");
        });
    }

    /**
     * Deduct credit directly for a 100% credit-covered invoice (immediate payment).
     */
    public function deductForZeroInvoice(Tenant $tenant, SubscriptionInvoice $invoice, int $creditCents): TenantBillingCredit
    {
        return DB::transaction(function () use ($tenant, $invoice, $creditCents) {
            $currentBalance = $this->getBalance($tenant);
            $newBalance = $currentBalance - $creditCents;

            $credit = TenantBillingCredit::create([
                'tenant_id' => $tenant->id,
                'referral_id' => null,
                'invoice_id' => $invoice->id,
                'type' => TenantBillingCredit::TYPE_INVOICE_DEDUCTION,
                'amount_cents' => -$creditCents,
                'balance_after_cents' => $newBalance,
                'expires_at' => null,
                'notes' => "100% Credit applied to invoice {$invoice->invoice_number}",
            ]);

            $invoice->update(['credit_cents' => $creditCents]);

            AuditLogger::log('referral.credit_deducted', [
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'amount_cents' => $creditCents,
            ]);

            return $credit;
        });
    }

    /**
     * Restore credit portion to the ledger upon a refund (User Change #4).
     */
    public function returnCreditForRefund(
        SubscriptionInvoice $invoice,
        int $creditCents,
        ?string $notes = null
    ): ?TenantBillingCredit {
        if ($creditCents <= 0) {
            return null;
        }

        return DB::transaction(function () use ($invoice, $creditCents, $notes) {
            $tenant = Tenant::find($invoice->tenant_id);
            if (! $tenant) {
                return null;
            }

            $currentBalance = $this->getBalance($tenant);
            $newBalance = $currentBalance + $creditCents;
            $expiryMonths = (int) config('referrals.credit_expiry_months', 12);
            $expiresAt = Carbon::now('Asia/Colombo')->addMonths($expiryMonths);

            $entry = TenantBillingCredit::create([
                'tenant_id' => $tenant->id,
                'referral_id' => null,
                'invoice_id' => $invoice->id,
                'type' => TenantBillingCredit::TYPE_REFUND_CREDIT_RETURNED,
                'amount_cents' => $creditCents,
                'balance_after_cents' => $newBalance,
                'expires_at' => $expiresAt,
                'notes' => $notes ?: "Referral credit restored from refunded invoice {$invoice->invoice_number}",
            ]);

            AuditLogger::log('referral.credit_refund_returned', [
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'amount_cents' => $creditCents,
            ]);

            Log::info('ReferralCreditService: Restored credit Rs. '.($creditCents / 100)." to tenant [{$tenant->id}] for refunded invoice [{$invoice->invoice_number}]");

            return $entry;
        });
    }

    /**
     * Reverse a granted reward if the qualifying invoice is refunded (User Rule #3).
     */
    public function reverseReward(
        ClinicReferral $referral,
        int $amountCents,
        ?string $notes = null
    ): TenantBillingCredit {
        return DB::transaction(function () use ($referral, $amountCents, $notes) {
            $tenant = $referral->referrerTenant;
            $currentBalance = $tenant ? $this->getBalance($tenant) : 0;
            $newBalance = $currentBalance - $amountCents;

            $entry = TenantBillingCredit::create([
                'tenant_id' => $referral->referrer_tenant_id,
                'referral_id' => $referral->id,
                'invoice_id' => null,
                'type' => TenantBillingCredit::TYPE_REWARD_REVERSAL,
                'amount_cents' => -$amountCents,
                'balance_after_cents' => $newBalance,
                'expires_at' => null,
                'notes' => $notes ?: "Referral reward reversed due to refund on referred clinic {$referral->referredTenant?->name}",
            ]);

            $referral->update([
                'status' => ClinicReferral::STATUS_CANCELLED,
                'admin_notes' => trim(($referral->admin_notes ? $referral->admin_notes."\n" : '').'Reward reversed due to refund of qualifying invoice.'),
            ]);

            AuditLogger::log('referral.reward_reversed', [
                'tenant_id' => $referral->referrer_tenant_id,
                'resource' => $referral,
                'amount_cents' => $amountCents,
                'new_balance_cents' => $newBalance,
            ]);

            Log::info('ReferralCreditService: Reversed reward Rs. '.($amountCents / 100)." for tenant [{$referral->referrer_tenant_id}] on referral [{$referral->id}]");

            return $entry;
        });
    }

    /**
     * Check and expire credits that have passed their expiration date.
     */
    public function expireOverdueCredits(?Tenant $tenant = null): int
    {
        $now = Carbon::now('Asia/Colombo');

        $query = TenantBillingCredit::where('type', TenantBillingCredit::TYPE_REFERRAL_REWARD)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now);

        if ($tenant) {
            $query->where('tenant_id', $tenant->id);
        }

        $expiredGrants = $query->get();
        $totalExpiredCount = 0;

        foreach ($expiredGrants as $grant) {
            // Check if this grant's expiry has already been processed
            $alreadyProcessed = TenantBillingCredit::where('tenant_id', $grant->tenant_id)
                ->where('referral_id', $grant->referral_id)
                ->where('type', TenantBillingCredit::TYPE_EXPIRY)
                ->exists();

            if ($alreadyProcessed) {
                continue;
            }

            // Lock tenant to atomically write expiration entry
            DB::transaction(function () use ($grant, &$totalExpiredCount) {
                $targetTenant = Tenant::find($grant->tenant_id);
                if (! $targetTenant) {
                    return;
                }

                $latest = TenantBillingCredit::where('tenant_id', $targetTenant->id)->latest('id')->first();
                $cur = $latest ? $latest->balance_after_cents : 0;
                if ($cur <= 0) {
                    return;
                }

                $amountToExpire = min($cur, $grant->amount_cents);
                if ($amountToExpire <= 0) {
                    return;
                }

                $newBalance = $cur - $amountToExpire;

                TenantBillingCredit::create([
                    'tenant_id' => $targetTenant->id,
                    'referral_id' => $grant->referral_id,
                    'type' => TenantBillingCredit::TYPE_EXPIRY,
                    'amount_cents' => -$amountToExpire,
                    'balance_after_cents' => $newBalance,
                    'expires_at' => null,
                    'notes' => "Expired credit from referral reward granted on {$grant->created_at?->toDateString()}",
                ]);

                $totalExpiredCount++;
            });
        }

        return $totalExpiredCount;
    }
}
