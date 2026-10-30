@extends('emails.layouts.base', [
    'subject' => "Your invoice for {$period} is Rs. 0 — covered by {$coveredBy}",
    'preheader' => "Your MedVisit invoice for {$period} is Rs. 0, fully covered by {$coveredBy}.",
])

@section('content')
    <x-email.heading>Invoice covered — Rs. 0 due</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        Your subscription invoice for <strong>{{ $clinicName }}</strong> for the period <strong>{{ $period }}</strong> has been fully covered by <strong>{{ $coveredBy }}</strong>.
    </x-email.text>

    @php
        $invoiceItems = [
            'Invoice Number' => $invoiceNumber,
            'Subscription Plan' => $planName,
            'Billing Period' => $period,
            'Amount Due' => '<strong style="color: #0E9E8F;">Rs. 0.00</strong>',
            'Covered By' => $coveredBy,
            'Status' => '<span style="color: #0E9E8F; font-weight: bold;">Paid (100% Discount)</span>',
        ];
    @endphp

    <x-email.info-card title="Invoice Summary" :items="$invoiceItems" />

    <x-email.text>
        No payment was charged today. Your clinic workspace remains active and fully operational.
    </x-email.text>

    <x-email.button :url="$billingUrl" align="left">
        Open Billing Portal →
    </x-email.button>

    <x-email.signature />
@endsection

