<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;

class RefundRejectedMail extends MedVisitMailable
{
    public function __construct(
        public RefundRequest $refundRequest,
        public string $clinicName,
        public string $decisionReason,
        public string $disputePolicyUrl
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
        return 'subscription.refund_declined';
    }

    public function subjectLine(): string
    {
        return "Refund request update ({$this->clinicName})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.refund_rejected';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.refund_rejected';
    }

    public function viewData(): array
    {
        return [
            'refundRequest' => $this->refundRequest,
            'clinicName' => $this->clinicName,
            'decisionReason' => $this->decisionReason,
            'disputePolicyUrl' => $this->disputePolicyUrl,
            'amount' => $this->refundRequest->formatted_requested_amount,
        ];
    }
}
