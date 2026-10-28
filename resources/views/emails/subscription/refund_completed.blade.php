@extends('emails.layouts.base', [
    'subject' => "Refund completed — MedVisit ({$creditNoteNumber})",
    'preheader' => "Your refund of {$amount} has been processed. Your official credit note is attached.",
])

@section('content')
    <x-email.heading>Refund Completed — {{ $amount }}</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        Your subscription refund for <strong>{{ $clinicName }}</strong> has been executed. The funds have been released via the payment processor.
    </x-email.text>

    @php
        $completedItems = array_filter([
            'Credit Note Number' => '<strong style="color: #0E9E8F;">' . $creditNoteNumber . '</strong>',
            'Amount Refunded' => '<strong>' . $amount . '</strong>',
            'Method' => ucfirst(str_replace('_', ' ', $method ?? 'Card Reversal')),
            'Gateway / Bank Reference' => $reference ?? null,
        ]);
    @endphp

    <x-email.info-card title="Refund Execution Details" :items="$completedItems" />

    <x-email.alert type="success">
        <strong>Official Credit Note Attached:</strong> An official PDF Credit Note ({{ $creditNoteNumber }}) is attached to this email for your tax and accounting records. You can also download it anytime from your clinic billing portal.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        View Billing History →
    </x-email.button>

    <x-email.signature />
@endsection
