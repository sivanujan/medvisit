<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Daily Report {{ $date->format('d M Y') }}</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            margin: 20mm 15mm;
            size: a4 portrait;
        }
        .report-container {
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
        .metrics-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: 10px;
            margin-bottom: 20px;
        }
        .metric-cell {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        }
        .metric-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
        }
        .metric-val {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            color: #475569;
        }
        .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
        }
    </style>
</head>
<body>
<div class="report-container">
    @php
        $clinic = $tenant ?? (function_exists('tenant') ? tenant() : null);
        $totalPaidCents = (int) $bills->where('payment_status', \App\Models\Bill::STATUS_PAID)->sum('total_amount');
        $totalRefundCents = (int) $bills->where('payment_status', \App\Models\Bill::STATUS_REFUNDED)->sum('total_amount');
        $netCollectedCents = $totalPaidCents - $totalRefundCents;
        $totalPayoutsCents = (int) $settlements->sum('net_payout_cents');
    @endphp

    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <h1 class="clinic-name">{{ $clinic->name ?? 'MedVisit Clinic' }}</h1>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    Daily Operations & Revenue Summary
                </div>
            </td>
            <td class="doc-badge" style="vertical-align: top;">
                <div class="doc-title">Daily Financial Report</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 3px;">{{ $date->format('l, d F Y') }}</div>
            </td>
        </tr>
    </table>

    <table class="metrics-grid">
        <tr>
            <td class="metric-cell" style="width: 25%;">
                <div class="metric-label">Total Bills</div>
                <div class="metric-val">{{ $bills->count() }}</div>
            </td>
            <td class="metric-cell" style="width: 25%;">
                <div class="metric-label">Gross Collections</div>
                <div class="metric-val" style="color: #0E9E8F;">LKR {{ number_format($totalPaidCents / 100, 2) }}</div>
            </td>
            <td class="metric-cell" style="width: 25%;">
                <div class="metric-label">Doctor Payouts</div>
                <div class="metric-val" style="color: #1E6FD9;">LKR {{ number_format($totalPayoutsCents / 100, 2) }}</div>
            </td>
            <td class="metric-cell" style="width: 25%;">
                <div class="metric-label">Net Clinic Margin</div>
                <div class="metric-val">LKR {{ number_format(($netCollectedCents - $totalPayoutsCents) / 100, 2) }}</div>
            </td>
        </tr>
    </table>

    <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Collections Breakdown ({{ $bills->count() }} transactions)</div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 15%;">Receipt #</th>
                <th style="width: 15%;">Time</th>
                <th style="width: 25%;">Patient</th>
                <th style="width: 25%;">Doctor</th>
                <th style="width: 10%;">Method</th>
                <th style="width: 10%; text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse($bills as $b)
                <tr>
                    <td style="font-family: monospace;">{{ $b->receipt_number ?? ('REC-' . $b->id) }}</td>
                    <td>{{ $b->created_at->format('h:i A') }}</td>
                    <td>{{ $b->patient?->name ?? 'Walk-in Patient' }}</td>
                    <td>{{ $b->doctor?->name ?? 'Specialist' }}</td>
                    <td>{{ ucfirst((string) $b->payment_method) }}</td>
                    <td style="text-align: right; font-weight: 600; color: {{ $b->payment_status === \App\Models\Bill::STATUS_REFUNDED ? '#dc2626' : '#0f172a' }};">
                        {{ $b->payment_status === \App\Models\Bill::STATUS_REFUNDED ? '-' : '' }}LKR {{ number_format($b->total_amount / 100, 2) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No bills recorded on this date.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div style="margin-top: 30px; font-size: 11px; color: #64748b; text-align: center;">
        End-of-Day Financial Ledger • Powered by MedVisit (<a href="https://medvisit.lk" style="color: inherit; text-decoration: none;">medvisit.lk</a>)
    </div>
</div>
</body>
</html>
