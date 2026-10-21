<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\SubscriptionInvoice;
use App\Services\Billing\SubscriptionReceiptPdfService;
use Illuminate\Mail\Attachment;

class SubscriptionPaymentSuccessMail extends MedVisitMailable
{
    public function __construct(
        public SubscriptionInvoice $invoice,
        public string $clinicName,
        public string $billingUrl,
        public ?string $pdfBinary = null
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
        return 'subscription.payment_success';
    }

    public function subjectLine(): string
    {
        return "Payment received — MedVisit ({$this->invoice->invoice_number})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.payment_success';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.payment_success';
    }

    public function viewData(): array
    {
        $plan = $this->invoice->subscription?->plan;
        $periodEnd = $this->invoice->subscription?->current_period_end?->setTimezone('Asia/Colombo')->format('d/m/Y');

        return [
            'clinicName' => $this->clinicName,
            'invoiceNumber' => $this->invoice->invoice_number,
            'receiptNumber' => $this->invoice->receipt_number,
            'planName' => $plan ? $plan->name : 'MedVisit Standard',
            'amount' => $this->invoice->formatted_amount,
            'periodEnd' => $periodEnd,
            'billingUrl' => $this->billingUrl,
        ];
    }

    /**
     * Attach the receipt PDF.
     */
    public function attachments(): array
    {
        $binary = $this->pdfBinary;
        if (! $binary) {
            $pdfService = app(SubscriptionReceiptPdfService::class);
            $binary = $pdfService->generatePdf($this->invoice);
        }

        $num = $this->invoice->receipt_number ?? $this->invoice->invoice_number;

        return [
            Attachment::fromData(fn () => $binary, "MedVisit-{$num}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
