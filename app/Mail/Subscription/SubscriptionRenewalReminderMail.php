<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\SubscriptionInvoice;

class SubscriptionRenewalReminderMail extends MedVisitMailable
{
    public function __construct(
        public SubscriptionInvoice $invoice,
        public string $clinicName,
        public int $daysRemaining,
        public string $payUrl
    ) {
        $this->tenantId = $invoice->tenant_id;
        $this->onBehalfOfClinicName = $clinicName;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return "subscription.renewal_reminder_{$this->daysRemaining}d";
    }

    public function subjectLine(): string
    {
        return "Upcoming MedVisit renewal in {$this->daysRemaining} days ({$this->invoice->invoice_number})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.renewal_reminder';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.renewal_reminder';
    }

    public function viewData(): array
    {
        $plan = $this->invoice->subscription?->plan;
        $dueDate = $this->invoice->due_date?->setTimezone('Asia/Colombo')->format('d/m/Y')
            ?? $this->invoice->period_end?->setTimezone('Asia/Colombo')->format('d/m/Y');

        return [
            'clinicName' => $this->clinicName,
            'planName' => $plan ? $plan->name : 'MedVisit Standard',
            'amount' => $this->invoice->formatted_amount,
            'daysRemaining' => $this->daysRemaining,
            'dueDate' => $dueDate,
            'payUrl' => $this->payUrl,
        ];
    }
}
