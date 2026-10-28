@extends('emails.layouts.base', [
    'subject' => 'Verify your email address — MedVisit',
    'preheader' => 'Please confirm your email address to activate your MedVisit account.',
])

@section('content')
    <x-email.heading>Verify your email address</x-email.heading>

    <x-email.text>
        Hello {{ $name }},
    </x-email.text>

    <x-email.text>
        Thank you for creating an account on MedVisit. To confirm your identity and ensure secure access to your clinical dashboard, please verify your email address below:
    </x-email.text>

    <x-email.button :url="$verificationUrl" align="left">
        Verify Email Address &rarr;
    </x-email.button>

    <x-email.alert type="info">
        <strong>Security Notice:</strong> This verification link will expire in 60 minutes. If you did not create an account on MedVisit, no further action is required.
    </x-email.alert>

    <x-email.signature />
@endsection
