@extends('emails.layouts.base', [
    'subject' => "Appointment Confirmed: Token #{$tokenNumber} — {$clinicName}",
    'preheader' => "Your channeling token is #{$tokenNumber} for {$doctorName} on {$sessionDate}.",
    'brandMode' => 'clinic',
])

@section('content')
    <x-email.heading>Appointment Confirmed</x-email.heading>

    <x-email.text>
        Hello {{ $patientName }},
    </x-email.text>

    <x-email.text>
        Your appointment has been confirmed at <strong>{{ $clinicName }}</strong>. Please find your channeling token details below:
    </x-email.text>

    {{-- Large Token Box --}}
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 20px 0 24px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ECFDF5; border: 2px solid #A7F3D0; border-radius: 12px; margin: 0 auto; width: 100%; max-width: 320px;">
                    <tr>
                        <td align="center" style="padding: 18px 24px;">
                            <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #065F46; letter-spacing: 1px; text-transform: uppercase;">
                                YOUR CHANNELING TOKEN
                            </div>
                            <div style="font-family: 'SFMono-Regular', Consolas, -apple-system, sans-serif; font-size: 42px; font-weight: 800; color: #047857; line-height: 1.1; margin: 6px 0;">
                                #{{ $tokenNumber }}
                            </div>
                            <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #065F46;">
                                Approx. Consultation Time: {{ $approxTime }}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <x-email.info-card title="Consultation Details" :items="[
        'Doctor' => '<strong>' . $doctorName . '</strong> (' . $doctorSpecialty . ')',
        'Date' => $sessionDate,
        'Session Window' => $sessionTime,
        'Room / Suite' => $roomNumber,
        'Patient Name' => $patientName,
    ]" />

    @if(!empty($clinicAddress))
        <x-email.info-card title="Clinic Location" :items="array_filter([
            'Clinic' => $clinicName,
            'Address' => $clinicAddress,
            'Telephone' => !empty($clinicPhone) ? '<a href=\"tel:' . $clinicPhone . '\" style=\"color: #1E6FD9; text-decoration: none;\">' . $clinicPhone . '</a>' : null,
            'Directions' => '<a href=\"' . $mapUrl . '\" target=\"_blank\" style=\"color: #0E9E8F; font-weight: 600; text-decoration: none;\">Open in Google Maps &rarr;</a>',
        ])" />
    @endif

    <x-email.alert type="info">
        <strong>Important Arrival Notice:</strong> Please arrive at the clinic reception 15 minutes before your estimated time of consultation (<strong>{{ $approxTime }}</strong>). Keep this token number ready for check-in.
    </x-email.alert>

    @if(!empty($cancelUrl))
        <x-email.text muted style="text-align: center; margin-top: 20px;">
            Need to reschedule or cancel your visit? 
            <a href="{{ $cancelUrl }}" target="_blank" style="color: #64748B; text-decoration: underline;">Cancel appointment</a>
        </x-email.text>
    @endif
@endsection
