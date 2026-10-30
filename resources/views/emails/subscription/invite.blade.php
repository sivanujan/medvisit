@extends('emails.layouts.base', [
    'subject' => "You're invited to MedVisit — {$freePeriod} free on the {$planName} Plan",
    'preheader' => "Activate your clinic on MedVisit with {$freePeriod} free on {$planName}. No payment required today.",
])

@section('content')
    <x-email.heading>Welcome to MedVisit — Special Invitation</x-email.heading>

    <x-email.text>
        Hello {{ $recipientName }},
    </x-email.text>

    <x-email.text>
        You have been invited to activate your clinic on <strong>MedVisit</strong> with <strong>{{ $freePeriod }} free access</strong> on our <strong>{{ $planName }} Plan</strong>.
    </x-email.text>

    @if($clinicName)
        <x-email.text>
            This invitation was reserved specifically for <strong>{{ $clinicName }}</strong>.
        </x-email.text>
    @endif

    @php
        $inviteItems = [
            'Included Plan' => $planName,
            'Complimentary Access' => $freePeriod,
            'Payment Required Today' => '<strong style="color: #0E9E8F;">Rs. 0.00 (No payment needed)</strong>',
            'Invitation Expires' => $expiresAt,
        ];
    @endphp

    <x-email.info-card title="Invitation Details" :items="$inviteItems" />

    <x-email.text>
        Click the link below to create your clinic account and launch your workspace immediately:
    </x-email.text>

    <x-email.button :url="$inviteUrl" align="left">
        Accept Invitation & Register Clinic →
    </x-email.button>

    <x-email.alert type="info">
        <strong>Important:</strong> Please complete registration using this email address. This exclusive invitation link is single-use and valid until {{ $expiresAt }}.
    </x-email.alert>

    <x-email.signature />
@endsection

