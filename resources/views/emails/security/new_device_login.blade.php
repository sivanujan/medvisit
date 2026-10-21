@extends('emails.layouts.base', [
    'subject' => 'Security alert: New login to MedVisit',
    'preheader' => "A new sign-in was detected from IP {$ipAddress} at {$loginTime}.",
])

@section('content')
    <x-email.heading>New sign-in detected</x-email.heading>

    <x-email.text>
        Hello {{ $name }},
    </x-email.text>

    <x-email.text>
        We noticed a new sign-in to your MedVisit account from an unrecognized device or network location:
    </x-email.text>

    <x-email.info-card title="Sign-In Activity Details" :items="[
        'Timestamp' => $loginTime,
        'IP Address' => $ipAddress,
        'Device / Browser' => Str::limit($userAgent, 60),
    ]" />

    <x-email.alert type="warning">
        <strong>Was this you?</strong> If you recognize this login, no action is needed. If you did not sign in or suspect unauthorized activity, please secure your account immediately:
    </x-email.alert>

    <x-email.button :url="$resetUrl" align="left">
        Secure Account & Reset Password &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
