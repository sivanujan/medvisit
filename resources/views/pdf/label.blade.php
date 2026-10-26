<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Medicine Label</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            size: 80mm 50mm;
            margin: 2mm;
        }
        body {
            font-family: 'Poppins', 'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif;
            margin: 0;
            padding: 4mm 5mm;
            color: #0f172a;
            font-size: 10px;
            line-height: 1.3;
        }
        .clinic-header {
            font-size: 11px;
            font-weight: 700;
            color: #1E6FD9;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 2px;
            margin-bottom: 3px;
        }
        .patient-row {
            font-size: 10px;
            margin-bottom: 4px;
        }
        .med-title {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
            margin-bottom: 2px;
        }
        .dosage-instructions {
            font-size: 11px;
            font-weight: 700;
            color: #0E9E8F;
            margin-bottom: 3px;
        }
        .trilingual-directions {
            font-size: 10px;
            color: #334155;
            margin-bottom: 3px;
        }
        .caution-box {
            font-size: 8px;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 2px;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    @php
        $clinic = $tenant ?? (function_exists('tenant') ? tenant() : null);
    @endphp
    <div class="clinic-header">
        {{ $clinic->name ?? 'MedVisit Clinic' }} • {{ $label['date'] ?? now()->format('d/m/Y') }}
    </div>

    <div class="patient-row">
        <strong>Patient:</strong> {{ $label['patient_name'] ?? 'Patient' }}
        @if(!empty($label['token_number']))
            | <strong>Token #{{ $label['token_number'] }}</strong>
        @endif
    </div>

    <div class="med-title">
        {{ $label['medicine_name'] ?? 'Paracetamol 500mg' }}
    </div>

    <div class="dosage-instructions">
        {{ $label['dosage'] ?? '1 Tablet' }} — {{ $label['frequency'] ?? 'TDS (Three Times Daily)' }}
    </div>

    <div class="trilingual-directions">
        {{ $label['instructions_si'] ?? 'කෑමට පසු දිනකට තුන් වරක් ගන්න' }}<br>
        {{ $label['instructions_ta'] ?? 'உணவுக்குப் பின் ஒரு நாளைக்கு 3 முறை எடுக்கவும்' }}
    </div>

    <div class="caution-box">
        Keep out of reach of children. Store in a cool dry place.
    </div>
</body>
</html>
