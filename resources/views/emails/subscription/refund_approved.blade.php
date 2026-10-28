@extends('emails.layouts.base', [
    'subject' => "Refund approved — MedVisit",
    'preheader' => "Your refund of {$amount} for {$clinicName} has been approved and is being processed.",
])

@section('content')
    <x-email.heading>Refund Approved — {{ $amount }}</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        Good news! Your refund request for <strong>{{ $clinicName }}</strong> has been approved by MedVisit administration.
    </x-email.text>

    @php
        $approvedItems = array_filter([
            'Approved Amount' => '<strong style="color: #0E9E8F;">' . $amount . '</strong>',
            'Request Reference' => $refundRequest->public_id,
            'Decision Note' => $decisionReason ?? null,
            'Next Step' => 'Payment processor reversal',
        ]);
    @endphp

    <x-email.info-card title="Approval Summary" :items="$approvedItems" />

    <x-email.alert type="success">
        <strong>Return Timeline:</strong> It will be returned to your original payment card within 7–14 working days, depending on your bank's card settlement timelines. You will receive an official credit note once processing completes.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        View Billing History →
    </x-email.button>

    <x-email.signature />
@endsection
