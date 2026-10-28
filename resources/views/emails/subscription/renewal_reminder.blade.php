@extends('emails.layouts.base', [
    'subject' => "Subscription renewal reminder — {$clinicName} ({$daysRemaining} " . Str::plural('day', $daysRemaining) . ' left)',
    'preheader' => "Your MedVisit subscription renewal for {$clinicName} is scheduled in {$daysRemaining} " . Str::plural('day', $daysRemaining) . '.',
])

@section('content')
    <x-email.heading>Subscription renewal notice</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        This is a friendly reminder that the subscription for <strong>{{ $clinicName }}</strong> will renew in
        <strong>{{ $daysRemaining }} {{ Str::plural('day', $daysRemaining) }}</strong>.
    </x-email.text>

    @php
        $renewalItems = [
            'Clinic Workspace' => $clinicName,
            'Current Plan' => $planName,
            'Renewal Amount' => '<strong style="color: #1E6FD9;">' . $amount . '</strong>',
            'Due Date' => $dueDate,
        ];
    @endphp

    <x-email.info-card title="Renewal Summary" :items="$renewalItems" />

    <x-email.alert type="info">
        <strong>Automatic Continuity:</strong> To ensure uninterrupted clinic operations, queue numbers, and medical record
        access, please review your billing details or renew your plan before the due date.
    </x-email.alert>

    <x-email.button :url="$payUrl" align="left">
        Renew Subscription →
    </x-email.button>

    <x-email.signature />
@endsection