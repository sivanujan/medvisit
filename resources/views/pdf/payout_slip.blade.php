<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payout Slip {{ $settlement->settlement_number }}</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            margin: 20mm 15mm;
            size: a4 portrait;
        }
        .slip-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            color: #0f172a;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #1E6FD9;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .clinic-name {
            font-size: 20px;
            font-weight: 700;
            color: #1E6FD9;
            margin: 0;
        }
        .doc-badge {
            text-align: right;
        }
        .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #1E6FD9;
            text-transform: uppercase;
            margin: 0;
        }
        .doc-num {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
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
            padding: 9px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
        }
        .totals-table {
            width: 340px;
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
            border-top: 2px solid #1E6FD9;
            border-bottom: 2px solid #1E6FD9;
            font-size: 16px;
            font-weight: 800;
            color: #1E6FD9;
            padding: 10px 12px;
        }
        .clear-fix {
            clear: both;
        }
        .sig-block {
            margin-top: 40px;
            width: 100%;
        }
    </style>
</head>
<body>
<div class="slip-container">
    @php
        $clinic = $tenant ?? (function_exists('tenant') ? tenant() : null);
        $doctor = $settlement->doctor;
    @endphp

    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <h1 class="clinic-name">{{ $clinic->name ?? 'MedVisit Medical Clinic' }}</h1>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    {{ $clinic->address ?? 'Colombo, Sri Lanka' }} | Tel: {{ $clinic->phone ?? '+94 11 234 5678' }}
                </div>
            </td>
            <td class="doc-badge" style="vertical-align: top;">
                <div class="doc-title">Doctor Payout Slip</div>
                <div class="doc-num">{{ $settlement->settlement_number }}</div>
            </td>
        </tr>
    </table>

    <div class="info-card">
        <table class="info-table">
            <tr>
                <td style="width: 35%;">
                    <div class="info-label">Doctor / වෛද්‍යවරයා / மருத்துவர்</div>
                    <div class="info-val">{{ $doctor ? trim(($doctor->title ?? 'Dr.') . ' ' . $doctor->name) : 'Specialist' }}</div>
                    @if($doctor?->slmc_number)
                        <div style="font-size: 11px; color: #64748b;">SLMC: {{ $doctor->slmc_number }}</div>
                    @endif
                </td>
                <td style="width: 25%;">
                    <div class="info-label">Settlement Period</div>
                    <div class="info-val">{{ $settlement->period_start->format('d M Y') }} – {{ $settlement->period_end->format('d M Y') }}</div>
                </td>
                <td style="width: 20%;">
                    <div class="info-label">Patients Seen</div>
                    <div class="info-val">{{ $settlement->patients_seen }} Patients</div>
                </td>
                <td style="width: 20%; text-align: right;">
                    <div class="info-label">Disbursement Date</div>
                    <div class="info-val">{{ $settlement->paid_at ? $settlement->paid_at->format('d/m/Y') : $settlement->created_at->format('d/m/Y') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 15%;">Receipt #</th>
                <th style="width: 25%;">Patient Name</th>
                <th style="width: 10%;">Token #</th>
                <th style="width: 25%; text-align: right;">Consultation Fee</th>
                <th style="width: 25%; text-align: right;">Doctor Share</th>
            </tr>
        </thead>
        <tbody>
            @forelse($settlement->items as $item)
                <tr>
                    <td style="font-family: monospace;">{{ $item->bill?->receipt_number ?? ('REC-' . $item->bill_id) }}</td>
                    <td>{{ $item->bill?->patient?->name ?? 'Walk-in Patient' }}</td>
                    <td>#{{ $item->bill?->token?->token_number ?? '—' }}</td>
                    <td style="text-align: right;">LKR {{ number_format($item->consultation_fee_cents / 100, 2) }}</td>
                    <td style="text-align: right; font-weight: 700; color: #0E9E8F;">LKR {{ number_format($item->doctor_share_cents / 100, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">
                        Settlement calculated from period aggregate: {{ $settlement->patients_seen }} consultations.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if($settlement->adjustments->isNotEmpty())
        <div style="font-weight: 700; font-size: 13px; margin-top: 15px; margin-bottom: 8px;">Adjustments & Deductions</div>
        <table class="items-table" style="margin-bottom: 10px;">
            <tbody>
                @foreach($settlement->adjustments as $adj)
                    <tr style="background: #fffbeb;">
                        <td>{{ ucfirst((string) $adj->type) }}: {{ $adj->reason }}</td>
                        <td style="text-align: right; font-weight: 700; color: {{ $adj->amount_cents < 0 ? '#dc2626' : '#16a34a' }};">
                            LKR {{ number_format($adj->amount_cents / 100, 2) }}
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <table class="totals-table">
        <tr>
            <td style="color: #64748b;">Gross Consultation Total:</td>
            <td style="text-align: right; font-weight: 600;">LKR {{ number_format($settlement->gross_consultation_cents / 100, 2) }}</td>
        </tr>
        <tr>
            <td style="color: #64748b;">Doctor Base Share:</td>
            <td style="text-align: right; font-weight: 600;">LKR {{ number_format($settlement->doctor_share_cents / 100, 2) }}</td>
        </tr>
        @if($settlement->adjustments_cents != 0)
            <tr>
                <td style="color: #64748b;">Adjustments:</td>
                <td style="text-align: right; font-weight: 600;">LKR {{ number_format($settlement->adjustments_cents / 100, 2) }}</td>
            </tr>
        @endif
        <tr class="grand-total">
            <td>Net Payout:</td>
            <td style="text-align: right;">LKR {{ number_format($settlement->net_payout_cents / 100, 2) }}</td>
        </tr>
        <tr>
            <td style="color: #64748b; font-size: 11px;">Payment Method:</td>
            <td style="text-align: right; font-weight: 600; font-size: 11px;">{{ strtoupper(str_replace('_', ' ', (string) $settlement->payment_method)) }}</td>
        </tr>
        @if($settlement->payment_reference)
            <tr>
                <td style="color: #64748b; font-size: 11px;">Reference:</td>
                <td style="text-align: right; font-family: monospace; font-size: 11px;">{{ $settlement->payment_reference }}</td>
            </tr>
        @endif
    </table>

    <div class="clear-fix"></div>

    <table class="sig-block">
        <tr>
            <td style="width: 50%; vertical-align: top;">
                <div style="width: 200px; border-bottom: 1px solid #94a3b8; margin-bottom: 5px; height: 40px;"></div>
                <div style="font-size: 11px; font-weight: 600; color: #475569;">Prepared By: {{ $settlement->creator?->name ?? 'Administrator' }}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
                <div style="display: inline-block; text-align: left;">
                    <div style="width: 200px; border-bottom: 1px solid #94a3b8; margin-bottom: 5px; height: 40px;"></div>
                    <div style="font-size: 11px; font-weight: 600; color: #475569;">Doctor's Acknowledgment</div>
                </div>
            </td>
        </tr>
    </table>
</div>
</body>
</html>
