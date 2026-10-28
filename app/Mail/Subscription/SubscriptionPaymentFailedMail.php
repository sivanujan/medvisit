<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\SubscriptionInvoice;

class SubscriptionPaymentFailedMail extends MedVisitMailable
{
    public function __construct(
        public SubscriptionInvoice $invoice,
        public string $clinicName,
        public string $retryUrl,
        public ?string $failureMessage = null
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
        return 'subscription.payment_failed';
    }

    public function subjectLine(): string
    {
        return "Payment failed — MedVisit ({$this->invoice->invoice_number})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.payment_failed';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.payment_failed';
    }

    public function viewData(): array
    {
        return [
            'clinicName' => $this->clinicName,
            'invoiceNumber' => $this->invoice->invoice_number,
            'amount' => $this->invoice->formatted_amount,
            'retryUrl' => $this->retryUrl,
            'failureMessage' => $this->failureMessage,
        ];
    }
}
