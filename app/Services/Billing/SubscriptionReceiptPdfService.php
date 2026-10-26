<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\SubscriptionInvoice;
use App\Services\Pdf\ChromiumPdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class SubscriptionReceiptPdfService
{
    /**
     * Generate PDF binary string for an invoice or receipt.
     */
    public function generatePdf(SubscriptionInvoice $invoice): string
    {
        return app(ChromiumPdfService::class)->generateSubscriptionInvoicePdf($invoice);
    }

    /**
     * Download response with signed/secure filename.
     */
    public function downloadResponse(SubscriptionInvoice $invoice): Response
    {
        $isReceipt = $invoice->status === SubscriptionInvoice::STATUS_PAID;
        $num = $isReceipt && $invoice->receipt_number ? $invoice->receipt_number : $invoice->invoice_number;
        $filename = "MedVisit-{$num}.pdf";

        $pdfBinary = $this->generatePdf($invoice);

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'private, no-cache, must-revalidate',
        ]);
    }

    /**
     * Stream response to view PDF directly in browser tab.
     */
    public function streamResponse(SubscriptionInvoice $invoice): Response
    {
        $isReceipt = $invoice->status === SubscriptionInvoice::STATUS_PAID;
        $num = $isReceipt && $invoice->receipt_number ? $invoice->receipt_number : $invoice->invoice_number;
        $filename = "MedVisit-{$num}.pdf";

        $pdfBinary = $this->generatePdf($invoice);

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
            'Cache-Control' => 'private, no-cache, must-revalidate',
        ]);
    }

    /**
     * Build view data for the PDF template.
     */
    public function buildViewData(SubscriptionInvoice $invoice): array
    {
        $tenant = $invoice->tenant;
        $subscription = $invoice->subscription()->with('plan')->first();
        $plan = $subscription?->plan;

        $billing = $invoice->billing_details ?? [];
        if (empty($billing) && $tenant) {
            $tenantBilling = $tenant->billingDetail;
            $billing = [
                'legal_name' => $tenantBilling?->legal_name ?? $tenant->name,
                'billing_email' => $tenantBilling?->billing_email ?? $tenant->email,
                'phone' => $tenantBilling?->phone ?? $tenant->phone,
                'address' => $tenantBilling?->address ?? $tenant->address,
                'tax_id' => $tenantBilling?->tax_id,
            ];
        }

        // Extract payment method details from successful transaction
        $transaction = $invoice->transactions()
            ->where('status', 'succeeded')
            ->latest('id')
            ->first();

        $paymentMethodDetails = [
            'method_name' => 'Credit / Debit Card',
            'card_summary' => null,
            'reference' => null,
        ];

        if ($transaction) {
            $raw = $transaction->raw_payload ?? [];
            $payment = $raw['payment'] ?? [];
            $card = $payment['card'] ?? null;

            if ($card && ! empty($card['last4'])) {
                $scheme = ucfirst(strtolower($card['scheme'] ?? 'Card'));
                $paymentMethodDetails['card_summary'] = "{$scheme} •••• {$card['last4']}";
            }

            $paymentMethodDetails['reference'] = $transaction->gateway_payment_id
                ?? $payment['id']
                ?? $transaction->gateway_checkout_id;
        } elseif ($invoice->payment_method === 'offline') {
            $paymentMethodDetails['method_name'] = 'Manual / Offline Payment (Approved by Super Admin)';
        } elseif ($invoice->payment_method === 'comp') {
            $paymentMethodDetails['method_name'] = 'Complimentary License';
        }

        $isReceipt = $invoice->status === SubscriptionInvoice::STATUS_PAID;

        return [
            'invoice' => $invoice,
            'clinic' => $tenant,
            'plan' => $plan,
            'billing' => $billing,
            'paymentMethodDetails' => $paymentMethodDetails,
            'isReceipt' => $isReceipt,
        ];
    }
}
