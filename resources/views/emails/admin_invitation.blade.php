@extends('emails.layouts.base', [
    'subject' => 'Invitation to join MedVisit as Super Administrator',
    'preheader' => 'You have been invited to join the MedVisit central management team as a Super Admin.',
])

@section('content')
    <x-email.heading>Super Administrator Invitation</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        <strong>{{ $invitedBy }}</strong> has invited you to join the central MedVisit Platform team as a <strong>Super Administrator</strong> with access to multi-tenant clinic operations, subscriptions, and system controls.
    </x-email.text>

    <x-email.info-card title="Invitation Details" :items="[
        'Target Email' => $email,
        'Role' => 'Platform Super Admin',
        'Invited By' => $invitedBy,
        'Expires At' => $expiresAt,
    ]" />

    <x-email.text>
        To complete your account registration and set up Two-Factor Authentication, click the button below:
    </x-email.text>

    <x-email.button :url="$inviteUrl" align="left">
        Accept Super Admin Invite &rarr;
    </x-email.button>

    <x-email.alert type="warning">
        <strong>Security Notice:</strong> Super Administrator accounts have unrestricted access across all tenant environments. Two-Factor Authentication (2FA) is strictly required upon first login.
    </x-email.alert>

    <x-email.signature />
@endsection
