@extends('emails.layouts.base', [
    'subject' => "New refund request: {$clinicName} — {$amount}",
    'preheader' => "A new clinic refund request requires administrative review.",
])

@section('content')
    <x-email.heading>New Refund Request</x-email.heading>

    <x-email.text>
        A new clinic subscription refund request has been submitted and is awaiting your review.
    </x-email.text>

    <x-email.info-card title="Request Details" :items="[
        'Clinic' => $clinicName,
        'Reason' => $reason,
        'Requested Amount' => '<strong style=\"color: #1E6FD9;\">' . $amount . '</strong>',
        'Automated Eligibility' => '<strong>' . $eligibility . '</strong>',
        'Request Reference' => $refundRequest->public_id,
    ]" />

    <x-email.alert type="warning">
        <strong>SLA Target:</strong> Acknowledge within 2 working days, decide within 7 working days.
    </x-email.alert>

    <x-email.button :url="$adminReviewUrl" align="left">
        Review in Admin Console &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
