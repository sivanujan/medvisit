<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;

class NewRefundRequestAdminMail extends MedVisitMailable
{
    public function __construct(
        public RefundRequest $refundRequest,
        public string $clinicName,
        public string $adminReviewUrl
    ) {
        $this->tenantId = $refundRequest->tenant_id;
        $this->onBehalfOfClinicName = 'MedVisit Platform';
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'super_admin.new_refund_request';
    }

    public function subjectLine(): string
    {
        return "New refund request: {$this->clinicName} — {$this->refundRequest->formatted_requested_amount}";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.refund_request_admin';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.refund_request_admin';
    }

    public function viewData(): array
    {
        return [
            'refundRequest' => $this->refundRequest,
            'clinicName' => $this->clinicName,
            'adminReviewUrl' => $this->adminReviewUrl,
            'amount' => $this->refundRequest->formatted_requested_amount,
            'eligibility' => ucfirst(str_replace('_', ' ', $this->refundRequest->eligibility)),
            'reason' => ucfirst(str_replace('_', ' ', $this->refundRequest->reason_type)),
        ];
    }
}
