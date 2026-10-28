@extends('emails.layouts.base', [
    'subject' => "Complete setup for {$clinicName} — MedVisit",
    'preheader' => "Your clinic workspace is waiting. Finish your setup in about 3 minutes.",
])

@section('content')
    <x-email.heading>Complete your clinic setup</x-email.heading>

    <x-email.text>
        Hello from MedVisit,
    </x-email.text>

    <x-email.text>
        Your subscription for <strong>{{ $clinicName }}</strong> is active, but your guided clinic setup has not yet been completed.
    </x-email.text>

    @php
        $setupItems = array_filter([
            'Clinic Name' => $clinicName,
            'Estimated Time' => 'About 3 minutes',
            'Grace Period' => $daysRemaining > 0 ? "{$daysRemaining} days remaining" : 'Expired — setup required to access dashboard',
        ]);
    @endphp

    <x-email.info-card title="Setup Status" :items="$setupItems" />

    <x-email.text>
        Completing setup takes only 3 minutes and ensures your official 80mm receipts, online booking rules, opening hours, and pharmacy modules are properly configured for your staff.
    </x-email.text>

    <x-email.button :url="$setupUrl" align="left">
        Resume Clinic Setup →
    </x-email.button>

    <x-email.signature />
@endsection
