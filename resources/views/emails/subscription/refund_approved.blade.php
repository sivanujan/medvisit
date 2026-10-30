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
            'Next Step' => 'Reversal back to card via Payments.lk',
            'Subscription Plan' => '<span style="color: #E11D48; font-weight: 600;">Cancelled</span>',
        ]);
    @endphp

    <x-email.info-card title="Approval Summary" :items="$approvedItems" />

    <x-email.alert type="success">
        <strong>Return Timeline:</strong> It will be reversed back to your original payment card via Payments.lk within 7–14 working days, depending on your card issuer's settlement timelines.
    </x-email.alert>

    <x-email.alert type="info">
        <strong>Subscription Status:</strong> Your subscription plan has been cancelled and clinic workspace access has been ended. If you wish to reactivate your clinic in the future, you may subscribe to a new plan from your billing settings at any time.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        View Billing History →
    </x-email.button>

    <x-email.signature />
@endsection
