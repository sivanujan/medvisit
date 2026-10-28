@extends('emails.layouts.base', [
    'subject' => "Payment unsuccessful — MedVisit ({$invoiceNumber})",
    'preheader' => "We were unable to process your payment of {$amount} for {$clinicName}. Please update your payment method.",
])

@section('content')
    <x-email.heading>Payment attempt unsuccessful</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        We were unable to process the subscription payment for <strong>{{ $clinicName }}</strong> for invoice <strong>{{ $invoiceNumber }}</strong>.
    </x-email.text>

    @php
        $failedItems = [
            'Invoice Number' => $invoiceNumber,
            'Amount Due' => '<strong style="color: #DC2626;">' . $amount . '</strong>',
            'Issue' => $failureMessage ?? 'Card was declined or session expired',
        ];
    @endphp

    <x-email.info-card title="Payment Attempt Details" :items="$failedItems" />

    <x-email.alert type="danger">
        <strong>Action Required:</strong> To avoid any interruption in queue management or patient bookings, please update your payment method or retry the transaction.
    </x-email.alert>

    <x-email.button :url="$retryUrl" align="left">
        Retry Payment Now →
    </x-email.button>

    <x-email.signature />
@endsection
