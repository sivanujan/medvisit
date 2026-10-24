<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Credit Note {{ $refundRequest->credit_note_number }}</title>
    <style>
        @page {
            margin: 28px 36px;
            size: a4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            font-size: 12px;
            line-height: 1.45;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0E9E8F;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .logo-title {
            font-size: 22px;
            font-weight: bold;
            color: #1E6FD9;
            letter-spacing: -0.5px;
        }
        .logo-title span {
            color: #0E9E8F;
        }
        .logo-subtitle {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 2px;
        }
        .doc-badge {
            text-align: right;
        }
        .doc-type {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }
        .doc-number {
            font-size: 13px;
            font-weight: bold;
            color: #0E9E8F;
            font-family: 'Courier New', Courier, monospace;
            margin-top: 3px;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 24px;
        }
        .info-col {
            vertical-align: top;
            width: 50%;
        }
        .info-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #64748b;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .info-name {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 3px;
        }
        .info-text {
            color: #475569;
            font-size: 11px;
            line-height: 1.4;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .meta-table td {
            padding: 8px 14px;
            font-size: 11px;
            border-right: 1px solid #e2e8f0;
        }
        .meta-table td:last-child {
            border-right: none;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .items-table th {
            background: #f1f5f9;
            color: #334155;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 10px 14px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
        }
        .items-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
        }
        .summary-table {
            width: 100%;
            margin-bottom: 30px;
        }
        .summary-col-left {
            width: 55%;
            vertical-align: top;
        }
        .summary-col-right {
            width: 45%;
            vertical-align: top;
        }
        .total-box {
            background: #f0fdfa;
            border: 1px solid #99f6e4;
            border-radius: 8px;
            padding: 12px 16px;
            text-align: right;
        }
        .total-label {
            font-size: 11px;
            font-weight: bold;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .total-amount {
            font-size: 22px;
            font-weight: 800;
            color: #0f766e;
            margin-top: 4px;
        }
        .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <div class="logo-title">Med<span>Visit</span></div>
                <div class="logo-subtitle">Healthcare Clinic Operating Platform</div>
            </td>
            <td class="doc-badge">
                <div class="doc-type">Credit Note</div>
                <div class="doc-number">{{ $refundRequest->credit_note_number }}</div>
            </td>
        </tr>
    </table>

    <table class="info-grid">
        <tr>
            <td class="info-col">
                <div class="info-label">Issued By</div>
                <div class="info-name">MedVisit (Pvt) Ltd</div>
                <div class="info-text">
                    Healthcare Technology Solutions<br>
                    Colombo, Sri Lanka<br>
                    Email: support@medvisit.lk<br>
                    Web: https://medvisit.lk
                </div>
            </td>
            <td class="info-col" style="padding-left: 20px;">
                <div class="info-label">Credit Issued To</div>
                <div class="info-name">{{ $billing['legal_name'] ?? $clinic->name }}</div>
                <div class="info-text">
                    @if(!empty($billing['address']))
                        {{ $billing['address'] }}<br>
                    @endif
                    @if(!empty($billing['phone']))
                        Phone: {{ $billing['phone'] }}<br>
                    @endif
                    Email: {{ $billing['billing_email'] ?? $clinic->email }}<br>
                    @if(!empty($billing['tax_id']))
                        Tax / Business Reg: {{ $billing['tax_id'] }}<br>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <table class="meta-table">
        <tr>
            <td>
                <div class="info-label">Credit Note Date</div>
                <strong>{{ $refundRequest->refunded_at ? $refundRequest->refunded_at->format('d M Y') : now()->format('d M Y') }}</strong>
            </td>
            <td>
                <div class="info-label">Original Invoice</div>
                <strong>{{ $invoice->invoice_number }}</strong>
            </td>
            @if($invoice->receipt_number)
            <td>
                <div class="info-label">Original Receipt</div>
                <strong>{{ $invoice->receipt_number }}</strong>
            </td>
            @endif
            <td>
                <div class="info-label">Refund Method</div>
                <strong>
                    @if($refundRequest->refund_method === 'payments_lk_dashboard')
                        Card Reversal (Payments.lk)
                    @elseif($refundRequest->refund_method === 'bank_transfer')
                        Bank Transfer
                    @elseif($refundRequest->refund_method === 'api')
                        Payment Gateway API
                    @else
                        {{ ucfirst(str_replace('_', ' ', $refundRequest->refund_method ?? 'Refund')) }}
                    @endif
                </strong>
            </td>
            @if($refundRequest->refund_reference)
            <td>
                <div class="info-label">Reference ID</div>
                <strong style="font-family: monospace;">{{ $refundRequest->refund_reference }}</strong>
            </td>
            @endif
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 55%;">Item & Reason</th>
                <th style="width: 20%; text-align: right;">Original Paid</th>
                <th style="width: 25%; text-align: right;">Credit / Refunded</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong style="font-size: 13px;">Subscription Refund</strong><br>
                    <span style="color: #64748b; font-size: 11px;">
                        Plan: {{ $plan?->name ?? 'MedVisit Clinic Subscription' }}<br>
                        Reason: {{ ucfirst(str_replace('_', ' ', $refundRequest->reason_type)) }}
                        @if($refundRequest->decision_reason)
                            — {{ $refundRequest->decision_reason }}
                        @elseif($refundRequest->description)
                            — {{ $refundRequest->description }}
                        @endif
                    </span>
                </td>
                <td style="text-align: right;">Rs. {{ number_format($payment->amount_cents / 100, 2) }}</td>
                <td style="text-align: right; font-weight: bold; color: #0f766e;">Rs. {{ number_format($refundRequest->approved_amount_cents / 100, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="summary-table">
        <tr>
            <td class="summary-col-left">
                <div class="info-label">Notice & Policy</div>
                <p style="font-size: 11px; color: #64748b; margin: 0; line-height: 1.45;">
                    This credit note documents the approved return of funds for the above subscription transaction per MedVisit's published Refund Policy.
                    Card refunds typically reflect on your bank card statement within 7–14 working days, depending on your card issuer.
                </p>
            </td>
            <td class="summary-col-right" style="padding-left: 20px;">
                <div class="total-box">
                    <div class="total-label">Total Refunded Amount</div>
                    <div class="total-amount">Rs. {{ number_format($refundRequest->approved_amount_cents / 100, 2) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="footer">
        MedVisit (Pvt) Ltd • Healthcare Clinic Operating Platform • Automated System Generated Credit Note<br>
        For inquiries regarding this credit note, contact support@medvisit.lk citing Reference: {{ $refundRequest->credit_note_number }}
    </div>
</body>
</html>
