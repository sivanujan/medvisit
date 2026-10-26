<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\RefundRequest;
use App\Services\Pdf\ChromiumPdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class CreditNotePdfService
{
    /**
     * Generate PDF binary string for a credit note.
     */
    public function generatePdf(RefundRequest $refundRequest): string
    {
        return app(ChromiumPdfService::class)->generateCreditNotePdf($refundRequest);
    }

    /**
     * Download response with secure filename.
     */
    public function downloadResponse(RefundRequest $refundRequest): Response
    {
        $num = $refundRequest->credit_note_number ?? $refundRequest->public_id;
        $filename = "MedVisit-CreditNote-{$num}.pdf";

        $pdfBinary = $this->generatePdf($refundRequest);

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'private, no-cache, must-revalidate',
        ]);
    }

    /**
     * Stream response to view PDF directly in browser tab.
     */
    public function streamResponse(RefundRequest $refundRequest): Response
    {
        $num = $refundRequest->credit_note_number ?? $refundRequest->public_id;
        $filename = "MedVisit-CreditNote-{$num}.pdf";

        $pdfBinary = $this->generatePdf($refundRequest);

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
            'Cache-Control' => 'private, no-cache, must-revalidate',
        ]);
    }

    /**
     * Build view data for credit note template.
     */
    public function buildViewData(RefundRequest $refundRequest): array
    {
        $payment = $refundRequest->payment;
        $invoice = $payment->invoice;
        $clinic = $refundRequest->tenant;
        $subscription = $invoice?->subscription ?? $clinic->subscription;
        $plan = $subscription?->plan;

        $billing = $invoice->billing_details ?? [];
        if (empty($billing) && $clinic) {
            $tenantBilling = $clinic->billingDetail;
            $billing = [
                'legal_name' => $tenantBilling?->legal_name ?? $clinic->name,
                'billing_email' => $tenantBilling?->billing_email ?? $clinic->email,
                'phone' => $tenantBilling?->phone ?? $clinic->phone,
                'address' => $tenantBilling?->address ?? $clinic->address,
                'tax_id' => $tenantBilling?->tax_id,
            ];
        }

        return [
            'refundRequest' => $refundRequest,
            'payment' => $payment,
            'invoice' => $invoice,
            'clinic' => $clinic,
            'subscription' => $subscription,
            'plan' => $plan,
            'billing' => $billing,
        ];
    }
}
