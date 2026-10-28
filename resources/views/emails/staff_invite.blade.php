@extends('emails.layouts.base', [
    'subject' => "Invitation to join {$clinicName} on MedVisit",
    'preheader' => "You have been invited to join {$clinicName} as a {$role}.",
])

@section('content')
    <x-email.heading>Team Invitation</x-email.heading>

    <x-email.text>
        Hello {{ $name }},
    </x-email.text>

    <x-email.text>
        You have been invited to join the clinical management team at <strong>{{ $clinicName }}</strong> as a <strong>{{ $role }}</strong> on MedVisit.
    </x-email.text>

    @if (! empty($personalMessage))
        <x-email.alert type="info">
            <strong>Personal message from {{ $invitedByName ?? 'Clinic Admin' }}:</strong><br>
            "{{ $personalMessage }}"
        </x-email.alert>
    @endif

    <x-email.info-card title="Invitation Details" :items="[
        'Clinic' => $clinicName,
        'Assigned Role' => $role,
        'Invitation Expires' => $expiresAt,
    ]" />

    <x-email.text>
        To accept this invitation and set up your secure password, click the button below:
    </x-email.text>

    <x-email.button :url="$acceptUrl" align="left">
        Accept Invitation & Set Password &rarr;
    </x-email.button>

    <x-email.alert type="info">
        <strong>Security Notice:</strong> This invitation was issued directly by the clinic administrator. If you were not expecting this invite, please contact your clinic or ignore this message.
    </x-email.alert>

    <x-email.signature />
@endsection
