@extends('emails.layouts.base', [
    'subject' => "MedVisit Launch Offer ends in {$daysRemaining} day(s)",
    'preheader' => "Your clinic's free Advanced plan concludes in {$daysRemaining} day(s). Recommended plan: {$recommendedPlan}.",
])

@section('content')
    <x-email.heading>
        Your Launch Offer Ends in {{ $daysRemaining }} Day{{ $daysRemaining === 1 ? '' : 's' }}
    </x-email.heading>

    <x-email.text>
        Hello {{ $tenant->name }} Team,
    </x-email.text>

    <x-email.text>
        Your clinic has been enjoying full access to all MedVisit Advanced features as part of our platform Launch Offer. Your complimentary period concludes in <strong>{{ $daysRemaining }} day{{ $daysRemaining === 1 ? '' : 's' }}</strong>.
    </x-email.text>

    <x-email.alert type="info">
        <strong>Your Clinic Usage Summary:</strong><br>
        • Active Doctors: <strong>{{ $usageSummary['doctors'] ?? 0 }}</strong><br>
        • Active Staff Users: <strong>{{ $usageSummary['staff'] ?? 0 }}</strong><br>
        • Pharmacy Dispenses: <strong>{{ $usageSummary['dispenses'] ?? 0 }}</strong><br>
        • Waiting Room TV Screens: <strong>{{ $usageSummary['tv_screens'] ?? 0 }}</strong><br>
        • SMS Alerts Sent: <strong>{{ $usageSummary['sms_used'] ?? 0 }}</strong>
    </x-email.alert>

    <x-email.text>
        Based on your actual clinical activity, we recommend the <strong>{{ $recommendedPlan }}</strong> tier.
    </x-email.text>

    <x-email.text>
        You can choose your plan now to ensure uninterrupted queue calling, prescription generation, and appointment booking. If you choose a lower tier, your records are never deleted; any excess doctors or locked modules remain safely archived.
    </x-email.text>

    <x-email.button :url="$changePlanUrl" align="left">
        Review & Choose Your Plan →
    </x-email.button>

    <x-email.signature />
@endsection

