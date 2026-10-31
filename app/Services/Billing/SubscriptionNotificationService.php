<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Mail\Subscription\SmsQuotaThresholdMail;
use App\Mail\Subscription\SubscriptionCancelledMail;
use App\Mail\Subscription\SubscriptionPastDueMail;
use App\Mail\Subscription\SubscriptionPaymentFailedMail;
use App\Mail\Subscription\SubscriptionPaymentSuccessMail;
use App\Mail\Subscription\SubscriptionPlanChangedMail;
use App\Mail\Subscription\SubscriptionRenewalReminderMail;
use App\Mail\Subscription\SubscriptionResumedMail;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\SubscriptionNotification;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SubscriptionNotificationService
{
    /**
     * Send payment success email with receipt attached (idempotent per invoice).
     */
    public function sendPaymentSuccess(SubscriptionInvoice $invoice, ?string $pdfBinary = null): void
    {
        $tenant = $invoice->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = 'payment_succeeded';
        $reference = $invoice->invoice_number;

        $recipients = $this->resolveRecipients($tenant);

        foreach ($recipients as $email) {
            if (! $this->shouldSend($tenant->id, $eventType, "{$reference}:{$email}")) {
                continue;
            }

            $billingUrl = $this->resolveBillingUrl($tenant);
            $mailable = new SubscriptionPaymentSuccessMail($invoice, $tenant->name, $billingUrl, $pdfBinary);

            Mail::to($email)->queue($mailable);
            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'invoice_number' => $invoice->invoice_number,
                'receipt_number' => $invoice->receipt_number,
                'amount_cents' => $invoice->amount_cents,
            ]);

            Log::info("SubscriptionNotificationService: Queued payment success email to [{$email}] for invoice [{$reference}]");
        }
    }

    /**
     * Send payment failed notification with retry link (idempotent per invoice attempt).
     */
    public function sendPaymentFailed(SubscriptionInvoice $invoice, ?string $failureMessage = null): void
    {
        $tenant = $invoice->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = 'payment_failed';
        $reference = "{$invoice->invoice_number}:attempt-".time();

        $recipients = $this->resolveRecipients($tenant);
        $retryUrl = route('tenant.subscription.subscribe');

        foreach ($recipients as $email) {
            $mailable = new SubscriptionPaymentFailedMail($invoice, $tenant->name, $retryUrl, $failureMessage);
            Mail::to($email)->queue($mailable);

            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'invoice_number' => $invoice->invoice_number,
                'amount_cents' => $invoice->amount_cents,
            ]);

            Log::info("SubscriptionNotificationService: Queued payment failed email to [{$email}] for invoice [{$invoice->invoice_number}]");
        }
    }

    /**
     * Send renewal reminder at 7d and 1d before current_period_end.
     */
    public function sendRenewalReminder(SubscriptionInvoice $invoice, int $daysRemaining): void
    {
        $tenant = $invoice->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = "renewal_reminder_{$daysRemaining}d";
        $reference = "{$invoice->invoice_number}_{$daysRemaining}d";

        $recipients = $this->resolveRecipients($tenant);
        $payUrl = route('tenant.subscription.subscribe');

        foreach ($recipients as $email) {
            if (! $this->shouldSend($tenant->id, $eventType, "{$reference}:{$email}")) {
                continue;
            }

            $mailable = new SubscriptionRenewalReminderMail($invoice, $tenant->name, $daysRemaining, $payUrl);
            Mail::to($email)->queue($mailable);

            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'invoice_number' => $invoice->invoice_number,
                'days_remaining' => $daysRemaining,
            ]);

            Log::info("SubscriptionNotificationService: Queued {$daysRemaining}-day renewal reminder to [{$email}] for invoice [{$invoice->invoice_number}]");
        }
    }

    /**
     * Send past due / grace started or expired email.
     */
    public function sendPastDue(Subscription $subscription, bool $isGrace, string $amount): void
    {
        $tenant = $subscription->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = $isGrace ? 'past_due_grace' : 'subscription_expired';
        $reference = ($subscription->current_period_end?->toDateString() ?? 'initial').'_'.$eventType;

        $recipients = $this->resolveRecipients($tenant);
        $payUrl = route('tenant.subscription.subscribe');

        foreach ($recipients as $email) {
            if (! $this->shouldSend($tenant->id, $eventType, "{$reference}:{$email}")) {
                continue;
            }

            $mailable = new SubscriptionPastDueMail($subscription, $tenant->name, $isGrace, $amount, $payUrl);
            Mail::to($email)->queue($mailable);

            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'is_grace' => $isGrace,
                'amount' => $amount,
            ]);

            Log::info("SubscriptionNotificationService: Queued {$eventType} notice to [{$email}] for clinic [{$tenant->id}]");
        }
    }

    /**
     * Send cancellation confirmed email.
     */
    public function sendCancelled(Subscription $subscription, string $accessUntil, ?string $reason = null): void
    {
        $tenant = $subscription->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = 'subscription_cancelled';
        $reference = ($subscription->cancelled_at?->toDateTimeString() ?? time()).'_cancelled';

        $recipients = $this->resolveRecipients($tenant);
        $resumeUrl = route('tenant.settings.billing');

        foreach ($recipients as $email) {
            if (! $this->shouldSend($tenant->id, $eventType, "{$reference}:{$email}")) {
                continue;
            }

            $mailable = new SubscriptionCancelledMail($subscription, $tenant->name, $accessUntil, $resumeUrl, $reason);
            Mail::to($email)->queue($mailable);

            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'access_until' => $accessUntil,
                'reason' => $reason,
            ]);

            Log::info("SubscriptionNotificationService: Queued cancellation email to [{$email}] for clinic [{$tenant->id}]");
        }
    }

    /**
     * Send subscription resumed email.
     */
    public function sendResumed(Subscription $subscription): void
    {
        $tenant = $subscription->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = 'subscription_resumed';
        $reference = time().'_resumed';

        $recipients = $this->resolveRecipients($tenant);
        $billingUrl = route('tenant.settings.billing');

        foreach ($recipients as $email) {
            $mailable = new SubscriptionResumedMail($subscription, $tenant->name, $billingUrl);
            Mail::to($email)->queue($mailable);

            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email);
            Log::info("SubscriptionNotificationService: Queued resume email to [{$email}] for clinic [{$tenant->id}]");
        }
    }

    /**
     * Send plan changed email (upgrade / downgrade).
     */
    public function sendPlanChanged(
        Subscription $subscription,
        string $oldPlanName,
        string $newPlanName,
        string $changeType,
        string $effectiveDate,
        ?string $amountCharged = null
    ): void {
        $tenant = $subscription->tenant;
        if (! $tenant) {
            return;
        }

        $eventType = 'plan_changed';
        $reference = time()."_plan_{$oldPlanName}_to_{$newPlanName}";

        $recipients = $this->resolveRecipients($tenant);
        $billingUrl = route('tenant.settings.billing');

        foreach ($recipients as $email) {
            $mailable = new SubscriptionPlanChangedMail(
                $subscription,
                $tenant->name,
                $oldPlanName,
                $newPlanName,
                $changeType,
                $effectiveDate,
                $amountCharged,
                $billingUrl
            );

            Mail::to($email)->queue($mailable);
            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'old_plan' => $oldPlanName,
                'new_plan' => $newPlanName,
                'change_type' => $changeType,
            ]);

            Log::info("SubscriptionNotificationService: Queued plan changed email to [{$email}] for clinic [{$tenant->id}]");
        }
    }

    /**
     * Resolve unique recipient email list: billing email + clinic admin user email.
     *
     * @return array<string>
     */
    protected function resolveRecipients(Tenant $tenant): array
    {
        $recipients = [];

        // 1. Billing email from billing details
        $billingEmail = $tenant->billingDetail?->billing_email;
        if (! empty($billingEmail) && filter_var($billingEmail, FILTER_VALIDATE_EMAIL)) {
            $recipients[] = strtolower(trim($billingEmail));
        }

        // 2. Primary admin user email
        $adminUser = User::where('tenant_id', $tenant->id)
            ->whereHas('roles', fn ($q) => $q->where('name', 'clinic_admin'))
            ->first();

        if ($adminUser && ! empty($adminUser->email) && filter_var($adminUser->email, FILTER_VALIDATE_EMAIL)) {
            $recipients[] = strtolower(trim($adminUser->email));
        }

        // 3. Fallback to clinic tenant email
        if (empty($recipients) && ! empty($tenant->email) && filter_var($tenant->email, FILTER_VALIDATE_EMAIL)) {
            $recipients[] = strtolower(trim($tenant->email));
        }

        return array_values(array_unique($recipients));
    }

    protected function resolveBillingUrl(Tenant $tenant): string
    {
        return route('tenant.settings.billing');
    }

    /**
     * Check if this notification has already been dispatched.
     */
    protected function shouldSend(string $tenantId, string $eventType, string $reference): bool
    {
        return ! SubscriptionNotification::where('tenant_id', $tenantId)
            ->where('event_type', $eventType)
            ->where('reference', $reference)
            ->exists();
    }

    /**
     * Send 80% or 100% SMS threshold notification (idempotent per threshold event).
     */
    public function sendSmsThresholdNotice(Tenant $tenant, int $percent, int $used, int $limit): void
    {
        $eventType = "sms_threshold_{$percent}";
        $period = Carbon::now('Asia/Colombo')->format('Y-m');
        $reference = "sms:{$period}:{$percent}";

        $recipients = $this->resolveRecipients($tenant);
        $billingUrl = $this->resolveBillingUrl($tenant);

        foreach ($recipients as $email) {
            if (! $this->shouldSend($tenant->id, $eventType, "{$reference}:{$email}")) {
                continue;
            }

            $mailable = new SmsQuotaThresholdMail(
                $tenant,
                $percent,
                $used,
                $limit,
                $billingUrl
            );

            Mail::to($email)->queue($mailable);

            $this->markSent($tenant->id, $eventType, "{$reference}:{$email}", $email, [
                'percent' => $percent,
                'used' => $used,
                'limit' => $limit,
            ]);

            Log::info("SubscriptionNotificationService: Queued SMS {$percent}% threshold alert to [{$email}] for tenant [{$tenant->id}]");
        }
    }

    /**
     * Mark a notification as sent.
     */
    protected function markSent(
        string $tenantId,
        string $eventType,
        string $reference,
        string $recipient,
        ?array $metadata = null
    ): void {
        try {
            SubscriptionNotification::create([
                'tenant_id' => $tenantId,
                'event_type' => $eventType,
                'reference' => $reference,
                'recipient' => $recipient,
                'metadata' => $metadata,
                'sent_at' => Carbon::now(),
            ]);
        } catch (\Throwable $e) {
            // Already recorded under race condition
            Log::debug("SubscriptionNotificationService: Notification already marked: {$e->getMessage()}");
        }
    }
}
