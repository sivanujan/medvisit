@extends('emails.layouts.base', [
    'subject' => "Refund request update — MedVisit",
    'preheader' => "Important update regarding your recent refund request for {$clinicName}.",
])

@section('content')
    <x-email.heading>Refund Request Declined</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        Thank you for your patience while we reviewed your refund request for <strong>{{ $clinicName }}</strong>.
        After evaluating your request against our published Refund Policy, we are unable to approve a refund at this time.
    </x-email.text>

    <x-email.info-card title="Review Outcome" :items="[
        'Requested Amount' => $amount,
        'Request Reference' => $refundRequest->public_id,
        'Reason for Decline' => '<strong style=\"color: #ef4444;\">' . e($decisionReason) . '</strong>',
    ]" />

    <x-email.alert type="warning">
        <strong>Need to escalate or dispute this decision?</strong> If you believe this assessment does not reflect your circumstances, you can request an escalation per our Dispute Policy.
    </x-email.alert>

    <x-email.button :url="$disputePolicyUrl" align="left">
        View Dispute & Escalation Policy &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
