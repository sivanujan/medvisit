<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>GRN {{ $receipt->receipt_number ?? ('GRN-' . $receipt->id) }}</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            margin: 20mm 15mm;
            size: a4 portrait;
        }
        .grn-container {
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
        .doc-badge {
            text-align: right;
        }
        .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #0E9E8F;
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
            color: #0E9E8F;
            padding: 10px 12px;
        }
        .clear-fix {
            clear: both;
        }
    </style>
</head>
<body>
<div class="grn-container">
    @php
        $clinic = $tenant ?? (function_exists('tenant') ? tenant() : null);
        $supplier = $receipt->supplier;
    @endphp

    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <h1 class="clinic-name">{{ $clinic->name ?? 'MedVisit Clinic' }}</h1>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    Pharmacy Inventory Management • Goods Received Note
                </div>
            </td>
            <td class="doc-badge" style="vertical-align: top;">
                <div class="doc-title">Goods Received Note</div>
                <div class="doc-num">{{ $receipt->receipt_number ?? ('GRN-' . $receipt->id) }}</div>
            </td>
        </tr>
    </table>

    <div class="info-card">
        <table class="info-table">
            <tr>
                <td style="width: 35%;">
                    <div class="info-label">Supplier / සැපයුම්කරු / சப்ளையர்</div>
                    <div class="info-val">{{ $supplier?->name ?? 'Direct Stock In' }}</div>
                    @if($supplier?->contact_number)
                        <div style="font-size: 11px; color: #64748b;">Tel: {{ $supplier->contact_number }}</div>
                    @endif
                </td>
                <td style="width: 25%;">
                    <div class="info-label">Supplier Invoice #</div>
                    <div class="info-val">{{ $receipt->invoice_number ?? '—' }}</div>
                </td>
                <td style="width: 20%;">
                    <div class="info-label">Received Date</div>
                    <div class="info-val">{{ $receipt->received_date ? \Carbon\Carbon::parse($receipt->received_date)->format('d/m/Y') : $receipt->created_at->format('d/m/Y') }}</div>
                </td>
                <td style="width: 20%; text-align: right;">
                    <div class="info-label">Received By</div>
                    <div class="info-val">{{ $receipt->creator?->name ?? 'Pharmacist' }}</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 35%;">Medicine & Strength / ඖෂධය</th>
                <th style="width: 15%;">Batch #</th>
                <th style="width: 15%;">Expiry Date</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 12%; text-align: right;">Unit Cost</th>
                <th style="width: 13%; text-align: right;">Total Cost</th>
            </tr>
        </thead>
        <tbody>
            @php $grandTotalCents = 0; @endphp
            @forelse($receipt->batches as $batch)
                @php
                    $unitCost = $batch->cost_price_cents ?? 0;
                    $qty = $batch->quantity_received ?? 0;
                    $lineTotal = $unitCost * $qty;
                    $grandTotalCents += $lineTotal;
                @endphp
                <tr>
                    <td>
                        <strong>{{ $batch->clinicMedicine?->display_name ?? $batch->clinicMedicine?->brand_name ?? 'Medicine' }}</strong>
                        <div style="font-size: 11px; color: #64748b;">
                            {{ $batch->clinicMedicine?->generic_name ?? '' }} {{ $batch->clinicMedicine?->strength_text ?? '' }}
                        </div>
                    </td>
                    <td style="font-family: monospace;">{{ $batch->batch_number ?? '—' }}</td>
                    <td>{{ $batch->expiry_date ? \Carbon\Carbon::parse($batch->expiry_date)->format('m/Y') : '—' }}</td>
                    <td style="text-align: center; font-weight: 600;">{{ $qty }}</td>
                    <td style="text-align: right;">LKR {{ number_format($unitCost / 100, 2) }}</td>
                    <td style="text-align: right; font-weight: 600;">LKR {{ number_format($lineTotal / 100, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No batches in this stock receipt.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="totals-table">
        <tr class="grand-total">
            <td>Total Invoice Value:</td>
            <td style="text-align: right;">LKR {{ number_format(($receipt->total_cost_cents ?? $grandTotalCents) / 100, 2) }}</td>
        </tr>
    </table>

    <div class="clear-fix"></div>

    <div style="margin-top: 40px; font-size: 11px; color: #64748b; text-align: center;">
        Inventory stocked into MedVisit FEFO (First-Expired, First-Out) Dispensing Catalog.<br>
        <em>Powered by MedVisit • <a href="https://medvisit.lk" style="color: inherit; text-decoration: none;">medvisit.lk</a></em>
    </div>
</div>
</body>
</html>
