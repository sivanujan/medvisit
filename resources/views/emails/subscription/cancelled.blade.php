@extends('emails.layouts.base', [
    'subject' => "Subscription cancelled — {$clinicName}",
    'preheader' => "Your MedVisit subscription for {$clinicName} has been cancelled. Access remains active until {$accessUntil}.",
])

@section('content')
    <x-email.heading>Subscription cancelled</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        We have processed the cancellation request for <strong>{{ $clinicName }}</strong>. No further renewal charges will be made.
    </x-email.text>

    <x-email.info-card title="Cancellation Details" :items="array_filter([
        'Clinic Workspace' => $clinicName,
        'Access Valid Until' => '<strong style=\"color: #0F172A;\">' . $accessUntil . '</strong>',
        'Reason' => $reason ?? null,
    ])" />

    <x-email.alert type="info">
        <strong>Changed your mind?</strong> You can reactivate or resume your subscription at any time before <strong>{{ $accessUntil }}</strong> without any loss of patient records, token queues, or doctor settings.
    </x-email.alert>

    <x-email.button :url="$resumeUrl" align="left">
        Resume Subscription &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
