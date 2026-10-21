@extends('emails.layouts.base', [
    'subject' => 'MedVisit Email Delivery Test',
    'preheader' => 'Testing email delivery through Resend for MedVisit.',
])

@section('content')
    <x-email.heading>Email delivery verified!</x-email.heading>

    <x-email.text>
        This test message confirms that your MedVisit email transport is working properly and delivering messages securely.
    </x-email.text>

    <x-email.info-card title="Delivery Test Metadata" :items="[
        'Recipient' => $recipientEmail,
        'Transport Driver' => '<strong style=\"color: #1E6FD9;\">' . $mailer . '</strong>',
        'Timestamp (Asia/Colombo)' => $sentAt,
    ]" />

    <x-email.alert type="success">
        <strong>Domain Authentication Verified:</strong> Headers, SPF, DKIM, and DMARC have passed through the verified domain <strong>medvisit.lk</strong>.
    </x-email.alert>

    <x-email.signature />
@endsection
