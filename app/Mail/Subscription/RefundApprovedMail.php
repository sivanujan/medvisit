<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;
use App\Services\PlatformSettingsService;
use Illuminate\Mail\Mailables\Attachment;

class RefundApprovedMail extends MedVisitMailable
{
    public function __construct(
        public RefundRequest $refundRequest,
        public string $clinicName,
        public string $billingUrl,
        public ?string $pdfBinary = null
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

    public function attachments(): array
    {
        if ($this->pdfBinary) {
            $num = $this->refundRequest->credit_note_number ?? $this->refundRequest->public_id;

            return [
                Attachment::fromData(fn () => $this->pdfBinary, "MedVisit-CreditNote-{$num}.pdf")
                    ->withMime('application/pdf'),
            ];
        }

        return [];
    }

    public function viewData(): array
    {
        $amount = $this->refundRequest->formatted_approved_amount ?? $this->refundRequest->formatted_eligible_amount;
        $timelineText = app(PlatformSettingsService::class)->get('billing.refund_timeline_text', 'usually within 3–5 business days, depending on your bank');
        $isPartial = $this->refundRequest->refund_type === RefundRequest::TYPE_PARTIAL;

        return [
            'refundRequest' => $this->refundRequest,
            'clinicName' => $this->clinicName,
            'billingUrl' => $this->billingUrl,
            'amount' => $amount,
            'isPartial' => $isPartial,
            'decisionReason' => $this->refundRequest->decision_reason,
            'reference' => $this->refundRequest->refund_reference,
            'creditNoteNumber' => $this->refundRequest->credit_note_number,
            'timelineText' => $timelineText,
            'refundedAt' => $this->refundRequest->refunded_at?->format('j M Y'),
        ];
    }
}
