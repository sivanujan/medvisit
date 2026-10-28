@extends('emails.layouts.base', [
    'subject' => "Subscription resumed — {$clinicName}",
    'preheader' => "Great news! Your MedVisit subscription for {$clinicName} has been resumed.",
])

@section('content')
    <x-email.heading>Subscription resumed!</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        Great news! The subscription for <strong>{{ $clinicName }}</strong> has been officially resumed. Your clinic operations will continue without any interruption.
    </x-email.text>

    @php
        $resumedItems = [
            'Clinic Workspace' => $clinicName,
            'Plan' => $planName,
            'Next Renewal Date' => '<strong style="color: #0E9E8F;">' . $nextRenewal . '</strong>',
        ];
    @endphp

    <x-email.info-card title="Subscription Details" :items="$resumedItems" />

    <x-email.alert type="success">
        <strong>Everything is up to date:</strong> All automated patient queues, doctor channels, and clinic staff features remain active.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        Open Billing Portal →
    </x-email.button>

    <x-email.signature />
@endsection
