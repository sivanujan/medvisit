@extends('emails.layouts.base', [
    'subject' => 'Two-factor authentication enabled on MedVisit',
    'preheader' => 'Two-factor authentication has been enabled for your MedVisit account.',
])

@section('content')
    <x-email.heading>Two-Factor Authentication Enabled</x-email.heading>

    <x-email.text>
        Hello {{ $name }},
    </x-email.text>

    <x-email.text>
        Two-Factor Authentication (2FA) via authenticator app was successfully enabled for your MedVisit account (<strong>{{ $email }}</strong>).
    </x-email.text>

    <x-email.info-card title="Security Event Details" :items="[
        'Account' => $email,
        'Protection' => 'Time-based One-Time Password (TOTP)',
        'Timestamp' => $enabledAt,
    ]" />

    <x-email.alert type="success">
        <strong>Your account is now more secure:</strong> You will be prompted to enter a 6-digit one-time code from your authenticator app whenever you sign in from a new browser or session.
    </x-email.alert>

    <x-email.text muted>
        If you did not perform this change, please contact MedVisit Security immediately or manage your account credentials.
    </x-email.text>

    <x-email.button :url="$securityUrl" align="left">
        Review Security Settings &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
