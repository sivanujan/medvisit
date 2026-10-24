<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;
use Illuminate\Mail\Mailables\Attachment;

class RefundCompletedMail extends MedVisitMailable
{
    public function __construct(
        public RefundRequest $refundRequest,
        public ?string $pdfBinary = null
    ) {
        $this->tenantId = $refundRequest->tenant_id;
        $this->onBehalfOfClinicName = $refundRequest->tenant?->name ?? 'Clinic';
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'subscription.refund_completed';
    }

    public function subjectLine(): string
    {
        $amount = $this->refundRequest->formatted_approved_amount ?? $this->refundRequest->formatted_requested_amount;

        return "Refund completed — {$amount} ({$this->refundRequest->credit_note_number})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.refund_completed';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.refund_completed';
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
        $clinic = $this->refundRequest->tenant;
        $amount = $this->refundRequest->formatted_approved_amount ?? $this->refundRequest->formatted_requested_amount;
        $billingUrl = $clinic ? $clinic->url('/settings/billing') : url('/login');

        return [
            'refundRequest' => $this->refundRequest,
            'clinicName' => $clinic?->name ?? 'Clinic',
            'amount' => $amount,
            'creditNoteNumber' => $this->refundRequest->credit_note_number,
            'method' => $this->refundRequest->refund_method,
            'reference' => $this->refundRequest->refund_reference,
            'billingUrl' => $billingUrl,
        ];
    }
}
