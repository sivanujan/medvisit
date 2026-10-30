<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\SubscriptionInvoice;

class ZeroAmountInvoiceMail extends MedVisitMailable
{
    public function __construct(
        public SubscriptionInvoice $invoice,
        public string $clinicName,
        public string $coveredByDescription,
        public string $billingUrl
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
        return 'subscription.zero_amount_invoice';
    }

    public function subjectLine(): string
    {
        $period = $this->invoice->period_start?->format('M Y') ?? 'current period';

        return "Your invoice for {$period} is Rs. 0 — covered by {$this->coveredByDescription}";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.zero_amount_invoice';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.zero_amount_invoice';
    }

    public function viewData(): array
    {
        $plan = $this->invoice->subscription?->plan;
        $periodStart = $this->invoice->period_start?->setTimezone('Asia/Colombo')->format('d/m/Y') ?? 'N/A';
        $periodEnd = $this->invoice->period_end?->setTimezone('Asia/Colombo')->format('d/m/Y') ?? 'N/A';

        return [
            'clinicName' => $this->clinicName,
            'invoiceNumber' => $this->invoice->invoice_number,
            'planName' => $plan ? $plan->name : 'MedVisit',
            'period' => "{$periodStart} – {$periodEnd}",
            'coveredBy' => $this->coveredByDescription,
            'billingUrl' => $this->billingUrl,
        ];
    }
}
