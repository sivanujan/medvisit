@extends('emails.layouts.base', [
    'subject' => "Token Updated: #{$oldTokenNumber} → #{$newTokenNumber} — {$clinicName}",
    'preheader' => "Your channeling token has changed to #{$newTokenNumber} at {$clinicName}.",
    'brandMode' => 'clinic',
])

@section('content')
    <x-email.heading>Token Rescheduled / Moved</x-email.heading>

    <x-email.text>
        Hello {{ $patientName }},
    </x-email.text>

    <x-email.text>
        Your channeling queue position at <strong>{{ $clinicName }}</strong> has been updated. Please note your new token number below:
    </x-email.text>

    {{-- Large Token Box --}}
    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 20px 0 24px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FFFBEB; border: 2px solid #FDE68A; border-radius: 12px; margin: 0 auto; width: 100%; max-width: 320px;">
                    <tr>
                        <td align="center" style="padding: 18px 24px;">
                            <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #92400E; letter-spacing: 1px; text-transform: uppercase;">
                                NEW TOKEN NUMBER
                            </div>
                            <div style="font-family: 'SFMono-Regular', Consolas, -apple-system, sans-serif; font-size: 42px; font-weight: 800; color: #B45309; line-height: 1.1; margin: 6px 0;">
                                #{{ $newTokenNumber }}
                            </div>
                            <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #78350F;">
                                Previous: <strike style="color: #94A3B8;">#{{ $oldTokenNumber }}</strike> · Approx. Time: {{ $approxTime }}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <x-email.info-card title="Updated Consultation Details" :items="[
        'Doctor' => '<strong>' . $doctorName . '</strong> (' . $doctorSpecialty . ')',
        'Date' => $sessionDate,
        'Estimated Time' => $approxTime,
        'Room' => $roomNumber,
        'Reason for Update' => $reason,
    ]" />

    @if(!empty($clinicAddress))
        @php
            $locationItems = array_filter([
                'Clinic' => $clinicName,
                'Address' => $clinicAddress,
                'Telephone' => !empty($clinicPhone) ? '<a href="tel:' . $clinicPhone . '" style="color: #1E6FD9; text-decoration: none;">' . $clinicPhone . '</a>' : null,
                'Directions' => '<a href="' . $mapUrl . '" target="_blank" style="color: #0E9E8F; font-weight: 600; text-decoration: none;">Open in Google Maps →</a>',
            ]);
        @endphp
        <x-email.info-card title="Clinic Location" :items="$locationItems" />
    @endif

    <x-email.alert type="warning">
        <strong>Please arrive 15 minutes before</strong> your new estimated consultation time ({{ $approxTime }}).
    </x-email.alert>
@endsection
