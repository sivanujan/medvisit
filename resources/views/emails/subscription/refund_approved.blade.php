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
            'Credit Note' => !empty($creditNoteNumber) ? '<strong>' . $creditNoteNumber . '</strong>' : null,
            'Payments.lk Reference' => !empty($reference) ? '<code>' . $reference . '</code>' : null,
            'Request Reference' => $refundRequest->public_id,
            'Decision Note' => $decisionReason ?? null,
            'Subscription Plan' => $isPartial
                ? '<span style="color: #0E9E8F; font-weight: 600;">Active (Access continues uninterrupted)</span>'
                : '<span style="color: #E11D48; font-weight: 600;">Cancelled</span>',
        ]);
    @endphp

    <x-email.info-card title="Refund Summary" :items="$approvedItems" />

    <x-email.alert type="success">
        <strong>Return Timeline:</strong> The refund has been executed and will be reversed back to your original payment card via Payments.lk {{ $timelineText }}.
        @if(!empty($reference))
            <br><span style="font-size: 12px; color: #64748B;">Payments.lk Refund Reference: <code style="font-family: monospace;">{{ $reference }}</code></span>
        @endif
    </x-email.alert>

    @if(!empty($creditNoteNumber))
        <x-email.alert type="info">
            <strong>Credit Note Attached:</strong> Official Credit Note <strong>{{ $creditNoteNumber }}</strong> is attached to this email for your tax and accounting records. You can also download it anytime from your clinic billing portal.
        </x-email.alert>
    @endif

    @if($isPartial)
        <x-email.alert type="success">
            <strong>Active Subscription:</strong> Your subscription remains active and your clinic team retains full access to your workspace. This partial refund or service credit has been credited back to your account.
        </x-email.alert>
    @else
        <x-email.alert type="info">
            <strong>Data Retention:</strong> Per our Terms and Privacy Policy, your clinic records and patient data are safely preserved for 30 days. You can also download all past invoices and billing receipts at any time from your billing portal.
        </x-email.alert>
    @endif

    <x-email.button :url="$billingUrl" align="left">
        View Billing History →
    </x-email.button>

    <x-email.signature />
@endsection
