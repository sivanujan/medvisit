@extends('emails.layouts.base', [
    'subject' => $clinicName ? "Reset your password — {$clinicName} (MedVisit)" : 'Reset your MedVisit password',
    'preheader' => 'A password reset was requested for your account. This link expires in ' . $expiresIn . ' minutes.',
])

@section('content')
    <x-email.heading>Reset your password</x-email.heading>

    <x-email.text>
        Hello {{ $name }},
    </x-email.text>

    <x-email.text>
        We received a request to reset the password for your account{{ $clinicName ? ' at ' . $clinicName : '' }}. Click the button below to choose a new password:
    </x-email.text>

    <x-email.button :url="$resetUrl" align="left">
        Reset Password &rarr;
    </x-email.button>

    <x-email.alert type="warning">
        <strong>Notice:</strong> This password reset link will expire in {{ $expiresIn }} minutes. If you did not make this request, you can safely ignore this email — your current password remains secure.
    </x-email.alert>

    <x-email.signature />
@endsection
