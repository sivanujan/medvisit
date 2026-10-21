@extends('emails.layouts.base', [
    'subject' => "Payment received — MedVisit ({$invoiceNumber})",
    'preheader' => "We have received your payment of {$amount} for {$clinicName}. Your official receipt is attached.",
])

@section('content')
    <x-email.heading>Payment received — Thank you!</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        We have received your subscription payment for <strong>{{ $clinicName }}</strong>. Your MedVisit clinic workspace remains active and fully operational.
    </x-email.text>

    <x-email.info-card title="Payment Receipt Summary" :items="array_filter([
        'Invoice Number' => $invoiceNumber,
        'Receipt Number' => $receiptNumber ?? null,
        'Subscription Plan' => $planName,
        'Amount Paid' => '<strong style=\"color: #0E9E8F;\">' . $amount . '</strong>',
        'Current Period Ends' => $periodEnd ?? null,
    ])" />

    <x-email.alert type="success">
        <strong>Official Receipt Attached:</strong> A formal PDF receipt for your accounting records is attached to this email. You can also view and download all past invoices from your billing portal.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        Open Billing Portal &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
