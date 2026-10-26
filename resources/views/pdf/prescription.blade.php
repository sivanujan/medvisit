<!DOCTYPE html>
<html lang="{{ $lang ?? 'en' }}">
<head>
    <meta charset="UTF-8">
    <title>Prescription {{ $prescription->prescription_number }}</title>
    @include('pdf.partials.fonts')
    <style>
        @page {
            margin: 20mm 15mm;
            size: a4 portrait;
        }
        .rx-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            color: #0f172a;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #1E6FD9;
            padding-bottom: 12px;
            margin-bottom: 16px;
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
        .doctor-badge {
            text-align: right;
        }
        .doctor-name {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
        }
        .doctor-specialty {
            font-size: 12px;
            color: #0E9E8F;
            font-weight: 600;
        }
        .doctor-slmc {
            font-size: 11px;
            color: #64748b;
        }
        .patient-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 18px;
            width: 100%;
        }
        .patient-table {
            width: 100%;
            font-size: 12px;
        }
        .patient-label {
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .patient-val {
            font-weight: 600;
            color: #0f172a;
        }
        .rx-symbol {
            font-size: 26px;
            font-weight: 800;
            color: #1E6FD9;
            font-family: 'Times New Roman', serif;
            margin-bottom: 8px;
        }
        .diagnosis-box {
            margin-bottom: 14px;
            padding: 6px 10px;
            background: #f1f5f9;
            border-left: 3px solid #0E9E8F;
            font-size: 12px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
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
            padding: 10px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            vertical-align: top;
        }
        .med-name {
            font-weight: 700;
            font-size: 13px;
            color: #0f172a;
        }
        .med-generic {
            font-size: 11px;
            color: #64748b;
            font-style: italic;
        }
        .med-instructions {
            font-size: 12px;
            color: #0E9E8F;
            font-weight: 500;
            margin-top: 2px;
        }
        .footer-table {
            width: 100%;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px dashed #cbd5e1;
        }
        .sig-line {
            width: 180px;
            border-bottom: 1px solid #0f172a;
            margin-bottom: 4px;
        }
        .trilingual-tag {
            display: inline-block;
            font-size: 10px;
            background: #e0f2fe;
            color: #0369a1;
            padding: 1px 6px;
            border-radius: 4px;
            margin-left: 6px;
        }
    </style>
</head>
<body>
<div class="rx-container">
    @php
        $clinic = $tenant ?? (function_exists('tenant') ? tenant() : null);
        $doctor = $prescription->doctor ?? $prescription->token?->doctorSession?->doctor;
        $patient = $prescription->patient;
    @endphp

    <table class="header-table">
        <tr>
            <td style="vertical-align: top;">
                <h1 class="clinic-name">{{ $clinic->name ?? 'MedVisit Medical Center' }}</h1>
                <div class="clinic-meta">
                    {{ $clinic->address ?? 'Colombo, Sri Lanka' }} | Tel: {{ $clinic->phone ?? '+94 11 234 5678' }}
                </div>
            </td>
            <td class="doctor-badge" style="vertical-align: top;">
                <h2 class="doctor-name">{{ $doctor ? trim(($doctor->title ?? 'Dr.') . ' ' . $doctor->name) : 'Medical Officer' }}</h2>
                <div class="doctor-specialty">{{ $doctor?->specialty ?? 'General Practitioner' }}</div>
                @if($doctor?->slmc_number)
                    <div class="doctor-slmc">SLMC Reg: {{ $doctor->slmc_number }}</div>
                @endif
            </td>
        </tr>
    </table>

    <div class="patient-card">
        <table class="patient-table">
            <tr>
                <td style="width: 35%;">
                    <div class="patient-label">Patient Name / නම / பெயர்</div>
                    <div class="patient-val">{{ $patient?->name ?? 'Walk-in Patient' }}</div>
                </td>
                <td style="width: 15%;">
                    <div class="patient-label">Age / වයස</div>
                    <div class="patient-val">{{ $patient?->date_of_birth ? \Carbon\Carbon::parse($patient->date_of_birth)->age . ' Y' : ($patient?->age ? $patient->age . ' Y' : '—') }}</div>
                </td>
                <td style="width: 15%;">
                    <div class="patient-label">Gender / ස්ත්‍රී-පුරුෂ</div>
                    <div class="patient-val">{{ ucfirst((string) ($patient?->gender ?? '—')) }}</div>
                </td>
                <td style="width: 20%;">
                    <div class="patient-label">Rx #</div>
                    <div class="patient-val">{{ $prescription->prescription_number }}</div>
                </td>
                <td style="width: 15%; text-align: right;">
                    <div class="patient-label">Date / දිනය</div>
                    <div class="patient-val">{{ $prescription->finalized_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}</div>
                </td>
            </tr>
        </table>
    </div>

    @if($prescription->diagnosis)
        <div class="diagnosis-box">
            <strong>Diagnosis / රෝග විනිශ්චය / நோய் கண்டறிதல்:</strong> {{ $prescription->diagnosis }}
        </div>
    @endif

    <div class="rx-symbol">&#8478;</div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Medicine & Generic / ඖෂධය / மருந்து</th>
                <th style="width: 25%;">Dosage & Frequency / මාත්‍රාව / அளவு</th>
                <th style="width: 15%;">Duration / කාලය</th>
                <th style="width: 10%; text-align: right;">Qty</th>
            </tr>
        </thead>
        <tbody>
            @forelse($prescription->items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <div class="med-name">
                            {{ $item->display_name ?? $item->brand_name ?? $item->generic_name }}
                            @if($item->source === 'outside' || $item->source === 'buy_outside')
                                <span class="trilingual-tag">Buy Outside</span>
                            @endif
                        </div>
                        @if($item->generic_name && $item->generic_name !== $item->display_name)
                            <div class="med-generic">{{ $item->generic_name }} {{ $item->strength_text }} ({{ $item->dosage_form }})</div>
                        @endif
                        @if($item->instructions)
                            <div class="med-instructions">{{ $item->instructions }}</div>
                        @endif
                    </td>
                    <td>
                        <strong>{{ $item->dose_display ?? $item->dose }}</strong> — {{ $item->frequency_text ?? $item->frequency }}
                        @if($item->timing)
                            <div style="font-size: 11px; color: #475569;">{{ ucfirst(str_replace('_', ' ', $item->timing)) }}</div>
                        @endif
                    </td>
                    <td>{{ $item->duration_days ? $item->duration_days . ' Days' : '—' }}</td>
                    <td style="text-align: right; font-weight: 700;">{{ $item->quantity ?? '—' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No medications prescribed.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    @if($prescription->follow_up_date)
        <div style="font-size: 12px; margin-bottom: 20px;">
            <strong>Next Follow-up / නැවත පැමිණිය යුතු දිනය:</strong> {{ $prescription->follow_up_date->format('d/m/Y') }}
        </div>
    @endif

    <table class="footer-table">
        <tr>
            <td style="width: 60%; font-size: 11px; color: #64748b; vertical-align: bottom;">
                <em>Generated by MedVisit Cloud Health OS • Trilingual HarfBuzz Script Compliant</em>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: bottom;">
                <div style="display: inline-block; text-align: center;">
                    <div class="sig-line"></div>
                    <div style="font-size: 11px; font-weight: 600; color: #475569;">Doctor's Signature & Seal</div>
                </div>
            </td>
        </tr>
    </table>
</div>
</body>
</html>
