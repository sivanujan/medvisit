<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;

class RefundApprovedMail extends MedVisitMailable
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
        return 'subscription.refund_approved';
    }

    public function subjectLine(): string
    {
        $amount = $this->refundRequest->formatted_approved_amount ?? $this->refundRequest->formatted_eligible_amount;

        return "Refund approved — {$amount} ({$this->clinicName})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.refund_approved';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.refund_approved';
    }

    public function viewData(): array
    {
        $amount = $this->refundRequest->formatted_approved_amount ?? $this->refundRequest->formatted_eligible_amount;

        return [
            'refundRequest' => $this->refundRequest,
            'clinicName' => $this->clinicName,
            'billingUrl' => $this->billingUrl,
            'amount' => $amount,
            'decisionReason' => $this->refundRequest->decision_reason,
        ];
    }
}
