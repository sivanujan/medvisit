@extends('emails.layouts.base', [
    'subject' => "Appointment Reminder: Token #{$tokenNumber} — {$clinicName}",
    'preheader' => "Reminder: Your appointment with {$doctorName} is scheduled for {$sessionDate} at {$approxTime}.",
    'brandMode' => 'clinic',
])

@section('content')
    <x-email.heading>Upcoming Appointment Reminder</x-email.heading>

    <x-email.text>
        Hello {{ $patientName }},
    </x-email.text>

    <x-email.text>
        This is a friendly reminder for your doctor channeling appointment scheduled at <strong>{{ $clinicName }}</strong>:
    </x-email.text>

    {{-- Large Token Box --}}
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 20px 0 24px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #EFF6FF; border: 2px solid #BFDBFE; border-radius: 12px; margin: 0 auto; width: 100%; max-width: 320px;">
                    <tr>
                        <td align="center" style="padding: 18px 24px;">
                            <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #1E40AF; letter-spacing: 1px; text-transform: uppercase;">
                                TOKEN NUMBER
                            </div>
                            <div style="font-family: 'SFMono-Regular', Consolas, -apple-system, sans-serif; font-size: 42px; font-weight: 800; color: #1E6FD9; line-height: 1.1; margin: 6px 0;">
                                #{{ $tokenNumber }}
                            </div>
                            <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #1E40AF;">
                                Estimated Time: {{ $approxTime }}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <x-email.info-card title="Consultation Summary" :items="[
        'Doctor' => '<strong>' . $doctorName . '</strong> (' . $doctorSpecialty . ')',
        'Date' => $sessionDate,
        'Time' => $approxTime,
        'Room' => $roomNumber,
        'Patient' => $patientName,
    ]" />

    @if(!empty($clinicAddress))
        <x-email.info-card title="Clinic Location & Directions" :items="array_filter([
            'Clinic' => $clinicName,
            'Address' => $clinicAddress,
            'Telephone' => !empty($clinicPhone) ? '<a href=\"tel:' . $clinicPhone . '\" style=\"color: #1E6FD9; text-decoration: none;\">' . $clinicPhone . '</a>' : null,
            'Directions' => '<a href=\"' . $mapUrl . '\" target=\"_blank\" style=\"color: #0E9E8F; font-weight: 600; text-decoration: none;\">Open in Google Maps &rarr;</a>',
        ])" />
    @endif

    <x-email.alert type="info">
        <strong>Please arrive 15 minutes before</strong> your consultation time to ensure timely check-in at reception.
    </x-email.alert>
@endsection
