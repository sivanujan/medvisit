@extends('emails.layouts.base', [
    'subject' => "Your MedVisit trial ends in 3 days — {$clinicName}",
    'preheader' => "Your free trial for {$clinicName} will conclude on {$trialEnd}. Upgrade to keep operations running.",
])

@section('content')
    <x-email.heading>Your free trial ends in 3 days</x-email.heading>

    <x-email.text>
        Hello {{ $adminName }},
    </x-email.text>

    <x-email.text>
        This is a friendly reminder that your 14-day free trial for <strong>{{ $clinicName }}</strong> concludes on <strong>{{ $trialEnd }}</strong>.
    </x-email.text>

    @php
        $trialEndingItems = [
            'Clinic Workspace' => $clinicName,
            'Trial Conclusion' => $trialEnd,
            'Status' => '<span style="color: #FF7A59; font-weight: 700;">Ending in 3 Days</span>',
        ];
    @endphp

    <x-email.info-card title="Trial Status" :items="$trialEndingItems" />

    <x-email.heading level="h2" style="font-size: 16px; margin-top: 20px; margin-bottom: 8px;">
        Keep your clinic running seamlessly:
    </x-email.heading>

    <x-email.list :items="[
        '<strong>Zero interruption</strong> to active patient queues, live tokens, and clinical notes.',
        '<strong>Continuous doctor scheduling</strong> and patient online channeling.',
        '<strong>Transparent LKR pricing</strong> with local cards and direct bank payment options.',
    ]" />

    <x-email.button :url="$portalUrl" align="left">
        Select a Plan & Upgrade &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
