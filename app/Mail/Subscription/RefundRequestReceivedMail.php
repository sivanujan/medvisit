<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;

class RefundRequestReceivedMail extends MedVisitMailable
{
    public function __construct(
        public RefundRequest $refundRequest,
        public string $clinicName,
        public string $billingUrl
    ) {
        $this->tenantId = $refundRequest->tenant_id;
        $this->onBehalfOfClinicName = $clinicName;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'subscription.refund_requested';
    }

    public function subjectLine(): string
    {
        return "We received your refund request ({$this->clinicName})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.refund_request_received';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.refund_request_received';
    }

    public function viewData(): array
    {
        return [
            'refundRequest' => $this->refundRequest,
            'clinicName' => $this->clinicName,
            'billingUrl' => $this->billingUrl,
            'amount' => $this->refundRequest->formatted_requested_amount,
            'reason' => ucfirst(str_replace('_', ' ', $this->refundRequest->reason_type)),
        ];
    }
}
