@extends('emails.layouts.base', [
    'subject' => $percent >= 100 ? "Action required: Monthly SMS limit reached" : "Notice: 80% of monthly SMS quota used",
    'preheader' => "Your clinic has used {$used} of {$limit} monthly SMS alerts.",
])

@section('content')
    <x-email.heading>
        {{ $percent >= 100 ? 'SMS Quota Reached (100%)' : '80% of SMS Quota Used' }}
    </x-email.heading>

    <x-email.text>
        Hello {{ $tenant->name }} Team,
    </x-email.text>

    @if ($percent >= 100)
        <x-email.text>
            Your clinic has used <strong>{{ $used }} of {{ $limit }} SMS alerts</strong> for the current monthly billing period.
        </x-email.text>

        <x-email.alert type="danger">
            <strong>Queue SMS Alerts Paused:</strong> Automatic SMS queue alerts to patients have been temporarily paused to prevent unexpected charges. Patient booking OTPs will continue for a short grace period.
        </x-email.alert>

        <x-email.text>
            To resume real-time SMS notifications immediately, you can upgrade your plan or purchase an instant <strong>SMS Top-Up Pack</strong> from your Billing Center.
        </x-email.text>
    @else
        <x-email.text>
            You have currently used <strong>{{ $used }} of {{ $limit }} SMS alerts</strong> (80%) included in your plan for this period.
        </x-email.text>

        <x-email.alert type="warning">
            <strong>Heads up:</strong> If your clinic exhausts the remaining {{ max(0, $limit - $used) }} SMS messages, automatic queue alerts will be paused until your next renewal or an SMS top-up.
        </x-email.alert>
    @endif

    <x-email.button :url="$billingUrl" align="left">
        Manage Plan & Top-Up SMS →
    </x-email.button>

    <x-email.signature />
@endsection

