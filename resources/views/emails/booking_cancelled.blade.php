@extends('emails.layouts.base', [
    'subject' => "Appointment Cancelled: Token #{$tokenNumber} — {$clinicName}",
    'preheader' => "Your appointment token #{$tokenNumber} at {$clinicName} has been cancelled.",
    'brandMode' => 'clinic',
])

@section('content')
    <x-email.heading>Appointment Cancelled</x-email.heading>

    <x-email.text>
        Hello {{ $patientName }},
    </x-email.text>

    <x-email.text>
        Your channeling appointment with <strong>{{ $doctorName }}</strong> at <strong>{{ $clinicName }}</strong> on {{ $sessionDate }} has been cancelled.
    </x-email.text>

    <x-email.info-card title="Cancelled Booking Details" :items="[
        'Cancelled Token' => '#' . $tokenNumber,
        'Doctor' => $doctorName,
        'Date' => $sessionDate,
        'Reason' => $reason,
    ]" />

    <x-email.alert type="info">
        <strong>Need to book another consultation?</strong> You can view upcoming channeling sessions and reserve a new token online anytime.
    </x-email.alert>

    <x-email.button :url="$rebookUrl" align="left">
        Book New Appointment &rarr;
    </x-email.button>

    @if(!empty($clinicPhone))
        <x-email.text muted>
            If you have questions regarding this cancellation, please contact the clinic reception directly at <a href="tel:{{ $clinicPhone }}" style="color: #1E6FD9;">{{ $clinicPhone }}</a>.
        </x-email.text>
    @endif
@endsection
