<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Receipt {{ $bill->receipt_number ?? 'REC-' . $bill->id }}</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            margin: 20mm 15mm;
            size: a4 portrait;
        }
        .receipt-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            color: #0f172a;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0E9E8F;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .clinic-name {
            font-size: 20px;
            font-weight: 700;
            color: #1E6FD9;
            margin: 0;
        }
        .clinic-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }
        .doc-badge {
            text-align: right;
        }
        .doc-title {
            font-size: 20px;
            font-weight: 800;
            color: #0E9E8F;
            text-transform: uppercase;
            margin: 0;
        }
        .doc-num {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            font-family: 'Courier New', monospace;
            margin-top: 3px;
        }
        .info-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 20px;
        }
        .info-table {
            width: 100%;
            font-size: 12px;
        }
        .info-label {
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .info-val {
            font-weight: 600;
            color: #0f172a;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            padding: 9px 12px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            color: #475569;
        }
        .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
        }
        .totals-table {
            width: 320px;
            float: right;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 30px;
            font-size: 13px;
        }
        .totals-table td {
            padding: 6px 12px;
        }
        .totals-table tr.grand-total td {
            border-top: 2px solid #0E9E8F;
            border-bottom: 2px solid #0E9E8F;
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            padding: 10px 12px;
        }
        .clear-fix {
            clear: both;
        }
        .footer-note {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11px;
            color: #64748b;
            text-align: center;
        }
    </style>
</head>
<body>
<div class="receipt-container">
    @php
        $clinic = $tenant ?? (function_exists('tenant') ? tenant() : null);
        $doctor = $bill->doctor ?? $bill->token?->session?->doctor;
        $patient = $bill->patient;
    @endphp

    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <h1 class="clinic-name">{{ $clinic->name ?? 'MedVisit Medical Clinic' }}</h1>
                <div class="clinic-meta">
                    {{ $clinic->address ?? 'Colombo, Sri Lanka' }} | Tel: {{ $clinic->phone ?? config('medvisit_public.business.phone_display', '070 129 1688') }}
                </div>
            </td>
            <td class="doc-badge" style="vertical-align: top;">
                <div class="doc-title">{{ $bill->payment_status === \App\Models\Bill::STATUS_REFUNDED ? 'Refund Receipt' : 'Official Receipt' }}</div>
                <div class="doc-num">{{ $bill->receipt_number ?? ('REC-' . $bill->id) }}</div>
            </td>
        </tr>
    </table>

    <div class="info-card">
        <table class="info-table">
            <tr>
                <td style="width: 35%;">
                    <div class="info-label">Patient Name / නම / பெயர்</div>
                    <div class="info-val">{{ $patient?->name ?? 'Walk-in Patient' }}</div>
                    @if($patient?->phone)
                        <div style="font-size: 11px; color: #64748b;">{{ $patient->phone }}</div>
                    @endif
                </td>
                <td style="width: 30%;">
                    <div class="info-label">Consulting Doctor / වෛද්‍යවරයා</div>
                    <div class="info-val">{{ $doctor ? trim(($doctor->title ?? 'Dr.') . ' ' . $doctor->name) : 'Specialist' }}</div>
                    <div style="font-size: 11px; color: #0E9E8F;">{{ $doctor?->specialty ?? 'General Practice' }}</div>
                </td>
                <td style="width: 20%;">
                    <div class="info-label">Token # / ටෝකන් අංකය</div>
                    <div class="info-val">#{{ $bill->token?->display_token ?? $bill->token?->token_number ?? '—' }}</div>
                </td>
                <td style="width: 15%; text-align: right;">
                    <div class="info-label">Date / දිනය</div>
                    <div class="info-val">{{ $bill->created_at->format('d/m/Y') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 50%;">Description / විස්තරය / விளக்கம்</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Rate (LKR)</th>
                <th style="width: 20%; text-align: right;">Amount (LKR)</th>
            </tr>
        </thead>
        <tbody>
            @if($bill->items->isNotEmpty())
                @foreach($bill->items as $item)
                    <tr>
                        <td>
                            <strong>{{ $item->description }}</strong>
                        </td>
                        <td style="text-align: center;">{{ $item->quantity }}</td>
                        <td style="text-align: right;">{{ number_format($item->unit_price_cents / 100, 2) }}</td>
                        <td style="text-align: right; font-weight: 600;">{{ number_format($item->total_price_cents / 100, 2) }}</td>
                    </tr>
                @endforeach
            @else
                @if($bill->doctor_fee > 0)
                    <tr>
                        <td><strong>Doctor Consultation Fee</strong></td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">{{ number_format($bill->doctor_fee / 100, 2) }}</td>
                        <td style="text-align: right; font-weight: 600;">{{ number_format($bill->doctor_fee / 100, 2) }}</td>
                    </tr>
                @endif
                @if($bill->clinic_fee > 0)
                    <tr>
                        <td><strong>Clinic Facility / Registration Fee</strong></td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">{{ number_format($bill->clinic_fee / 100, 2) }}</td>
                        <td style="text-align: right; font-weight: 600;">{{ number_format($bill->clinic_fee / 100, 2) }}</td>
                    </tr>
                @endif
                @if($bill->other_fee > 0)
                    <tr>
                        <td><strong>Additional Services / Pharmacy</strong></td>
                        <td style="text-align: center;">1</td>
                        <td style="text-align: right;">{{ number_format($bill->other_fee / 100, 2) }}</td>
                        <td style="text-align: right; font-weight: 600;">{{ number_format($bill->other_fee / 100, 2) }}</td>
                    </tr>
                @endif
            @endif

            @if($bill->discount > 0)
                <tr style="color: #dc2626;">
                    <td colspan="3" style="text-align: right; font-weight: 600;">Discount: {{ $bill->discount_reason ?? 'Special Concession' }}</td>
                    <td style="text-align: right; font-weight: 600;">- {{ number_format($bill->discount / 100, 2) }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <table class="totals-table">
        <tr>
            <td style="color: #64748b;">Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">LKR {{ number_format(($bill->total_amount + $bill->discount) / 100, 2) }}</td>
        </tr>
        @if($bill->discount > 0)
            <tr style="color: #dc2626;">
                <td>Discount:</td>
                <td style="text-align: right; font-weight: 600;">- LKR {{ number_format($bill->discount / 100, 2) }}</td>
            </tr>
        @endif
        <tr class="grand-total">
            <td>Total Paid:</td>
            <td style="text-align: right; color: #0E9E8F;">LKR {{ number_format($bill->total_amount / 100, 2) }}</td>
        </tr>
        <tr>
            <td style="color: #64748b; font-size: 11px;">Payment Method:</td>
            <td style="text-align: right; font-weight: 600; font-size: 11px;">{{ ucfirst(str_replace('_', ' ', (string) $bill->payment_method)) }}</td>
        </tr>
        <tr>
            <td style="color: #64748b; font-size: 11px;">Status:</td>
            <td style="text-align: right; font-weight: 600; font-size: 11px; color: {{ $bill->payment_status === \App\Models\Bill::STATUS_REFUNDED ? '#dc2626' : '#16a34a' }};">
                {{ strtoupper((string) $bill->payment_status) }}
            </td>
        </tr>
    </table>

    <div class="clear-fix"></div>

    <div class="footer-note">
        Thank you for visiting {{ $clinic->name ?? 'our clinic' }}. Please retain this receipt for your personal health records.<br>
        <em>Powered by MedVisit • <a href="https://medvisit.lk" style="color: inherit; text-decoration: none;">medvisit.lk</a></em>
    </div>
</div>
</body>
</html>
