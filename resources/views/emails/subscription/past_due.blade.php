@extends('emails.layouts.base', [
    'subject' => $isGrace ? "Action required: Grace period active — {$clinicName}" : "Subscription past due — {$clinicName}",
    'preheader' => $isGrace ? "Your subscription for {$clinicName} has entered a {$graceDays}-day grace period. Please settle your invoice." : "The MedVisit subscription for {$clinicName} has expired.",
])

@section('content')
    <x-email.heading>{{ $isGrace ? 'Grace period active — Action required' : 'Subscription past due' }}</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        @if($isGrace)
            The MedVisit subscription for <strong>{{ $clinicName }}</strong> has entered a <strong>{{ $graceDays }}-day grace period</strong>. Your clinic services remain active temporarily, but immediate payment is required to prevent disruption.
        @else
            The MedVisit subscription for <strong>{{ $clinicName }}</strong> is past due. Clinic portal features may be restricted until payment is processed.
        @endif
    </x-email.text>

    @php
        $standingItems = [
            'Clinic Workspace' => $clinicName,
            'Status' => $isGrace ? '<span style="color: #D97706; font-weight: 700;">Grace Period (' . $graceDays . ' days left)</span>' : '<span style="color: #DC2626; font-weight: 700;">Past Due / Restricted</span>',
            'Amount Due' => '<strong style="color: #DC2626;">' . $amount . '</strong>',
        ];
    @endphp

    <x-email.info-card title="Account Standing" :items="$standingItems" />

    <x-email.alert :type="$isGrace ? 'warning' : 'danger'">
        <strong>Payment Instructions:</strong> Click the button below to complete the payment via our secure gateway. Your account will automatically return to active standing within moments.
    </x-email.alert>

    <x-email.button :url="$payUrl" align="left">
        Settle Outstanding Balance →
    </x-email.button>

    <x-email.signature />
@endsection
