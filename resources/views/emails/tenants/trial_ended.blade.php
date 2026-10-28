@extends('emails.layouts.base', [
    'subject' => "Your MedVisit trial has ended — {$clinicName}",
    'preheader' => "Your free trial for {$clinicName} has expired. Reactivate your portal to continue operations.",
])

@section('content')
    <x-email.heading>Your free trial has expired</x-email.heading>

    <x-email.text>
        Hello {{ $adminName }},
    </x-email.text>

    <x-email.text>
        The 14-day free trial period for <strong>{{ $clinicName }}</strong> has expired and concluded. Front-desk queue management, doctor consultations, and token dispatch are temporarily paused until a subscription plan is selected.
    </x-email.text>

    @php
        $trialEndedItems = [
            'Clinic Workspace' => $clinicName,
            'Patient Records' => '<strong style="color: #0E9E8F;">Preserved Safely</strong>',
            'Status' => '<span style="color: #DC2626; font-weight: 700;">Trial Concluded</span>',
        ];
    @endphp

    <x-email.info-card title="Account Notice" :items="$trialEndedItems" />

    <x-email.alert type="info">
        <strong>Your clinic data is safe:</strong> All your patient demographics, past tokens, doctor profiles, and billing histories are securely stored. Choosing a plan restores immediate full access.
    </x-email.alert>

    <x-email.button :url="$portalUrl" align="left">
        Reactivate Clinic Portal →
    </x-email.button>

    <x-email.signature />
@endsection
