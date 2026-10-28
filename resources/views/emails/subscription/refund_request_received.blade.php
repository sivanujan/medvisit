@extends('emails.layouts.base', [
    'subject' => "We received your refund request — MedVisit",
    'preheader' => "Your refund request of {$amount} for {$clinicName} has been received and is under review.",
])

@section('content')
    <x-email.heading>Refund Request Received</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        We have received your refund request for <strong>{{ $clinicName }}</strong>. Our finance and support team will review your request in accordance with our published Refund Policy.
    </x-email.text>

    @php
        $receivedItems = [
            'Reference ID' => $refundRequest->public_id,
            'Reason' => $reason,
            'Requested Amount' => '<strong style="color: #0E9E8F;">' . $amount . '</strong>',
            'Status' => 'Under Review',
        ];
    @endphp

    <x-email.info-card title="Request Summary" :items="$receivedItems" />

    <x-email.alert type="info">
        <strong>Expected Timeline:</strong> Per our Dispute and Refund Policy, requests are acknowledged within 2 working days and decided within 7 working days. You can track live updates in your billing portal.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        View Refund Status in Billing Portal →
    </x-email.button>

    <x-email.signature />
@endsection
