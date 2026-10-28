@extends('emails.layouts.base', [
    'subject' => "Action required: Your free website template ends on {$effectiveDate}",
    'preheader' => "Your free template ends on {$effectiveDate}. Buy it for {$priceFormatted} to keep this design.",
])

@section('content')
    <x-email.heading>Your free template ends on {{ $effectiveDate }}</x-email.heading>

    <x-email.text>
        Hello {{ $clinicName }},
    </x-email.text>

    <x-email.text>
        Your clinic recently scheduled a plan downgrade from the Advanced plan. Under MedVisit plan rules, the plan-included premium website template (<strong>{{ $templateName }}</strong>) is available only while your clinic is on the Advanced plan.
    </x-email.text>

    <x-email.alert type="info">
        <strong>Your free template ends on {{ $effectiveDate }}.</strong> Buy it for {{ $priceFormatted }} to keep this design, or your website will switch back to your previous design.
    </x-email.alert>

    <x-email.text>
        If not purchased by {{ $effectiveDate }}, your live website will fall back gracefully to your previous design or the default free theme. Your customizations will remain safely saved in your draft so you can purchase and reactivate it anytime without losing your work.
    </x-email.text>

    <x-email.button :url="$purchaseUrl" align="left">
        Buy Template for {{ $priceFormatted }} &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
