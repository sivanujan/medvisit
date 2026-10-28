<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $isReceipt ? 'Receipt ' . ($invoice->receipt_number ?? $invoice->invoice_number) : 'Invoice ' . $invoice->invoice_number }}</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            margin: 28px 36px;
            size: a4 portrait;
        }
        body {
            font-family: 'Poppins', 'Noto Sans Sinhala', 'Noto Sans Tamil', -apple-system, sans-serif;
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
            color: #1E6FD9;
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
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 9px 12px;
            text-align: left;
        }
        .items-table th.text-right {
            text-align: right;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
        }
        .items-table tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .totals-table {
            width: 100%;
            margin-top: 10px;
            margin-bottom: 30px;
        }
        .totals-col-left {
            width: 55%;
            vertical-align: top;
            padding-right: 20px;
        }
        .totals-col-right {
            width: 45%;
            vertical-align: top;
        }
        .amount-row {
            width: 100%;
            border-collapse: collapse;
        }
        .amount-row td {
            padding: 6px 0;
            font-size: 11px;
        }
        .amount-row .total-label {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
            border-top: 2px solid #0f172a;
            padding-top: 8px;
        }
        .amount-row .total-val {
            font-size: 16px;
            font-weight: 800;
            color: #0E9E8F;
            text-align: right;
            border-top: 2px solid #0f172a;
            padding-top: 8px;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border: 2px solid #0E9E8F;
            color: #0E9E8F;
            background: #ecfdf5;
        }
        .status-badge.unpaid {
            border-color: #f59e0b;
            color: #d97706;
            background: #fffbeb;
        }
        .status-badge.failed {
            border-color: #ef4444;
            color: #dc2626;
            background: #fef2f2;
        }
        .payment-box {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 10px;
            color: #475569;
            line-height: 1.5;
        }
        .footer {
            margin-top: 36px;
            padding-top: 14px;
            border-top: 1px solid #cbd5e1;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
            line-height: 1.5;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="vertical-align: middle;">
                <div class="logo-title">Med<span>Visit</span></div>
                <div class="logo-subtitle">Healthcare Operating System</div>
            </td>
            <td class="doc-badge" style="vertical-align: middle;">
                <div class="doc-type">{{ $isReceipt ? 'Payment Receipt' : 'Subscription Invoice' }}</div>
                <div class="doc-number">
                    {{ $isReceipt && $invoice->receipt_number ? $invoice->receipt_number : $invoice->invoice_number }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Billing Info -->
    <table class="info-grid" cellpadding="0" cellspacing="0">
        <tr>
            <td class="info-col">
                <div class="info-label">Billed To</div>
                <div class="info-name">{{ $billing['legal_name'] ?? $clinic->name }}</div>
                <div class="info-text">
                    @if(!empty($billing['billing_email']))
                        Email: {{ $billing['billing_email'] }}<br>
                    @elseif($clinic->email)
                        Email: {{ $clinic->email }}<br>
                    @endif
                    @if(!empty($billing['phone']))
                        Phone: {{ $billing['phone'] }}<br>
                    @elseif($clinic->phone)
                        Phone: {{ $clinic->phone }}<br>
                    @endif
                    @if(!empty($billing['address']))
                        {{ $billing['address'] }}<br>
                    @elseif($clinic->address)
                        {{ $clinic->address }}<br>
                    @endif
                    @if(!empty($billing['tax_id']))
                        Tax / Reg ID: {{ $billing['tax_id'] }}<br>
                    @endif
                </div>
            </td>
            <td class="info-col" style="text-align: right;">
                <div class="info-label">Issued By</div>
                <div class="info-name">MedVisit (Pvt) Ltd</div>
                <div class="info-text">
                    Colombo, Sri Lanka<br>
                    Web: www.medvisit.lk<br>
                    Support: support@medvisit.lk<br>
                    Billing: billing@medvisit.lk
                </div>
            </td>
        </tr>
    </table>

    <!-- Metadata Strip -->
    <table class="meta-table" cellpadding="0" cellspacing="0">
        <tr>
            <td>
                <div class="info-label">Invoice Number</div>
                <strong style="font-family: monospace;">{{ $invoice->invoice_number }}</strong>
            </td>
            @if($isReceipt && $invoice->receipt_number)
            <td>
                <div class="info-label">Receipt Number</div>
                <strong style="font-family: monospace; color: #1E6FD9;">{{ $invoice->receipt_number }}</strong>
            </td>
            @endif
            <td>
                <div class="info-label">Issue Date</div>
                <strong>{{ $invoice->created_at ? $invoice->created_at->setTimezone('Asia/Colombo')->format('d/m/Y') : '-' }}</strong>
            </td>
            <td>
                <div class="info-label">{{ $isReceipt ? 'Paid Date' : 'Due Date' }}</div>
                <strong>
                    @if($isReceipt && $invoice->paid_at)
                        {{ $invoice->paid_at->setTimezone('Asia/Colombo')->format('d/m/Y') }}
                    @elseif($invoice->due_date)
                        {{ $invoice->due_date->setTimezone('Asia/Colombo')->format('d/m/Y') }}
                    @else
                        -
                    @endif
                </strong>
            </td>
            <td style="text-align: right;">
                <div class="info-label">Status</div>
                <div class="status-badge {{ strtolower($invoice->status) }}">
                    {{ strtoupper($invoice->status) }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Line Items -->
    <table class="items-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th style="width: 55%;">Description</th>
                <th style="width: 25%;">Billing Period</th>
                <th class="text-right" style="width: 20%;">Amount (LKR)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong style="font-size: 12px; color: #0f172a;">
                        {{ $plan ? $plan->name : 'MedVisit Clinic Subscription' }}
                    </strong>
                    <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                        @if($invoice->type === 'proration')
                            Plan Upgrade Proration Adjustment
                        @else
                            Monthly Clinic Operations SaaS License
                        @endif
                        @if(!empty($invoice->notes))
                            &bull; {{ $invoice->notes }}
                        @endif
                    </div>
                </td>
                <td>
                    @if($invoice->period_start && $invoice->period_end)
                        {{ $invoice->period_start->setTimezone('Asia/Colombo')->format('d/m/Y') }} –
                        {{ $invoice->period_end->setTimezone('Asia/Colombo')->format('d/m/Y') }}
                    @else
                        1 Month
                    @endif
                </td>
                <td class="text-right" style="font-weight: bold; font-size: 12px;">
                    {{ $invoice->formatted_amount }}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Totals & Payment Method -->
    <table class="totals-table" cellpadding="0" cellspacing="0">
        <tr>
            <td class="totals-col-left">
                @if($isReceipt)
                    <div class="payment-box">
                        <strong style="color: #0f172a;">Payment Details:</strong><br>
                        Method: <strong>{{ $paymentMethodDetails['method_name'] ?? 'Credit / Debit Card' }}</strong><br>
                        @if(!empty($paymentMethodDetails['card_summary']))
                            Card: <strong>{{ $paymentMethodDetails['card_summary'] }}</strong><br>
                        @endif
                        @if(!empty($paymentMethodDetails['reference']))
                            Gateway Ref: <span style="font-family: monospace;">{{ $paymentMethodDetails['reference'] }}</span><br>
                        @endif
                        Secure checkout — card details are never stored by MedVisit.
                    </div>
                @else
                    <div class="payment-box">
                        <strong>Payment Instructions:</strong><br>
                        Pay online via credit/debit card on your MedVisit Billing Center.<br>
                        Due date: {{ $invoice->due_date ? $invoice->due_date->setTimezone('Asia/Colombo')->format('d/m/Y') : 'Upon receipt' }}.
                    </div>
                @endif
            </td>
            <td class="totals-col-right">
                <table class="amount-row" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right; font-weight: 600;">{{ $invoice->formatted_amount }}</td>
                    </tr>
                    <tr>
                        <td>VAT / Taxes (0%):</td>
                        <td style="text-align: right; color: #64748b;">Rs. 0.00</td>
                    </tr>
                    <tr>
                        <td class="total-label">Total {{ $isReceipt ? 'Paid' : 'Due' }}:</td>
                        <td class="total-val">{{ $invoice->formatted_amount }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        This is an official {{ $isReceipt ? 'payment receipt' : 'subscription invoice' }} issued electronically by MedVisit (Pvt) Ltd.<br>
        For inquiries regarding this billing statement, contact <strong>support@medvisit.lk</strong> quoting Invoice <strong>{{ $invoice->invoice_number }}</strong>.<br>
        &copy; {{ date('Y') }} MedVisit. All rights reserved.
    </div>

</body>
</html>
