@extends('emails.layouts.base', [
    'subject' => "Your MedVisit verification code: {$code}",
    'preheader' => "Your 6-digit verification code is {$code}. Expires in 10 minutes.",
])

@section('content')
    <x-email.heading>Verify your email address</x-email.heading>

    <x-email.text>
        Hello{{ $name ? ' '.$name : '' }},
    </x-email.text>

    <x-email.text>
        Please use the 6-digit verification code below to confirm your email address and continue setup{{ $clinicName ? ' for '.$clinicName : '' }}:
    </x-email.text>

    <x-email.code :code="$code" expires="Expires in 10 minutes" />

    <x-email.alert type="info">
        <strong>Security Notice:</strong> Never share this code with anyone. MedVisit will never ask for your verification code.
    </x-email.alert>

    <x-email.text muted>
        If you did not initiate this clinic registration, you can safely ignore this email.
    </x-email.text>

    <x-email.signature />
@endsection
